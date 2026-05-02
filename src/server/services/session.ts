import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

interface DeviceInfo {
    platform: string;
    userAgent: string;
}

export async function createSession(uid: string, device?: DeviceInfo) {
    try {
        if (!uid) {
            throw new Error("Login required.");
        }
        const sessionRef = adminDb.collection('users').doc(uid).collection('sessions');
        const sessionData = {
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            endedAt: null,
            durationSec: 0,
            device: device ?? null,
            eventsCount: 0,
        };
        const docRef = await sessionRef.add(sessionData);

        // Also update the lastLoginAt on the user profile
        await adminDb.collection('users').doc(uid).update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() });
        
        const userDocSnap = await adminDb.doc(`users/${uid}`).get();
        const onboardingComplete = userDocSnap.data()?.onboardingComplete || false;

        return { success: true, sessionId: docRef.id, onboardingComplete };
    } catch (error: any) {
        console.error("Error creating session:", error);
        return { success: false, error: error.message, onboardingComplete: false };
    }
}

export async function endActiveSession(uid: string, sessionId?: string | null) {
    try {
        if (!uid) {
             throw new Error("User ID is required to end a session.");
        }
        
        let sessionDocRef;
        if (sessionId) {
             sessionDocRef = adminDb.collection('users').doc(uid).collection('sessions').doc(sessionId);
        } else {
            const sessionsRef = adminDb.collection('users').doc(uid).collection('sessions');
            const q = sessionsRef
                .where('endedAt', '==', null)
                .orderBy('startedAt', 'desc')
                .limit(1);
            const querySnapshot = await q.get();
            if (querySnapshot.empty) {
                return { success: true, message: 'No active session found.' };
            }
            sessionDocRef = querySnapshot.docs[0].ref;
        }
        
        const sessionSnap = await sessionDocRef.get();
        if (!sessionSnap.exists) {
            return { success: true, message: "Session not found." };
        }

        const sessionData = sessionSnap.data()!;
        const startedAt = sessionData.startedAt as admin.firestore.Timestamp;

        if (!startedAt || sessionData.endedAt) {
            return { success: true, message: "Session already ended or invalid." };
        }

        const endedAt = admin.firestore.Timestamp.now();
        const durationSec = Math.max(0, endedAt.seconds - startedAt.seconds);

        await sessionDocRef.update({
            endedAt: endedAt,
            durationSec: durationSec
        });
        
        return { success: true, message: `Session ${sessionDocRef.id} ended.` };

    } catch (error: any) {
        console.error("Error ending session:", error);
        return { success: false, error: error.message };
    }
}
