import { supabase } from './supabase';

export async function fetchStoreDocuments(storeId: number) {
  const { data, error } = await supabase
    .from('merchant_store_documents')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching store documents:', error);
    return [];
  }
  return data;
}

export async function fetchStoreOperatingHours(storeId: number) {
  const { data, error } = await supabase
    .from('merchant_store_operating_hours')
    .select('*')
    .eq('store_id', storeId)
    .order('day_of_week', { ascending: true });
  if (error) {
    console.error('Error fetching store operating hours:', error);
    return [];
  }
  return data;
}
