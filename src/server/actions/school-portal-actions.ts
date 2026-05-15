'use server';

import { getVerifiedUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import { fetchSchoolPortalContext } from '@/server/services/school-portal-live-data';
import { buildSchoolCommandCentrePayload } from '@/server/services/school-portal-intelligence';
import { ensureSchoolStaffJoinCode } from '@/server/lib/school-staff-link';
import type { SchoolCommandCentrePayload, SchoolOnboardingProfile } from '@/types/school-portal';
import * as admin from 'firebase-admin';

async function requireSchoolAdmin(idToken?: string | null) {
  const user = await getVerifiedUser(idToken);
  if (!user) throw new Error('Not authenticated.');
  if (user.role !== 'SCHOOL_ADMIN') throw new Error('School administrator access only.');

  const staffSnap = await adminDb
    .collection('school_staff')
    .where('userId', '==', user.uid)
    .where('role', '==', 'SCHOOL_ADMIN')
    .limit(1)
    .get();

  if (staffSnap.empty) throw new Error('No school is linked to this account.');
  const schoolId = staffSnap.docs[0]!.data().schoolId as string;
  return { uid: user.uid, schoolId };
}

export async function getSchoolCommandCentreAction(
  idToken?: string | null,
): Promise<{ success: boolean; data?: SchoolCommandCentrePayload; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (!user || user.role !== 'SCHOOL_ADMIN') {
      return { success: false, error: 'School administrator access only.' };
    }

    const ctx = await fetchSchoolPortalContext(user.uid);
    if (!ctx) {
      return { success: false, error: 'No school workspace found for this account.' };
    }

    return { success: true, data: buildSchoolCommandCentrePayload(ctx) };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getSchoolOnboardingStateAction(
  idToken?: string | null,
): Promise<{
  success: boolean;
  schoolId?: string;
  schoolName?: string;
  onboardingComplete?: boolean;
  onboardingStep?: number;
  profile?: SchoolOnboardingProfile;
  error?: string;
}> {
  try {
    const { schoolId } = await requireSchoolAdmin(idToken);
    const doc = await adminDb.collection('school_accounts').doc(schoolId).get();
    const d = doc.data() ?? {};
    return {
      success: true,
      schoolId,
      schoolName: (d.name as string) ?? 'Your school',
      onboardingComplete: d.onboardingComplete === true,
      onboardingStep: typeof d.onboardingStep === 'number' ? d.onboardingStep : 0,
      profile: (d.onboardingProfile as SchoolOnboardingProfile) ?? {},
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function saveSchoolOnboardingStepAction(
  idToken: string | null | undefined,
  step: number,
  patch: SchoolOnboardingProfile & { schoolName?: string },
  complete?: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { schoolId } = await requireSchoolAdmin(idToken);
    const ref = adminDb.collection('school_accounts').doc(schoolId);
    const existing = (await ref.get()).data() ?? {};
    const prevProfile = (existing.onboardingProfile as SchoolOnboardingProfile) ?? {};

    const merged: SchoolOnboardingProfile = {
      ...prevProfile,
      ...patch,
      examBoards: patch.examBoards ?? prevProfile.examBoards,
      academicPriorities: patch.academicPriorities ?? prevProfile.academicPriorities,
      existingSystems: patch.existingSystems ?? prevProfile.existingSystems,
      departments: patch.departments ?? prevProfile.departments,
      yearGroups: patch.yearGroups ?? prevProfile.yearGroups,
      classes: patch.classes ?? prevProfile.classes,
    };

    const update: Record<string, unknown> = {
      onboardingProfile: merged,
      onboardingStep: step,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (patch.schoolName?.trim()) {
      update.name = patch.schoolName.trim();
    }

    if (complete) {
      update.onboardingComplete = true;
      update.onboardingCompletedAt = admin.firestore.FieldValue.serverTimestamp();
      await ensureSchoolStaffJoinCode(schoolId);
    }

    await ref.set(update, { merge: true });
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}
