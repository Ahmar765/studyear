/**
 * Retries an async function with exponential backoff when a rate-limit (429)
 * or RESOURCE_EXHAUSTED error is encountered from the Gemini / Google AI API.
 *
 * @param fn           The async function to execute.
 * @param maxAttempts  Maximum number of total attempts (default: 4).
 * @param baseDelayMs  Initial delay in ms before the first retry (default: 5 000 ms).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 5_000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      const isRateLimit = isRateLimitError(err);
      if (!isRateLimit || attempt === maxAttempts) {
        throw err;
      }

      // Try to honour the "Retry-After" / "retry in X.xxxxs" hint from the message
      const suggestedDelay = extractRetryAfterMs(err);
      const backoffDelay = suggestedDelay ?? baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1_000; // up to 1 s of jitter
      const waitMs = Math.min(backoffDelay + jitter, 60_000); // cap at 60 s

      console.warn(
        `[retry] Rate-limit hit (attempt ${attempt}/${maxAttempts}). ` +
        `Waiting ${Math.round(waitMs / 1_000)}s before retry…`,
      );

      await sleep(waitMs);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    /too many requests/i.test(msg)
  );
}

/** Parses "Please retry in 24.150644s" from the Gemini error message. */
function extractRetryAfterMs(err: unknown): number | null {
  if (!(err instanceof Error)) return null;
  const match = err.message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (!match) return null;
  const seconds = parseFloat(match[1]);
  return isNaN(seconds) ? null : Math.ceil(seconds * 1_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
