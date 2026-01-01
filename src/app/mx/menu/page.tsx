"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { Plus, Edit2, Trash2, X, Upload, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchStoreById, fetchStoreByName, fetchMenuItems, createMenuItem, updateMenuItem, updateMenuItemStock, deleteMenuItem, getImageUploadStatus } from '@/lib/database'
import { MerchantStore } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Hide scrollbar globally but keep functionality
const globalStyles = `
  ::-webkit-scrollbar { display: none; }
  html { scrollbar-width: none; -ms-overflow-style: none; }
`;

// Predefined category items
const CATEGORY_ITEMS = [
  'Biryani', 'Paratha', 'Rolls', 'Dosa', 'Noodles', 'Pasta', 'Pastry',
  'Gulab Jamun', 'Pav Bhaji', 'Shawarma', 'Salad', 'Kebab', 'Rasmalai',
  'Pizza', 'Burger', 'Momos', 'Chole Bhature', 'Idli', 'Jalebi', 'Tea', 'Thali'
];

// --- CustomizationEditor Component ---
interface Addon {
  addon_id: string;
  customization_id: string;
  addon_item_id: string;
  addon_name: string;
  addon_price: number;
}

interface Customization {
  customization_id: string;
  menu_item_id: string;
  title: string;
  required: boolean;
  max_selection?: number;
  addons: Addon[];
}

// Fixed MenuItem interface
interface MenuItem {
  item_id: string;
  store_id: string;
  item_name: string;
  category_type: string;
  food_category_item: string;
  actual_price: number;
  offer_percent?: number;
  offer_price?: number;
  image_url?: string;
  in_stock: boolean;
  description: string;
  has_customization: boolean;
  has_addons: boolean;
  customizations?: Customization[];
}

