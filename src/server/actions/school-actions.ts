
'use server';

import { getCurrentUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

async function getSchoolIdForAdmin(adminUserId: string): Promise<string | null> {
    const staffSnapshot = await adminDb.collection('school_staff')
        .where('userId', '==', adminUserId)
        .where('role', '==', 'SCHOOL_ADMIN')
        .limit(1)
        .get();
        
    if (staffSnapshot.empty) {
        return null;
    }
    return staffSnapshot.docs[0].data().schoolId;
}

export interface SchoolStudent {
    id: string;
    name: string;
    profileImageUrl?: string;
    yearGroup: string;
    predictedGrade: string;
    progressScore: number;
}

export async function getSchoolStudentsAction(): Promise<{ students: SchoolStudent[], error?: string }> {
    try {
        const adminUser = await getCurrentUser();
        if (!adminUser) throw new Error("Not authenticated.");
        const schoolId = await getSchoolIdForAdmin(adminUser.uid);
        if (!schoolId) return { students: [] };

        const studentProfilesSnapshot = await adminDb.collection('student_profiles').where('schoolAccountId', '==', schoolId).get();
        if (studentProfilesSnapshot.empty) return { students: [] };

        const studentIds = studentProfilesSnapshot.docs.map(doc => doc.id);
        const [usersSnapshot, dashboardsSnapshot] = await Promise.all([
            adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', studentIds).get(),
            adminDb.collection('student_dashboard_states').where(admin.firestore.FieldPath.documentId(), 'in', studentIds).get(),
        ]);
        
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const dashboardsMap = new Map(dashboardsSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const students: SchoolStudent[] = studentProfilesSnapshot.docs.map(doc => {
            const profileData = doc.data();
            const userData = usersMap.get(doc.id) || {};
            const dashboardData = dashboardsMap.get(doc.id) || {};
            return {
                id: doc.id,
                name: userData.name || 'Unknown',
                profileImageUrl: userData.profileImageUrl,
                yearGroup: profileData.yearGroup || 'N/A',
                predictedGrade: dashboardData.predictedGrade || 'N/A',
                progressScore: dashboardData.progressScore || 0,
            };
        });

        return { students };
    } catch (error: any) {
        console.error("Error fetching school students:", error);
        return { students: [], error: error.message };
    }
}

export interface SchoolStaffMember {
    id: string;
    name: string;
    profileImageUrl?: string;
    role: 'SCHOOL_TUTOR' | 'SCHOOL_ADMIN';
    email: string;
}

export async function getSchoolStaffAction(): Promise<{ staff: SchoolStaffMember[], error?: string }> {
    try {
        const adminUser = await getCurrentUser();
        if (!adminUser) throw new Error("Not authenticated.");
        const schoolId = await getSchoolIdForAdmin(adminUser.uid);
        if (!schoolId) return { staff: [] };
        
        const staffLinksSnapshot = await adminDb.collection('school_staff').where('schoolId', '==', schoolId).get();
        if (staffLinksSnapshot.empty) return { staff: [] };

        const staffIds = staffLinksSnapshot.docs.map(doc => doc.data().userId);
        const usersSnapshot = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', staffIds).get();
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const staff: SchoolStaffMember[] = staffLinksSnapshot.docs.map(doc => {
            const linkData = doc.data();
            const userData = usersMap.get(linkData.userId) || {};
            return {
                id: linkData.userId,
                name: userData.name || 'Unknown',
                profileImageUrl: userData.profileImageUrl,
                role: linkData.role,
                email: userData.email,
            };
        });

        return { staff };
    } catch (error: any) {
        console.error("Error fetching school staff:", error);
        return { staff: [], error: error.message };
    }
}

export interface AtRiskStudent {
    id: string;
    name: string;
    profileImageUrl?: string;
    riskLevel: 'HIGH' | 'CRITICAL';
    weakestSubject: string;
}

export async function getAtRiskStudentsAction(): Promise<{ students: AtRiskStudent[], error?: string }> {
    try {
        const adminUser = await getCurrentUser();
        if (!adminUser) throw new Error("Not authenticated.");
        const schoolId = await getSchoolIdForAdmin(adminUser.uid);
        if (!schoolId) return { students: [] };
        
        // This query requires a composite index
        const studentProfilesSnapshot = await adminDb.collection('student_profiles').where('schoolAccountId', '==', schoolId).get();
        if (studentProfilesSnapshot.empty) return { students: [] };
        
        const studentIds = studentProfilesSnapshot.docs.map(doc => doc.id);

        const dashboardsSnapshot = await adminDb.collection('student_dashboard_states')
            .where(admin.firestore.FieldPath.documentId(), 'in', studentIds)
            .where('riskLevel', 'in', ['HIGH', 'CRITICAL'])
            .get();
            
        if (dashboardsSnapshot.empty) return { students: [] };

        const atRiskStudentIds = dashboardsSnapshot.docs.map(doc => doc.id);
        const usersSnapshot = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', atRiskStudentIds).get();
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));
        
        const students: AtRiskStudent[] = dashboardsSnapshot.docs.map(doc => {
            const dashboardData = doc.data();
            const userData = usersMap.get(doc.id) || {};
            return {
                id: doc.id,
                name: userData.name || 'Unknown',
                profileImageUrl: userData.profileImageUrl,
                riskLevel: dashboardData.riskLevel,
                weakestSubject: dashboardData.weakSubjects?.[0]?.name || 'N/A',
            };
        });

        return { students };

    } catch (error: any) {
        console.error("Error fetching at-risk students:", error);
        return { students: [], error: error.message };
    }
}
