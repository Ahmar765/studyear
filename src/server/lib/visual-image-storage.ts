import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from '@/lib/cloudinary-server';

/** Firestore string fields are capped near 1 MiB — never store raw data URLs. */
export const FIRESTORE_SAFE_IMAGE_URL_MAX = 900_000;

export function persistableImageUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return null;
  if (url.length > FIRESTORE_SAFE_IMAGE_URL_MAX) return null;
  return url;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  try {
    return { buffer: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
}

/**
 * Upload AI image data URLs to Cloudinary when possible.
 * Returns a HTTPS URL safe for Firestore and the URL to show in the UI.
 */
export async function storeGeneratedImageUrl(
  imageUrl: string | undefined,
  opts: { userId: string; id: string; folder?: string },
): Promise<{ displayUrl?: string; firestoreUrl: string | null }> {
  if (!imageUrl) return { firestoreUrl: null };

  if (!imageUrl.startsWith('data:')) {
    const firestoreUrl = persistableImageUrl(imageUrl);
    return { displayUrl: imageUrl, firestoreUrl };
  }

  if (!isCloudinaryConfigured()) {
    return {
      displayUrl: imageUrl,
      firestoreUrl: null,
    };
  }

  const parsed = parseDataUrl(imageUrl);
  if (!parsed) {
    return { displayUrl: imageUrl, firestoreUrl: null };
  }

  const folder = opts.folder ?? `studyear/generated-visuals/${opts.userId}`;
  const public_id = opts.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

  try {
    const httpsUrl = await uploadBufferToCloudinary(parsed.buffer, {
      folder,
      public_id,
      resource_type: 'image',
    });
    return { displayUrl: httpsUrl, firestoreUrl: httpsUrl };
  } catch (err) {
    console.error('[storeGeneratedImageUrl] upload failed:', err);
    return { displayUrl: imageUrl, firestoreUrl: null };
  }
}

/** Upload data-URL AI images to Cloudinary so tutor/course/lesson visuals survive reload. */
export async function persistEducationalVisualImages<
  T extends { imageUrl?: string },
>(visuals: T[], userId: string, idPrefix: string): Promise<T[]> {
  const out: T[] = [];
  for (let index = 0; index < visuals.length; index++) {
    const visual = visuals[index];
    if (!visual.imageUrl) {
      out.push(visual);
      continue;
    }
    const stored = await storeGeneratedImageUrl(visual.imageUrl, {
      userId,
      id: `${idPrefix}-visual-${index}`,
      folder: `studyear/ai-visuals/${userId}`,
    });
    out.push({
      ...visual,
      imageUrl: stored.displayUrl ?? stored.firestoreUrl ?? visual.imageUrl,
    });
  }
  return out;
}

/** Strip oversized inline image payloads before writing to Firestore. */
export function stripNonPersistableImageFields<T extends { imageUrl?: string }>(
  value: T,
  firestoreUrl: string | null,
): T {
  if (firestoreUrl) {
    return { ...value, imageUrl: firestoreUrl };
  }
  const { imageUrl: _removed, ...rest } = value;
  return rest as T;
}
