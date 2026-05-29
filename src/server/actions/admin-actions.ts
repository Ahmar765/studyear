
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/firebase/client-app';
import { z } from 'zod';
import { adminDb, adminAuth } from '@/lib/firebase/admin-app';
import { UserProfile } from '@/lib/firebase/services/user';
import { AIRequestLog } from '@/server/services/activity';
import { AcuTransaction, SubscriptionType, UserRole } from '@/server/schemas';
import { Timestamp, type QuerySnapshot } from 'firebase-admin/firestore';
import { fetchUserLabelsByIds } from '@/server/lib/admin-user-labels';
import { USD_TO_GBP_ASSUMED } from '@/server/lib/ai-provider-cost-estimate';
import { GBP_PER_ACU_ENTRY_RATE } from '@/data/acu-economics';
import { AI_USAGE_AGG_ROW_CAP } from '@/server/lib/platform-economics-constants';
import * as admin from 'firebase-admin';

/** Firestore types are not JSON-serializable; RSC → client props must be plain objects. */
function firestoreValueToPlain(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (value instanceof Timestamp) {
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((v) => firestoreValueToPlain(v));
    }
    if (typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        if (proto === Object.prototype || proto === null) {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                out[k] = firestoreValueToPlain(v);
            }
            return out;
        }
        if (
            typeof (value as { toDate?: () => Date }).toDate === 'function'
        ) {
            try {
                return (value as { toDate: () => Date }).toDate().toISOString();
            } catch {
                return null;
            }
        }
        return undefined;
    }
    return value;
}
import { HttpsError } from '../lib/errors';
import { resourceMetadata, ResourceType } from '@/data/academic';
import { getPastPaperPdfUrl } from '@/lib/past-paper-url';
import { ACUService } from '../services/acu-service';
import { getVerifiedUser } from '@/server/lib/auth';
import { ensurePlatformAdminAccess, isPlatformAdmin } from '@/server/lib/platform-admin';
import { ADMIN_SUBSCRIPTION_TYPES, isActiveParentPlan } from '@/data/admin-user-plans';
import { sendAdminAcuCreditEmail } from '@/server/lib/mail';
import { resolveListedUserSubscription } from '@/server/lib/parent-plan';

async function assertPlatformAdmin(tokenUser: Awaited<ReturnType<typeof getVerifiedUser>>) {
    if (!tokenUser) throw new Error('You must be signed in.');
    await ensurePlatformAdminAccess(tokenUser.uid, tokenUser.email);
    if (!(await isPlatformAdmin(tokenUser.uid, tokenUser))) {
        throw new Error(
            'Administrator access required. Sign out and sign in again if you were recently promoted.',
        );
    }
}

export type ImpersonationSearchUserRow = {
    uid: string;
    name: string;
    email: string | null;
    role: string;
};

/**
 * Admin-only: substring match on name / email / uid for the View as User support tool.
 * Bounded scan (Firestore limit) — sufficient for typical admin support volumes.
 */
export async function searchUsersForImpersonationAction(
    idToken: string | null | undefined,
    query: string,
): Promise<{ users: ImpersonationSearchUserRow[]; error?: string }> {
    try {
        const u = await getVerifiedUser(idToken);
        await assertPlatformAdmin(u);
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            return { users: [] };
        }

        const snap = await adminDb.collection('users').select('name', 'email', 'role').limit(800).get();
        const users: ImpersonationSearchUserRow[] = snap.docs
            .map((doc) => {
                const d = doc.data();
                return {
                    uid: doc.id,
                    name: typeof d.name === 'string' ? d.name : '',
                    email: typeof d.email === 'string' ? d.email : null,
                    role: typeof d.role === 'string' ? d.role : '',
                };
            })
            .filter((row) => {
                const name = row.name.toLowerCase();
                const email = (row.email || '').toLowerCase();
                return name.includes(q) || email.includes(q) || row.uid.toLowerCase().includes(q);
            })
            .slice(0, 20);

        return { users };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Search failed.';
        return { users: [], error: message };
    }
}

export async function startImpersonationAction(targetUid: string, reason: string): Promise<{ success: boolean; customToken?: string; impersonationLogId?: string; error?: string }> {
    try {
        const functions = getFunctions(getFirebaseApp(), 'europe-west2');
        const startImpersonationFn = httpsCallable(functions, 'startImpersonationSession');
        
        const result = await startImpersonationFn({ targetUid, reason });
        const data = result.data as { customToken?: string, impersonationLogId?: string };

        if (data.customToken && data.impersonationLogId) {
            return { success: true, customToken: data.customToken, impersonationLogId: data.impersonationLogId };
        } else {
            return { success: false, error: 'Failed to retrieve custom token from function.' };
        }
    } catch (error: any) {
        console.error('Error starting impersonation session:', error);
        return { success: false, error: error.message || 'An unexpected server error occurred.' };
    }
}


export async function endImpersonationAction(impersonationLogId: string): Promise<{ success: boolean; error?: string }> {
     try {
        const functions = getFunctions(getFirebaseApp(), 'europe-west2');
        const endImpersonationFn = httpsCallable(functions, 'endImpersonationSession');
        await endImpersonationFn({ impersonationLogId });
        return { success: true };
    } catch (error: any) {
        console.error('Error ending impersonation session:', error);
        return { success: false, error: error.message || 'An unexpected server error occurred.' };
    }
}

