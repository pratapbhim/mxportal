
import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';


export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File;
    const parent = (form.get('parent') as string) || 'unknown';
    if (!file || !file.name) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    // Prepare key for R2
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, '_');
    const key = `${parent}/${timestamp}_${safeName}`;

    // Use the S3-compatible upload
    let url: string | null = null;
    try {
      url = await uploadToR2(file, key);
    } catch (err: any) {
      console.error('R2 upload error', err);
      return NextResponse.json({ error: 'upload_failed', details: err?.message || String(err) }, { status: 502 });
    }

    // Construct public URL if needed (from env or key)
    const publicBase = process.env.R2_PUBLIC_BASE_URL || '';
    const publicUrl = publicBase ? `${publicBase}/${encodeURIComponent(key)}` : url;
    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('R2 upload error', err);
    return NextResponse.json({ error: 'unexpected_error', details: err?.message || String(err) }, { status: 500 });
  }
}


