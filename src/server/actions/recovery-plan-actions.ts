
'use server';

import { z } from 'zod';
import { generateRecoveryPlan, RecoveryPlanInput, RecoveryPlanOutput } from '@/server/ai/flows/recovery-plan-generation';
import { AIGatewayService } from '../services/ai-gateway';
import { randomUUID } from 'crypto';
import type { AIRequestContext, AIUserInput } from '../ai/gateway-schema';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { HttpsError } from '../lib/errors';
import { saveStudentResource } from '../services/resources';
import { getUserProfileServer } from '../services/user';

const BuildRecoveryPlanSchema = z.object({
  userId: z.string().min(1),
  studentId: z.string().min(1),
  diagnosticId: z.string().min(1),
});

export async function buildPersonalRecoveryPlanAction(
  input: z.infer<typeof BuildRecoveryPlanSchema>
): Promise<{ success: boolean; recoveryPlanId?: string; recoveryPlan?: RecoveryPlanOutput; error?: string }> {
  try {
    const { userId, studentId, diagnosticId } = BuildRecoveryPlanSchema.parse(input);

    const diagnosticSnap = await adminDb.collection('diagnostic_results').doc(diagnosticId).get();
    if (!diagnosticSnap.exists) {
      throw new HttpsError('not-found', 'Diagnostic result not found.');
    }
    const diagnosticData = diagnosticSnap.data() as RecoveryPlanInput;

    const userProfile = await getUserProfileServer(userId);
    if (!userProfile) throw new Error("User profile not found.");

    const gateway = new AIGatewayService();
    const context: AIRequestContext = {
      requestId: randomUUID(),
      userId,
      taskType: 'AI_STUDY_PLAN', // Using study plan cost for this
      featureName: 'recovery-plan-generator',
      entitlement: 'AI_STUDY_PLAN',
      role: userProfile.role,
      subscriptionTier: userProfile.subscription || 'free',
      idempotencyKey: randomUUID(),
      estimatedInputTokens: 500, // Estimate for this type of task
    };

    const gatewayInput: AIUserInput<RecoveryPlanInput> = {
      promptPayload: diagnosticData,
    };

    const response = await gateway.execute(context, gatewayInput, generateRecoveryPlan);
    const recoveryPlan = response.output;
    
    const recoveryRef = adminDb.collection('recovery_plans').doc();
    await recoveryRef.set({
        userId,
        studentId,
        diagnosticId,
        ...recoveryPlan,
        status: "ACTIVE",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await saveStudentResource({
        studentId,
        type: 'RECOVERY_PLAN',
        title: recoveryPlan.title,
        content: recoveryPlan,
        linkedEntityId: recoveryRef.id,
    });
    
    return { success: true, recoveryPlanId: recoveryRef.id, recoveryPlan };
  } catch (error: any) {
    console.error("Error building recovery plan:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
