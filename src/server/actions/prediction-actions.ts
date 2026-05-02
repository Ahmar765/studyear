
'use server';

import { generateExamPrediction, GenerateExamPredictionInput } from '@/server/ai/flows/exam-prediction-generation';
import { AIGatewayService } from '@/server/services/ai-gateway';
import { getUserProfileServer } from '@/server/services/user';
import { randomUUID } from 'crypto';
import type { AIRequestContext, AIUserInput } from '@/server/ai/gateway-schema';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';


const ActionInputSchema = z.object({
  userId: z.string().min(1),
  subject: z.string().min(1),
  progress: z.number().min(0).max(100),
  targetGrade: z.string().min(1),
});

export async function generateGradePredictionAction(input: z.infer<typeof ActionInputSchema>) {
    try {
        const userProfile = await getUserProfileServer(input.userId);
        if (!userProfile) {
            throw new Error("User profile not found.");
        }
        
        // Fetch recent activity
        const activitySnapshot = await adminDb.collection('learning_events')
            .where('studentId', '==', input.userId)
            .where('payload.subjectId', '==', input.subject)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        let recentActivitySummary = "No recent specific activity for this subject.";
        if (!activitySnapshot.empty) {
            recentActivitySummary = activitySnapshot.docs
                .map(doc => `Completed '${doc.data().type}' on topic '${doc.data().payload?.topic || 'general'}'.`)
                .join(' ');
        }


        const gateway = new AIGatewayService();
        const context: AIRequestContext = {
            requestId: randomUUID(),
            userId: input.userId,
            taskType: 'GRADE_PREDICTION',
            featureName: 'grade-predictor',
            entitlement: 'GRADE_PREDICTION',
            role: 'STUDENT',
            subscriptionTier: userProfile.subscription || 'free',
            idempotencyKey: randomUUID(),
            estimatedInputTokens: 200, // Estimate
        };
        
        const gatewayInput: AIUserInput<GenerateExamPredictionInput> = {
            promptPayload: {
                studentName: userProfile.name || 'Student',
                targetGrade: input.targetGrade,
                subjects: [{
                    subject: input.subject,
                    currentProgress: input.progress,
                    recentActivity: recentActivitySummary
                }]
            },
        };

        const result = await gateway.execute(context, gatewayInput, generateExamPrediction);
        
        const predictionRef = adminDb.collection('student_profiles').doc(input.userId).collection('predictions').doc();
        await predictionRef.set({
            ...result.output,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, prediction: result.output };

    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message || "Failed to generate grade prediction." };
    }
}
