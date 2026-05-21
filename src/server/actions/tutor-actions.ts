'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { getVerifiedUser } from '@/server/lib/auth';
import { resolveUserRole } from '@/server/lib/user-role';
import { HttpsError } from '@/server/lib/errors';
import {
  buildTutorDashboardPayload,
  profileToListing,
  type RawTutorProfile,
} from '@/server/services/tutor-dashboard-intelligence';
import { fetchLiveTutorContext } from '@/server/services/tutor-live-data';
import type {
  TutorDashboardPayload,
  TutorIdentityType,
  TutorListingCard,
} from '@/types/tutor-dashboard';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const optionalHttpsUrl = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    const t = (v ?? '').trim();
    return t.length ? t : null;
  })
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: 'Image URL must start with http:// or https://',
  });

async function requirePrivateTutor(idToken: string | null | undefined) {
  const tokenUser = await getVerifiedUser(idToken);
  if (!tokenUser) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  const role = await resolveUserRole(tokenUser.uid, tokenUser);
  if (role !== 'PRIVATE_TUTOR') {
    throw new HttpsError('permission-denied', 'Private tutor access only.');
  }
  return { uid: tokenUser.uid, tokenUser };
}

export interface TutorListing {
  uid: string;
  name?: string;
  profileImageUrl?: string;
  bio?: string;
  hourlyRate?: number;
  subjects: string[];
}

function flattenSubjects(subjects: unknown): string[] {
  if (!subjects) return [];
  if (Array.isArray(subjects)) return subjects.filter(Boolean) as string[];
  if (typeof subjects === 'object') return Object.values(subjects as Record<string, string[]>).flat();
  return [];
}

function profileFromDoc(id: string, data: admin.firestore.DocumentData): RawTutorProfile {
  return {
    userId: id,
    approvalStatus: data.approvalStatus ?? 'PENDING',
    onboardingComplete: data.onboardingComplete === true,
    tutorType: data.tutorType,
    headline: data.headline,
    bio: data.bio,
    subjects: data.subjects,
    levels: data.levels,
    languages: data.languages,
    hourlyRate: data.hourlyRate,
    teachingStyle: data.teachingStyle,
    whyStudentsLove: data.whyStudentsLove,
    successStories: data.successStories,
    availability: data.availability,
    verifiedId: data.verifiedId,
    verifiedDbs: data.verifiedDbs,
    verifiedQualifications: data.verifiedQualifications,
    aiTeachingCertified: data.aiTeachingCertified,
    topRated: data.topRated,
    examSpecialist: data.examSpecialist,
    rating: data.rating,
    reviewCount: data.reviewCount,
    commissionRate: data.commissionRate,
  };
}

