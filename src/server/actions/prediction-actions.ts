
'use server';

import { generateExamPrediction, GenerateExamPredictionInput } from '@/server/ai/flows/exam-prediction-generation';
import { AIGatewayService } from '@/server/services/ai-gateway';
import { getUserProfileServer } from '@/server/services/user';
import { randomUUID } from 'crypto';
import type { AIRequestContext, AIUserInput } from '@/server/ai/gateway-schema';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

/** Match profile subject names against varied learning_events payload shapes (pipeline wraps fields under `input`). */
function learningEventTouchesSubject(
  data: admin.firestore.DocumentData,
  subjectName: string,
): boolean {
  const needle = subjectName.trim().toLowerCase();
  const payload = data.payload;
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  const eq = (v: unknown) =>
    typeof v === 'string' && v.trim().toLowerCase() === needle;

  if (eq(p.subjectId) || eq(p.subject)) return true;

  const inner = p.input;
  if (inner && typeof inner === 'object') {
    const i = inner as Record<string, unknown>;
    if (eq(i.subjectId) || eq(i.subject)) return true;
    const subjects = i.subjects;
    if (Array.isArray(subjects)) {
      for (const s of subjects) {
        if (typeof s === 'string' && s.trim().toLowerCase() === needle) return true;
        if (s && typeof s === 'object' && 'name' in (s as object)) {
          const nm = (s as { name?: string }).name;
          if (eq(nm)) return true;
        }
      }
    }
    const topic = typeof i.topic === 'string' ? i.topic : undefined;
    if (topic && topic.toLowerCase().includes(needle)) return true;
  }

  const topicTop = typeof p.topic === 'string' ? p.topic : undefined;
  if (topicTop && topicTop.toLowerCase().includes(needle)) return true;

  try {
    if (JSON.stringify(payload).toLowerCase().includes(needle)) return true;
  } catch {
    /* ignore circular refs */
  }

  return false;
}

function learningEventCreatedMs(data: admin.firestore.DocumentData): number {
  const c = data.createdAt;
  if (c && typeof (c as admin.firestore.Timestamp).toMillis === 'function') {
    return (c as admin.firestore.Timestamp).toMillis();
  }
  return 0;
}

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
        
        // Equality + limit only (no composite index). Sort by createdAt in memory — avoids
        // FAILED_PRECONDITION when Firestore composite indexes are not deployed yet.
        const activitySnapshot = await adminDb
            .collection('learning_events')
            .where('studentId', '==', input.userId)
            .limit(300)
            .get();

        const sortedDocs = [...activitySnapshot.docs].sort(
            (a, b) => learningEventCreatedMs(b.data()) - learningEventCreatedMs(a.data()),
        );

        const matchingDocs = sortedDocs
            .filter((doc) => learningEventTouchesSubject(doc.data(), input.subject))
            .slice(0, 5);

        let recentActivitySummary = 'No recent specific activity for this subject.';
        if (matchingDocs.length > 0) {
            recentActivitySummary = matchingDocs
                .map((doc) => {
                    const d = doc.data();
                    const pl = (d.payload || {}) as Record<string, unknown>;
                    const inner = pl.input as Record<string, unknown> | undefined;
                    const topic =
                        (typeof pl.topic === 'string' ? pl.topic : undefined) ??
                        (inner && typeof inner.topic === 'string' ? inner.topic : undefined);
                    return `Completed '${d.type}' on topic '${topic || 'general'}'.`;
                })
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
