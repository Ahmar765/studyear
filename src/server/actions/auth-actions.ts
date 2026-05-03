

'use server';
import { adminDb, adminAuth } from "@/lib/firebase/admin-app";
import * as admin from 'firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import { createSession, endActiveSession } from "@/server/services/session";
import type { UserRole, SubscriptionType } from "@/server/schemas";

const allowedRoles: UserRole[] = ["STUDENT", "PARENT", "PRIVATE_TUTOR", "SCHOOL_ADMIN", "SCHOOL_TUTOR", "ADMIN"];

async function tryPromoteToAdmin(uid: string, email: string) {
    if (email === 'admin@studyear.com' || email === 'admin@studyear.ai') {
      try {
        await adminAuth.setCustomUserClaims(uid, { role: 'ADMIN' });
        await adminDb.doc(`users/${uid}`).update({ role: 'ADMIN' });
        
        const subscriptionRef = adminDb.collection('subscriptions').doc(uid);
        await subscriptionRef.set({
            type: 'ADMIN',
            status: 'ACTIVE',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.info(`Promoted user ${uid} (${email}) to ADMIN.`);
        return true;
      } catch (error) {
        console.error(`Failed to promote user ${uid} to admin:`, error);
      }
    }
    return false;
}

export async function signup(uid: string, email: string, role: string, displayName?: string | null, photoURL?: string | null) {
    if (!allowedRoles.includes(role as UserRole)) {
        return { message: "Error", error: "Invalid role selected." };
    }
    const userRole = role as UserRole;
    
    const userRef = adminDb.doc(`users/${uid}`);
    const walletRef = adminDb.doc(`acuWallets/${uid}`);
    const batch = adminDb.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const [firstName, ...lastNameParts] = (displayName || email.split('@')[0]).split(' ');
    const lastName = lastNameParts.join(' ');
    const name = `${firstName} ${lastName}`.trim();

    batch.set(userRef, {
        id: uid,
        email,
        name: name,
        role: userRole,
        profileImageUrl: photoURL || null,
        createdAt: now,
        updatedAt: now,
        onboardingComplete: false,
    });
    
    batch.set(walletRef, {
        userId: uid,
        ownerType: 'USER',
        balance: 0,
        locked: false,
        createdAt: now,
        updatedAt: now,
    });
    
    if (userRole === 'STUDENT') {
        const profileRef = adminDb.doc(`student_profiles/${uid}`);
        batch.set(profileRef, { userId: uid, studyLevel: null, yearGroup: null, subjects: [] });
    } else if (userRole === 'PARENT') {
        const profileRef = adminDb.doc(`parent_profiles/${uid}`);
        batch.set(profileRef, { userId: uid, linkedStudents: [] });
    } else if (userRole === 'PRIVATE_TUTOR' || userRole === 'SCHOOL_TUTOR') {
        const profileRef = adminDb.doc(`tutor_profiles/${uid}`);
        batch.set(profileRef, { userId: uid, approvalStatus: 'PENDING' });
    } else if (userRole === 'SCHOOL_ADMIN') {
        const schoolAccountRef = adminDb.collection('school_accounts').doc();
        batch.set(schoolAccountRef, {
            name: `${email.split('@')[1].split('.')[0]} (Pending)`, 
            approvalStatus: 'PENDING',
            createdAt: now,
        });
        const schoolStaffRef = adminDb.collection('school_staff').doc();
        batch.set(schoolStaffRef, {
            userId: uid,
            schoolId: schoolAccountRef.id,
            role: 'SCHOOL_ADMIN',
        });
    }

    try {
        await batch.commit();
        
        const isAdmin = await tryPromoteToAdmin(uid, email);
        if (!isAdmin) {
            await adminAuth.setCustomUserClaims(uid, { role: userRole });
        }

        const { sessionId } = await createSession(uid, { platform: "web", userAgent: "unknown" });
        return { message: "Success", error: null, sessionId };
    } catch (e: any) {
        return { message: "Error", error: e.message };
    }
}


/** Pass string fields only — Firebase `User` is not safe to serialize into Server Actions (can overflow the stack). */
export async function handleSocialSignIn(
    uid: string,
    email: string | null,
    displayName: string | null,
    photoURL: string | null,
) {
    const userRef = adminDb.doc(`users/${uid}`);
    const userDoc = await userRef.get();
    const isNewUser = !userDoc.exists;
    const userRole: UserRole = 'STUDENT';

    if (!email) {
        throw new Error("Google sign-in did not return an email address.");
    }

    if (isNewUser) {
       await signup(uid, email, userRole, displayName, photoURL);
    } else {
        await adminAuth.setCustomUserClaims(uid, { role: userDoc.data()?.role || userRole });
    }

    await tryPromoteToAdmin(uid, email);

    const { sessionId } = await createSession(uid, { platform: "web", userAgent: "unknown" });
    return { newUser: isNewUser, sessionId };
}

export async function handleEmailLogin(uid: string, email: string | null) {
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const role = userDoc.data()?.role || 'STUDENT';
    await adminAuth.setCustomUserClaims(uid, { role });

    if (email) {
        await tryPromoteToAdmin(uid, email);
    }
    const { sessionId } = await createSession(uid, { platform: "web", userAgent: "unknown" });
    return { sessionId: sessionId || null };
}

export async function logout(uid: string, sessionId?: string | null) {
    await endActiveSession(uid, sessionId);
}

interface StudentProfileUpdateData {
    fullName: string;
    dob: string;
    profileImageUrl?: string | null;
    coverImageUrl?: string | null;
    level: string;
    universityCourse?: string | null;
    preferences?: {
        examBoard?: string;
    };
    subjects: { name: string; targetGrade: string; currentGrade?: string; }[];
}

export async function updateUserProfile(userId: string, data: StudentProfileUpdateData) {
    try {
        const userRef = adminDb.doc(`users/${userId}`);
        const profileRef = adminDb.doc(`student_profiles/${userId}`);
        const now = admin.firestore.FieldValue.serverTimestamp();

        const rawExam = data.preferences?.examBoard;
        const examBoard =
            rawExam && rawExam !== 'none' ? rawExam : null;

        const subjectsClean = data.subjects.map((s) => ({
            name: String(s.name ?? '').trim(),
            targetGrade: String(s.targetGrade ?? '').trim(),
            ...(s.currentGrade ? { currentGrade: String(s.currentGrade).trim() } : {}),
        }));

        const userSnap = await userRef.get();

        const batch = adminDb.batch();

        const userPayload: Record<string, unknown> = {
            name: data.fullName.trim(),
            profileImageUrl: data.profileImageUrl ?? null,
            coverImageUrl: data.coverImageUrl ?? null,
            onboardingComplete: true,
            updatedAt: now,
        };

        if (!userSnap.exists) {
            let au: admin.auth.UserRecord;
            try {
                au = await adminAuth.getUser(userId);
            } catch {
                return {
                    success: false,
                    error:
                        'Your Firestore user record is missing and we could not load Firebase Auth. Sign out and sign in again.',
                };
            }
            userPayload.id = userId;
            userPayload.email = au.email ?? null;
            userPayload.role = 'STUDENT';
            userPayload.createdAt = now;
            if (!userPayload.name && au.displayName) {
                userPayload.name = au.displayName;
            }
        }

        batch.set(userRef, userPayload as DocumentData, { merge: true });

        batch.set(
            profileRef,
            {
                userId,
                studyLevel: data.level.trim(),
                yearGroup: data.level.trim(),
                examBoard,
                course: data.universityCourse?.trim() || null,
                dob: data.dob?.trim() || null,
                subjects: subjectsClean,
                updatedAt: now,
            },
            { merge: true },
        );

        await batch.commit();

        return { success: true, error: null };
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error('Error updating user profile:', err?.code, err?.message, error);
        const msg =
            typeof err?.message === 'string' && err.message
                ? err.message
                : error instanceof Error
                  ? error.message
                  : String(error);
        const detail = err?.code ? `${err.code}: ${msg}` : msg;
        return { success: false, error: detail || 'Could not save profile.' };
    }
}
