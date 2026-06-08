
'use server';

import Stripe from 'stripe';
import { verifyIdTokenString } from '@/server/lib/auth';
import {
  manageSubscriptionStatusChange,
  recordAcuTopUpFromCheckoutSession,
} from '@/server/lib/billing';
import {
  normalizeDiscountCodeInput,
  resolveCheckoutDiscountCoupon,
} from '@/server/lib/discount-codes';

function normalizeDiscountCodeForMetadata(raw: string): string {
  return normalizeDiscountCodeInput(raw);
}
import type { SubscriptionType } from '@/server/schemas';
import { ACU_PACKAGES, isAcuTopUpProductCode, resolveAcuPackageCode } from '@/data/acu-packages';
import {
  PARENT_SUBSCRIPTION_PLANS,
  SCHOOL_SUBSCRIPTION_PLANS,
  STUDENT_SUBSCRIPTION_PLANS,
} from '@/data/subscription-plans';

const MARKETING_SUBSCRIPTION_PLANS = [
  ...STUDENT_SUBSCRIPTION_PLANS,
  ...PARENT_SUBSCRIPTION_PLANS,
  ...SCHOOL_SUBSCRIPTION_PLANS,
];

function marketingPlanGbpPence(productCode: string): number | null {
  const plan = MARKETING_SUBSCRIPTION_PLANS.find((p) => p.productCode === productCode);
  if (!plan) return null;
  const pounds = Number.parseFloat(plan.price);
  if (Number.isNaN(pounds)) return null;
  return Math.round(pounds * 100);
}

function marketingPlanName(productCode: string): string {
  return MARKETING_SUBSCRIPTION_PLANS.find((p) => p.productCode === productCode)?.name ?? productCode;
}

