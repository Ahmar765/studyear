import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import { ReviewVisualSpecSchema } from '@/server/services/assignment-review-visuals';
import { z } from 'zod';

export const AssignmentSubmissionInputSchema = z.object({
  title: z.string().describe('The title of the assignment.'),
  type: z.string().describe('The type of assignment (e.g., ESSAY, REPORT).'),
  subject: z.string().describe('The academic subject.'),
  studyLevel: z.string().describe('The student\'s academic level.'),
  pastedText: z.string().describe('The full text of the student\'s submission.'),
});
export type AssignmentSubmissionInput = z.infer<typeof AssignmentSubmissionInputSchema>;

export const AssignmentReviewOutputSchema = z.object({
  summary: z.string().describe("A high-level, encouraging summary of the work's strengths and main areas for improvement."),
  overallFeedback: z.object({
    structureAndArgument: z.string(),
    useOfEvidence: z.string(),
    clarityAndWritingStyle: z.string(),
    knowledgeAndUnderstanding: z.string(),
  }).describe("Detailed feedback on key academic criteria."),
  inlineComments: z.array(z.object({
    originalText: z.string().describe("A specific snippet from the student's text."),
    comment: z.string().describe("The constructive comment on that specific snippet."),
  })).describe("3-5 specific inline comments on parts of the text."),
  strengths: z.array(z.string()).describe("A list of 2-3 key strengths of the submission."),
  weaknesses: z.array(z.string()).describe("A list of 2-3 key weaknesses to be addressed."),
  improvementRecommendations: z.array(z.string()).describe("A list of specific, actionable recommendations for improvement."),
  predictedCurrentGrade: z.string().describe("The predicted grade for the work as it currently is (e.g., 'B+', '65%', '2:1')."),
  predictedCurrentScore: z.number().describe("A numerical score from 1-100 for the current work."),
  predictedGradeAfterImprovement: z.string().describe("The potential grade the student could achieve if they implement the feedback."),
  predictedScoreAfterImprovement: z.number().describe("The potential numerical score (1-100) after improvements."),
  nextActions: z.array(z.string()).describe("A list of 2-3 concrete next steps the student should take."),
  recommendedVisuals: z
    .array(ReviewVisualSpecSchema)
    .max(4)
    .default([])
    .describe(
      '0-4 visuals that would help the student improve: bar/line/pie charts with chartDescription, coordinate/function graphs with data, geometry diagrams, or educational images with prompt. Use for Maths, Science, Geography, Economics, or when the work mentions graphs/charts.',
    ),
});
export type AssignmentReviewOutput = z.infer<typeof AssignmentReviewOutputSchema>;


const prompt = ai.definePrompt({
  name: 'assignmentReviewGenerationPrompt',
  input: {schema: AssignmentSubmissionInputSchema},
  output: {schema: AssignmentReviewOutputSchema},
  prompt: `You are an expert academic examiner for the specified study level and subject. Your task is to provide a comprehensive, constructive, and encouraging review of a student's written assignment.

**Submission Details:**
- Title: {{{title}}}
- Type: {{{type}}}
- Subject: {{{subject}}}
- Study Level: {{{studyLevel}}}

**Student's Work:**
---
{{{pastedText}}}
---

**Your Task (Return a single JSON object):**
Analyze the submission and generate a detailed review. Be specific, insightful, and focus on helping the student improve.

1.  **summary**: Write a high-level, encouraging summary of the work.
2.  **overallFeedback**: Provide detailed feedback on 'structureAndArgument', 'useOfEvidence', 'clarityAndWritingStyle', and 'knowledgeAndUnderstanding'.
3.  **inlineComments**: Generate 3-5 specific inline comments. Each should include the 'originalText' snippet and your 'comment'.
4.  **strengths**: List 2-3 key strengths of the submission.
5.  **weaknesses**: List 2-3 key weaknesses.
6.  **improvementRecommendations**: Provide a list of specific, actionable recommendations for improvement.
7.  **predictedCurrentGrade** & **predictedCurrentScore**: Estimate the grade and a score (1-100) for the work AS-IS.
8.  **predictedGradeAfterImprovement** & **predictedScoreAfterImprovement**: Predict the grade and score the student could achieve if they successfully implement your feedback.
9.  **nextActions**: Suggest 2-3 concrete next steps for the student.
10. **recommendedVisuals**: When helpful (especially STEM subjects or weak graph skills), include 1-4 items:
    - Charts: set visualType (BAR_GRAPH, LINE_GRAPH, PIE_CHART, etc.), title, rationale, chartDescription (data story), optional xAxisLabel/yAxisLabel.
    - Coordinate/function graphs: include structured \`data\` (e.g. points array or expression string).
    - Geometry: visualType GEOMETRY_DIAGRAM with data.shape "triangle" or "circle".
    - Concepts needing illustration: EDUCATIONAL_IMAGE with a detailed \`prompt\`.
    Return an empty array if no visual would add value.`,
});

/**
 * No `defineFlow` wrapper — Genkit's JSON-schema pass on flow I/O was failing with
 * `INVALID_ARGUMENT: Schema validation failed` (internal property name mismatches / strict mode).
 * Validate input and output with Zod only.
 */
export async function generateAssignmentReview(
  input: AssignmentSubmissionInput,
  options?: { model?: string },
): Promise<AssignmentReviewOutput> {
  const parsed = AssignmentSubmissionInputSchema.parse(input);
  const response = await prompt(parsed, {
    model: toGoogleAiGenkitModel(options?.model),
  });

  let structured: unknown;
  try {
    structured = response.output;
  } catch (e) {
    throw new Error(
      `Failed to read assignment review model output: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (structured == null) {
    throw new Error('Assignment review generation returned empty output.');
  }

  return AssignmentReviewOutputSchema.parse(structured);
}
