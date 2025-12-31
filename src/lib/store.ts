import { create } from 'zustand'
import { Order } from './types'

interface OrderStore {
  orders: Order[]
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
  removeOrder: (orderId: string) => void
  newOrderCount: number
  setNewOrderCount: (count: number) => void
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) =>
    set((state) => {
      const exists = state.orders.find((o) => o.id === order.id)
      if (exists) return state
      return { orders: [order, ...state.orders] }
    }),
  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
    })),
  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== orderId),
    })),
  newOrderCount: 0,
  setNewOrderCount: (count) => set({ newOrderCount: count }),
}))

interface AuthStore {
  merchant: any | null
  setMerchant: (merchant: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  merchant: null,
  setMerchant: (merchant) => set({ merchant }),
  logout: () => set({ merchant: null }),
}))
