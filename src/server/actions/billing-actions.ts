
'use server';

import Stripe from 'stripe';
import { verifyIdTokenString } from '@/server/lib/auth';
import {
  manageSubscriptionStatusChange,
  recordAcuTopUpFromCheckoutSession,
} from '@/server/lib/billing';
import type { SubscriptionType } from '@/server/schemas';

const SUBSCRIPTION_PRODUCT_CODES = new Set<string>([
  'STUDENT_PREMIUM',
  'STUDENT_PREMIUM_PLUS',
  'PARENT_PRO',
  'PARENT_PRO_PLUS',
]);

function resolveAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }
  return 'http://localhost:3000';
}

/**
 * Maps checkout `productCode` → Stripe Price IDs from `.env`.
 * Student recurring prices should match marketing (£10 Premium, £15 Premium Plus — adjust seed script / Dashboard).
 * Aligns with: STRIPE_PRICE_STUDENT_PREMIUM, STRIPE_PRICE_STUDENT_PREMIUM_PLUS,
 * STRIPE_PRICE_PARENT_PRO, STRIPE_PRICE_PARENT_PRO_PLUS,
 * and legacy packs STRIPE_PRICE_TOPUP_STARTER / TOPUP_GROWTH / TOPUP_SCALE (ENTRY / GROWTH / SCALE).
 */
function stripePriceIdForProduct(productCode: string): string | undefined {
  const map: Record<string, string | undefined> = {
    STUDENT_PREMIUM: process.env.STRIPE_PRICE_STUDENT_PREMIUM,
    STUDENT_PREMIUM_PLUS: process.env.STRIPE_PRICE_STUDENT_PREMIUM_PLUS,
    PARENT_PRO: process.env.STRIPE_PRICE_PARENT_PRO,
    PARENT_PRO_PLUS: process.env.STRIPE_PRICE_PARENT_PRO_PLUS,
    ENTRY: process.env.STRIPE_PRICE_TOPUP_STARTER,
    GROWTH: process.env.STRIPE_PRICE_TOPUP_GROWTH,
    SCALE: process.env.STRIPE_PRICE_TOPUP_SCALE,
  };
  return map[productCode];
}

export async function createCheckoutSession(
  productCode: string,
  userId: string | undefined,
  customerEmail?: string | null,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'You must be logged in to make a purchase.' };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
  }

  const priceId = stripePriceIdForProduct(productCode);
  if (!priceId) {
    return {
      success: false,
      error: `No Stripe price for "${productCode}". Run npm run stripe:seed-acu-packs:missing or stripe:seed-subscription-prices:missing and paste price_* IDs into .env (see billing-actions env mapping).`,
    };
  }

  const baseUrl = resolveAppBaseUrl();

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });

    const isAcuTopUp = ['ENTRY', 'GROWTH', 'SCALE'].includes(productCode);

    if (isAcuTopUp) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/account?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
        customer_email: customerEmail?.trim() || undefined,
        client_reference_id: userId,
        metadata: { userId, productCode },
      });
      if (!session.id) {
        return { success: false, error: 'Stripe did not return a session id.' };
      }
      return { success: true, sessionId: session.id };
    }

    const priceObj = await stripe.prices.retrieve(priceId);
    if (priceObj.type !== 'recurring') {
      return {
        success: false,
        error:
          `This plan uses a one-time Stripe price (${priceId}). Subscriptions need recurring monthly prices. Run: npm run stripe:seed-subscription-prices:missing and paste the new STRIPE_PRICE_${productCode}=price_… line into .env. Price metadata should include productCode=${productCode}.`,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: customerEmail?.trim() || undefined,
      client_reference_id: userId,
      metadata: { userId, productCode },
      subscription_data: {
        metadata: { userId, productCode },
      },
    });

    if (!session.id) {
      return { success: false, error: 'Stripe did not return a session id.' };
    }
    return { success: true, sessionId: session.id };
  } catch (error: unknown) {
    console.error('Error creating Stripe checkout session:', error);
    const message =
      error instanceof Error ? error.message : 'Could not create checkout session.';
    return { success: false, error: message };
  }
}

/**
 * Activates subscription in Firestore when Stripe redirects back with `session_id`.
 * Idempotent with webhook — safe when both run.
 */
