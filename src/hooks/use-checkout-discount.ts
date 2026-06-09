'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AppliedDiscount } from '@/components/checkout/checkout-discount-code';
import { validateDiscountCodeAction } from '@/server/actions/discount-actions';
import {
  readStoredCheckoutDiscount,
  writeStoredCheckoutDiscount,
} from '@/lib/checkout-discount-storage';

export function useCheckoutDiscount() {
  const searchParams = useSearchParams();
  const [appliedDiscount, setAppliedDiscountState] = useState<AppliedDiscount | null>(null);
  const [autoApplyDone, setAutoApplyDone] = useState(false);

  const setAppliedDiscount = useCallback((discount: AppliedDiscount | null) => {
    setAppliedDiscountState(discount);
    writeStoredCheckoutDiscount(discount);
  }, []);

  useEffect(() => {
    const stored = readStoredCheckoutDiscount();
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
