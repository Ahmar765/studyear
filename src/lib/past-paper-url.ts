/** Ensure PDF links use a .pdf suffix where hosts omit it (Cloudinary raw, etc.). */
export function getPastPaperPdfUrl(url: string | undefined | null): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';

  if (/\.pdf(\?|#|$)/i.test(trimmed)) return trimmed;

  if (/cloudinary\.com\/.*\/raw\/upload/i.test(trimmed)) {
    const hashIdx = trimmed.indexOf('#');
    const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
    const queryIdx = withoutHash.indexOf('?');
    const query = queryIdx >= 0 ? withoutHash.slice(queryIdx) : '';
    const base = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash;
    return `${base}.pdf${query}${hash}`;
  }

  return trimmed;
}

export function pastPaperProxyDownloadHref(
  url: string,
  title: string,
  origin = 'https://studyear.com',
): string {
  const proxy = new URL('/api/past-paper/download', origin);
  proxy.searchParams.set('url', url);
  proxy.searchParams.set('title', title);
  return proxy.toString();
}

export function sanitizePastPaperFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const name = base || 'past-paper';
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

function shouldUseProxyDownload(url: string): boolean {
  return /firebasestorage\.googleapis\.com/i.test(url);
}

/** Download a past-paper PDF with a proper filename and application/pdf blob type. */
export async function downloadPastPaperPdf(
  url: string,
  title: string,
): Promise<void> {
  const normalized = getPastPaperPdfUrl(url);
  if (!normalized) throw new Error('Missing file URL');

  const filename = sanitizePastPaperFilename(title);

  if (typeof window !== 'undefined' && shouldUseProxyDownload(url)) {
    const proxyHref = pastPaperProxyDownloadHref(url, title, window.location.origin);
    const anchor = document.createElement('a');
    anchor.href = proxyHref;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  try {
    const res = await fetch(normalized);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(normalized, '_blank', 'noopener,noreferrer');
  }
}
