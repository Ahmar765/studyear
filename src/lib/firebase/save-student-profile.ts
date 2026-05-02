'use client';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-app';

export interface StudentProfileSavePayload {
  fullName: string;
  dob: string;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  level: string;
  universityCourse?: string | null;
  preferences?: { examBoard?: string };
  subjects: { name: string; targetGrade: string; currentGrade?: string }[];
}

/**
 * Writes only `student_profiles/{uid}` from the browser.
 * Do not batch this with `users/{uid}` — the users collection has a stricter update rule
 * (`role` must stay equal). A failed users write used to reject the whole batch.
 */
export async function saveStudentAcademicClient(uid: string, data: StudentProfileSavePayload): Promise<void> {
  const rawExam = data.preferences?.examBoard;
  const examBoard = rawExam && rawExam !== 'none' ? rawExam : null;

  const subjectsClean = data.subjects.map((s) => ({
    name: String(s.name ?? '').trim(),
    targetGrade: String(s.targetGrade ?? '').trim(),
    ...(s.currentGrade ? { currentGrade: String(s.currentGrade).trim() } : {}),
  }));

  const profileRef = doc(db, 'student_profiles', uid);
  const now = serverTimestamp();

  await setDoc(
    profileRef,
    {
      userId: uid,
      studyLevel: data.level.trim(),
      yearGroup: data.level.trim(),
      examBoard,
      course: data.universityCourse?.trim() || null,
      dob: data.dob?.trim() || null,
      subjects: subjectsClean,
      updatedAt: now,
    },
    { merge: true },
  );
}
