/**
 * @fileOverview An AI agent that generates a one-page revision sheet for a topic.
 *
 * - generateRevisionSheet - A function that handles generating the revision sheet.
 * - GenerateRevisionSheetInput - The input type for the function.
 * - GenerateRevisionSheetOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import {z} from 'zod';

export const GenerateRevisionSheetInputSchema = z.object({
  topic: z.string().describe('The topic for the revision sheet.'),
  level: z.string().describe('The academic level (e.g., GCSE, A-Level).'),
});
export type GenerateRevisionSheetInput = z.infer<typeof GenerateRevisionSheetInputSchema>;

export const GenerateRevisionSheetOutputSchema = z.object({
  title: z.string().describe("The title of the revision sheet."),
  content: z.string().describe("The full content of the revision sheet in Markdown format, including key definitions, concepts, diagrams (as text descriptions), and examples."),
});
export type GenerateRevisionSheetOutput = z.infer<typeof GenerateRevisionSheetOutputSchema>;

export async function generateRevisionSheet(input: GenerateRevisionSheetInput): Promise<GenerateRevisionSheetOutput> {
  return revisionSheetGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'revisionSheetGenerationPrompt',
  input: {schema: GenerateRevisionSheetInputSchema},
  output: {schema: GenerateRevisionSheetOutputSchema},
  prompt: `You are an expert teacher creating a one-page revision "cheat sheet" for a student studying at the {{{level}}} level. The sheet must be dense with information but easy to read.

  For the topic "{{{topic}}}", create a revision sheet that includes:
  1.  A clear title.
  2.  Key definitions of essential terms.
  3.  Summaries of core concepts.
  4.  Important dates, figures, or facts.
  5.  Simple examples or case studies.

  Format the entire output as a single Markdown string. Use headings, lists, and bold text to structure the information clearly.`,
});

const revisionSheetGenerationFlow = ai.defineFlow(
  {
    name: 'revisionSheetGenerationFlow',
    inputSchema: GenerateRevisionSheetInputSchema,
    outputSchema: GenerateRevisionSheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
