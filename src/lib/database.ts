// Alias for compatibility with dashboard import
export { fetchStoreByName as fetchRestaurantByName };
// Fetch all approved/rejected stores with optional date range
export const fetchManagedStores = async (fromDate?: string, toDate?: string) => {
  let query = supabase
    .from('merchant_store')
    .select('*')
    .in('approval_status', ['APPROVED', 'REJECTED'])
    .order('created_at', { ascending: false });
  if (fromDate) query = query.gte('created_at', fromDate + 'T00:00:00');
  if (toDate) query = query.lte('created_at', toDate + 'T23:59:59');
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching managed stores:', error);
    return [];
  }
  return data || [];
};
// Fetch store counts for dashboard metrics with optional date range
export const fetchStoreCounts = async (fromDate?: string, toDate?: string) => {
  let query = supabase
    .from('merchant_store')
    .select('approval_status, created_at', { count: 'exact', head: false });
  if (fromDate) query = query.gte('created_at', fromDate + 'T00:00:00');
  if (toDate) query = query.lte('created_at', toDate + 'T23:59:59');
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching store counts:', error);
    return { total: 0, pending: 0, verified: 0, rejected: 0 };
  }
  let total = 0, pending = 0, verified = 0, rejected = 0;
  (data || []).forEach((row: any) => {
    total++;
    if (row.approval_status === 'APPROVED') verified++;
    else if (row.approval_status === 'REJECTED') rejected++;
    else pending++;
  });
  return { total, pending, verified, rejected };
};
// ============================================
// OFFERS QUERIES
// ============================================

export interface Offer {
  id: string;
  restaurant_id: string;
  offer_type: 'ALL_ORDERS' | 'ITEM_LEVEL';
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  item_name?: string;
  min_order_amount?: number;
  valid_from: string;
  valid_till: string;
  is_active: boolean;
  usage_count: number;
  created_at?: string;
  updated_at?: string;
}

export const fetchActiveOffers = async (restaurantId: string): Promise<Offer[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error) {
      if (typeof error === 'object' && error !== null) {
        console.error('Error fetching offers:', JSON.stringify(error, null, 2));
      } else {
        console.error('Error fetching offers:', error);
      }
      return [];
    }
    return data || [];
  } catch (error) {
    if (typeof error === 'object' && error !== null) {
      console.error('Error fetching offers (exception):', JSON.stringify(error, null, 2));
    } else {
      console.error('Error fetching offers (exception):', error);
    }
    return [];
  }
};

export const createOffer = async (offer: Partial<Offer>): Promise<Offer | null> => {
  try {
    // Always set usage_count to 0 for new offers
    const insertPayloadRaw = { ...offer, usage_count: 0 };
    // Remove undefined/null fields and bannerImage (not in offers table)
    const insertPayload: Record<string, any> = {};
    Object.entries(insertPayloadRaw).forEach(([k, v]) => {
      if (k === 'bannerImage') return; // skip bannerImage, not in DB
      if (v !== undefined && v !== null && v !== '') insertPayload[k] = v;
    });
    const { data, error } = await supabase
      .from('offers')
      .insert([insertPayload])
      .select()
      .single();
    if (error) {
      if (typeof error === 'object' && error !== null) {
        console.error('Error creating offer:', JSON.stringify(error, null, 2));
      } else {
        console.error('Error creating offer:', error);
      }
      return null;
    }
    return data as Offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    return null;
  }
};

export const updateOffer = async (id: string, updates: Partial<Offer>): Promise<Offer | null> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Offer;
  } catch (error) {
    console.error('Error updating offer:', error);
    return null;
  }
};

export const deleteOffer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting offer:', error);
    return false;
  }
};

