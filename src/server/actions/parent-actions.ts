
'use server';

import { getVerifiedUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '../lib/errors';
import type { UserData, StudentProfileData } from '@/lib/firebase/services/user';
import * as admin from 'firebase-admin';
import { buildParentDashboardPayload, type RawStudentRow } from '@/server/services/parent-dashboard-intelligence';
import {
  assertParentRole,
  ensureStudentParentLinkCode,
  findStudentIdByParentLinkCode,
  isStudentAccount,
} from '@/server/lib/parent-student-link';
import { fetchLiveStudentRow } from '@/server/services/parent-student-live-data';
import { normalizeParentLinkCode } from '@/lib/parent-link-code';
import type { ParentDashboardPayload, ParentPlanTier, StudentData } from '@/types/parent-dashboard';

export type { StudentData, ParentDashboardPayload, ParentPlanTier };

import { resolveParentPlanType } from '@/server/lib/parent-plan';

export interface SavedResourceSummary {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

async function fetchLinkedStudentRow(studentId: string): Promise<RawStudentRow | null> {
  if (!(await isStudentAccount(studentId))) {
    return null;
  }

  const [userSnap, studentProfileSnap, dashboardStateSnap] = await Promise.all([
    adminDb.collection('users').doc(studentId).get(),
    adminDb.collection('student_profiles').doc(studentId).get(),
    adminDb.collection('student_dashboard_states').doc(studentId).get(),
  ]);

  if (!userSnap.exists && !studentProfileSnap.exists) {
    return null;
  }

  let diagnosticSnapshot = await adminDb
    .collection('diagnostic_results')
    .where('studentId', '==', studentId)
    .limit(1)
    .get();
  try {
    diagnosticSnapshot = await adminDb
      .collection('diagnostic_results')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
  } catch {
    // Index may be missing — unordered query above is enough
  }

  let resourceCount = 0;
  try {
    const savedResourcesSnapshot = await adminDb
      .collection('users')
      .doc(studentId)
      .collection('saved_resources')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    resourceCount = savedResourcesSnapshot.size;
  } catch {
    resourceCount = 0;
  }

  const student = userSnap.data() as UserData | undefined;
  const profile = studentProfileSnap.data() as StudentProfileData | undefined;
  const dashboardState = dashboardStateSnap.exists ? dashboardStateSnap.data() : null;
  const consistency: 'Good' | 'Fair' | 'Poor' =
    (dashboardState?.progressScore ?? 0) > 70
      ? 'Good'
      : (dashboardState?.progressScore ?? 0) > 40
        ? 'Fair'
        : 'Poor';

  const partial = {
    id: studentId,
    name: student?.name || 'Student',
    avatarSrc: student?.profileImageUrl || '',
    yearGroup: profile?.yearGroup || 'N/A',
    progress: Math.round(dashboardState?.progressScore || 0),
    consistency,
    lastDiagnostic: !diagnosticSnapshot.empty
      ? {
          date: (diagnosticSnapshot.docs[0].data().createdAt as admin.firestore.Timestamp)
            .toDate()
            .toISOString(),
          title: diagnosticSnapshot.docs[0].data().subject as string,
        }
      : undefined,
    resourceCount,
  };

  return fetchLiveStudentRow(studentId, partial);
}

export async function getParentDashboardDataAction(
  idToken?: string | null,
): Promise<{
  success: boolean;
  data?: ParentDashboardPayload;
  legacyStudents?: StudentData[];
  error?: string;
  errorCode?: string;
}> {
  const parentUser = await getVerifiedUser(idToken);
  if (!parentUser) {
    return { success: false, error: 'You must be logged in to view this data.', errorCode: 'UNAUTHENTICATED' };
  }

  try {
    const subscriptionSnap = await adminDb.collection('subscriptions').doc(parentUser.uid).get();
    const subData = subscriptionSnap.data();
    const planTier = resolveParentPlanType(subData?.type);

    if (!subscriptionSnap.exists || !planTier || subData?.status !== 'ACTIVE') {
      throw new HttpsError(
        'failed-precondition',
        'A Parent Pro subscription is required to access the Academic Command Centre.',
      );
    }

    const linksSnapshot = await adminDb
      .collection('parent_student_links')
      .where('parentId', '==', parentUser.uid)
      .where('status', '==', 'APPROVED')
      .get();

    if (linksSnapshot.empty) {
      return {
        success: true,
        data: buildParentDashboardPayload([], planTier),
        legacyStudents: [],
      };
    }

    const studentIds = linksSnapshot.docs
      .map((linkDoc) => linkDoc.data().studentId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    if (studentIds.length === 0) {
      return {
        success: true,
        data: buildParentDashboardPayload([], planTier),
        legacyStudents: [],
      };
    }

    const rawRows = (
      await Promise.all(studentIds.map((studentId) => fetchLinkedStudentRow(studentId)))
    ).filter((row): row is RawStudentRow => row !== null);

    const legacyStudents: StudentData[] = rawRows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarSrc: row.avatarSrc,
      yearGroup: row.yearGroup,
      consistency: row.consistency,
      progress: row.progress,
      weakestSubject: row.weakestSubject,
      strongestSubject: row.strongestSubject,
      lastDiagnostic: row.lastDiagnostic,
      savedResources: (row.savedResources ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        createdAt: r.createdAt,
      })),
    }));

    return {
      success: true,
      data: buildParentDashboardPayload(rawRows, planTier),
      legacyStudents,
    };
  } catch (error: unknown) {
    console.error('Error fetching parent dashboard data:', error);
    if (error instanceof HttpsError) {
      return { success: false, error: error.message, errorCode: error.code };
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Links a parent to a student via Parent Link Code.
 * - Student may be Free or Premium (no student subscription check).
 * - Parent does not need an active plan to create the link (subscription required to view Command Centre).
 */
export async function requestStudentLinkAction(
  idToken: string | null | undefined,
  linkCode: string,
): Promise<{ success: boolean; error?: string }> {
  const parentUser = await getVerifiedUser(idToken);
  if (!parentUser) {
    return { success: false, error: 'You must be logged in.' };
  }

  try {
    const isParent = await assertParentRole(parentUser.uid);
    if (!isParent) {
      return { success: false, error: 'Only parent accounts can link a student.' };
    }

    const normalized = normalizeParentLinkCode(linkCode);
    if (!normalized) {
      return { success: false, error: 'Enter the 8-digit Parent Link Code from your child\'s account.' };
    }

    const studentId = await findStudentIdByParentLinkCode(normalized);
    if (!studentId) {
      return { success: false, error: 'No student found with that Parent Link Code.' };
    }

    const linkId = `${studentId}_${parentUser.uid}`;
    const linkRef = adminDb.collection('parent_student_links').doc(linkId);

    if ((await linkRef.get()).exists) {
      return { success: false, error: 'This student is already linked to your account.' };
    }

    await linkRef.set({
      studentId,
      parentId: parentUser.uid,
      status: 'APPROVED',
      linkMethod: 'code',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Error linking student by code:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/** Exposed for student settings UI — deterministic code per student account. */
export async function getStudentParentLinkCodeAction(
  idToken: string | null | undefined,
): Promise<{ success: boolean; code?: string; error?: string }> {
  const user = await getVerifiedUser(idToken);
  if (!user) {
    return { success: false, error: 'You must be logged in.' };
  }

  if (!(await isStudentAccount(user.uid))) {
    return { success: false, error: 'Parent Link Codes are only available on student accounts.' };
  }

  const code = await ensureStudentParentLinkCode(user.uid);
  return { success: true, code };
}
