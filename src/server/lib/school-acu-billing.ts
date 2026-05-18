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

/**
 * School teachers must spend from the linked school's ACU pool — never their personal wallet.
 */
export async function resolveAcuWalletUserId(userId: string, role: string): Promise<string> {
  if (role !== 'SCHOOL_TUTOR') return userId;

  const link = await getTeacherSchoolLink(userId);
  if (!link.linked || !link.schoolId) {
    throw new HttpsError(
      'failed-precondition',
      'SCHOOL_NOT_LINKED: Link your school on the Command Centre to use AI tools with your school ACU pool.',
    );
  }

  const billing = await resolveSchoolAcuBillingUserId(link.schoolId);
  if (!billing) {
    throw new HttpsError(
      'failed-precondition',
      'SCHOOL_ACU_POOL_NOT_CONFIGURED: Your school has no ACU wallet yet. Ask your school administrator to top up under School → ACU command.',
    );
  }

  return billing;
}

export async function getSchoolAcuPoolForStaff(staffUserId: string): Promise<{
  linked: boolean;
  schoolId?: string;
  schoolName?: string;
  balance: number;
  billingUserId?: string;
}> {
  const link = await getTeacherSchoolLink(staffUserId);
  if (!link.linked || !link.schoolId) {
    return { linked: false, balance: 0 };
  }

  const [schoolSnap, billingUserId] = await Promise.all([
    adminDb.collection('school_accounts').doc(link.schoolId).get(),
    resolveSchoolAcuBillingUserId(link.schoolId),
  ]);

  if (!billingUserId) {
    return {
      linked: true,
      schoolId: link.schoolId,
      schoolName: (schoolSnap.data()?.name as string) ?? 'Your school',
      balance: 0,
    };
  }

  const walletSnap = await adminDb.collection('acuWallets').doc(billingUserId).get();
  const balance = readAcuBalance(walletSnap.data());

  return {
    linked: true,
    schoolId: link.schoolId,
    schoolName: (schoolSnap.data()?.name as string) ?? 'Your school',
    balance,
    billingUserId,
  };
}
