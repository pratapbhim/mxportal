import { supabaseAdmin } from './supabase';

export async function fetchStoreDocuments(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('merchant_store_documents')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching store documents:', error?.message || error);
    return [];
  }
  return data;
}

export async function fetchStoreOperatingHours(storeId: number) {
  const { data, error } = await supabaseAdmin
    .from('merchant_store_operating_hours')
    .select('*')
    .eq('store_id', storeId)
    .order('day_of_week', { ascending: true });
  if (error) {
    console.error('Error fetching store operating hours:', error?.message || error);
    return [];
  }
  return data;
}
