import { adminDb } from '@/lib/firebase/admin-app';
import { resolveWeakestStrongestSubjects } from '@/server/lib/subject-strength';
import type { SubjectProgressRow } from '@/server/lib/subject-strength';
import * as admin from 'firebase-admin';

function coerceScorePercent(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function buildSubjectProgressForSync(studentId: string): Promise<SubjectProgressRow[]> {
  const [profileSnap, quizSnap] = await Promise.all([
    adminDb.collection('student_profiles').doc(studentId).get(),
    adminDb.collection('quiz_attempts').where('studentId', '==', studentId).get(),
  ]);

  const profile = profileSnap.data();
  const names = new Set<string>();

  if (profile?.subjects && Array.isArray(profile.subjects)) {
    profile.subjects.forEach((s: unknown) => {
      const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
      if (name) names.add(String(name).trim());
    });
  }

  const bySubject: Record<string, number[]> = {};
  quizSnap.docs.forEach((doc) => {
    const data = doc.data();
    const subject = String(data.subjectId ?? data.subject ?? '').trim();
    const score = coerceScorePercent(data.scorePercent);
    if (!subject || score === null) return;
    names.add(subject);
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(score);
  });

  return Array.from(names).map((name) => {
    const scores = bySubject[name];
    const progressPercent = scores?.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    return { name, progressPercent };
  });
}

export const dashboardSyncService = {
  async updateStudentDashboard(studentId: string) {
    try {
      const subjects = await buildSubjectProgressForSync(studentId);
      const strength = resolveWeakestStrongestSubjects(subjects);

      const avgProgress =
        subjects.length > 0
          ? Math.round(subjects.reduce((a, s) => a + s.progressPercent, 0) / subjects.length)
          : 0;

      const lessonsSnap = await adminDb
        .collection('learning_events')
        .where('studentId', '==', studentId)
        .where('type', '==', 'LESSON_COMPLETED')
        .limit(200)
        .get();

      const dashboardRef = adminDb.collection('student_dashboard_states').doc(studentId);

      await dashboardRef.set(
        {
          studentId,
          progressScore: avgProgress,
          weakSubjects: strength.weakSubjects,
          strongSubjects: strength.strongSubjects,
          tasksCompleted: lessonsSnap.size,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to sync student dashboard:', error);
      return { success: false };
    }
  },
};
