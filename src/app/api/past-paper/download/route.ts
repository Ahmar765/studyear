import { NextRequest, NextResponse } from 'next/server';
import { sanitizePastPaperFilename } from '@/lib/past-paper-url';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim();
  const title = req.nextUrl.searchParams.get('title')?.trim() || 'past-paper';

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  const host = parsed.hostname.toLowerCase();
  const allowed =
    host.includes('firebasestorage.googleapis.com') ||
    host.includes('cloudinary.com') ||
    host.includes('storage.googleapis.com');

  if (!allowed) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }
    const bytes = await upstream.arrayBuffer();
    const filename = sanitizePastPaperFilename(title);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[past-paper/download]', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