const subscriptionTypes: SubscriptionType[] = ADMIN_SUBSCRIPTION_TYPES;
const roleTypes: UserRole[] = ["STUDENT", "PARENT", "PRIVATE_TUTOR", "SCHOOL_ADMIN", "SCHOOL_TUTOR", "ADMIN"];

const UpdateUserSchema = z.object({
  role: z.enum(roleTypes as [string, ...string[]]),
  subscription: z.enum(subscriptionTypes as [string, ...string[]]),
});

export async function updateUserAction(
    targetUid: string,
    data: z.infer<typeof UpdateUserSchema>,
    idToken?: string | null,
): Promise<{ success: boolean; error?: string; }> {
    if (!targetUid) {
        return { success: false, error: "Target User ID is required." };
    }

    const validation = UpdateUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().formErrors.join(', ') };
    }

    try {
        const caller = await getVerifiedUser(idToken);
        if (!caller) {
            return { success: false, error: 'Not authenticated.' };
        }
        if (!(await isPlatformAdmin(caller.uid, caller))) {
            return { success: false, error: 'Platform admin access required.' };
        }

        const plan = validation.data.subscription as SubscriptionType;
        const subscriptionActive =
            plan !== 'FREE' &&
            (validation.data.role !== 'PARENT' || isActiveParentPlan(plan));

        const batch = adminDb.batch();
        const userRef = adminDb.doc(`users/${targetUid}`);
        const subscriptionRef = adminDb.doc(`subscriptions/${targetUid}`);

        batch.update(userRef, {
            role: validation.data.role,
            subscription: plan,
            updatedAt: Timestamp.now(),
        });

        batch.set(
            subscriptionRef,
            {
                type: plan,
                status: subscriptionActive ? 'ACTIVE' : 'INACTIVE',
                updatedAt: Timestamp.now(),
                ...(subscriptionActive
                    ? { adminGranted: true, grantedAt: Timestamp.now() }
                    : {}),
            },
            { merge: true },
        );

        await adminAuth.setCustomUserClaims(targetUid, { role: validation.data.role });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message || 'An unexpected server error occurred.' };
    }
}

export async function getUsersAction(): Promise<{ users: UserProfile[], error: string | null }> {
    try {
        const usersSnapshot = await adminDb.collection('users').get();
        const subscriptionsSnapshot = await adminDb.collection('subscriptions').get();
        
        const subscriptionsMap = new Map<string, any>();
        subscriptionsSnapshot.forEach(doc => {
            subscriptionsMap.set(doc.id, doc.data());
        });

        const users = usersSnapshot.docs.map(doc => {
            const subscription = subscriptionsMap.get(doc.id);
            const data = doc.data();
            const plainData = firestoreValueToPlain(data) as Record<string, unknown>;
            const role = String(plainData.role ?? data.role ?? '');
            const userSubscription = String(plainData.subscription ?? data.subscription ?? '');
            return {
                uid: doc.id,
                ...plainData,
                name: (plainData.name as string) || data.name || 'N/A',
                subscription: resolveListedUserSubscription(
                    role,
                    userSubscription,
                    subscription,
                ) as UserProfile['subscription'],
            } as UserProfile;
        });
        return { users, error: null };
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return { users: [], error: error.message };
    }
}


export type PlatformEconomicsOverview = {
    stripeGrossGbpLast30d: number;
    stripeGrossGbpLast90d: number;
    stripePaymentCountLast30d: number;
    stripePaymentCountLast90d: number;
    aiEstSpendUsdLast30d: number;
    aiEstSpendGbpLast30d: number;
    aiAcusDebitedLast30d: number;
    aiAcuValueGbpLast30d: number;
    aiSuccessfulRequestsLast30d: number;
    /** True when at least `AI_USAGE_AGG_ROW_CAP` AI log docs matched the last-30d filter (totals may be understated). */
    aiLogsHitCap: boolean;
};

function sumStripePaymentPence(snap: QuerySnapshot): number {
    let pence = 0;
    snap.forEach((doc) => {
        const a = doc.data().amount;
        if (typeof a === 'number') pence += a;
    });
    return pence;
}

async function fetchPaymentDocsSince(since: Timestamp) {
    try {
        const snap = await adminDb.collection('payments').where('createdAt', '>=', since).get();
        return snap.docs;
    } catch {
        const snap = await adminDb.collection('payments').limit(500).get();
        const sinceMs = since.toMillis();
        return snap.docs.filter((d) => {
            const created = d.data().createdAt as Timestamp | undefined;
            return created && created.toMillis() >= sinceMs;
        });
    }
}

async function fetchAiLogDocsSince(since: Timestamp) {
    try {
        const snap = await adminDb
            .collection('aiUsageLogs')
            .where('createdAt', '>=', since)
            .limit(AI_USAGE_AGG_ROW_CAP)
            .get();
        return snap.docs;
    } catch {
        const snap = await adminDb.collection('aiUsageLogs').limit(AI_USAGE_AGG_ROW_CAP).get();
        const sinceMs = since.toMillis();
        return snap.docs.filter((d) => {
            const created = d.data().createdAt as Timestamp | undefined;
            return created && created.toMillis() >= sinceMs;
        });
    }
}

