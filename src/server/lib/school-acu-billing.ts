import { adminDb } from '@/lib/firebase/admin-app';
import { readAcuBalance } from '@/server/lib/acu-wallet-balance';
import { getTeacherSchoolLink } from '@/server/lib/school-staff-link';
import { HttpsError } from '@/server/lib/errors';

/** Wallet owner for a school workspace — first linked school admin. */
export async function resolveSchoolAcuBillingUserId(schoolId: string): Promise<string | null> {
  const admins = await adminDb
    .collection('school_staff')
    .where('schoolId', '==', schoolId)
    .where('role', '==', 'SCHOOL_ADMIN')
    .limit(5)
    .get();
  if (!admins.empty) {
    return (admins.docs[0]!.data().userId as string) ?? null;
  }
  const school = await adminDb.collection('school_accounts').doc(schoolId).get();
  const created = school.data()?.createdByUid as string | undefined;
  return created ?? null;
}

async function resolveSchoolIdForStaffUser(userId: string, role: string): Promise<string | null> {
  if (role === 'SCHOOL_TUTOR') {
    const link = await getTeacherSchoolLink(userId);
    return link.linked && link.schoolId ? link.schoolId : null;
  }
  if (role === 'SCHOOL_ADMIN') {
    const staffSnap = await adminDb
      .collection('school_staff')
      .where('userId', '==', userId)
      .limit(5)
      .get();
    if (staffSnap.empty) return null;
    const doc =
      staffSnap.docs.find((d) => (d.data().role as string) === 'SCHOOL_ADMIN') ?? staffSnap.docs[0];
    return (doc?.data().schoolId as string) ?? null;
  }
  return null;
}

/**
 * School staff (admin + linked teachers) spend from the shared school ACU pool — not personal wallets.
 */
export async function resolveAcuWalletUserId(userId: string, role: string): Promise<string> {
  if (role !== 'SCHOOL_TUTOR' && role !== 'SCHOOL_ADMIN') return userId;

  const schoolId = await resolveSchoolIdForStaffUser(userId, role);
  if (!schoolId) {
    const msg =
      role === 'SCHOOL_ADMIN'
        ? 'SCHOOL_NOT_LINKED: Complete school onboarding to activate your workspace ACU pool.'
        : 'SCHOOL_NOT_LINKED: Link your school on the Command Centre to use AI tools with your school ACU pool.';
    throw new HttpsError('failed-precondition', msg);
  }

  const billing = await resolveSchoolAcuBillingUserId(schoolId);
  if (!billing) {
    throw new HttpsError(
      'failed-precondition',
      'SCHOOL_ACU_POOL_NOT_CONFIGURED: Your school has no ACU wallet yet. Top up from Account or School → ACU command.',
    );
  }

  return billing;
}

export async function getSchoolAcuPoolForSchoolUser(userId: string): Promise<{
  linked: boolean;
  schoolId?: string;
  schoolName?: string;
  balance: number;
  billingUserId?: string;
}> {
  const userSnap = await adminDb.collection('users').doc(userId).get();
  const role = (userSnap.data()?.role as string) ?? '';
  const schoolId = await resolveSchoolIdForStaffUser(userId, role);
  if (!schoolId) {
    return { linked: false, balance: 0 };
  }

  const [schoolSnap, billingUserId] = await Promise.all([
    adminDb.collection('school_accounts').doc(schoolId).get(),
    resolveSchoolAcuBillingUserId(schoolId),
  ]);

  if (!billingUserId) {
    return {
      linked: true,
      schoolId,
      schoolName: (schoolSnap.data()?.name as string) ?? 'Your school',
      balance: 0,
    };
  }

  const walletSnap = await adminDb.collection('acuWallets').doc(billingUserId).get();
  const balance = readAcuBalance(walletSnap.data());

  return {
    linked: true,
    schoolId,
    schoolName: (schoolSnap.data()?.name as string) ?? 'Your school',
    balance,
    billingUserId,
  };
}

/** @deprecated Use getSchoolAcuPoolForSchoolUser — kept for teacher action import. */
export async function getSchoolAcuPoolForStaff(staffUserId: string) {
  return getSchoolAcuPoolForSchoolUser(staffUserId);
}
