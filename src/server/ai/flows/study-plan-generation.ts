/**
 * @fileOverview An AI agent that generates a personalized study plan based on detailed user inputs.
 *
 * - generateStudyPlan - A function that handles generating the plan.
 * - GenerateStudyPlanInput - The input type for the function.
 * - GenerateStudyPlanOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';
import { DiagnosticReportSchema } from './diagnostic-report-generation';

const DailySessionSchema = z.object({
  time: z.enum(["Morning", "Afternoon", "Evening"]),
  subject: z.string(),
  topic: z.string(),
  revisionMethod: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const DailyPlanSchema = z.object({
  day: z.string(),
  sessions: z.array(DailySessionSchema),
});

const WeeklyPlanSchema = z.object({
  week: z.number(),
  weeklyGoal: z.string(),
  dailyPlans: z.array(DailyPlanSchema),
});


export const GenerateStudyPlanInputSchema = z.object({
  diagnostic: DiagnosticReportSchema.optional().describe("The student's full diagnostic report, if available."),
  examDate: z.string().optional().describe('The main exam date or deadline for the study plan. Format: YYYY-MM-DD.'),
  availableHoursPerWeek: z.number().int().positive().optional().describe('The total number of study hours available per week.'),
  examGoal: z.string().optional().describe("The student's primary goal for their exams."),
});
export type GenerateStudyPlanInput = z.infer<typeof GenerateStudyPlanInputSchema>;

export const GenerateStudyPlanOutputSchema = z.object({
  title: z.string(),
  planSummary: z.string().describe("A brief, motivating summary of the generated plan."),
  weeklyPlans: z.array(WeeklyPlanSchema),
});
export type GenerateStudyPlanOutput = z.infer<typeof GenerateStudyPlanOutputSchema>;


const prompt = ai.definePrompt({
  name: 'studyPlanGenerationPrompt',
  input: {schema: GenerateStudyPlanInputSchema},
  output: {schema: GenerateStudyPlanOutputSchema},
  prompt: `You are StudYear AI Study Planner.

Create a robust personalised exam preparation study plan.

Purpose:
Take the stress out of homework and exams by giving the student a clear, structured plan in under 5 minutes.

Return JSON only.

Rules:
- Build a full exam preparation plan, not a list of topics.
- Use diagnostic weaknesses.
- Use target grade and exam date if provided.
- Prioritise high-impact topics.
- Include daily and weekly structure.
- Include exam strategy.
- Include measurable outcomes.

**Input Data:**
{{{json input}}}
`,
});

/**
 * Call the prompt directly (no defineFlow). The flow wrapper applies Genkit output
 * JSON-schema validation that has triggered runtime errors (e.g. undefined `.value`)
 * with some model responses; we validate with Zod instead.
 */
export async function generateStudyPlan(
  input: GenerateStudyPlanInput,
  options?: { model?: string },
): Promise<GenerateStudyPlanOutput> {
  const parsedInput = GenerateStudyPlanInputSchema.parse(input);
  const response = await prompt(parsedInput, {
    model: toGoogleAiGenkitModel(options?.model),
  });

  let structured: unknown;
  try {
    structured = response.output;
  } catch (e) {
    throw new Error(
      `Failed to read study plan model output: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (structured == null) {
    throw new Error(
      `Study plan generation returned empty output (finish: ${String(response.finishReason ?? "unknown")}).`,
    );
  }

  return GenerateStudyPlanOutputSchema.parse(structured);
}
