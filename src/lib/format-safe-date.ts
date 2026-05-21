import { formatDistanceToNow } from 'date-fns';

/** Avoid client crashes when Firestore timestamps are missing or invalid. */
export function safeFormatDistanceToNow(iso: string | undefined | null, fallback = 'recently'): string {
  if (!iso?.trim()) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return fallback;
  }
}

export function isDisplayableImageUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
