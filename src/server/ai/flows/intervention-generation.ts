/**
 * @fileOverview An AI agent that generates a corrective intervention for a struggling student.
 */

import { ai } from '@/server/ai';
import {z} from 'zod';

export const InterventionInputSchema = z.object({
  studentId: z.string(),
  subject: z.string(),
  topic: z.string(),
  mistakePattern: z.string().describe("A description of the specific mistake the student is making."),
  struggleScore: z.number().describe("A score from 0-1 indicating how much the student is struggling."),
});
export type InterventionInput = z.infer<typeof InterventionInputSchema>;

export const InterventionOutputSchema = z.object({
  interventionType: z.enum(["MICRO_RETEACH", "GUIDED_EXAMPLE", "CONCEPT_REBUILD", "DIFFICULTY_REDUCTION"]),
  studentMessage: z.string().describe("An encouraging message to the student explaining the intervention."),
  microLesson: z.string().describe("A short, focused lesson on the specific concept the student is misunderstanding."),
  guidedExample: z.string().describe("A new, simple example with a step-by-step walkthrough."),
  practiceStep: z.string().describe("A single, small practice step for the student to take right now."),
  checkQuestion: z.string().describe("A simple question to verify if the student understood the intervention."),
});
export type InterventionOutput = z.infer<typeof InterventionOutputSchema>;


export async function generateIntervention(input: InterventionInput): Promise<InterventionOutput> {
  return interventionGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interventionGenerationPrompt',
  input: {schema: InterventionInputSchema},
  output: {schema: InterventionOutputSchema},
  prompt: `You are StudYear Intervention AI. A student is struggling and needs a corrective intervention.

**Student Context:**
- Subject: {{{subject}}}
- Topic: {{{topic}}}
- Mistake Pattern: {{{mistakePattern}}}
- Struggle Score: {{{struggleScore}}}

**Your Task:**
Create a corrective intervention plan. Do not just answer the student's original question. Your goal is to fix the underlying misunderstanding.

1.  **Choose \`interventionType\`**: Based on the struggle score and mistake pattern, select the best type of intervention.
    *   \`MICRO_RETEACH\`: For simple factual errors.
    *   \`GUIDED_EXAMPLE\`: If they understand the concept but fail in application.
    *   \`CONCEPT_REBUILD\`: If their foundational understanding is flawed.
    *   \`DIFFICULTY_REDUCTION\`: If the problem is too complex, break it down.
2.  **\`studentMessage\`**: Write a kind, encouraging message. Acknowledge their effort and introduce the intervention.
3.  **\`microLesson\`**: Provide a very short lesson (2-3 sentences) re-explaining the single most important concept they are missing.
4.  **\`guidedExample\`**: Give a new, simple example and walk them through it step-by-step.
5.  **\`practiceStep\`**: Give them one small, immediate action to take.
6.  **\`checkQuestion\`**: Ask a simple question to see if they've understood the intervention.

Generate the intervention plan as a JSON object now.`,
});

const interventionGenerationFlow = ai.defineFlow(
  {
    name: 'interventionGenerationFlow',
    inputSchema: InterventionInputSchema,
    outputSchema: InterventionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
