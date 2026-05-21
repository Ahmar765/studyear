
'use server';

import { getVerifiedUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import {
    ensureSchoolStaffJoinCode,
    regenerateSchoolStaffJoinCode,
} from '@/server/lib/school-staff-link';
import * as admin from 'firebase-admin';

async function getSchoolIdForAdmin(adminUserId: string): Promise<string | null> {
    const staffSnapshot = await adminDb
        .collection('school_staff')
        .where('userId', '==', adminUserId)
        .get();

    if (staffSnapshot.empty) {
        return null;
    }
    const doc =
        staffSnapshot.docs.find((d) => (d.data().role as string) === 'SCHOOL_ADMIN') ??
        staffSnapshot.docs[0];
    return (doc?.data().schoolId as string) ?? null;
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
        const [usersMap, dashboardsMap] = await Promise.all([
            fetchUserDocsByIds(studentIds),
            fetchDashboardDocsByIds(studentIds),
        ]);

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
    staffLinkId: string;
    name: string;
    profileImageUrl?: string;
    role: 'SCHOOL_TUTOR' | 'SCHOOL_ADMIN';
    email: string;
    assignedYearGroups: string[];
    assignedClassNames: string[];
}

export async function getSchoolStaffAction(idToken?: string | null): Promise<{ staff: SchoolStaffMember[], error?: string }> {
    try {
        const adminUser = await getVerifiedUser(idToken);
        if (!adminUser) throw new Error("Not authenticated.");
        const schoolId = await getSchoolIdForAdmin(adminUser.uid);
        if (!schoolId) return { staff: [] };
        
        const staffLinksSnapshot = await adminDb.collection('school_staff').where('schoolId', '==', schoolId).get();
        if (staffLinksSnapshot.empty) return { staff: [] };

        const staffIds = staffLinksSnapshot.docs.map(doc => doc.data().userId as string);
        const usersMap = await fetchUserDocsByIds(staffIds);

        const staff: SchoolStaffMember[] = staffLinksSnapshot.docs.map(doc => {
            const linkData = doc.data();
            const userData = usersMap.get(linkData.userId) || {};
            return {
                id: linkData.userId,
                staffLinkId: doc.id,
                name: userData.name || 'Unknown',
                profileImageUrl: userData.profileImageUrl,
                role: linkData.role,
                email: userData.email,
                assignedYearGroups: Array.isArray(linkData.assignedYearGroups)
                    ? (linkData.assignedYearGroups as string[])
                    : [],
                assignedClassNames: Array.isArray(linkData.assignedClassNames)
                    ? (linkData.assignedClassNames as string[])
                    : [],
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
        const dashboardsMap = await fetchDashboardDocsByIds(studentIds);
        const atRiskEntries = [...dashboardsMap.entries()].filter(([, data]) => {
            const risk = data.riskLevel as string | undefined;
            return risk === 'HIGH' || risk === 'CRITICAL';
        });
        if (!atRiskEntries.length) return { students: [] };

        const atRiskStudentIds = atRiskEntries.map(([id]) => id);
        const usersMap = await fetchUserDocsByIds(atRiskStudentIds);
        
        const students: AtRiskStudent[] = atRiskEntries.map(([id, dashboardData]) => {
            const userData = usersMap.get(id) || {};
            return {
                id,
                name: userData.name || 'Unknown',
                profileImageUrl: userData.profileImageUrl,
                riskLevel: dashboardData.riskLevel as 'HIGH' | 'CRITICAL',
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

async function fetchUserDocsByIds(ids: string[]): Promise<Map<string, admin.firestore.DocumentData>> {
    const map = new Map<string, admin.firestore.DocumentData>();
    for (const chunk of chunkIds(ids, 10)) {
        if (!chunk.length) continue;
        const snap = await adminDb
            .collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
        snap.docs.forEach((doc) => map.set(doc.id, doc.data()));
    }
    return map;
}

async function fetchDashboardDocsByIds(ids: string[]): Promise<Map<string, admin.firestore.DocumentData>> {
    const map = new Map<string, admin.firestore.DocumentData>();
    for (const chunk of chunkIds(ids, 30)) {
        if (!chunk.length) continue;
        const snap = await adminDb
            .collection('student_dashboard_states')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
        snap.docs.forEach((doc) => map.set(doc.id, doc.data()));
    }
    return map;
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
        await ensureSchoolStaffJoinCode(schoolId);
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

export async function getSchoolStaffJoinCodeAction(
    idToken?: string | null,
): Promise<{ code: string | null; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const code = await ensureSchoolStaffJoinCode(schoolId);
        return { code };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error fetching staff join code:", error);
        return { code: null, error: msg };
    }
}

export async function getSchoolCohortOptionsAction(
    idToken?: string | null,
): Promise<{ yearGroups: string[]; classes: string[]; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const doc = await adminDb.collection('school_accounts').doc(schoolId).get();
        const data = doc.data() ?? {};
        const onboarding = (data.onboardingProfile as Record<string, unknown>) ?? {};
        const legacy = (data.profile as Record<string, unknown>) ?? {};
        const yearGroups = [
            ...(Array.isArray(onboarding.yearGroups) ? (onboarding.yearGroups as string[]) : []),
            ...(Array.isArray(legacy.yearGroups) ? (legacy.yearGroups as string[]) : []),
        ];
        const classes = [
            ...(Array.isArray(onboarding.classes) ? (onboarding.classes as string[]) : []),
            ...(Array.isArray(legacy.classes) ? (legacy.classes as string[]) : []),
        ];
        const yearSet = new Set(yearGroups.map((s) => s.trim()).filter(Boolean));
        const classSet = new Set(classes.map((s) => s.trim()).filter(Boolean));
        const fromStudents = await adminDb
            .collection('student_profiles')
            .where('schoolAccountId', '==', schoolId)
            .limit(200)
            .get();
        fromStudents.docs.forEach((d) => {
            const yg = (d.data().yearGroup as string)?.trim();
            if (yg) yearSet.add(yg);
            const cn = (d.data().className as string)?.trim();
            if (cn) classSet.add(cn);
        });
        return { yearGroups: [...yearSet].sort(), classes: [...classSet].sort() };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return { yearGroups: [], classes: [], error: msg };
    }
}

export async function updateSchoolStaffAssignmentsAction(
    idToken: string | null | undefined,
    input: {
        staffLinkId: string;
        assignedYearGroups: string[];
        assignedClassNames: string[];
    },
): Promise<{ success: boolean; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const linkRef = adminDb.collection('school_staff').doc(input.staffLinkId);
        const linkSnap = await linkRef.get();
        if (!linkSnap.exists) {
            return { success: false, error: 'Staff link not found.' };
        }
        if ((linkSnap.data()?.schoolId as string) !== schoolId) {
            return { success: false, error: 'This staff member belongs to another school.' };
        }
        if (linkSnap.data()?.role !== 'SCHOOL_TUTOR') {
            return { success: false, error: 'Cohort assignment applies to teachers only.' };
        }
        await linkRef.update({
            assignedYearGroups: input.assignedYearGroups.map((s) => s.trim()).filter(Boolean),
            assignedClassNames: input.assignedClassNames.map((s) => s.trim()).filter(Boolean),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
    }
}

export async function regenerateSchoolStaffJoinCodeAction(
    idToken: string | null | undefined,
): Promise<{ code: string | null; error?: string }> {
    try {
        const { schoolId } = await requireSchoolAdminWithSchool(idToken);
        const code = await regenerateSchoolStaffJoinCode(schoolId);
        return { code };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error regenerating staff join code:", error);
        return { code: null, error: msg };
    }
}
