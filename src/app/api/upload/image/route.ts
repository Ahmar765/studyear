import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin-app';
import { configureCloudinary, cloudinary, isCloudinaryConfigured } from '@/lib/cloudinary-server';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Image uploads are not configured (missing CLOUDINARY_* env vars).' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const kindRaw = formData.get('kind');
  const kind = kindRaw === 'cover' ? 'cover' : 'avatar';

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
  }

  if (!configureCloudinary()) {
    return NextResponse.json({ error: 'Cloudinary configuration failed' }, { status: 503 });
  }

  const folder = `studyear/users/${uid}`;
  const public_id = kind === 'cover' ? 'cover' : 'avatar';

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id,
          overwrite: true,
          resource_type: 'image',
          invalidate: true,
        },
        (err, res) => {
          if (err || !res?.secure_url) {
            reject(err ?? new Error('Upload failed'));
          } else {
            resolve({ secure_url: res.secure_url });
          }
        }
      );
      stream.end(buf);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (e: unknown) {
    console.error('Cloudinary upload error:', e);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
