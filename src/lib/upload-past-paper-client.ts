/** Upload a past-paper PDF (authenticated). Returns Cloudinary raw URL. */
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
  if (!res.ok) {
    return { error: typeof data.error === 'string' ? data.error : 'Upload failed' };
  }
  if (!data.url || typeof data.url !== 'string') {
    return { error: 'Invalid upload response' };
  }
  return { url: data.url };
}
