import { adminDb, adminAuth } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const ADMIN_EMAILS = new Set(['admin@studyear.com', 'admin@studyear.ai']);

/** JWT claim first, then Firestore `users.role` (claims can be stale after promotion). */
export async function isPlatformAdmin(
  uid: string,
  token?: DecodedIdToken | null,
): Promise<boolean> {
  const claimRole = (token as { role?: string } | null | undefined)?.role;
  if (claimRole === 'ADMIN') return true;
  const snap = await adminDb.doc(`users/${uid}`).get();
  return snap.data()?.role === 'ADMIN';
}

/** Sync ADMIN role claims + subscription doc for platform admins on every login. */
export async function ensurePlatformAdminAccess(
  uid: string,
  email?: string | null,
): Promise<void> {
  const normalized = email?.trim().toLowerCase();
  const userSnap = await adminDb.doc(`users/${uid}`).get();
  const role = userSnap.data()?.role;
  const shouldBeAdmin = role === 'ADMIN' || (normalized ? ADMIN_EMAILS.has(normalized) : false);
  if (!shouldBeAdmin) return;

  const now = admin.firestore.FieldValue.serverTimestamp();
  if (role !== 'ADMIN') {
    await adminDb.doc(`users/${uid}`).set({ role: 'ADMIN', updatedAt: now }, { merge: true });
  }
  await adminAuth.setCustomUserClaims(uid, { role: 'ADMIN' });
  await adminDb.doc(`subscriptions/${uid}`).set(
    { type: 'ADMIN', status: 'ACTIVE', updatedAt: now },
    { merge: true },
  );
}