export const subscribeToOffers = (restaurantId: string, callback: (offer: Offer) => void) => {
  return supabase
    .channel(`offers:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'offers',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload: any) => {
        callback(payload.new as Offer);
      }
    )
    .subscribe();
};
// ============================================
// GATIMITRA FOOD ORDERS - DATABASE UTILITIES
// ============================================

import { supabase } from './supabase'
import { FoodOrder, OrderStats } from './types'
import { MerchantStore } from './merchantStore';

// ============================================
// RESTAURANT QUERIES
// ============================================

export const fetchRestaurantById = async (storeId: string): Promise<MerchantStore | null> => {
  try {
    const { data, error } = await supabase
      .from('merchant_store')
      .select('*')
      .eq('store_id', storeId)
      .single();
    if (error) throw error;
    return data as MerchantStore;
  } catch (error) {
    console.error('Error fetching store:', error);
    return null;
  }
}

export const fetchAllStores = async (): Promise<MerchantStore[]> => {
  try {
    const { data, error } = await supabase
      .from('merchant_store')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as MerchantStore[];
  } catch (error: any) {
    if (error instanceof Error) {
      console.error('Error fetching stores:', error.message, error.stack);
    } else {
      console.error('Error fetching stores:', JSON.stringify(error));
    }
    return [];
  }
}

export const fetchStoreByName = async (storeName: string): Promise<MerchantStore | null> => {
  try {
    const { data, error } = await supabase
      .from('merchant_store')
      .select('*')
      .ilike('store_name', `%${storeName}%`)
      .single();
    if (error) {
      console.error('Store not found:', storeName);
      return null;
    }
    return data as MerchantStore;
  } catch (error) {
    console.error('Error fetching store by name:', error);
    return null;
  }
}

export const registerStore = async (store: Partial<MerchantStore>): Promise<{ data: MerchantStore | null, error: any }> => {
  try {
    // Ensure all required fields are present (add more as needed)
    const requiredFields = [
      'store_name', 'owner_name', 'city', 'state'
    ];
    for (const field of requiredFields) {
      if (!store[field as keyof typeof store]) {
        console.error('Missing required field:', field);
        return { data: null, error: { message: `Missing required field: ${field}` } };
      }
    }
    const { data, error } = await supabase
      .from('merchant_store')
      .insert([store])
      .select()
      .single();
    return { data: data as MerchantStore, error };
  } catch (error) {
    console.error('Error registering store (exception):', JSON.stringify(error, null, 2));
    return { data: null, error };
  }
}

export const updateStoreInfo = async (storeId: string, updates: Partial<MerchantStore>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('merchant_store')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating store:', error);
    return false;
  }
}

export const getRestaurantStats = async (restaurantId: string) => {
  try {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single()

    if (restaurantError) throw restaurantError

    return {
      restaurant_id: restaurant.restaurant_id,
      restaurant_name: restaurant.restaurant_name,
      owner_name: restaurant.owner_name,
      email: restaurant.email,
      phone: restaurant.phone,
      city: restaurant.city,
      avg_rating: restaurant.avg_rating,
      total_reviews: restaurant.total_reviews,
      total_orders: restaurant.total_orders,
      is_verified: restaurant.is_verified,
      is_active: restaurant.is_active,
      created_at: restaurant.created_at,
    }
  } catch (error) {
    console.error('Error getting restaurant stats:', error)
    return null
  }
}

export const subscribeToRestaurantData = (
  restaurantId: string,
  callback: (restaurant: Restaurant) => void
) => {
  return supabase
    .channel(`restaurant:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'restaurants',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload: any) => {
        callback(payload.new as Restaurant)
      }
    )
    .subscribe()
}

// ============================================
// FOOD ORDER QUERIES
// ============================================

export const fetchFoodOrdersByRestaurant = async (
  restaurantId: string,
  status?: string,
  limit = 50
): Promise<FoodOrder[]> => {
  try {
    console.log('🔍 Fetching orders for restaurant ID:', restaurantId)
    
    let query = supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase error fetching orders:', error?.message || error)
      throw error
    }
    
    console.log('✅ Orders fetched:', data?.length || 0, 'records')
    return (data || []) as FoodOrder[]
  } catch (error: any) {
    console.error('Error fetching food orders:', error?.message || error)
    return []
  }
}

