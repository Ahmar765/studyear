import { adminDb } from '@/lib/firebase/admin-app';
import type { StudentProfileData } from '@/lib/firebase/services/user';
import * as admin from 'firebase-admin';
import type { RawStudentRow } from '@/server/services/parent-dashboard-intelligence';
import { resolveWeakestStrongestSubjects } from '@/server/lib/subject-strength';

export interface LiveSubjectRow {
  name: string;
  targetGrade: string;
  currentGrade?: string;
  progressPercent: number;
  momentum: number;
}

export interface LiveSavedResource {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

export interface LiveStudyTask {
  id: string;
  title: string;
  subject: string;
  scheduledAt: string;
  priority: string;
}

function tsToIso(v: unknown): string | undefined {
  if (v && typeof (v as admin.firestore.Timestamp).toDate === 'function') {
    return (v as admin.firestore.Timestamp).toDate().toISOString();
  }
  return undefined;
}

function coerceScorePercent(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseProfileSubjects(profile: StudentProfileData | undefined): LiveSubjectRow[] {
  if (!profile?.subjects || !Array.isArray(profile.subjects)) return [];

  return profile.subjects
    .map((s) => {
      if (typeof s === 'string') {
        return { name: s.trim(), targetGrade: 'N/A', currentGrade: undefined };
      }
      const row = s as { name?: string; targetGrade?: string; currentGrade?: string };
      const name = String(row.name ?? '').trim();
      if (!name) return null;
      return {
        name,
        targetGrade: row.targetGrade?.trim() || 'N/A',
        currentGrade: row.currentGrade?.trim() || undefined,
      };
    })
    .filter((s): s is { name: string; targetGrade: string; currentGrade?: string } => s !== null)
    .map((s) => ({ ...s, progressPercent: 0, momentum: 0 }));
}

export async function buildSubjectProgress(studentId: string, profile: StudentProfileData | undefined): Promise<LiveSubjectRow[]> {
  const base = parseProfileSubjects(profile);
  const quizMap = new Map<string, { avg: number; recent: number; prior: number }>();

  const snap = await adminDb.collection('quiz_attempts').where('studentId', '==', studentId).get();
  const bySubject: Record<string, { score: number; ms: number }[]> = {};

  snap.docs.forEach((doc) => {
    const data = doc.data();
    const subject = String(data.subjectId ?? data.subject ?? '').trim();
    const score = coerceScorePercent(data.scorePercent);
    if (!subject || score === null) return;
    const ms = tsToIso(data.createdAt) ? new Date(tsToIso(data.createdAt)!).getTime() : 0;
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push({ score, ms });
  });

  Object.entries(bySubject).forEach(([subject, entries]) => {
    entries.sort((a, b) => a.ms - b.ms);
    const scores = entries.map((e) => e.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const half = Math.max(1, Math.floor(scores.length / 2));
    const priorSlice = scores.slice(0, Math.max(0, scores.length - half));
    const recentSlice = scores.slice(-half);
    const prior = priorSlice.length ? priorSlice.reduce((a, b) => a + b, 0) / priorSlice.length : avg;
    const recent = recentSlice.length ? recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length : avg;
    quizMap.set(subject, { avg, recent: Math.round(recent), prior: Math.round(prior) });
  });

  const names = new Set<string>();
  base.forEach((s) => names.add(s.name));
  quizMap.forEach((_, name) => names.add(name));

  return Array.from(names).map((name) => {
    const profileRow = base.find((s) => s.name === name);
    const quiz = quizMap.get(name);
    const progressPercent = quiz?.avg ?? 0;
    const momentum = quiz ? quiz.recent - quiz.prior : 0;
    return {
      name,
      targetGrade: profileRow?.targetGrade ?? 'N/A',
      currentGrade: profileRow?.currentGrade,
      progressPercent,
      momentum,
    };
  });
}

async function fetchSavedResources(studentId: string): Promise<LiveSavedResource[]> {
  const snap = await adminDb.collection('users').doc(studentId).collection('saved_resources').get();

  const sorted = snap.docs.slice().sort((a, b) => {
    const ta = (a.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ?? 0;
    const tb = (b.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ?? 0;
    return tb - ta;
  });

  return sorted.slice(0, 20).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? 'Untitled'),
      type: String(data.type ?? 'UNKNOWN'),
      createdAt: tsToIso(data.createdAt) ?? new Date().toISOString(),
    };
  });
}

async function fetchUpcomingStudyTasks(studentId: string): Promise<LiveStudyTask[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 21);

  try {
    const snap = await adminDb
      .collection('study_tasks')
      .where('userId', '==', studentId)
      .where('status', '==', 'pending')
      .where('scheduledAt', '>=', now.toISOString())
      .where('scheduledAt', '<=', end.toISOString())
      .orderBy('scheduledAt', 'asc')
      .limit(12)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? 'Study task'),
        subject: String(data.subjectId ?? 'General'),
        scheduledAt: tsToIso(data.scheduledAt) ?? now.toISOString(),
        priority: String(data.priority ?? 'medium'),
      };
    });
  } catch {
    const snap = await adminDb
      .collection('study_tasks')
      .where('userId', '==', studentId)
      .where('status', '==', 'pending')
      .limit(12)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? 'Study task'),
        subject: String(data.subjectId ?? 'General'),
        scheduledAt: tsToIso(data.scheduledAt) ?? now.toISOString(),
        priority: String(data.priority ?? 'medium'),
      };
    });
  }
}

