import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import { z } from 'zod';

export const ParentAdvisorInputSchema = z.object({
  question: z.string().min(3),
  childName: z.string(),
  childSummary: z.string().describe('JSON or prose summary of live child metrics'),
});

export const ParentAdvisorOutputSchema = z.object({
  answer: z.string(),
  suggestedActions: z.array(z.string()).min(1).max(5),
  urgency: z.enum(['low', 'medium', 'high']),
});

export type ParentAdvisorInput = z.infer<typeof ParentAdvisorInputSchema>;
export type ParentAdvisorOutput = z.infer<typeof ParentAdvisorOutputSchema>;

const parentAdvisorPrompt = ai.definePrompt({
  name: 'parentAdvisorPrompt',
  input: { schema: ParentAdvisorInputSchema },
  output: { schema: ParentAdvisorOutputSchema },
  prompt: `You are StudYear Parent Advisor — a calm, expert co-pilot for parents supporting their child's learning.

Child: {{{childName}}}
Live data summary:
{{{childSummary}}}

Parent question: {{{question}}}

Respond in clear UK English. Be supportive, specific, and actionable — reference the data where possible. Avoid generic advice.`,
});

const parentAdvisorFlow = ai.defineFlow(
  {
    name: 'parentAdvisorFlow',
    inputSchema: ParentAdvisorInputSchema,
    outputSchema: ParentAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await parentAdvisorPrompt(input, { model: toGoogleAiGenkitModel() });
    if (!output) throw new Error('Parent advisor did not return a response.');
    return output;
  },
);

export async function generateParentAdvisorResponse(
  input: ParentAdvisorInput,
): Promise<ParentAdvisorOutput> {
  return parentAdvisorFlow(input);
}
