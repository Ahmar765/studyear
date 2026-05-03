
'use server';

import { getVerifiedUser } from '../lib/auth';
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

export async function getSchoolStudentsAction(idToken?: string | null): Promise<{ students: SchoolStudent[], error?: string }> {
    try {
        const adminUser = await getVerifiedUser(idToken);
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

export async function getSchoolStaffAction(idToken?: string | null): Promise<{ staff: SchoolStaffMember[], error?: string }> {
    try {
        const adminUser = await getVerifiedUser(idToken);
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

export async function getAtRiskStudentsAction(idToken?: string | null): Promise<{ students: AtRiskStudent[], error?: string }> {
    try {
        const adminUser = await getVerifiedUser(idToken);
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

async function requireSchoolAdminWithSchool(
    idToken?: string | null,
): Promise<{ uid: string; schoolId: string }> {
    const adminUser = await getVerifiedUser(idToken);
    if (!adminUser) throw new Error("Not authenticated.");
    const schoolId = await getSchoolIdForAdmin(adminUser.uid);
    if (!schoolId) throw new Error("No school is linked to this account.");
    return { uid: adminUser.uid, schoolId };
}

function chunkIds<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

export interface SchoolProgressOverview {
    studentCount: number;
    avgProgress: number;
    atRiskCount: number;
    byYearGroup: { yearGroup: string; count: number; avgProgress: number }[];
}

export async function getSchoolProgressOverviewAction(
    idToken?: string | null,
): Promise<{ overview: SchoolProgressOverview | null; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);

        const studentProfilesSnapshot = await adminDb
            .collection("student_profiles")
            .where("schoolAccountId", "==", schoolId)
            .get();
        if (studentProfilesSnapshot.empty) {
            return {
                overview: {
                    studentCount: 0,
                    avgProgress: 0,
                    atRiskCount: 0,
                    byYearGroup: [],
                },
            };
        }

        const studentIds = studentProfilesSnapshot.docs.map((d) => d.id);
        const profileById = new Map(
            studentProfilesSnapshot.docs.map((d) => [d.id, d.data()]),
        );

        const dashboardChunks = chunkIds(studentIds, 30);
        const dashboardsMap = new Map<string, Record<string, unknown>>();
        for (const chunk of dashboardChunks) {
            const dashSnap = await adminDb
                .collection("student_dashboard_states")
                .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                .get();
            dashSnap.docs.forEach((doc) => dashboardsMap.set(doc.id, doc.data()));
        }

        let sumProgress = 0;
        let atRiskCount = 0;
        const yearBuckets = new Map<string, { sum: number; count: number }>();

        for (const sid of studentIds) {
            const profileData = profileById.get(sid) || {};
            const dash = dashboardsMap.get(sid) || {};
            const score = typeof dash.progressScore === "number" ? dash.progressScore : 0;
            sumProgress += score;
            const risk = dash.riskLevel;
            if (risk === "HIGH" || risk === "CRITICAL") atRiskCount++;
            const yg = (profileData.yearGroup as string) || "Unspecified";
            const b = yearBuckets.get(yg) || { sum: 0, count: 0 };
            b.sum += score;
            b.count += 1;
            yearBuckets.set(yg, b);
        }

        const studentCount = studentIds.length;
        const avgProgress = studentCount ? Math.round(sumProgress / studentCount) : 0;

        const byYearGroup = [...yearBuckets.entries()].map(([yearGroup, v]) => ({
            yearGroup,
            count: v.count,
            avgProgress: v.count ? Math.round(v.sum / v.count) : 0,
        }));

        return {
            overview: {
                studentCount,
                avgProgress,
                atRiskCount,
                byYearGroup,
            },
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error fetching school progress overview:", error);
        return { overview: null, error: msg };
    }
}

export interface SchoolAccountSettings {
    id: string;
    name: string;
    misProvider: string;
    misNotes: string;
    timezone: string;
}

export async function getSchoolSettingsAction(
    idToken?: string | null,
): Promise<{ settings: SchoolAccountSettings | null; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const doc = await adminDb.collection("school_accounts").doc(schoolId).get();
        if (!doc.exists) return { settings: null };
        const d = doc.data() || {};
        return {
            settings: {
                id: schoolId,
                name: (d.name as string) || "School",
                misProvider: (d.misProvider as string) || "",
                misNotes: (d.misNotes as string) || "",
                timezone: (d.timezone as string) || "Europe/London",
            },
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error fetching school settings:", error);
        return { settings: null, error: msg };
    }
}

export async function updateSchoolSettingsAction(
    idToken: string | null | undefined,
    patch: Partial<Pick<SchoolAccountSettings, "name" | "misProvider" | "misNotes" | "timezone">>,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const allowed: Record<string, unknown> = {};
        if (patch.name !== undefined) allowed.name = patch.name.trim();
        if (patch.misProvider !== undefined) allowed.misProvider = patch.misProvider.trim();
        if (patch.misNotes !== undefined) allowed.misNotes = patch.misNotes.trim();
        if (patch.timezone !== undefined) allowed.timezone = patch.timezone.trim();
        allowed.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await adminDb.collection("school_accounts").doc(schoolId).set(allowed, { merge: true });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error updating school settings:", error);
        return { success: false, error: msg };
    }
}

export interface SchoolAssessmentRow {
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    createdAt: string;
}

export async function listSchoolAssessmentsAction(
    idToken?: string | null,
): Promise<{ assessments: SchoolAssessmentRow[]; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const snap = await adminDb
            .collection("school_assessments")
            .where("schoolId", "==", schoolId)
            .limit(50)
            .get();

        const assessments: SchoolAssessmentRow[] = snap.docs.map((doc) => {
            const d = doc.data();
            const createdRaw = d.createdAt as admin.firestore.Timestamp | undefined;
            const dueRaw = d.dueDate as admin.firestore.Timestamp | undefined;
            const createdAt = createdRaw?.toDate?.() ?? new Date();
            const due = dueRaw?.toDate?.() ?? null;
            return {
                id: doc.id,
                title: (d.title as string) || "Untitled",
                description: (d.description as string) || "",
                dueDate: due ? due.toISOString().slice(0, 10) : null,
                createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
            };
        });
        assessments.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return { assessments };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error listing school assessments:", error);
        return { assessments: [], error: msg };
    }
}

export async function createSchoolAssessmentAction(
    idToken: string | null | undefined,
    input: { title: string; description?: string; dueDate?: string | null },
): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid, schoolId } = await requireSchoolAdminWithSchool(idToken);
        const title = input.title?.trim();
        if (!title) return { success: false, error: "Title is required." };
        const ref = adminDb.collection("school_assessments").doc();
        const now = admin.firestore.FieldValue.serverTimestamp();
        const payload: Record<string, unknown> = {
            schoolId,
            title,
            description: input.description?.trim() ?? "",
            createdAt: now,
            updatedAt: now,
            createdByUid: uid,
        };
        if (input.dueDate) {
            const d = new Date(input.dueDate);
            if (!Number.isNaN(d.getTime())) payload.dueDate = admin.firestore.Timestamp.fromDate(d);
        }
        await ref.set(payload);
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error creating school assessment:", error);
        return { success: false, error: msg };
    }
}

