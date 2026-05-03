
import { getFirestoreDb } from '@/lib/firebase/client-app';
import {doc, onSnapshot, Timestamp} from 'firebase/firestore';

// Base User data from /users/{uid}
export interface UserData {
  uid: string;
  email: string | null;
  name?: string;
  role: 'STUDENT' | 'PARENT' | 'PRIVATE_TUTOR' | 'SCHOOL_ADMIN' | 'SCHOOL_TUTOR' | 'ADMIN';
  profileImageUrl?: string;
  coverImageUrl?: string;
  onboardingComplete?: boolean;
  /** Set on `/users/{uid}` when the student completes the academic diagnostic (server action). */
  diagnosticComplete?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Student-specific data from /student_profiles/{uid}
export interface StudentProfileData {
  userId: string;
  studyLevel?: string;
  yearGroup?: string;
  course?: string;
  /** Stored on `student_profiles` from profile setup */
  dob?: string;
  examBoard?: string;
  currentGrade?: string;
  targetGrade?: string;
  schoolAccountId?: string;
  subjects?: { name: string; targetGrade: string }[];
}

// Parent-specific data from /parent_profiles/{uid}
export interface ParentProfileData {
    userId: string;
    linkedStudentIds?: string[];
}

export interface SubscriptionData {
    type: "FREE" | "STUDENT_PREMIUM" | "PARENT_PRO" | "PARENT_PRO_PLUS" | "PRIVATE_TUTOR" | "SCHOOL_STARTER" | "SCHOOL_GROWTH" | "SCHOOL_ENTERPRISE";
    status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING_PAYMENT";
    startedAt?: Timestamp;
    expiresAt?: Timestamp;
}


// Represents the unified user object used throughout the client-side application
export type UserProfile = UserData & Partial<StudentProfileData> & Partial<ParentProfileData> & { subscription?: SubscriptionData['type'] };

/**
 * Which top-level profile doc to merge for this user.
 * Must stay aligned with profile-setup: missing/empty `role` is treated as student onboarding,
 * otherwise users with saved `student_profiles` would never get a listener (`role === 'STUDENT'` was too strict).
 */
function profileDocPathForRole(role: unknown): 'student_profiles' | 'parent_profiles' | null {
  if (role === undefined || role === null || role === '') {
    return 'student_profiles';
  }
  const r = String(role).toUpperCase().trim();
  if (r === 'STUDENT') return 'student_profiles';
  if (r === 'PARENT') return 'parent_profiles';
  return null;
}

export function getUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  const db = getFirestoreDb();

  let userData: UserData | null = null;
  let studentProfileData: StudentProfileData | null = null;
  let parentProfileData: ParentProfileData | null = null;
  let subscriptionData: SubscriptionData | null = null;
  let role: UserData['role'] | null = null;

  let unsubUser: (() => void) | null = null;
  let unsubProfile: (() => void) | null = null;
  let unsubSubscription: (() => void) | null = null;

  /** First merged profile must not omit `student_profiles` / `parent_profiles` when subscription fires before that snapshot. */
  let extendedProfileReady = false;

  const combineAndCallback = () => {
    if (userData) {
      const needsExtended = profileDocPathForRole(userData.role) !== null;
      if (needsExtended && !extendedProfileReady) {
        return;
      }
      /** `student_profiles` must win over `parent_profiles` on overlapping keys (e.g. `userId`). */
      const combinedProfile: UserProfile = {
        ...userData,
        ...(parentProfileData || {}),
        ...(studentProfileData || {}),
        subscription: subscriptionData?.type || 'FREE',
      };
      callback(combinedProfile);
    } else {
      callback(null);
    }
  };
  
  const setupProfileListener = (currentRole: UserData['role'] | undefined) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
        studentProfileData = null;
        parentProfileData = null;
      }
      extendedProfileReady = false;

      const which = profileDocPathForRole(currentRole);
      if (which === 'student_profiles') {
          unsubProfile = onSnapshot(doc(db, 'student_profiles', uid), (profileDoc) => {
              extendedProfileReady = true;
              studentProfileData = profileDoc.exists ? profileDoc.data() as StudentProfileData : null;
              combineAndCallback();
          }, (error) => {
              console.error("Error listening to student profile:", error);
              extendedProfileReady = true;
              studentProfileData = null;
              combineAndCallback();
          });
      } else if (which === 'parent_profiles') {
          unsubProfile = onSnapshot(doc(db, 'parent_profiles', uid), (profileDoc) => {
              extendedProfileReady = true;
              parentProfileData = profileDoc.exists ? profileDoc.data() as ParentProfileData : null;
              combineAndCallback();
          }, (error) => {
              console.error("Error listening to parent profile:", error);
              extendedProfileReady = true;
              parentProfileData = null;
              combineAndCallback();
          });
      } else {
          extendedProfileReady = true;
          combineAndCallback();
      }
  }

  unsubSubscription = onSnapshot(doc(db, 'subscriptions', uid), (subDoc) => {
      subscriptionData = subDoc.exists ? subDoc.data() as SubscriptionData : null;
      combineAndCallback();
  }, (error) => {
      console.error(`Error listening to subscription for uid: ${uid}`, error);
      subscriptionData = null;
      combineAndCallback();
  });


  unsubUser = onSnapshot(doc(db, 'users', uid), (userDoc) => {
    if (userDoc.exists) {
      const newUserData = { uid: userDoc.id, ...userDoc.data() } as UserData;
      const newRole = newUserData.role;
      
      if (role !== newRole) {
          role = newRole;
          userData = newUserData;
          setupProfileListener(role);
      } else {
          userData = newUserData;
          combineAndCallback();
      }

    } else {
      console.warn(`User document not found for uid: ${uid}`);
      userData = null;
      callback(null);
    }
  }, (error) => {
    console.error(`Error listening to user document for uid: ${uid}`, error);
    callback(null);
  });

  return () => {
    if (unsubUser) unsubUser();
    if (unsubProfile) unsubProfile();
    if (unsubSubscription) unsubSubscription();
  };
}
