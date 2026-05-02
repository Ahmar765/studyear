import { randomUUID } from 'crypto';
import { logAiUsage } from '@/server/services/activity';
import { getUserProfileServer } from '../services/user';
import type { AIProvider, AIRequestContext, AIUserInput, AINormalizedResponse, AITaskType } from '@/server/ai/gateway-schema';
import { HttpsError } from '@/server/lib/errors';
import { getSystemSettings } from '@/server/actions/settings-actions';
import { canUsePremiumFeature } from '@/data/entitlements';
import type { SubscriptionType } from '../schemas';
import { runPaidAIFeature, PaidAIFeatureResult } from '../services/run-paid-ai-feature';
import { FeatureKey } from '@/data/acu-costs';

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
    
    const usePerformanceModel = ['AI_FEEDBACK', 'AI_STUDY_PLAN', 'GRADE_PREDICTION'].includes(taskType);
    const modelName = usePerformanceModel ? modelMap[primaryProvider].performance : modelMap[primaryProvider].costEffective;
    
    const fallbackChain = config.fallbackOrder.map(p => ({
        provider: p as AIProvider,
        model: usePerformanceModel ? modelMap[p as keyof typeof modelMap].performance : modelMap[p as keyof typeof modelMap].costEffective,
    }));

    return {
        provider: primaryProvider,
        model: modelName,
        fallbackChain: fallbackChain.filter(f => f.provider !== primaryProvider),
    };
}

export class AIGatewayService {
  public async execute<TInput extends Record<string, any>, TOutput>(
    ctx: AIRequestContext,
    input: AIUserInput<TInput>,
    flow: (input: TInput, options?: { model?: string }) => Promise<TOutput & { id?: string }>
  ): Promise<AINormalizedResponse<TOutput>> {
    
    const routing = await routeByTaskType(ctx.taskType);
    const startTime = Date.now();

    const paidFeatureResult = await runPaidAIFeature({
        userId: ctx.userId,
        featureKey: ctx.taskType as FeatureKey, // Assuming taskType maps directly to a FeatureKey for billing
        metadata: {
            requestId: ctx.requestId,
            featureName: ctx.featureName,
        },
        action: async () => {
            let output: TOutput | null = null;
            let finalModel = routing.model;
            let finalProvider = routing.provider;
            let fallbackUsed = false;
            let lastError: Error | null = null;

            try {
                output = await flow(input.promptPayload, { model: routing.model });
            } catch (primaryError: any) {
                console.error(`AI Gateway: Primary model '${routing.model}' for task '${ctx.taskType}' failed.`, primaryError);
                lastError = primaryError;

                for (const fallback of routing.fallbackChain) {
                    try {
                        console.log(`AI Gateway: Attempting fallback to model '${fallback.model}'.`);
                        output = await flow(input.promptPayload, { model: fallback.model });
                        finalModel = fallback.model;
                        finalProvider = fallback.provider;
                        fallbackUsed = true;
                        lastError = null; // Clear error on successful fallback
                        break;
                    } catch (fallbackError: any) {
                        console.error(`AI Gateway: Fallback model '${fallback.model}' also failed.`, fallbackError);
                        lastError = fallbackError;
                    }
                }
            }

            if (!output) {
                // If all attempts fail, we should probably handle refunds or re-crediting ACUs here.
                // For now, we throw, and the error will be caught by the action handler.
                throw new HttpsError("internal", `All AI providers failed for task '${ctx.featureName}'. Last error: ${lastError?.message}`);
            }
            
            return {
                output,
                finalModel,
                finalProvider,
                fallbackUsed
            };
        }
    });

    const { result, acu } = paidFeatureResult;
    const { output, finalModel, finalProvider, fallbackUsed } = result;

    const latencyMs = Date.now() - startTime;
    const outputTokens = Math.ceil(JSON.stringify(output).length / 4);

    await logAiUsage({
        requestId: ctx.requestId,
        userId: ctx.userId,
        taskType: ctx.taskType,
        featureKey: ctx.taskType as FeatureKey,
        provider: finalProvider,
        model: finalModel,
        status: 'success',
        fallbackUsed,
        latencyMs,
        inputTokens: ctx.estimatedInputTokens,
        outputTokens: outputTokens,
        realCost: 0, // Placeholder
        customerChargeEquivalent: 0, // Placeholder
        chargedAcus: acu.chargedACUs,
        pricingPolicyId: 'default', // Placeholder
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
        estimatedCost: acu.chargedACUs,
      },
      latencyMs,
      fallbackUsed,
    };
  }
}
