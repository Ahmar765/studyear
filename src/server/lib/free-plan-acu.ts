import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { ACUService } from '@/server/services/acu-service';
import { FREE_PLAN_RULES } from '@/data/free-plan-rules';

/**
 * Grant quarterly free ACUs to Child Free students (100 ACUs every 90 days).
 * Idempotent per grant window — safe to call on login or scheduled job.
 */
export async function grantFreeQuarterlyAcusIfDue(userId: string): Promise<{
  granted: boolean;
  acus?: number;
  skipReason?: string;
}> {
  const userSnap = await adminDb.collection('users').doc(userId).get();
  const data = userSnap.data();
  if (!data || data.role !== 'STUDENT') {
    return { granted: false, skipReason: 'not_student' };
  }

  const subscription = String(data.subscription ?? 'FREE').toUpperCase();
  if (subscription !== 'FREE') {
    return { granted: false, skipReason: 'not_free_plan' };
  }

  const grantRef = adminDb.collection('free_quarterly_acu_grants').doc(userId);
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
        acus: FREE_PLAN_RULES.quarterlyAcus,
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
    amount: FREE_PLAN_RULES.quarterlyAcus,
    type: 'BONUS',
    description: `Child Free — ${FREE_PLAN_RULES.quarterlyAcus} ACUs (quarterly allowance)`,
    metadata: {
      source: 'free_quarterly_grant',
      expiresAfterDays: FREE_PLAN_RULES.acuExpiryDays,
    },
  });

  return { granted: true, acus: FREE_PLAN_RULES.quarterlyAcus };
}