// Alternative fetch by restaurant name (case-insensitive)
export const fetchFoodOrdersByRestaurantName = async (
  restaurantName: string,
  status?: string,
  limit = 50
): Promise<FoodOrder[]> => {
  try {
    console.log('🔍 Fetching orders for restaurant NAME:', restaurantName)
    
    let query = supabase
      .from('food_orders')
      .select('*')
      .ilike('restaurant_name', `%${restaurantName}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase error fetching orders by name:', error?.message || error)
      throw error
    }
    
    console.log('✅ Orders fetched by name:', data?.length || 0, 'records')
    return (data || []) as FoodOrder[]
  } catch (error: any) {
    console.error('Error fetching food orders by name:', error?.message || error)
    return []
  }
}

export const fetchOrderById = async (orderId: string): Promise<FoodOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data as FoodOrder
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

export const fetchOrdersByStatus = async (
  restaurantId: string,
  status: string
): Promise<FoodOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FoodOrder[]
  } catch (error) {
    console.error('Error fetching orders by status:', error)
    return []
  }
}

export const searchOrders = async (
  restaurantId: string,
  query: string
): Promise<FoodOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or(`order_number.ilike.%${query}%,user_name.ilike.%${query}%,user_phone.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FoodOrder[]
  } catch (error) {
    console.error('Error searching orders:', error)
    return []
  }
}

// ============================================
// ORDER MUTATIONS
// ============================================

export const updateOrderStatus = async (
  orderId: string,
  status: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('food_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'confirmed' && { confirmed_at: new Date().toISOString() }),
        ...(status === 'delivered' && { delivered_at: new Date().toISOString() }),
      })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}

export const createFoodOrder = async (order: Partial<FoodOrder>): Promise<FoodOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .insert([order])
      .select()
      .single()

    if (error) throw error
    return data as FoodOrder
  } catch (error) {
    console.error('Error creating order:', error)
    return null
  }
}

export const cancelOrder = async (orderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('food_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error cancelling order:', error)
    return false
  }
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

export const fetchOrderStats = async (restaurantId: string): Promise<OrderStats | null> => {
  try {
    console.log('📊 Fetching order stats for restaurant ID:', restaurantId)
    
    const { data: orders, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (error) {
      console.error('❌ Supabase error fetching stats:', error?.message || error)
      throw error
    }

    console.log('📈 Total orders found:', orders?.length || 0)

    const foodOrders = (orders || []) as FoodOrder[]

    const stats: OrderStats = {
      total_orders: foodOrders.length,
      pending_orders: foodOrders.filter((o) => o.status === 'pending').length,
      confirmed_orders: foodOrders.filter((o) => o.status === 'confirmed').length,
      preparing_orders: foodOrders.filter((o) => o.status === 'preparing').length,
      ready_orders: foodOrders.filter((o) => o.status === 'ready').length,
      out_for_delivery_orders: foodOrders.filter((o) => o.status === 'out_for_delivery').length,
      delivered_orders: foodOrders.filter((o) => o.status === 'delivered').length,
      cancelled_orders: foodOrders.filter((o) => o.status === 'cancelled').length,
      total_revenue: foodOrders
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + o.total_amount, 0),
      average_order_value:
        foodOrders.length > 0
          ? foodOrders.reduce((sum, o) => sum + o.total_amount, 0) / foodOrders.length
          : 0,
      average_rating: foodOrders.filter((o) => o.rating).length > 0
        ? foodOrders.filter((o) => o.rating).reduce((sum, o) => sum + (o.rating || 0), 0) /
          foodOrders.filter((o) => o.rating).length
        : 0,
    }

    console.log('✅ Stats calculated:', stats)
    return stats
  } catch (error: any) {
    console.error('Error fetching order stats:', error?.message || error)
    return null
  }
}

