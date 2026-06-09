import { NextRequest, NextResponse } from 'next/server';
import {
  contentDispositionAttachment,
  getPastPaperProxyFetchUrl,
  getPastPaperPdfUrl,
  sanitizePastPaperFilename,
} from '@/lib/past-paper-url';

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

function isAllowedPastPaperHost(hostname: string, url: string): boolean {
  const host = hostname.toLowerCase();
  if (isBlockedSsrfHost(host)) return false;

  if (
    host.includes('firebasestorage.googleapis.com') ||
    host.includes('cloudinary.com') ||
    host.includes('storage.googleapis.com')
  ) {
    return true;
  }

  const pathAndQuery = (() => {
    try {
      const p = new URL(url);
      return `${p.pathname}${p.search}`;
    } catch {
      return url;
    }
  })();

  return /\.pdf(\?|#|$)/i.test(pathAndQuery);
}

function looksLikePdf(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false;
  const h = new Uint8Array(bytes.slice(0, 4));
  return h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')?.trim();
  const title = req.nextUrl.searchParams.get('title')?.trim() || 'past-paper';

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const normalized = getPastPaperPdfUrl(rawUrl);
  const fetchUrl = getPastPaperProxyFetchUrl(normalized);

  let parsed: URL;
  try {
    parsed = new URL(fetchUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
  }

  if (!isAllowedPastPaperHost(parsed.hostname, fetchUrl)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(fetchUrl, {
      headers: { Accept: 'application/pdf,*/*' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }

    const bytes = await upstream.arrayBuffer();
    if (!looksLikePdf(bytes)) {
      const contentType = upstream.headers.get('content-type') ?? '';
      if (!contentType.includes('pdf')) {
        console.warn(
          '[past-paper/download] Response may not be a PDF:',
          fetchUrl,
          contentType,
        );
      }
    }

    const filename = sanitizePastPaperFilename(title);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDispositionAttachment(filename),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[past-paper/download]', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
