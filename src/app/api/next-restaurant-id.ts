import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use environment variables for your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  // Query the max restaurant_id from the restaurants table
  // restaurant_id is a string like GMM0001, so we need to extract the numeric part
  const { data, error } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .order('restaurant_id', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let maxId = 0;
  if (data && data.length > 0) {
    // Extract numeric part from restaurant_id (e.g., GMM0001 -> 1)
    const match = data[0].restaurant_id.match(/GMM(\d+)/);
    if (match) {
      maxId = parseInt(match[1], 10);
    }
  }

  return NextResponse.json({ maxId });
}
