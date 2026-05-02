import { adminDb } from '@/lib/firebase/admin-app';
import type { UserProfile } from '@/lib/firebase/services/user';

export async function getUserProfileServer(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = adminDb.doc(`users/${uid}`);
    const studentProfileDocRef = adminDb.doc(`student_profiles/${uid}`);
    const parentProfileDocRef = adminDb.doc(`parent_profiles/${uid}`);
    const subscriptionDocRef = adminDb.doc(`subscriptions/${uid}`);
    
    const [userDocSnap, studentProfileDocSnap, parentProfileDocSnap, subscriptionDocSnap] = await Promise.all([
      userDocRef.get(),
      studentProfileDocRef.get(),
      parentProfileDocRef.get(),
      subscriptionDocRef.get(),
    ]);

    if (userDocSnap.exists) {
        const userData = userDocSnap.data() ?? {};
        const studentData =
          studentProfileDocSnap.exists ? (studentProfileDocSnap.data() ?? {}) : {};
        const parentData = parentProfileDocSnap.exists ? (parentProfileDocSnap.data() ?? {}) : {};
        const subscriptionData =
          subscriptionDocSnap.exists ? (subscriptionDocSnap.data() ?? {}) : {};

        /** Student academic doc must override parent doc on shared keys. */
        return {
            uid,
            ...userData,
            ...parentData,
            ...studentData,
            subscription: (subscriptionData as { type?: string })?.type || 'FREE',
        } as UserProfile;
    }
    console.warn(`No user profile found for UID: ${uid}`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error getting user profile on server:', message, error);
    return null;
  }
}
