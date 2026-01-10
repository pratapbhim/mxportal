import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;


let _supabase: ReturnType<typeof createClient<Database>> | undefined;
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseClient() {
	if (!_supabase) {
		_supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
	}
	return _supabase;
}

export function getSupabaseAdminClient() {
	if (!_supabaseAdmin) {
		_supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);
	}
	return _supabaseAdmin;
}

// For backward compatibility
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();