async function fetchStudyActivity(studentId: string): Promise<NonNullable<RawStudentRow['studyActivity']>> {
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [tasksSnap, quizSnap, dashboardSnap] = await Promise.all([
    adminDb.collection('study_tasks').where('userId', '==', studentId).limit(120).get(),
    adminDb.collection('quiz_attempts').where('studentId', '==', studentId).limit(80).get(),
    adminDb.collection('student_dashboard_states').doc(studentId).get(),
  ]);

  let pendingTasks = 0;
  let completedTasks30d = 0;

  tasksSnap.docs.forEach((doc) => {
    const data = doc.data();
    const status = String(data.status ?? 'pending');
    const scheduled = tsToIso(data.scheduledAt);
    const scheduledMs = scheduled ? new Date(scheduled).getTime() : 0;
    if (status === 'completed' || status === 'done') {
      const completedAt = tsToIso(data.updatedAt) ?? tsToIso(data.completedAt) ?? scheduled;
      const completedMs = completedAt ? new Date(completedAt).getTime() : 0;
      if (completedMs >= since30.getTime()) completedTasks30d += 1;
    } else if (status === 'pending') {
      pendingTasks += 1;
    }
  });

  const quizScores: number[] = [];
  quizSnap.docs.forEach((doc) => {
    const data = doc.data();
    const created = tsToIso(data.createdAt);
    if (!created || new Date(created) < since30) return;
    const score = coerceScorePercent(data.scorePercent);
    if (score !== null) quizScores.push(score);
  });

  const avgQuizScore30d = quizScores.length
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : 0;

  return {
    pendingTasks,
    completedTasks30d,
    quizAttempts30d: quizScores.length,
    avgQuizScore30d,
    dashboardRiskLevel: dashboardSnap.exists
      ? String(dashboardSnap.data()?.riskLevel ?? '').trim() || undefined
      : undefined,
  };
}

export async function fetchLiveStudentRow(studentId: string, partial: Partial<RawStudentRow>): Promise<RawStudentRow> {
  const [userSnap, profileSnap, dashboardSnap, predictionsSnap] = await Promise.all([
    adminDb.collection('users').doc(studentId).get(),
    adminDb.collection('student_profiles').doc(studentId).get(),
    adminDb.collection('student_dashboard_states').doc(studentId).get(),
    adminDb.collection('predictions').where('studentId', '==', studentId).limit(5).get(),
  ]);

  const profile = profileSnap.data() as StudentProfileData | undefined;
  const dashboard = dashboardSnap.exists ? dashboardSnap.data() : null;

  const [subjects, savedResources, studyTasks, studyActivity] = await Promise.all([
    buildSubjectProgress(studentId, profile),
    fetchSavedResources(studentId),
    fetchUpcomingStudyTasks(studentId),
    fetchStudyActivity(studentId),
  ]);

  let predictedGrade: string | undefined;
  const predSorted = predictionsSnap.docs
    .slice()
    .sort((a, b) => (tsToIso(b.data().createdAt) ? 1 : 0) - (tsToIso(a.data().createdAt) ? 1 : 0));
  if (predSorted[0]) {
    const p = predSorted[0].data();
    predictedGrade = String(p.predictedGrade ?? '').trim() || undefined;
  }
  if (!predictedGrade && typeof dashboard?.predictedGrade === 'string') {
    predictedGrade = dashboard.predictedGrade;
  }

  const strength = resolveWeakestStrongestSubjects(subjects);
  const progressFromSubjects =
    subjects.length > 0
      ? Math.round(subjects.reduce((a, s) => a + s.progressPercent, 0) / subjects.length)
      : 0;
  const progress = Math.round(dashboard?.progressScore ?? progressFromSubjects ?? partial.progress ?? 0);

  return {
    id: studentId,
    name: partial.name ?? (userSnap.data()?.name as string) ?? 'Student',
    avatarSrc: partial.avatarSrc ?? (userSnap.data()?.profileImageUrl as string) ?? '',
    yearGroup: partial.yearGroup ?? profile?.yearGroup ?? 'N/A',
    progress,
    weakestSubject: strength.weakestSubject,
    strongestSubject: strength.strongestSubject,
    weakTopic: strength.weakTopic,
    consistency: partial.consistency ?? (progress > 70 ? 'Good' : progress > 40 ? 'Fair' : 'Poor'),
    lastDiagnostic: partial.lastDiagnostic,
    resourceCount: savedResources.length,
    subjects,
    savedResources,
    studyTasks,
    weakSubjects: strength.weakSubjects,
    strongSubjects: strength.strongSubjects,
    dashboardUpdatedAt: tsToIso(dashboard?.updatedAt),
    predictedGrade,
    studyActivity,
  };
}
