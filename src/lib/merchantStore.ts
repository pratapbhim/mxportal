import { supabase } from './supabase';

export interface MerchantStore {
  id: number;
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  am_name?: string;
  am_mobile?: string;
  am_email?: string;
  owner_name?: string;
  approval_status?: string;
  status?: string; // active/inactive
    is_active?: boolean;
    updated_at?: string;
    approval_reason?: string;
    approved_by?: string;
    approved_by_email?: string;
    approved_at?: string;
  full_address?: string;
  postal_code?: string;
  store_phones?: string;
  store_email?: string;
}

export const fetchStoresByManager = async (am_mobile: string): Promise<MerchantStore[]> => {
  console.log('DEBUG: Querying merchant_stores for am_mobile:', am_mobile);
  const { data, error } = await supabase
    .from('merchant_stores')
    .select('*')
    .eq('am_mobile', am_mobile);
  if (error) {
    console.error('Error fetching stores for manager:', error, JSON.stringify(error));
    // Try fallback: fetch all stores to debug RLS or data issues
    const fallback = await supabase.from('merchant_stores').select('*').limit(5);
    console.log('DEBUG: Fallback fetch all stores:', fallback.data, fallback.error);
    return [];
  }
  console.log('DEBUG: Fetched stores:', data);
  return (data as MerchantStore[]) || [];
};
