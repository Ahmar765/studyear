import { v2 as cloudinary } from 'cloudinary';

/** Supports signed server uploads or unsigned upload-preset (NEXT_PUBLIC_* in .env). */
export function getCloudinaryEnv() {
  const cloud_name =
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const upload_preset =
    process.env.CLOUDINARY_UPLOAD_PRESET?.trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  return { cloud_name, api_key, api_secret, upload_preset };
}

export function usesSignedCloudinaryUpload(): boolean {
  const { api_key, api_secret } = getCloudinaryEnv();
  return Boolean(api_key && api_secret);
}

export function getCloudinaryUploadPreset(): string | undefined {
  return getCloudinaryEnv().upload_preset;
}

export function isCloudinaryConfigured(): boolean {
  const { cloud_name, api_key, api_secret, upload_preset } = getCloudinaryEnv();
  if (!cloud_name) return false;
  if (api_key && api_secret) return true;
  return Boolean(upload_preset);
}

export function configureCloudinary(): boolean {
  const { cloud_name, api_key, api_secret } = getCloudinaryEnv();
  if (!cloud_name) return false;
  if (api_key && api_secret) {
    cloudinary.config({ cloud_name, api_key, api_secret });
    return true;
  }
  cloudinary.config({ cloud_name });
  return true;
}

export type CloudinaryResourceType = 'image' | 'raw' | 'auto';

export interface UploadBufferOptions {
  folder: string;
  public_id: string;
  resource_type: CloudinaryResourceType;
  overwrite?: boolean;
}

/** Shared upload used by profile images, covers, past papers, etc. */
export async function uploadBufferToCloudinary(
  buf: Buffer,
  options: UploadBufferOptions,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (or CLOUDINARY_* server keys) in .env.',
    );
  }
  if (!configureCloudinary()) {
    throw new Error('Cloudinary configuration failed');
  }

  const uploadPreset = getCloudinaryUploadPreset();
  const signed = usesSignedCloudinaryUpload();
  if (!signed && !uploadPreset) {
    throw new Error('Cloudinary upload preset is missing (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).');
  }

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        overwrite: options.overwrite ?? false,
        resource_type: options.resource_type,
        invalidate: true,
        ...(!signed && uploadPreset ? { upload_preset: uploadPreset } : {}),
      },
      (err, res) => {
        if (err || !res?.secure_url) {
          reject(err ?? new Error('Upload failed'));
        } else {
          resolve({ secure_url: res.secure_url });
        }
      },
    );
    stream.end(buf);
  });

  return result.secure_url;
}

export { cloudinary };
