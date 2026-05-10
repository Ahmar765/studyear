
'use server';

import { z } from 'zod';
import { DiagnosticReportSchema } from '@/server/ai/flows/diagnostic-report-generation';
import {
  generateRecoveryPlan,
  RecoveryPlanInput,
  RecoveryPlanOutput,
} from '@/server/ai/flows/recovery-plan-generation';
import { buildRecoveryStudentAcademicContext } from '@/server/lib/recovery-plan-context';
import { AIGatewayService } from '../services/ai-gateway';
import { randomUUID } from 'crypto';
import type { AIRequestContext, AIUserInput } from '../ai/gateway-schema';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { HttpsError } from '../lib/errors';
import { saveStudentResource } from '../services/resources';
import { getUserProfileServer } from '../services/user';

/** Firestore rejects nested `undefined`; AI payloads may omit optional keys inconsistently. */
function omitUndefinedDeep(input: unknown): unknown {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (input instanceof Date) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => omitUndefinedDeep(item));
  }
  const ctorName =
    typeof (input as { constructor?: { name?: string } }).constructor?.name === 'string'
      ? String((input as { constructor: { name: string } }).constructor.name)
      : '';
  if (
    ctorName.includes('FieldValue') ||
    ctorName === 'Timestamp' ||
    ctorName === 'GeoPoint'
  ) {
    return input;
  }
  const o = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    const nv = omitUndefinedDeep(v);
    if (nv !== undefined) out[k] = nv;
  }
  return out;
}

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
    const diagnosticRaw = diagnosticSnap.data() as Record<string, unknown>;
    const diagnosticReport = DiagnosticReportSchema.parse(diagnosticRaw);

    const userProfile = await getUserProfileServer(userId);
    if (!userProfile) throw new Error("User profile not found.");

    const studentAcademicContext = buildRecoveryStudentAcademicContext(
      userProfile,
      diagnosticRaw,
    );

    const hasAcademicContext =
      (studentAcademicContext.subjectGradeDetails?.length ?? 0) > 0 ||
      !!(studentAcademicContext.studyLevel ||
        studentAcademicContext.yearGroup ||
        studentAcademicContext.overallCurrentGrade ||
        studentAcademicContext.overallTargetGrade ||
        studentAcademicContext.examBoard);

    const recoveryPlanInput: RecoveryPlanInput = hasAcademicContext
      ? { ...diagnosticReport, studentAcademicContext }
      : { ...diagnosticReport };

    const gateway = new AIGatewayService();
    const context: AIRequestContext = {
      requestId: randomUUID(),
      userId,
      taskType: 'RECOVERY_PLAN',
      featureName: 'recovery-plan-generator',
      entitlement: 'RECOVERY_PLAN',
      role: userProfile.role,
      subscriptionTier: userProfile.subscription || 'free',
      idempotencyKey: randomUUID(),
      estimatedInputTokens: 750,
    };

    const gatewayInput: AIUserInput<RecoveryPlanInput> = {
      promptPayload: recoveryPlanInput,
    };

    const response = await gateway.execute(context, gatewayInput, generateRecoveryPlan);
    const recoveryPlan = response.output;
    
    const recoveryRef = adminDb.collection('recovery_plans').doc();
    const ctxPlain = omitUndefinedDeep(studentAcademicContext) as Record<
      string,
      unknown
    >;
    const planPlain = omitUndefinedDeep(recoveryPlan) as Record<string, unknown>;
    await recoveryRef.set({
      userId,
      studentId,
      diagnosticId,
      ...planPlain,
      ...(Object.keys(ctxPlain).length > 0
        ? { studentAcademicContext: ctxPlain }
        : {}),
      status: "ACTIVE",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await saveStudentResource({
      studentId,
      type: "RECOVERY_PLAN",
      title: recoveryPlan.title,
      content: planPlain,
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
