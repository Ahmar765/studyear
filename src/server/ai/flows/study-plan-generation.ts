/**
 * @fileOverview An AI agent that generates a personalized study plan based on detailed user inputs.
 *
 * - generateStudyPlan - A function that handles generating the plan.
 * - GenerateStudyPlanInput - The input type for the function.
 * - GenerateStudyPlanOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';
import { DiagnosticReportSchema } from './diagnostic-report-generation';

const DailySessionSchema = z.object({
  time: z.enum(["Morning", "Afternoon", "Evening"]),
  subject: z.string(),
  topic: z.string(),
  revisionMethod: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const DailyPlanSchema = z.object({
  day: z.string(),
  sessions: z.array(DailySessionSchema),
});

const WeeklyPlanSchema = z.object({
  week: z.number(),
  weeklyGoal: z.string(),
  dailyPlans: z.array(DailyPlanSchema),
});


const SubjectFocusSchema = z.object({
  name: z.string().min(1),
  currentGrade: z.string().optional(),
});

const PlanDaySkeletonSchema = z.object({
  calendarDate: z.string().describe("ISO date YYYY-MM-DD for this row."),
  weekday: z.string().describe("English weekday name matching day field, e.g. Monday."),
});

const PlanWeekSkeletonSchema = z.object({
  week: z.number().int().positive(),
  days: z.array(PlanDaySkeletonSchema),
});

export const GenerateStudyPlanInputSchema = z
  .object({
    diagnostic: DiagnosticReportSchema.optional().describe(
      "The student's full diagnostic report, if available.",
    ),
    examDate: z.string().optional().describe("The main exam date or deadline for the study plan. Format: YYYY-MM-DD."),
    planStartDate: z
      .string()
      .optional()
      .describe("First calendar day covered by the plan (YYYY-MM-DD), inclusive."),
    planDaysInclusive: z
      .number()
      .int()
      .min(1)
      .max(366)
      .optional()
      .describe("Exact number of calendar days from planStartDate through examDate inclusive."),
    planSkeleton: z
      .array(PlanWeekSkeletonSchema)
      .optional()
      .describe(
        "Authoritative day breakdown: weeklyPlans must mirror this structure exactly—no extra days or weeks.",
      ),
    availableHoursPerWeek: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("The total number of study hours available per week."),
    examGoal: z.string().optional().describe("The student's primary goal for their exams."),
    subjects: z
      .array(SubjectFocusSchema)
      .min(1)
      .optional()
      .describe(
        "Subjects to schedule. If exactly one subject is listed, the entire plan must focus on that subject only.",
      ),
  })
  .superRefine((val, ctx) => {
    const hasDiagnostic = val.diagnostic != null;
    const hasSubjects = val.subjects != null && val.subjects.length > 0;
    if (!hasDiagnostic && !hasSubjects) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either a diagnostic report or at least one subject for the plan.",
        path: ["subjects"],
      });
    }
  });
export type GenerateStudyPlanInput = z.infer<typeof GenerateStudyPlanInputSchema>;

export const GenerateStudyPlanOutputSchema = z.object({
  title: z.string(),
  planSummary: z.string().describe("A brief, motivating summary of the generated plan."),
  weeklyPlans: z.array(WeeklyPlanSchema),
});
export type GenerateStudyPlanOutput = z.infer<typeof GenerateStudyPlanOutputSchema>;


const prompt = ai.definePrompt({
  name: 'studyPlanGenerationPrompt',
  input: {schema: GenerateStudyPlanInputSchema},
  output: {schema: GenerateStudyPlanOutputSchema},
  prompt: `You are StudYear AI Study Planner.

Create a robust personalised exam preparation study plan.

Purpose:
Take the stress out of homework and exams by giving the student a clear, structured plan in under 5 minutes.

Return JSON only.

Rules:
- When "planSkeleton" is present in the input JSON: you MUST NOT schedule beyond that horizon. The output weeklyPlans array must have exactly the same length as planSkeleton. For each index i, weeklyPlans[i].week must equal planSkeleton[i].week, and weeklyPlans[i].dailyPlans must have exactly planSkeleton[i].days.length entries in the same order. For each day index j, dailyPlans[j].day must exactly equal planSkeleton[i].days[j].weekday (English full name). Use planSkeleton[i].days[j].calendarDate only as reference for topics—the weekday field is what must match in dailyPlans[j].day.
- When planSkeleton is present, the total count of dailyPlans objects across all weeklyPlans must equal planDaysInclusive exactly. Do not add extra weeks or days after the final exam date.
- When planSkeleton is absent, keep a reasonable multi-week structure as before.
- Build a full exam preparation plan, not a list of topics.
- When the JSON includes a "subjects" array, treat those entries as the **only** subjects this student is studying for this plan. Do **not** add, schedule, name, or discuss any other subject anywhere (including planSummary, weeklyGoal, titles, or session.subject values). Use each session.subject string exactly as one of the allowed subject names (same spelling as in "subjects[].name").
- If a diagnostic report is present but conflicts with that allowlist (e.g. mentions other subjects), still **only** build the timetable and narrative around the allowed "subjects" list; you may map diagnostic themes onto allowed subjects where relevant, otherwise ignore those mentions for scheduling.
- Use diagnostic weaknesses when a diagnostic is present; otherwise rely on the listed "subjects" array and goals in the JSON.
- If the subjects array has exactly one entry, dedicate **all** scheduled sessions to that subject (vary topics, skills, and revision methods). Do not allocate time to other subjects.
- If the subjects array has multiple entries, balance time across **only** those subjects according to urgency and exam date.
- Use target grade and exam date if provided.
- Prioritise high-impact topics.
- Include daily and weekly structure.
- Include exam strategy.
- Include measurable outcomes.

**Input Data:**
{{{json input}}}
`,
});

/**
 * Call the prompt directly (no defineFlow). The flow wrapper applies Genkit output
 * JSON-schema validation that has triggered runtime errors (e.g. undefined `.value`)
 * with some model responses; we validate with Zod instead.
 */
