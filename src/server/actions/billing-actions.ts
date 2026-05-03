
'use server';

import Stripe from 'stripe';

/**
 * Maps checkout `productCode` → Stripe Price IDs from `.env`.
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
      error: `No Stripe price for "${productCode}". Set STRIPE_PRICE_${productCode} in your environment (see Stripe Dashboard → Products → Price ID).`,
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });

    const isAcuTopUp = ['ENTRY', 'GROWTH', 'SCALE'].includes(productCode);

    if (isAcuTopUp) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/account?purchase=success`,
        cancel_url: `${baseUrl}/checkout`,
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
          `This plan uses a one-time Stripe price (${priceId}). Use a recurring monthly price for STRIPE_PRICE_${productCode}. Quick fix: run npm run stripe:seed-subscription-prices:missing and paste the new line into .env (or create a recurring price in Stripe and update .env). Optional Price metadata: productCode=${productCode}.`,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account?purchase=success`,
      cancel_url: `${baseUrl}/checkout`,
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
