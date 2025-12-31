'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchRestaurantById, fetchRestaurantByName, fetchActiveOffers, createOffer, updateOffer, deleteOffer, subscribeToOffers } from '@/lib/database'
import type { Restaurant } from '@/lib/types'
import { DEMO_RESTAURANT_ID } from '@/lib/constants'
import { Plus, Edit2, Trash2, Zap, X, Calendar } from 'lucide-react'
import { Toaster, toast } from 'sonner'

export const dynamic = 'force-dynamic'

import type { Offer } from '@/lib/database'

function OffersContent() {
    const [allMenuItems, setAllMenuItems] = useState<any[]>([]); // all menu items loaded once
    const [menuItems, setMenuItems] = useState<any[]>([]); // filtered for autocomplete
    const [itemSearch, setItemSearch] = useState('');
    const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const searchParams = useSearchParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  const [offers, setOffers] = useState<Offer[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Helper to get current date in yyyy-mm-dd format
  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = useState({
    offer_type: 'ALL_ORDERS' as 'ALL_ORDERS' | 'ITEM_LEVEL',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discount_value: '',
    item_name: '',
    min_order_amount: '',
    valid_from: getTodayDate(),
    valid_till: ''
  })
  const [showPreview, setShowPreview] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);


  useEffect(() => {
    const getRestaurantId = async () => {
      let id = searchParams.get('restaurantId')
      if (!id) id = typeof window !== 'undefined' ? localStorage.getItem('selectedRestaurantId') : null
      if (!id) id = DEMO_RESTAURANT_ID
      setRestaurantId(id)
    }
    getRestaurantId()
  }, [searchParams])

  // Fetch offers and subscribe to changes
  useEffect(() => {
    if (!restaurantId) return;
    let unsub: any = null;
    const loadData = async () => {
      setIsLoading(true);
      try {
        let data = await fetchRestaurantById(restaurantId);
        if (!data && !restaurantId.match(/^GMM\d{4}$/)) {
          data = await fetchRestaurantByName(restaurantId);
        }
        if (data) setRestaurant(data);
        // Fetch active offers
        const offers = await fetchActiveOffers(restaurantId);
        setOffers(offers);
        // Subscribe to real-time changes
        unsub = subscribeToOffers(restaurantId, async () => {
          const updated = await fetchActiveOffers(restaurantId);
          setOffers(updated);
        });
        // Fetch all menu items once for item search
        const { fetchMenuItems } = await import('@/lib/database');
        const items = await fetchMenuItems(restaurantId);
        setAllMenuItems(items || []);
      } catch (error) {
        console.error('Error loading offers/menu items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    return () => {
      if (unsub && typeof unsub.unsubscribe === 'function') unsub.unsubscribe();
    };
  }, [restaurantId]);

  // Auto-deactivate expired offers (client-side fallback)
  useEffect(() => {
    if (!offers.length) return;
    const now = new Date();
    offers.forEach(async (offer) => {
      if (offer.is_active && offer.valid_till && new Date(offer.valid_till) < now) {
        await updateOffer(offer.id, { is_active: false });
      }
    });
  }, [offers]);

  const handleOpenModal = (offer?: Offer) => {
    if (offer) {
      setEditingId(offer.id)
      setFormData({
        offer_type: offer.offer_type,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value.toString(),
        item_name: offer.item_name || '',
        min_order_amount: offer.min_order_amount?.toString() || '',
        valid_from: offer.valid_from,
        valid_till: offer.valid_till
      })
    } else {
      setEditingId(null)
      setFormData({
        offer_type: 'ALL_ORDERS',
        discount_type: 'PERCENTAGE',
        discount_value: '',
        item_name: '',
        min_order_amount: '',
        valid_from: '',
        valid_till: ''
      })
    }
    setBannerImage(null)
    setShowModal(true)
    setItemSearch('');
    setMenuItems([]);
  }

  // Fast in-memory autocomplete for menu items (in stock only)
  useEffect(() => {
    if (formData.offer_type === 'ITEM_LEVEL' && itemSearch.length > 1) {
      setItemSearchLoading(true);
      // Only show in-stock items, match by name
      const filtered = allMenuItems.filter(
        (item: any) => item.in_stock && item.item_name.toLowerCase().includes(itemSearch.toLowerCase())
      );
      setMenuItems(filtered);
      setItemSearchLoading(false);
    } else {
      setMenuItems([]);
    }
  }, [itemSearch, formData.offer_type, allMenuItems]);


  const handleSaveOffer = async () => {
      setIsSaving(true);
    if (!formData.discount_value || !formData.valid_from || !formData.valid_till) {
      toast.error('Please fill in all required fields')
      return
    }
    // Prevent offer creation with valid_from before today
    const today = new Date();
    const validFrom = new Date(formData.valid_from);
    today.setHours(0,0,0,0);
    validFrom.setHours(0,0,0,0);
    if (validFrom < today) {
      toast.error('Offer start date cannot be before today');
      return;
    }
    // Debug log for restaurantId
    console.log('Offer Save: restaurantId', restaurantId);
    const offerPayload: Partial<Offer> = {
      restaurant_id: restaurantId!,
      offer_type: formData.offer_type,
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      item_name: formData.offer_type === 'ITEM_LEVEL' ? formData.item_name : undefined,
      min_order_amount: formData.offer_type === 'ALL_ORDERS' ? Number(formData.min_order_amount) || undefined : undefined,
      valid_from: formData.valid_from,
      valid_till: formData.valid_till,
      is_active: true,
      // bannerImage removed, not in DB
    };
    // Debug log for offerPayload
    // This should match menu item restaurant_id
    console.log('Offer Payload:', offerPayload);
    let result: Offer | null = null;
    if (editingId) {
      result = await updateOffer(editingId, offerPayload);
    } else {
      result = await createOffer(offerPayload);
    }
    if (result) {
      toast.success(editingId ? '✅ Offer updated!' : '✅ Offer created!');
      setShowModal(false);
      setEditingId(null);
    } else {
      toast.error('Failed to save offer');
    }
    setIsSaving(false);
  }

  const handleDeleteOffer = async (id: string) => {
    if (confirm('Are you sure?')) {
      const ok = await deleteOffer(id);
      if (ok) toast.success('✅ Offer deleted!');
      else toast.error('Failed to delete offer');
    }
  }

  if (isLoading) {
    return (
      <MXLayoutWhite restaurantName={restaurant?.restaurant_name} restaurantId={restaurantId || ''}>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
            </div>

            {/* Add Button Skeleton */}
            <div className="h-10 bg-orange-200 rounded-lg w-40 animate-pulse"></div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="flex gap-2 pt-4">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    )
  }

  return (
    <>
      <Toaster />
      <MXLayoutWhite restaurantName={restaurant?.restaurant_name} restaurantId={restaurantId || DEMO_RESTAURANT_ID}>
        <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Offers</h1>
                <p className="text-sm text-gray-600">Create and manage promotional offers</p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                disabled={isSaving}
              >
                <Plus size={18} />
                Create Offer
              </button>
            </div>

            {offers.length === 0 ? (
              <div className="text-center py-16">
                <Zap size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium">No offers yet</p>
                <p className="text-sm text-gray-500">Create your first offer to attract customers</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map(offer => (
                  <div key={offer.id} className="relative group rounded-2xl overflow-hidden shadow-xl border-0 bg-gradient-to-br from-orange-100 via-white to-yellow-100 p-0">
                    <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-all duration-300" style={{background: 'linear-gradient(120deg, #ff9800 0%, #ff5722 100%)'}} />
                    <div className="relative z-10 flex flex-col h-full justify-between p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap size={24} className="text-orange-500 drop-shadow-lg" />
                        <span className="text-2xl font-extrabold text-gray-900 drop-shadow-lg">
                          {offer.discount_value}{offer.discount_type === 'PERCENTAGE' ? '% OFF' : '₹ OFF'}
                        </span>
                      </div>
                      <div className="mb-2">
                        {(() => {
                          const isExpired = new Date(offer.valid_till) < new Date();
                          if (isExpired) {
                            return (
                              <span className="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold tracking-wider mb-2">
                                OFFER ENDED
                              </span>
                            );
                          }
                          return (
                            <span className={`inline-block px-3 py-1 rounded-full ${offer.is_active ? 'bg-green-600' : 'bg-gray-400'} text-white text-xs font-semibold tracking-wider mb-2`}>
                              {offer.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          );
                        })()}
                        <h3 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                          {offer.offer_type === 'ALL_ORDERS' ? 'All Orders' : offer.item_name}
                        </h3>
                        {offer.min_order_amount && (
                          <span className="block text-sm text-orange-100 font-medium bg-black/30 rounded px-2 py-1 w-fit mb-1">Min Order: ₹{offer.min_order_amount}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-white">
                        <span>Valid: {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_till).toLocaleDateString()}</span>
                        <span>Used {offer.usage_count} times</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleOpenModal(offer)}
                          className="flex-1 py-2 rounded-lg bg-white/80 text-blue-700 font-bold shadow hover:bg-blue-100 transition"
                        >
                          <Edit2 size={16} className="inline mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="flex-1 py-2 rounded-lg bg-white/80 text-red-700 font-bold shadow hover:bg-red-100 transition"
                        >
                          <Trash2 size={16} className="inline mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={e => {
              if (e.target === e.currentTarget) setShowPreview(false);
            }}
          >
            <div className="bg-transparent max-w-2xl w-full flex flex-col items-center">
              <div className="relative w-full flex flex-col items-center">
                <div
                  className="w-full max-w-2xl h-48 md:h-64 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden border-4 border-orange-500 bg-gradient-to-br from-orange-400 via-pink-400 to-yellow-300"
                  style={{
                    background: bannerImage ? `url(${bannerImage}) center/cover no-repeat` : undefined,
                  }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative z-10 flex flex-col items-center w-full">
                    <span className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg tracking-wide text-center px-6 py-2 rounded-lg bg-black/40 backdrop-blur-sm">
                      {formData.offer_type === 'ALL_ORDERS' ? 'All Orders' : formData.item_name || 'Specific Item'}
                      {formData.discount_value ? ` - ${formData.discount_value}${formData.discount_type === 'PERCENTAGE' ? '% Off' : '₹ Off'}` : ''}
                    </span>
                    {formData.min_order_amount && (
                      <span className="mt-2 text-lg md:text-2xl font-semibold text-orange-200 bg-black/30 px-4 py-1 rounded-full shadow">
                        Min Order: ₹{formData.min_order_amount}
                      </span>
                    )}
                    <span className="mt-4 text-base md:text-lg text-white bg-black/30 px-3 py-1 rounded">
                      {formData.valid_from && formData.valid_till ? `Valid: ${formData.valid_from} to ${formData.valid_till}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white text-orange-600 rounded-full p-2 shadow-lg"
                  onClick={() => setShowPreview(false)}
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>
        )}
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={e => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto hide-scrollbar">
              {/* Banner Image Upload & Preview - Highlighted */}
              <div className="flex flex-col items-center justify-center p-4 border-b-4 border-orange-500 bg-white relative">
                <label className="block text-base font-bold text-orange-700 mb-2">Offer Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setBannerImage(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="mb-2 border-2 border-orange-500 rounded px-2 py-1 bg-orange-50 text-orange-700 font-semibold cursor-pointer"
                />
                {/* Live Preview */}
                <div className="w-full flex flex-col items-center mb-2">
                  <div
                    className="w-full h-28 rounded-lg flex items-center justify-center text-white font-bold text-xl relative overflow-hidden border-2 border-orange-500"
                    style={{
                      background: bannerImage ? `url(${bannerImage}) center/cover no-repeat` : 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)',
                    }}
                  >
                    <span className="bg-black/40 px-4 py-1 rounded">
                      {formData.offer_type === 'ALL_ORDERS' ? 'All Orders' : formData.item_name || 'Specific Item'} -
                      {formData.discount_value ? ` ${formData.discount_value}${formData.discount_type === 'PERCENTAGE' ? '%' : '₹'} Off` : ' Offer Preview'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Offer Type *</label>
                  <div className="space-y-2">
                    {['ALL_ORDERS', 'ITEM_LEVEL'].map(type => (
                      <label key={type} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="offer_type"
                          checked={formData.offer_type === type}
                          onChange={() => setFormData({ ...formData, offer_type: type as any })}
                        />
                        <span className="text-sm font-medium text-gray-900">{type === 'ALL_ORDERS' ? 'All Orders' : 'Specific Item'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.offer_type === 'ITEM_LEVEL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-orange-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder="Search menu item..."
                    />
                    {itemSearchLoading && <div className="text-xs text-gray-500 mt-1">Searching...</div>}
                    {menuItems.length > 0 && (
                      <ul className="bg-white border border-gray-200 rounded shadow mt-1 max-h-40 overflow-y-auto z-10">
                        {menuItems.map(item => (
                          <li
                            key={item.id}
                            className="px-3 py-2 hover:bg-orange-100 cursor-pointer text-gray-900"
                            onClick={() => {
                              setFormData({ ...formData, item_name: item.item_name });
                              setItemSearch(item.item_name);
                              setMenuItems([]);
                            }}
                          >
                            {item.item_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Discount Type *</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="PERCENTAGE">Percentage %</option>
                      <option value="FIXED_AMOUNT">Fixed ₹</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Value *</label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder="0"
                    />
                  </div>
                </div>

                {formData.offer_type === 'ALL_ORDERS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Min Order Amount (Optional)</label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Valid From *</label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Valid Till *</label>
                    <input
                      type="date"
                      value={formData.valid_till}
                      onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOffer}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${
                    formData.discount_value && formData.valid_from && formData.valid_till && (formData.offer_type !== 'ITEM_LEVEL' || formData.item_name)
                      ? 'bg-orange-600 hover:bg-orange-700 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed pointer-events-none'
                  }`}
                  type="button"
                  disabled={
                    !formData.discount_value || !formData.valid_from || !formData.valid_till || (formData.offer_type === 'ITEM_LEVEL' && !formData.item_name)
                  }
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </MXLayoutWhite>
    </>
  )
}

import { Suspense } from 'react';

export default function OffersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OffersContent />
    </Suspense>
  );
}
