import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { grantFreeQuarterlyAcusIfDue } from '@/server/lib/free-plan-acu';

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

/** Ensure every new user starts on the free tier unless they already have a paid plan. */
export async function provisionFreeAccount(
  userId: string,
  role?: string,
): Promise<{ ok: true; acusGranted?: number } | { ok: false; reason: string }> {
  const userSnap = await adminDb.doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    return { ok: false, reason: 'user_not_found' };
  }

  const userRole = String(role ?? userSnap.data()?.role ?? 'STUDENT').toUpperCase();
  if (userRole === 'ADMIN') {
    return { ok: true };
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
    return { ok: true };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await subRef.set(
    {
      type: 'FREE',
      status: 'ACTIVE',
      userId,
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

  let acusGranted: number | undefined;
  if (userRole === 'STUDENT') {
    const grant = await grantFreeQuarterlyAcusIfDue(userId);
    if (grant.granted) {
      acusGranted = grant.acus;
    }
  }

  return { ok: true, acusGranted };
}