export async function getPlatformEconomicsOverviewAction(): Promise<{
    overview: PlatformEconomicsOverview | null;
    error: string | null;
}> {
    try {
        const thirtyTs = Timestamp.fromMillis(Date.now() - 30 * 86400000);
        const ninetyTs = Timestamp.fromMillis(Date.now() - 90 * 86400000);

        const [pay30Docs, pay90Docs, ai30Docs] = await Promise.all([
            fetchPaymentDocsSince(thirtyTs),
            fetchPaymentDocsSince(ninetyTs),
            fetchAiLogDocsSince(thirtyTs),
        ]);

        const p30 = pay30Docs.reduce((sum, doc) => {
            const a = doc.data().amount;
            return sum + (typeof a === 'number' ? a : 0);
        }, 0);
        const p90 = pay90Docs.reduce((sum, doc) => {
            const a = doc.data().amount;
            return sum + (typeof a === 'number' ? a : 0);
        }, 0);

        let aiUsd = 0;
        let aiAcus = 0;
        let aiSuccessfulRequestsLast30d = 0;
        ai30Docs.forEach((doc) => {
            const d = doc.data();
            if (typeof d.realCost === 'number') aiUsd += d.realCost;
            if (typeof d.chargedAcus === 'number') aiAcus += d.chargedAcus;
            if (d.status === 'success') aiSuccessfulRequestsLast30d++;
        });

        const overview: PlatformEconomicsOverview = {
            stripeGrossGbpLast30d: p30 / 100,
            stripeGrossGbpLast90d: p90 / 100,
            stripePaymentCountLast30d: pay30Docs.length,
            stripePaymentCountLast90d: pay90Docs.length,
            aiEstSpendUsdLast30d: Math.round(aiUsd * 10000) / 10000,
            aiEstSpendGbpLast30d: Math.round(aiUsd * USD_TO_GBP_ASSUMED * 100) / 100,
            aiAcusDebitedLast30d: aiAcus,
            aiAcuValueGbpLast30d: Math.round(aiAcus * GBP_PER_ACU_ENTRY_RATE * 100) / 100,
            aiSuccessfulRequestsLast30d,
            aiLogsHitCap: ai30Docs.length >= AI_USAGE_AGG_ROW_CAP,
        };

        return { overview, error: null };
    } catch (error: any) {
        console.error('getPlatformEconomicsOverviewAction:', error);
        return { overview: null, error: error.message };
    }
}

export async function getAiUsageLogsAction(limit = 80): Promise<{ logs: AIRequestLog[], error: string | null }> {
    try {
        const capped = Math.min(Math.max(limit, 10), 200);
        const logsSnapshot = await adminDb.collection('aiUsageLogs').orderBy('createdAt', 'desc').limit(capped).get();
        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as AIRequestLog;
        });
        return { logs, error: null };
    } catch (error: any) {
        console.error("Error fetching AI usage logs:", error);
        return { logs: [], error: error.message };
    }
}

export async function getAcuTransactionsAction(): Promise<{ transactions: AcuTransaction[], error: string | null }> {
    try {
        let snapshot;
        try {
            snapshot = await adminDb.collection('acuTransactions').orderBy('createdAt', 'desc').limit(20).get();
        } catch {
            snapshot = await adminDb.collection('acuTransactions').limit(50).get();
        }
        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp | undefined;
            return {
                ...data,
                id: doc.id,
                createdAt: createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            } as AcuTransaction;
        });
        return { transactions, error: null };
    } catch (error: any) {
        console.error("Error fetching ACU transactions:", error);
        return { transactions: [], error: error.message };
    }
}

export async function getAdminDashboardStatsAction(): Promise<{
  stats: {
    totalStudents: number;
    activeUsers: number;
    schoolCount: number;
    highRiskStudents: number;
    sponsoredStudents: number;
  };
  error: string | null;
}> {
  try {
    const [usersSnapshot, schoolsSnapshot, highRiskSnapshot] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('school_accounts').get(),
      adminDb.collection('student_dashboard_states').where('riskLevel', 'in', ['HIGH', 'CRITICAL']).get(),
    ]);

    let totalStudents = 0;
    
    usersSnapshot.forEach(doc => {
        if (doc.data().role === 'STUDENT') {
            totalStudents++;
        }
    });

    const activeUsers = usersSnapshot.size;
    const schoolCount = schoolsSnapshot.size;
    const highRiskStudents = highRiskSnapshot.size;
    const sponsoredStudents = 0;

    return {
      stats: {
        totalStudents,
        activeUsers,
        schoolCount,
        highRiskStudents,
        sponsoredStudents,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error fetching admin dashboard stats:", error);
    return { stats: { totalStudents: 0, activeUsers: 0, schoolCount: 0, highRiskStudents: 0, sponsoredStudents: 0 }, error: error.message };
  }
}

const ResourceUploadSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  /** Final HTTPS URL (direct link or Cloudinary URL after PDF upload). Validated in action. */
  url: z.string().optional(),
  type: z.enum(Object.keys(resourceMetadata) as [ResourceType, ...ResourceType[]]),
  subject: z.string().min(1, 'Subject is required.'),
  topic: z.string().min(1, 'Topic is required.'),
  level: z.string().min(1, 'Level is required.'),
  licenseType: z.enum(['Standard YouTube', 'Creative Commons', 'Other']),
  attributionText: z.string().optional(),
});

