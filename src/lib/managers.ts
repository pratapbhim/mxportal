import { supabase } from './supabase';

export interface AreaManager {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  region: string;
  status: 'active' | 'inactive';
  stores: string[];
}

export const fetchAllManagers = async (): Promise<AreaManager[]> => {
  const { data, error } = await supabase
    .from('area_managers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (typeof error === 'object') {
      console.error('Error fetching managers:', JSON.stringify(error));
    } else {
      console.error('Error fetching managers:', error);
    }
    return [];
  }
  return data || [];
};

export const createManager = async (manager: Partial<AreaManager>): Promise<boolean> => {
  // Do NOT send id, let the trigger generate it. Map mobile to phone.
  const { name, email, phone, mobile, region, status } = manager;
  const { error } = await supabase
    .from('area_managers')
    .insert([{ name, email, phone: mobile || phone, region, status }]);
  if (error) {
    console.error('Error creating manager:', error);
    return false;
  }
  return true;
};

export const updateManager = async (id: string, updates: Partial<AreaManager>): Promise<boolean> => {
  const { error } = await supabase
    .from('area_managers')
    .update(updates)
    .eq('id', id);
  if (error) {
    console.error('Error updating manager:', error);
    return false;
  }
  return true;
};

export const deleteManager = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('area_managers')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting manager:', error);
    return false;
  }
  return true;
};
