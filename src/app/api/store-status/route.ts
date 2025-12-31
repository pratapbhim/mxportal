// src/app/api/store-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';
import { merchant_store } from '@/lib/schema';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store_id = searchParams.get('store_id');
  if (!store_id) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }
  const result = await db.select({
    approval_status: merchant_store.approval_status,
    approval_reason: merchant_store.approval_reason,
    is_active: merchant_store.is_active,
    store_name: merchant_store.store_name,
  })
    .from(merchant_store)
    .where(eq(merchant_store.store_id, store_id));
  const store = result[0];
  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }
  return NextResponse.json(store);
}
