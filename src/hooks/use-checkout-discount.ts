'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AppliedDiscount } from '@/components/checkout/checkout-discount-code';
import { validateDiscountCodeAction } from '@/server/actions/discount-actions';

const STORAGE_KEY = 'studyear_checkout_discount';

function readStoredDiscount(): AppliedDiscount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedDiscount;
    if (parsed?.code && parsed?.label) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredDiscount(discount: AppliedDiscount | null) {
  if (typeof window === 'undefined') return;
  if (!discount) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(discount));
}

export function useCheckoutDiscount() {
  const searchParams = useSearchParams();
  const [appliedDiscount, setAppliedDiscountState] = useState<AppliedDiscount | null>(null);
  const [autoApplyDone, setAutoApplyDone] = useState(false);

  const setAppliedDiscount = useCallback((discount: AppliedDiscount | null) => {
    setAppliedDiscountState(discount);
    writeStoredDiscount(discount);
  }, []);

  useEffect(() => {
    const stored = readStoredDiscount();
    if (stored) setAppliedDiscountState(stored);
  }, []);

  useEffect(() => {
    if (autoApplyDone) return;

    const urlCode = searchParams.get('code')?.trim();
    if (!urlCode) {
      setAutoApplyDone(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await validateDiscountCodeAction(urlCode);
      if (cancelled) return;
      if (result.valid && result.code && result.label) {
        setAppliedDiscount({ code: result.code, label: result.label });
      }
      setAutoApplyDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, autoApplyDone, setAppliedDiscount]);

  return { appliedDiscount, setAppliedDiscount, autoApplyDone };
}
