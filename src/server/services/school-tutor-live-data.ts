import { adminDb } from '@/lib/firebase/admin-app';
import type { StudentProfileData } from '@/lib/firebase/services/user';
import { buildSubjectProgress } from '@/server/services/parent-student-live-data';
import { resolveWeakestStrongestSubjects } from '@/server/lib/subject-strength';
import { getTeacherSchoolLink } from '@/server/lib/school-staff-link';
import * as admin from 'firebase-admin';

function yearGroupMatchesAssignment(studentYear: string, assigned: string[]): boolean {
  if (!assigned.length) return true;
  const sy = studentYear.trim().toLowerCase();
  if (!sy) return false;
  return assigned.some((a) => {
    const norm = a.trim().toLowerCase();
    return norm === sy || sy.includes(norm) || norm.includes(sy);
  });
}

export interface SchoolTutorContext {
  schoolId: string;
  schoolName: string;
  staffUserId: string;
  department?: string;
  subjects: string[];
  yearGroups: string[];
  /** Cohorts assigned by school admin; empty = all school students. */
  assignedYearGroups: string[];
  assignedClassNames: string[];
  students: Array<{
    id: string;
    name: string;
    avatarSrc?: string;
    yearGroup: string;
    progressScore: number;
    predictedGrade?: string;
    riskLevel?: string;
    weakestSubject?: string;
    strongestSubject?: string;
    tasksCompleted: number;
    pendingHomework: number;
    avgQuizScore30d: number;
    quizAttempts30d: number;
  }>;
  interventions: Array<{
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    notes: string;
    status: 'ACTIVE' | 'CLOSED';
    createdAt: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
  }>;
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

export async function getSchoolIdForStaffUser(userId: string): Promise<{
  schoolId: string | null;
  role?: string;
  department?: string;
}> {
  const snap = await adminDb.collection('school_staff').where('userId', '==', userId).limit(1).get();
  if (snap.empty) return { schoolId: null };
  const data = snap.docs[0]!.data();
  return {
    schoolId: data.schoolId as string,
    role: data.role as string,
    department: data.department as string | undefined,
  };
}

async function countPendingTasks(studentId: string): Promise<number> {
  try {
    const snap = await adminDb
      .collection('study_tasks')
      .where('userId', '==', studentId)
      .where('status', '==', 'pending')
      .limit(40)
      .get();
    return snap.size;
  } catch {
    return 0;
  }
}

async function quizStats30d(studentId: string): Promise<{ count: number; avg: number }> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const snap = await adminDb.collection('quiz_attempts').where('studentId', '==', studentId).limit(60).get();
  const scores: number[] = [];
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const created = tsToIso(data.createdAt);
    if (created && new Date(created) < since) return;
    const n = typeof data.scorePercent === 'number' ? data.scorePercent : parseFloat(String(data.scorePercent ?? ''));
    if (Number.isFinite(n)) scores.push(n);
  });
  if (!scores.length) return { count: 0, avg: 0 };
  return { count: scores.length, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) };
}

export async function fetchLiveSchoolTutorContext(staffUserId: string): Promise<SchoolTutorContext | null> {
  const { schoolId, department } = await getSchoolIdForStaffUser(staffUserId);
  if (!schoolId) return null;
  const staffLink = await getTeacherSchoolLink(staffUserId);
  const assignedYearGroups = staffLink.assignedYearGroups ?? [];
  const assignedClassNames = staffLink.assignedClassNames ?? [];

  const [schoolSnap, profileSnap, tutorProfileSnap] = await Promise.all([
    adminDb.collection('school_accounts').doc(schoolId).get(),
    adminDb.collection('student_profiles').where('schoolAccountId', '==', schoolId).get(),
    adminDb.collection('tutor_profiles').doc(staffUserId).get(),
  ]);

  const schoolName = (schoolSnap.data()?.name as string) ?? 'Your school';
  const tutorData = tutorProfileSnap.data();
  const subjects: string[] = Array.isArray(tutorData?.subjects)
    ? (tutorData!.subjects as string[])
    : tutorData?.subjects
      ? Object.values(tutorData.subjects as Record<string, string[]>).flat()
      : [];
  const yearGroups: string[] = Array.isArray(tutorData?.levels) ? (tutorData!.levels as string[]) : [];

  const studentIds = profileSnap.docs.map((d) => d.id);
  const usersMap = new Map<string, { name: string; avatarSrc?: string }>();
  for (const chunk of chunkIds(studentIds, 10)) {
    if (!chunk.length) continue;
    const us = await adminDb
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    us.docs.forEach((doc) => {
      const d = doc.data();
      usersMap.set(doc.id, { name: (d.name as string) ?? 'Student', avatarSrc: d.profileImageUrl as string });
    });
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

  const students = await Promise.all(
    profileSnap.docs.map(async (profileDoc) => {
      const id = profileDoc.id;
      const profile = profileDoc.data() as StudentProfileData;
      const dash = dashboardsMap.get(id) ?? {};
      const user = usersMap.get(id);
      const [pendingHomework, quiz, subjects] = await Promise.all([
        countPendingTasks(id),
        quizStats30d(id),
        buildSubjectProgress(id, profile),
      ]);
      const strength = resolveWeakestStrongestSubjects(subjects);

      return {
        id,
        name: user?.name ?? 'Student',
        avatarSrc: user?.avatarSrc,
        yearGroup: profile.yearGroup ?? 'N/A',
        progressScore: Math.round((dash.progressScore as number) ?? 0),
        predictedGrade: dash.predictedGrade as string | undefined,
        riskLevel: dash.riskLevel as string | undefined,
        weakestSubject: strength.weakestSubject !== 'N/A' ? strength.weakestSubject : undefined,
        strongestSubject: strength.strongestSubject !== 'N/A' ? strength.strongestSubject : undefined,
        tasksCompleted: Math.round((dash.tasksCompleted as number) ?? 0),
        pendingHomework,
        avgQuizScore30d: quiz.avg,
        quizAttempts30d: quiz.count,
      };
    }),
  );

  const [interventionsSnap, assessmentsSnap] = await Promise.all([
    adminDb.collection('school_interventions').where('schoolId', '==', schoolId).limit(40).get(),
    adminDb.collection('school_assessments').where('schoolId', '==', schoolId).limit(20).get(),
  ]);

  const interventions = interventionsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const sid = d.studentUserId as string;
      return {
        id: doc.id,
        studentId: sid,
        studentName: usersMap.get(sid)?.name ?? 'Student',
        title: (d.title as string) || 'Intervention',
        notes: (d.notes as string) || '',
        status: (d.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE') as 'ACTIVE' | 'CLOSED',
        createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const assessments = assessmentsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const due = tsToIso(d.dueDate);
      return {
        id: doc.id,
        title: (d.title as string) || 'Assessment',
        description: (d.description as string) || '',
        dueDate: due ? due.slice(0, 10) : null,
      };
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  const scopedStudents =
    assignedYearGroups.length > 0
      ? students.filter((s) => yearGroupMatchesAssignment(s.yearGroup, assignedYearGroups))
      : students;

  return {
    schoolId,
    schoolName,
    staffUserId,
    department: department ?? (tutorData?.department as string | undefined),
    subjects,
    yearGroups,
    assignedYearGroups,
    assignedClassNames,
    students: scopedStudents,
    interventions: interventions.filter((i) => scopedStudents.some((s) => s.id === i.studentId)),
    assessments,
  };
}
