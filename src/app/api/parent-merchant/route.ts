import { NextRequest, NextResponse } from 'next/server';
import { db, client } from '@/lib/drizzle';
import { parentMerchantSchema } from '@/lib/validation/parentMerchantSchema';
import { logAudit } from '@/lib/auditLogger';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = parentMerchantSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 400 });
  }
  const data = parse.data;
  // Check phone uniqueness
  const exists = await client`SELECT id FROM merchant_parent WHERE registered_phone = ${data.registered_phone}`;
  if (exists.length > 0) {
    await logAudit({
      entity_type: 'merchant_parent',
      entity_id: '',
      action: 'create_failed_duplicate_phone',
      old_data: null,
      new_data: data,
      performed_by: '',
      performed_by_email: '',
    });
    return NextResponse.json({ error: 'Merchant already registered' }, { status: 409 });
  }
  // Direct insert (no transaction)
  try {
    const inserted = await client`
      INSERT INTO merchant_parent (parent_store_name, registered_phone, merchant_type, owner_name, owner_email)
      VALUES (${data.parent_store_name}, ${data.registered_phone}, ${data.merchant_type}, ${data.owner_name || null}, ${data.owner_email || null})
      RETURNING id, parent_merchant_id
    `;
    await logAudit({
      entity_type: 'merchant_parent',
      entity_id: inserted[0]?.parent_merchant_id || '',
      action: 'create',
      old_data: null,
      new_data: data,
      performed_by: '',
      performed_by_email: '',
    });
    return NextResponse.json({ success: true, parent_merchant_id: inserted[0]?.parent_merchant_id });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to register merchant' }, { status: 500 });
  }
}