export interface SchoolInterventionRow {
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    notes: string;
    status: "ACTIVE" | "CLOSED";
    createdAt: string;
}

export async function listSchoolInterventionsAction(
    idToken?: string | null,
): Promise<{ interventions: SchoolInterventionRow[]; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const snap = await adminDb
            .collection("school_interventions")
            .where("schoolId", "==", schoolId)
            .limit(50)
            .get();

        const interventions: SchoolInterventionRow[] = [];
        const studentIds = [...new Set(snap.docs.map((d) => d.data().studentUserId as string).filter(Boolean))];
        const userChunks = chunkIds(studentIds, 30);
        const nameById = new Map<string, string>();
        for (const chunk of userChunks) {
            if (chunk.length === 0) continue;
            const us = await adminDb
                .collection("users")
                .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                .get();
            us.docs.forEach((doc) => {
                nameById.set(doc.id, (doc.data().name as string) || "Unknown");
            });
        }

        for (const doc of snap.docs) {
            const d = doc.data();
            const sid = d.studentUserId as string;
            const createdRaw = d.createdAt as admin.firestore.Timestamp | undefined;
            const createdAt = createdRaw?.toDate?.() ?? new Date();
            interventions.push({
                id: doc.id,
                studentId: sid,
                studentName: nameById.get(sid) || "Unknown",
                title: (d.title as string) || "Intervention",
                notes: (d.notes as string) || "",
                status: d.status === "CLOSED" ? "CLOSED" : "ACTIVE",
                createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
            });
        }
        interventions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return { interventions };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error listing interventions:", error);
        return { interventions: [], error: msg };
    }
}

