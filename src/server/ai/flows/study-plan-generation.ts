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
  calendarDate: z
    .string()
    .optional()
    .describe("Calendar date YYYY-MM-DD for this row when aligned to planSkeleton."),
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
      .describe(
        "Exact count of study calendar days from planStartDate through last revision day (exam day excluded unless same-day).",
      ),
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

type DailyPlanRow = GenerateStudyPlanOutput["weeklyPlans"][number]["dailyPlans"][number];

function defaultSession(subject: string): DailyPlanRow["sessions"][number] {
  return {
    time: "Evening",
    subject,
    topic: "Structured revision and practice",
    revisionMethod: "Review notes, recall, and exam-style questions",
    priority: "MEDIUM",
  };
}

function dailyPlansWithSessions(
  rows: DailyPlanRow[],
  subjectFallback: string,
): DailyPlanRow[] {
  return rows.map((dp) =>
    dp.sessions.length > 0
      ? dp
      : { ...dp, sessions: [defaultSession(subjectFallback)] },
  );
}

/**
 * Model outputs often use the wrong number of weeks/days. Flatten AI days in order,
 * truncate or pad to match the skeleton day count, then rebuild weeklyPlans so the
 * calendar always matches planSkeleton.
 */
function reshapePlanToSkeleton(
  plan: GenerateStudyPlanOutput,
  sk: NonNullable<GenerateStudyPlanInput["planSkeleton"]>,
  expectedTotal: number,
  subjectFallback: string,
): GenerateStudyPlanOutput {
  let flat = dailyPlansWithSessions(
    plan.weeklyPlans.flatMap((w) => w.dailyPlans),
    subjectFallback,
  );

  if (flat.length > expectedTotal) {
    flat = flat.slice(0, expectedTotal);
  }
  while (flat.length < expectedTotal) {
    flat.push({
      day: "Monday",
      sessions: [defaultSession(subjectFallback)],
    });
  }

  const aiWeeks = plan.weeklyPlans;
  const newWeekly: GenerateStudyPlanOutput["weeklyPlans"] = [];
  let cursor = 0;
  for (let i = 0; i < sk.length; i++) {
    const row = sk[i];
    const chunk = flat.slice(cursor, cursor + row.days.length);
    cursor += row.days.length;
    const weeklyGoal =
      aiWeeks[i]?.weeklyGoal ??
      aiWeeks[aiWeeks.length - 1]?.weeklyGoal ??
      "Keep momentum toward your exam goals.";
    newWeekly.push({
      week: row.week,
      weeklyGoal,
      dailyPlans: chunk.map((dp, j) => ({
        ...dp,
        day: row.days[j].weekday,
        calendarDate: row.days[j].calendarDate,
      })),
    });
  }

  return { ...plan, weeklyPlans: newWeekly };
}

/**
 * When counts already match the skeleton, only patch authoritative labels.
 * Otherwise reshape deterministically (truncate/pad flattened AI days).
 */
function alignPlanToSkeleton(
  plan: GenerateStudyPlanOutput,
  skeleton: GenerateStudyPlanInput["planSkeleton"],
  planDaysInclusive: number | undefined,
  subjectFallback: string,
): GenerateStudyPlanOutput {
  const sk = skeleton;
  if (!sk?.length) return plan;

  const expectedTotal =
    planDaysInclusive ?? sk.reduce((n, w) => n + w.days.length, 0);

  const strictOk =
    plan.weeklyPlans.length === sk.length &&
    plan.weeklyPlans.every((wk, i) => wk.dailyPlans.length === sk[i].days.length);

  if (strictOk) {
    const alignedWeekly = plan.weeklyPlans.map((wk, i) => ({
      ...wk,
      week: sk[i].week,
      dailyPlans: wk.dailyPlans.map((dp, j) => ({
        ...dp,
        day: sk[i].days[j].weekday,
        calendarDate: sk[i].days[j].calendarDate,
      })),
    }));
    return { ...plan, weeklyPlans: alignedWeekly };
  }

  return reshapePlanToSkeleton(plan, sk, expectedTotal, subjectFallback);
}

