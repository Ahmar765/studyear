import { adminDb, adminAuth } from '@/lib/firebase/admin-app';
import { getVerifiedUser } from '@/server/lib/auth';
import { generateSchoolStaffJoinCode } from '@/lib/school-staff-join-code';
import * as admin from 'firebase-admin';

export type ResolvedSchoolAdmin = {
  uid: string;
  schoolId: string;
  email?: string;
};

/**
 * Resolves school admin from Firestore role (source of truth) with JWT fallback.
 * Repairs missing `school_staff` links for legacy accounts.
 */
export async function resolveSchoolAdmin(
  idToken?: string | null,
): Promise<ResolvedSchoolAdmin> {
  const tokenUser = await getVerifiedUser(idToken);
  if (!tokenUser) {
    throw new Error('Not authenticated.');
  }

  const userSnap = await adminDb.doc(`users/${tokenUser.uid}`).get();
  const userData = userSnap.data();
  const firestoreRole = typeof userData?.role === 'string' ? userData.role.trim().toUpperCase() : '';
  const claimRole =
    typeof (tokenUser as { role?: string }).role === 'string'
      ? (tokenUser as { role: string }).role.trim().toUpperCase()
      : '';

  const role = firestoreRole || claimRole;
  if (role !== 'SCHOOL_ADMIN') {
    throw new Error('School administrator access only.');
  }

  if (claimRole !== 'SCHOOL_ADMIN' && firestoreRole === 'SCHOOL_ADMIN') {
    try {
      await adminAuth.setCustomUserClaims(tokenUser.uid, { role: 'SCHOOL_ADMIN' });
    } catch (err) {
      console.warn('[resolveSchoolAdmin] Could not refresh JWT claims:', err);
    }
  }

  const staffSnap = await adminDb
    .collection('school_staff')
    .where('userId', '==', tokenUser.uid)
    .get();

  const adminStaff =
    staffSnap.docs.find((d) => (d.data().role as string) === 'SCHOOL_ADMIN') ?? staffSnap.docs[0];

  if (adminStaff) {
    const schoolId = adminStaff.data().schoolId as string;
    if (!schoolId) throw new Error('School link is invalid — contact support.');
    return {
      uid: tokenUser.uid,
      schoolId,
      email: (userData?.email as string) ?? tokenUser.email,
    };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const schoolRef = adminDb.collection('school_accounts').doc();
  const label =
    (typeof userData?.name === 'string' && userData.name.trim()) ||
    (tokenUser.email?.split('@')[0] ?? 'School');

  await schoolRef.set({
    name: `${label} (Workspace)`,
    approvalStatus: 'PENDING',
    staffJoinCode: generateSchoolStaffJoinCode(),
    onboardingStep: 0,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });

  await adminDb.collection('school_staff').doc().set({
    userId: tokenUser.uid,
    schoolId: schoolRef.id,
    role: 'SCHOOL_ADMIN',
    createdAt: now,
  });

  return {
    uid: tokenUser.uid,
    schoolId: schoolRef.id,
    email: (userData?.email as string) ?? tokenUser.email,
  };
}
