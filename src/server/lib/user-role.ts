import { adminDb } from '@/lib/firebase/admin-app';
import type { DecodedIdToken } from 'firebase-admin/auth';

/** JWT custom claims can be stale; Firestore `users.role` is the fallback. */
export async function resolveUserRole(
  uid: string,
  token?: DecodedIdToken | null,
): Promise<string | undefined> {
  const claimRole = (token as { role?: string } | undefined)?.role;
  if (typeof claimRole === 'string' && claimRole.trim()) {
    return claimRole.trim();
  }
  const snap = await adminDb.collection('users').doc(uid).get();
  const firestoreRole = snap.data()?.role;
  return typeof firestoreRole === 'string' ? firestoreRole.trim() : undefined;
}