export async function addResourceUploadAction(values: z.infer<typeof ResourceUploadSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const urlTrim = (values.url ?? '').trim();
        if (!urlTrim) {
            return { success: false, error: 'Provide a URL or upload a PDF for past papers.' };
        }
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(urlTrim);
        } catch {
            return { success: false, error: 'Invalid URL.' };
        }
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { success: false, error: 'URL must use http:// or https://.' };
        }

        const uploadRef = adminDb.collection('resource_uploads').doc();
        await uploadRef.set({
            ...values,
            url: urlTrim,
            videoUrl: values.type === 'VIDEO' ? urlTrim : null,
            fileUrl: values.type !== 'VIDEO' ? urlTrim : null,
            uploadedById: 'admin', // Placeholder for current admin user
            approvalStatus: 'PENDING',
            createdAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error adding resource upload:", error);
        return { success: false, error: error.message };
    }
}

export type UploadedResource = {
    uploadId: string;
    title: string;
    type: ResourceType;
    subject: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
};

export async function getPendingResourcesAction(): Promise<{ resources: UploadedResource[], error?: string }> {
    try {
        const snapshot = await adminDb.collection('resource_uploads').where('approvalStatus', '==', 'PENDING').orderBy('createdAt', 'desc').get();
        const resources = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uploadId: doc.id,
                title: data.title,
                type: data.type,
                subject: data.subject,
                approvalStatus: data.approvalStatus,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            } as UploadedResource;
        });
        return { resources };
    } catch (error: any) {
        console.error("Error getting pending resources:", error);
        return { resources: [], error: error.message };
    }
}

const ReviewSchema = z.object({
    resourceId: z.string(),
    decision: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().optional(),
});

export async function reviewResourceAction(values: z.infer<typeof ReviewSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const { resourceId, decision, rejectionReason } = values;
        const uploadRef = adminDb.collection('resource_uploads').doc(resourceId);

        const dataToUpdate: { approvalStatus: 'APPROVED' | 'REJECTED', rejectionReason?: string | null, approvedAt?: Timestamp } = {
            approvalStatus: decision,
        };

        if (decision === 'REJECTED') {
            dataToUpdate.rejectionReason = rejectionReason || 'No reason provided.';
        } else {
            dataToUpdate.approvedAt = Timestamp.now();
        }
        
        await uploadRef.update(dataToUpdate);

        // If approved, create a public resource record.
        if (decision === 'APPROVED') {
            const uploadDoc = await uploadRef.get();
            const uploadData = uploadDoc.data();
            if (uploadData) {
                const resourceRef = adminDb.collection('resources').doc();
                const fileUrlRaw =
                    (typeof uploadData.fileUrl === 'string' && uploadData.fileUrl) ||
                    (typeof uploadData.url === 'string' && uploadData.url) ||
                    null;
                const fileUrl =
                    uploadData.type === 'PAST_PAPER' && fileUrlRaw
                        ? getPastPaperPdfUrl(fileUrlRaw) || fileUrlRaw
                        : fileUrlRaw;
                const isVideo = uploadData.type === 'VIDEO';
                await resourceRef.set({
                    type: uploadData.type,
                    title: uploadData.title ?? 'Resource',
                    topic: uploadData.topic ?? '',
                    subject: uploadData.subject ?? 'General',
                    level: uploadData.level ?? '',
                    url: fileUrl,
                    videoUrl: isVideo ? fileUrl : uploadData.videoUrl ?? null,
                    fileUrl: !isVideo ? fileUrl : null,
                    approvalStatus: 'APPROVED',
                    resourceId: resourceRef.id,
                    createdAt: Timestamp.now(),
                });

                const countRef = adminDb.collection('resourceCounts').doc(String(uploadData.type));
                await countRef.set(
                    {
                        total: admin.firestore.FieldValue.increment(1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true },
                );

                if (uploadData.type === 'PAST_PAPER' && fileUrl) {
                    const subjectId =
                        typeof uploadData.subject === 'string' && uploadData.subject.trim()
                            ? uploadData.subject.trim().toUpperCase()
                            : 'GENERAL';
                    const paperRef = adminDb.collection('past_papers').doc();
                    await paperRef.set({
                        subjectId,
                        examBoard:
                            typeof uploadData.topic === 'string' ? uploadData.topic : null,
                        title: uploadData.title ?? 'Past paper',
                        paperYear: new Date().getFullYear(),
                        paperSeries:
                            typeof uploadData.level === 'string' ? uploadData.level : null,
                        fileUrl,
                        active: true,
                        sourceUploadId: values.resourceId,
                        createdAt: Timestamp.now(),
                    });
                }
            }
        }
        
        return { success: true };
    } catch (error: any) {
         console.error("Error reviewing resource:", error);
        return { success: false, error: error.message };
    }
}

