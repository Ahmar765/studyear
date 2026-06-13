/** Deterministic referral code from a Firebase UID (SY-XXXXXX). */
export function deriveGrowthPartnerCode(userId: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let h = 7;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) | 0;
  }
  let suffix = '';
  let n = Math.abs(h);
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + userId.charCodeAt(i % userId.length);
  }
  return `SY-${suffix}`;
}

export function normalizeGrowthPartnerCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  const match = trimmed.match(/^(?:STUDYEAR[- ]?)?(SY[- ]?[A-Z0-9]{6})$/);
  if (match) {
    const core = match[1].replace(/[- ]/g, '');
    return `SY-${core.slice(2)}`;
  }
  if (/^SY[- ]?[A-Z0-9]{6}$/.test(trimmed)) {
    return trimmed.replace(/[- ]/g, '').replace(/^SY/, 'SY-');
  }
  return null;
}

export function growthPartnerReferralUrl(
  code: string,
  baseUrl?: string,
): string {
  const appUrl =
    baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://studyear.com';
  return `${appUrl.replace(/\/$/, '')}/signup?ref=${encodeURIComponent(code)}`;
}
