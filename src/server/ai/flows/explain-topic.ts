/**
 * @fileOverview An AI agent that acts as a performance engine to explain topics.
 *
 * This flow is designed to diagnose a student's potential misunderstanding and provide a structured,
 * step-by-step explanation, rather than just a simple answer.
 */

import { ai } from '..';
import {z} from 'zod';

export const ExplainTopicInputSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  question: z.string(),
  mode: z.enum(["SIMPLE", "STEP_BY_STEP", "EXAM", "ANALOGY"]),
});
export type ExplainTopicInput = z.infer<typeof ExplainTopicInputSchema>;


export const ExplainTopicOutputSchema = z.object({
  diagnosis: z.string().describe("A diagnosis of the student's likely misunderstanding based on their question."),
  answer: z.string().describe("The final, correct answer to the student's question."),
  steps: z.array(z.string()).describe("A step-by-step explanation of how to arrive at the answer."),
  followUpQuestion: z.string().describe("A single, targeted question to check the student's understanding of the explanation."),
  nextRecommendedAction: z.string().describe("A suggested next action for the student (e.g., 'Try another practice problem', 'Review the concept of...')."),
  difficultyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe("The assessed difficulty of the student's question."),
});
export type ExplainTopicOutput = z.infer<typeof ExplainTopicOutputSchema>;


export async function explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput> {
  return explainTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainTopicPrompt',
  input: {schema: ExplainTopicInputSchema},
  output: {schema: ExplainTopicOutputSchema},
  prompt: `You are StudYear AI Tutor. You are a performance engine, not a chatbot.

Your task is to analyze the student's question and provide a structured, pedagogical explanation.

**Student's Question Details:**
- Subject: {{{subject}}}
- Topic: {{{topic}}}
- Question: {{{question}}}
- Requested Mode: {{{mode}}}

**Rules:**
1.  **Diagnose:** Begin by diagnosing the student's likely misunderstanding based on their question.
2.  **Explain Step-by-Step:** Provide a clear, step-by-step explanation to guide the student to the answer.
3.  **Provide the Answer:** Give the final, correct answer after the steps.
4.  **Check Understanding:** Ask one concise follow-up question to test if the student has grasped the core concept.
5.  **Recommend Next Action:** Suggest a logical next step for their learning.
6.  **Adapt to Mode:** Tailor your explanation's tone and complexity to the requested mode (e.g., SIMPLE should use basic terms, ANALOGY should use a comparison, EXAM should be formal).
7.  **Return JSON only:** Your entire output must be a single JSON object matching the specified schema.

Generate your response now.`,
});

const explainTopicFlow = ai.defineFlow(
  {
    name: 'explainTopicFlow',
    inputSchema: ExplainTopicInputSchema,
    outputSchema: ExplainTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
