import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { grantFreeMonthlyAcusIfDue } from '@/server/lib/free-plan-acu';

const PAID_PLANS = new Set([
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
 * Provision a standalone Child Free student account (subscription FREE).
 * Does not run for paid plans — paid Stripe checkout replaces FREE entirely.
 */
export async function provisionChildFreeStudentAccount(
  userId: string,
  role?: string,
): Promise<{ ok: true; acusGranted?: number } | { ok: false; reason: string }> {
  const userSnap = await adminDb.doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    return { ok: false, reason: 'user_not_found' };
  }

  const userRole = String(role ?? userSnap.data()?.role ?? '').toUpperCase();
  if (userRole !== 'STUDENT') {
    return { ok: false, reason: 'child_free_students_only' };
  }

  const subRef = adminDb.collection('subscriptions').doc(userId);
  const subSnap = await subRef.get();
  const existingType = String(subSnap.data()?.type ?? '').toUpperCase();
  const existingStatus = String(subSnap.data()?.status ?? '').toUpperCase();

  if (
    existingType &&
    existingType !== 'FREE' &&
    PAID_PLANS.has(existingType) &&
    existingStatus === 'ACTIVE'
  ) {
    return { ok: false, reason: 'already_on_paid_plan' };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await subRef.set(
    {
      type: 'FREE',
      status: 'ACTIVE',
      userId,
      planLabel: 'Child Free',
      updatedAt: now,
      ...(subSnap.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  await adminDb.doc(`users/${userId}`).set(
    {
      subscription: 'FREE',
      updatedAt: now,
    },
    { merge: true },
  );

  const grant = await grantFreeMonthlyAcusIfDue(userId);
  return { ok: true, acusGranted: grant.granted ? grant.acus : undefined };
}
