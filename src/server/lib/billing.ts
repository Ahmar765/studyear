import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import type Stripe from 'stripe';
import { HttpsError } from './errors';
import { ACUService } from '../services/acu-service';
import type { SubscriptionType } from '../schemas';
import { ACU_PACKAGES, STUDENT_PREMIUM_PLUS_MONTHLY_ACUS } from '@/data/acu-packages';
import {
  PARENT_ELITE_MONTHLY_ACUS,
  PARENT_PRO_PLUS_MONTHLY_ACUS,
} from '@/data/subscription-plans';
import { sendAcuTopUpReceiptEmail } from '@/server/lib/mail';

/**
 * Idempotently credit ACUs and write `payments` for a paid Checkout session (mode=payment + ACU pack metadata).
 * Safe for concurrent webhook + browser finalize calls.
 */
export async function recordAcuTopUpFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: string }
> {
  const userId = session.metadata?.userId;
  const productCode = session.metadata?.productCode;

  if (!userId || !productCode) {
    return { ok: false, reason: 'missing_metadata' };
  }

  if (session.mode !== 'payment') {
    return { ok: false, reason: 'wrong_mode' };
  }

  if (!ACU_PACKAGES[productCode as keyof typeof ACU_PACKAGES]) {
    return { ok: false, reason: 'invalid_product' };
  }

  if (session.payment_status !== 'paid') {
    return { ok: false, reason: 'not_paid' };
  }

  const existingPayment = await adminDb
    .collection('payments')
    .where('stripeCheckoutId', '==', session.id)
    .limit(1)
    .get();

  if (!existingPayment.empty) {
    return { ok: true, duplicate: true };
  }

  const settlementRef = adminDb.collection('stripe_acu_checkout_settlements').doc(session.id);

  const claim = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(settlementRef);
    if (snap.exists) {
      return 'duplicate' as const;
    }
    transaction.set(settlementRef, {
      userId,
      productCode,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? 'gbp',
      settledAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return 'claimed' as const;
  });

  if (claim === 'duplicate') {
    return { ok: true, duplicate: true };
  }

  const dupAfter = await adminDb
    .collection('payments')
    .where('stripeCheckoutId', '==', session.id)
    .limit(1)
    .get();

  if (!dupAfter.empty) {
    return { ok: true, duplicate: true };
  }

  const balanceResult = await updateUserAcuBalance(userId, productCode);
  if (!balanceResult.success) {
    await settlementRef.delete().catch(() => {});
    return { ok: false, reason: balanceResult.error ?? 'acu_credit_failed' };
  }

  await adminDb.collection('payments').add({
    userId,
    amount: session.amount_total,
    currency: session.currency,
    productCode,
    stripeCheckoutId: session.id,
    status: session.payment_status,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const pack = ACU_PACKAGES[productCode as keyof typeof ACU_PACKAGES];
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    const userEmail = userSnap.data()?.email as string | undefined;
    if (userEmail && pack) {
      const amountGbp = `£${((session.amount_total ?? 0) / 100).toFixed(2)}`;
      void sendAcuTopUpReceiptEmail({
        email: userEmail,
        name: userSnap.data()?.name as string | undefined,
        acus: pack.totalACUs,
        amountGbp,
      }).catch((err) => console.error('[billing] top-up receipt email failed:', err));
    }
  } catch (mailErr) {
    console.error('[billing] could not send receipt email:', mailErr);
  }

  return { ok: true, duplicate: false };
}

export async function updateUserAcuBalance(userId: string, productCode: string) {
    const pack = ACU_PACKAGES[productCode as keyof typeof ACU_PACKAGES];

    if (!pack) {
        console.error(`Invalid productCode received in webhook: ${productCode}`);
        throw new HttpsError('invalid-argument', `Product code ${productCode} is not a valid ACU package.`);
    }

    try {
        const creditData = {
            userId,
            amount: pack.totalACUs,
            type: "PURCHASE" as const,
            description: `${pack.label} ACU purchase via Stripe`,
            metadata: { stripeProductCode: productCode, pricePence: pack.pricePence }
        };

        if (pack.bonusACUs > 0) {
            creditData.description = `${pack.label} ACU purchase (${pack.baseACUs} + ${pack.bonusACUs} bonus)`;
        }

        await ACUService.creditACUs(creditData);

        console.log(`Successfully credited ${pack.totalACUs} ACUs to user ${userId} for product ${productCode}.`);
        return { success: true };

    } catch (error) {
        console.error(`Failed to update ACU balance for user ${userId} from webhook:`, error);
        // We don't re-throw here to prevent Stripe from retrying a potentially permanent business logic failure.
        // The error is logged for manual investigation.
        return { success: false, error: (error as Error).message };
    }
}

type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING_PAYMENT";

/**
 * Premium Plus: grant bundled ACUs once per paid Stripe invoice (initial + renewals). Idempotent per `invoiceId`.
 */
export async function grantPremiumPlusMonthlyAcusForInvoice(params: {
  userId: string;
  invoiceId: string;
  amountPaidPence: number;
  productCode: SubscriptionType;
}): Promise<{ granted: boolean; skipReason?: string }> {
  if (params.productCode !== 'STUDENT_PREMIUM_PLUS') {
    return { granted: false, skipReason: 'not_premium_plus' };
  }
  if (!params.invoiceId) {
    return { granted: false, skipReason: 'missing_invoice_id' };
  }
  if (params.amountPaidPence <= 0) {
    return { granted: false, skipReason: 'zero_or_negative_payment' };
  }

  const grantRef = adminDb.collection('stripe_premium_plus_acu_grants').doc(params.invoiceId);

  const shouldCredit = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(grantRef);
    if (snap.exists) {
      return false;
    }
    transaction.set(grantRef, {
      userId: params.userId,
      acus: STUDENT_PREMIUM_PLUS_MONTHLY_ACUS,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!shouldCredit) {
    return { granted: false, skipReason: 'already_credited_for_invoice' };
  }

  try {
    await ACUService.creditACUs({
      userId: params.userId,
      amount: STUDENT_PREMIUM_PLUS_MONTHLY_ACUS,
      type: 'BONUS',
      description: `Premium Plus — ${STUDENT_PREMIUM_PLUS_MONTHLY_ACUS.toLocaleString('en-GB')} ACUs (subscription invoice)`,
      metadata: {
        source: 'stripe_invoice',
        stripeInvoiceId: params.invoiceId,
        productCode: 'STUDENT_PREMIUM_PLUS',
      },
    });
  } catch (error) {
    await grantRef.delete().catch(() => {});
    console.error('grantPremiumPlusMonthlyAcusForInvoice: credit failed', error);
    throw error;
  }

  console.log(
    `Premium Plus ACUs (${STUDENT_PREMIUM_PLUS_MONTHLY_ACUS}) credited to ${params.userId} for invoice ${params.invoiceId}`,
  );
  return { granted: true };
}

/**
 * Parent Pro+ / Elite: grant bundled ACUs once per paid Stripe invoice. Idempotent per `invoiceId`.
 */
export async function grantParentMonthlyAcusForInvoice(params: {
  userId: string;
  invoiceId: string;
  amountPaidPence: number;
  productCode: SubscriptionType;
}): Promise<{ granted: boolean; skipReason?: string; acus?: number }> {
  let acus = 0;
  if (params.productCode === 'PARENT_PRO_PLUS') {
    acus = PARENT_PRO_PLUS_MONTHLY_ACUS;
  } else if (params.productCode === 'PARENT_ELITE') {
    acus = PARENT_ELITE_MONTHLY_ACUS;
  } else {
    return { granted: false, skipReason: 'not_parent_acu_plan' };
  }

  if (!params.invoiceId) {
    return { granted: false, skipReason: 'missing_invoice_id' };
  }
  if (params.amountPaidPence <= 0) {
    return { granted: false, skipReason: 'zero_or_negative_payment' };
  }

  const grantRef = adminDb.collection('stripe_parent_acu_grants').doc(params.invoiceId);

  const shouldCredit = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(grantRef);
    if (snap.exists) return false;
    transaction.set(grantRef, {
      userId: params.userId,
      acus,
      productCode: params.productCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!shouldCredit) {
    return { granted: false, skipReason: 'already_credited_for_invoice' };
  }

  const planLabel =
    params.productCode === 'PARENT_ELITE' ? 'Parent Elite' : 'Parent Pro+';

  try {
    await ACUService.creditACUs({
      userId: params.userId,
      amount: acus,
      type: 'BONUS',
      description: `${planLabel} — ${acus.toLocaleString('en-GB')} ACUs (subscription invoice)`,
      metadata: {
        source: 'stripe_invoice',
        stripeInvoiceId: params.invoiceId,
        productCode: params.productCode,
      },
    });
  } catch (error) {
    await grantRef.delete().catch(() => {});
    console.error('grantParentMonthlyAcusForInvoice: credit failed', error);
    throw error;
  }

  console.log(
    `${planLabel} ACUs (${acus}) credited to ${params.userId} for invoice ${params.invoiceId}`,
  );
  return { granted: true, acus };
}

export async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  userId: string,
  subscriptionType: SubscriptionType,
  status: SubscriptionStatus
) {
  const planType = String(subscriptionType ?? '')
    .trim()
    .toUpperCase() as SubscriptionType;
  const subscriptionRef = adminDb.collection('subscriptions').doc(userId);
  const userRef = adminDb.collection('users').doc(userId);
  
  try {
    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      transaction.set(subscriptionRef, { 
        type: planType,
        status: status,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (status === 'ACTIVE') {
        transaction.set(
          userRef,
          {
            subscription: planType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      if (userDoc.data()?.role === 'PARENT') {
          const parentProfileRef = adminDb.collection('parent_profiles').doc(userId);
          transaction.set(parentProfileRef, {
              stripeCustomerId: customerId,
          }, { merge: true });
      }
    });
    console.log(`Subscription updated for user ${userId}: type=${planType}, status=${status}.`);
  } catch (error) {
    console.error(`Failed to update subscription status for user ${userId}:`, error);
    // Don't rethrow to avoid webhook retry loops on persistent errors.
  }
}
