import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase/admin-app';

export type DiscountCodeRecord = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  validUntil?: Date | null;
  maxRedemptions?: number | null;
  redemptionCount?: number;
};

export function normalizeDiscountCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_');
}

export function formatDiscountLabel(record: Pick<DiscountCodeRecord, 'type' | 'value'>): string {
  return record.type === 'percentage' ? `${record.value}% off` : `£${record.value} off`;
}

function parseValidUntil(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof admin.firestore.Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function mapDiscountDoc(id: string, data: Record<string, unknown>): DiscountCodeRecord | null {
  if (data.active === false) return null;

  const validUntil = parseValidUntil(data.validUntil);
  if (validUntil && validUntil.getTime() < Date.now()) return null;

  const maxRedemptions =
    typeof data.maxRedemptions === 'number' && data.maxRedemptions > 0
      ? data.maxRedemptions
      : null;
  const redemptionCount =
    typeof data.redemptionCount === 'number' ? data.redemptionCount : 0;
  if (maxRedemptions !== null && redemptionCount >= maxRedemptions) return null;

  return {
    id,
    code: (data.code as string) || id,
    type: (data.type as 'percentage' | 'fixed') || 'percentage',
    value: typeof data.value === 'number' ? data.value : Number(data.value) || 0,
    active: true,
    stripeCouponId: typeof data.stripeCouponId === 'string' ? data.stripeCouponId : undefined,
    stripePromotionCodeId:
      typeof data.stripePromotionCodeId === 'string' ? data.stripePromotionCodeId : undefined,
    validUntil,
    maxRedemptions,
    redemptionCount,
  };
}

export async function findActiveDiscountCode(raw: string): Promise<DiscountCodeRecord | null> {
  const code = normalizeDiscountCodeInput(raw);
  if (code.length < 2) return null;

  const ref = adminDb.collection('admin_discount_codes').doc(code);
  const snap = await ref.get();
  if (!snap.exists) return null;

  return mapDiscountDoc(snap.id, snap.data() as Record<string, unknown>);
}

/** Look up an active promotion code created directly in the Stripe Dashboard. */
export async function findStripeDashboardPromotionCode(
  stripe: Stripe,
  raw: string,
): Promise<Stripe.PromotionCode | null> {
  const code = normalizeDiscountCodeInput(raw);
  if (code.length < 2) return null;

  const listed = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });

  const promo = listed.data[0];
  if (!promo || !promo.active) return null;

  const coupon = promo.coupon;
  if (typeof coupon === 'object' && coupon && !coupon.valid) return null;

  return promo;
}

