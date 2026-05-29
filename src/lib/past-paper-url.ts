/** Ensure PDF links open/download with the correct .pdf extension and MIME type. */
export function getPastPaperPdfUrl(url: string | undefined | null): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';

  if (/\.pdf(\?|#|$)/i.test(trimmed)) return trimmed;

  // Cloudinary raw uploads often omit the extension — browsers then save as .txt/.bin.
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

export function sanitizePastPaperFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const name = base || 'past-paper';
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

/** Download a past-paper PDF with a proper filename and application/pdf blob type. */
export async function downloadPastPaperPdf(
  url: string,
  title: string,
): Promise<void> {
  const href = getPastPaperPdfUrl(url);
  if (!href) throw new Error('Missing file URL');

  const filename = sanitizePastPaperFilename(title);

  try {
    const res = await fetch(href);
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
    // Fallback: open normalized URL (extension helps the browser infer PDF).
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}
