/**
 * @fileOverview An AI agent that generates flashcards for a given topic.
 *
 * - generateFlashcards - A function that handles generating flashcards.
 * - GenerateFlashcardsInput - The input type for the function.
 * - GenerateFlashcardsOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate flashcards.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
    question: z.string().describe("The question or term on the front of the flashcard."),
    answer: z.string().describe("The answer or definition on the back of the flashcard."),
});

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z
    .array(FlashcardSchema)
    .describe('A list of generated flashcards with questions and answers.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;


export async function generateFlashcards(input: GenerateFlashcardsInput, options?: { model?: string }): Promise<GenerateFlashcardsOutput> {
  return flashcardGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'flashcardGenerationPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an expert in creating effective study materials. Your task is to generate a set of 5-10 flashcards for the given topic.

Each flashcard should have a clear, concise question on one side and an accurate, easy-to-understand answer on the other. The questions should cover the most important concepts, terms, and facts related to the topic.

Topic: {{{topic}}}`,
});

const flashcardGenerationFlow = ai.defineFlow(
  {
    name: 'flashcardGenerationFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
