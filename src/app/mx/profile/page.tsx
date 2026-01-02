"use client";

import React, { useEffect, useState, useRef } from "react";
import { MXLayoutWhite } from "@/components/MXLayoutWhite";
import { fetchRestaurantById as fetchStoreById, updateStoreInfo } from "@/lib/database";
import { MerchantStore } from "@/lib/merchantStore";
import { Toaster, toast } from "sonner";
import { 
  Building, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  User, 
  CheckCircle,
  Shield,
  Package,
  Star,
  FileText,
  Edit2,
  Upload,
  DollarSign,
  Hash,
  Tag,
  Calendar,
  Activity,
  Banknote,
  Map,
  Lock,
  Globe,
  Image as ImageIcon
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [editData, setEditData] = useState<MerchantStore | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmSave, setConfirmSave] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const adsInputRef = useRef<HTMLInputElement>(null);

  /* ===== GET STORE ID ===== */
  useEffect(() => {
    const id = localStorage.getItem("selectedStoreId") || localStorage.getItem("selectedRestaurantId");
    if (!id) {
      toast.error("Store ID not found");
      return;
    }
    setStoreId(id);
  }, []);

  /* ===== FETCH DATA ===== */
  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetchStoreById(storeId)
      .then((data) => {
        setStore(data);
        setEditData(data);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [storeId]);

  /* ===== STORE NAME LOGIC ===== */
  const storeInitial = store?.store_name?.charAt(0).toUpperCase() || "R";
  const isVerified = store?.approval_status === 'APPROVED';

  /* ===== SAVE CHANGES ===== */
  const handleSave = async () => {
    if (!storeId || !editData) return;

    try {
      await updateStoreInfo(storeId, {
        store_name: editData.store_name,
        store_email: editData.store_email,
        store_phones: editData.store_phones,
        store_description: editData.store_description,
        cuisine_type: editData.cuisine_type,
        full_address: editData.full_address,
        city: editData.city,
        state: editData.state,
        landmark: editData.landmark,
        postal_code: editData.postal_code,
        latitude: editData.latitude,
        longitude: editData.longitude,
        gst_number: editData.gst_number,
        pan_number: editData.pan_number,
        aadhar_number: editData.aadhar_number,
        fssai_number: editData.fssai_number,
        bank_account_holder: editData.bank_account_holder,
        bank_account_number: editData.bank_account_number,
        bank_ifsc: editData.bank_ifsc,
        bank_name: editData.bank_name,
        opening_time: editData.opening_time,
        closing_time: editData.closing_time,
        closed_days: editData.closed_days,
        avg_delivery_time_minutes: editData.avg_delivery_time_minutes,
        min_order_amount: editData.min_order_amount,
        am_name: editData.am_name,
        am_mobile: editData.am_mobile,
        am_email: editData.am_email,
      });

      setStore(editData);
      setEditingField(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setConfirmSave(false);
    }
  };

  /* ===== IMAGE UPLOAD HANDLERS ===== */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'ads') => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !storeId) return;

    setUploadingImages(files.map(file => URL.createObjectURL(file)));

    try {
      const uploadPromises = files.map(async (file) => {
        const reader = new FileReader();
        return new Promise<string>((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(uploadPromises);

      if (type === 'banner') {
        // Update store banner (single image)
        await updateStoreInfo(storeId, { store_banner_url: base64Images[0] });
        setStore(r => r ? { ...r, store_banner_url: base64Images[0] } : r);
        setEditData(r => r ? { ...r, store_banner_url: base64Images[0] } : r);
        toast.success("Store banner updated!");
      } else if (type === 'ads') {
        // Update ads images (multiple images)
        const currentAds = store?.ads_images || [];
        const newAds = [...currentAds, ...base64Images].slice(0, 5); // Keep max 5 images
        await updateStoreInfo(storeId, { ads_images: newAds });
        setStore(r => r ? { ...r, ads_images: newAds } : r);
        setEditData(r => r ? { ...r, ads_images: newAds } : r);
        toast.success("Ads images updated!");
      }

      setUploadingImages([]);
      if (type === 'ads') {
        setShowImageUploadModal(false);
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Image upload failed");
      setUploadingImages([]);
    }
  };

  /* ===== REMOVE AD IMAGE ===== */
  const handleRemoveAdImage = async (index: number) => {
    if (!storeId || !store?.ads_images) return;

    const newAds = [...store.ads_images];
    newAds.splice(index, 1);

    try {
      await updateStoreInfo(storeId, { ads_images: newAds });
      setStore(r => r ? { ...r, ads_images: newAds } : r);
      setEditData(r => r ? { ...r, ads_images: newAds } : r);
      toast.success("Image removed!");
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  /* ===== FORMATTING FUNCTIONS ===== */
  const formatTime = (timeString?: string) => {
    if (!timeString) return "—";
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatArray = (arr?: string[]) => {
    if (!arr || arr.length === 0) return "—";
    return arr.join(', ');
  };

  const startEditing = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const stopEditing = () => {
    setEditingField(null);
  };

  if (loading) {
    return (
      <MXLayoutWhite restaurantName={editData?.store_name || ''} restaurantId={storeId || ''}>
        <div className="min-h-screen bg-gray-50 hide-scrollbar">
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-3xl mx-auto">
              <div className="flex gap-6 p-6">
                <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    );
  }

  if (!store || !editData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Profile not found</div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <MXLayoutWhite
        restaurantName={store.store_name}
        restaurantId={store.store_id}
      >
        <div className="min-h-screen bg-gray-50 p-4 hide-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Merchant Profile</h1>
                  <p className="text-sm text-gray-600 mt-0.5">Manage your restaurant details</p>
                </div>
                <button
                  onClick={() => setConfirmSave(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>

            {/* MAIN CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* STORE HEADER */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold">
                        {storeInitial}
                      </div>
                      {isVerified && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                          <CheckCircle size={12} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          {store.store_name}
                        </h2>
                        <span className="text-xs text-gray-600">
                          • {formatArray(store.cuisine_type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {store.city}, {store.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(store.opening_time)} - {formatTime(store.closing_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* QUICK STATS */}
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{store.min_order_amount || 0}</div>
                      <div className="text-xs text-gray-500">Min Order</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{store.avg_delivery_time_minutes || 0}m</div>
                      <div className="text-xs text-gray-500">Delivery</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">
                        {store.approval_status === 'APPROVED' ? 'Verified' : 'Pending'}
                      </div>
                      <div className="text-xs text-gray-500">Status</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTENT GRID */}
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  
                  {/* COLUMN 1: STORE DETAILS */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Building size={16} className="text-blue-600" />
                        Store Details
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="Store Name"
                          value={editData.store_name}
                          isEditing={editingField === 'store_name'}
                          onEdit={() => startEditing('store_name')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, store_name: v })}
                        />
                        <CompactEditableRow
                          label="Cuisine Type"
                          value={formatArray(editData.cuisine_type)}
                          isEditing={editingField === 'cuisine_type'}
                          onEdit={() => startEditing('cuisine_type')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, cuisine_type: v.split(',').map(s => s.trim()) })}
                        />
                        <CompactEditableRow
                          label="Store Email"
                          value={editData.store_email}
                          isEditing={editingField === 'store_email'}
                          onEdit={() => startEditing('store_email')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, store_email: v })}
                        />
                        <CompactEditableRow
                          label="Store Phones"
                          value={formatArray(editData.store_phones)}
                          isEditing={editingField === 'store_phones'}
                          onEdit={() => startEditing('store_phones')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, store_phones: v.split(',').map(s => s.trim()) })}
                        />
                        <CompactEditableRow
                          label="Description"
                          value={editData.store_description}
                          isEditing={editingField === 'store_description'}
                          onEdit={() => startEditing('store_description')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, store_description: v })}
                          multiline
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        Location
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="Full Address"
                          value={editData.full_address}
                          isEditing={editingField === 'full_address'}
                          onEdit={() => startEditing('full_address')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, full_address: v })}
                          multiline
                        />
                        <CompactEditableRow
                          label="City"
                          value={editData.city}
                          isEditing={editingField === 'city'}
                          onEdit={() => startEditing('city')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, city: v })}
                        />
                        <CompactEditableRow
                          label="State"
                          value={editData.state}
                          isEditing={editingField === 'state'}
                          onEdit={() => startEditing('state')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, state: v })}
                        />
                        <CompactEditableRow
                          label="Landmark"
                          value={editData.landmark}
                          isEditing={editingField === 'landmark'}
                          onEdit={() => startEditing('landmark')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, landmark: v })}
                        />
                        <CompactEditableRow
                          label="Postal Code"
                          value={editData.postal_code}
                          isEditing={editingField === 'postal_code'}
                          onEdit={() => startEditing('postal_code')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, postal_code: v })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <CompactEditableRow
                            label="Latitude"
                            value={editData.latitude}
                            isEditing={editingField === 'latitude'}
                            onEdit={() => startEditing('latitude')}
                            onSave={stopEditing}
                            onChange={(v) => setEditData({ ...editData, latitude: parseFloat(v) })}
                          />
                          <CompactEditableRow
                            label="Longitude"
                            value={editData.longitude}
                            isEditing={editingField === 'longitude'}
                            onEdit={() => startEditing('longitude')}
                            onSave={stopEditing}
                            onChange={(v) => setEditData({ ...editData, longitude: parseFloat(v) })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: TIMINGS & OPERATIONS */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-blue-600" />
                        Operating Hours
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="Opening Time"
                          value={editData.opening_time}
                          isEditing={editingField === 'opening_time'}
                          onEdit={() => startEditing('opening_time')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, opening_time: v })}
                        />
                        <CompactEditableRow
                          label="Closing Time"
                          value={editData.closing_time}
                          isEditing={editingField === 'closing_time'}
                          onEdit={() => startEditing('closing_time')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, closing_time: v })}
                        />
                        <CompactEditableRow
                          label="Closed Days"
                          value={formatArray(editData.closed_days)}
                          isEditing={editingField === 'closed_days'}
                          onEdit={() => startEditing('closed_days')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, closed_days: v.split(',').map(s => s.trim()) })}
                        />
                        <CompactEditableRow
                          label="Avg Delivery (min)"
                          value={editData.avg_delivery_time_minutes}
                          isEditing={editingField === 'avg_delivery_time_minutes'}
                          onEdit={() => startEditing('avg_delivery_time_minutes')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, avg_delivery_time_minutes: parseInt(v) || 0 })}
                        />
                        <CompactEditableRow
                          label="Min Order Amount"
                          value={editData.min_order_amount}
                          isEditing={editingField === 'min_order_amount'}
                          onEdit={() => startEditing('min_order_amount')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, min_order_amount: parseFloat(v) || 0 })}
                          prefix="₹"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User size={16} className="text-blue-600" />
                        Area Manager
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="AM Name"
                          value={editData.am_name}
                          isEditing={editingField === 'am_name'}
                          onEdit={() => startEditing('am_name')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, am_name: v })}
                        />
                        <CompactEditableRow
                          label="AM Mobile"
                          value={editData.am_mobile}
                          isEditing={editingField === 'am_mobile'}
                          onEdit={() => startEditing('am_mobile')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, am_mobile: v })}
                        />
                        <CompactEditableRow
                          label="AM Email"
                          value={editData.am_email}
                          isEditing={editingField === 'am_email'}
                          onEdit={() => startEditing('am_email')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, am_email: v })}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-blue-600" />
                        Store Info
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Hash size={12} className="text-gray-500" />
                          <span className="text-gray-800">Store ID:</span>
                          <span className="font-semibold text-gray-900">{store.store_id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-500" />
                          <span className="text-gray-800">Created:</span>
                          <span className="font-semibold text-gray-900">{formatDate(store.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity size={12} className="text-gray-500" />
                          <span className="text-gray-800">Status:</span>
                          <span className={`font-semibold ${
                            store.approval_status === 'APPROVED' ? 'text-green-600' :
                            store.approval_status === 'REJECTED' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {store.approval_status || 'SUBMITTED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity size={12} className="text-gray-500" />
                          <span className="text-gray-800">Active:</span>
                          <span className={`font-semibold ${store.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {store.is_active ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: DOCUMENTS & IMAGES */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-blue-600" />
                        Legal Documents
                      </h3>
                      <div className="space-y-3">
                        <CompactLockedRow
                          label="GST Number"
                          value={store.gst_number}
                        />
                        <CompactLockedRow
                          label="PAN Number"
                          value={store.pan_number}
                        />
                        <CompactLockedRow
                          label="Aadhar Number"
                          value={store.aadhar_number}
                        />
                        <CompactLockedRow
                          label="FSSAI Number"
                          value={store.fssai_number}
                        />
                        {store.gst_image_url && (
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">GST Image</div>
                            <img src={store.gst_image_url} alt="GST" className="h-20 rounded border" />
                          </div>
                        )}
                        {store.pan_image_url && (
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">PAN Image</div>
                            <img src={store.pan_image_url} alt="PAN" className="h-20 rounded border" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Banknote size={16} className="text-blue-600" />
                        Bank Details
                      </h3>
                      <div className="space-y-3">
                        <CompactLockedRow
                          label="Account Holder"
                          value={store.bank_account_holder}
                        />
                        <CompactLockedRow
                          label="Account Number"
                          value={store.bank_account_number}
                        />
                        <CompactLockedRow
                          label="IFSC Code"
                          value={store.bank_ifsc}
                        />
                        <CompactLockedRow
                          label="Bank Name"
                          value={store.bank_name}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* IMAGE CARDS - HORIZONTAL LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                  {/* STORE BANNER CARD */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          Store Banner
                        </h3>
                        <p className="text-xs text-gray-600">
                          Upload your store banner image
                        </p>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <Upload size={12} />
                        Upload Banner
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={bannerInputRef}
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e, 'banner')}
                      />
                    </div>
                    {store.store_banner_url ? (
                      <img
                        src={store.store_banner_url}
                        alt="Store Banner"
                        className="mt-2 rounded-lg w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="mt-2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon size={24} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No banner uploaded</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ADS IMAGES CARD */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          Ads Images ({store.ads_images?.length || 0}/5)
                        </h3>
                        <p className="text-xs text-gray-600">
                          Upload up to 5 promotional images
                        </p>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        onClick={() => setShowImageUploadModal(true)}
                        disabled={(store.ads_images?.length || 0) >= 5}
                      >
                        <Upload size={12} />
                        Upload Ads
                      </button>
                    </div>
                    
                    {/* ADS IMAGES GRID */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {store.ads_images?.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Ad ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveAdImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {uploadingImages.map((img, index) => (
                        <div key={`uploading-${index}`} className="relative">
                          <img
                            src={img}
                            alt="Uploading..."
                            className="w-full h-24 object-cover rounded-lg opacity-50"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        </div>
                      ))}
                      {(!store.ads_images || store.ads_images.length === 0) && uploadingImages.length === 0 && (
                        <div className="col-span-2 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon size={24} className="text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">No ads images</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MXLayoutWhite>

      {/* IMAGE UPLOAD MODAL */}
      {showImageUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Ads Images</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload promotional images (max 5 total). You can upload {5 - (store.ads_images?.length || 0)} more.
            </p>
            
            <div className="mb-6">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={adsInputRef}
                    onChange={(e) => handleImageUpload(e, 'ads')}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowImageUploadModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => adsInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Select Images
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE CONFIRM MODAL */}
      {confirmSave && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Save Changes?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Confirm to update your profile information
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setConfirmSave(false)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= COMPACT COMPONENTS ================= */

function CompactEditableRow({
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onChange,
  multiline = false,
  prefix = "",
}: {
  label: string;
  value?: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  multiline?: boolean;
  prefix?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      onSave();
    }
    if (e.key === 'Escape') {
      onSave();
    }
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Edit2 size={12} />
          </button>
        ) : (
          <button
            onClick={onSave}
            className="text-green-600 hover:text-green-800 text-xs"
          >
            Save
          </button>
        )}
      </div>
      {isEditing ? (
        multiline ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={handleKeyDown}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            autoFocus
          />
        ) : (
          <input
            type={label.toLowerCase().includes('time') ? 'time' : 'text'}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={handleKeyDown}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        )
      ) : (
        <div className="text-sm text-gray-900 font-medium truncate">
          {prefix && <span className="text-gray-600">{prefix}</span>}
          {value || <span className="text-gray-400">Not set</span>}
        </div>
      )}
    </div>
  );
}

function CompactLockedRow({
  label,
  value,
}: {
  label: string;
  value?: any;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
          Read Only
        </span>
      </div>
      <div className="text-sm text-gray-900 font-medium">
        {value || <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}