'use client';

import { ArrowDown, Tag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CheckoutDiscountCode,
  type AppliedDiscount,
} from '@/components/checkout/checkout-discount-code';

type CheckoutDiscountSectionProps = {
  applied: AppliedDiscount | null;
  onAppliedChange: (discount: AppliedDiscount | null) => void;
  onScrollToPlans?: () => void;
};

export function CheckoutDiscountSection({
  applied,
  onAppliedChange,
  onScrollToPlans,
}: CheckoutDiscountSectionProps) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      {applied ? (
        <Alert className="border-emerald-500/40 bg-emerald-500/10">
          <Tag className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-300">
            Step 1 complete — <span className="font-mono">{applied.code}</span> ({applied.label})
          </AlertTitle>
          <AlertDescription className="text-emerald-900/80 dark:text-emerald-200/90 space-y-2">
            <p>
              Your code is saved for this checkout. <strong>Step 2:</strong> choose any plan below,
              then click Purchase or Subscribe. <strong>Step 3:</strong> Stripe&apos;s payment page
              will show the reduced price before you pay.
            </p>
            {onScrollToPlans ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-emerald-600/30 bg-background/80"
                onClick={onScrollToPlans}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Jump to plans
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Tag className="h-4 w-4" />
          <AlertTitle>Have a discount or promo code?</AlertTitle>
          <AlertDescription>
            Apply it in the box below <strong>before</strong> you pick a plan. The discount is passed
            to Stripe automatically when you click Purchase or Subscribe.
          </AlertDescription>
        </Alert>
      )}

      <CheckoutDiscountCode
        applied={applied}
        onAppliedChange={onAppliedChange}
        onApplied={onScrollToPlans}
      />
    </div>
  );
}