export async function linkParentToStudentAction(studentId: string, parentId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const [studentSnap, parentSnap] = await Promise.all([
            adminDb.collection('users').doc(studentId).get(),
            adminDb.collection('users').doc(parentId).get()
        ]);

        if (!studentSnap.exists) throw new HttpsError('not-found', 'Student user not found.');
        if (!parentSnap.exists) throw new HttpsError('not-found', 'Parent user not found.');

        if (studentSnap.data()?.role !== 'STUDENT') throw new HttpsError('failed-precondition', 'Target user is not a student.');
        if (parentSnap.data()?.role !== 'PARENT') throw new HttpsError('failed-precondition', 'Target user is not a parent.');
        
        const linkId = `${studentId}_${parentId}`;
        const linkRef = adminDb.collection('parent_student_links').doc(linkId);

        if ((await linkRef.get()).exists) {
            return { success: true }; // Link already exists, idempotent success
        }

        await linkRef.set({
            studentId,
            parentId,
            status: 'APPROVED',
            createdAt: Timestamp.now(),
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error linking parent to student:", error);
        return { success: false, error: error.message || "An unexpected server error occurred." };
    }
}


// Tutor Management Actions

export type TutorProfileData = {
    userId: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    bio?: string;
    headline?: string;
    subjects?: string[];
    levels?: string[];
    tutorType?: string;
    qualifications?: string;
    hourlyRate?: number;
    onboardingPaid?: boolean;
    commissionRate?: number;
    reviewedAt?: string;
    createdAt?: string;
};

export interface TutorApplication extends TutorProfileData {
    displayName: string;
    email: string;
    role: 'PRIVATE_TUTOR' | 'SCHOOL_TUTOR';
}

export async function getTutorApplicationsAction(): Promise<{ applications: TutorApplication[], error?: string }> {
    try {
        const tutorProfilesSnapshot = await adminDb.collection('tutor_profiles').get();
        if (tutorProfilesSnapshot.empty) {
            return { applications: [] };
        }

        const tutorIds = tutorProfilesSnapshot.docs.map((doc) => doc.id);
        const userLabels = await fetchUserLabelsByIds(tutorIds);
        const userRoles = new Map<string, string>();
        for (let i = 0; i < tutorIds.length; i += 30) {
            const chunk = tutorIds.slice(i, i + 30);
            if (!chunk.length) continue;
            const usersSnap = await adminDb
                .collection('users')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();
            usersSnap.forEach((userDoc) => {
                const roleVal = userDoc.data()?.role;
                if (typeof roleVal === 'string') userRoles.set(userDoc.id, roleVal);
            });
        }

        const applications: TutorApplication[] = [];
        tutorProfilesSnapshot.forEach((doc) => {
            const profileData = firestoreValueToPlain(doc.data()) as TutorProfileData;
            const label = userLabels[doc.id];
            const roleRaw = userRoles.get(doc.id);
            const role =
                typeof roleRaw === 'string'
                    ? (roleRaw.toUpperCase().trim() as TutorApplication['role'])
                    : ('PRIVATE_TUTOR' as const);

            applications.push({
                ...profileData,
                userId: doc.id,
                approvalStatus: profileData.approvalStatus ?? 'PENDING',
                displayName: label?.displayName ?? 'Unknown tutor',
                email: label?.email ?? '—',
                role,
            });
        });

        const privateTutorApplications = applications.filter(
            (app) => app.role === 'PRIVATE_TUTOR',
        );

        privateTutorApplications.sort((a, b) => {
            const rank = (s: string) => (s === 'PENDING' ? 0 : s === 'APPROVED' ? 1 : 2);
            return rank(a.approvalStatus) - rank(b.approvalStatus);
        });

        return { applications: privateTutorApplications };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not load applications.';
        console.error('Error fetching tutor applications:', error);
        return { applications: [], error: message };
    }
}

const ReviewTutorSchema = z.object({
    idToken: z.string().min(1),
    tutorId: z.string().min(1),
    decision: z.enum(['APPROVED', 'REJECTED']),
});

export async function reviewTutorApplicationAction(
    values: z.infer<typeof ReviewTutorSchema>,
): Promise<{ success: boolean; error?: string }> {
    try {
        const parsed = ReviewTutorSchema.parse(values);
        const adminUser = await getVerifiedUser(parsed.idToken);
        await assertPlatformAdmin(adminUser);

        const profileRef = adminDb.collection('tutor_profiles').doc(parsed.tutorId);
        const profileSnap = await profileRef.get();
        if (!profileSnap.exists) {
            return { success: false, error: 'Tutor profile not found.' };
        }

        const profileData = profileSnap.data() as Record<string, unknown>;
        const tutorEmail = typeof profileData.email === 'string' ? profileData.email : null;
        const tutorName = typeof profileData.displayName === 'string' ? profileData.displayName : null;

        // Fetch email/name from users doc if not on profile
        let resolvedEmail = tutorEmail;
        let resolvedName = tutorName;
        if (!resolvedEmail || !resolvedName) {
            const userSnap = await adminDb.collection('users').doc(parsed.tutorId).get();
            const userData = userSnap.data() as Record<string, unknown> | undefined;
            resolvedEmail = resolvedEmail ?? (typeof userData?.email === 'string' ? userData.email : null);
            resolvedName = resolvedName ?? (typeof userData?.name === 'string' ? userData.name : null);
        }

        await profileRef.update({
            approvalStatus: parsed.decision,
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await adminDb.collection('users').doc(parsed.tutorId).set(
            {
                tutorApproved: parsed.decision === 'APPROVED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        // Send notification email to tutor
        if (resolvedEmail) {
            const { sendPlatformEmail } = await import('@/server/lib/mail');
            if (parsed.decision === 'APPROVED') {
                await sendPlatformEmail({
                    to: resolvedEmail,
                    subject: 'Your StudYear tutor account has been approved!',
                    html: `
                        <p>Hi ${resolvedName ?? 'there'},</p>
                        <p>Great news — your tutor application on <strong>StudYear</strong> has been <strong>approved</strong>.</p>
                        <p>Your profile is now live on the marketplace. Log in to complete your Command Centre setup and start accepting students.</p>
                        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://studyear.com'}/tutor/dashboard" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Go to my dashboard</a></p>
                        <p>Welcome to the StudYear tutor network!</p>
                        <p>— The StudYear Team</p>
                    `,
                    text: `Hi ${resolvedName ?? 'there'},\n\nYour tutor application on StudYear has been approved! Log in to your dashboard at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://studyear.com'}/tutor/dashboard.\n\n— The StudYear Team`,
                });
            } else {
                await sendPlatformEmail({
                    to: resolvedEmail,
                    subject: 'Update on your StudYear tutor application',
                    html: `
                        <p>Hi ${resolvedName ?? 'there'},</p>
                        <p>Thank you for applying to join StudYear as a private tutor.</p>
                        <p>After reviewing your application, we are unable to approve your account at this time.</p>
                        <p>If you believe this is a mistake or would like to discuss your application, please reply to this email or contact us at <a href="mailto:contact@studyear.com">contact@studyear.com</a>.</p>
                        <p>— The StudYear Team</p>
                    `,
                    text: `Hi ${resolvedName ?? 'there'},\n\nThank you for applying to join StudYear as a tutor. After review, we are unable to approve your account at this time. Please contact contact@studyear.com if you have questions.\n\n— The StudYear Team`,
                });
            }
        }

        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Review failed.';
        console.error('Error reviewing tutor application:', error);
        return { success: false, error: message };
    }
}


// School Management Actions
export type SchoolAccountData = {
    id: string;
    name: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
};

export async function getSchoolAccountsAction(): Promise<{ accounts: SchoolAccountData[], error?: string }> {
    try {
        const snapshot = await adminDb.collection('school_accounts').orderBy('createdAt', 'desc').get();
        const accounts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                approvalStatus: data.approvalStatus,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            } as SchoolAccountData;
        });
        return { accounts };
    } catch (error: any) {
        console.error("Error fetching school accounts:", error);
        return { accounts: [], error: error.message };
    }
}

const ReviewSchoolSchema = z.object({
    schoolId: z.string().min(1),
    decision: z.enum(['APPROVED', 'REJECTED']),
});

export async function reviewSchoolAccountAction(values: z.infer<typeof ReviewSchoolSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const { schoolId, decision } = values;
        const schoolRef = adminDb.collection('school_accounts').doc(schoolId);

        await schoolRef.update({
            approvalStatus: decision,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error reviewing school account:", error);
        return { success: false, error: error.message };
    }
}

export async function linkStudentToSchoolAction(studentId: string, schoolId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const [studentSnap, schoolSnap] = await Promise.all([
            adminDb.collection('users').doc(studentId).get(),
            adminDb.collection('school_accounts').doc(schoolId).get()
        ]);

        if (!studentSnap.exists) throw new HttpsError('not-found', 'Student user not found.');
        if (!schoolSnap.exists) throw new HttpsError('not-found', 'School account not found.');

        if (studentSnap.data()?.role !== 'STUDENT') throw new HttpsError('failed-precondition', 'Target user is not a student.');
        
        const profileRef = adminDb.collection('student_profiles').doc(studentId);

        await profileRef.set({
            schoolAccountId: schoolId,
        }, { merge: true });

        return { success: true };

    } catch (error: any) {
        console.error("Error linking student to school:", error);
        return { success: false, error: error.message || "An unexpected server error occurred." };
    }
}

const AcuAdjustmentSchema = z.object({
    userId: z.string().min(1),
    adminId: z.string().min(1),
    amount: z.coerce.number().int(),
    description: z.string().min(1),
});

export async function adjustAcuBalanceAction(
    input: z.infer<typeof AcuAdjustmentSchema>,
    idToken?: string | null,
): Promise<{ success: boolean; emailSent?: boolean; error?: string }> {
    try {
        const caller = await getVerifiedUser(idToken);
        if (!caller) {
            return { success: false, error: 'Not authenticated.' };
        }
        await assertPlatformAdmin(caller);

        const { userId, adminId, amount, description } = AcuAdjustmentSchema.parse(input);

        const wallet = await ACUService.creditACUs({
            userId,
            amount,
            type: 'ADMIN_ADJUSTMENT',
            description,
            metadata: { adminId },
        });

        let emailSent = false;
        const userSnap = await adminDb.doc(`users/${userId}`).get();
        const userEmail = typeof userSnap.data()?.email === 'string' ? userSnap.data()!.email : null;
        if (userEmail && amount > 0) {
            const mail = await sendAdminAcuCreditEmail({
                email: userEmail,
                name: userSnap.data()?.name as string | undefined,
                acus: amount,
                reason: description,
                newBalance: wallet.balance,
            });
            emailSent = mail.sent;
        }

        return { success: true, emailSent };
    } catch (error: unknown) {
        console.error('Error adjusting ACU balance:', error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.message };
        }
        const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        return { success: false, error: message };
    }
}


export async function suspendUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await adminAuth.updateUser(userId, { disabled: true });
        // Also flag the user in Firestore for UI purposes
        await adminDb.collection('users').doc(userId).update({
            isSuspended: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error(`Error suspending user ${userId}:`, error);
        return { success: false, error: error.message };
    }
}

export async function dismissUserFlagAction(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
            isFlagged: false,
            flagReason: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error(`Error dismissing flag for user ${userId}:`, error);
        return { success: false, error: error.message };
    }
}


