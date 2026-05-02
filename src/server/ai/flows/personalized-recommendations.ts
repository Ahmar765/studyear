/**
 * @fileOverview An AI agent that provides personalized study recommendations.
 *
 * - getPersonalizedRecommendations - A function that handles generating recommendations.
 * - PersonalizedRecommendationsInput - The input type for the function.
 * - PersonalizedRecommendationsOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

export const PersonalizedRecommendationsInputSchema = z.object({
  subject: z.string().describe('The subject the student is weak in.'),
  level: z.string().describe('The academic level of the student.'),
});
export type PersonalizedRecommendationsInput = z.infer<typeof PersonalizedRecommendationsInputSchema>;

const RecommendationSchema = z.object({
    recommendation: z.string().describe("A specific, actionable recommendation for the student."),
    reasoning: z.string().describe("A brief explanation of why this recommendation is helpful.")
});

export const PersonalizedRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(RecommendationSchema)
    .describe('A list of personalized recommendations for the student to improve in the subject.'),
});
export type PersonalizedRecommendationsOutput = z.infer<typeof PersonalizedRecommendationsOutputSchema>;

export async function getPersonalizedRecommendations(input: PersonalizedRecommendationsInput, options?: { model?: string }): Promise<PersonalizedRecommendationsOutput> {
  return personalizedRecommendationsFlow(input, options);
}

const personalizedRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedRecommendationsPrompt',
  input: {schema: PersonalizedRecommendationsInputSchema},
  output: {schema: PersonalizedRecommendationsOutputSchema},
  prompt: `You are an expert academic advisor. A student is struggling with {{{subject}}} at the {{{level}}} level.

Analyze their weak subject and provide 3-4 specific, actionable recommendations to help them improve. For each recommendation, provide a brief reasoning.

Focus on practical study strategies, resources they can use (like specific types of online videos, practice papers, or websites), and techniques to better understand the core concepts.`,
});

const personalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedRecommendationsFlow',
    inputSchema: PersonalizedRecommendationsInputSchema,
    outputSchema: PersonalizedRecommendationsOutputSchema,
  },
  async (input, options) => {
    /** Genkit `definePrompt` executables are `(input, renderOptions)` — a third arg is ignored in JS. */
    const { output } = await personalizedRecommendationsPrompt(input, {
      model: toGoogleAiGenkitModel(options?.model),
    });
    return output!;
  }
);
