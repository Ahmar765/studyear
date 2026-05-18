import { uploadPdfFileClient } from '@/lib/cloudinary-client';

/** Upload a past-paper PDF (authenticated). Server API first, then direct Cloudinary. */
export async function uploadPastPaperPdf(file: File, idToken: string): Promise<{ url?: string; error?: string }> {
  if (file.type !== 'application/pdf') {
    return { error: 'Please choose a PDF file.' };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { error: 'PDF must be 25 MB or smaller.' };
  }

  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/api/upload/past-paper', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: fd,
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && data.url) {
    return { url: data.url };
  }

  if (res.status === 503 || res.status === 500) {
    try {
      const uid = await decodeUidFromToken(idToken);
      const folder = uid ? `studyear/past-papers/${uid}` : 'studyear/past-papers';
      const url = await uploadPdfFileClient(file, { folder });
      return { url };
    } catch (clientErr: unknown) {
      const msg = clientErr instanceof Error ? clientErr.message : 'Upload failed';
      return { error: data.error ?? msg };
    }
  }

  return { error: typeof data.error === 'string' ? data.error : 'Upload failed' };
}

async function decodeUidFromToken(idToken: string): Promise<string | null> {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { user_id?: string; sub?: string };
    return json.user_id ?? json.sub ?? null;
  } catch {
    return null;
  }
}
