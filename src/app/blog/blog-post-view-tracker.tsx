'use client';

import { useEffect, useRef } from 'react';

/** Records one server-side view per mount (best-effort; avoids relying on client Firestore). */
export function BlogPostViewTracker({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (!slug || sent.current) return;
    sent.current = true;

    fetch(`/api/blog/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {
      /* non-blocking analytics */
    });
  }, [slug]);

  return null;
}