export async function generateStudyPlan(
  input: GenerateStudyPlanInput,
  options?: { model?: string },
): Promise<GenerateStudyPlanOutput> {
  const parsedInput = GenerateStudyPlanInputSchema.parse(input);
  const response = await prompt(parsedInput, {
    model: toGoogleAiGenkitModel(options?.model),
  });

  let structured: unknown;
  try {
    structured = response.output;
  } catch (e) {
    throw new Error(
      `Failed to read study plan model output: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (structured == null) {
    throw new Error(
      `Study plan generation returned empty output (finish: ${String(response.finishReason ?? "unknown")}).`,
    );
  }

  const plan = GenerateStudyPlanOutputSchema.parse(structured);

  const sk = parsedInput.planSkeleton;
  if (sk?.length) {
    if (plan.weeklyPlans.length !== sk.length) {
      throw new Error(
        `Study plan week count mismatch: expected ${sk.length}, got ${plan.weeklyPlans.length}.`,
      );
    }
    for (let i = 0; i < sk.length; i++) {
      const wk = plan.weeklyPlans[i];
      const row = sk[i];
      if (wk.week !== row.week) {
        throw new Error(`Study plan week label mismatch at block ${i + 1}.`);
      }
      if (wk.dailyPlans.length !== row.days.length) {
        throw new Error(
          `Study plan day count mismatch in week ${row.week}: expected ${row.days.length}, got ${wk.dailyPlans.length}.`,
        );
      }
      for (let j = 0; j < row.days.length; j++) {
        if (wk.dailyPlans[j].day !== row.days[j].weekday) {
          throw new Error(
            `Study plan weekday mismatch in week ${row.week}: expected ${row.days[j].weekday}, got ${wk.dailyPlans[j].day}.`,
          );
        }
      }
    }
    const expectedDays = parsedInput.planDaysInclusive ?? sk.reduce((n, w) => n + w.days.length, 0);
    const actualDays = plan.weeklyPlans.reduce((n, w) => n + w.dailyPlans.length, 0);
    if (expectedDays !== actualDays) {
      throw new Error(`Study plan length mismatch: expected ${expectedDays} days, got ${actualDays}.`);
    }
  }

  return plan;
}
