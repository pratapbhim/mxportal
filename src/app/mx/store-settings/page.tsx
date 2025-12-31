'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchRestaurantById, fetchRestaurantByName } from '@/lib/database'
import { Restaurant } from '@/lib/types'
import { DEMO_RESTAURANT_ID } from '@/lib/constants'
import {
  Clock,
  MapPin,
  Phone,
  ToggleRight,
  Save,
  AlertCircle,
  CheckCircle2,
  X,
  Timer
} from 'lucide-react'
import { Toaster, toast } from 'sonner'

export const dynamic = 'force-dynamic'

// Helper function to check if store is within operating hours
const isWithinOperatingHours = (openTime: string, closeTime: string): boolean => {
  const now = new Date()
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  
  if (openTime < closeTime) {
    return currentTime >= openTime && currentTime < closeTime
  } else {
    return currentTime >= openTime || currentTime < closeTime
  }
}

// Helper function to get minutes remaining
const getMinutesRemaining = (until: Date): number => {
  const now = new Date()
  const diffMs = until.getTime() - now.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60)))
}

// Helper function to get time until closing
const getTimeUntilClosing = (closeTime: string): number => {
  const now = new Date()
  const [hours, mins] = closeTime.split(':').map(Number)
  const closeDate = new Date()
  closeDate.setHours(hours, mins, 0, 0)
  
  if (closeDate < now) {
    closeDate.setDate(closeDate.getDate() + 1)
  }
  
  const diffMs = closeDate.getTime() - now.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

function StoreSettingsContent() {
  const searchParams = useSearchParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [deliveryMode, setDeliveryMode] = useState<'MX_SELF' | 'GATIMITRA'>('MX_SELF')
  const [openingTime, setOpeningTime] = useState('09:00')
  const [closingTime, setClosingTime] = useState('23:00')
  const [autoCloseTime, setAutoCloseTime] = useState('23:00')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false)

  // Get restaurant ID
  useEffect(() => {
    const getRestaurantId = async () => {
      let id = searchParams.get('restaurantId')

      if (!id) {
        id = typeof window !== 'undefined' ? localStorage.getItem('selectedRestaurantId') : null
      }

      if (!id) {
        id = DEMO_RESTAURANT_ID
      }

      setRestaurantId(id)
    }

    getRestaurantId()
  }, [searchParams])

  // Load restaurant data
  useEffect(() => {
    if (!restaurantId) return

    const loadRestaurant = async () => {
      setIsLoading(true)
      try {
        let restaurantData = await fetchRestaurantById(restaurantId)

        if (!restaurantData && !restaurantId.match(/^GMM\d{4}$/)) {
          restaurantData = await fetchRestaurantByName(restaurantId)
        }

        if (restaurantData) {
          setRestaurant(restaurantData)
          setIsStoreOpen(true)
          setPhone(restaurantData.phone || '')
          setLatitude(restaurantData.latitude?.toString() || '')
          setLongitude(restaurantData.longitude?.toString() || '')
        }
      } catch (error) {
        console.error('Error loading restaurant:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRestaurant()
  }, [restaurantId])

  const handleStoreToggle = () => {
    setIsStoreOpen(!isStoreOpen)
    toast.success(
      isStoreOpen
        ? '🔴 Store is now CLOSED'
        : '🟢 Store is now OPEN'
    )
  }

  const handleDeliveryModeChange = (mode: 'MX_SELF' | 'GATIMITRA') => {
    if (deliveryMode === mode) return
    
    setDeliveryMode(mode)
    const modeName = mode === 'MX_SELF' ? 'MX Self Delivery' : 'GatiMitra Delivery'
    toast.success(`✅ Delivery mode set to ${modeName}`)
  }

  const handleSaveSettings = async () => {
    if (!phone || !latitude || !longitude) {
      toast.error('❌ Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))
      
      toast.success('✅ Settings saved successfully!')
    } catch (error) {
      toast.error('❌ Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <MXLayoutWhite restaurantName={restaurant?.restaurant_name} restaurantId={restaurantId || ''}>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
            </div>

            {/* Form Sections Skeleton */}
            {[1, 2, 3].map((section) => (
              <div key={section} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                      <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button Skeleton */}
            <div className="h-10 bg-blue-200 rounded-lg w-40 animate-pulse"></div>
          </div>
        </div>
      </MXLayoutWhite>
    )
  }

  return (
    <>
      <Toaster />
      <MXLayoutWhite
        restaurantName={restaurant?.restaurant_name || 'Settings'}
        restaurantId={restaurantId || DEMO_RESTAURANT_ID}
      >
        <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
              <p className="text-sm text-gray-600">Configure your store details and delivery modes</p>
            </div>

            {/* Store Status Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <ToggleRight size={18} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Store Status</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Store Operation</p>
                    <p className="text-sm text-gray-600">Enable or disable store for customers</p>
                  </div>
                  <button
                    onClick={handleStoreToggle}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isStoreOpen
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {isStoreOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                  </button>
                </div>

                {/* Auto-close Checkbox */}
                <label className="flex items-center gap-3 p-4 rounded-lg bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" className="w-4 h-4" defaultChecked={false} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Auto-close at specific time</p>
                    <p className="text-xs text-gray-600">Automatically close store at selected time</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Clock size={18} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Operating Hours</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Opening Time</label>
                    <input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Closing Time</label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Auto-close Time (Optional)</label>
                  <input
                    type="time"
                    value={autoCloseTime}
                    onChange={(e) => setAutoCloseTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="text-xs text-gray-600 mt-1">Store will automatically close at this time if enabled</p>
                </div>
              </div>
            </div>

            {/* Store Information Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Phone size={18} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Store Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Address</label>
                  <input
                    type="text"
                    value={restaurant?.address || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">Read-only - set during registration</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Latitude *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g., 28.6139"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Longitude *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g., 77.2090"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Mode Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-orange-50">
                  <ToggleRight size={18} className="text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delivery Mode</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">Select your primary delivery method (mutually exclusive)</p>

              <div className="space-y-3">
                {/* MX Self Delivery */}
                <button
                  onClick={() => handleDeliveryModeChange('MX_SELF')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    deliveryMode === 'MX_SELF'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${deliveryMode === 'MX_SELF' ? 'text-orange-700' : 'text-gray-900'}`}>
                        🚶 MX Self Delivery
                      </p>
                      <p className="text-xs text-gray-600">Customers pick up orders from store</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      deliveryMode === 'MX_SELF' ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                    }`}>
                      {deliveryMode === 'MX_SELF' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                </button>

                {/* GatiMitra Delivery */}
                <button
                  onClick={() => handleDeliveryModeChange('GATIMITRA')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    deliveryMode === 'GATIMITRA'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${deliveryMode === 'GATIMITRA' ? 'text-purple-700' : 'text-gray-900'}`}>
                        🚗 GatiMitra Delivery
                      </p>
                      <p className="text-xs text-gray-600">Auto-assign delivery partners</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      deliveryMode === 'GATIMITRA' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {deliveryMode === 'GATIMITRA' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold">Only one delivery mode can be active</p>
                  <p>Switching modes will automatically disable the previous one</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 sticky bottom-4 bg-white rounded-lg border border-gray-200 p-4 shadow-md">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                disabled={isSaving}
                className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    </>
  )
}

import { Suspense } from 'react';

export default function StoreSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StoreSettingsContent />
    </Suspense>
  );
}
