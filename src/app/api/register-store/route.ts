import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step1, step2, storeSetup, documents, logoUrl, bannerUrl, galleryUrls, documentUrls, parentInfo } = body;

    // Always use parentInfo.id (numeric) for parent_id
    const parentId = parentInfo?.id;
    const parentMerchantId = parentInfo?.parent_merchant_id || step1.parent_merchant_id;
    if (!parentId || !parentMerchantId) throw new Error('Parent info missing');

    // 1. Generate storeId
    const { count } = await supabaseAdmin
      .from('merchant_stores')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', parentId);
    const nextNumber = (count || 0) + 1;
    // Store ID format: GMMC1001, GMMC1002, ...
    // Always use GMMC + sequence (1001, 1002, ...)
    const storeId = `GMMC${1000 + nextNumber}`;

    // 2. Insert store
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('merchant_stores')
      .insert([{
        store_id: storeId,
        parent_id: parentId,
        store_name: step1.store_name,
        store_display_name: step1.store_display_name,
        store_description: step1.store_description,
        store_email: step1.store_email,
        store_phones: step1.store_phones,
        full_address: step2.full_address,
        landmark: step2.landmark,
        city: step2.city,
        state: step2.state,
        postal_code: step2.postal_code,
        country: step2.country,
        latitude: step2.latitude,
        longitude: step2.longitude,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        gallery_images: galleryUrls,
        cuisine_types: storeSetup.cuisine_types,
        food_categories: storeSetup.food_categories,
        avg_preparation_time_minutes: storeSetup.avg_preparation_time_minutes,
        min_order_amount: storeSetup.min_order_amount,
        delivery_radius_km: storeSetup.delivery_radius_km,
        is_pure_veg: storeSetup.is_pure_veg,
        accepts_online_payment: storeSetup.accepts_online_payment,
        accepts_cash: storeSetup.accepts_cash,
        status: 'PENDING', // Set default status for child store (valid enum value)
      }])
      .select()
      .single();
    if (storeError) throw new Error(storeError.message);

    // 3. Insert operating hours
    const days = [
      'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
    ];
    const hours = storeSetup.store_hours || {};
    const opRows = days.map(day => {
      const d = hours[day.toLowerCase()] || { open: '', close: '' };
      return {
        store_id: storeData.id,
        day_of_week: day,
        is_open: !!(d.open && d.close),
        slot1_start: d.open || null,
        slot1_end: d.close || null,
        slot2_start: null,
        slot2_end: null,
        total_duration_minutes: null,
        is_24_hours: false,
        same_for_all_days: false,
      };
    });
    if (opRows.length > 0) {
      const { error: opError } = await supabaseAdmin
        .from('merchant_store_operating_hours')
        .insert(opRows);
      if (opError) throw new Error(opError.message);
    }

    // 4. Insert documents
    if (documentUrls && documentUrls.length > 0) {
      // Map all possible frontend keys to valid enum values for document_type_merchant
      // Valid enum values: PAN, GST, AADHAR, FSSAI, PHARMACIST_CERTIFICATE, PHARMACY_COUNCIL_REGISTRATION, DRUG_LICENSE, SHOP_ESTABLISHMENT, TRADE_LICENSE, UDYAM, OTHER
      const typeMap: Record<string, string> = {
        PAN_IMAGE: 'PAN',
        PAN: 'PAN',
        GST_IMAGE: 'GST',
        GST: 'GST',
        AADHAR_FRONT: 'AADHAAR',
        AADHAR_BACK: 'AADHAAR',
        AADHAR: 'AADHAAR',
        AADHAAR_FRONT: 'AADHAAR',
        AADHAAR_BACK: 'AADHAAR',
        AADHAAR: 'AADHAAR',
        FSSAI_IMAGE: 'FSSAI',
        FSSAI: 'FSSAI',
        PHARMACIST_CERTIFICATE: 'PHARMACIST_CERTIFICATE',
        PHARMACY_COUNCIL_REGISTRATION: 'PHARMACY_COUNCIL_REGISTRATION',
        DRUG_LICENSE_IMAGE: 'DRUG_LICENSE',
        DRUG_LICENSE: 'DRUG_LICENSE',
        SHOP_ESTABLISHMENT_IMAGE: 'SHOP_ESTABLISHMENT',
        SHOP_ESTABLISHMENT: 'SHOP_ESTABLISHMENT',
        TRADE_LICENSE_IMAGE: 'TRADE_LICENSE',
        TRADE_LICENSE: 'TRADE_LICENSE',
        UDYAM_IMAGE: 'UDYAM',
        UDYAM: 'UDYAM',
        OTHER_IMAGE: 'OTHER',
        OTHER: 'OTHER',
        // Add more mappings as needed
      };
      const docUploads = documentUrls.map((doc: any) => ({
        store_id: storeData.id,
        document_type: typeMap[doc.type] || doc.type,
        document_url: doc.url, // Only signed URL is saved
        document_name: doc.name,
        is_verified: false,
      }));
      const { error: docError } = await supabaseAdmin
        .from('merchant_store_documents')
        .insert(docUploads);
      if (docError) throw new Error(docError.message);
    }

    return NextResponse.json({ success: true, storeId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Registration failed' }, { status: 500 });
  }
}
