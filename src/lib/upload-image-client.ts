import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { uploadImageFileClient } from '@/lib/cloudinary-client';

export type ProfileImageKind = 'profile' | 'cover';

/** Upload profile/cover image — server API first, then direct Cloudinary if needed. */
export async function uploadProfileImage(
  file: File,
  kind: ProfileImageKind,
): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Please choose an image (JPEG, PNG, WebP, or GIF).' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Images must be 5 MB or smaller.' };
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return { error: 'Please sign in to upload images.' };
  }

  const token = await user.getIdToken();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind === 'cover' ? 'cover' : 'profile');

  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && data.url) {
    return { url: data.url };
  }

  if (res.status === 503 || res.status === 500) {
    try {
      const folder = `studyear/users/${user.uid}`;
      const publicId = kind === 'cover' ? 'cover' : 'avatar';
      const url = await uploadImageFileClient(file, { folder, publicId });
      return { url };
    } catch (clientErr: unknown) {
      const msg = clientErr instanceof Error ? clientErr.message : 'Upload failed';
      return { error: data.error ?? msg };
    }
  }

  return { error: typeof data.error === 'string' ? data.error : 'Upload failed' };
}
