import { supabase } from './supabase'
import { MerchantStore } from './merchantStore'

// Search merchant_store by store_id (mx id) or store_phones (mobile)
export const searchMerchantStore = async (query: string, searchType: 'mx_id' | 'mobile'): Promise<MerchantStore[]> => {
  let dbQuery = supabase.from('merchant_store').select('*')
  if (searchType === 'mx_id') {
    dbQuery = dbQuery.ilike('store_id', `%${query}%`)
  } else if (searchType === 'mobile') {
    dbQuery = dbQuery.contains('store_phones', [query])
  }
  const { data, error } = await dbQuery
  if (error) {
    console.error('Error searching merchant_store:', error)
    return []
  }
  return data as MerchantStore[]
}
