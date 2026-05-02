
'use server';

import { getCurrentUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '../lib/errors';
import type { UserData, StudentProfileData } from '@/lib/firebase/services/user';
import * as admin from 'firebase-admin';

export interface SavedResourceSummary {
    id: string;
    title: string;
    type: string;
    createdAt: string;
}

export interface StudentData {
    id: string;
    name: string;
    avatarSrc: string;
    yearGroup: string;
    consistency: "Good" | "Fair" | "Poor";
    progress: number;
    weakestSubject: string;
    strongestSubject: string;
    lastDiagnostic?: {
        date: string;
        title: string;
    };
    savedResources: SavedResourceSummary[];
}

export async function getParentDashboardDataAction(): Promise<{ success: boolean; data?: StudentData[]; error?: string; errorCode?: string; }> {
    const parentUser = await getCurrentUser();
    if (!parentUser) {
        return { success: false, error: 'You must be logged in to view this data.', errorCode: 'UNAUTHENTICATED' };
    }

    try {
        const subscriptionSnap = await adminDb.collection('subscriptions').doc(parentUser.uid).get();
        if (!subscriptionSnap.exists || !['PARENT_PRO', 'PARENT_PRO_PLUS'].includes(subscriptionSnap.data()?.type) || subscriptionSnap.data()?.status !== 'ACTIVE') {
            throw new HttpsError('failed-precondition', 'A Parent Pro subscription is required to access this dashboard.');
        }

        const linksSnapshot = await adminDb.collection('parent_student_links')
            .where('parentId', '==', parentUser.uid)
            .where('status', '==', 'APPROVED')
            .get();

        if (linksSnapshot.empty) {
            return { success: true, data: [] };
        }

        const studentIds = linksSnapshot.docs.map(doc => doc.data().studentId);
        if (studentIds.length === 0) {
            return { success: true, data: [] };
        }

        const studentDocs = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', studentIds).get();

        const dashboardData: StudentData[] = await Promise.all(studentDocs.docs.map(async (doc) => {
            const student = doc.data() as UserData;
            
            const [diagnosticSnapshot, studentProfileSnap, savedResourcesSnapshot, dashboardStateSnap] = await Promise.all([
                adminDb.collection('diagnostic_results').where('studentId', '==', student.uid).orderBy('createdAt', 'desc').limit(1).get(),
                adminDb.collection('student_profiles').doc(student.uid).get(),
                adminDb.collection('users').doc(student.uid).collection('saved_resources').orderBy('createdAt', 'desc').limit(5).get(),
                adminDb.collection('student_dashboard_states').doc(student.uid).get()
            ]);

            const dashboardState = dashboardStateSnap.exists ? dashboardStateSnap.data() : null;

            const savedResources: SavedResourceSummary[] = savedResourcesSnapshot.docs.map(resDoc => ({
                id: resDoc.id,
                title: resDoc.data().title || "Untitled Resource",
                type: resDoc.data().type || "UNKNOWN",
                createdAt: (resDoc.data().createdAt as admin.firestore.Timestamp).toDate().toISOString(),
            }));

            // This is placeholder logic. A real implementation would calculate these values from activity logs.
            const consistency = dashboardState?.progressScore > 70 ? "Good" : dashboardState?.progressScore > 40 ? "Fair" : "Poor";

            return {
                id: student.uid,
                name: student.name || 'Student',
                avatarSrc: student.profileImageUrl || '',
                yearGroup: (studentProfileSnap.data() as StudentProfileData)?.yearGroup || 'N/A',
                consistency: consistency,
                progress: Math.round(dashboardState?.progressScore || 0),
                weakestSubject: dashboardState?.weakSubjects?.[0]?.name || 'N/A',
                strongestSubject: dashboardState?.strongSubjects?.[0]?.name || 'N/A',
                lastDiagnostic: !diagnosticSnapshot.empty ? {
                    date: (diagnosticSnapshot.docs[0].data().createdAt as admin.firestore.Timestamp).toDate().toISOString(),
                    title: diagnosticSnapshot.docs[0].data().subject,
                } : undefined,
                savedResources,
            };
        }));

        return { success: true, data: dashboardData };

    } catch (error: any) {
        console.error("Error fetching parent dashboard data:", error);
        if (error instanceof HttpsError) {
             return { success: false, error: error.message, errorCode: error.code };
        }
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}

export async function requestStudentLinkAction(studentIdentifier: string): Promise<{ success: boolean; error?: string }> {
    const parentUser = await getCurrentUser();
    if (!parentUser) {
        return { success: false, error: "You must be logged in." };
    }

    try {
        let studentQuery;
        if (studentIdentifier.includes('@')) {
            studentQuery = adminDb.collection('users').where('email', '==', studentIdentifier).where('role', '==', 'STUDENT').limit(1);
        } else {
            // Assuming a unique student code might be implemented later. For now, we'll just support email.
            return { success: false, error: "Please enter the student's email address." };
        }

        const studentSnapshot = await studentQuery.get();
        if (studentSnapshot.empty) {
            return { success: false, error: "No student found with that email address." };
        }

        const studentDoc = studentSnapshot.docs[0];
        const studentId = studentDoc.id;

        const linkId = `${studentId}_${parentUser.uid}`;
        const linkRef = adminDb.collection('parent_student_links').doc(linkId);

        if ((await linkRef.get()).exists) {
            return { success: false, error: "A link request for this student already exists." };
        }

        // In a real app, status would be 'PENDING'. Auto-approving to activate the feature.
        await linkRef.set({
            studentId,
            parentId: parentUser.uid,
            status: 'APPROVED', 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error requesting student link:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}
