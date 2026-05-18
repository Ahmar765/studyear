import { adminDb } from '@/lib/firebase/admin-app';
import type { StudentProfileData } from '@/lib/firebase/services/user';
import * as admin from 'firebase-admin';

export interface SchoolPortalRawContext {
  schoolId: string;
  schoolName: string;
  onboardingComplete: boolean;
  adminUserId: string;
  students: Array<{
    id: string;
    name: string;
    yearGroup: string;
    subjects: string[];
    progressScore: number;
    riskLevel?: string;
    pendingHomework: number;
    tasksCompleted: number;
    weakestSubject?: string;
  }>;
  staffCount: number;
  interventions: Array<{ id: string; title: string; status: string; studentName: string; createdAt: string }>;
  assessments: Array<{ id: string; title: string; dueDate: string | null; createdAt: string }>;
  acuBalance: number;
  acuConsumed7d: number;
  parentLinksCount: number;
}

function tsToIso(v: unknown): string | undefined {
  if (v && typeof (v as admin.firestore.Timestamp).toDate === 'function') {
    return (v as admin.firestore.Timestamp).toDate().toISOString();
  }
  if (typeof v === 'string') return v;
  return undefined;
}

function chunkIds<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function countPendingTasks(studentId: string): Promise<number> {
  try {
    const snap = await adminDb
      .collection('study_tasks')
      .where('userId', '==', studentId)
      .where('status', '==', 'pending')
      .limit(30)
      .get();
    return snap.size;
  } catch {
    return 0;
  }
}

async function sumAcuForUsers(userIds: string[], since: Date): Promise<number> {
  let total = 0;
  for (const chunk of chunkIds(userIds, 10)) {
    if (!chunk.length) continue;
    try {
      const snap = await adminDb
        .collection('aiUsageLogs')
        .where('userId', 'in', chunk)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(since))
        .limit(200)
        .get();
      snap.docs.forEach((doc) => {
        const acus = doc.data().chargedAcus;
        if (typeof acus === 'number') total += acus;
      });
    } catch {
      // Index may be missing — skip gracefully
    }
  }
  return total;
}

export async function fetchSchoolPortalContext(adminUserId: string): Promise<SchoolPortalRawContext | null> {
  const staffSnap = await adminDb
    .collection('school_staff')
    .where('userId', '==', adminUserId)
    .get();

  if (staffSnap.empty) return null;

  const staffDoc =
    staffSnap.docs.find((d) => (d.data().role as string) === 'SCHOOL_ADMIN') ?? staffSnap.docs[0];
  const schoolId = staffDoc!.data().schoolId as string;
  if (!schoolId) return null;
  const [schoolSnap, profileSnap, staffLinksSnap, interventionsSnap, assessmentsSnap, walletSnap] =
    await Promise.all([
      adminDb.collection('school_accounts').doc(schoolId).get(),
      adminDb.collection('student_profiles').where('schoolAccountId', '==', schoolId).get(),
      adminDb.collection('school_staff').where('schoolId', '==', schoolId).get(),
      adminDb.collection('school_interventions').where('schoolId', '==', schoolId).limit(40).get(),
      adminDb.collection('school_assessments').where('schoolId', '==', schoolId).limit(20).get(),
      adminDb.collection('acuWallets').doc(adminUserId).get(),
    ]);

  const schoolData = schoolSnap.data() ?? {};
  const studentIds = profileSnap.docs.map((d) => d.id);
  const usersMap = new Map<string, string>();

  for (const chunk of chunkIds(studentIds, 10)) {
    if (!chunk.length) continue;
    const us = await adminDb
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    us.docs.forEach((doc) => usersMap.set(doc.id, (doc.data().name as string) ?? 'Student'));
  }

  const dashboardsMap = new Map<string, admin.firestore.DocumentData>();
  for (const chunk of chunkIds(studentIds, 30)) {
    if (!chunk.length) continue;
    const ds = await adminDb
      .collection('student_dashboard_states')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    ds.docs.forEach((doc) => dashboardsMap.set(doc.id, doc.data()));
  }

  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);

  const students = await Promise.all(
    profileSnap.docs.map(async (profileDoc) => {
      const id = profileDoc.id;
      const profile = profileDoc.data() as StudentProfileData;
      const dash = dashboardsMap.get(id) ?? {};
      const weak = Array.isArray(dash.weakSubjects)
        ? (dash.weakSubjects as { name?: string }[])[0]
        : dash.weakSubjects
          ? (dash.weakSubjects as { name?: string })
          : undefined;
      const pendingHomework = await countPendingTasks(id);
      const subjects = Array.isArray(profile.subjects)
        ? (profile.subjects as string[])
        : profile.subjects
          ? Object.keys(profile.subjects as Record<string, unknown>)
          : [];

      return {
        id,
        name: usersMap.get(id) ?? 'Student',
        yearGroup: profile.yearGroup ?? 'Unspecified',
        subjects,
        progressScore: Math.round((dash.progressScore as number) ?? 0),
        riskLevel: dash.riskLevel as string | undefined,
        pendingHomework,
        tasksCompleted: Math.round((dash.tasksCompleted as number) ?? 0),
        weakestSubject: weak?.name,
      };
    }),
  );

  let parentLinksCount = 0;
  for (const chunk of chunkIds(studentIds, 10)) {
    if (!chunk.length) continue;
    for (const sid of chunk) {
      const links = await adminDb
        .collection('parent_student_links')
        .where('studentId', '==', sid)
        .limit(5)
        .get();
      parentLinksCount += links.size;
    }
  }

  const acuBalance =
    typeof walletSnap.data()?.balance === 'number' ? walletSnap.data()!.balance : 0;
  const allUserIds = [...studentIds, adminUserId];
  const acuConsumed7d = await sumAcuForUsers(allUserIds, since7d);

  const interventions = interventionsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const sid = d.studentUserId as string;
      return {
        id: doc.id,
        title: (d.title as string) || 'Intervention',
        status: (d.status as string) || 'ACTIVE',
        studentName: usersMap.get(sid) ?? 'Student',
        createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const assessments = assessmentsSnap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: (d.title as string) || 'Assessment',
        dueDate: tsToIso(d.dueDate)?.slice(0, 10) ?? null,
        createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  return {
    schoolId,
    schoolName: (schoolData.name as string) ?? 'Your school',
    onboardingComplete: schoolData.onboardingComplete === true,
    adminUserId,
    students,
    staffCount: staffLinksSnap.size,
    interventions,
    assessments,
    acuBalance,
    acuConsumed7d,
    parentLinksCount,
  };
}
