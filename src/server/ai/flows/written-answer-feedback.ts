/**
 * @fileOverview An AI agent that marks a student's written answer and provides detailed feedback.
 *
 * - getWrittenFeedback - A function that handles generating the feedback.
 * - WrittenFeedbackInput - The input type for the function.
 * - WrittenFeedbackOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

export const WrittenFeedbackInputSchema = z.object({
  question: z.string().describe("The exam-style question the student was answering."),
  studentAnswer: z.string().describe("The student's full written answer."),
  subject: z.string().describe("The subject of the question (e.g., History, English Literature)."),
  level: z.string().describe("The academic level (e.g., GCSE, A-Level)."),
});
export type WrittenFeedbackInput = z.infer<typeof WrittenFeedbackInputSchema>;

const DetailedFeedbackSchema = z.object({
    structureAndClarity: z.string().describe("Feedback on the essay's structure, flow, and clarity of argument."),
    knowledgeAndUnderstanding: z.string().describe("Feedback on the student's demonstrated knowledge of the topic."),
    useOfEvidence: z.string().describe("Feedback on the quality and use of evidence, examples, or quotes."),
    examTechnique: z.string().describe("Feedback on exam-specific techniques, like timing, question interpretation, and mark allocation.")
});

export const WrittenFeedbackOutputSchema = z.object({
  estimatedMark: z.string().describe("An estimated mark, band, or grade (e.g., '7/10', 'Band 4', 'Low B'). Be specific to the question if possible."),
  overallSummary: z.string().describe("A brief, encouraging summary of the overall performance."),
  detailedFeedback: DetailedFeedbackSchema.describe("A breakdown of feedback across different assessment criteria."),
  improvementTips: z.string().describe("A prioritized list of 3-5 actionable tips for improvement, in Markdown format."),
  redraftedExample: z.string().describe("A redrafted example paragraph or section that demonstrates how to apply the feedback."),
});
export type WrittenFeedbackOutput = z.infer<typeof WrittenFeedbackOutputSchema>;


export async function getWrittenFeedback(input: WrittenFeedbackInput, options?: { model?: string }): Promise<WrittenFeedbackOutput> {
  return writtenFeedbackFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'writtenFeedbackPrompt',
  input: {schema: WrittenFeedbackInputSchema},
  output: {schema: WrittenFeedbackOutputSchema},
  prompt: `You are an expert examiner for the {{{level}}} {{{subject}}} curriculum, with deep knowledge of the mark schemes. Your task is to provide detailed, constructive, and encouraging feedback on a student's written answer. Your feedback must be specific and actionable, not generic.

**Student's Submission:**
- **Subject:** {{{subject}}}
- **Level:** {{{level}}}
- **Question:** {{{question}}}
- **Student's Answer:**
{{{studentAnswer}}}

**Your Analysis (Provide in JSON format):**

1.  **estimatedMark:** Provide a realistic estimated mark, grade, or band based on the level and likely mark scheme.
2.  **overallSummary:** Write a brief, encouraging summary (2-3 sentences) of the answer's performance, highlighting one key strength and one main area for improvement.
3.  **detailedFeedback:** Provide a detailed breakdown against the following criteria:
    *   **structureAndClarity:** Assess the logical flow, paragraphing, and clarity of the writing.
    *   **knowledgeAndUnderstanding:** Evaluate how well the student demonstrates their knowledge of the topic.
    *   **useOfEvidence:** Judge the relevance, specificity, and integration of evidence/examples.
    *   **examTechnique:** Comment on how well the answer meets the demands of the question (e.g., did it answer all parts? Did it use keywords?).
4.  **improvementTips:** Generate a prioritized list of 3-5 concrete, actionable tips in Markdown format. These should directly address the weaknesses identified.
5.  **redraftedExample:** Rewrite a key paragraph from the student's answer to demonstrate how to apply your feedback effectively. This is crucial for showing, not just telling.
`,
});

const writtenFeedbackFlow = ai.defineFlow(
  {
    name: 'writtenFeedbackFlow',
    inputSchema: WrittenFeedbackInputSchema,
    outputSchema: WrittenFeedbackOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
