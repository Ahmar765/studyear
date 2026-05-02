import { autosaveService } from "./autosave";
import { learningEventService } from "./learning-events";
import { dashboardSyncService } from "./dashboard-sync";
import { auditLogService } from "./audit";
import { runPaidAIFeature, PaidAIFeatureResult } from "./run-paid-ai-feature";
import { FeatureKey } from "@/data/acu-costs";
import { randomUUID } from "crypto";

export async function runStudYearAction<T>(input: {
  userId: string;
  studentId: string;
  entityType: string;
  action: string;
  eventType: string;
  stage: "ASSESS" | "PLAN" | "LEARN" | "PRACTISE" | "ANALYSE" | "IMPROVE";
  featureKey: FeatureKey;
  payload: any;
  execute: () => Promise<T>;
}): Promise<PaidAIFeatureResult<T>> {
  
  const entityId = randomUUID();

  try {
    const result = await runPaidAIFeature({
      userId: input.userId,
      featureKey: input.featureKey,
      metadata: {
        studentId: input.studentId,
        entityType: input.entityType,
        action: input.action,
        pipelineId: entityId
      },
      action: input.execute,
    });

    await autosaveService.capture({
      userId: input.userId,
      studentId: input.studentId,
      entityType: input.entityType,
      entityId: entityId,
      action: input.action,
      payload: {
        input: input.payload,
        result: result.result
      }
    });

    await learningEventService.create({
      studentId: input.studentId,
      type: input.eventType as any,
      stage: input.stage,
      payload: {
        input: input.payload,
        result: result.result
      }
    });

    await auditLogService.record({
      userId: input.userId,
      action: input.action,
      metadata: {
        studentId: input.studentId,
        entityType: input.entityType
      }
    });

    await dashboardSyncService.updateStudentDashboard(input.studentId);

    return result;

  } catch (error: any) {
    await autosaveService.capture({
      userId: input.userId,
      studentId: input.studentId,
      entityType: input.entityType,
      entityId: entityId,
      action: "FAILED",
      payload: {
        originalAction: input.action,
        error: error.message
      }
    });

    // Re-throw the error so the client knows the action failed
    throw error;
  }
}

    