export async function createSchoolInterventionAction(
    idToken: string | null | undefined,
    input: { studentUserId: string; title: string; notes?: string },
): Promise<{ success: boolean; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const title = input.title?.trim();
        const studentUserId = input.studentUserId?.trim();
        if (!title || !studentUserId) {
            return { success: false, error: "Student and title are required." };
        }
        const profile = await adminDb.collection("student_profiles").doc(studentUserId).get();
        const schoolOk =
            profile.exists && (profile.data()?.schoolAccountId as string) === schoolId;
        if (!schoolOk) {
            return { success: false, error: "That student is not linked to your school." };
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        await adminDb.collection("school_interventions").doc().set({
            schoolId,
            studentUserId,
            title,
            notes: input.notes?.trim() ?? "",
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
        });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error creating intervention:", error);
        return { success: false, error: msg };
    }
}

export interface SchoolStaffInviteRow {
    id: string;
    email: string;
    intendedRole: string;
    status: string;
    createdAt: string;
}

export async function listSchoolStaffInvitesAction(
    idToken?: string | null,
): Promise<{ invites: SchoolStaffInviteRow[]; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const snap = await adminDb
            .collection("school_staff_invites")
            .where("schoolId", "==", schoolId)
            .limit(30)
            .get();

        const invites: SchoolStaffInviteRow[] = snap.docs.map((doc) => {
            const d = doc.data();
            const createdRaw = d.createdAt as admin.firestore.Timestamp | undefined;
            const createdAt = createdRaw?.toDate?.() ?? new Date();
            return {
                id: doc.id,
                email: (d.email as string) || "",
                intendedRole: (d.intendedRole as string) || "SCHOOL_TUTOR",
                status: (d.status as string) || "PENDING",
                createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
            };
        });
        invites.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return { invites };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error listing staff invites:", error);
        return { invites: [], error: msg };
    }
}

export async function createSchoolStaffInviteAction(
    idToken: string | null | undefined,
    input: { email: string; intendedRole?: "SCHOOL_TUTOR" | "SCHOOL_ADMIN" },
): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid, schoolId } = await requireSchoolAdminWithSchool(idToken);
        const email = input.email?.trim().toLowerCase();
        if (!email || !email.includes("@")) {
            return { success: false, error: "Enter a valid email address." };
        }
        const intendedRole = input.intendedRole === "SCHOOL_ADMIN" ? "SCHOOL_ADMIN" : "SCHOOL_TUTOR";
        const now = admin.firestore.FieldValue.serverTimestamp();
        await adminDb.collection("school_staff_invites").doc().set({
            schoolId,
            email,
            intendedRole,
            status: "PENDING",
            invitedByUid: uid,
            createdAt: now,
        });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error creating staff invite:", error);
        return { success: false, error: msg };
    }
}
