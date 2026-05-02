/**
 * @fileOverview An AI agent that generates a periodic progress report for a student.
 *
 * - generateProgressReport - Generates a progress report, predicted grade, and study plan.
 * - GenerateProgressReportInput - Input type for the function.
 * - GenerateProgressReportOutput - Return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const SubjectProgressSchema = z.object({
  subjectId: z.string().describe("The ID or name of the subject."),
  progress: z.number().describe("The student's current progress percentage (0-100) in the subject."),
  targetGrade: z.string().describe("The student's target grade for this subject."),
});

export const GenerateProgressReportInputSchema = z.object({
  studentName: z.string().describe("The name of the student."),
  subjects: z.array(SubjectProgressSchema).describe("A list of the student's subjects, their progress, and their target grades."),
  overallTargetGrade: z.string().describe("The student's desired overall target grade for the end of the year."),
  activity: z.string().describe("A summary of the student's recent activity (e.g., quizzes taken, modules completed, time spent)."),
});
export type GenerateProgressReportInput = z.infer<typeof GenerateProgressReportInputSchema>;

const SubjectImprovementPlanSchema = z.object({
    subject: z.string(),
    currentBaselineGrade: z.string(),
    realisticPredictedGrade: z.string(),
    stretchTargetGrade: z.string(),
    gradeBarrierDiagnosis: z.string().describe("The main reason the student is stuck at their current grade."),
    top5PriorityTopics: z.array(z.string()).describe("A list of the top 5 topics to focus on for maximum impact."),
    recommendedActions: z.string().describe("A markdown list of weekly actions, recommended AI lessons, and practice papers.")
});

export const GenerateProgressReportOutputSchema = z.object({
  studentName: z.string(),
  overallPredictedGrade: z.string().describe("The single, overall predicted grade across all subjects."),
  overallTargetGrade: z.string(),
  executiveSummary: z.string().describe("A high-level summary of the student's current position and the path forward."),
  improvementPlans: z.array(SubjectImprovementPlanSchema).describe("A detailed improvement plan for each key subject identified for focus.")
});
export type GenerateProgressReportOutput = z.infer<typeof GenerateProgressReportOutputSchema>;

export async function generateProgressReport(input: GenerateProgressReportInput, options?: { model?: string }): Promise<GenerateProgressReportOutput> {
  return progressReportGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'progressReportGenerationPrompt',
  input: {schema: GenerateProgressReportInputSchema},
  output: {schema: GenerateProgressReportOutputSchema},
  prompt: `You are an elite academic strategist and AI performance coach. Your primary function is to create a detailed, data-driven "Grade Improvement Plan" for a student. This is the most important feature of the platform.

    **Student Data:**
    - **Name:** {{{studentName}}}
    - **Overall Target Grade:** {{{overallTargetGrade}}}
    - **Subjects & Progress:**
    {{#each subjects}}
      - {{subjectId}}: {{progress}}% progress, Target Grade: {{targetGrade}}
    {{/each}}
    - **Recent Activity Summary:** {{{activity}}}

    **Your Tasks (Produce a single JSON object):**

    1.  **\`studentName\`**: Echo the student's name.
    2.  **\`overallPredictedGrade\`**: Based on all data, predict a single, realistic overall grade for the student if they continue on their current trajectory.
    3.  **\`overallTargetGrade\`**: Echo the student's overall target grade from the input.
    4.  **\`executiveSummary\`**: Write a concise, motivating summary. Address the student by name. Acknowledge their target grade, state their predicted grade, and introduce the improvement plan as the bridge between the two.
    5.  **\`improvementPlans\`**: This is the core of your output. Create a detailed plan for the **2-3 weakest subjects** (those with the lowest progress or furthest from their target grade). For each of these subjects, provide:
        *   **\`subject\`**: The name of the subject.
        *   **\`currentBaselineGrade\`**: Infer a current working grade from their progress percentage.
        *   **\`realisticPredictedGrade\`**: The grade they are likely to get in this specific subject.
        *   **\`stretchTargetGrade\`**: The ambitious but achievable grade if they follow the plan.
        *   **\`gradeBarrierDiagnosis\`**: A single, powerful sentence diagnosing the #1 reason they are not hitting their target (e.g., "Lack of exam practice is limiting application of knowledge," or "Gaps in foundational concepts are preventing progress.").
        *   **\`top5PriorityTopics\`**: List the 5 most critical topics within that subject they must master.
        *   **\`recommendedActions\`**: A brief, actionable list in Markdown format outlining what to do. Include specific suggestions like "* Complete 2 AI Lessons on [Topic X]," "* Do one timed past paper this week," "* Use AI Feedback on an essay for [Topic Y]."

    Your tone should be authoritative, insightful, and empowering. The student should feel like they have a clear, expert-guided path to success.
`,
});

const progressReportGenerationFlow = ai.defineFlow(
  {
    name: 'progressReportGenerationFlow',
    inputSchema: GenerateProgressReportInputSchema,
    outputSchema: GenerateProgressReportOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
