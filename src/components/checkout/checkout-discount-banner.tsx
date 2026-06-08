'use client';

import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AppliedDiscount } from './checkout-discount-code';

type CheckoutDiscountBannerProps = {
  applied: AppliedDiscount;
  onClear: () => void;
};

export function CheckoutDiscountBanner({ applied, onClear }: CheckoutDiscountBannerProps) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Discount ready:</span>
          <span className="font-mono font-semibold">{applied.code}</span>
          <Badge variant="secondary">{applied.label}</Badge>
          <span className="text-muted-foreground hidden sm:inline">
            — pick a plan below, then confirm the reduced price on Stripe
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="shrink-0">
          <X className="mr-1 h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}