function CustomizationEditor({ customizations, setCustomizations }: { customizations: Customization[]; setCustomizations: (c: Customization[]) => void }) {
  const [expandedCustomization, setExpandedCustomization] = useState<number | null>(null);

  const addCustomization = () => {
    const newCustomization: Customization = {
      customization_id: '',
      menu_item_id: '',
      title: '',
      required: false,
      max_selection: 1,
      addons: []
    };
    setCustomizations([...customizations, newCustomization]);
    setExpandedCustomization(customizations.length);
  };

  const updateCustomization = (index: number, field: keyof Customization, value: any) => {
    const updated = [...customizations];
    updated[index] = { ...updated[index], [field]: value };
    setCustomizations(updated);
  };

  const removeCustomization = (index: number) => {
    setCustomizations(customizations.filter((_, i) => i !== index));
    if (expandedCustomization === index) {
      setExpandedCustomization(null);
    }
  };

  const addAddon = (customizationIndex: number) => {
    const updated = [...customizations];
    const newAddon: Addon = {
      addon_id: '',
      customization_id: '',
      addon_item_id: '',
      addon_name: '',
      addon_price: 0
    };
    updated[customizationIndex].addons.push(newAddon);
    setCustomizations(updated);
  };

  const updateAddon = (customizationIndex: number, addonIndex: number, field: keyof Addon, value: any) => {
    const updated = [...customizations];
    updated[customizationIndex].addons[addonIndex] = {
      ...updated[customizationIndex].addons[addonIndex],
      [field]: field === 'addon_price' ? Number(value) : value
    };
    setCustomizations(updated);
  };

  const removeAddon = (customizationIndex: number, addonIndex: number) => {
    const updated = [...customizations];
    updated[customizationIndex].addons = updated[customizationIndex].addons.filter((_, i) => i !== addonIndex);
    setCustomizations(updated);
  };

  return (
    <div className="space-y-3">
      {customizations.map((customization, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Customization title (e.g., Spice Level, Toppings)"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-sm"
                value={customization.title}
                onChange={(e) => updateCustomization(idx, 'title', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setExpandedCustomization(expandedCustomization === idx ? null : idx)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedCustomization === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <button
              type="button"
              className="ml-2 px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
              onClick={() => removeCustomization(idx)}
            >
              Remove
            </button>
          </div>
          
          {expandedCustomization === idx && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-300">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customization.required}
                    onChange={(e) => updateCustomization(idx, 'required', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Max Selection:</span>
                  <input
                    type="number"
                    min="1"
                    value={customization.max_selection || 1}
                    onChange={(e) => updateCustomization(idx, 'max_selection', parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Addons/Options</h4>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    onClick={() => addAddon(idx)}
                  >
                    + Add Addon
                  </button>
                </div>
                
                {customization.addons.map((addon, addonIdx) => (
                  <div key={addonIdx} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <input
                      type="text"
                      placeholder="Addon name"
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                      value={addon.addon_name}
                      onChange={(e) => updateAddon(idx, addonIdx, 'addon_name', e.target.value)}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                        value={addon.addon_price}
                        onChange={(e) => updateAddon(idx, addonIdx, 'addon_price', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                      onClick={() => removeAddon(idx, addonIdx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      
      <button
        type="button"
        className="w-full py-2 px-3 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        onClick={addCustomization}
      >
        + Add Customization Group
      </button>
    </div>
  );
}

// Compact Form Component for Add/Edit
function ItemForm({
  isEdit = false,
  formData,
  setFormData,
  imagePreview,
  setImagePreview,
  onProcessImage,
  onSubmit,
  onCancel,
  isSaving,
  error,
  title
}: {
  isEdit?: boolean;
  formData: any;
  setFormData: (data: any) => void;
  imagePreview: string;
  setImagePreview: (url: string) => void;
  onProcessImage: (file: File, isEdit: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string;
  title: string;
}) {
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'customization'>('basic');

  // Track if user navigated back manually
  const [userNavigatedBack, setUserNavigatedBack] = useState(false);

  // Dropdown state for food item
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFoodDropdown) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.food-dropdown-root')) {
        setShowFoodDropdown(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showFoodDropdown]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProcessImage(file, isEdit);
    }
  };

  // Offer percent validation
  const offerPercentNum = Number(formData.offer_percent);
  const isOfferPercentInvalid =
    formData.offer_percent !== '' && (isNaN(offerPercentNum) || offerPercentNum < 0 || offerPercentNum > 100);

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-2 md:mx-0 p-0 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Enter details for the menu item</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          tabIndex={0}
          aria-label="Close"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-5">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customization')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'customization' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Customizations
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form className="px-5 py-4 max-h-[70vh] overflow-y-auto" autoComplete="off" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Item Name *</label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  required
                />
              </div>
              
              {/* Category Type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Category Type *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 custom-dropdown"
                  value={formData.category_type}
                  onChange={e => setFormData({ ...formData, category_type: e.target.value })}
                  required
                >
                  <option value="VEG">Veg</option>
                  <option value="NON_VEG">Non-Veg</option>
                  <option value="BEVERAGES">Beverages</option>
                  <option value="DESSERTS">Desserts</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              {/* Food Category Item Dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Food Item *</label>
                <div className="relative food-dropdown-root">
                  <button
                    type="button"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-left text-sm text-gray-900 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                    onClick={() => setShowFoodDropdown((prev: boolean) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={showFoodDropdown}
                  >
                    {formData.food_category_item ? formData.food_category_item : 'Select a food item'}
                  </button>
                  {showFoodDropdown && (
                    <ul
                      className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-[180px] overflow-y-auto transition-all"
                      style={{ top: '100%' }}
                      tabIndex={-1}
                      role="listbox"
                    >
                      <li
                        className={`px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-orange-50 ${!formData.food_category_item ? 'bg-orange-100' : ''}`}
                        onClick={() => {
                          setFormData({ ...formData, food_category_item: '', customCategory: '' });
                          setShowFoodDropdown(false);
                        }}
                        role="option"
                        aria-selected={!formData.food_category_item}
                      >
                        Select a food item
                      </li>
                      {CATEGORY_ITEMS.map(item => (
                        <li
                          key={item}
                          className={`px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-orange-50 ${formData.food_category_item === item ? 'bg-orange-100 font-semibold' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, food_category_item: item, customCategory: '' });
                            setShowFoodDropdown(false);
                          }}
                          role="option"
                          aria-selected={formData.food_category_item === item}
                        >
                          {item}
                        </li>
                      ))}
                      <li
                        className={`px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-orange-50 ${formData.food_category_item === 'other_custom' ? 'bg-orange-100 font-semibold' : ''}`}
                        onClick={() => {
                          setFormData({ ...formData, food_category_item: 'other_custom' });
                          setShowFoodDropdown(false);
                        }}
                        role="option"
                        aria-selected={formData.food_category_item === 'other_custom'}
                      >
                        Other (Type your own)
                      </li>
                    </ul>
                  )}
                </div>
                <style jsx global>{`
                  /* Limit dropdown height to 5 items, keep native style */
                  select.native-dropdown-limit:focus option {
                    max-height: 36px;
                  }
                  select.native-dropdown-limit {
                    /* This does not affect the dropdown, but keeps the select styled natively */
                  }
                  /* For Chrome, limit the dropdown height */
                  select.native-dropdown-limit:focus {
                    /* This is a visual hint, but browsers control the dropdown popup */
                  }
                `}</style>
                
                {/* Custom category input */}
                {formData.food_category_item === 'other_custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom food item name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 mt-1"
                    value={formData.customCategory}
                    onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                    required
                  />
                )}
              </div>
              
              {/* Image Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Image (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageChange}
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600 cursor-pointer text-sm border border-orange-500 transition-colors"
                    >
                      <Upload size={14} />
                      Choose Image
                    </label>
                  </div>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-md border" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Description (Optional)</label>
              <textarea
                placeholder="Enter description"
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 min-h-[80px] resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            {/* Stock Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-semibold text-gray-700">Stock Status</div>
                <div className="text-xs text-gray-500">Toggle to mark item as in/out of stock</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.in_stock}
                  onChange={e => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="sr-only peer"
                />
                <div className={`w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all relative`}>
                  <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${formData.in_stock ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className={`ml-2 text-sm font-semibold ${formData.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Actual Price */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Actual Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter actual price"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                    value={formData.actual_price}
                    onChange={e => setFormData({ ...formData, actual_price: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              {/* Offer Percent */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Offer Percent (Optional)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 10 for 10% off"
                    className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 ${isOfferPercentInvalid ? 'border-red-400' : ''}`}
                    value={formData.offer_percent}
                    onChange={e => setFormData({ ...formData, offer_percent: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
                {isOfferPercentInvalid && (
                  <div className="text-xs text-red-500 font-semibold">Offer percent must be between 0 and 100</div>
                )}
                <div className="text-xs text-gray-400">Leave empty if no offer</div>
              </div>
            </div>
            
            {/* Price Preview */}
            {formData.actual_price && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-2">Price Preview</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold text-orange-700">
                    ₹{formData.offer_percent ? 
                      Math.round(Number(formData.actual_price) * (1 - Number(formData.offer_percent) / 100)) : 
                      formData.actual_price}
                  </div>
                  {formData.offer_percent && (
                    <>
                      <div className="text-sm text-gray-500 line-through">₹{formData.actual_price}</div>
                      <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                        {formData.offer_percent}% OFF
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <CustomizationEditor
                customizations={formData.customizations || []}
                setCustomizations={customizations => setFormData({ ...formData, customizations })}
              />
            </div>
            <div className="text-xs text-gray-500">
              <p>• Add customization groups (e.g., Spice Level, Toppings)</p>
              <p>• Each group can have multiple addon options with prices</p>
              <p>• Mark as required if customers must select an option</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="text-red-600 text-xs font-bold p-3 bg-red-50 rounded-lg">{error}</div>}

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-md font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all text-sm"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`px-5 py-2 rounded-md font-medium text-white transition-all text-sm ${
              isSaving || !formData.item_name?.trim() || !formData.actual_price?.trim() || 
              (!formData.food_category_item?.trim() && !formData.customCategory?.trim()) || isOfferPercentInvalid
                ? 'bg-orange-200 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
            }`}
            onClick={onSubmit}
            disabled={
              isSaving || !formData.item_name?.trim() || !formData.actual_price?.trim() || 
              (!formData.food_category_item?.trim() && !formData.customCategory?.trim()) || isOfferPercentInvalid
            }
            type="submit"
          >
            {isSaving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save Item')}
          </button>
          {/* Previous button (icon) */}
          {activeTab !== 'basic' && (
            <button
              type="button"
              aria-label="Previous"
              className="px-2 py-2 rounded-md bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-all"
              onClick={() => {
                setActiveTab(
                  activeTab === 'pricing' ? 'basic' :
                  activeTab === 'customization' ? 'pricing' : 'basic'
                );
                setUserNavigatedBack(true);
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {/* Next button (icon) */}
          {activeTab !== 'customization' && (
            <button
              type="button"
              aria-label="Next"
              className="px-2 py-2 rounded-md bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-all"
              onClick={() => {
                setActiveTab(
                  activeTab === 'basic' ? 'pricing' :
                  activeTab === 'pricing' ? 'customization' : 'customization'
                );
                setUserNavigatedBack(false);
              }}
              disabled={
                (activeTab === 'basic' && (!formData.item_name?.trim() || !formData.category_type?.trim() || (!formData.food_category_item?.trim() && !formData.customCategory?.trim()) || !formData.description?.trim() || typeof formData.in_stock !== 'boolean')) ||
                (activeTab === 'pricing' && (!formData.actual_price?.trim() || isOfferPercentInvalid))
              }
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
          )}
        </div>

      </form>
    </div>
  );
}

function MenuContent() {
  const searchParams = useSearchParams();
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [viewCustModal, setViewCustModal] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });

  // Form states
  const [addForm, setAddForm] = useState({
    item_name: '',
    category_type: 'VEG' as 'VEG' | 'NON_VEG' | 'BEVERAGES' | 'DESSERTS' | 'OTHER',
    food_category_item: '',
    customCategory: '',
    actual_price: '',
    offer_percent: '',
    description: '',
    in_stock: true,
    image_url: '',
    image: null as File | null,
    has_customization: false,
    has_addons: false,
    customizations: [] as Customization[],
  });
  const [editForm, setEditForm] = useState({
    item_name: '',
    category_type: 'VEG' as 'VEG' | 'NON_VEG' | 'BEVERAGES' | 'DESSERTS' | 'OTHER',
    food_category_item: '',
    customCategory: '',
    actual_price: '',
    offer_percent: '',
    description: '',
    in_stock: true,
    image_url: '',
    image: null as File | null,
    has_customization: false,
    has_addons: false,
    customizations: [] as Customization[],
  });

  const [imagePreview, setImagePreview] = useState('');
  const [editImagePreview, setEditImagePreview] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stockToggleItem, setStockToggleItem] = useState<{ item_id: string; newStatus: boolean } | null>(null);
  const [isTogglingStock, setIsTogglingStock] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [imageUploadStatus, setImageUploadStatus] = useState<any>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    const getStoreId = async () => {
      let id = searchParams.get('storeId');
      if (!id) id = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') : null;
      setStoreId(id);
    };
    getStoreId();
  }, [searchParams]);

  useEffect(() => {
    if (!storeId) {
      setStoreError('Please select a store first. No store ID found in URL or localStorage.');
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      setStoreError(null);
      try {
        let data = await fetchStoreById(storeId);
        if (!data) {
          data = await fetchStoreByName(storeId);
        }
        
        if (!data) {
          setStoreError(`Store not found with ID/Name: ${storeId}`);
          setIsLoading(false);
          return;
        }
        
        setStore(data);
        
        const items = await fetchMenuItems(storeId);
        const mappedItems: MenuItem[] = items.map((item: any) => ({
          item_id: item.item_id,
          store_id: item.store_id,
          item_name: item.item_name,
          category_type: item.category_type,
          food_category_item: item.food_category_item,
          actual_price: item.actual_price,
          offer_percent: item.offer_percent || 0,
          offer_price: item.offer_price || 0,
          image_url: item.image_url,
          in_stock: item.in_stock,
          description: item.description,
          has_customization: item.has_customization,
          has_addons: item.has_addons,
          customizations: item.customizations || []
        }));
        setMenuItems(mappedItems);

        const status = await getImageUploadStatus(storeId);
        setImageUploadStatus(status);
      } catch (error) {
        console.error('Error loading menu:', error);
        setStoreError('Error loading store data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [storeId]);

  const processImageFile = (file: File, isEdit: boolean = false) => {
    const canAddImage = !imageUploadStatus || imageUploadStatus.totalUsed < 10;

    if (!canAddImage && !addForm.image_url) {
      toast.error('Image upload limit reached. Please upgrade your subscription.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (isEdit) {
        setEditImagePreview(dataUrl);
        setEditForm(prev => ({ ...prev, image_url: dataUrl }));
      } else {
        setImagePreview(dataUrl);
        setAddForm(prev => ({ ...prev, image_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
    
    if (isEdit) {
      setEditForm(prev => ({ ...prev, image: file }));
    } else {
      setAddForm(prev => ({ ...prev, image: file }));
    }
  };

  async function handleAddItem() {
    if (!storeId) {
      toast.error('Please select a store first');
      return;
    }
    
    setAddError('');
    if (!addForm.item_name.trim()) return setAddError('Name is required');
    if (!addForm.food_category_item.trim() && !addForm.customCategory.trim()) 
      return setAddError('Please select a food item or enter custom category');
    if (!addForm.actual_price.trim()) return setAddError('Actual price is required');
    if (addForm.offer_percent !== '' && (isNaN(Number(addForm.offer_percent)) || Number(addForm.offer_percent) < 0 || Number(addForm.offer_percent) > 100)) {
      return setAddError('Offer percent must be between 0 and 100');
    }

    const finalFoodCategoryItem = addForm.customCategory.trim() ? addForm.customCategory : addForm.food_category_item;
    const hasCustomizations = addForm.customizations.length > 0;
    const hasAddons = addForm.customizations.some(c => c.addons.length > 0);

    setIsSaving(true);
    try {
      let imageUrl = addForm.image_url;
      if (addForm.image) {
        const formData = new FormData();
        formData.append('file', addForm.image);
        formData.append('parent', storeId || 'unknown');
        const uploadRes = await fetch('/api/upload/r2', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          setAddError('Image upload failed.');
          setIsSaving(false);
          return;
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const offerPercentValue = addForm.offer_percent.trim() ? Number(addForm.offer_percent) : 0;
      const customizations = addForm.customizations || [];

      const newItem = {
        item_name: addForm.item_name,
        category_type: addForm.category_type,
        food_category_item: finalFoodCategoryItem,
        actual_price: Number(addForm.actual_price),
        offer_percent: offerPercentValue,
        description: addForm.description,
        in_stock: addForm.in_stock,
        image_url: imageUrl || null,
        has_customization: hasCustomizations,
        has_addons: hasAddons,
        customizations,
      };

      console.log('Creating menu item:', newItem);
      const result = await createMenuItem({
        restaurant_id: storeId || '',
        ...newItem
      });

      if (result && result.item_id) {
        const newMenuItem: MenuItem = {
          item_id: result.item_id,
          store_id: storeId || '',
          item_name: newItem.item_name,
          category_type: newItem.category_type,
          food_category_item: newItem.food_category_item,
          actual_price: newItem.actual_price,
          offer_percent: newItem.offer_percent,
          offer_price: newItem.offer_percent ? Math.round(newItem.actual_price * (1 - newItem.offer_percent / 100)) : undefined,
          image_url: newItem.image_url || undefined,
          in_stock: newItem.in_stock,
          description: newItem.description,
          has_customization: newItem.has_customization,
          has_addons: newItem.has_addons,
          customizations: newItem.customizations,
        };
        
        setMenuItems(prev => [newMenuItem, ...prev]);
        setShowAddModal(false);
        setAddForm({ 
          item_name: '', 
          category_type: 'VEG', 
          food_category_item: '', 
          customCategory: '', 
          actual_price: '', 
          offer_percent: '', 
          description: '', 
          in_stock: true, 
          image_url: '', 
          image: null, 
          has_customization: false,
          has_addons: false,
          customizations: [] 
        });
        setImagePreview('');
        toast.success('Item added successfully!');
      } else {
        setAddError('Failed to add item.');
      }
    } catch (e) {
      console.error('Error adding item:', e);
      setAddError('Error saving item.');
    }
    setIsSaving(false);
  }

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingId(item.item_id);
    setEditImagePreview(item.image_url || '');
    setEditForm({
      item_name: item.item_name || '',
      category_type: item.category_type as any || 'VEG',
      food_category_item: item.food_category_item || '',
      customCategory: '',
      actual_price: item.actual_price?.toString() || '',
      offer_percent: item.offer_percent?.toString() || '',
      description: item.description || '',
      in_stock: item.in_stock,
      image_url: item.image_url || '',
      image: null,
      has_customization: item.has_customization,
      has_addons: item.has_addons,
      customizations: item.customizations || [],
    });
    setShowEditModal(true);
  };

  async function handleSaveEdit() {
    setEditError("");
    
    if (!editingId) {
      setEditError("No item selected for editing.");
      return;
    }

    const itemName = (editForm.item_name ?? "").toString().trim();
    const foodCategoryItem = (editForm.food_category_item ?? "").toString().trim();
    const customCategory = (editForm.customCategory ?? "").toString().trim();
    const actualPrice = (editForm.actual_price ?? "").toString().trim();
    const offerPercent = (editForm.offer_percent ?? "").toString().trim();

    if (!itemName) return setEditError("Name is required");
    if (!foodCategoryItem && !customCategory)
      return setEditError("Please select a food item or enter custom category");
    if (!actualPrice) return setEditError("Actual price is required");
    if (offerPercent !== '' && (isNaN(Number(offerPercent)) || Number(offerPercent) < 0 || Number(offerPercent) > 100)) {
      return setEditError('Offer percent must be between 0 and 100');
    }

    const hasCustomizations = Array.isArray(editForm.customizations) && editForm.customizations.length > 0;
    const hasAddons = Array.isArray(editForm.customizations) && editForm.customizations.some((c: any) => 
      Array.isArray(c.addons) && c.addons.length > 0
    );

    setIsSavingEdit(true);
    try {
      let imageUrl = editForm.image_url;
      if (editForm.image) {
        const formData = new FormData();
        formData.append('file', editForm.image);
        formData.append('parent', storeId || 'unknown');
        const uploadRes = await fetch('/api/upload/r2', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          setEditError('Image upload failed.');
          setIsSavingEdit(false);
          return;
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const offerPercentValue = offerPercent ? Number(offerPercent) : 0;
      const finalFoodCategoryItem = customCategory ? customCategory : foodCategoryItem;

      const updatedItem = {
        item_name: itemName,
        category_type: editForm.category_type,
        food_category_item: finalFoodCategoryItem,
        actual_price: Number(actualPrice),
        offer_percent: offerPercentValue,
        description: editForm.description,
        in_stock: editForm.in_stock,
        image_url: imageUrl || null,
        has_customization: hasCustomizations,
        has_addons: hasAddons,
        customizations: Array.isArray(editForm.customizations) ? editForm.customizations : [],
      };

      console.log('Updating item:', editingId, 'with data:', updatedItem);
      const result = await updateMenuItem(editingId, updatedItem);

      if (result && result.success !== false) {
        setMenuItems(prev => 
          prev.map(item => 
            item.item_id === editingId 
              ? {
                  ...item,
                  item_name: updatedItem.item_name,
                  category_type: updatedItem.category_type,
                  food_category_item: updatedItem.food_category_item,
                  actual_price: updatedItem.actual_price,
                  offer_percent: updatedItem.offer_percent,
                  offer_price: updatedItem.offer_percent ? 
                    Math.round(updatedItem.actual_price * (1 - updatedItem.offer_percent / 100)) : 
                    undefined,
                  image_url: updatedItem.image_url || item.image_url,
                  in_stock: updatedItem.in_stock,
                  description: updatedItem.description,
                  has_customization: updatedItem.has_customization,
                  has_addons: updatedItem.has_addons,
                  customizations: updatedItem.customizations,
                }
              : item
          )
        );
        
        setShowEditModal(false);
        toast.success("Item updated successfully!");
      } else {
        setEditError("Failed to update item. Please try again.");
      }
    } catch (e) {
      console.error("Error updating item:", e);
      setEditError("Error updating item.");
    }
    setIsSavingEdit(false);
  }

  async function handleDeleteItem() {
    if (!deleteItemId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteMenuItem(deleteItemId);
      if (result) {
        setMenuItems(prev => prev.filter(item => item.item_id !== deleteItemId));
        setShowDeleteModal(false);
        setDeleteItemId(null);
        toast.success('Item deleted successfully!');
      } else {
        toast.error('Failed to delete item.');
      }
    } catch (error) {
      toast.error('Error deleting item.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleStockToggle() {
    if (!stockToggleItem) return;
    
    setIsTogglingStock(true);
    try {
      const result = await updateMenuItemStock(stockToggleItem.item_id, stockToggleItem.newStatus);
      if (result) {
        setMenuItems(prev => prev.map(item =>
          item.item_id === stockToggleItem.item_id
            ? { ...item, in_stock: stockToggleItem.newStatus }
            : item
        ));
        setShowStockModal(false);
        setStockToggleItem(null);
        toast.success(`Item marked as ${stockToggleItem.newStatus ? 'In Stock' : 'Out of Stock'}!`);
      } else {
        toast.error('Failed to update stock status.');
      }
    } catch (error) {
      toast.error('Error updating stock status.');
    } finally {
      setIsTogglingStock(false);
    }
  }

  const inStock = menuItems.filter(item => item.in_stock).length;
  const outStock = menuItems.filter(item => !item.in_stock).length;
  const outStockPercent = menuItems.length ? Math.round((outStock / menuItems.length) * 100) : 0;

  const categories = [
    { label: 'All Items', value: 'ALL' },
    { label: 'Veg', value: 'VEG' },
    { label: 'Non-Veg', value: 'NON_VEG' },
    { label: 'Beverages', value: 'BEVERAGES' },
    { label: 'Desserts', value: 'DESSERTS' },
    { label: 'Others', value: 'OTHER' },
  ];
  
  const filteredItems = selectedCategory === 'ALL'
    ? menuItems
    : menuItems.filter(item => item.category_type === selectedCategory);
    
  const searchedItems = searchTerm
    ? filteredItems.filter(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : filteredItems;

  // Show error if no store is selected
  if (storeError) {
    return (
      <MXLayoutWhite restaurantName={store?.store_name || "Unknown Store"} restaurantId={storeId || "No ID"}>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center p-8">
            <Package size={64} className="text-gray-300 mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Store Not Selected</h2>
            <p className="text-gray-600 mb-6">{storeError}</p>
            <div className="space-y-3">
              <p className="text-gray-500 text-sm">How to select a store:</p>
              <ul className="text-left text-gray-600 text-sm max-w-md mx-auto">
                <li className="mb-2">1. Go to the Stores dashboard</li>
                <li className="mb-2">2. Select a store from the list</li>
                <li className="mb-2">3. Click on "Menu Management" for that store</li>
                <li>4. Or make sure the URL contains <code className="bg-gray-100 px-2 py-1 rounded">?storeId=YOUR_STORE_ID</code></li>
              </ul>
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    );
  }

  return (
    <MXLayoutWhite restaurantName={store?.store_name || "Unknown Store"} restaurantId={storeId || "No ID"}>
      <div className="min-h-screen bg-white">
        <Toaster />
        <style>{globalStyles}</style>

        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 gap-4">
          {isLoading ? (
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="h-8 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 flex gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="h-10 w-40 bg-orange-200 rounded-lg" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Menu Items</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage your store menu items</p>
                <p className="text-xs text-gray-500 mt-1">
                  Store: {store?.store_name || "Unknown Store"} ({storeId || "No ID"})
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className={`bg-gray-50 px-4 py-3 rounded-lg border border-gray-200`}>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Total Items</div>
                      <div className="text-base font-bold text-gray-900">{menuItems.length}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">In Stock</div>
                      <div className="text-base font-bold text-green-600">{inStock}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Out of Stock (%)</div>
                      <div className="text-base font-bold text-red-600">{`${outStockPercent}%`}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-all text-sm"
                >
                  <Plus size={16} />
                  Add New Item
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search and Category Bar */}
        <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {isLoading ? (
            <>
              <div className="relative w-full md:w-96 animate-pulse">
                <div className="h-12 w-full bg-gray-100 rounded-lg mb-2" />
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto animate-pulse">
                {categories.map((cat, idx) => (
                  <div key={cat.value} className={`h-10 ${idx === 0 ? 'w-28' : 'w-24'} bg-gray-100 rounded-lg`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Search items by name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-orange-500 text-base text-gray-900 placeholder-gray-500"
                  style={{ color: '#111827' }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-sm ${
                      selectedCategory === cat.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Menu Items Grid */}
        <div className="px-6 py-4 relative">
          {isLoading ? (
            <div className="w-full flex flex-col gap-8 animate-pulse">
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[160px]">
                    <div className="flex p-3 h-full">
                      <div className="w-16 h-16 flex-shrink-0 mr-3 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (searchedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700">No menu items found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Try a different search term' : 'Add your first menu item to get started'}
              </p>
              {store && (
                <p className="text-sm text-gray-400 mt-4">Store: {store.store_name}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchedItems.map((item) => {
                const discountedPrice = Math.round(item.actual_price * (1 - (item.offer_percent || 0) / 100));
                return (
                  <div key={item.item_id} className="bg-white rounded-xl border border-gray-300 shadow-sm hover:shadow-md transition-shadow min-h-[160px]">
                    <div className="flex p-3 h-full">
                      <div className="w-16 h-16 flex-shrink-0 mr-3">
                        <img 
                          src={item.image_url && item.image_url !== '' ? item.image_url : '/placeholder.png'} 
                          alt={item.item_name} 
                          className="w-full h-full object-cover rounded-lg border border-gray-200" 
                        />
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900 truncate">
                              {item.item_name}
                            </div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-0.5">
                              {item.category_type} {item.food_category_item && `- ${item.food_category_item}`}
                            </div>
                          </div>
                          <label className="inline-flex items-center cursor-pointer ml-2 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={item.in_stock}
                              onChange={() => {
                                setStockToggleItem({ item_id: item.item_id, newStatus: !item.in_stock });
                                setShowStockModal(true);
                              }}
                              className="sr-only peer"
                            />
                            <div className={`w-8 h-4.5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all relative`}>
                              <div className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform ${item.in_stock ? 'translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          {item.offer_percent && item.offer_percent > 0 ? (
                            <>
                              <span className="text-base font-bold text-orange-700">₹{discountedPrice}</span>
                              <span className="text-sm font-semibold text-gray-500 line-through">₹{item.actual_price}</span>
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold">
                                {item.offer_percent}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-orange-700">₹{item.actual_price}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3 flex-grow">
                            {item.description}
                          </p>
                        )}
                        {/* Customization/Addon indicators */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.has_customization && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                              Customization
                            </span>
                          )}
                          {item.has_addons && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                              Addons
                            </span>
                          )}
                        </div>
                        <div className="flex flex-row gap-2 mt-3 w-full">
                          {Array.isArray(item.customizations) && item.customizations.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setViewCustModal({ open: true, item }); }}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-orange-50 transition-all text-xs whitespace-nowrap"
                              type="button"
                              style={{ minWidth: 0 }}
                            >
                              View Options
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all text-xs whitespace-nowrap"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteItemId(item.item_id);
                              setShowDeleteModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-all text-xs whitespace-nowrap"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Modals */}
        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div onClick={e => e.stopPropagation()}>
              <ItemForm
                isEdit={false}
                formData={addForm}
                setFormData={setAddForm}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                onProcessImage={(file) => processImageFile(file, false)}
                onSubmit={handleAddItem}
                onCancel={() => {
                  setShowAddModal(false);
                  setAddForm({ 
                    item_name: '', 
                    category_type: 'VEG', 
                    food_category_item: '', 
                    customCategory: '', 
                    actual_price: '', 
                    offer_percent: '', 
                    description: '', 
                    in_stock: true, 
                    image_url: '', 
                    image: null, 
                    has_customization: false,
                    has_addons: false,
                    customizations: [] 
                  });
                  setImagePreview('');
                }}
                isSaving={isSaving}
                error={addError}
                title="Add New Menu Item"
              />
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div onClick={e => e.stopPropagation()}>
              <ItemForm
                isEdit={true}
                formData={editForm}
                setFormData={setEditForm}
                imagePreview={editImagePreview}
                setImagePreview={setEditImagePreview}
                onProcessImage={(file) => processImageFile(file, true)}
                onSubmit={handleSaveEdit}
                onCancel={() => {
                  setShowEditModal(false);
                  setEditForm({
                    item_name: '',
                    category_type: 'VEG',
                    food_category_item: '',
                    customCategory: '',
                    actual_price: '',
                    offer_percent: '',
                    description: '',
                    in_stock: true,
                    image_url: '',
                    image: null,
                    has_customization: false,
                    has_addons: false,
                    customizations: [],
                  });
                  setEditImagePreview('');
                }}
                isSaving={isSavingEdit}
                error={editError}
                title="Edit Menu Item"
              />
            </div>
          </div>
        )}

        {/* View Customizations Modal */}
        {viewCustModal.open && viewCustModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewCustModal({ open: false, item: null })}>
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-md mx-2 p-0 border border-gray-100 relative animate-fadeIn"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-base md:text-lg font-bold text-gray-900">Customizations & Addons</h2>
                <button
                  onClick={() => setViewCustModal({ open: false, item: null })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                {Array.isArray(viewCustModal.item.customizations) && viewCustModal.item.customizations.length > 0 ? (
                  <div className="space-y-4">
                    {viewCustModal.item.customizations.map((group: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-800 text-sm">{group.title}</div>
                          <div className="flex gap-2">
                            {group.required && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Required</span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                              Max: {group.max_selection || 1}
                            </span>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {group.addons.map((addon: any, i: number) => (
                            <li key={i} className="flex items-center justify-between py-1 px-2 bg-white rounded border">
                              <span className="text-sm text-gray-700">{addon.addon_name}</span>
                              <span className="text-sm font-medium text-gray-900">₹{addon.addon_price}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No customizations available.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Menu Item</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete this item? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteItem}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Toggle Confirmation Modal */}
        {showStockModal && stockToggleItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="text-center">
                  <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${stockToggleItem.newStatus ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
                    {stockToggleItem.newStatus ? (
                      <div className="h-6 w-6 text-green-600">✓</div>
                    ) : (
                      <div className="h-6 w-6 text-red-600">✗</div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {stockToggleItem.newStatus ? 'Mark as In Stock' : 'Mark as Out of Stock'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {stockToggleItem.newStatus 
                      ? 'This item will be available for customers to order.' 
                      : 'This item will be hidden from customers and marked as unavailable.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStockModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                    disabled={isTogglingStock}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStockToggle}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition-all ${
                      stockToggleItem.newStatus 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                    disabled={isTogglingStock}
                  >
                    {isTogglingStock ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MXLayoutWhite>
  );
}

// Export a Suspense-wrapped page for Next.js app directory compliance
export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  );
}