"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  CreditCard,
  Edit2,
  Upload,
  DollarSign,
  Hash
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [editData, setEditData] = useState<MerchantStore | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmSave, setConfirmSave] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  // Store Banner upload state
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;
    setIsUploadingBanner(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setBannerPreview(dataUrl);
        await updateStoreInfo(storeId, { store_img: dataUrl });
        toast.success("Banner updated!");
        setStore(r => r ? { ...r, store_img: dataUrl } : r);
        setIsUploadingBanner(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Banner upload error:", err);
      toast.error("Image upload failed: " + (err?.message || "Unknown error"));
      setIsUploadingBanner(false);
    }
  };

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

  if (loading) {
    return (
      <MXLayoutWhite restaurantName={editData?.store_name || ''} restaurantId={storeId || ''}>
        <div className="min-h-screen bg-gray-50 hide-scrollbar">
          {/* Header Skeleton */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>

          {/* Info Skeleton */}
          <div className="bg-white border-b border-gray-200 p-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            ))}
          </div>

          {/* Profile Card Skeleton */}
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-3xl mx-auto">
              <div className="flex gap-6 p-6">
                <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse"></div>
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

  /* ===== STORE NAME LOGIC ===== */
  const storeInitial = store.store_name?.charAt(0).toUpperCase() || "R";
  const isVerified = store.is_verified;

  /* ===== SAVE CHANGES ===== */
  const handleSave = async () => {
    if (!storeId || !editData) return;

    try {
      await updateStoreInfo(storeId, {
        owner_name: editData.owner_name,
        owner_phone: editData.owner_phone,
        owner_email: editData.owner_email,
        phone: editData.phone,
        email: editData.email,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        pincode: editData.pincode,
        opening_time: editData.opening_time,
        closing_time: editData.closing_time,
        min_order_amount: editData.min_order_amount,
        description: editData.description,
      });

      setStore(editData);
      setEditingField(null);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setConfirmSave(false);
    }
  };

  const startEditing = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const stopEditing = () => {
    setEditingField(null);
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <MXLayoutWhite
        restaurantName={store.store_name}
        restaurantId={store.store_id}
      >
        <div className="min-h-screen bg-gray-50 p-4 hide-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* COMPACT HEADER */}
            <div className="mb-4">
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

            {/* MAIN COMPACT CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* RESTAURANT HEADER */}
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
                          {restaurant.restaurant_name}
                        </h2>
                        <span className="text-xs text-gray-600">• {restaurant.cuisine_type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {restaurant.city}, {restaurant.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />
                          {restaurant.avg_rating} ({restaurant.total_reviews})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* QUICK STATS */}
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{restaurant.total_orders}</div>
                      <div className="text-xs text-gray-500">Orders</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{restaurant.delivery_time_minutes}m</div>
                      <div className="text-xs text-gray-500">Delivery</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-bold text-gray-900">₹{restaurant.min_order_amount}</div>
                      <div className="text-xs text-gray-500">Min Order</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DENSE CONTENT GRID */}
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  
                  {/* COLUMN 1: OWNER & CONTACT */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User size={16} className="text-blue-600" />
                        Owner Information
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="Owner Name"
                          value={editData.owner_name}
                          isEditing={editingField === 'owner_name'}
                          onEdit={() => startEditing('owner_name')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, owner_name: v })}
                        />
                        <CompactEditableRow
                          label="Phone"
                          value={editData.owner_phone}
                          isEditing={editingField === 'owner_phone'}
                          onEdit={() => startEditing('owner_phone')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, owner_phone: v })}
                        />
                        <CompactEditableRow
                          label="Email"
                          value={editData.owner_email}
                          isEditing={editingField === 'owner_email'}
                          onEdit={() => startEditing('owner_email')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, owner_email: v })}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Building size={16} className="text-blue-600" />
                        Restaurant Contact
                      </h3>
                      <div className="space-y-3">
                        <CompactEditableRow
                          label="Phone"
                          value={editData.phone}
                          isEditing={editingField === 'phone'}
                          onEdit={() => startEditing('phone')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, phone: v })}
                        />
                        <CompactEditableRow
                          label="Email"
                          value={editData.email}
                          isEditing={editingField === 'email'}
                          onEdit={() => startEditing('email')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, email: v })}
                        />
                        <CompactEditableRow
                          label="Address"
                          value={editData.address}
                          isEditing={editingField === 'address'}
                          onEdit={() => startEditing('address')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, address: v })}
                          multiline
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: TIMINGS & DOCUMENTS */}
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
                          label="Min Order (₹)"
                          value={editData.min_order_amount}
                          isEditing={editingField === 'min_order_amount'}
                          onEdit={() => startEditing('min_order_amount')}
                          onSave={stopEditing}
                          onChange={(v) => setEditData({ ...editData, min_order_amount: v })}
                          prefix="₹"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-blue-600" />
                        Legal Documents
                      </h3>
                      <div className="space-y-3">
                        <CompactLockedRow
                          label="GSTIN"
                          value={restaurant.gstin}
                        />
                        <CompactLockedRow
                          label="FSSAI License"
                          value={restaurant.fssai_license}
                        />
                        <CompactLockedRow
                          label="PAN Number"
                          value={restaurant.pan_number}
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: RESTAURANT DETAILS */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package size={16} className="text-blue-600" />
                        Restaurant Details
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <CompactInfoBadge
                          label="Restaurant ID"
                          value={restaurant.restaurant_id}
                        />
                        <CompactInfoBadge
                          label="City"
                          value={restaurant.city}
                        />
                        <CompactInfoBadge
                          label="State"
                          value={restaurant.state}
                        />
                        <CompactInfoBadge
                          label="Pincode"
                          value={restaurant.pincode}
                        />
                        <CompactInfoBadge
                          label="Reg. Date"
                          value={restaurant.registration_date}
                        />
                        <CompactInfoBadge
                          label="Last Login"
                          value={restaurant.last_login ?? "—"}
                        />
                      </div>
                    </div>

                    {/* BANNER UPLOAD */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            Store Banner
                          </h3>
                          <p className="text-xs text-gray-600">
                            Upload banner to highlight your store
                          </p>
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={isUploadingBanner}
                        >
                          <Upload size={12} />
                          {isUploadingBanner ? "Uploading..." : "Upload"}
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={bannerInputRef}
                          style={{ display: "none" }}
                          onChange={handleBannerFileChange}
                        />
                      </div>
                      {(bannerPreview || restaurant?.store_img) && (
                        <img
                          src={bannerPreview || restaurant?.store_img}
                          alt="Banner Preview"
                          className="mt-3 rounded-lg w-full max-h-40 object-cover"
                        />
                      )}
                    </div>

                    {/* QUICK INFO */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Info</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Hash size={12} className="text-gray-500" />
                          <span className="text-gray-800">ID:</span>
                          <span className="font-semibold text-gray-900">{restaurant.restaurant_id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-gray-500" />
                          <span className="text-gray-800">Delivery:</span>
                          <span className="font-semibold text-gray-900">{restaurant.delivery_time_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star size={12} className="text-gray-500" />
                          <span className="text-gray-800">Rating:</span>
                          <span className="font-semibold text-gray-900">{restaurant.avg_rating}/5</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign size={12} className="text-gray-500" />
                          <span className="text-gray-800">Status:</span>
                          <span className={"font-semibold " + (isVerified ? 'text-green-600' : 'text-yellow-600')}>{isVerified ? 'Verified' : 'Pending'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MXLayoutWhite>

      {/* MINIMAL CONFIRM MODAL */}
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

function CompactInfoBadge({
  label,
  value,
}: {
  label: string;
  value?: any;
}) {
  return (
    <div className="bg-white rounded border border-gray-200 p-2">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900 truncate">{value || "—"}</div>
    </div>
  );
}