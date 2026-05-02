import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';
import { DiagnosticReportSchema } from './diagnostic-report-generation';

const WeeklyTaskSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  action: z.string(),
  estimatedMinutes: z.number(),
  expectedOutcome: z.string(),
});

const WeeklyRecoveryPlanSchema = z.object({
  week: z.number(),
  focus: z.string(),
  tasks: z.array(WeeklyTaskSchema),
});

export const RecoveryPlanOutputSchema = z.object({
  title: z.string(),
  recoveryObjective: z.string(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  urgentFocusAreas: z.array(z.string()),
  weeklyRecoveryPlan: z.array(WeeklyRecoveryPlanSchema),
  dailyNonNegotiables: z.array(z.string()),
  parentSupportActions: z.array(z.string()),
  successMetrics: z.array(z.string()),
});
export type RecoveryPlanOutput = z.infer<typeof RecoveryPlanOutputSchema>;

export const RecoveryPlanInputSchema = DiagnosticReportSchema;
export type RecoveryPlanInput = z.infer<typeof RecoveryPlanInputSchema>;

export async function generateRecoveryPlan(input: RecoveryPlanInput, options?: { model?: string }): Promise<RecoveryPlanOutput> {
  return recoveryPlanGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'recoveryPlanGenerationPrompt',
  input: {schema: RecoveryPlanInputSchema},
  output: {schema: RecoveryPlanOutputSchema},
  prompt: `
You are StudYear Personal Recovery Plan AI.

Create a robust academic recovery plan from the diagnostic result.

This is NOT a normal study plan.
This is a corrective plan to fix weak areas, close gaps and recover academic performance.

Return JSON only.

Rules:
- Prioritise the weakest areas first.
- Make actions measurable.
- Include clear weekly structure.
- Include parent support actions.
- Include success metrics.

Diagnostic Result:
{{{json input}}}
`,
});

const recoveryPlanGenerationFlow = ai.defineFlow(
  {
    name: 'recoveryPlanGenerationFlow',
    inputSchema: RecoveryPlanInputSchema,
    outputSchema: RecoveryPlanOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
