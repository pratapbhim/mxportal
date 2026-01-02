
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabase } from '@/lib/supabase';

const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

console.log('R2 ENV:', {
  region: process.env.R2_REGION,
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY ? '***' : undefined,
  bucket: process.env.R2_BUCKET_NAME
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parent = formData.get('parent') as string;
    const filename = formData.get('filename') as string;
    const menu_item_id = formData.get('menu_item_id') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine the full path
    const filePath = filename || file.name;
    const fullPath = parent ? `${parent}/${filePath}` : filePath;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fullPath,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Use R2_PUBLIC_BASE_URL for public image URL (remove bucket if custom domain is mapped directly to the bucket)
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${fullPath}`;

    // If menu_item_id is provided, update menu_items table with the image URL
    if (menu_item_id) {
      const { error: dbError } = await supabase
        .from('menu_items')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('item_id', menu_item_id);

      if (dbError) {
        console.error('Supabase DB update error:', dbError);
        return NextResponse.json({ error: 'Image uploaded but failed to update DB', details: dbError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      url: publicUrl,
      path: fullPath 
    });

  } catch (error) {
    console.error('Upload error:', error);
    // Return error details for debugging
    return NextResponse.json({ error: 'Upload failed', details: error?.message || error }, { status: 500 });
  }
}


