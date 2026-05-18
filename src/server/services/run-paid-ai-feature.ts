import { ACUService } from "./acu-service";
import { FeatureKey, ACU_FEATURE_COSTS } from "@/data/acu-costs";
import { getUserProfileServer } from "./user";
import { canUsePremiumFeature, requiresSubscriptionForFeature } from "@/data/entitlements";
import type { SubscriptionType } from "../schemas";
import { HttpsError } from "../lib/errors";
import { getTeacherSchoolLink } from "../lib/school-staff-link";

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

  // Admins bypass subscription checks. ACU-only features (e.g. lesson builder) need ACUs only.
  if (user.role !== 'ADMIN' && requiresSubscriptionForFeature(input.featureKey)) {
    const subscriptionType = user.subscription as SubscriptionType;
    const schoolLinkedTutor =
      user.role === 'SCHOOL_TUTOR' && (await getTeacherSchoolLink(input.userId)).linked;
    if (
      !schoolLinkedTutor &&
      !canUsePremiumFeature(subscriptionType, input.featureKey)
    ) {
      throw new HttpsError('failed-precondition', `FEATURE_NOT_INCLUDED_IN_PLAN: ${input.featureKey}`);
    }
    if (
      schoolLinkedTutor &&
      !canUsePremiumFeature('SCHOOL_TUTOR', input.featureKey) &&
      !canUsePremiumFeature(subscriptionType, input.featureKey)
    ) {
      throw new HttpsError(
        'failed-precondition',
        `FEATURE_NOT_INCLUDED_IN_PLAN: ${input.featureKey} is not enabled for school teachers.`,
      );
    }
  }

  if (!(input.featureKey in ACU_FEATURE_COSTS)) {
      throw new HttpsError("invalid-argument", `Feature key '${input.featureKey}' not found in ACU costs.`);
  }

  /** Platform admins run internal tools (e.g. blog generator) without debiting a possibly empty wallet. */
  const debit =
    user.role === 'ADMIN'
      ? { chargedACUs: 0 }
      : await ACUService.enforceAndDebit({
          userId: input.userId,
          featureKey: input.featureKey,
          metadata: input.metadata,
        });

  const result = await input.action();

  return {
    success: true,
    acu: { chargedACUs: debit.chargedACUs },
    result,
    entityId: result.id || "" // Pass back the ID from the action's result if it exists
  };
}
