import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';
import { DiagnosticReportSchema } from './diagnostic-report-generation';

const SubjectGradeDetailSchema = z.object({
  subjectName: z.string(),
  targetGrade: z.string().optional(),
  currentGrade: z.string().optional(),
  diagnosticConfidencePercent: z.number().optional(),
});

const StudentAcademicContextSchema = z.object({
  studyLevel: z.string().optional().describe('Stage label from profile, e.g. GCSE, Year 5, Key Stage 3.'),
  yearGroup: z.string().optional(),
  overallCurrentGrade: z.string().optional(),
  overallTargetGrade: z.string().optional(),
  examBoard: z.string().optional(),
  subjectGradeDetails: z.array(SubjectGradeDetailSchema).optional(),
});

const WeeklyTaskSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  action: z.string(),
  estimatedMinutes: z.number(),
  expectedOutcome: z.string(),
});

const WeeklyRecoveryPlanSchema = z.object({
  week: z.number(),
  focus: z.string(),
  tasks: z.array(WeeklyTaskSchema),
});

export const RecoveryPlanOutputSchema = z.object({
  title: z.string(),
  recoveryObjective: z.string(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  urgentFocusAreas: z.array(z.string()),
  weeklyRecoveryPlan: z.array(WeeklyRecoveryPlanSchema),
  dailyNonNegotiables: z.array(z.string()),
  parentSupportActions: z.array(z.string()),
  successMetrics: z.array(z.string()),
});
export type RecoveryPlanOutput = z.infer<typeof RecoveryPlanOutputSchema>;

export const RecoveryPlanInputSchema = DiagnosticReportSchema.extend({
  studentAcademicContext: StudentAcademicContextSchema.optional().describe(
    'Student profile snapshot: stage, grades, and per-subject targets—plans must align to these.',
  ),
});
export type RecoveryPlanInput = z.infer<typeof RecoveryPlanInputSchema>;

export async function generateRecoveryPlan(input: RecoveryPlanInput, options?: { model?: string }): Promise<RecoveryPlanOutput> {
  return recoveryPlanGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'recoveryPlanGenerationPrompt',
  input: {schema: RecoveryPlanInputSchema},
  output: {schema: RecoveryPlanOutputSchema},
  prompt: `
You are StudYear Personal Recovery Plan AI.

Create a robust academic recovery plan from the diagnostic result.

This is NOT a normal study plan.
This is a corrective plan to fix weak areas, close gaps and recover academic performance.

Return JSON only.

Rules:
- Prioritise the weakest areas first.
- Make actions measurable.
- Include clear weekly structure.
- Include parent support actions.
- Include success metrics.
- Use studentAcademicContext strictly when present:
  - Calibrate reading age, vocabulary, examples, and task length to studyLevel and/or yearGroup (e.g. primary Year 5 vs GCSE vs sixth form).
  - Each weekly task "subject" must exactly match one of the subjectName entries in studentAcademicContext.subjectGradeDetails when that list is non-empty; never invent unrelated subjects.
  - Where subjectGradeDetails includes targetGrade and/or currentGrade for a subject, theme tasks toward progressing from current toward target for that subject.
  - Use overallCurrentGrade and overallTargetGrade where helpful for framing urgency when subject-specific grades are missing.
  - If examBoard is set, mention specification-style wording only where appropriate for that stage—not generic university-level demands for younger learners.

Full input (diagnostic + student context):
{{{json input}}}
`,
});

const recoveryPlanGenerationFlow = ai.defineFlow(
  {
    name: 'recoveryPlanGenerationFlow',
    inputSchema: RecoveryPlanInputSchema,
    outputSchema: RecoveryPlanOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
