
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/firebase/client-app';
import { z } from 'zod';
import { adminDb, adminAuth } from '@/lib/firebase/admin-app';
import { UserProfile } from '@/lib/firebase/services/user';
import { AIRequestLog } from '@/server/services/activity';
import { AcuTransaction, SubscriptionType, UserRole } from '@/server/schemas';
import { Timestamp }from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { HttpsError } from '../lib/errors';
import { resourceMetadata, ResourceType } from '@/data/academic';
import { ACUService } from '../services/acu-service';


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

const subscriptionTypes: SubscriptionType[] = [
    "FREE", "STUDENT_PREMIUM", "STUDENT_PREMIUM_PLUS", "PARENT_PRO", "PARENT_PRO_PLUS", 
    "PRIVATE_TUTOR", "SCHOOL_STARTER", "SCHOOL_GROWTH", "SCHOOL_ENTERPRISE",
    "SCHOOL_TUTOR", "SCHOOL_ADMIN", "ADMIN",
];
const roleTypes: UserRole[] = ["STUDENT", "PARENT", "PRIVATE_TUTOR", "SCHOOL_ADMIN", "SCHOOL_TUTOR", "ADMIN"];

const UpdateUserSchema = z.object({
  role: z.enum(roleTypes as [string, ...string[]]),
  subscription: z.enum(subscriptionTypes as [string, ...string[]]),
});

export async function updateUserAction(targetUid: string, data: z.infer<typeof UpdateUserSchema>): Promise<{ success: boolean; error?: string; }> {
    if (!targetUid) {
        return { success: false, error: "Target User ID is required." };
    }

    const validation = UpdateUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().formErrors.join(', ') };
    }
    
    try {
        const batch = adminDb.batch();
        const userRef = adminDb.doc(`users/${targetUid}`);
        const subscriptionRef = adminDb.doc(`subscriptions/${targetUid}`);

        batch.update(userRef, { role: validation.data.role, updatedAt: Timestamp.now() });
        
        batch.set(subscriptionRef, { 
            type: validation.data.subscription,
            status: 'ACTIVE',
            updatedAt: Timestamp.now(),
        }, { merge: true });

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
            return {
                uid: doc.id,
                ...data,
                name: data.name || 'N/A',
                subscription: subscription?.type || 'FREE',
            } as UserProfile;
        });
        return { users, error: null };
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return { users: [], error: error.message };
    }
}


export async function getAiUsageLogsAction(): Promise<{ logs: AIRequestLog[], error: string | null }> {
    try {
        const logsSnapshot = await adminDb.collection('aiUsageLogs').orderBy('createdAt', 'desc').limit(20).get();
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
        const snapshot = await adminDb.collection('acuTransactions').orderBy('createdAt', 'desc').limit(20).get();
        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt as Timestamp).toDate(),
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
  url: z.string().url('Must be a valid URL.'),
  type: z.enum(Object.keys(resourceMetadata) as [ResourceType, ...ResourceType[]]),
  subject: z.string().min(1, 'Subject is required.'),
  topic: z.string().min(1, 'Topic is required.'),
  level: z.string().min(1, 'Level is required.'),
  licenseType: z.enum(['Standard YouTube', 'Creative Commons', 'Other']),
  attributionText: z.string().optional(),
});

export async function addResourceUploadAction(values: z.infer<typeof ResourceUploadSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const uploadRef = adminDb.collection('resource_uploads').doc();
        await uploadRef.set({
            ...values,
            videoUrl: values.type === 'VIDEO' ? values.url : null,
            fileUrl: values.type !== 'VIDEO' ? values.url : null,
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
                await resourceRef.set({
                    ...uploadData,
                    resourceId: resourceRef.id,
                    createdAt: Timestamp.now()
                });
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
    subjects?: any;
    hourlyRate?: number;
    onboardingPaid?: boolean;
    commissionRate?: number;
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

        const tutorIds = tutorProfilesSnapshot.docs.map(doc => doc.id);
        const usersSnapshot = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', tutorIds).get();
        
        const usersMap = new Map<string, any>();
        usersSnapshot.forEach(doc => {
            usersMap.set(doc.id, doc.data());
        });

        const applications: TutorApplication[] = [];
        tutorProfilesSnapshot.forEach(doc => {
            const profileData = doc.data() as TutorProfileData;
            const userData = usersMap.get(doc.id);
            if (userData) {
                 applications.push({
                    ...profileData,
                    userId: doc.id,
                    displayName: userData.name || 'N/A',
                    email: userData.email,
                    role: userData.role,
                });
            }
        });
        
        // Filter for only private tutors for marketplace approval
        const privateTutorApplications = applications.filter(app => app.role === 'PRIVATE_TUTOR');

        return { applications: privateTutorApplications };

    } catch (error: any) {
        console.error("Error fetching tutor applications:", error);
        return { applications: [], error: error.message };
    }
}

const ReviewTutorSchema = z.object({
    tutorId: z.string().min(1),
    decision: z.enum(['APPROVED', 'REJECTED']),
});

export async function reviewTutorApplicationAction(values: z.infer<typeof ReviewTutorSchema>): Promise<{ success: boolean; error?: string }> {
    try {
        const { tutorId, decision } = values;
        const profileRef = adminDb.collection('tutor_profiles').doc(tutorId);

        await profileRef.update({
            approvalStatus: decision,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error reviewing tutor application:", error);
        return { success: false, error: error.message };
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

export async function adjustAcuBalanceAction(input: z.infer<typeof AcuAdjustmentSchema>): Promise<{ success: boolean, error?: string }> {
    try {
        const { userId, adminId, amount, description } = AcuAdjustmentSchema.parse(input);

        await ACUService.creditACUs({
            userId,
            amount: amount,
            type: "ADMIN_ADJUSTMENT",
            description,
            metadata: { adminId }
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error adjusting ACU balance:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.message };
        }
        return { success: false, error: (error as Error).message };
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


export async function getAnalyticsDataAction(): Promise<{ newUsersData: any[], error: string | null }> {
    try {
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const snapshot = await adminDb.collection('users').where('createdAt', '>=', oneYearAgo).get();

        const monthlyCounts: Record<string, number> = {};
        for (let i = 0; i < 12; i++) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = month.toLocaleString('default', { month: 'short' });
            monthlyCounts[monthKey] = 0;
        }

        snapshot.forEach(doc => {
            const createdAt = (doc.data().createdAt as Timestamp).toDate();
            const monthKey = createdAt.toLocaleString('default', { month: 'short' });
            if (monthlyCounts.hasOwnProperty(monthKey)) {
                monthlyCounts[monthKey]++;
            }
        });

        const newUsersData = Object.entries(monthlyCounts).map(([month, users]) => ({ month, users })).reverse();
        
        return { newUsersData, error: null };
    } catch (error: any) {
        console.error("Error fetching analytics data:", error);
        return { newUsersData: [], error: error.message };
    }
}


export async function getRecentPaymentsAction(): Promise<{ payments: any[], error: string | null }> {
    try {
        const snapshot = await adminDb.collection('payments').orderBy('createdAt', 'desc').limit(10).get();
        const payments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                amount: data.amount / 100, // Convert cents to pounds/dollars
                createdAt: (data.createdAt as Timestamp).toDate().toISOString()
            };
        });
        return { payments, error: null };
    } catch (error: any) {
        console.error("Error fetching recent payments:", error);
        return { payments: [], error: error.message };
    }
}
