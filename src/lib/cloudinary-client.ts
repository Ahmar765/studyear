'use client';

/** Browser-side Cloudinary unsigned upload (uses NEXT_PUBLIC_* from .env). */
export function getClientCloudinaryConfig(): {
  cloudName: string | undefined;
  uploadPreset: string | undefined;
  configured: boolean;
} {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  return {
    cloudName,
    uploadPreset,
    configured: Boolean(cloudName && uploadPreset),
  };
}

async function uploadViaCloudinaryApi(
  file: File,
  resourceType: 'image' | 'raw',
  extra?: Record<string, string>,
): Promise<string> {
  const { cloudName, uploadPreset, configured } = getClientCloudinaryConfig();
  if (!configured || !cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured in the browser (NEXT_PUBLIC_CLOUDINARY_*).');
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: 'POST', body: fd });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Cloudinary upload failed (${res.status})`);
  }
  if (!data.secure_url) {
    throw new Error('Cloudinary returned no URL');
  }
  return data.secure_url;
}

/** Profile photos, cover images, and other pictures. */
export async function uploadImageFileClient(
  file: File,
  options: { folder: string; publicId: string },
): Promise<string> {
  return uploadViaCloudinaryApi(file, 'image', {
    folder: options.folder,
    public_id: options.publicId,
  });
}

/** Past-paper PDFs and other documents. */
export async function uploadPdfFileClient(file: File, options: { folder: string }): Promise<string> {
  const publicId = `paper_${Date.now()}`;
  return uploadViaCloudinaryApi(file, 'raw', {
    folder: options.folder,
    public_id: publicId,
  });
}
