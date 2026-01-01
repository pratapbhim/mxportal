
import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getR2SignedUrl } from '@/lib/r2';


export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File;
    const parent = (form.get('parent') as string) || 'unknown';
    if (!file || !file.name) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    // Prepare key for R2 - use menuitems/ prefix for menu item images
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, '_');
    // Organize menu item images under menuitems/ directory
    const key = `menuitems/${parent}/${timestamp}_${safeName}`;

    // Use the S3-compatible upload
    let objectKey: string | null = null;
    try {
      objectKey = await uploadToR2(file, key);
    } catch (err: any) {
      console.error('R2 upload error', err);
      return NextResponse.json({ error: 'upload_failed', details: err?.message || String(err) }, { status: 502 });
    }

    // Construct the public URL for the uploaded image (R2 public bucket URL)
    // Example: https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${objectKey}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('R2 upload error', err);
    return NextResponse.json({ error: 'unexpected_error', details: err?.message || String(err) }, { status: 500 });
  }
}


