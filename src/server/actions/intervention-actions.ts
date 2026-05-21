
'use server';

import { z } from 'zod';
import { AIGatewayService } from '../services/ai-gateway';
import type { AIRequestContext, AIUserInput } from '../ai/gateway-schema';
import { randomUUID } from 'crypto';
import { generateIntervention, InterventionInputSchema, InterventionOutput } from '../ai/flows/intervention-generation';
import { savedResourceService } from '../services/resources';
import { logActivityEvent } from '../services/activity';
import { getUserProfileServer } from '../services/user';
import { runStudYearAction } from '../services/pipeline';
import { assertParentFeature, assertParentStudentLink } from '@/server/lib/parent-plan';
import { HttpsError } from '@/server/lib/errors';


const InterventionActionSchema = InterventionInputSchema.extend({
    userId: z.string().min(1),
});

export async function triggerInterventionAction(input: z.infer<typeof InterventionActionSchema>): Promise<{ success: boolean; output?: InterventionOutput; error?: string }> {
    try {
        await assertParentFeature(input.userId, 'aiIntervention');
        await assertParentStudentLink(input.userId, input.studentId);

        const result = await runStudYearAction({
            userId: input.userId,
            studentId: input.studentId,
            entityType: 'INTERVENTION',
            action: 'INTERVENTION_TRIGGERED',
            eventType: 'INTERVENTION_TRIGGERED',
            stage: 'IMPROVE',
            featureKey: 'AI_EXPLANATION',
            payload: input,
            execute: async () => {
                const output = await generateIntervention(input);
                
                await savedResourceService.save({
                    studentId: input.studentId,
                    type: 'RECOVERY_PLAN',
                    title: `${input.subject} - ${input.topic} Recovery Intervention`,
                    content: output,
                });
                
                return output;
            },
        });
        
        return { success: true, output: result.result };

  } catch (error: unknown) {
    console.error("Error in triggerInterventionAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(', ') };
    }
    if (error instanceof HttpsError) {
      return { success: false, error: error.message };
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
