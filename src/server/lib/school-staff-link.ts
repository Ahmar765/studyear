import { adminDb } from '@/lib/firebase/admin-app';
import {
  generateSchoolStaffJoinCode,
  normalizeSchoolStaffJoinCode,
} from '@/lib/school-staff-join-code';
import * as admin from 'firebase-admin';

export type SchoolStaffLinkRole = 'SCHOOL_TUTOR' | 'SCHOOL_ADMIN';

export async function getTeacherSchoolLink(userId: string): Promise<{
  linked: boolean;
  schoolId?: string;
  staffRole?: SchoolStaffLinkRole;
  staffLinkId?: string;
  assignedYearGroups?: string[];
  assignedClassNames?: string[];
  assignedStudentIds?: string[];
}> {
  const snap = await adminDb.collection('school_staff').where('userId', '==', userId).limit(1).get();
  if (snap.empty) return { linked: false };
  const doc = snap.docs[0]!;
  const data = doc.data();
  return {
    linked: true,
    schoolId: data.schoolId as string,
    staffRole: data.role as SchoolStaffLinkRole,
    staffLinkId: doc.id,
    assignedYearGroups: Array.isArray(data.assignedYearGroups)
      ? (data.assignedYearGroups as string[])
      : [],
    assignedClassNames: Array.isArray(data.assignedClassNames)
      ? (data.assignedClassNames as string[])
      : [],
    assignedStudentIds: Array.isArray(data.assignedStudentIds)
      ? (data.assignedStudentIds as string[])
      : [],
  };
}

export async function ensureSchoolStaffJoinCode(schoolId: string): Promise<string> {
  const ref = adminDb.collection('school_accounts').doc(schoolId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('School not found.');

  const existing = doc.data()?.staffJoinCode as string | undefined;
  const normalized = existing ? normalizeSchoolStaffJoinCode(existing) : null;
  if (normalized) return normalized;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateSchoolStaffJoinCode();
    const collision = await adminDb
      .collection('school_accounts')
      .where('staffJoinCode', '==', code)
      .limit(1)
      .get();
    if (!collision.empty) continue;
    await ref.set(
      {
        staffJoinCode: code,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return code;
  }

  throw new Error('Could not generate a unique staff join code.');
}

export async function regenerateSchoolStaffJoinCode(schoolId: string): Promise<string> {
  const ref = adminDb.collection('school_accounts').doc(schoolId);
  if (!(await ref.get()).exists) throw new Error('School not found.');

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateSchoolStaffJoinCode();
    const collision = await adminDb
      .collection('school_accounts')
      .where('staffJoinCode', '==', code)
      .limit(1)
      .get();
    if (!collision.empty && collision.docs[0]!.id !== schoolId) continue;
    await ref.set(
      {
        staffJoinCode: code,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return code;
  }

  throw new Error('Could not generate a unique staff join code.');
}

export async function findSchoolIdByStaffJoinCode(code: string): Promise<string | null> {
  const normalized = normalizeSchoolStaffJoinCode(code);
  if (!normalized) return null;

  const snap = await adminDb
    .collection('school_accounts')
    .where('staffJoinCode', '==', normalized)
    .limit(1)
    .get();

  return snap.empty ? null : snap.docs[0]!.id;
}

export async function findPendingStaffInvite(email: string): Promise<{
  id: string;
  schoolId: string;
  intendedRole: SchoolStaffLinkRole;
} | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const snap = await adminDb
    .collection('school_staff_invites')
    .where('email', '==', normalizedEmail)
    .limit(20)
    .get();

  const pending = snap.docs.find((d) => (d.data().status as string) === 'PENDING');
  if (!pending) return null;

  const data = pending.data();
  const intendedRole =
    data.intendedRole === 'SCHOOL_ADMIN' ? 'SCHOOL_ADMIN' : 'SCHOOL_TUTOR';

  return {
    id: pending.id,
    schoolId: data.schoolId as string,
    intendedRole,
  };
}

export async function createSchoolStaffLink(params: {
  userId: string;
  schoolId: string;
  role: SchoolStaffLinkRole;
}): Promise<void> {
  const existing = await getTeacherSchoolLink(params.userId);
  if (existing.linked) {
    throw new Error('Your account is already linked to a school.');
  }

  const schoolSnap = await adminDb.collection('school_accounts').doc(params.schoolId).get();
  if (!schoolSnap.exists) {
    throw new Error('School workspace not found.');
  }

  await adminDb.collection('school_staff').add({
    userId: params.userId,
    schoolId: params.schoolId,
    role: params.role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function markStaffInviteAccepted(inviteId: string, userId: string): Promise<void> {
  await adminDb.collection('school_staff_invites').doc(inviteId).update({
    status: 'ACCEPTED',
    acceptedByUid: userId,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function getSchoolDisplayName(schoolId: string): Promise<string> {
  const snap = await adminDb.collection('school_accounts').doc(schoolId).get();
  return (snap.data()?.name as string) || 'Your school';
}