// Alternative stats by restaurant name
export const fetchOrderStatsByRestaurantName = async (restaurantName: string): Promise<OrderStats | null> => {
  try {
    console.log('📊 Fetching order stats for restaurant NAME:', restaurantName)
    
    const { data: orders, error } = await supabase
      .from('food_orders')
      .select('*')
      .ilike('restaurant_name', `%${restaurantName}%`)

    if (error) {
      console.error('❌ Supabase error fetching stats by name:', error?.message || error)
      throw error
    }

    console.log('📈 Total orders found by name:', orders?.length || 0)

    const foodOrders = (orders || []) as FoodOrder[]

    const stats: OrderStats = {
      total_orders: foodOrders.length,
      pending_orders: foodOrders.filter((o) => o.status === 'pending').length,
      confirmed_orders: foodOrders.filter((o) => o.status === 'confirmed').length,
      preparing_orders: foodOrders.filter((o) => o.status === 'preparing').length,
      ready_orders: foodOrders.filter((o) => o.status === 'ready').length,
      out_for_delivery_orders: foodOrders.filter((o) => o.status === 'out_for_delivery').length,
      delivered_orders: foodOrders.filter((o) => o.status === 'delivered').length,
      cancelled_orders: foodOrders.filter((o) => o.status === 'cancelled').length,
      total_revenue: foodOrders
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + o.total_amount, 0),
      average_order_value:
        foodOrders.length > 0
          ? foodOrders.reduce((sum, o) => sum + o.total_amount, 0) / foodOrders.length
          : 0,
      average_rating: foodOrders.filter((o) => o.rating).length > 0
        ? foodOrders.filter((o) => o.rating).reduce((sum, o) => sum + (o.rating || 0), 0) /
          foodOrders.filter((o) => o.rating).length
        : 0,
    }

    console.log('✅ Stats calculated by name:', stats)
    return stats
  } catch (error: any) {
    console.error('Error fetching order stats by name:', error?.message || error)
    return null
  }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const subscribeToRestaurantOrders = (
  restaurantId: string,
  callback: (order: FoodOrder) => void
) => {
  return supabase
    .channel(`orders:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload: any) => {
        callback(payload.new as FoodOrder)
      }
    )
    .subscribe()
}

// ============================================
// BATCH OPERATIONS
// ============================================

export const fetchOrdersInDateRange = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<FoodOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FoodOrder[]
  } catch (error) {
    console.error('Error fetching orders in date range:', error)
    return []
  }
}

export const fetchPendingOrders = async (restaurantId: string): Promise<FoodOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as FoodOrder[]
  } catch (error) {
    console.error('Error fetching pending orders:', error)
    return []
  }
}

// ============================================
// DIAGNOSTIC FUNCTIONS
// ============================================

export const getAllOrdersInDatabase = async (): Promise<FoodOrder[]> => {
  try {
    console.log('🔍 Fetching ALL orders from database (diagnostic)')
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .limit(100)

    if (error) throw error
    
    console.log('📊 Total orders in database:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('📝 Sample order restaurant_ids:', data.slice(0, 3).map(o => ({ id: o.id, restaurant_id: o.restaurant_id, restaurant_name: o.restaurant_name })))
    }
    
    return (data || []) as FoodOrder[]
  } catch (error) {
    console.error('❌ Error fetching all orders:', error)
    return []
  }
}

export const getOrdersForRestaurantName = async (restaurantName: string): Promise<FoodOrder[]> => {
  try {
    console.log('🔍 Fetching orders by restaurant name:', restaurantName)
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .ilike('restaurant_name', `%${restaurantName}%`)
      .limit(50)

    if (error) throw error
    
    console.log('✅ Orders found by name:', data?.length || 0)
    return (data || []) as FoodOrder[]
  } catch (error) {
    console.error('❌ Error fetching orders by name:', error)
    return []
  }
}

// ============================================
// MENU ITEMS QUERIES
// ============================================

export const fetchMenuItems = async (restaurantId: string) => {
  try {
    // Only select columns actually used in the app for performance
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, item_name, category, price, offer_price, description, image_url, in_stock, customizations, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error fetching menu items:', error?.message || error)
    return []
  }
}

export const createMenuItem = async (itemData: any) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([
        {
          restaurant_id: itemData.restaurant_id,
          item_name: itemData.item_name,
          category: itemData.category,
          category_item: itemData.category_item, // <-- ensure this is saved
          price: itemData.price,
          offer_price: itemData.offer_price,
          description: itemData.description || null,
          image_url: itemData.image_url || null,
          in_stock: itemData.in_stock,
          customizations: itemData.customizations || [],
          is_active: true
        }
      ])
      .select()

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    // Improved error logging for debugging
    if (typeof error === 'object') {
      console.error('Error creating menu item:', JSON.stringify(error, null, 2));
    } else {
      console.error('Error creating menu item:', error);
    }
    throw error;
  }
}

export const updateMenuItem = async (itemId: string, itemData: any) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update({
        item_name: itemData.item_name,
        category: itemData.category,
        price: itemData.price,
        offer_price: itemData.offer_price,
        description: itemData.description || null,
        image_url: itemData.image_url || null,
        in_stock: itemData.in_stock,
        customizations: itemData.customizations || []
      })
      .eq('id', itemId)
      .select()

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error updating menu item:', error)
    throw error
  }
}

export const updateMenuItemStock = async (itemId: string, inStock: boolean) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ in_stock: inStock })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message || 'Failed to update stock')
    }
    
    if (!data || data.length === 0) {
      throw new Error('Item not found')
    }
    
    return data[0]
  } catch (error: any) {
    console.error('Error updating stock status:', error?.message || error)
    throw error
  }
}

export const deleteMenuItem = async (itemId: string) => {
  try {
    console.log('🗑️ [DELETE] Starting hard delete for item:', itemId)
    
    // Hard delete - completely remove from database
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)

    console.log('🔄 [DELETE] Delete response:', { error })

    if (error) {
      console.error('❌ [DELETE] Delete failed:', error)
      throw new Error(error.message || 'Failed to delete item')
    }
    
    console.log('✅ [DELETE] Item completely removed from Supabase')
    return true
  } catch (error: any) {
    console.error('❌ [DELETE] Error:', error?.message || error)
    throw error
  }
}

// ============================================
// IMAGE UPLOAD TRACKING
// ============================================

export const getImageUploadCount = async (restaurantId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .neq('image_url', null)
      .neq('image_url', '')

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    console.error('Error getting image count:', error)
    return 0
  }
}

export const getImageUploadStatus = async (restaurantId: string) => {
  try {
    const count = await getImageUploadCount(restaurantId)
    
    // Tier 1: 10 free images
    const TIER_1_LIMIT = 10
    // Tier 2: 7 bonus free images (special offer)
    const TIER_2_LIMIT = 7
    // Total free images
    const TOTAL_FREE = TIER_1_LIMIT + TIER_2_LIMIT

    const tier1Used = Math.min(count, TIER_1_LIMIT)
    const tier1Remaining = Math.max(0, TIER_1_LIMIT - count)
    const tier2Used = Math.max(0, Math.min(count - TIER_1_LIMIT, TIER_2_LIMIT))
    const tier2Remaining = Math.max(0, TIER_2_LIMIT - tier2Used)
    const canAccessTier2 = count >= TIER_1_LIMIT
    const isPaid = count > TOTAL_FREE
    const paidCount = Math.max(0, count - TOTAL_FREE)

    return {
      totalUsed: count,
      tier1Used,
      tier1Remaining,
      tier1Limit: TIER_1_LIMIT,
      tier2Used,
      tier2Remaining,
      tier2Limit: TIER_2_LIMIT,
      canAccessTier2,
      totalFreeAvailable: TOTAL_FREE,
      totalFreeUsed: Math.min(count, TOTAL_FREE),
      isPaid,
      paidCount,
      pricePerImage: 2.5
    }
  } catch (error: any) {
    console.error('Error getting image upload status:', error?.message || error)
    return null
  }
}

