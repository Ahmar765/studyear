import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

const FIRESTORE_IN_LIMIT = 30;

export async function fetchUserLabelsByIds(
  userIds: string[],
): Promise<Record<string, { displayName: string; email: string }>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const userMap: Record<string, { displayName: string; email: string }> = {};
  for (let i = 0; i < unique.length; i += FIRESTORE_IN_LIMIT) {
    const chunk = unique.slice(i, i + FIRESTORE_IN_LIMIT);
    const userDocs = await adminDb
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    userDocs.forEach((doc) => {
      userMap[doc.id] = {
        displayName: doc.data().name || 'N/A',
        email: doc.data().email,
      };
    });
  }
  return userMap;
}