export type AnalyticsKpi = {
    totalUsers: number;
    /** Users with `lastLoginAt` in the last 30 days (missing field excluded). */
    returningApprox30d: number;
    /** Users with `createdAt` in the last 30 days. */
    newSignups30d: number;
    /** Rows in `aiUsageLogs` with `createdAt` in the last 30 days. */
    aiRequestsLogged30d: number;
};

function parseFirestoreDate(raw: unknown): Date | null {
    if (raw == null) return null;
    if (raw instanceof Timestamp) {
        try {
            const d = raw.toDate();
            return Number.isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }
    const maybe = raw as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
        try {
            const d = maybe.toDate();
            return Number.isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }
    if (raw instanceof Date) {
        return Number.isNaN(raw.getTime()) ? null : raw;
    }
    if (typeof raw === 'number') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof raw === 'string') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function ymBucketKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelForYmKey(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) return ym;
    return new Date(y, m - 1, 15).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

function weekStartMonday(d: Date): Date {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
    copy.setDate(diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

async function getWeeklyStudyTimeData(): Promise<{ week: string; hours: number }[]> {
    const now = new Date();
    const buckets: Record<string, { totalSec: number; userIds: Set<string> }> = {};
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 86400000);
        const key = weekStartMonday(d).toISOString().slice(0, 10);
        buckets[key] = { totalSec: 0, userIds: new Set() };
    }

    try {
        const eightWeeksAgo = Timestamp.fromMillis(now.getTime() - 8 * 7 * 86400000);
        const snap = await adminDb
            .collectionGroup('sessions')
            .where('endedAt', '>=', eightWeeksAgo)
            .limit(2500)
            .get();

        snap.forEach((doc) => {
            const data = doc.data();
            const ended = parseFirestoreDate(data.endedAt);
            if (!ended) return;
            const key = weekStartMonday(ended).toISOString().slice(0, 10);
            const bucket = buckets[key];
            if (!bucket) return;
            const uid = doc.ref.parent.parent?.id;
            const sec = typeof data.durationSec === 'number' ? data.durationSec : 0;
            bucket.totalSec += sec;
            if (uid) bucket.userIds.add(uid);
        });
    } catch (error) {
        console.warn('[analytics] study time query failed:', error);
    }

    return Object.keys(buckets)
        .sort()
        .map((key) => {
            const bucket = buckets[key]!;
            const avgHours =
                bucket.userIds.size > 0
                    ? bucket.totalSec / 3600 / bucket.userIds.size
                    : 0;
            return {
                week: new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                }),
                hours: Math.round(avgHours * 10) / 10,
            };
        });
}