const SUBSCRIPTION_PRODUCT_CODES = new Set<string>([
  'STUDENT_ACCESS',
  'STUDENT_PREMIUM',
  'STUDENT_PREMIUM_PLUS',
  'STUDENT_MAX',
  'PARENT_VIEW',
  'PARENT_PRO',
  'PARENT_PRO_PLUS',
  'PARENT_ELITE',
  'SCHOOL_STARTER',
  'SCHOOL_GROWTH',
  'SCHOOL_ENTERPRISE',
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
 * Maps subscription `productCode` → Stripe Price IDs from `.env`.
 * ACU one-time packs use inline `price_data` in GBP from `ACU_PACKAGES`, not Stripe Price IDs.
 */
function stripePriceIdForProduct(productCode: string): string | undefined {
  const map: Record<string, string | undefined> = {
    STUDENT_ACCESS: process.env.STRIPE_PRICE_STUDENT_ACCESS,
    STUDENT_PREMIUM: process.env.STRIPE_PRICE_STUDENT_PREMIUM,
    STUDENT_PREMIUM_PLUS: process.env.STRIPE_PRICE_STUDENT_PREMIUM_PLUS,
    STUDENT_MAX: process.env.STRIPE_PRICE_STUDENT_MAX,
    PARENT_VIEW: process.env.STRIPE_PRICE_PARENT_VIEW,
    PARENT_PRO: process.env.STRIPE_PRICE_PARENT_PRO,
    PARENT_PRO_PLUS: process.env.STRIPE_PRICE_PARENT_PRO_PLUS,
    PARENT_ELITE: process.env.STRIPE_PRICE_PARENT_ELITE,
    SCHOOL_STARTER: process.env.STRIPE_PRICE_SCHOOL_STARTER,
    SCHOOL_GROWTH: process.env.STRIPE_PRICE_SCHOOL_GROWTH,
    SCHOOL_ENTERPRISE: process.env.STRIPE_PRICE_SCHOOL_ENTERPRISE,
  };
  return map[productCode];
}

export async function createCheckoutSession(
  productCode: string,
  userId: string | undefined,
  customerEmail?: string | null,
  discountCode?: string | null,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'You must be logged in to make a purchase.' };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
  }

  const baseUrl = resolveAppBaseUrl();

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });

    let checkoutDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    let appliedDiscountCode: string | undefined;

    if (discountCode?.trim()) {
      const resolved = await resolveCheckoutDiscountCoupon(stripe, discountCode);
      if ('error' in resolved) {
        return { success: false, error: resolved.error };
      }
      checkoutDiscounts = [{ promotion_code: resolved.promotionCodeId }];
      appliedDiscountCode =
        resolved.record?.code ?? normalizeDiscountCodeForMetadata(discountCode);
    }

    const packCode = resolveAcuPackageCode(productCode);

    if (packCode) {
      const pack = ACU_PACKAGES[packCode];
      if (!pack) {
        return { success: false, error: `Unknown ACU pack "${productCode}".` };
      }
      const gbpLabel = (pack.pricePence / 100).toFixed(0);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: pack.pricePence,
              product_data: {
                name: `StudYear ACU — ${pack.label} (£${gbpLabel})`,
                metadata: { productCode: pack.code },
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/account?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
        customer_email: customerEmail?.trim() || undefined,
        client_reference_id: userId,
        metadata: {
          userId,
          productCode: pack.code,
          ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        },
        ...(checkoutDiscounts ? { discounts: checkoutDiscounts } : {}),
      });
      if (!session.id) {
        return { success: false, error: 'Stripe did not return a session id.' };
      }
      return { success: true, sessionId: session.id };
    }

    const priceId = stripePriceIdForProduct(productCode);
    const gbpPence = marketingPlanGbpPence(productCode);
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] | null = null;

    if (priceId) {
      try {
        const priceObj = await stripe.prices.retrieve(priceId);
        if (priceObj.type === 'recurring' && priceObj.currency === 'gbp') {
          lineItems = [{ price: priceId, quantity: 1 }];
        } else if (priceObj.currency !== 'gbp') {
          console.warn(
            `[billing] ${productCode} price ${priceId} is ${priceObj.currency}; using GBP price_data fallback.`,
          );
        } else {
          console.warn(
            `[billing] ${productCode} price ${priceId} is not recurring; using GBP price_data fallback.`,
          );
        }
      } catch (retrieveErr) {
        console.warn(`[billing] Could not load ${priceId}:`, retrieveErr);
      }
    }

    if (!lineItems) {
      if (!gbpPence) {
        return {
          success: false,
          error: `No Stripe price for "${productCode}". Add STRIPE_PRICE_${productCode} to .env (GBP recurring) or run: npm run stripe:seed-subscription-prices:missing`,
        };
      }
      lineItems = [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: gbpPence,
            recurring: { interval: 'month' },
            product_data: {
              name: `StudYear — ${marketingPlanName(productCode)}`,
              metadata: { productCode },
            },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${baseUrl}/account?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: customerEmail?.trim() || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        productCode,
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
      },
      subscription_data: {
        metadata: {
          userId,
          productCode,
          ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        },
      },
      ...(checkoutDiscounts ? { discounts: checkoutDiscounts } : {}),
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

function resolveCheckoutProductCode(session: Stripe.Checkout.Session): string | null {
  const fromSession = session.metadata?.productCode?.trim().toUpperCase();
  if (fromSession && SUBSCRIPTION_PRODUCT_CODES.has(fromSession)) {
    return fromSession;
  }

  const subRef = session.subscription;
  if (subRef && typeof subRef === 'object') {
    const sub = subRef as Stripe.Subscription;
    const fromSubMeta = sub.metadata?.productCode?.trim().toUpperCase();
    if (fromSubMeta && SUBSCRIPTION_PRODUCT_CODES.has(fromSubMeta)) {
      return fromSubMeta;
    }
    const fromPriceMeta = sub.items?.data?.[0]?.price?.metadata?.productCode
      ?.trim()
      .toUpperCase();
    if (fromPriceMeta && SUBSCRIPTION_PRODUCT_CODES.has(fromPriceMeta)) {
      return fromPriceMeta;
    }
  }

  return null;
}

function extractStripeSubscriptionId(session: Stripe.Checkout.Session): string {
  const subRef = session.subscription;
  if (typeof subRef === 'string') return subRef;
  if (subRef && typeof subRef === 'object') {
    const del = (subRef as { deleted?: boolean }).deleted;
    const id = (subRef as { id?: string }).id;
    if (!del && typeof id === 'string') return id;
  }
  return '';
}

async function retrieveCompletedCheckoutSession(
  stripe: Stripe,
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const maxAttempts = 4;
  let lastSession: Stripe.Checkout.Session | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
    lastSession = session;

    const paid =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required';
    const hasSubscription = extractStripeSubscriptionId(session).length > 0;

    if (session.status === 'complete' && paid && (session.mode !== 'subscription' || hasSubscription)) {
      return session;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  return lastSession!;
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
    const session = await retrieveCompletedCheckoutSession(stripe, sessionId.trim());

    const sessionUserId =
      session.metadata?.userId?.trim() || session.client_reference_id?.trim() || '';
    if (sessionUserId !== user.uid) {
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

    const productCode = resolveCheckoutProductCode(session);
    if (!productCode) {
      return {
        ok: false,
        error:
          'Missing or invalid subscription plan code. Your payment may still succeed via Stripe webhook — refresh in a minute.',
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

    const stripeSubscriptionId = extractStripeSubscriptionId(session);
    if (!stripeSubscriptionId) {
      return {
        ok: false,
        error:
          'Stripe is still confirming your subscription. Refresh this page in a few seconds.',
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
    const isAcuPack = !!productCode && isAcuTopUpProductCode(productCode);

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
