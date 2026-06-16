import Stripe from 'stripe';

export type StripeKeyCheck = {
  configured: boolean;
  keyType: 'missing' | 'secret' | 'restricted' | 'invalid';
  publishableConfigured: boolean;
  webhookConfigured: boolean;
  hint?: string;
};

export function inspectStripeEnv(): StripeKeyCheck {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return {
      configured: false,
      keyType: 'missing',
      publishableConfigured: !!publishable,
      webhookConfigured: !!webhook,
      hint: 'Set STRIPE_SECRET_KEY in Firebase App Hosting (must start with sk_live_ or sk_test_).',
    };
  }

  if (secret.startsWith('pk_')) {
    return {
      configured: false,
      keyType: 'invalid',
      publishableConfigured: !!publishable,
      webhookConfigured: !!webhook,
      hint: 'STRIPE_SECRET_KEY looks like a publishable key (pk_). Use the Secret key (sk_) from Stripe → Developers → API keys.',
    };
  }

  if (secret.startsWith('rk_live_') || secret.startsWith('rk_test_')) {
    return {
      configured: true,
      keyType: 'restricted',
      publishableConfigured: !!publishable,
      webhookConfigured: !!webhook,
      hint:
        'Restricted key (rk_) detected. Prefer a standard Secret key (sk_) for checkout. If you keep rk_, grant Checkout Sessions, Customers, Prices, Coupons, Promotion codes, and Webhooks in Stripe.',
    };
  }

  if (secret.startsWith('sk_live_') || secret.startsWith('sk_test_')) {
    return {
      configured: true,
      keyType: 'secret',
      publishableConfigured: !!publishable,
      webhookConfigured: !!webhook,
    };
  }

  return {
    configured: false,
    keyType: 'invalid',
    publishableConfigured: !!publishable,
    webhookConfigured: !!webhook,
    hint: 'STRIPE_SECRET_KEY must start with sk_live_, sk_test_, rk_live_, or rk_test_.',
  };
}

export function getStripeClient(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;
  return new Stripe(secret, { apiVersion: '2024-04-10' });
}

export async function testStripeConnection(): Promise<{
  ok: boolean;
  accountId?: string;
  livemode?: boolean;
  error?: string;
  env: StripeKeyCheck;
}> {
  const env = inspectStripeEnv();
  if (!env.configured) {
    return { ok: false, error: env.hint ?? 'Stripe secret key not configured.', env };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Could not initialize Stripe client.', env };
  }

  try {
    const balance = await stripe.balance.retrieve();
    return {
      ok: true,
      livemode: balance.livemode,
      env,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe connection failed';
    return { ok: false, error: message, env };
  }
}
