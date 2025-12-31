"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import dynamic from 'next/dynamic';

// Dynamically import Map component
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg"></div>
});

export default function RegisterStore() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parentIdParam = searchParams?.get("parent_id") || "";
  const parentIdNum = Number(parentIdParam);
  const isParentMerchantId = typeof parentIdParam === "string" && parentIdParam.startsWith("GMMP");

  // Use refs for email inputs to prevent hydration errors
  const storeEmailRef = useRef<HTMLInputElement>(null);
  const amEmailRef = useRef<HTMLInputElement>(null);
  const cuisineInputRef = useRef<HTMLInputElement>(null);

  // State for step management
  const [step, setStep] = useState<number>(1);
  const [loadingParent, setLoadingParent] = useState(false);
  const [parentMerchantId, setParentMerchantId] = useState<string>("");
  const [parentStoreName, setParentStoreName] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ store_id: string; status?: string } | null>(null);
  const [parentDbId, setParentDbId] = useState<number | null>(null);
  
  // Child stores list state
  const [childStores, setChildStores] = useState<any[]>([]);
  const [loadingChildStores, setLoadingChildStores] = useState(false);

  // Map and location states
  const [showMap, setShowMap] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<{lat: number | null; lng: number | null}>({lat: null, lng: null});
  const [pinnedCoordinates, setPinnedCoordinates] = useState<{lat: number | null; lng: number | null}>({lat: null, lng: null});
  const [isPinning, setIsPinning] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [isFetchingCoordinates, setIsFetchingCoordinates] = useState(false);

  // Main form state
  const [form, setForm] = useState({
    // Step 1: Basic Information
    store_name: "",
    cuisine_type: [""],
    store_description: "",
    store_email: "",
    store_phones: [""],
    store_banner_url: "",
    ads_images: [""],
    full_address: "",
    city: "",
    state: "",
    landmark: "",
    postal_code: "",
    latitude: null as number | null,
    longitude: null as number | null,
    
    // Step 2: Legal & Compliance
    pan_number: "",
    pan_image_url: "",
    aadhar_number: "",
    aadhar_image_url: "",
    gst_number: "",
    gst_image_url: "",
    fssai_number: "",
    fssai_image_url: "",
    
    // Step 3: Bank Details
    bank_account_holder: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    
    // Step 4: Operations & Manager
    opening_time: "09:00",
    closing_time: "21:00",
    closed_days: [] as string[],
    avg_delivery_time_minutes: null as number | null,
    min_order_amount: null as number | null,
    has_area_manager: false,
    am_name: "",
    am_mobile: "",
    am_email: "",
  });

  // Cuisine handling
  const cuisineSuggestions = [
    "North Indian", "South Indian", "Chinese", "Fast Food", "Street Food", 
    "Punjabi", "Mughlai", "Biryani", "Bakery", "Cafe", "Continental", 
    "Desserts", "Others"
  ];
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showOtherCuisine, setShowOtherCuisine] = useState(false);
  const [otherCuisine, setOtherCuisine] = useState("");

  // File upload states
  const [uploadingPan, setUploadingPan] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingGst, setUploadingGst] = useState(false);
  const [uploadingFssai, setUploadingFssai] = useState(false);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [aadharPreview, setAadharPreview] = useState<string | null>(null);
  const [gstPreview, setGstPreview] = useState<string | null>(null);
  const [fssaiPreview, setFssaiPreview] = useState<string | null>(null);

  // Step titles
  const steps = [
    { number: 1, title: "Basic Info" },
    { number: 2, title: "Legal & Compliance" },
    { number: 3, title: "Bank Details" },
    { number: 4, title: "Operations" },
    { number: 5, title: "Review & Submit" },
  ];

  // Fetch parent merchant details
  useEffect(() => {
    async function fetchParent() {
      if (!parentIdParam) return;
      setLoadingParent(true);
      let res;
      try {
        if (isParentMerchantId) {
          res = await supabase
            .from("merchant_parent")
            .select("id, parent_merchant_id, parent_store_name")
            .eq("parent_merchant_id", parentIdParam)
            .maybeSingle();
        } else if (!isNaN(parentIdNum) && parentIdNum > 0) {
          res = await supabase
            .from("merchant_parent")
            .select("id, parent_merchant_id, parent_store_name")
            .eq("id", parentIdNum)
            .maybeSingle();
        } else {
          setLoadingParent(false);
          setError("Invalid parent id");
          return;
        }
        setLoadingParent(false);
        if (res.error || !res.data) {
          setError("Parent not found");
          return;
        }
        const data = res.data as any;
        setParentMerchantId(data.parent_merchant_id || "");
        setParentStoreName(data.parent_store_name || "");
        setParentDbId(data.id || null);

        if (data.parent_merchant_id && parentIdParam !== data.parent_merchant_id) {
          try {
            router.replace(`/auth/register-store?parent_id=${encodeURIComponent(data.parent_merchant_id)}`);
          } catch {}
        }
      } catch (err) {
        setLoadingParent(false);
        setError("Parent not found");
      }
    }
    fetchParent();
  }, [parentIdParam]);

  // Fetch child stores for this parent
  useEffect(() => {
    async function fetchChildStores() {
      const parent_id = parentDbId && parentDbId > 0 ? parentDbId : (parentIdNum > 0 ? parentIdNum : undefined);
      if (!parent_id) return;

      setLoadingChildStores(true);
      try {
        const { data, error } = await supabase
          .from("merchant_store")
          .select("*, merchant_parent(parent_merchant_id, parent_store_name)")
          .eq("parent_id", parent_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching child stores:", error);
          return;
        }

        if (data) {
          setChildStores(data);
        }
      } catch (error) {
        console.error("Error in fetchChildStores:", error);
      } finally {
        setLoadingChildStores(false);
      }
    }

    if (parentDbId || parentIdNum) {
      fetchChildStores();
    }
  }, [parentDbId, parentIdNum, success]); // Re-fetch when success state changes

  // Load saved progress from localStorage when component mounts
  useEffect(() => {
    const parent_id = parentDbId && parentDbId > 0 ? parentDbId : (parentIdNum > 0 ? parentIdNum : undefined);
    if (!parent_id) return;

    // Check if we have saved form data in localStorage
    const savedForm = localStorage.getItem(`store_form_${parent_id}`);
    const savedStep = localStorage.getItem(`store_step_${parent_id}`);
    
    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        setForm(parsedForm);
        
        // Restore pinned coordinates if they exist
        if (parsedForm.latitude && parsedForm.longitude) {
          setPinnedCoordinates({
            lat: parsedForm.latitude,
            lng: parsedForm.longitude
          });
          setHasConfirmedPin(true);
          setShowMap(true);
        }
      } catch (error) {
        console.error("Error parsing saved form:", error);
      }
    }
    
    if (savedStep) {
      try {
        const stepNum = parseInt(savedStep);
        if (stepNum >= 1 && stepNum <= 5) {
          setStep(stepNum);
        }
      } catch (error) {
        console.error("Error parsing saved step:", error);
      }
    }
  }, [parentDbId, parentIdNum]);

  // Save form progress to localStorage
  const saveToLocalStorage = () => {
    const parent_id = parentDbId && parentDbId > 0 ? parentDbId : (parentIdNum > 0 ? parentIdNum : undefined);
    if (!parent_id) return;

    localStorage.setItem(`store_form_${parent_id}`, JSON.stringify(form));
    localStorage.setItem(`store_step_${parent_id}`, step.toString());
  };

  // Handle cuisine type change
  useEffect(() => {
    const val = (form.cuisine_type && form.cuisine_type[0]) || "";
    setShowOtherCuisine(val.trim().toLowerCase() === "others" || val.trim().toLowerCase() === "other");
  }, [form.cuisine_type]);

  // Form field update helper
  function updateField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Handle cuisine selection from dropdown
  const handleCuisineSelect = (cuisine: string) => {
    updateField('cuisine_type', [cuisine]);
    setShowSuggestions(false);
    // Focus back on the input after selection
    if (cuisineInputRef.current) {
      cuisineInputRef.current.focus();
    }
  };

  // Function to fetch latitude and longitude from address using Mapbox API
  const fetchCoordinates = async () => {
    if (!form.full_address.trim() || !form.city.trim() || !form.state.trim() || !form.postal_code.trim()) {
      setError("Please fill address, city, state and postal code first");
      return false;
    }

    setIsFetchingCoordinates(true);
    setError("");

    try {
      const address = `${form.full_address}, ${form.city}, ${form.state}, ${form.postal_code}, India`;
      const mapboxAccessToken = 'pk.eyJ1IjoiZ2F0aW1pdHJhIiwiYSI6ImNtanI2dGRwbDBsczQzZHFzeWVwZ3lsMXMifQ.Eju9wHx6e_qu97AhS8TYGA';
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxAccessToken}&country=in`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch coordinates');
      }
      
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center;
        
        // Format to 8-9 decimal places
        const formattedLat = parseFloat(lat.toFixed(9));
        const formattedLon = parseFloat(lon.toFixed(9));
        
        // Store fetched coordinates for map display
        setMapCoordinates({ lat: formattedLat, lng: formattedLon });
        
        // Update form with fetched coordinates
        updateField('latitude', formattedLat);
        updateField('longitude', formattedLon);
        
        // Store pinned coordinates if not already set
        if (!hasConfirmedPin) {
          setPinnedCoordinates({ lat: formattedLat, lng: formattedLon });
        }
        
        // Show map
        setShowMap(true);
        
        // If we got coordinates, also try to extract more accurate city/state if missing
        if (data.features[0].context) {
          const context = data.features[0].context;
          let newCity = form.city;
          let newState = form.state;
          
          context.forEach((item: any) => {
            if (item.id.includes('place') && !newCity) {
              newCity = item.text;
            }
            if (item.id.includes('region') && !newState) {
              newState = item.text;
            }
          });
          
          if (newCity !== form.city) updateField('city', newCity);
          if (newState !== form.state) updateField('state', newState);
        }
        
        setIsFetchingCoordinates(false);
        return true;
      } else {
        setError("Could not fetch coordinates for this address. Please enter manually.");
        setIsFetchingCoordinates(false);
        return false;
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      setError("Failed to fetch coordinates. Please enter manually.");
      setIsFetchingCoordinates(false);
      return false;
    }
  };

  // Auto-fetch coordinates when address fields are filled
  useEffect(() => {
    if (form.full_address && form.city && form.state && form.postal_code) {
      const timer = setTimeout(() => {
        if (!hasConfirmedPin && !form.latitude && !form.longitude) {
          fetchCoordinates();
        }
      }, 1500); // Wait 1.5 seconds after user stops typing

      return () => clearTimeout(timer);
    }
  }, [form.full_address, form.city, form.state, form.postal_code]);

  // Handle map pin confirmation
  const handleConfirmPin = (lat: number, lng: number) => {
    // Format to 9 decimal places
    const formattedLat = parseFloat(lat.toFixed(9));
    const formattedLng = parseFloat(lng.toFixed(9));
    
    // Update form with pinned coordinates
    updateField('latitude', formattedLat);
    updateField('longitude', formattedLng);
    
    // Store pinned coordinates
    setPinnedCoordinates({ lat: formattedLat, lng: formattedLng });
    setHasConfirmedPin(true);
    setShowMap(true);
  };

  // Handle manual coordinate fetch button
  const handleFetchCoordinates = async () => {
    setError("");
    if (!form.full_address.trim() || !form.city.trim() || !form.state.trim() || !form.postal_code.trim()) {
      setError("Please fill address, city, state and postal code first");
      return;
    }
    
    try {
      await fetchCoordinates();
    } catch (error) {
      setError("Failed to fetch coordinates. Please enter manually.");
    }
  };

  // Format latitude/longitude to 9 decimal places for display
  const formatCoordinate = (value: number | null) => {
    if (value === null) return '';
    return value.toFixed(9);
  };

  // Handle coordinate input change with validation
  const handleLatitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateField('latitude', null);
      setPinnedCoordinates(prev => ({ ...prev, lat: null }));
      setHasConfirmedPin(false);
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Format to 9 decimal places
      const formattedValue = parseFloat(numValue.toFixed(9));
      updateField('latitude', formattedValue);
      setPinnedCoordinates(prev => ({ ...prev, lat: formattedValue }));
      setHasConfirmedPin(true);
      setShowMap(true);
    }
  };

  const handleLongitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateField('longitude', null);
      setPinnedCoordinates(prev => ({ ...prev, lng: null }));
      setHasConfirmedPin(false);
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Format to 9 decimal places
      const formattedValue = parseFloat(numValue.toFixed(9));
      updateField('longitude', formattedValue);
      setPinnedCoordinates(prev => ({ ...prev, lng: formattedValue }));
      setHasConfirmedPin(true);
      setShowMap(true);
    }
  };

  // Toggle map visibility
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // Save current step's data to database
  async function saveStepData(currentStep: number) {
    const parent_id = parentDbId && parentDbId > 0 ? parentDbId : (parentIdNum > 0 ? parentIdNum : undefined);
    if (!parent_id) throw new Error("parent_id is missing");

    try {
      const res = await fetch('/api/store/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parent_id, 
          step: currentStep,
          completed_steps: currentStep,
          form_data: form // send all form data
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save progress');
      }
      
      return await res.json();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Failed to save progress');
      } else {
        setError('Failed to save progress');
      }
      throw error;
    }
  }

  // Navigation functions
  async function next() {
    setError("");
    
    // For step 1, validate map pin confirmation
    if (step === 1) {
      if (!form.latitude || !form.longitude) {
        setError("Store location coordinates are required. Please confirm on the map.");
        return;
      }
      
      if (!hasConfirmedPin && (form.latitude || form.longitude)) {
        setError("Please confirm your store location by adjusting the pin on the map before proceeding");
        return;
      }
    }
    
    if (!validateStep(step)) return;

    setSubmitting(true); // Show verifying spinner

    // Save current step's data to localStorage
    saveToLocalStorage();

    setSubmitting(false); // Hide verifying spinner

    // Move to next step
    if (step < 5) {
      setStep(step + 1);
    }
  }

  function prev() {
    setStep(s => Math.max(1, s - 1));
  }

  // Step validation
  function validateStep(stepNum: number): boolean {
    switch (stepNum) {
      case 1:
        if (!form.store_name.trim()) {
          setError("Store name is required");
          return false;
        }
        if (!form.cuisine_type[0]?.trim()) {
          setError("Cuisine type is required");
          return false;
        }
        if (!form.full_address.trim()) {
          setError("Full address is required");
          return false;
        }
        if (!form.city.trim()) {
          setError("City is required");
          return false;
        }
        if (!form.state.trim()) {
          setError("State is required");
          return false;
        }
        if (!form.postal_code.trim()) {
          setError("Postal code is required");
          return false;
        }
        if (!form.latitude || !form.longitude) {
          setError("Store location coordinates are required. Please confirm on the map.");
          return false;
        }
        break;
      case 2:
        if (!form.pan_number.trim()) {
          setError("PAN number is required");
          return false;
        }
        if (!form.aadhar_number.trim()) {
          setError("Aadhar number is required");
          return false;
        }
        break;
      case 3:
        if (!form.bank_account_holder.trim()) {
          setError("Account holder name is required");
          return false;
        }
        if (!form.bank_account_number.trim()) {
          setError("Account number is required");
          return false;
        }
        if (!form.bank_ifsc.trim()) {
          setError("IFSC code is required");
          return false;
        }
        if (!form.bank_name.trim()) {
          setError("Bank name is required");
          return false;
        }
        break;
      case 4:
        if (!form.opening_time || !form.closing_time) {
          setError("Opening and closing times are required");
          return false;
        }
        break;
    }
    setError("");
    return true;
  }

  // File upload function
  async function uploadFileToStorage(file: File, folder: string) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('parent', folder);
      const res = await fetch('/api/upload/r2', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || json?.error) {
        alert('Upload failed: ' + (json?.details || json?.error || JSON.stringify(json)));
        return null;
      }
      return json.url as string;
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message || String(err)));
      return null;
    }
  }

  // Handle file input for PAN
  async function handlePanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPan(true);
    const url = await uploadFileToStorage(file, 'pan');
    if (url) {
      updateField('pan_image_url', url);
      setPanPreview(URL.createObjectURL(file));
    }
    setUploadingPan(false);
  }

  // Handle file input for Aadhar
  async function handleAadharFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAadhar(true);
    const url = await uploadFileToStorage(file, 'aadhar');
    if (url) {
      updateField('aadhar_image_url', url);
      setAadharPreview(URL.createObjectURL(file));
    }
    setUploadingAadhar(false);
  }

  // Handle file input for GST
  async function handleGstFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGst(true);
    const url = await uploadFileToStorage(file, 'gst');
    if (url) {
      updateField('gst_image_url', url);
      setGstPreview(URL.createObjectURL(file));
    }
    setUploadingGst(false);
  }

  // Handle file input for FSSAI
  async function handleFssaiFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFssai(true);
    const url = await uploadFileToStorage(file, 'fssai');
    if (url) {
      updateField('fssai_image_url', url);
      setFssaiPreview(URL.createObjectURL(file));
    }
    setUploadingFssai(false);
  }

  // Clear form data
  const clearFormData = () => {
    setForm({
      store_name: "",
      cuisine_type: [""],
      store_description: "",
      store_email: "",
      store_phones: [""],
      store_banner_url: "",
      ads_images: [""],
      full_address: "",
      city: "",
      state: "",
      landmark: "",
      postal_code: "",
      latitude: null,
      longitude: null,
      pan_number: "",
      pan_image_url: "",
      aadhar_number: "",
      aadhar_image_url: "",
      gst_number: "",
      gst_image_url: "",
      fssai_number: "",
      fssai_image_url: "",
      bank_account_holder: "",
      bank_account_number: "",
      bank_ifsc: "",
      bank_name: "",
      opening_time: "09:00",
      closing_time: "21:00",
      closed_days: [],
      avg_delivery_time_minutes: null,
      min_order_amount: null,
      has_area_manager: false,
      am_name: "",
      am_mobile: "",
      am_email: "",
    });
    setStep(1);
    setError("");
    setPanPreview(null);
    setAadharPreview(null);
    setGstPreview(null);
    setFssaiPreview(null);
    setPinnedCoordinates({ lat: null, lng: null });
    setHasConfirmedPin(false);
    setShowMap(false);
    setMapCoordinates({ lat: null, lng: null });
    
    // Clear localStorage
    const parent_id = parentDbId && parentDbId > 0 ? parentDbId : (parentIdNum > 0 ? parentIdNum : undefined);
    if (parent_id) {
      localStorage.removeItem(`store_form_${parent_id}`);
      localStorage.removeItem(`store_step_${parent_id}`);
    }
  };

  // Handle register another store
  const handleRegisterAnother = () => {
    clearFormData();
    setSuccess(null);
  };

  // Final submit handler for step 5 - FIXED: Always INSERT new store, never UPDATE
  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    
    try {
      const parent_id = parentDbId || parentIdNum;
      if (!parent_id) {
        throw new Error("Parent ID is missing");
      }

      // First, get the parent merchant details
      const { data: parentData, error: parentError } = await supabase
        .from("merchant_parent")
        .select("parent_merchant_id, parent_store_name")
        .eq("id", parent_id)
        .single();

      if (parentError) {
        console.error("Parent fetch error:", parentError);
        throw new Error("Failed to fetch parent details");
      }

      // Prepare the final store data with all fields according to schema
      // IMPORTANT: We are always INSERTING a new row, never updating existing
      const storeData = {
        parent_id,
        store_name: form.store_name,
        cuisine_type: form.cuisine_type.filter(c => c.trim() !== ""),
        store_description: form.store_description,
        store_email: form.store_email || null,
        store_phones: form.store_phones.filter(p => p.trim() !== ""),
        store_banner_url: form.store_banner_url || null,
        ads_images: form.ads_images.filter(a => a.trim() !== ""),
        full_address: form.full_address,
        city: form.city,
        state: form.state,
        landmark: form.landmark || null,
        postal_code: form.postal_code,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        gst_number: form.gst_number || null,
        gst_image_url: form.gst_image_url || null,
        pan_number: form.pan_number,
        pan_image_url: form.pan_image_url,
        aadhar_number: form.aadhar_number,
        aadhar_image_url: form.aadhar_image_url,
        fssai_number: form.fssai_number || null,
        fssai_image_url: form.fssai_image_url || null,
        bank_account_holder: form.bank_account_holder,
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc,
        bank_name: form.bank_name,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        closed_days: form.closed_days.filter(d => d.trim() !== ""),
        avg_delivery_time_minutes: form.avg_delivery_time_minutes ? Number(form.avg_delivery_time_minutes) : null,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        has_area_manager: form.has_area_manager,
        am_name: form.am_name || null,
        am_mobile: form.am_mobile || null,
        am_email: form.am_email || null,
        approval_status: "SUBMITTED",
        is_active: true,
        current_step: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("Inserting NEW store data:", storeData);

      // ALWAYS INSERT NEW STORE - DO NOT CHECK FOR EXISTING
      // The trigger will automatically generate a new store_id
      const result = await supabase
        .from("merchant_store")
        .insert([storeData])
        .select();

      if (result.error) {
        console.error("Insert error details:", result.error);
        throw new Error(`Failed to create store: ${result.error.message}`);
      }

      // Get the actual store_id from the result
      const store_id = result.data?.[0]?.store_id;

      if (!store_id) {
        throw new Error("Store ID was not generated");
      }

      // Clear localStorage after successful submission
      clearFormData();

      // Show success message with store ID
      setSuccess({ 
        store_id: store_id,
        status: "SUBMITTED"
      });
      
      // Refresh child stores list
      const { data: updatedStores, error: fetchError } = await supabase
        .from("merchant_store")
        .select("*, merchant_parent(parent_merchant_id, parent_store_name)")
        .eq("parent_id", parent_id)
        .order("created_at", { ascending: false });
      
      if (!fetchError && updatedStores) {
        setChildStores(updatedStores);
      }
      
    } catch (error: any) {
      console.error("Submit error:", error);
      setError(error.message || "Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Function to get status display
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case "SUBMITTED":
        return { 
          text: "Submitted for Review", 
          color: "text-blue-600", 
          bgColor: "bg-blue-50",
          message: "Your form is successfully filled and under review. Please wait for admin approval."
        };
      case "UNDER_VERIFICATION":
        return { 
          text: "Under Verification", 
          color: "text-yellow-600", 
          bgColor: "bg-yellow-50",
          message: "Your store is currently under verification process."
        };
      case "APPROVED":
        return { 
          text: "Approved", 
          color: "text-green-600", 
          bgColor: "bg-green-50",
          message: "Congratulations! Your store has been approved."
        };
      case "REJECTED":
        return { 
          text: "Rejected", 
          color: "text-red-600", 
          bgColor: "bg-red-50",
          message: "Your store registration has been rejected. Please check the reason below."
        };
      default:
        return { 
          text: "Submitted", 
          color: "text-blue-600", 
          bgColor: "bg-blue-50",
          message: "Your form is successfully filled and under review. Please wait for admin approval."
        };
    }
  };

  // Function to fetch current status (for real-time updates)
  const fetchCurrentStatus = async () => {
    if (!success?.store_id) return;
    
    try {
      const { data, error } = await supabase
        .from("merchant_store")
        .select("approval_status, approval_reason")
        .eq("store_id", success.store_id)
        .single();

      if (!error && data && data.approval_status !== success.status) {
        // Status has changed, update the UI
        setSuccess(prev => prev ? { ...prev, status: data.approval_status } : null);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  // Poll for status updates every 30 seconds
  useEffect(() => {
    if (!success?.store_id) return;

    const intervalId = setInterval(fetchCurrentStatus, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [success?.store_id]);

  // Function to get step display for child store
  const getChildStoreStep = (store: any) => {
    if (store.approval_status === "APPROVED") return { step: 5, label: "Approved", color: "bg-green-100 text-green-800" };
    if (store.approval_status === "REJECTED") return { step: 5, label: "Rejected", color: "bg-red-100 text-red-800" };
    if (store.approval_status === "UNDER_VERIFICATION") return { step: 5, label: "Under Verification", color: "bg-yellow-100 text-yellow-800" };
    
    const currentStep = store.current_step || 1;
    const stepLabels = ["Not Started", "Basic Info", "Legal & Compliance", "Bank Details", "Operations", "Submitted"];
    const colors = ["bg-gray-100 text-gray-800", "bg-blue-100 text-blue-800", "bg-purple-100 text-purple-800", 
                   "bg-indigo-100 text-indigo-800", "bg-pink-100 text-pink-800", "bg-green-100 text-green-800"];
    
    return {
      step: currentStep,
      label: stepLabels[currentStep] || `Step ${currentStep}`,
      color: colors[currentStep] || colors[0]
    };
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Registration Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Register New Store</h1>
                <p className="text-gray-600 text-sm mt-1">Complete all steps to register your store</p>
              </div>

              {/* Parent Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Parent ID</label>
                  {!loadingParent ? (
                    <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 font-medium">
                      {parentMerchantId || parentIdParam || 'Loading...'}
                    </div>
                  ) : (
                    <div className="h-9 bg-gray-200 rounded animate-pulse" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Parent Store</label>
                  {!loadingParent ? (
                    <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 font-medium">
                      {parentStoreName || 'Loading...'}
                    </div>
                  ) : (
                    <div className="h-9 bg-gray-200 rounded animate-pulse" />
                  )}
                </div>
              </div>

              {/* Only show progress bar if not in success state */}
              {!success && (
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    {steps.map((s) => (
                      <div key={s.number} className="text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          step >= s.number 
                            ? 'bg-blue-600 text-white border-2 border-blue-600' 
                            : 'bg-white text-gray-500 border-2 border-gray-300'
                        }`}>
                          {s.number}
                        </div>
                        <span className={`text-xs font-medium ${
                          step >= s.number ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${((step - 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form Content */}
            <div className="px-8 pb-8 max-h-[65vh] overflow-y-auto">
              {success ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Store Registration Successful!</h2>
                  
                  <div className={`p-4 rounded-lg mb-4 ${getStatusDisplay(success.status).bgColor}`}>
                    <p className="text-gray-600 mb-2">{getStatusDisplay(success.status).message}</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusDisplay(success.status).color} ${getStatusDisplay(success.status).bgColor} border border-current`}>
                      Status: {getStatusDisplay(success.status).text}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 inline-block mb-6">
                    <div className="text-sm text-gray-500">Store ID</div>
                    <div className="text-lg font-mono font-bold text-gray-800">{success.store_id}</div>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleRegisterAnother}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Register Another Store
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (step < 5) {
                    next();
                  } else {
                    handleSubmit();
                  }
                }}>
                  {/* Step 1: Basic Information */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Store Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.store_name}
                            onChange={e => updateField('store_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Enter store name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Cuisine Type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              ref={cuisineInputRef}
                              required
                              value={form.cuisine_type[0]}
                              onChange={e => updateField('cuisine_type', [e.target.value])}
                              onFocus={() => setShowSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                              placeholder="Select cuisine type"
                            />
                            {showSuggestions && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {cuisineSuggestions.map((cuisine) => (
                                  <div
                                    key={cuisine}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-gray-700"
                                    onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                                    onClick={() => handleCuisineSelect(cuisine)}
                                  >
                                    {cuisine}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {showOtherCuisine && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Specify Cuisine
                              </label>
                              <input
                                value={otherCuisine}
                                onChange={e => setOtherCuisine(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Enter your cuisine type"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Store Description
                        </label>
                        <textarea
                          value={form.store_description}
                          onChange={e => updateField('store_description', e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                          placeholder="Describe your store"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Store Email
                          </label>
                          <input
                            type="email"
                            ref={storeEmailRef}
                            value={form.store_email}
                            onChange={e => updateField('store_email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="store@example.com"
                            suppressHydrationWarning
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Store Phone(s) <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.store_phones.join(', ')}
                            onChange={e => updateField('store_phones', e.target.value.split(',').map(p => p.trim()))}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="9999999999, 8888888888"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate multiple numbers with commas</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.city}
                            onChange={e => updateField('city', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Enter city"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.state}
                            onChange={e => updateField('state', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Enter state"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Full Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={form.full_address}
                          onChange={e => updateField('full_address', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                          placeholder="Complete address including street, building, etc."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Postal Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.postal_code}
                            onChange={e => updateField('postal_code', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="PIN code"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              Latitude <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleFetchCoordinates}
                              disabled={isFetchingCoordinates}
                              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              {isFetchingCoordinates ? 'Fetching...' : hasConfirmedPin ? 'Re-fetch' : 'Auto-fetch'}
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.000000001"
                            value={formatCoordinate(form.latitude)}
                            onChange={handleLatitudeChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="28.613939..."
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">9 decimal places precision</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              Longitude <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleFetchCoordinates}
                              disabled={isFetchingCoordinates}
                              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              {isFetchingCoordinates ? 'Fetching...' : hasConfirmedPin ? 'Re-fetch' : 'Auto-fetch'}
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.000000001"
                            value={formatCoordinate(form.longitude)}
                            onChange={handleLongitudeChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="77.209021..."
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">9 decimal places precision</p>
                        </div>
                      </div>

                      {/* Interactive Map Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Confirm Store Location</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Drag and drop the pin to exactly match your store location
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={toggleMap}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {showMap ? 'Hide Map' : 'Show Map'}
                          </button>
                        </div>

                        {/* Location Status */}
                        <div className={`p-4 rounded-lg ${hasConfirmedPin ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm ${hasConfirmedPin ? 'text-green-700' : 'text-blue-700'}`}>
                                {hasConfirmedPin ? (
                                  <>
                                    <span className="font-medium">✓ Location Confirmed</span> - Using pinned coordinates
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium">Location Not Confirmed</span> - Please confirm your store location by adjusting the pin on the map
                                  </>
                                )}
                              </p>
                              {hasConfirmedPin ? (
                                <p className="text-xs text-green-600 mt-1">
                                  Pinned at: {formatCoordinate(pinnedCoordinates.lat)}, {formatCoordinate(pinnedCoordinates.lng)}
                                </p>
                              ) : form.latitude && form.longitude ? (
                                <p className="text-xs text-blue-600 mt-1">
                                  Fetched location: {formatCoordinate(form.latitude)}, {formatCoordinate(form.longitude)}
                                </p>
                              ) : null}
                              <p className="text-xs text-gray-500 mt-1">
                                Based on: {form.full_address}, {form.city}, {form.state} {form.postal_code}
                              </p>
                            </div>
                            {!hasConfirmedPin && form.latitude && form.longitude && (
                              <div className="text-sm text-yellow-600 font-medium">
                                ⚠ Please adjust pin to confirm
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Map */}
                        {showMap && (
                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <div style={{ height: '400px' }}>
                              <MapComponent
                                initialCenter={mapCoordinates.lat && mapCoordinates.lng ? 
                                  { lat: mapCoordinates.lat, lng: mapCoordinates.lng } : 
                                  { lat: pinnedCoordinates.lat, lng: pinnedCoordinates.lng }
                                }
                                onPinConfirm={handleConfirmPin}
                                showControls={true}
                              />
                            </div>
                            
                            <div className="bg-gray-50 p-4 border-t">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-700 font-medium mb-1">Instructions:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    <li>• Drag the red pin to adjust location</li>
                                    <li>• Click anywhere on map to place pin</li>
                                    <li>• Scroll to zoom in/out</li>
                                    <li>• Drag map to navigate</li>
                                  </ul>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-700 font-medium mb-1">Current Pin:</p>
                                  <p className="text-xs font-mono text-gray-600">
                                    {pinnedCoordinates.lat ? formatCoordinate(pinnedCoordinates.lat) : '--'}, 
                                    {pinnedCoordinates.lng ? formatCoordinate(pinnedCoordinates.lng) : '--'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Map Toggle Instructions */}
                        {!showMap && form.latitude && form.longitude && (
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-700">
                              <span className="font-medium">Important:</span> Click "Show Map" above to confirm your store location by adjusting the pin. You must confirm the location before proceeding.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Note:</span> Latitude and Longitude will be auto-fetched when you fill the address. You must confirm the exact location on the interactive map before proceeding.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Legal & Compliance */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              PAN Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              required
                              value={form.pan_number}
                              onChange={e => updateField('pan_number', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                              placeholder="ABCDE1234F"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              PAN Image <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handlePanFile}
                                  className="hidden"
                                  id="pan-upload"
                                />
                                <label
                                  htmlFor="pan-upload"
                                  className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  {uploadingPan ? 'Uploading...' : 'Upload PAN'}
                                </label>
                                {panPreview && (
                                  <div className="flex items-center gap-2">
                                    <img src={panPreview} alt="PAN Preview" className="w-20 h-12 object-cover rounded border" />
                                    <span className="text-xs text-gray-600">Preview</span>
                                  </div>
                                )}
                              </div>
                              {form.pan_image_url && !panPreview && (
                                <p className="text-xs text-green-600">✓ PAN image uploaded</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Aadhar Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              required
                              value={form.aadhar_number}
                              onChange={e => updateField('aadhar_number', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                              placeholder="1234 5678 9012"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Aadhar Image <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handleAadharFile}
                                  className="hidden"
                                  id="aadhar-upload"
                                />
                                <label
                                  htmlFor="aadhar-upload"
                                  className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  {uploadingAadhar ? 'Uploading...' : 'Upload Aadhar'}
                                </label>
                                {aadharPreview && (
                                  <div className="flex items-center gap-2">
                                    <img src={aadharPreview} alt="Aadhar Preview" className="w-20 h-12 object-cover rounded border" />
                                    <span className="text-xs text-gray-600">Preview</span>
                                  </div>
                                )}
                              </div>
                              {form.aadhar_image_url && !aadharPreview && (
                                <p className="text-xs text-green-600">✓ Aadhar image uploaded</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              GST Number (Optional)
                            </label>
                            <input
                              value={form.gst_number}
                              onChange={e => updateField('gst_number', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                              placeholder="GSTIN"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              GST Image
                            </label>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handleGstFile}
                                  className="hidden"
                                  id="gst-upload"
                                />
                                <label
                                  htmlFor="gst-upload"
                                  className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  {uploadingGst ? 'Uploading...' : 'Upload GST'}
                                </label>
                                {gstPreview && (
                                  <div className="flex items-center gap-2">
                                    <img src={gstPreview} alt="GST Preview" className="w-20 h-12 object-cover rounded border" />
                                    <span className="text-xs text-gray-600">Preview</span>
                                  </div>
                                )}
                              </div>
                              {form.gst_image_url && !gstPreview && (
                                <p className="text-xs text-green-600">✓ GST image uploaded</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              FSSAI Number (Optional)
                            </label>
                            <input
                              value={form.fssai_number}
                              onChange={e => updateField('fssai_number', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                              placeholder="FSSAI number"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              FSSAI Image
                            </label>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handleFssaiFile}
                                  className="hidden"
                                  id="fssai-upload"
                                />
                                <label
                                  htmlFor="fssai-upload"
                                  className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  {uploadingFssai ? 'Uploading...' : 'Upload FSSAI'}
                                </label>
                                {fssaiPreview && (
                                  <div className="flex items-center gap-2">
                                    <img src={fssaiPreview} alt="FSSAI Preview" className="w-20 h-12 object-cover rounded border" />
                                    <span className="text-xs text-gray-600">Preview</span>
                                  </div>
                                )}
                              </div>
                              {form.fssai_image_url && !fssaiPreview && (
                                <p className="text-xs text-green-600">✓ FSSAI image uploaded</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Bank Details */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Account Holder <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.bank_account_holder}
                            onChange={e => updateField('bank_account_holder', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Account holder name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.bank_account_number}
                            onChange={e => updateField('bank_account_number', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Bank account number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            IFSC Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.bank_ifsc}
                            onChange={e => updateField('bank_ifsc', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="IFSC code"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Bank Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            value={form.bank_name}
                            onChange={e => updateField('bank_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            placeholder="Bank name"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Operations & Manager */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Opening Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={form.opening_time}
                            onChange={e => updateField('opening_time', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Closing Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={form.closing_time}
                            onChange={e => updateField('closing_time', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Closed Days
                        </label>
                        <input
                          value={form.closed_days.join(', ')}
                          onChange={e => updateField('closed_days', e.target.value.split(',').map(d => d.trim()))}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                          placeholder="Monday, Sunday"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate days with commas</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Avg Delivery Time (minutes)
                          </label>
                          <input
                            type="number"
                            value={form.avg_delivery_time_minutes ?? ''}
                            onChange={e => updateField('avg_delivery_time_minutes', e.target.value ? Number(e.target.value) : null)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                            placeholder="30"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Min Order Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={form.min_order_amount ?? ''}
                            onChange={e => updateField('min_order_amount', e.target.value ? Number(e.target.value) : null)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Area Manager Details
                            </label>
                            <p className="text-xs text-gray-500">Add manager details if applicable</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Has Area Manager</span>
                            <button
                              type="button"
                              onClick={() => updateField('has_area_manager', !form.has_area_manager)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full ${form.has_area_manager ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${form.has_area_manager ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>

                        {form.has_area_manager && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Name</label>
                              <input
                                value={form.am_name}
                                onChange={e => updateField('am_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                                placeholder="Manager name"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Mobile</label>
                              <input
                                value={form.am_mobile}
                                onChange={e => updateField('am_mobile', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                                placeholder="Mobile number"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Email</label>
                              <input
                                type="email"
                                ref={amEmailRef}
                                value={form.am_email}
                                onChange={e => updateField('am_email', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                                placeholder="Email address"
                                suppressHydrationWarning
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Review & Submit */}
                  {step === 5 && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Review Store Details</h2>
                        
                        <div className="space-y-4">
                          {/* Basic Info Summary */}
                          <div className="border-b pb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><span className="text-gray-500">Store Name:</span> <span className="text-gray-800">{form.store_name}</span></div>
                              <div><span className="text-gray-500">Cuisine:</span> <span className="text-gray-800">{form.cuisine_type[0]}</span></div>
                              <div><span className="text-gray-500">City:</span> <span className="text-gray-800">{form.city}</span></div>
                              <div><span className="text-gray-500">State:</span> <span className="text-gray-800">{form.state}</span></div>
                              <div><span className="text-gray-500">Postal Code:</span> <span className="text-gray-800">{form.postal_code}</span></div>
                              <div><span className="text-gray-500">Address:</span> <span className="text-gray-800">{form.full_address}</span></div>
                              <div><span className="text-gray-500">Latitude:</span> <span className="text-gray-800">{formatCoordinate(form.latitude)}</span></div>
                              <div><span className="text-gray-500">Longitude:</span> <span className="text-gray-800">{formatCoordinate(form.longitude)}</span></div>
                              <div className="md:col-span-2">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${hasConfirmedPin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {hasConfirmedPin ? '✓ Location Confirmed on Map' : '⚠ Location Not Confirmed'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Legal Summary */}
                          <div className="border-b pb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Legal & Compliance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><span className="text-gray-500">PAN:</span> <span className="text-gray-800">{form.pan_number}</span></div>
                              <div><span className="text-gray-500">Aadhar:</span> <span className="text-gray-800">{form.aadhar_number}</span></div>
                              {form.gst_number && <div><span className="text-gray-500">GST:</span> <span className="text-gray-800">{form.gst_number}</span></div>}
                              {form.fssai_number && <div><span className="text-gray-500">FSSAI:</span> <span className="text-gray-800">{form.fssai_number}</span></div>}
                            </div>
                          </div>

                          {/* Bank Summary */}
                          <div className="border-b pb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><span className="text-gray-500">Account Holder:</span> <span className="text-gray-800">{form.bank_account_holder}</span></div>
                              <div><span className="text-gray-500">Bank:</span> <span className="text-gray-800">{form.bank_name}</span></div>
                              <div><span className="text-gray-500">Account Number:</span> <span className="text-gray-800">{form.bank_account_number}</span></div>
                              <div><span className="text-gray-500">IFSC:</span> <span className="text-gray-800">{form.bank_ifsc}</span></div>
                            </div>
                          </div>

                          {/* Operations Summary */}
                          <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Operations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><span className="text-gray-500">Timings:</span> <span className="text-gray-800">{form.opening_time} - {form.closing_time}</span></div>
                              <div><span className="text-gray-500">Closed Days:</span> <span className="text-gray-800">{form.closed_days.join(', ') || 'None'}</span></div>
                              <div><span className="text-gray-500">Delivery Time:</span> <span className="text-gray-800">{form.avg_delivery_time_minutes || '30'} minutes</span></div>
                              <div><span className="text-gray-500">Min Order:</span> <span className="text-gray-800">₹{form.min_order_amount || '100'}</span></div>
                              {form.has_area_manager && (
                                <>
                                  <div><span className="text-gray-500">Area Manager:</span> <span className="text-gray-800">{form.am_name}</span></div>
                                  <div><span className="text-gray-500">Manager Contact:</span> <span className="text-gray-800">{form.am_mobile}</span></div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-8 border-t">
                    <div>
                      {step > 1 && (
                        <button
                          type="button"
                          onClick={prev}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          ← Previous
                        </button>
                      )}
                    </div>
                    <div>
                      {step < 5 ? (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Saving...' : 'Continue →'}
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : 'Submit Registration'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Child Stores List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full">
            <div className="px-6 pt-6 pb-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Your Stores</h2>
              <p className="text-gray-600 text-sm mt-1">List of registered stores under this parent</p>
            </div>
            
            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {loadingChildStores ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : childStores.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No stores registered yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start by registering your first store</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {childStores.map((store) => {
                    const stepInfo = getChildStoreStep(store);
                    const statusInfo = getStatusDisplay(store.approval_status);
                    
                    return (
                      <div key={store.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{store.store_name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{store.cuisine_type?.[0] || "No cuisine specified"}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${stepInfo.color}`}>
                            {stepInfo.label}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 w-24">Store ID:</span>
                            <span className="font-mono text-gray-700">{store.store_id}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 w-24">Status:</span>
                            <span className={`font-medium ${statusInfo.color}`}>
                              {statusInfo.text}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 w-24">Location:</span>
                            <span className="text-gray-700 truncate">{store.city}, {store.state}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 w-24">Created:</span>
                            <span className="text-gray-700">
                              {new Date(store.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Steps */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between mb-2">
                            {[1, 2, 3, 4, 5].map((stepNum) => (
                              <div key={stepNum} className="relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                  stepInfo.step >= stepNum 
                                    ? stepNum === 5 && store.approval_status === "APPROVED" 
                                      ? 'bg-green-500 text-white'
                                      : stepNum === 5 && store.approval_status === "REJECTED"
                                      ? 'bg-red-500 text-white'
                                      : 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {stepNum}
                                </div>
                                {stepNum < 5 && (
                                  <div className={`absolute top-3 left-6 h-0.5 w-6 ${
                                    stepInfo.step > stepNum ? 'bg-blue-500' : 'bg-gray-200'
                                  }`} />
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 text-center mt-1">
                            {stepInfo.step === 5 
                              ? store.approval_status === "APPROVED" 
                                ? "✓ Completed & Approved"
                                : store.approval_status === "REJECTED"
                                ? "✗ Registration Rejected"
                                : "Submitted for Review"
                              : `Step ${stepInfo.step} of 5`
                            }
                          </div>
                        </div>
                        
                        {store.approval_reason && store.approval_status === "REJECTED" && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                            <span className="font-medium">Reason:</span> {store.approval_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {childStores.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Showing {childStores.length} store{childStores.length !== 1 ? 's' : ''} under this parent
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}