export async function finalizeSubscriptionCheckoutSessionAction(
  idToken: string | null | undefined,
  sessionId: string | null | undefined,
): Promise<
  | { ok: true; skipped?: boolean; activated?: boolean }
  | { ok: false; error: string }
> {
  const user = await verifyIdTokenString(idToken);
  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!sessionId?.trim()) {
    return { ok: false, error: 'Missing checkout session.' };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { ok: false, error: 'Stripe is not configured.' };
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: ['subscription'],
    });

    if (session.metadata?.userId !== user.uid) {
      return { ok: false, error: 'This checkout does not belong to your account.' };
    }

    if (session.mode !== 'subscription') {
      return { ok: true, skipped: true };
    }

    const paid =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required';
    if (!paid || session.status !== 'complete') {
      return {
        ok: false,
        error:
          'Subscription checkout is not complete yet. Wait a moment and refresh, or check your Stripe confirmation email.',
      };
    }

    const rawCode = session.metadata?.productCode?.trim();
    const productCode = rawCode?.toUpperCase();
    if (!productCode || !SUBSCRIPTION_PRODUCT_CODES.has(productCode)) {
      return {
        ok: false,
        error: `Missing or invalid subscription plan code (${rawCode ?? 'none'}).`,
      };
    }

    const customerRaw = session.customer;
    const customerId =
      typeof customerRaw === 'string'
        ? customerRaw
        : customerRaw && typeof customerRaw === 'object' && 'id' in customerRaw
          ? String((customerRaw as { id: string }).id)
          : '';
    if (!customerId) {
      return { ok: false, error: 'Stripe did not return a customer for this session.' };
    }

    const subRef = session.subscription;
    let stripeSubscriptionId = '';
    if (typeof subRef === 'string') {
      stripeSubscriptionId = subRef;
    } else if (subRef && typeof subRef === 'object') {
      const del = (subRef as { deleted?: boolean }).deleted;
      const id = (subRef as { id?: string }).id;
      if (!del && typeof id === 'string') stripeSubscriptionId = id;
    }
    if (!stripeSubscriptionId) {
      return {
        ok: false,
        error:
          'Stripe did not return a subscription id yet. Refresh in a few seconds or rely on the webhook.',
      };
    }

    await manageSubscriptionStatusChange(
      stripeSubscriptionId,
      customerId,
      user.uid,
      productCode as SubscriptionType,
      'ACTIVE',
    );

    return { ok: true, activated: true };
  } catch (error: unknown) {
    console.error('finalizeSubscriptionCheckoutSessionAction:', error);
    const message =
      error instanceof Error ? error.message : 'Could not finalize subscription.';
    return { ok: false, error: message };
  }
}

/** Reconcile ACU top-up from Checkout when webhooks are unavailable (e.g. local dev). */
export async function finalizeAcuCheckoutSessionAction(
  idToken: string | null | undefined,
  sessionId: string | null | undefined,
): Promise<
  | { ok: true; duplicate?: boolean; skipped?: boolean }
  | { ok: false; error: string }
> {
  const user = await verifyIdTokenString(idToken);
  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }
  if (!sessionId?.trim()) {
    return { ok: false, error: 'Missing checkout session.' };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { ok: false, error: 'Stripe is not configured.' };
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim());

    if (session.metadata?.userId !== user.uid) {
      return { ok: false, error: 'This checkout does not belong to your account.' };
    }

    const productCode = session.metadata?.productCode;
    const isAcuPack =
      !!productCode && ['ENTRY', 'GROWTH', 'SCALE'].includes(productCode);

    if (!isAcuPack || session.mode !== 'payment') {
      return { ok: true, skipped: true };
    }

    if (session.payment_status !== 'paid') {
      return { ok: false, error: 'Payment is not complete yet.' };
    }

    const outcome = await recordAcuTopUpFromCheckoutSession(session);
    if (!outcome.ok) {
      return { ok: false, error: outcome.reason };
    }
    return { ok: true, duplicate: outcome.duplicate };
  } catch (error: unknown) {
    console.error('finalizeAcuCheckoutSessionAction:', error);
    const message =
      error instanceof Error ? error.message : 'Could not finalize checkout.';
    return { ok: false, error: message };
  }
}
