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
};

export function normalizeDiscountCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_');
}

export function formatDiscountLabel(record: Pick<DiscountCodeRecord, 'type' | 'value'>): string {
  return record.type === 'percentage' ? `${record.value}% off` : `£${record.value} off`;
}

export async function findActiveDiscountCode(raw: string): Promise<DiscountCodeRecord | null> {
  const code = normalizeDiscountCodeInput(raw);
  if (code.length < 2) return null;

  const ref = adminDb.collection('admin_discount_codes').doc(code);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  if (data.active === false) return null;

  return {
    id: snap.id,
    code: (data.code as string) || snap.id,
    type: (data.type as 'percentage' | 'fixed') || 'percentage',
    value: typeof data.value === 'number' ? data.value : Number(data.value) || 0,
    active: true,
    stripeCouponId: typeof data.stripeCouponId === 'string' ? data.stripeCouponId : undefined,
  };
}

function stripeCouponIdFromCode(code: string): string {
  const sanitized = code.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return sanitized || 'PROMO';
}

/** Ensures a Stripe coupon exists for a Firestore discount code. */
export async function ensureStripeCouponForDiscount(
  stripe: Stripe,
  record: DiscountCodeRecord,
): Promise<string> {
  const couponId = record.stripeCouponId || stripeCouponIdFromCode(record.code);

  try {
    const existing = await stripe.coupons.retrieve(couponId);
    if (existing.valid) {
      if (!record.stripeCouponId) {
        await adminDb.collection('admin_discount_codes').doc(record.id).set(
          { stripeCouponId: couponId },
          { merge: true },
        );
      }
      return couponId;
    }
  } catch (err) {
    const stripeErr = err as Stripe.errors.StripeError;
    if (stripeErr.code !== 'resource_missing') throw err;
  }

  const params: Stripe.CouponCreateParams = {
    id: couponId,
    duration: 'once',
    name: `StudYear ${record.code}`,
    ...(record.type === 'percentage'
      ? { percent_off: Math.min(Math.max(record.value, 0.01), 100) }
      : {
          amount_off: Math.max(Math.round(record.value * 100), 1),
          currency: 'gbp',
        }),
  };

  await stripe.coupons.create(params);
  await adminDb.collection('admin_discount_codes').doc(record.id).set(
    {
      stripeCouponId: couponId,
      stripeSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return couponId;
}

export async function resolveCheckoutDiscountCoupon(
  stripe: Stripe,
  rawCode: string | null | undefined,
): Promise<{ couponId: string; record: DiscountCodeRecord } | { error: string }> {
  const trimmed = rawCode?.trim();
  if (!trimmed) {
    return { error: 'Enter a discount code.' };
  }

  const record = await findActiveDiscountCode(trimmed);
  if (!record) {
    return { error: 'That discount code is invalid or has expired.' };
  }

  if (record.value <= 0) {
    return { error: 'That discount code is no longer valid.' };
  }

  try {
    const couponId = await ensureStripeCouponForDiscount(stripe, record);
    return { couponId, record };
  } catch (err) {
    console.error('resolveCheckoutDiscountCoupon', err);
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Could not apply this discount code. Try again or contact support.',
    };
  }
}
