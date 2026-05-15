'use server';

import { getVerifiedUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '@/server/lib/errors';
import { buildSchoolTutorDashboardPayload } from '@/server/services/school-tutor-dashboard-intelligence';
import { fetchLiveSchoolTutorContext } from '@/server/services/school-tutor-live-data';
import {
  createSchoolStaffLink,
  findPendingStaffInvite,
  findSchoolIdByStaffJoinCode,
  getSchoolDisplayName,
  getTeacherSchoolLink,
  markStaffInviteAccepted,
} from '@/server/lib/school-staff-link';
import { normalizeSchoolStaffJoinCode } from '@/lib/school-staff-join-code';
import type { SchoolTutorDashboardPayload } from '@/types/school-tutor-dashboard';
import * as admin from 'firebase-admin';

export interface SchoolTeacherLinkStatus {
  linked: boolean;
  schoolId?: string;
  schoolName?: string;
  pendingInvite?: {
    schoolName: string;
    intendedRole: string;
  };
}

export interface TeacherStudent {
  id: string;
  name: string;
  profileImageUrl?: string;
  yearGroup: string;
  progressScore: number;
  weakestSubject: string;
  strongestSubject: string;
  tasksCompleted: number;
}

export async function getTeacherStudentsAction(
  idToken?: string | null,
): Promise<{ students: TeacherStudent[]; error?: string }> {
  try {
    const teacherUser = await getVerifiedUser(idToken);
    if (teacherUser.role !== 'SCHOOL_TUTOR' && teacherUser.role !== 'SCHOOL_ADMIN') {
      throw new HttpsError('permission-denied', 'School staff only.');
    }

    const live = await fetchLiveSchoolTutorContext(teacherUser.uid);
    if (!live) return { students: [] };

    const students: TeacherStudent[] = live.students.map((s) => ({
      id: s.id,
      name: s.name,
      profileImageUrl: s.avatarSrc,
      yearGroup: s.yearGroup,
      progressScore: s.progressScore,
      weakestSubject: s.weakestSubject ?? 'N/A',
      strongestSubject: s.strongestSubject ?? 'N/A',
      tasksCompleted: s.tasksCompleted,
    }));

    return { students };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching teacher's students:", error);
    return { students: [], error: message };
  }
}

export async function getSchoolTutorDashboardDataAction(
  idToken?: string | null,
): Promise<{ success: boolean; data?: SchoolTutorDashboardPayload; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (user.role !== 'SCHOOL_TUTOR') {
      throw new HttpsError('permission-denied', 'School tutor access only.');
    }

    const live = await fetchLiveSchoolTutorContext(user.uid);
    if (!live) {
      const userSnap = await adminDb.collection('users').doc(user.uid).get();
      const emptyCtx = {
        schoolId: '',
        schoolName: 'Not linked',
        staffUserId: user.uid,
        subjects: [],
        yearGroups: [],
        students: [],
        interventions: [],
        assessments: [],
      };
      return {
        success: true,
        data: buildSchoolTutorDashboardPayload(emptyCtx, {
          name: userSnap.data()?.name as string,
          email: userSnap.data()?.email as string,
        }),
      };
    }

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    return {
      success: true,
      data: buildSchoolTutorDashboardPayload(live, {
        name: userSnap.data()?.name as string,
        email: userSnap.data()?.email as string,
      }),
    };
  } catch (e) {
    const message = e instanceof HttpsError ? e.message : e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getSchoolTeacherLinkStatusAction(
  idToken?: string | null,
): Promise<{ success: boolean; status?: SchoolTeacherLinkStatus; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (!user) return { success: false, error: 'You must be logged in.' };
    if (user.role !== 'SCHOOL_TUTOR') {
      return { success: false, error: 'School teacher accounts only.' };
    }

    const link = await getTeacherSchoolLink(user.uid);
    if (link.linked && link.schoolId) {
      return {
        success: true,
        status: {
          linked: true,
          schoolId: link.schoolId,
          schoolName: await getSchoolDisplayName(link.schoolId),
        },
      };
    }

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    const email = (userSnap.data()?.email as string) || user.email || '';
    const invite = await findPendingStaffInvite(email);

    if (invite) {
      return {
        success: true,
        status: {
          linked: false,
          pendingInvite: {
            schoolName: await getSchoolDisplayName(invite.schoolId),
            intendedRole: invite.intendedRole,
          },
        },
      };
    }

    return { success: true, status: { linked: false } };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function linkSchoolTeacherByCodeAction(
  idToken: string | null | undefined,
  joinCode: string,
): Promise<{ success: boolean; schoolName?: string; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (!user) return { success: false, error: 'You must be logged in.' };
    if (user.role !== 'SCHOOL_TUTOR') {
      return { success: false, error: 'Only school teacher accounts can use a school join code.' };
    }

    const normalized = normalizeSchoolStaffJoinCode(joinCode);
    if (!normalized) {
      return { success: false, error: 'Enter the 8-character School Join Code from your administrator.' };
    }

    const existing = await getTeacherSchoolLink(user.uid);
    if (existing.linked) {
      return { success: false, error: 'You are already linked to a school workspace.' };
    }

    const schoolId = await findSchoolIdByStaffJoinCode(normalized);
    if (!schoolId) {
      return { success: false, error: 'No school found with that join code. Check with your school admin.' };
    }

    await createSchoolStaffLink({ userId: user.uid, schoolId, role: 'SCHOOL_TUTOR' });

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    const email = (userSnap.data()?.email as string) || user.email || '';
    const invite = await findPendingStaffInvite(email);
    if (invite && invite.schoolId === schoolId) {
      await markStaffInviteAccepted(invite.id, user.uid);
    }

    await adminDb.collection('users').doc(user.uid).set(
      { onboardingComplete: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    const schoolName = await getSchoolDisplayName(schoolId);
    return { success: true, schoolName };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function acceptSchoolStaffInviteAction(
  idToken: string | null | undefined,
): Promise<{ success: boolean; schoolName?: string; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (!user) return { success: false, error: 'You must be logged in.' };
    if (user.role !== 'SCHOOL_TUTOR') {
      return { success: false, error: 'Only school teacher accounts can accept a staff invite.' };
    }

    const existing = await getTeacherSchoolLink(user.uid);
    if (existing.linked) {
      return { success: false, error: 'You are already linked to a school workspace.' };
    }

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    const email = (userSnap.data()?.email as string) || user.email || '';
    const invite = await findPendingStaffInvite(email);
    if (!invite) {
      return {
        success: false,
        error: 'No pending invite for your email. Ask your admin to invite you or use the School Join Code.',
      };
    }

    await createSchoolStaffLink({
      userId: user.uid,
      schoolId: invite.schoolId,
      role: invite.intendedRole,
    });
    await markStaffInviteAccepted(invite.id, user.uid);

    await adminDb.collection('users').doc(user.uid).set(
      { onboardingComplete: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    const schoolName = await getSchoolDisplayName(invite.schoolId);
    return { success: true, schoolName };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}
