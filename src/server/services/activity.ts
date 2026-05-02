import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import type { AITaskType, AIProvider } from '@/server/ai/gateway-schema';
import { FeatureKey } from '@/data/acu-costs';

export type ActivityEventType = "task_completed" | "lesson_completed" | "quiz_submitted" | "flashcards_reviewed" | "session_logged" | "resource_generated" | "INTERVENTION_TRIGGERED" | "ANSWER_ANALYSED";

export interface ActivityEventMetaData {
  linkedEntityType?: string;
  linkedEntityId?: string;
  subject?: string;
  score?: number;
  outOf?: number;
}
  
export interface AIRequestLog {
  requestId: string;
  tenantId?: string | null;
  userId: string;
  taskType: AITaskType;
  featureKey: FeatureKey;
  provider: AIProvider;
  model: string;
  status: 'success' | 'failed' | 'refunded';
  fallbackUsed: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  realCost: number;
  customerChargeEquivalent: number;
  chargedAcus: number;
  pricingPolicyId: string;
}

export async function logActivityEvent(userId: string, type: ActivityEventType, meta: ActivityEventMetaData) {
    try {
        if (!userId) {
            throw new Error("User ID is required to log an activity event.");
        }
        
        const user = (await adminDb.collection('users').doc(userId).get()).data();

        const eventData = {
            userId: userId,
            role: user?.role || 'student',
            eventType: type,
            ...meta,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const eventRef = adminDb.collection('activity_events').doc();
        await eventRef.set(eventData);
        
        return { success: true, eventId: eventRef.id };

    } catch (error: any) {
        console.error("Error logging activity event:", error);
        return { success: false, error: error.message };
    }
}


export async function logAiUsage(params: Omit<AIRequestLog, 'status'> & { status: 'success' | 'failed' | 'refunded' }) {
    try {
        const usageId = params.requestId;
        const logDocRef = adminDb.collection('aiUsageLogs').doc(usageId);

        const logData = {
            ...params,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await logDocRef.set(logData);
        return { success: true };

    } catch (error: any) {
        console.error("Error logging AI usage:", error);
        // This is a background task, so we don't want to throw an error to the user.
        return { success: false, error: error.message };
    }
}
