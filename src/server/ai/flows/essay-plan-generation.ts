/**
 * @fileOverview An AI agent that generates a structured essay plan.
 *
 * - generateEssayPlan - A function that handles generating the essay plan.
 * - GenerateEssayPlanInput - The input type for the function.
 * - GenerateEssayPlanOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

export const GenerateEssayPlanInputSchema = z.object({
  essayTopicOrQuestion: z.string().describe('The topic or specific question for which to generate an essay plan.'),
});
export type GenerateEssayPlanInput = z.infer<typeof GenerateEssayPlanInputSchema>;

const BodyParagraphSchema = z.object({
    point: z.string().describe("The main point or argument for this paragraph."),
    evidence: z.string().describe("Examples of evidence, quotes, or data to support the point."),
    explanation: z.string().describe("Explanation of how the evidence supports the point."),
});

export const GenerateEssayPlanOutputSchema = z.object({
  title: z.string().describe("A suggested title for the essay."),
  thesisStatement: z.string().describe("A clear, concise thesis statement that presents the main argument of the essay."),
  introduction: z.string().describe("A brief outline for the introductory paragraph, including the hook and context."),
  bodyParagraphs: z.array(BodyParagraphSchema).describe("An array of 3-4 body paragraphs, each with a clear point, supporting evidence, and explanation."),
  conclusion: z.string().describe("A brief outline for the concluding paragraph, summarizing the main points and restating the thesis."),
});
export type GenerateEssayPlanOutput = z.infer<typeof GenerateEssayPlanOutputSchema>;


export async function generateEssayPlan(input: GenerateEssayPlanInput, options?: { model?: string }): Promise<GenerateEssayPlanOutput> {
  return essayPlanGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'essayPlanGenerationPrompt',
  input: {schema: GenerateEssayPlanInputSchema},
  output: {schema: GenerateEssayPlanOutputSchema},
  prompt: `You are an expert academic writing assistant. Your task is to create a well-structured and detailed essay plan for the given topic or question.

The plan must be logical, comprehensive, and easy for a student to follow.

**Instructions:**
1.  **Title:** Suggest a suitable title for the essay.
2.  **Thesis Statement:** Formulate a strong, arguable thesis statement that will be the backbone of the essay.
3.  **Introduction:** Outline the key components of the introduction: a hook to grab the reader's attention, the necessary context, and the thesis statement.
4.  **Body Paragraphs:** Generate 3 to 4 distinct body paragraphs. For each paragraph, provide:
    *   **Point:** The main idea or argument of the paragraph.
    *   **Evidence:** Specific examples, facts, quotes, or data points that will be used to support the main point.
    *   **Explanation:** A brief on how the evidence connects back to and supports the point and the overall thesis.
5.  **Conclusion:** Outline the conclusion, which should summarize the main arguments and restate the thesis in a new way, leaving the reader with a final thought.

**Essay Topic/Question:** {{{essayTopicOrQuestion}}}

Generate the structured essay plan now.`,
});

const essayPlanGenerationFlow = ai.defineFlow(
  {
    name: 'essayPlanGenerationFlow',
    inputSchema: GenerateEssayPlanInputSchema,
    outputSchema: GenerateEssayPlanOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
