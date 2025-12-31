'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchRestaurantById as fetchStoreById, fetchRestaurantByName as fetchStoreByName } from '@/lib/database'
import { MerchantStore } from '@/lib/merchantStore'
import { DEMO_RESTAURANT_ID as DEMO_STORE_ID } from '@/lib/constants'
import {
  Power,
  Truck,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { Toaster, toast } from 'sonner'

export const dynamic = 'force-dynamic'

function DashboardContent() {
  const searchParams = useSearchParams()
  const [store, setStore] = useState<MerchantStore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Store Status & Delivery Mode
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [mxDeliveryEnabled, setMxDeliveryEnabled] = useState(false) // GatiMitra is default
  const [openingTime, setOpeningTime] = useState('09:00')
  const [closingTime, setClosingTime] = useState('23:00')
  
  // Store toggle dropdown & modal states
  const [showToggleDropdown, setShowToggleDropdown] = useState(false)
  const [toggleClosureType, setToggleClosureType] = useState<'temporary' | 'today' | null>(null)
  const [closureTime, setClosureTime] = useState<string>('12:00')
  const [tempClosedUntil, setTempClosedUntil] = useState<Date | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [showToggleOnWarning, setShowToggleOnWarning] = useState(false)
  
  const [pendingOrders, setPendingOrders] = useState(5)
  const [preparingOrders, setPreparingOrders] = useState(2)
  const [deliveredToday, setDeliveredToday] = useState(45)
  const [revenueToday, setRevenueToday] = useState(45200)

  // Get store ID
  useEffect(() => {
    const getStoreId = async () => {
      let id = searchParams?.get('storeId') ?? null

      if (!id) {
        id = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') : null
      }

      if (!id) {
        id = DEMO_STORE_ID
      }

      setStoreId(id)
    }

    getStoreId()
  }, [searchParams])

  // Load store data
  useEffect(() => {
    if (!storeId) return

    const loadStore = async () => {
      setIsLoading(true)
      try {
        let storeData = await fetchStoreById(storeId)

        if (storeData && (storeData as any).notFound) {
          setStore(null)
          toast.error('Your store is not in our database. Please check your registration or contact support.')
          setIsLoading(false)
          return
        }

        if (!storeData && !storeId.match(/^GMM\d{4}$/)) {
          storeData = await fetchStoreByName(storeId)
        }

        if (storeData) {
          setStore(storeData)
        }
      } catch (error) {
        console.error('Error loading store:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStore()
  }, [storeId])

  const handleStoreToggle = () => {
    if (isStoreOpen) {
      // If trying to close, show dropdown
      setShowToggleDropdown(!showToggleDropdown)
    } else {
      // If trying to open, show warning modal
      setShowToggleOnWarning(true)
    }
  }

  const handleConfirmToggleOn = () => {
    setIsStoreOpen(true)
    setTempClosedUntil(null)
    setToggleClosureType(null)
    setShowToggleDropdown(false)
    setShowToggleOnWarning(false)
    toast.success('🟢 Store is now OPEN. Orders are being accepted!')
  }

  const handleConfirmToggle = () => {
    if (!toggleClosureType) {
      toast.error('❌ Please select closure type')
      return
    }

    if (toggleClosureType === 'temporary' && !closureTime) {
      toast.error('❌ Please select a time')
      return
    }

    // Show confirmation modal
    setPendingConfirmation(true)
    setShowConfirmationModal(true)
  }

  const handleFinalConfirm = () => {
    if (!toggleClosureType) return

    let closedUntilDate: Date

    if (toggleClosureType === 'temporary') {
      const [hours, mins] = closureTime.split(':').map(Number)
      closedUntilDate = new Date()
      closedUntilDate.setHours(hours, mins, 0, 0)

      if (closedUntilDate < new Date()) {
        closedUntilDate.setDate(closedUntilDate.getDate() + 1)
      }

      const minutesRemaining = Math.max(0, Math.floor((closedUntilDate.getTime() - new Date().getTime()) / (1000 * 60)))
      const hoursRemaining = Math.floor(minutesRemaining / 60)
      const minsRemaining = minutesRemaining % 60

      toast.success(
        `⏱️ Store closed temporarily until ${closureTime} (${hoursRemaining}h ${minsRemaining}m remaining)`
      )
    } else {
      closedUntilDate = new Date()
      const [hours, mins] = openingTime.split(':').map(Number)
      closedUntilDate.setHours(hours, mins, 0, 0)
      closedUntilDate.setDate(closedUntilDate.getDate() + 1)

      toast.success(
        `📅 Store closed for today. Will reopen tomorrow at ${openingTime}`
      )
    }

    setIsStoreOpen(false)
    setTempClosedUntil(closedUntilDate)
    setShowToggleDropdown(false)
    setShowConfirmationModal(false)
    setToggleClosureType(null)
    setPendingConfirmation(false)
  }

  const handleCancelToggle = () => {
    setShowConfirmationModal(false)
    setPendingConfirmation(false)
    setToggleClosureType(null)
    setClosureTime('12:00')
  }

  // SMART DELIVERY LOGIC - MX toggle controls delivery
  const handleMXDeliveryToggle = () => {
    const newValue = !mxDeliveryEnabled
    setMxDeliveryEnabled(newValue)
    if (newValue) {
      toast.success('✅ MX Self Delivery enabled - Will use your riders')
    } else {
      toast.success('✅ GatiMitra Delivery enabled - External partners handle deliveries')
    }
  }

  if (isLoading) {
    return (
      <MXLayoutWhite restaurantName={store?.store_name} restaurantId={storeId || ''}>
        <div className="min-h-screen bg-gray-50">
          {/* Header Skeleton */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-96 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-96 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    )
  }

  return (
    <>
      <Toaster />
      <MXLayoutWhite
        restaurantName={store?.store_name || 'Dashboard'}
        restaurantId={storeId || DEMO_STORE_ID}
      >
        <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your store and monitor operations</p>
            </div>

            {/* ═══ ABOVE THE FOLD - COMPACT CRITICAL CONTROLS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Store Control Card - ENHANCED */}
              <div className={`bg-gradient-to-br ${isStoreOpen ? 'from-emerald-50 to-green-50' : 'from-red-50 to-rose-50'} rounded-xl border-2 ${isStoreOpen ? 'border-emerald-200' : 'border-red-200'} p-6 shadow-md hover:shadow-lg transition-all`}>
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Store Status</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Manage store availability</p>
                    </div>
                    <button
                      onClick={handleStoreToggle}
                      className={`p-3 rounded-xl transition-all shadow-sm ${
                        isStoreOpen
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md'
                          : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md'
                      }`}
                    >
                      <Power size={22} />
                    </button>
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Operating Hours</p>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-gray-100">
                      <Clock size={16} className="text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">
                        {openingTime} - {closingTime}
                      </span>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Current Status</p>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                      isStoreOpen 
                        ? 'bg-emerald-100/50 border-emerald-300' 
                        : 'bg-red-100/50 border-red-300'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className={`text-sm font-bold ${isStoreOpen ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isStoreOpen ? '🟢 OPEN & ACCEPTING ORDERS' : '🔴 CLOSED'}
                      </span>
                    </div>
                  </div>

                  {/* Temporary Closure Info */}
                  {tempClosedUntil && !isStoreOpen && (
                    <div className="p-3 rounded-lg bg-orange-100/60 border border-orange-300">
                      <p className="text-xs text-orange-800 font-semibold">
                        ⏱️ Temporary Closure Until {tempClosedUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {/* Toggle Dropdown Menu */}
                  {showToggleDropdown && isStoreOpen && (
                    <div className="p-4 rounded-lg bg-white border-2 border-orange-300 space-y-4">
                      <p className="text-sm font-semibold text-gray-900">How would you like to close your store?</p>
                      
                      {/* Temporary Option */}
                      <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                        toggleClosureType === 'temporary' ? 'bg-orange-50 border-orange-400' : 'bg-white border-gray-200 hover:border-orange-200'
                      }`}>
                        <input
                          type="radio"
                          name="closureType"
                          checked={toggleClosureType === 'temporary'}
                          onChange={() => setToggleClosureType('temporary')}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">⏱️ Temporary</p>
                          <p className="text-xs text-gray-600">Close until a specific time</p>
                        </div>
                      </label>

                      {/* Time Input - Temporary */}
                      {toggleClosureType === 'temporary' && (
                        <div className="ml-7 p-4 rounded-lg bg-orange-50 border-2 border-orange-300 space-y-3">
                          <label className="text-xs font-bold text-orange-900 block uppercase tracking-wide">Close until:</label>
                          <input
                            type="time"
                            value={closureTime}
                            onChange={(e) => setClosureTime(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-orange-400 rounded-lg bg-white text-gray-900 font-semibold text-lg focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400"
                          />
                          <p className="text-xs text-orange-800 font-medium">⏱️ Store will reopen at this time</p>
                        </div>
                      )}

                      {/* For Today Option */}
                      <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                        toggleClosureType === 'today' ? 'bg-red-50 border-red-400' : 'bg-white border-gray-200 hover:border-red-200'
                      }`}>
                        <input
                          type="radio"
                          name="closureType"
                          checked={toggleClosureType === 'today'}
                          onChange={() => setToggleClosureType('today')}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">📅 Close for Today</p>
                          <p className="text-xs text-gray-600">Reopen tomorrow at {openingTime}</p>
                        </div>
                      </label>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowToggleDropdown(false)
                            setToggleClosureType(null)
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmToggle}
                          disabled={!toggleClosureType}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                            toggleClosureType
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Mode Card - COMPACT */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Delivery</h3>
                      <p className="text-xs text-gray-600">Choose delivery method</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-50">
                      <Truck size={18} className="text-purple-600" />
                    </div>
                  </div>

                  {/* MX Self Delivery Toggle Button */}
                  <div className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">📦 MX Self Delivery</p>
                        <p className="text-xs text-gray-600">Use own riders</p>
                      </div>
                      <button
                        onClick={handleMXDeliveryToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          mxDeliveryEnabled ? 'bg-orange-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            mxDeliveryEnabled ? 'translate-x-5.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* GatiMitra - Default */}
                  <div className={`p-3 rounded-lg border-2 ${
                    mxDeliveryEnabled 
                      ? 'border-gray-200 bg-gray-50 opacity-60' 
                      : 'border-purple-300 bg-purple-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">🚴 GatiMitra Delivery</p>
                        <p className="text-xs text-gray-600">Partner delivery</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        mxDeliveryEnabled ? 'bg-gray-200 text-gray-700' : 'bg-purple-600 text-white'
                      }`}>
                        {mxDeliveryEnabled ? 'Off' : 'On'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ BELOW THE FOLD - STATS & ANALYTICS ═══ */}
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Pending"
                value={pendingOrders}
                icon="📦"
                color="orange"
              />
              <StatCard
                title="Preparing"
                value={preparingOrders}
                icon="👨‍🍳"
                color="blue"
              />
              <StatCard
                title="Delivered Today"
                value={deliveredToday}
                icon="✅"
                color="emerald"
              />
              <StatCard
                title="Today's Revenue"
                value={`₹${revenueToday.toLocaleString('en-IN')}`}
                icon="💰"
                color="purple"
              />
            </div>

            {/* Order Status Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Status Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  { label: 'Pending', value: 5, color: 'orange' },
                  { label: 'Confirmed', value: 8, color: 'blue' },
                  { label: 'Preparing', value: 2, color: 'yellow' },
                  { label: 'Ready', value: 3, color: 'cyan' },
                  { label: 'Delivered', value: 45, color: 'emerald' },
                  { label: 'Cancelled', value: 2, color: 'red' }
                ].map((status, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 text-center hover:shadow-md transition-shadow cursor-pointer bg-white"
                  >
                    <p className="text-xs text-gray-600 mb-1">{status.label}</p>
                    <p className={`text-2xl font-bold text-${status.color}-600`}>{status.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-900">Order ID</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-900">Customer</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-900">Amount</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-900">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '#ORD001', customer: 'John Doe', amount: '₹850', status: 'Delivered', time: '2:30 PM' },
                      { id: '#ORD002', customer: 'Jane Smith', amount: '₹1,200', status: 'Preparing', time: '2:15 PM' },
                      { id: '#ORD003', customer: 'Mike Johnson', amount: '₹650', status: 'Confirmed', time: '2:05 PM' },
                      { id: '#ORD004', customer: 'Sarah Davis', amount: '₹950', status: 'Pending', time: '1:50 PM' },
                      { id: '#ORD005', customer: 'Robert Wilson', amount: '₹1,100', status: 'Delivered', time: '1:30 PM' }
                    ].map((order, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">{order.id}</td>
                        <td className="py-2 px-3 text-gray-700">{order.customer}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{order.amount}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'Preparing'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : order.status === 'Confirmed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{order.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Toggle ON Warning Modal */}
            {showToggleOnWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border-2 border-emerald-200">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Power size={28} className="text-emerald-600" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Turn Store ON?</h3>
                    <p className="text-sm text-gray-600">
                      Your store will be OPEN and customers can place orders. Make sure you're ready to accept orders!
                    </p>
                  </div>

                  {/* Warning Box */}
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-6">
                    <p className="text-xs text-amber-800 font-medium">
                      ⚠️ <strong>Orders will start coming immediately!</strong> Be prepared to receive and process them.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowToggleOnWarning(false)}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmToggleOn}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Yes, Turn ON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Modal - Small, positioned above card */}
            {showConfirmationModal && (
              <div className="fixed inset-0 flex items-end justify-center z-50 p-4 pb-32">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border-2 border-red-200">
                  {/* Alert Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-600" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6 space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">Close Store?</h3>
                    <p className="text-sm text-gray-600">
                      {toggleClosureType === 'temporary' 
                        ? `Your store will be closed until ${closureTime}`
                        : `Your store will be closed for today until ${openingTime} tomorrow`
                      }
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelToggle}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFinalConfirm}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Yes, Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </MXLayoutWhite>
    </>
  )
}

// Helper Component: Stat Card
interface StatCardProps {
  title: string
  value: string | number
  icon: string
  color: 'orange' | 'blue' | 'emerald' | 'purple'
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]} text-xl`}>{icon}</div>
      </div>
    </div>
  )
}

import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
