/**
 * @fileOverview An AI agent that generates multiple-choice quizzes.
 *
 * - generateQuiz - A function that handles generating a quiz.
 * - GenerateQuizInput - The input type for the function.
 * - GenerateQuizOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for the quiz. This should be specific.'),
  level: z.string().describe('The academic level for the quiz (e.g., GCSE, A-Level).'),
  numberOfQuestions: z.number().int().min(3).max(10).describe('The number of questions to generate for the quiz.'),
  subject: z.string().describe('The subject of the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
    question: z.string().describe("The question text."),
    questionType: z.enum(['multiple-choice', 'short-answer']).describe("The type of the question."),
    options: z.array(z.string()).optional().describe("For 'multiple-choice', an array of 4 possible answers. Should be empty for 'short-answer'."),
    answer: z.string().describe("The correct answer. For 'multiple-choice', it's one of the options. For 'short-answer', it's a detailed model answer."),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;


const GenerateQuizOutputSchema = z.object({
  quizTitle: z.string().describe("A suitable title for the generated quiz."),
  subject: z.string().describe("The subject of the quiz."),
  questions: z
    .array(QuizQuestionSchema)
    .describe('A list of questions that make up the quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


export async function generateQuiz(input: GenerateQuizInput, options?: { model?: string }): Promise<GenerateQuizOutput> {
  return quizGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'quizGenerationPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema.omit({ subject: true })},
  prompt: `You are an expert in creating educational content. Your task is to generate a quiz based on the provided parameters.

The quiz should be engaging and accurately test knowledge for the specified academic level. Create a mix of question types: primarily multiple-choice, but include some short-answer questions where appropriate.

For each question:
- If 'multiple-choice', provide exactly 4 options and indicate the correct answer. The 'questionType' must be 'multiple-choice'.
- If 'short-answer', the 'options' array should be empty, and the 'answer' field must contain a detailed model answer that a student can use to self-mark. The 'questionType' must be 'short-answer'.

Subject: {{{subject}}}
Topic: {{{topic}}}
Academic Level: {{{level}}}
Number of Questions: {{{numberOfQuestions}}}

Generate the quiz now.
`,
});

const quizGenerationFlow = ai.defineFlow(
  {
    name: 'quizGenerationFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return {
      ...output!,
      subject: input.subject,
    };
  }
);
