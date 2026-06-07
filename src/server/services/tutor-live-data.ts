import { adminDb } from '@/lib/firebase/admin-app';
import type { StudentProfileData } from '@/lib/firebase/services/user';
import { getSystemSettings } from '@/server/actions/settings-actions';
import * as admin from 'firebase-admin';

export interface LiveTutorSession {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  subject?: string;
  studentMessage?: string;
  aiSupported?: boolean;
}

export interface LiveTutorStudentSnapshot {
  id: string;
  name: string;
  avatarSrc?: string;
  yearGroup?: string;
  progressScore: number;
  weakestSubject?: string;
  strongestSubject?: string;
  subjects: string[];
  pendingStudyTasks: number;
  quizAttempts30d: number;
  avgQuizScore30d: number;
  dashboardUpdatedAt?: string;
}

export interface LiveTutorContext {
  sessions: LiveTutorSession[];
  students: LiveTutorStudentSnapshot[];
  commissionRate: number;
  profileUpdatedAt?: string;
}

function tsToIso(v: unknown): string | undefined {
  if (v && typeof (v as admin.firestore.Timestamp).toDate === 'function') {
    return (v as admin.firestore.Timestamp).toDate().toISOString();
  }
  if (typeof v === 'string') return v;
  return undefined;
}

async function fetchUserNames(ids: string[]): Promise<Map<string, { name: string; avatarSrc?: string }>> {
  const map = new Map<string, { name: string; avatarSrc?: string }>();
  if (ids.length === 0) return map;
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snap = await adminDb
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    snap.forEach((doc) => {
      const d = doc.data();
      map.set(doc.id, {
        name: (d.name as string) ?? 'Student',
        avatarSrc: d.profileImageUrl as string | undefined,
      });
    });
  }
  return map;
}

export async function fetchLiveTutorSessions(tutorId: string): Promise<LiveTutorSession[]> {
  const snap = await adminDb.collection('tutor_sessions').where('tutorId', '==', tutorId).limit(100).get();
  const studentIds = [...new Set(snap.docs.map((d) => d.data().studentId as string).filter(Boolean))];
  const names = await fetchUserNames(studentIds);

  const sessions = snap.docs.map((doc) => {
    const data = doc.data();
    const studentId = data.studentId as string;
    return {
      id: doc.id,
      studentId,
      studentName: names.get(studentId)?.name ?? 'Student',
      status: String(data.status ?? 'REQUESTED'),
      scheduledAt: tsToIso(data.scheduledAt),
      createdAt: tsToIso(data.createdAt),
      updatedAt: tsToIso(data.updatedAt),
      subject: data.subject as string | undefined,
      studentMessage: data.studentMessage as string | undefined,
      aiSupported: data.aiSupported === true,
    };
  });

  return sessions.sort((a, b) => {
    const ta = a.scheduledAt ?? a.createdAt ?? '';
    const tb = b.scheduledAt ?? b.createdAt ?? '';
    return tb.localeCompare(ta);
  });
}

async function countPendingStudyTasks(studentId: string): Promise<number> {
  try {
    const snap = await adminDb
      .collection('study_tasks')
      .where('userId', '==', studentId)
      .where('status', '==', 'pending')
      .limit(50)
      .get();
    return snap.size;
  } catch {
    return 0;
  }
}

async function fetchQuizStats30d(studentId: string): Promise<{ count: number; avg: number }> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const snap = await adminDb.collection('quiz_attempts').where('studentId', '==', studentId).limit(80).get();
  const scores: number[] = [];
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const created = tsToIso(data.createdAt);
    if (created && new Date(created) < since) return;
    const score = typeof data.scorePercent === 'number' ? data.scorePercent : parseFloat(String(data.scorePercent ?? ''));
    if (Number.isFinite(score)) scores.push(score);
  });
  if (scores.length === 0) return { count: 0, avg: 0 };
  return {
    count: scores.length,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  };
}

export async function fetchLiveStudentSnapshots(studentIds: string[]): Promise<LiveTutorStudentSnapshot[]> {
  if (studentIds.length === 0) return [];

  const names = await fetchUserNames(studentIds);
  const snapshots = await Promise.all(
    studentIds.map(async (studentId) => {
      const [profileSnap, dashboardSnap, pendingTasks, quizStats] = await Promise.all([
        adminDb.collection('student_profiles').doc(studentId).get(),
        adminDb.collection('student_dashboard_states').doc(studentId).get(),
        countPendingStudyTasks(studentId),
        fetchQuizStats30d(studentId),
      ]);

      const profile = profileSnap.data() as StudentProfileData | undefined;
      const dashboard = dashboardSnap.exists ? dashboardSnap.data() : null;
      const weak = Array.isArray(dashboard?.weakSubjects)
        ? (dashboard!.weakSubjects as { name?: string }[])[0]
        : dashboard?.weakSubjects
          ? (dashboard.weakSubjects as { name?: string })
          : undefined;
      const strong = Array.isArray(dashboard?.strongSubjects)
        ? (dashboard!.strongSubjects as { name?: string }[])[0]
        : dashboard?.strongSubjects
          ? (dashboard.strongSubjects as { name?: string })
          : undefined;

      const subjects: string[] = [];
      if (Array.isArray(profile?.subjects)) {
        profile.subjects.forEach((s) => {
          if (typeof s === 'string') subjects.push(s);
          else if (s && typeof s === 'object' && 'name' in s) subjects.push(String((s as { name: string }).name));
        });
      }

      return {
        id: studentId,
        name: names.get(studentId)?.name ?? 'Student',
        avatarSrc: names.get(studentId)?.avatarSrc,
        yearGroup: profile?.yearGroup,
        progressScore: Math.round((dashboard?.progressScore as number) ?? 0),
        weakestSubject: weak?.name,
        strongestSubject: strong?.name,
        subjects,
        pendingStudyTasks: pendingTasks,
        quizAttempts30d: quizStats.count,
        avgQuizScore30d: quizStats.avg,
        dashboardUpdatedAt: tsToIso(dashboard?.updatedAt),
      };
    }),
  );

  return snapshots;
}

export async function fetchLiveTutorContext(tutorId: string): Promise<LiveTutorContext> {
  const [sessions, settings, profileSnap] = await Promise.all([
    fetchLiveTutorSessions(tutorId),
    getSystemSettings(),
    adminDb.collection('tutor_profiles').doc(tutorId).get(),
  ]);

  const studentIds = [...new Set(sessions.map((s) => s.studentId).filter(Boolean))];
  const students = await fetchLiveStudentSnapshots(studentIds);

  return {
    sessions,
    students,
    commissionRate: settings.pricingRules?.tutor_commission ?? 15,
    profileUpdatedAt: tsToIso(profileSnap.data()?.updatedAt),
  };
}