export async function getTutorDashboardDataAction(
  idToken?: string | null,
): Promise<{ success: boolean; data?: TutorDashboardPayload; error?: string }> {
  try {
    const { uid } = await requirePrivateTutor(idToken);

    const profileSnap = await adminDb.collection('tutor_profiles').doc(uid).get();
    if (!profileSnap.exists) {
      throw new HttpsError('not-found', 'Tutor profile not found.');
    }

    const profile = profileFromDoc(uid, profileSnap.data()!);
    const live = await fetchLiveTutorContext(uid);
    const userSnap = await adminDb.collection('users').doc(uid).get();

    return {
      success: true,
      data: buildTutorDashboardPayload(profile, userSnap.data() ?? {}, live),
    };
  } catch (e) {
    const message = e instanceof HttpsError ? e.message : e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

const OnboardingSchema = z.object({
  step: z.number().min(1).max(5),
  fullName: z.string().min(1).max(120).optional(),
  dob: z.string().max(32).optional(),
  profileImageUrl: optionalHttpsUrl,
  coverImageUrl: optionalHttpsUrl,
  tutorType: z
    .enum([
      'ACADEMIC',
      'EXAM_SPECIALIST',
      'STEM',
      'LANGUAGE',
      'UNIVERSITY_MENTOR',
      'SEN_SUPPORT',
      'HOMEWORK_COACH',
    ])
    .optional(),
  headline: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  subjects: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hourlyRate: z.number().min(10).max(200).optional(),
  teachingStyle: z.string().max(500).optional(),
  whyStudentsLove: z.string().max(1000).optional(),
  successStories: z.string().max(1000).optional(),
  availability: z.string().max(200).optional(),
  verifiedId: z.boolean().optional(),
  verifiedDbs: z.boolean().optional(),
  verifiedQualifications: z.boolean().optional(),
  aiTeachingCertified: z.boolean().optional(),
  examSpecialist: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function saveTutorOnboardingAction(
  idToken: string | null | undefined,
  values: z.infer<typeof OnboardingSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { uid } = await requirePrivateTutor(idToken);

    const parsed = OnboardingSchema.parse(values);
    const ref = adminDb.collection('tutor_profiles').doc(uid);
    const update: Record<string, unknown> = {
      onboardingStep: parsed.step,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (parsed.tutorType) update.tutorType = parsed.tutorType;
    if (parsed.headline !== undefined) update.headline = parsed.headline;
    if (parsed.bio !== undefined) update.bio = parsed.bio;
    if (parsed.subjects) update.subjects = parsed.subjects;
    if (parsed.levels) update.levels = parsed.levels;
    if (parsed.languages) update.languages = parsed.languages;
    if (parsed.hourlyRate !== undefined) update.hourlyRate = parsed.hourlyRate;
    if (parsed.teachingStyle !== undefined) update.teachingStyle = parsed.teachingStyle;
    if (parsed.whyStudentsLove !== undefined) update.whyStudentsLove = parsed.whyStudentsLove;
    if (parsed.successStories !== undefined) update.successStories = parsed.successStories;
    if (parsed.availability !== undefined) update.availability = parsed.availability;
    if (parsed.verifiedId !== undefined) update.verifiedId = parsed.verifiedId;
    if (parsed.verifiedDbs !== undefined) update.verifiedDbs = parsed.verifiedDbs;
    if (parsed.verifiedQualifications !== undefined) update.verifiedQualifications = parsed.verifiedQualifications;
    if (parsed.aiTeachingCertified !== undefined) update.aiTeachingCertified = parsed.aiTeachingCertified;
    if (parsed.examSpecialist !== undefined) update.examSpecialist = parsed.examSpecialist;
    if (parsed.onboardingComplete) {
      update.onboardingComplete = true;
      await adminDb.collection('users').doc(uid).update({ onboardingComplete: true });
    }

    await ref.set(update, { merge: true });

    const userPatch: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (parsed.fullName?.trim()) userPatch.name = parsed.fullName.trim();
    if (parsed.dob !== undefined) userPatch.dob = parsed.dob.trim() || null;
    if (parsed.profileImageUrl !== undefined) userPatch.profileImageUrl = parsed.profileImageUrl;
    if (parsed.coverImageUrl !== undefined) userPatch.coverImageUrl = parsed.coverImageUrl;
    if (Object.keys(userPatch).length > 1) {
      await adminDb.collection('users').doc(uid).set(userPatch, { merge: true });
    }

    return { success: true };
  } catch (e) {
    if (e instanceof HttpsError) {
      return { success: false, error: e.message };
    }
    if (e instanceof z.ZodError) {
      return { success: false, error: e.errors.map((err) => err.message).join(', ') };
    }
    const message = e instanceof Error ? e.message : 'Save failed';
    return { success: false, error: message };
  }
}

export async function getTutorOnboardingStatusAction(
  idToken?: string | null,
): Promise<{
  success: boolean;
  step?: number;
  onboardingComplete?: boolean;
  profile?: RawTutorProfile;
  account?: {
    fullName: string;
    dob: string;
    profileImageUrl: string;
    coverImageUrl: string;
  };
  error?: string;
}> {
  try {
    const user = await getVerifiedUser(idToken);
    if (!user) return { success: false, error: 'Not authenticated.' };
    const [snap, userSnap] = await Promise.all([
      adminDb.collection('tutor_profiles').doc(user.uid).get(),
      adminDb.collection('users').doc(user.uid).get(),
    ]);
    if (!snap.exists) return { success: false, error: 'Profile not found' };
    const data = snap.data()!;
    const u = userSnap.data() ?? {};
    return {
      success: true,
      step: (data.onboardingStep as number) ?? 1,
      onboardingComplete: data.onboardingComplete === true,
      profile: profileFromDoc(user.uid, data),
      account: {
        fullName: (u.name as string) ?? '',
        dob: (u.dob as string) ?? '',
        profileImageUrl: (u.profileImageUrl as string) ?? '',
        coverImageUrl: (u.coverImageUrl as string) ?? '',
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export type MarketplaceFilters = {
  query?: string;
  subject?: string;
  maxPrice?: number;
  level?: string;
  aiOnly?: boolean;
  examSpecialist?: boolean;
  topRated?: boolean;
};

export async function getTutorListingsAction(
  filters: MarketplaceFilters,
): Promise<{ tutors: TutorListingCard[]; error?: string }> {
  try {
    const query: admin.firestore.Query = adminDb
      .collection('tutor_profiles')
      .where('approvalStatus', '==', 'APPROVED');

    const approvedTutorsSnapshot = await query.get();
    if (approvedTutorsSnapshot.empty) return { tutors: [] };

    const tutorIds = approvedTutorsSnapshot.docs.map((doc) => doc.id);
    const usersMap = new Map<string, admin.firestore.DocumentData>();
    for (let i = 0; i < tutorIds.length; i += 10) {
      const chunk = tutorIds.slice(i, i + 10);
      const usersSnapshot = await adminDb
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
        .get();
      usersSnapshot.forEach((doc) => usersMap.set(doc.id, doc.data()));
    }

    let listings: TutorListingCard[] = [];
    approvedTutorsSnapshot.forEach((doc) => {
      const profile = profileFromDoc(doc.id, doc.data());
      const userData = usersMap.get(doc.id);
      if (userData) {
        listings.push(
          profileToListing(profile, {
            name: userData.name as string,
            profileImageUrl: userData.profileImageUrl as string,
          }),
        );
      }
    });

    if (filters.query) {
      const term = filters.query.toLowerCase();
      listings = listings.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.subjects.some((s) => s.toLowerCase().includes(term)) ||
          t.headline?.toLowerCase().includes(term),
      );
    }
    if (filters.subject) {
      const s = filters.subject.toLowerCase();
      listings = listings.filter((t) => t.subjects.some((sub) => sub.toLowerCase().includes(s)));
    }
    if (filters.maxPrice) {
      listings = listings.filter((t) => (t.hourlyRate ?? 999) <= filters.maxPrice!);
    }
    if (filters.level) {
      const l = filters.level.toLowerCase();
      listings = listings.filter((t) => t.levels.some((lv) => lv.toLowerCase().includes(l)));
    }
    if (filters.aiOnly) listings = listings.filter((t) => t.aiEnabled);
    if (filters.examSpecialist) listings = listings.filter((t) => t.badges.includes('Exam Specialist'));
    if (filters.topRated) listings = listings.filter((t) => t.rating >= 4.8);

    listings.sort((a, b) => b.rating - a.rating);
    return { tutors: listings };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tutors';
    console.error('Error fetching tutor listings:', error);
    return { tutors: [], error: message };
  }
}

export async function getTutorPublicProfileAction(
  tutorId: string,
): Promise<{ tutor?: TutorListingCard; error?: string }> {
  try {
    const profileSnap = await adminDb.collection('tutor_profiles').doc(tutorId).get();
    if (!profileSnap.exists || profileSnap.data()?.approvalStatus !== 'APPROVED') {
      return { error: 'Tutor not found' };
    }
    const userSnap = await adminDb.collection('users').doc(tutorId).get();
    const profile = profileFromDoc(tutorId, profileSnap.data()!);
    return {
      tutor: profileToListing(profile, {
        name: userSnap.data()?.name as string,
        profileImageUrl: userSnap.data()?.profileImageUrl as string,
      }),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

const BookSessionSchema = z.object({
  tutorId: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().max(500).optional(),
  preferredAt: z.string().optional(),
});

export async function requestTutorSessionAction(
  idToken: string | null | undefined,
  values: z.infer<typeof BookSessionSchema>,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const user = await getVerifiedUser(idToken);
    if (user.role !== 'STUDENT') {
      throw new HttpsError('permission-denied', 'Students can request sessions.');
    }
    const parsed = BookSessionSchema.parse(values);
    const tutorSnap = await adminDb.collection('tutor_profiles').doc(parsed.tutorId).get();
    if (!tutorSnap.exists || tutorSnap.data()?.approvalStatus !== 'APPROVED') {
      throw new HttpsError('not-found', 'Tutor unavailable.');
    }

    const ref = adminDb.collection('tutor_sessions').doc();
    await ref.set({
      studentId: user.uid,
      tutorId: parsed.tutorId,
      subject: parsed.subject,
      status: 'REQUESTED',
      studentMessage: parsed.message ?? '',
      scheduledAt: parsed.preferredAt ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, sessionId: ref.id };
  } catch (e) {
    const message = e instanceof HttpsError ? e.message : e instanceof Error ? e.message : 'Booking failed';
    return { success: false, error: message };
  }
}

const UpdateSessionSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED']),
});

export async function updateTutorSessionStatusAction(
  idToken: string | null | undefined,
  values: z.infer<typeof UpdateSessionSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { uid } = await requirePrivateTutor(idToken);
    const parsed = UpdateSessionSchema.parse(values);
    const ref = adminDb.collection('tutor_sessions').doc(parsed.sessionId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.tutorId !== uid) {
      throw new HttpsError('not-found', 'Session not found.');
    }
    await ref.update({
      status: parsed.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    const message = e instanceof HttpsError ? e.message : e instanceof Error ? e.message : 'Update failed';
    return { success: false, error: message };
  }
}

/** @deprecated Use TutorListingCard from getTutorListingsAction */
export type { TutorListing };
