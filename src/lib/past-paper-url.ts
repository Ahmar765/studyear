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

/** Cloudinary: force attachment delivery with correct filename behaviour. */
export function getPastPaperProxyFetchUrl(url: string): string {
  const normalized = getPastPaperPdfUrl(url);
  if (!normalized) return '';

  if (/cloudinary\.com/i.test(normalized) && /\/upload\//i.test(normalized)) {
    if (!/\/upload\/fl_attachment\//i.test(normalized)) {
      return normalized.replace(/\/upload\//i, '/upload/fl_attachment/');
    }
  }

  return normalized;
}

export function pastPaperProxyDownloadHref(
  url: string,
  title: string,
  origin = 'https://studyear.com',
): string {
  const proxy = new URL('/api/past-paper/download', origin);
  proxy.searchParams.set('url', getPastPaperPdfUrl(url) || url);
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

export function contentDispositionAttachment(filename: string): string {
  const safeAscii = filename.replace(/[^\w.\- ]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

/** Hosts that must be proxied so downloads are application/pdf with a .pdf filename. */
export function shouldProxyPastPaperDownload(url: string): boolean {
  const normalized = getPastPaperPdfUrl(url);
  if (!normalized) return false;

  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return (
      host.includes('firebasestorage.googleapis.com') ||
      host.includes('cloudinary.com') ||
      host.includes('storage.googleapis.com')
    );
  } catch {
    return false;
  }
}

function isBlockedSsrfHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '127.0.0.1' || h.startsWith('127.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.startsWith('169.254.')) return true;
  if (h === 'metadata.google.internal') return true;
  if (h.includes('metadata.google')) return true;
  return false;
}

/** External https PDF links (user-contributed) — proxied with SSRF guards. */
export function shouldProxyExternalPastPaperDownload(url: string): boolean {
  if (shouldProxyPastPaperDownload(url)) return false;

  try {
    const parsed = new URL(getPastPaperPdfUrl(url));
    if (parsed.protocol !== 'https:') return false;
    if (isBlockedSsrfHost(parsed.hostname)) return false;
    const pathAndQuery = `${parsed.pathname}${parsed.search}`;
    return /\.pdf(\?|#|$)/i.test(pathAndQuery);
  } catch {
    return false;
  }
}

/** Download a past-paper PDF with a proper filename and application/pdf blob type. */
export async function downloadPastPaperPdf(
  url: string,
  title: string,
): Promise<void> {
  const normalized = getPastPaperPdfUrl(url);
  if (!normalized) throw new Error('Missing file URL');

  const filename = sanitizePastPaperFilename(title);

  if (
    typeof window !== 'undefined' &&
    (shouldProxyPastPaperDownload(normalized) ||
      shouldProxyExternalPastPaperDownload(normalized))
  ) {
    const proxyHref = pastPaperProxyDownloadHref(normalized, title, window.location.origin);
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
