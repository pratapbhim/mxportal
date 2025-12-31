'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchRestaurantById as fetchStoreById, fetchRestaurantByName as fetchStoreByName } from '@/lib/database'
import { MerchantStore } from '@/lib/merchantStore'
import { DEMO_RESTAURANT_ID as DEMO_STORE_ID } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { Order, OrderStatus } from '@/lib/types'
import { updateOrderStatus, cancelOrder } from '@/app/actions/orders'
import { Toaster, toast } from 'sonner'
import { Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

function OrdersPageContent() {
  const searchParams = useSearchParams()
  const [store, setStore] = useState<MerchantStore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null)
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [showRefundAcceptModal, setShowRefundAcceptModal] = useState(false)
  const [showRefundRejectModal, setShowRefundRejectModal] = useState(false)
  const [refundPercentage, setRefundPercentage] = useState(100)
  const [rejectionReason, setRejectionReason] = useState('')

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [complaints, setComplaints] = useState<any[]>([])

  // Get restaurant ID
  useEffect(() => {
    const getStoreId = async () => {
      let id = searchParams.get('storeId') || searchParams.get('restaurantId')
      if (!id) {
        id = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') : null
      }
      if (!id) {
        id = DEMO_RESTAURANT_ID
      }
      setStoreId(id)
    }
    getStoreId()
  }, [searchParams])

  // Load restaurant data
  useEffect(() => {
    if (!storeId) return
    const loadStore = async () => {
      setIsLoading(true)
      try {
        let storeData = await fetchRestaurantById(storeId)
        if (!storeData && !storeId.match(/^GMM\d{4}$/)) {
          storeData = await fetchRestaurantByName(storeId)
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

  // Load orders
  useEffect(() => {
    async function loadOrders() {
      if (!storeId) return
      const { data, error } = await supabase
        .from('food_orders')
        .select('*')
        .eq('restaurant_id', storeId)
        .order('created_at', { ascending: false })
      if (!error && data) {
        setOrders(data as Order[])
      }
    }
    loadOrders()
  }, [storeId])

  // Load complaints (mock data for now)
  useEffect(() => {
    // Mock complaints data
    setComplaints([
      {
        id: 'complaint_001',
        orderId: '#ORD001',
        customerName: 'John Doe',
        complaint: 'Food was cold when delivered',
        date: '2025-12-26',
        status: 'open',
      },
      {
        id: 'complaint_002',
        orderId: '#ORD002',
        customerName: 'Jane Smith',
        complaint: 'Wrong item in order',
        date: '2025-12-25',
        status: 'resolved',
      },
      {
        id: 'complaint_003',
        orderId: '#ORD003',
        customerName: 'Mike Johnson',
        complaint: 'Delayed delivery',
        date: '2025-12-24',
        status: 'open',
      },
    ])
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === 'CANCELLED') {
      await cancelOrder(orderId, storeId || DEMO_RESTAURANT_ID, 'Merchant cancelled')
    } else {
      await updateOrderStatus(orderId, newStatus as OrderStatus, storeId || DEMO_RESTAURANT_ID)
    }
  }

  const getOrdersByTab = () => {
    switch (activeTab) {
      case 'active':
        return orders.filter((o) => !['delivered', 'cancelled'].includes(o.status.toLowerCase()))
      case 'completed':
        return orders.filter((o) => o.status.toLowerCase() === 'delivered')
      case 'cancelled':
        return orders.filter((o) => o.status.toLowerCase() === 'cancelled')
      default:
        return []
    }
  }

  const filteredOrders = getOrdersByTab()

  if (isLoading) {
    return (
      <MXLayoutWhite restaurantName={store?.store_name} restaurantId={storeId || ''}>
        <div className="min-h-screen bg-gray-50">
          {/* Header Skeleton */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>

          {/* Filter Skeleton */}
          <div className="bg-white border-b border-gray-200 p-6 flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 grid grid-cols-6 gap-4 p-6 border-b border-gray-200">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              {/* Rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 p-6 border-b border-gray-100 items-center">
                  {[1, 2, 3, 4, 5, 6].map((col) => (
                    <div key={col} className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </MXLayoutWhite>
    )
  }

  return (
    <MXLayoutWhite
      restaurantName={store?.store_name || 'Store'}
      restaurantId={storeId || DEMO_RESTAURANT_ID}
    >
      <Toaster />
      <div className="min-h-screen bg-white">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'active', label: '📦 Active Orders', icon: Clock },
                { id: 'completed', label: '✅ Completed', icon: CheckCircle2 },
                { id: 'cancelled', label: '❌ Cancelled', icon: XCircle },
                { id: 'complaints', label: `💬 Complaints ${complaints.filter(c => c.status === 'open').length > 0 ? `(${complaints.filter(c => c.status === 'open').length})` : ''}`, icon: MessageSquare },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Active Orders */}
          {activeTab === 'active' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Active Orders</h2>
                <p className="text-gray-600 mt-1">Manage your live orders and fulfill customer requests</p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No active orders</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.order_number}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white flex flex-col gap-2"
                    >
                      {/* Card Header with Order ID */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-gray-500 font-medium">Order ID</span>
                          <span className="font-bold text-gray-900 text-sm tracking-tight">{order.order_number ? order.order_number.substring(0, 12) : ''}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
                        <span>📅 2 hours ago</span>
                        <span className="text-blue-600 font-medium">Delivery</span>
                      </div>

                      {/* Customer & Delivery Info */}
                      <div className="flex flex-col gap-0.5 pb-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-900 text-[13px] leading-tight">{order.user_name}</span>
                        {order.delivery_address && (
                          <span className="text-xs text-gray-600 leading-snug">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : `${order.delivery_address?.address || ''}, ${order.delivery_address?.city || ''} - ${order.delivery_address?.pincode || ''}`}
                          </span>
                        )}
                        {order.user_phone && (
                          <span className="text-xs text-gray-600">📞 {order.user_phone}</span>
                        )}
                      </div>

                      {/* Amount and Items */}
                      <div className="flex items-center justify-between mb-1 mt-1">
                        <div>
                          <span className="text-xs text-gray-500">Amount</span>
                          <div className="text-base font-bold text-gray-900 leading-tight">₹{order.total_amount}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Items</span>
                          <div className="text-base font-bold text-gray-900 leading-tight">{order.items?.length || 0}</div>
                        </div>
                      </div>

                      {/* View Order Button */}
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowDetailModal(true)
                        }}
                        className="w-full px-2.5 py-1.5 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 font-medium text-xs mb-1 transition-colors flex items-center justify-center gap-1"
                      >
                        <span role="img" aria-label="View">👁️</span> View Order
                      </button>

                      {/* Action Buttons */}
                      <div className="flex flex-row gap-2 w-full">
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <>
                            <button
                              onClick={() => handleStatusChange(order.id, order.status === 'pending' ? 'confirmed' : 'preparing')}
                              className="flex-1 px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-xs transition-colors"
                            >
                              {order.status === 'pending' ? '✓ Confirm Order' : '📦 Mark Ready for Dispatch'}
                            </button>
                            <button
                              onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                              className="flex-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium text-xs transition-colors"
                            >
                              ✕ Reject Order
                            </button>
                          </>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'ready')}
                            className="w-full px-2.5 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-xs transition-colors"
                          >
                            📦 Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'delivered')}
                            className="w-full px-2.5 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium text-xs transition-colors"
                          >
                            ✓ Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed Orders */}
          {activeTab === 'completed' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Completed Orders</h2>
                <p className="text-gray-600 mt-1">Orders successfully delivered to customers</p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No completed orders</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.order_number}
                      className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-green-50"
                    >
                      {/* Card Header with Order ID */}
                      <div className="mb-3 pb-3 border-b border-green-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <p className="text-xs text-gray-600">Order ID:</p>
                            <h3 className="font-bold text-gray-900 text-base">{order.order_number ? order.order_number.substring(0, 12) : ''}</h3>
                          </div>
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            ✅ DELIVERED
                          </span>
                        </div>
                      </div>

                      {/* Customer & Delivery Info */}
                      <div className="mb-4 pb-3 border-b border-green-200">
                        <p className="font-semibold text-gray-900 text-sm mb-2">{order.user_name}</p>
                        {order.delivery_address && (
                          <p className="text-xs text-gray-600 mb-2 leading-snug">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : `${order.delivery_address?.address || ''}, ${order.delivery_address?.city || ''} - ${order.delivery_address?.pincode || ''}`}
                          </p>
                        )}
                        {/* Delivery mode removed: not present in FoodOrder */}
                      </div>

                      {/* Amount and Items */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="text-lg font-bold text-gray-900">₹{order.total_amount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Items</p>
                          <p className="text-lg font-bold text-gray-900">{order.items?.length || 0}</p>
                        </div>
                      </div>

                      {/* View Order Button */}
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowDetailModal(true)
                        }}
                        className="w-full px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                      >
                        👁️ View Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cancelled Orders */}
          {activeTab === 'cancelled' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Cancelled Orders</h2>
                <p className="text-gray-600 mt-1">Orders that were cancelled</p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No cancelled orders</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.order_number}
                      className="border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-red-50"
                    >
                      {/* Card Header with Order ID */}
                      <div className="mb-3 pb-3 border-b border-red-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <p className="text-xs text-gray-600">Order ID:</p>
                            <h3 className="font-bold text-gray-900 text-base">{order.order_number ? order.order_number.substring(0, 12) : ''}</h3>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                              ❌ CANCELLED
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                              💸 REFUNDED
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Customer & Delivery Info */}
                      <div className="mb-4 pb-3 border-b border-red-200">
                        <p className="font-semibold text-gray-900 text-sm mb-2">{order.user_name}</p>
                        {order.delivery_address && (
                          <p className="text-xs text-gray-600 mb-2 leading-snug">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : `${order.delivery_address?.address || ''}, ${order.delivery_address?.city || ''} - ${order.delivery_address?.pincode || ''}`}
                          </p>
                        )}
                      </div>

                      {/* Amount and Items */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="text-lg font-bold text-gray-900">₹{order.total_amount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Items</p>
                          <p className="text-lg font-bold text-gray-900">{order.items?.length || 0}</p>
                        </div>
                      </div>

                      {/* View Order Button */}
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowDetailModal(true)
                        }}
                        className="w-full px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                      >
                        👁️ View Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Complaints */}
          {activeTab === 'complaints' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Customer Complaints</h2>
                <p className="text-gray-600 mt-1">
                  {complaints.filter(c => c.status === 'open').length} active complaint(s) requiring response
                </p>
              </div>

              {complaints.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No complaints</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        complaint.status === 'open'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="mb-3 pb-3 border-b"
                        style={{borderBottomColor: complaint.status === 'open' ? '#fcd34d' : '#86efac'}}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-base">{complaint.orderId}</h3>
                            <p className="text-xs text-gray-600">{complaint.customerName}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {complaint.status === 'open' && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
                                ⏳ PENDING REFUND
                              </span>
                            )}
                            {complaint.status === 'resolved' && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 whitespace-nowrap">
                                🔴 REJECTED REFUND
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Complaint Details */}
                      <div className="mb-4">
                        <p className="font-semibold text-gray-900 text-sm mb-2">💬 Issue</p>
                        <p className="text-xs text-gray-700 leading-snug">{complaint.complaint}</p>
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b"
                        style={{borderBottomColor: complaint.status === 'open' ? '#fde68a' : '#d1fae5'}}
                      >
                        <p className="text-xs text-gray-600">📅 {complaint.date}</p>
                      </div>

                      {/* Action Button */}
                      {complaint.status === 'open' && (
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint)
                            setShowComplaintModal(true)
                          }}
                          className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm transition-colors"
                        >
                          🎫 Resolve Tickets
                        </button>
                      )}
                      {complaint.status === 'resolved' && (
                        <button
                          disabled
                          className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium text-sm cursor-not-allowed"
                        >
                          🔴 Refund Rejected
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style>{`
              .modal-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedOrder.order_number}</h2>
                <p className="text-xs text-gray-600">{selectedOrder.user_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Help: Contact support for assistance')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-xs transition-colors"
                >
                  ❓ Help
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-xs transition-colors"
                >
                  🖨️ Print Bill
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-3 space-y-3 overflow-y-auto modal-scroll flex-1"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Order Status */}
              <div className="bg-gray-50 p-2 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold uppercase">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-sm font-bold ${
                    selectedOrder.status === 'pending' ? 'text-yellow-700' :
                    selectedOrder.status === 'confirmed' ? 'text-blue-700' :
                    selectedOrder.status === 'preparing' ? 'text-purple-700' :
                    selectedOrder.status === 'ready' ? 'text-green-700' :
                    selectedOrder.status === 'delivered' ? 'text-emerald-700' :
                    'text-red-700'
                  }`}>
                    {selectedOrder.status.toUpperCase()}
                  </p>
                  {/* is_refunded removed: not present in FoodOrder */}
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Amount</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">₹{selectedOrder.total_amount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Items</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{selectedOrder.items?.length || 0} items</p>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Order Items</p>
                  <div className="space-y-1 bg-gray-50 p-2 rounded-lg">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0">
                        <span className="text-gray-900">{item.name || item.item_name}</span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">×{item.quantity}</p>
                          <p className="text-xs text-gray-600">₹{item.price || item.item_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payout Info */}
              <div className="border-t border-gray-200 pt-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">₹{selectedOrder.subtotal || selectedOrder.total_amount}</span>
                  </div>
                  {selectedOrder.delivery_fee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="text-gray-900 font-medium">₹{selectedOrder.delivery_fee}</span>
                    </div>
                  )}
                  {/* tax removed: not present in FoodOrder */}
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
                    <span>Total</span>
                    <span className="text-gray-900">₹{selectedOrder.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Order Meta */}
              <div className="space-y-1 bg-blue-50 p-2 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID (from DB)</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-bold text-gray-900">{selectedOrder.order_number}</span>
                </div>
                {selectedOrder.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="text-gray-900 text-xs">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-2 flex gap-2 flex-shrink-0">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'confirmed')
                      setShowDetailModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Confirm Order
                  </button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'preparing')
                      setShowDetailModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
                  >
                    Start Preparing
                  </button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'ready')
                      setShowDetailModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                  >
                    Mark Ready
                  </button>
                )}
                {selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'delivered')
                      setShowDetailModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
                  >
                    Mark Delivered
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {showComplaintModal && selectedComplaint && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          onClick={() => setShowComplaintModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style>{`
              .complaint-modal-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedComplaint.orderId}</h2>
                <p className="text-xs text-gray-600">{selectedComplaint.customerName}</p>
              </div>
              <button
                onClick={() => setShowComplaintModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 space-y-3 overflow-y-auto complaint-modal-scroll flex-1"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Issue Section */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-gray-600 font-semibold uppercase mb-2">💬 Issue</p>
                <p className="text-sm text-gray-900 leading-snug">{selectedComplaint.complaint}</p>
              </div>

              {/* Images Section */}
              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">📸 Images</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedComplaint.images.map((image: any, idx: number) => (
                      <img
                        key={idx}
                        src={image}
                        alt={`Complaint image ${idx + 1}`}
                        className="rounded-lg border border-gray-200 w-full h-24 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Complaint Details */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-semibold text-gray-900">📅 {selectedComplaint.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                    ⏳ PENDING REFUND
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-2 p-3 flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowComplaintModal(false)
                  setShowRefundAcceptModal(true)
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
              >
                ✓ Accept Refund
              </button>
              <button
                onClick={() => {
                  setShowComplaintModal(false)
                  setShowRefundRejectModal(true)
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors"
              >
                ✕ Reject Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Accept Modal - Select Percentage */}
      {showRefundAcceptModal && selectedComplaint && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          onClick={() => setShowRefundAcceptModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-600 text-white px-4 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">✓ Accept Refund</h3>
              <p className="text-sm text-green-100">{selectedComplaint.orderId} - {selectedComplaint.customerName}</p>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700 font-semibold">Select refund percentage:</p>
              
              <div className="space-y-2">
                {[
                  { value: 100, label: 'Full Refund (100%)' },
                  { value: 50, label: 'Half Refund (50%)' },
                  { value: 20, label: 'Partial Refund (20%)' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors"
                    style={{
                      borderColor: refundPercentage === option.value ? '#16a34a' : '#e5e7eb',
                      backgroundColor: refundPercentage === option.value ? '#f0fdf4' : '#ffffff'
                    }}
                  >
                    <input
                      type="radio"
                      name="refund"
                      value={option.value}
                      checked={refundPercentage === option.value}
                      onChange={(e) => setRefundPercentage(Number(e.target.value))}
                      className="mr-3"
                    />
                    <span className="font-semibold text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Refund Amount:</strong> ₹{Math.round((selectedComplaint.orderId ? 376 : 0) * refundPercentage / 100)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 p-4 flex gap-2">
              <button
                onClick={() => setShowRefundAcceptModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`✓ Refund of ${refundPercentage}% accepted for ${selectedComplaint.orderId}`);
                  setShowRefundAcceptModal(false)
                  setShowComplaintModal(false)
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Reject Modal - Get Reason */}
      {showRefundRejectModal && selectedComplaint && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          onClick={() => setShowRefundRejectModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600 text-white px-4 py-4 rounded-t-lg">
              <h3 className="text-lg font-bold">✕ Reject Refund</h3>
              <p className="text-sm text-red-100">{selectedComplaint.orderId} - {selectedComplaint.customerName}</p>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason:</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why you are rejecting this refund..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm resize-none"
                  rows={4}
                />
              </div>

              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-xs text-red-900">
                  <strong>⚠️ Note:</strong> The customer will receive a notification about this rejection with your reason.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 p-4 flex gap-2">
              <button
                onClick={() => setShowRefundRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    alert('Please provide a reason for rejection')
                    return
                  }
                  alert(`✕ Refund rejected for ${selectedComplaint.orderId}\nReason: ${rejectionReason}`);
                  setShowRefundRejectModal(false)
                  setShowComplaintModal(false)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </MXLayoutWhite>
  )
}

import { Suspense } from 'react';

export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}

