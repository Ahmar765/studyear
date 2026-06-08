'use client';

import { useEffect, useState, useTransition } from 'react';
import { Tag, Loader, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { validateDiscountCodeAction } from '@/server/actions/discount-actions';

export type AppliedDiscount = {
  code: string;
  label: string;
};

type CheckoutDiscountCodeProps = {
  applied: AppliedDiscount | null;
  onAppliedChange: (discount: AppliedDiscount | null) => void;
};

export function CheckoutDiscountCode({ applied, onAppliedChange }: CheckoutDiscountCodeProps) {
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

      onAppliedChange({ code: result.code, label: result.label });
      setInput(result.code);
      toast({
        title: 'Code applied',
        description: `${result.code} — ${result.label} will be applied at Stripe checkout.`,
      });
    });
  };

  const clearCode = () => {
    onAppliedChange(null);
    setInput('');
  };

  return (
    <Card className="max-w-xl mx-auto border-dashed">
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
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-3">
          <li>Type your code below and click <strong className="text-foreground">Apply code</strong></li>
          <li>Choose an ACU pack or subscription plan</li>
          <li>
            On Stripe&apos;s payment page you&apos;ll see the discount as a line-item reduction before you pay
          </li>
        </ol>
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
