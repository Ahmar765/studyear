/**
 * @fileOverview An AI agent that predicts a student's exam grade based on performance data.
 *
 * - generateExamPrediction - A function that handles generating the exam prediction.
 * - GenerateExamPredictionInput - The input type for the function.
 * - GenerateExamPredictionOutput - The return type for the function.
 */

import { ai } from '..';
import {z} from 'zod';

const SubjectPerformanceSchema = z.object({
    subject: z.string(),
    currentProgress: z.number().describe("Percentage progress, 0-100"),
    recentActivity: z.string().describe("Qualitative summary of recent student activity in this subject."),
});

export const GenerateExamPredictionInputSchema = z.object({
  studentName: z.string(),
  subjects: z.array(SubjectPerformanceSchema),
  targetGrade: z.string(),
});
export type GenerateExamPredictionInput = z.infer<typeof GenerateExamPredictionInputSchema>;

export const GenerateExamPredictionOutputSchema = z.object({
  predictedGrade: z.string().describe("The single predicted overall grade (e.g., 'A', 'B', '6', '7')."),
  academicReadinessScore: z.number().describe("A score from 0-100 representing the student's overall readiness."),
  topicMasteryScore: z.number().describe("A score from 0-100 representing mastery of topics."),
  studyDisciplineScore: z.number().describe("A score from 0-100 representing study consistency and discipline."),
  riskScore: z.number().describe("A score from 0-100 indicating the risk of not achieving the target grade."),
  improvementProbability: z.number().describe("A percentage chance of improving to the next grade boundary with effort."),
  explanation: z.string().describe("A detailed breakdown of the reasoning behind the prediction, analyzing the student's strengths and weaknesses based on the provided data."),
});
export type GenerateExamPredictionOutput = z.infer<typeof GenerateExamPredictionOutputSchema>;

export async function generateExamPrediction(input: GenerateExamPredictionInput): Promise<GenerateExamPredictionOutput> {
  return examPredictionGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'examPredictionGenerationPrompt',
  input: {schema: GenerateExamPredictionInputSchema},
  output: {schema: GenerateExamPredictionOutputSchema},
  prompt: `You are StudYear Grade Prediction AI. Analyze the provided student data and return a detailed prediction in JSON format.

  **Student Data:**
  - Name: {{{studentName}}}
  - Target Grade: {{{targetGrade}}}
  - Performance:
  {{#each subjects}}
    - Subject: {{subject}}
    - Progress: {{currentProgress}}%
    - Activity: {{recentActivity}}
  {{/each}}

  **Your Task:**
  Provide a JSON object with the following fields:
  - \`predictedGrade\`: A single, realistic grade prediction.
  - \`academicReadinessScore\`: An overall readiness score (0-100).
  - \`topicMasteryScore\`: A score based on their progress in subjects (0-100).
  - \`studyDisciplineScore\`: A score based on the qualitative activity summary (0-100).
  - \`riskScore\`: The percentage risk of underperforming (0-100).
  - \`improvementProbability\`: The percentage chance of improving to the next grade.
  - \`explanation\`: A detailed, narrative explanation for all the scores and the final predicted grade.
`,
});

const examPredictionGenerationFlow = ai.defineFlow(
  {
    name: 'examPredictionGenerationFlow',
    inputSchema: GenerateExamPredictionInputSchema,
    outputSchema: GenerateExamPredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