export async function getAnalyticsDataAction(): Promise<{
    newUsersData: { month: string; users: number }[];
    studyTimeData: { week: string; hours: number }[];
    kpi: AnalyticsKpi;
    kpiWarnings: string[];
    error: string | null;
}> {
    const defaultKpi: AnalyticsKpi = {
        totalUsers: 0,
        returningApprox30d: 0,
        newSignups30d: 0,
        aiRequestsLogged30d: 0,
    };
    const kpiWarnings: string[] = [];

    try {
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
        const oneYearTs = Timestamp.fromDate(oneYearAgo);
        const thirtyTs = Timestamp.fromDate(thirtyAgo);

        const bucketKeys: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            bucketKeys.push(ymBucketKey(d));
        }
        const counts: Record<string, number> = {};
        for (const k of bucketKeys) counts[k] = 0;

        const [
            seriesResult,
            totalUsersResult,
            returningResult,
            signupsResult,
            aiLogsResult,
        ] = await Promise.allSettled([
            adminDb.collection('users').where('createdAt', '>=', oneYearTs).get(),
            adminDb.collection('users').count().get(),
            adminDb.collection('users').where('lastLoginAt', '>=', thirtyTs).count().get(),
            adminDb.collection('users').where('createdAt', '>=', thirtyTs).count().get(),
            adminDb.collection('aiUsageLogs').where('createdAt', '>=', thirtyTs).count().get(),
        ]);

        if (seriesResult.status === 'fulfilled') {
            seriesResult.value.forEach((doc) => {
                const createdAt = parseFirestoreDate(doc.data()?.createdAt);
                if (!createdAt) return;
                const key = ymBucketKey(createdAt);
                if (Object.prototype.hasOwnProperty.call(counts, key)) {
                    counts[key]++;
                }
            });
        } else {
            kpiWarnings.push(
                `New-user chart query failed: ${seriesResult.reason instanceof Error ? seriesResult.reason.message : String(seriesResult.reason)}`,
            );
        }

        let totalUsers = 0;
        if (totalUsersResult.status === 'fulfilled') {
            totalUsers = totalUsersResult.value.data().count;
        } else {
            kpiWarnings.push(
                `Total users count failed: ${totalUsersResult.reason instanceof Error ? totalUsersResult.reason.message : String(totalUsersResult.reason)}`,
            );
        }

        let returningApprox30d = 0;
        if (returningResult.status === 'fulfilled') {
            returningApprox30d = returningResult.value.data().count;
        } else {
            kpiWarnings.push(
                `Returning users (lastLoginAt) count failed — add Firestore index if requested: ${returningResult.reason instanceof Error ? returningResult.reason.message : String(returningResult.reason)}`,
            );
        }

        let newSignups30d = 0;
        if (signupsResult.status === 'fulfilled') {
            newSignups30d = signupsResult.value.data().count;
        } else {
            kpiWarnings.push(
                `New sign-ups count failed: ${signupsResult.reason instanceof Error ? signupsResult.reason.message : String(signupsResult.reason)}`,
            );
        }

        let aiRequestsLogged30d = 0;
        if (aiLogsResult.status === 'fulfilled') {
            aiRequestsLogged30d = aiLogsResult.value.data().count;
        } else {
            kpiWarnings.push(
                `AI usage log count failed — check composite index on aiUsageLogs.createdAt: ${aiLogsResult.reason instanceof Error ? aiLogsResult.reason.message : String(aiLogsResult.reason)}`,
            );
        }

        const newUsersData = bucketKeys.map((ym) => ({
            month: labelForYmKey(ym),
            users: counts[ym] ?? 0,
        }));

        const studyTimeData = await getWeeklyStudyTimeData();

        return {
            newUsersData,
            studyTimeData,
            kpi: {
                totalUsers,
                returningApprox30d,
                newSignups30d,
                aiRequestsLogged30d,
            },
            kpiWarnings,
            error: null,
        };
    } catch (error: any) {
        console.error('Error fetching analytics data:', error);
        return {
            newUsersData: [],
            studyTimeData: [],
            kpi: defaultKpi,
            kpiWarnings,
            error: error.message,
        };
    }
}