/**
 * Forces every session.subject onto the planner allowlist so wrong labels from the model
 * (e.g. Maths when only Construction was requested) never reach the UI or Firestore.
 */
function coercePlanToSubjectAllowlist(
  plan: GenerateStudyPlanOutput,
  subjects: GenerateStudyPlanInput["subjects"],
): GenerateStudyPlanOutput {
  if (!subjects?.length) return plan;

  const canonNames = subjects
    .map((s) => String(s.name ?? "").trim())
    .filter(Boolean);
  if (!canonNames.length) return plan;

  const lowerToCanon = new Map(
    canonNames.map((n) => [n.toLowerCase(), n] as const),
  );

  const resolveSubject = (raw: string): string => {
    const t = raw.trim();
    if (!t || t === "Free") return t;
    const hit = lowerToCanon.get(t.toLowerCase());
    if (hit) return hit;
    if (canonNames.length === 1) return canonNames[0];
    const tl = t.toLowerCase();
    for (const n of canonNames) {
      const nl = n.toLowerCase();
      if (tl.includes(nl) || nl.includes(tl)) return n;
    }
    return canonNames[0];
  };

  return {
    ...plan,
    weeklyPlans: plan.weeklyPlans.map((w) => ({
      ...w,
      dailyPlans: w.dailyPlans.map((dp) => ({
        ...dp,
        sessions: dp.sessions.map((sess) =>
          !sess.subject || sess.subject === "Free"
            ? sess
            : { ...sess, subject: resolveSubject(sess.subject) },
        ),
      })),
    })),
  };
}


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
- When "planSkeleton" is present in the input JSON: you MUST NOT schedule beyond that horizon. The output weeklyPlans array must have exactly the same length as planSkeleton (often a single block covering many calendar dates). For each index i, weeklyPlans[i].week must equal planSkeleton[i].week, and weeklyPlans[i].dailyPlans must have exactly planSkeleton[i].days.length entries in the same order. For each day index j, dailyPlans[j].day must exactly equal planSkeleton[i].days[j].weekday (English full name). Use planSkeleton[i].days[j].calendarDate to tune topics for that specific date.
- When planSkeleton is present, the total count of dailyPlans objects across all weeklyPlans must equal planDaysInclusive exactly.
- When "subjects" has exactly one entry, schedule ONLY that subject—no Mathematics, English, Science, or other subjects unless that exact name appears in subjects[].name (e.g. "Construction" means Construction-only).
- When planSkeleton is absent, keep a reasonable multi-week structure as before.
- Build a full exam preparation plan, not a list of topics.
- When the JSON includes a "subjects" array, treat those entries as the **only** subjects this student is studying for this plan. Do **not** add, schedule, name, or discuss any other subject anywhere (including planSummary, weeklyGoal, titles, or session.subject values). Use each session.subject string exactly as one of the allowed subject names (same spelling as in "subjects[].name").
- If a diagnostic report is present but conflicts with that allowlist (e.g. mentions other subjects), still **only** build the timetable and narrative around the allowed "subjects" list; you may map diagnostic themes onto allowed subjects where relevant, otherwise ignore those mentions for scheduling.
- Use diagnostic weaknesses when a diagnostic is present in the input; when there is no diagnostic field, rely entirely on the listed "subjects" array and goals in the JSON.
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
  const planBase = GenerateStudyPlanInputSchema.parse(input);
  const subjectFallback = planBase.subjects?.[0]?.name ?? "Study";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await prompt(planBase, {
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

    let plan: GenerateStudyPlanOutput;
    try {
      plan = GenerateStudyPlanOutputSchema.parse(structured);
    } catch (zerr) {
      if (attempt >= maxAttempts - 1) throw zerr;
      continue;
    }

    const aligned = alignPlanToSkeleton(
      plan,
      planBase.planSkeleton,
      planBase.planDaysInclusive,
      subjectFallback,
    );
    return coercePlanToSubjectAllowlist(aligned, planBase.subjects);
  }

  throw new Error("Study plan generation exhausted retries.");
}
