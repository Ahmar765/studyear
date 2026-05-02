/**
 * @fileOverview An AI tutor bot that provides precise answers and escalates to humans when necessary.
 * This file implements the core logic for the "AI Tutor" feature, aligned with the ACU-driven,
 * precision-first, human-escalation ready system prompt.
 *
 * - aiTutorAssistance - A function that handles the AI tutor assistance process.
 * - AiTutorAssistanceInput - The input type for the function.
 * - AiTutorAssistanceOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const AiTutorAssistanceInputSchema = z.object({
  query: z.string().describe('The query from the user.'),
  history: z.array(MessageSchema).optional().describe("A transcript of the conversation so far."),
  // The lessonPlan and currentStep fields are kept for potential future integration with interactive lessons
  lessonPlan: z.any().optional(),
  currentStep: z.number().optional(),
});
export type AiTutorAssistanceInput = z.infer<typeof AiTutorAssistanceInputSchema>;

const AiTutorAssistanceOutputSchema = z.object({
  response: z.string().describe('The precise, outcome-driven response from the AI tutor, formatted in Markdown.'),
  detectedWeakness: z.string().optional().describe("A specific weakness or misconception detected in the user's query."),
  followUpQuestion: z.string().optional().describe("A targeted question to check for understanding."),
  nextAction: z.string().optional().describe("A suggested next action for the student."),
  escalated: z.boolean().describe("Set to true if the query cannot be answered and requires human intervention."),
});
export type AiTutorAssistanceOutput = z.infer<typeof AiTutorAssistanceOutputSchema>;

export async function aiTutorAssistance(input: AiTutorAssistanceInput, options?: { model?: string }): Promise<AiTutorAssistanceOutput> {
  return aiTutorAssistanceFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'aiTutorAssistancePrompt',
  input: {schema: AiTutorAssistanceInputSchema},
  output: {schema: AiTutorAssistanceOutputSchema},
  prompt: `You are StudYear AI Tutor. You are a performance engine, not a chatbot.

Your job:
1. Diagnose what the student does not understand from their query.
2. Explain based on their level.
3. Guide step-by-step.
4. Detect mistakes and weaknesses.
5. Always suggest a next action to guide their learning.
6. Force mastery before progression.

**Conversation History (if any):**
{{#if history}}
{{#each history}}
- {{role}}: {{content}}
{{/each}}
{{/if}}

**User's New Query:** "{{{query}}}"

**Rules:**
1. **RESPONSE STYLE:** Be direct and decisive. Provide the answer first, then minimal steps if necessary. Use Markdown for formatting.
2. **DIAGNOSE:** Identify the core misunderstanding in the user's query. Populate \`detectedWeakness\`.
3. **GUIDE:** After answering, provide a \`followUpQuestion\` to check understanding and a \`nextAction\` to guide them.
4. **ESCALATE:** If the query is ambiguous, outside your academic scope, involves sensitive topics, or you are not confident, set \`escalated\` to \`true\` and set \`response\` to "I'm not sure how to help with that. I'm escalating this to our human support team.".

Analyze the query and generate your response in the required JSON format.
`,
});


const aiTutorAssistanceFlow = ai.defineFlow(
  {
    name: 'aiTutorAssistanceFlow',
    inputSchema: AiTutorAssistanceInputSchema,
    outputSchema: AiTutorAssistanceOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
