/**
 * @fileOverview An AI agent that generates a student's baseline academic diagnostic report.
 *
 * This flow is the entry point to the academic recovery system. It takes self-reported
 * confidence scores and generates a high-level analysis of the student's academic health.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const SubjectConfidenceSchema = z.object({
    subjectId: z.string(),
    confidence: z.number().min(0).max(100),
});

export const GenerateDiagnosticReportInputSchema = z.object({
  subjects: z.array(SubjectConfidenceSchema).describe('An array of subjects with the student\'s self-reported confidence level (0-100).'),
});
export type GenerateDiagnosticReportInput = z.infer<typeof GenerateDiagnosticReportInputSchema>;

const PriorityActionSchema = z.object({
    action: z.string(),
    reason: z.string(),
    urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const DiagnosticReportSchema = z.object({
  aiSummary: z.string().describe("A brief, encouraging summary of the diagnostic, framed positively (e.g., 'This gives us a clear starting point...')."),
  strengths: z.array(z.string()).describe("A list of 2-3 likely strengths based on high-confidence subjects."),
  weaknesses: z.array(z.string()).describe("A list of 2-3 likely weaknesses based on low-confidence subjects."),
  weakTopics: z.array(z.string()).describe("A list of 2-3 specific topics the student is likely weak in, inferred from low-confidence subjects."),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("An overall risk assessment for the student's academic progress."),
  predictedCurrentPosition: z.string().describe("Estimate the student's true academic working level (e.g., 'Working towards Grade 5', 'Secure at Grade 7')."),
  recommendations: z.array(z.string()).describe("A list of general recommendations for the student."),
  priorityActions: z.array(PriorityActionSchema).describe("A list of the most urgent and impactful actions the student should take next."),
  parentSummary: z.string().describe("A brief summary written for a parent to understand their child's position."),
  nextBestAction: z.string().describe("A clear, single call-to-action for the student, which should be either 'Build a Personal Recovery Plan' or 'Generate an AI Exam Study Plan'."),
});
export type DiagnosticReport = z.infer<typeof DiagnosticReportSchema>;


export async function generateDiagnosticReport(input: GenerateDiagnosticReportInput, options?: { model?: string }): Promise<DiagnosticReport> {
  return diagnosticReportGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'diagnosticReportGenerationPrompt',
  input: {schema: GenerateDiagnosticReportInputSchema},
  output: {schema: DiagnosticReportSchema},
  prompt: `You are StudYear Academic Diagnostic AI.

Analyze the student's diagnostic answers and create a detailed AI Summary & Recommendation.

Return JSON only.

Rules:
- Be specific.
- Identify academic weaknesses clearly.
- Recommend what must be fixed first.
- Adapt to the studentâ€™s study level.
- Make the summary useful for both student and parent.

Student's Confidence Scores:
{{#each subjects}}
- {{subjectId}}: {{confidence}}% confidence
{{/each}}
`,
});

const diagnosticReportGenerationFlow = ai.defineFlow(
  {
    name: 'diagnosticReportGenerationFlow',
    inputSchema: GenerateDiagnosticReportInputSchema,
    outputSchema: DiagnosticReportSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);

      