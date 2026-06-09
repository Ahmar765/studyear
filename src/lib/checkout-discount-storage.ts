import type { AppliedDiscount } from '@/components/checkout/checkout-discount-code';

export const CHECKOUT_DISCOUNT_STORAGE_KEY = 'studyear_checkout_discount';
export const LAST_CHECKOUT_DISCOUNT_KEY = 'studyear_last_checkout_discount';

export function readStoredCheckoutDiscount(): AppliedDiscount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DISCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedDiscount;
    if (parsed?.code && parsed?.label) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredCheckoutDiscount(discount: AppliedDiscount | null) {
  if (typeof window === 'undefined') return;
  if (!discount) {
    sessionStorage.removeItem(CHECKOUT_DISCOUNT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(CHECKOUT_DISCOUNT_STORAGE_KEY, JSON.stringify(discount));
}

/** Remember which code was used when redirecting to Stripe (for post-payment confirmation). */
export function rememberDiscountForCheckoutCompletion(discount: AppliedDiscount | null) {
  if (typeof window === 'undefined' || !discount) return;
  sessionStorage.setItem(LAST_CHECKOUT_DISCOUNT_KEY, JSON.stringify(discount));
}

export function readLastCheckoutDiscount(): AppliedDiscount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LAST_CHECKOUT_DISCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedDiscount;
    if (parsed?.code && parsed?.label) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearCheckoutDiscountSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHECKOUT_DISCOUNT_STORAGE_KEY);
  sessionStorage.removeItem(LAST_CHECKOUT_DISCOUNT_KEY);
}
