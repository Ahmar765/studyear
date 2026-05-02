import { ACUService } from "./acu-service";
import { FeatureKey, ACU_FEATURE_COSTS } from "@/data/acu-costs";
import { getUserProfileServer } from "./user";
import { canUsePremiumFeature } from "@/data/entitlements";
import type { SubscriptionType } from "../schemas";
import { HttpsError } from "../lib/errors";

export interface PaidAIFeatureResult<T> {
  success: true,
  acu: {
      chargedACUs: number;
  },
  result: T,
  entityId: string; // The ID of the primary entity created, e.g., a quiz ID.
};

export async function runPaidAIFeature<T>(input: {
  userId: string;
  featureKey: FeatureKey;
  metadata?: Record<string, unknown>;
  action: () => Promise<T & { id?: string }>; // Action can optionally return an object with an ID
}): Promise<PaidAIFeatureResult<T>> {

  const user = await getUserProfileServer(input.userId);
  if (!user) {
    throw new HttpsError("not-found", "USER_NOT_FOUND");
  }

  // Admins bypass checks
  if (user.role !== 'ADMIN') {
    if (!canUsePremiumFeature(user.subscription as SubscriptionType, input.featureKey)) {
      throw new HttpsError("failed-precondition", `FEATURE_NOT_INCLUDED_IN_PLAN: ${input.featureKey}`);
    }
  }
  
  if (!(input.featureKey in ACU_FEATURE_COSTS)) {
      throw new HttpsError("invalid-argument", `Feature key '${input.featureKey}' not found in ACU costs.`);
  }

  const debit = await ACUService.enforceAndDebit({
    userId: input.userId,
    featureKey: input.featureKey,
    metadata: input.metadata
  });

  const result = await input.action();

  return {
    success: true,
    acu: { chargedACUs: debit.chargedACUs },
    result,
    entityId: result.id || "" // Pass back the ID from the action's result if it exists
  };
}
