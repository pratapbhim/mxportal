const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY!;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_REGION = process.env.R2_REGION!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});


export async function uploadToR2(file: File, key: string): Promise<string> {
  // Convert File/Blob to Buffer/Uint8Array for Node.js AWS SDK
  let body: Buffer | Uint8Array;
  if (typeof file.arrayBuffer === 'function') {
    // File/Blob from browser FormData
    const ab = await file.arrayBuffer();
    body = Buffer.from(ab);
  } else {
    // Already a Buffer/Uint8Array
    body = file as any;
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: (file as any).type || 'application/octet-stream',
  });
  await s3.send(command);
  return `${key}`;
}
