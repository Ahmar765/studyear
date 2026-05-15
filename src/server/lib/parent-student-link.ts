import { adminDb } from '@/lib/firebase/admin-app';
import { deriveParentLinkCode, normalizeParentLinkCode } from '@/lib/parent-link-code';
import * as admin from 'firebase-admin';

export async function isStudentAccount(studentId: string): Promise<boolean> {
  const [userSnap, profileSnap] = await Promise.all([
    adminDb.collection('users').doc(studentId).get(),
    adminDb.collection('student_profiles').doc(studentId).get(),
  ]);

  if (profileSnap.exists) return true;

  const role = String(userSnap.data()?.role ?? '')
    .toUpperCase()
    .trim();
  return role === 'STUDENT' || role === '';
}

/**
 * Persists the link code on the student user doc for indexed lookup.
 * Does not check student subscription — Free and Premium students can link to parents.
 */
export async function ensureStudentParentLinkCode(studentId: string): Promise<string> {
  const code = deriveParentLinkCode(studentId);

  if (!(await isStudentAccount(studentId))) {
    throw new Error('Parent Link Codes are only for student accounts.');
  }

  const ref = adminDb.collection('users').doc(studentId);
  const snap = await ref.get();

  if (snap.exists) {
    if (snap.data()?.parentLinkCode !== code) {
      await ref.set(
        {
          parentLinkCode: code,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  } else {
    await ref.set(
      {
        id: studentId,
        role: 'STUDENT',
        parentLinkCode: code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return code;
}

/** Resolves a Parent Link Code to a student UID. No premium requirement on the student. */
export async function findStudentIdByParentLinkCode(linkCode: string): Promise<string | null> {
  const normalized = normalizeParentLinkCode(linkCode);
  if (!normalized) return null;

  const indexed = await adminDb.collection('users').where('parentLinkCode', '==', normalized).limit(20).get();

  for (const doc of indexed.docs) {
    if (await isStudentAccount(doc.id)) {
      return doc.id;
    }
  }

  // Match by deterministic code — student_profiles is the canonical student list
  const profilesSnap = await adminDb.collection('student_profiles').get();
  for (const doc of profilesSnap.docs) {
    if (deriveParentLinkCode(doc.id) === normalized) {
      await ensureStudentParentLinkCode(doc.id);
      return doc.id;
    }
  }

  // Fallback: all users (covers role casing / missing role on users doc)
  const usersSnap = await adminDb.collection('users').get();
  for (const doc of usersSnap.docs) {
    if (deriveParentLinkCode(doc.id) !== normalized) continue;
    if (!(await isStudentAccount(doc.id))) continue;
    await ensureStudentParentLinkCode(doc.id);
    return doc.id;
  }

  return null;
}

export async function assertParentRole(userId: string): Promise<boolean> {
  const snap = await adminDb.collection('users').doc(userId).get();
  const role = String(snap.data()?.role ?? '')
    .toUpperCase()
    .trim();
  return snap.exists && role === 'PARENT';
}