export async function deleteUserAction(
    targetUserId: string,
    adminIdToken?: string | null,
): Promise<{ success: boolean; error?: string }> {
    if (!targetUserId?.trim()) {
        return { success: false, error: 'User ID is required.' };
    }

    try {
        const { getVerifiedUser } = await import('@/server/lib/auth');
        const adminUser = await getVerifiedUser(adminIdToken);
        if (!adminUser) {
            return { success: false, error: 'You must be signed in as an administrator.' };
        }
        await ensurePlatformAdminAccess(adminUser.uid, adminUser.email);
        if (!(await isPlatformAdmin(adminUser.uid, adminUser))) {
            return {
                success: false,
                error: 'Administrator access required. Sign out and sign in again if you were recently promoted.',
            };
        }
        if (adminUser.uid === targetUserId) {
            return { success: false, error: 'You cannot delete your own account.' };
        }

        const batch = adminDb.batch();
        const userRef = adminDb.doc(`users/${targetUserId}`);
        batch.delete(userRef);
        batch.delete(adminDb.doc(`subscriptions/${targetUserId}`));
        batch.delete(adminDb.doc(`acuWallets/${targetUserId}`));
        batch.delete(adminDb.doc(`student_profiles/${targetUserId}`));
        batch.delete(adminDb.doc(`parent_profiles/${targetUserId}`));
        batch.delete(adminDb.doc(`tutor_profiles/${targetUserId}`));
        batch.delete(adminDb.doc(`student_dashboard_states/${targetUserId}`));

        const staffSnap = await adminDb
            .collection('school_staff')
            .where('userId', '==', targetUserId)
            .get();
        staffSnap.docs.forEach((d) => batch.delete(d.ref));

        const parentLinks = await adminDb
            .collection('parent_student_links')
            .where('parentId', '==', targetUserId)
            .get();
        parentLinks.docs.forEach((d) => batch.delete(d.ref));

        const studentLinks = await adminDb
            .collection('parent_student_links')
            .where('studentId', '==', targetUserId)
            .get();
        studentLinks.docs.forEach((d) => batch.delete(d.ref));

        await batch.commit();

        try {
            await adminAuth.deleteUser(targetUserId);
        } catch (authErr: unknown) {
            const code = (authErr as { code?: string })?.code;
            if (code !== 'auth/user-not-found') {
                throw authErr;
            }
        }

        return { success: true };
    } catch (error: unknown) {
        console.error(`Error deleting user ${targetUserId}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Could not delete user.',
        };
    }
}

export async function getRecentPaymentsAction(): Promise<{ payments: any[], error: string | null }> {
    try {
        let snapshot;
        try {
            snapshot = await adminDb.collection('payments').orderBy('createdAt', 'desc').limit(10).get();
        } catch {
            snapshot = await adminDb.collection('payments').limit(30).get();
        }
        const payments = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp | undefined;
            return {
                id: doc.id,
                userId: typeof data.userId === 'string' ? data.userId : '',
                amount: typeof data.amount === 'number' ? data.amount : 0,
                currency: typeof data.currency === 'string' ? data.currency : 'gbp',
                productCode: data.productCode ?? null,
                status: data.status ?? null,
                createdAt: createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            };
        });
        return { payments, error: null };
    } catch (error: any) {
        console.error("Error fetching recent payments:", error);
        return { payments: [], error: error.message };
    }
}
