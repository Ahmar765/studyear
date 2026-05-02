/**
 * @fileOverview An AI agent that provides recommendations for similar or related content.
 *
 * - getSimilarContent - A function that handles generating similar content recommendations.
 * - SimilarContentInput - The input type for the function.
 * - SimilarContentOutput - The return type for the function.
 */

import { ai } from '..';
import {z} from 'zod';

const SimilarContentInputSchema = z.object({
  subject: z.string().describe('The subject of the original content.'),
  topic: z.string().describe('The topic of the original content.'),
});
export type SimilarContentInput = z.infer<typeof SimilarContentInputSchema>;

const RecommendationSchema = z.object({
    title: z.string().describe("The title of the recommended content or topic."),
    reasoning: z.string().describe("A brief explanation of why this content is relevant.")
});

const SimilarContentOutputSchema = z.object({
  recommendations: z
    .array(RecommendationSchema)
    .describe('A list of recommendations for similar or related content.'),
});
export type SimilarContentOutput = z.infer<typeof SimilarContentOutputSchema>;

export async function getSimilarContent(input: SimilarContentInput): Promise<SimilarContentOutput> {
  return similarContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'similarContentPrompt',
  input: {schema: SimilarContentInputSchema},
  output: {schema: SimilarContentOutputSchema},
  prompt: `You are a helpful academic assistant. Based on the provided subject and topic, suggest 3-4 related topics or alternative angles for study.

For each suggestion, provide a title and a brief reasoning for why it would be helpful to study alongside the original topic. For example, if the topic is 'The Cold War', you could suggest 'The Space Race' or 'The Vietnam War'.

Subject: {{{subject}}}
Topic: {{{topic}}}`,
});

const similarContentFlow = ai.defineFlow(
  {
    name: 'similarContentFlow',
    inputSchema: SimilarContentInputSchema,
    outputSchema: SimilarContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
