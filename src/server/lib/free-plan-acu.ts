import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { ACUService } from '@/server/services/acu-service';
import { FREE_PLAN_RULES } from '@/data/free-plan-rules';

const PAID_SUBSCRIPTION_TYPES = new Set([
  'STUDENT_ACCESS',
  'STUDENT_PREMIUM',
  'STUDENT_PREMIUM_PLUS',
  'STUDENT_MAX',
  'PARENT_VIEW',
  'PARENT_PRO',
  'PARENT_PRO_PLUS',
  'PARENT_ELITE',
  'PRIVATE_TUTOR',
  'SCHOOL_STARTER',
  'SCHOOL_GROWTH',
  'SCHOOL_ENTERPRISE',
]);

/**
 * Grant monthly Child Free ACUs (100/month) — only for active FREE student accounts.
 * Never runs for paid subscriptions. Idempotent per grant window.
 */
export async function grantFreeMonthlyAcusIfDue(userId: string): Promise<{
  granted: boolean;
  acus?: number;
  skipReason?: string;
}> {
  const userSnap = await adminDb.collection('users').doc(userId).get();
  const data = userSnap.data();
  if (!data || String(data.role ?? '').toUpperCase() !== 'STUDENT') {
    return { granted: false, skipReason: 'not_student' };
  }

  const subscription = String(data.subscription ?? 'FREE').toUpperCase();
  if (subscription !== 'FREE') {
    return { granted: false, skipReason: 'not_free_plan' };
  }

  const subSnap = await adminDb.collection('subscriptions').doc(userId).get();
  const subType = String(subSnap.data()?.type ?? subscription).toUpperCase();
  const subStatus = String(subSnap.data()?.status ?? '').toUpperCase();
  if (
    subType !== 'FREE' &&
    PAID_SUBSCRIPTION_TYPES.has(subType) &&
    subStatus === 'ACTIVE'
  ) {
    return { granted: false, skipReason: 'paid_subscription_active' };
  }

  const grantRef = adminDb.collection('free_monthly_acu_grants').doc(userId);
  const now = Date.now();
  const intervalMs = FREE_PLAN_RULES.grantIntervalDays * 24 * 60 * 60 * 1000;

  const shouldGrant = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(grantRef);
    const lastGrantedAt = snap.data()?.lastGrantedAt?.toMillis?.() as number | undefined;
    if (lastGrantedAt && now - lastGrantedAt < intervalMs) {
      return false;
    }
    transaction.set(
      grantRef,
      {
        lastGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        acus: FREE_PLAN_RULES.monthlyAcus,
        expiresAfterDays: FREE_PLAN_RULES.acuExpiryDays,
      },
      { merge: true },
    );
    return true;
  });

  if (!shouldGrant) {
    return { granted: false, skipReason: 'not_due_yet' };
  }

  await ACUService.creditACUs({
    userId,
    amount: FREE_PLAN_RULES.monthlyAcus,
    type: 'BONUS',
    description: `Child Free — ${FREE_PLAN_RULES.monthlyAcus} ACUs (monthly allowance)`,
    metadata: {
      source: 'free_monthly_grant',
      expiresAfterDays: FREE_PLAN_RULES.acuExpiryDays,
    },
  });

  return { granted: true, acus: FREE_PLAN_RULES.monthlyAcus };
}

/** @deprecated Use grantFreeMonthlyAcusIfDue */
export const grantFreeQuarterlyAcusIfDue = grantFreeMonthlyAcusIfDue;