/** Increment redemption count after a successful paid checkout (idempotent per session). */
export async function recordDiscountRedemption(
  code: string,
  checkoutSessionId: string,
): Promise<void> {
  const normalized = normalizeDiscountCodeInput(code);
  if (!normalized) return;

  const settlementRef = adminDb
    .collection('discount_redemption_settlements')
    .doc(checkoutSessionId);

  const shouldIncrement = await adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(settlementRef);
    if (existing.exists) return false;
    tx.set(settlementRef, {
      code: normalized,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!shouldIncrement) return;

  const codeRef = adminDb.collection('admin_discount_codes').doc(normalized);
  const snap = await codeRef.get();
  if (!snap.exists) return;

  await codeRef.set(
    {
      redemptionCount: admin.firestore.FieldValue.increment(1),
      lastRedeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function couponParamsFromRecord(
  record: DiscountCodeRecord,
): Promise<Stripe.CouponCreateParams> {
  return {
    duration: 'once',
    name: `StudYear ${record.code}`,
    ...(record.type === 'percentage'
      ? { percent_off: Math.min(Math.max(record.value, 0.01), 100) }
      : {
          amount_off: Math.max(Math.round(record.value * 100), 1),
          currency: 'gbp',
        }),
    ...(record.maxRedemptions ? { max_redemptions: record.maxRedemptions } : {}),
    ...(record.validUntil
      ? { redeem_by: Math.floor(record.validUntil.getTime() / 1000) }
      : {}),
  };
}

async function promotionCodeStillValid(
  stripe: Stripe,
  promotionCodeId: string,
): Promise<Stripe.PromotionCode | null> {
  try {
    const promo = await stripe.promotionCodes.retrieve(promotionCodeId);
    if (!promo.active) return null;
    const coupon = promo.coupon;
    if (typeof coupon === 'object' && coupon && !coupon.valid) return null;
    return promo;
  } catch (err) {
    const stripeErr = err as Stripe.errors.StripeError;
    if (stripeErr.code === 'resource_missing') return null;
    throw err;
  }
}

/**
 * Ensures a Stripe Promotion Code exists for a Firestore admin discount.
 * Recreates coupon + promotion code if they were deleted in Stripe Dashboard.
 */
export async function ensureStripePromotionCodeForDiscount(
  stripe: Stripe,
  record: DiscountCodeRecord,
): Promise<string> {
  if (record.stripePromotionCodeId) {
    const existing = await promotionCodeStillValid(stripe, record.stripePromotionCodeId);
    if (existing) return existing.id;
  }

  // Try by customer-facing code string (survives coupon id churn)
  const listed = await stripe.promotionCodes.list({
    code: record.code,
    limit: 3,
  });
  const activeMatch = listed.data.find((p) => p.active);
  if (activeMatch) {
    await adminDb.collection('admin_discount_codes').doc(record.id).set(
      {
        stripePromotionCodeId: activeMatch.id,
        stripeCouponId:
          typeof activeMatch.coupon === 'string'
            ? activeMatch.coupon
            : activeMatch.coupon?.id,
        stripeSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return activeMatch.id;
  }

  const coupon = await stripe.coupons.create(await couponParamsFromRecord(record));

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: record.code,
    ...(record.maxRedemptions ? { max_redemptions: record.maxRedemptions } : {}),
    ...(record.validUntil
      ? { expires_at: Math.floor(record.validUntil.getTime() / 1000) }
      : {}),
  });

  await adminDb.collection('admin_discount_codes').doc(record.id).set(
    {
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promo.id,
      stripeSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return promo.id;
}

/** @deprecated Use ensureStripePromotionCodeForDiscount */
export async function ensureStripeCouponForDiscount(
  stripe: Stripe,
  record: DiscountCodeRecord,
): Promise<string> {
  const promoId = await ensureStripePromotionCodeForDiscount(stripe, record);
  const promo = await stripe.promotionCodes.retrieve(promoId);
  const coupon = promo.coupon;
  return typeof coupon === 'string' ? coupon : coupon?.id ?? promoId;
}

export async function resolveCheckoutDiscountCoupon(
  stripe: Stripe,
  rawCode: string | null | undefined,
): Promise<
  | { promotionCodeId: string; record?: DiscountCodeRecord; source: 'admin' | 'stripe_dashboard' }
  | { error: string }
> {
  const trimmed = rawCode?.trim();
  if (!trimmed) {
    return { error: 'Enter a discount code.' };
  }

  const record = await findActiveDiscountCode(trimmed);
  if (record) {
    if (record.value <= 0) {
      return { error: 'That discount code is no longer valid.' };
    }
    try {
      const promotionCodeId = await ensureStripePromotionCodeForDiscount(stripe, record);
      return { promotionCodeId, record, source: 'admin' };
    } catch (err) {
      console.error('resolveCheckoutDiscountCoupon admin', err);
      return {
        error:
          err instanceof Error
            ? err.message
            : 'Could not apply this discount code. Try again or contact support.',
      };
    }
  }

  try {
    const dashboardPromo = await findStripeDashboardPromotionCode(stripe, trimmed);
    if (dashboardPromo) {
      return {
        promotionCodeId: dashboardPromo.id,
        source: 'stripe_dashboard',
      };
    }
  } catch (err) {
    console.error('resolveCheckoutDiscountCoupon stripe dashboard', err);
  }

  return { error: 'That discount code is invalid, expired, or has reached its usage limit.' };
}
