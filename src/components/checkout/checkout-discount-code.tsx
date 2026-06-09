'use client';

import { useEffect, useState, useTransition } from 'react';
import { Tag, Loader, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { validateDiscountCodeAction } from '@/server/actions/discount-actions';
import { cn } from '@/lib/utils';

export type AppliedDiscount = {
  code: string;
  label: string;
};

type CheckoutDiscountCodeProps = {
  applied: AppliedDiscount | null;
  onAppliedChange: (discount: AppliedDiscount | null) => void;
  /** Called after a code is successfully applied (e.g. scroll to plans). */
  onApplied?: () => void;
};

export function CheckoutDiscountCode({
  applied,
  onAppliedChange,
  onApplied,
}: CheckoutDiscountCodeProps) {
  const [input, setInput] = useState(applied?.code ?? '');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (applied?.code) setInput(applied.code);
    else if (!applied) setInput('');
  }, [applied?.code, applied]);

  const applyCode = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'Enter a code', description: 'Type your discount code first.' });
      return;
    }

    startTransition(async () => {
      const result = await validateDiscountCodeAction(trimmed);
      if (!result.valid || !result.code || !result.label) {
        toast({
          variant: 'destructive',
          title: 'Invalid code',
          description: result.error || 'That discount code could not be applied.',
        });
        return;
      }

      const next = { code: result.code, label: result.label };
      onAppliedChange(next);
      setInput(result.code);
      toast({
        title: 'Code applied — now pick a plan',
        description: `${result.code} (${result.label}) will appear as a discount on Stripe when you pay.`,
      });
      onApplied?.();
    });
  };

  const clearCode = () => {
    onAppliedChange(null);
    setInput('');
  };

  return (
    <Card
      id="discount-code-box"
      className={cn(
        'border-dashed scroll-mt-24',
        applied ? 'border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20' : 'border-primary/30',
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Discount code
        </CardTitle>
        <CardDescription>
          Enter your code here first — it is passed to Stripe when you click Purchase or Subscribe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm rounded-md border bg-muted/30 px-3 py-3">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <p className="text-muted-foreground pt-0.5">
              Enter your code here and click <strong className="text-foreground">Apply code</strong>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/80 text-primary-foreground text-xs font-bold">
              2
            </span>
            <p className="text-muted-foreground pt-0.5">
              Scroll down and click <strong className="text-foreground">Purchase</strong> or{' '}
              <strong className="text-foreground">Subscribe</strong> on any plan
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/60 text-primary-foreground text-xs font-bold">
              3
            </span>
            <p className="text-muted-foreground pt-0.5">
              On Stripe&apos;s secure page, your discount appears as a line-item reduction before you pay
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyCode();
              }
            }}
            placeholder="e.g. SUMMER25"
            className="font-mono uppercase tracking-wide"
            disabled={!!applied || isPending}
            aria-label="Discount code"
          />
          {applied ? (
            <Button type="button" variant="outline" onClick={clearCode} className="shrink-0">
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : (
            <Button type="button" onClick={applyCode} disabled={isPending || !input.trim()} className="shrink-0">
              {isPending ? <Loader className="h-4 w-4 animate-spin" /> : 'Apply code'}
            </Button>
          )}
        </div>

        {applied ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-mono font-medium">{applied.code}</span>
            <Badge variant="secondary">{applied.label}</Badge>
            <span className="text-muted-foreground">Applied to your next checkout</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
