'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, CreditCard, Loader } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getStripeConnectionStatusAction } from '@/server/actions/billing-actions';

export function AdminStripeTestPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof getStripeConnectionStatusAction>
  > | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await getStripeConnectionStatusAction(token);
      setStatus(res);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="border-primary/25 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="h-5 w-5 text-primary" />
          Stripe connection
        </CardTitle>
        <CardDescription>
          Live server env check — confirms checkout keys and webhook secret are set on this deployment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            Checking Stripe…
          </div>
        ) : status?.success ? (
          <>
            {status.connectionOk ? (
              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Stripe API connected</AlertTitle>
                <AlertDescription>
                  Live mode: {status.livemode ? 'yes' : 'no (test)'}. Checkout should work if price IDs
                  match this account.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stripe API failed</AlertTitle>
                <AlertDescription>{status.connectionError ?? 'Unknown error'}</AlertDescription>
              </Alert>
            )}
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                Publishable key:{' '}
                {status.env?.publishableConfigured ? 'set' : 'missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'}
              </li>
              <li>
                Secret key:{' '}
                {status.env?.configured
                  ? `${status.env.secretKeyPrefix ?? status.env.keyType}… (${status.env.keyType})`
                  : 'missing STRIPE_SECRET_KEY'}
              </li>
              {status.env?.secretKeyPrefix === 'sk_live' && !status.connectionOk && (
                <li className="text-destructive font-medium">
                  Production is still using an old sk_live key — update STRIPE_SECRET_KEY in Firebase
                  App Hosting to your new rk_live or sk_live key, then redeploy.
                </li>
              )}
              <li>
                Webhook secret:{' '}
                {status.env?.webhookConfigured ? 'set' : 'missing STRIPE_WEBHOOK_SECRET'}
              </li>
            </ul>
            {status.env?.hint && (
              <p className="text-sm text-amber-700 dark:text-amber-400">{status.env.hint}</p>
            )}
          </>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not check Stripe</AlertTitle>
            <AlertDescription>{status?.error ?? 'Unauthorized'}</AlertDescription>
          </Alert>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Re-check connection
        </Button>
      </CardContent>
    </Card>
  );
}
