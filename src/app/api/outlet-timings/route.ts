import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// You may want to move these to env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST: Save or update outlet timings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, same_for_all, force_24_hours, closed_day, ...timings } = body;
  if (!store_id) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
  }

  // Upsert (insert or update)
  const { error } = await supabase
    .from('outlet_operating_hours')
    .upsert([
      {
        store_id,
        ...timings,
        same_for_all: same_for_all ?? false,
        force_24_hours: force_24_hours ?? false,
        closed_day: closed_day ?? null,
      },
    ], { onConflict: 'store_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// GET: Fetch outlet timings for a store
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store_id = searchParams.get('store_id');
  if (!store_id) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('outlet_operating_hours')
    .select('*')
    .eq('store_id', store_id)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
