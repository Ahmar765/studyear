import { randomUUID } from 'crypto';
import { logAiUsage } from '@/server/services/activity';
import { getUserProfileServer } from './user';
import type { AIProvider, AIRequestContext, AIUserInput, AINormalizedResponse, AITaskType } from '@/server/ai/gateway-schema';
import { HttpsError } from '@/server/lib/errors';
import { getSystemSettings } from '@/server/actions/settings-actions';
import { ACUService } from './acu-service';
import type { FeatureKey } from '@/data/acu-costs';
import { canUsePremiumFeature } from '@/data/entitlements';
import type { SubscriptionType } from '../schemas';
import type { SystemSettings } from '@/server/schemas/system-settings';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';

/** If Firestore/config omits a model id, Genkit throws "Must supply a `model` to `generate()`". */
const MODEL_FALLBACK: Record<AIProvider, { costEffective: string; performance: string }> = {
    openai: { costEffective: 'gpt-4-turbo', performance: 'gpt-4o' },
    gemini: { costEffective: 'gemini-2.5-flash', performance: 'gemini-2.5-pro' },
    vertex: { costEffective: 'gemini-2.5-flash', performance: 'gemini-2.5-pro' },
};

function resolveModelId(
    modelMap: NonNullable<SystemSettings['aiProvider']>['modelMap'],
    provider: AIProvider,
    usePerformanceModel: boolean,
): string {
    const entry = modelMap[provider];
    const fb = MODEL_FALLBACK[provider];
    const raw = usePerformanceModel ? entry?.performance : entry?.costEffective;
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    const resolved = trimmed || (usePerformanceModel ? fb.performance : fb.costEffective);
    return toGoogleAiGenkitModel(resolved);
}

async function routeByTaskType(taskType: AITaskType): Promise<{ provider: AIProvider; model: string; fallbackChain: { provider: AIProvider; model: string }[] }> {
    const settings = await getSystemSettings();
    const config = settings.aiProvider;

    if (!config) {
        throw new HttpsError('internal', 'AI provider configuration is missing.');
    }

    const providerMap: Record<string, AIProvider> = {
        openai: 'openai',
        gemini: 'gemini',
        vertex: 'vertex',
    };
    const primaryProvider = providerMap[config.defaultProvider] || 'gemini';
    const modelMap = config.modelMap;

    if (!modelMap) {
        throw new HttpsError('internal', 'AI modelMap is missing from configuration.');
    }

    const usePerformanceModel = ['AI_FEEDBACK', 'AI_STUDY_PLAN', 'GRADE_PREDICTION', 'grade_prediction'].includes(
        taskType,
    );
    const modelName = resolveModelId(modelMap, primaryProvider, usePerformanceModel);

    const fallbackChain = config.fallbackOrder.map((p) => ({
        provider: p as AIProvider,
        model: resolveModelId(modelMap, p as AIProvider, usePerformanceModel),
    }));

    return {
        provider: primaryProvider,
        model: modelName,
        fallbackChain: fallbackChain.filter((f) => f.provider !== primaryProvider),
    };
}

export class AIGatewayService {
  public async execute<TInput extends Record<string, any>, TOutput>(
    ctx: AIRequestContext,
    input: AIUserInput<TInput>,
    flow: (input: TInput, options?: { model?: string }) => Promise<TOutput>
  ): Promise<AINormalizedResponse<TOutput>> {
    
    // Admins bypass billing and entitlement checks for testing and management.
    if (ctx.role === 'ADMIN') {
      console.info(`Bypassing billing and entitlement for admin user ${ctx.userId}`);
    } else if (ctx.entitlement) {
        const user = await getUserProfileServer(ctx.userId);
        if (!user) throw new HttpsError("not-found", "USER_NOT_FOUND");
        
        const subscriptionType = user.subscription as SubscriptionType;
        const feature = ctx.entitlement;

        if (!canUsePremiumFeature(subscriptionType, feature)) {
             throw new HttpsError("failed-precondition", `FEATURE_NOT_INCLUDED_IN_PLAN: ${feature}`);
        }
    }
    
    let debitResult;
    if (ctx.entitlement) {
        debitResult = await ACUService.enforceAndDebit({
            userId: ctx.userId,
            featureKey: ctx.entitlement,
            metadata: { requestId: ctx.requestId }
        });
    } else {
        debitResult = { acuCharged: 0 };
    }
    
    const route = await routeByTaskType(ctx.taskType);
    const startTime = Date.now();

    let output: TOutput | null = null;
    let finalModel = route.model;
    let finalProvider = route.provider;
    let fallbackUsed = false;
    let lastError: Error | null = null;
    
    try {
        output = await flow(input.promptPayload, { model: route.model });
    } catch (primaryError: any) {
        console.error(`AI Gateway: Primary model '${route.model}' for task '${ctx.taskType}' failed.`, primaryError);
        lastError = primaryError;

        for (const fallback of route.fallbackChain) {
            try {
                console.log(`AI Gateway: Attempting fallback to model '${fallback.model}'.`);
                output = await flow(input.promptPayload, { model: fallback.model });
                finalModel = fallback.model;
                finalProvider = fallback.provider;
                fallbackUsed = true;
                lastError = null;
                break;
            } catch (fallbackError: any) {
                console.error(`AI Gateway: Fallback model '${fallback.model}' also failed.`, fallbackError);
                lastError = fallbackError;
            }
        }
    }
    
    const latencyMs = Date.now() - startTime;
    
    if (!output) {
      await logAiUsage({
          requestId: ctx.requestId, userId: ctx.userId,
          taskType: ctx.taskType, provider: finalProvider, model: finalModel,
          status: 'failed', fallbackUsed: true, latencyMs,
          inputTokens: ctx.estimatedInputTokens, outputTokens: 0,
          realCost: 0,
          customerChargeEquivalent: 0,
          chargedAcus: debitResult.acuCharged,
          pricingPolicyId: 'default-refunded-on-fail',
      });
      throw new HttpsError("internal", `The AI failed to process your request for ${ctx.featureName}. Error: ${(lastError as Error)?.message}`);
    }

    const outputTokens = Math.ceil(JSON.stringify(output).length / 4);

     await logAiUsage({
        requestId: ctx.requestId, userId: ctx.userId,
        taskType: ctx.taskType, provider: finalProvider, model: finalModel,
        status: 'success', fallbackUsed, latencyMs,
        inputTokens: ctx.estimatedInputTokens, outputTokens: outputTokens,
        realCost: 0,
        customerChargeEquivalent: 0,
        chargedAcus: debitResult.acuCharged,
        pricingPolicyId: 'default',
    });

    return {
      requestId: ctx.requestId,
      provider: finalProvider,
      model: finalModel,
      taskType: ctx.taskType,
      status: "success",
      output,
      usage: {
        inputTokens: ctx.estimatedInputTokens,
        outputTokens: outputTokens,
        estimatedCost: debitResult.acuCharged,
      },
      latencyMs,
      fallbackUsed,
    };
  }
}
