/**
 * @fileOverview An AI agent that generates an interactive lesson plan and the first lesson step.
 *
 * - generateInteractiveLesson - A function that handles generating the lesson.
 * - GenerateInteractiveLessonInput - The input type for the function.
 * - GenerateInteractiveLessonOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const GenerateInteractiveLessonInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a lesson.'),
});
export type GenerateInteractiveLessonInput = z.infer<typeof GenerateInteractiveLessonInputSchema>;

const LessonStepSchema = z.object({
    step: z.number().describe("The step number in the lesson plan."),
    title: z.string().describe("The title of this lesson step."),
    concept: z.string().describe("The key concept or idea to be taught in this step."),
});

const GenerateInteractiveLessonOutputSchema = z.object({
  lessonTitle: z.string().describe("The overall title of the lesson."),
  lessonPlan: z.array(LessonStepSchema).describe("A structured plan outlining the steps of the lesson."),
  firstStepContent: z.string().describe("The detailed content for the first step of the lesson, written in a conversational and engaging way to start walking the student through the material. It should end by asking the student if they understand or have any questions to prompt interaction."),
});
export type GenerateInteractiveLessonOutput = z.infer<typeof GenerateInteractiveLessonOutputSchema>;


export async function generateInteractiveLesson(input: GenerateInteractiveLessonInput, options?: { model?: string }): Promise<GenerateInteractiveLessonOutput> {
  return interactiveLessonGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'interactiveLessonGenerationPrompt',
  input: {schema: GenerateInteractiveLessonInputSchema},
  output: {schema: GenerateInteractiveLessonOutputSchema},
  prompt: `You are an expert AI Tutor. Your task is to create a short, interactive lesson for a student on a specific topic.

The lesson should be broken down into 3-4 logical steps.

Your output must include:
1.  A clear, engaging title for the overall lesson.
2.  A 'lessonPlan' which is an array of objects, where each object represents a step in the lesson and includes a step number, title, and the key concept.
3.  The 'firstStepContent'. This is the most important part. You will write the content for the VERY FIRST step of the lesson. Write it in a friendly, conversational tone. Explain the concept clearly. Use an analogy if it helps. At the end of your explanation for the first step, you MUST ask the student a question to encourage them to interact, like "Does that make sense?" or "Are you ready to move on to the next step?".

Generate the full lesson plan, but only the content for the first step.

Topic: {{{topic}}}`,
});

const interactiveLessonGenerationFlow = ai.defineFlow(
  {
    name: 'interactiveLessonGenerationFlow',
    inputSchema: GenerateInteractiveLessonInputSchema,
    outputSchema: GenerateInteractiveLessonOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
