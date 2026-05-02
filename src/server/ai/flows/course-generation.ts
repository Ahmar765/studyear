/**
 * @fileOverview An AI agent that generates a course outline for a specific topic within a subject.
 *
 * - generateCourse - A function that handles generating the course.
 * - GenerateCourseInput - The input type for the function.
 * - GenerateCourseOutput - The return type for the function.
 */

import { ai } from '..';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

export const GenerateCourseInputSchema = z.object({
  subject: z.string().describe('The main subject for the course.'),
  topic: z.string().describe('The specific topic within the subject to generate a course for.'),
  level: z.string().describe('The academic level for the course (e.g., GCSE, A-Level).'),
  examBoard: z.string().optional().describe('The exam board, if applicable (e.g., AQA, Edexcel).'),
  userId: z.string().describe('The ID of the user creating the course.'),
});
export type GenerateCourseInput = z.infer<typeof GenerateCourseInputSchema>;

const MiniQuizSchema = z.object({
    question: z.string(),
    answer: z.string(),
});

const LessonSchema = z.object({
    lessonTitle: z.string(),
    lessonContent: z.string(),
    workedExample: z.string(),
    practiceQuestions: z.array(z.string()),
    miniQuiz: z.array(MiniQuizSchema),
});

const ModuleAssessmentSchema = z.object({
    questions: z.array(z.string()),
    markScheme: z.array(z.string()),
});

const CourseModuleSchema = z.object({
    moduleTitle: z.string(),
    moduleObjective: z.string(),
    lessons: z.array(LessonSchema),
    moduleAssessment: ModuleAssessmentSchema,
});

const GenerateCourseOutputSchema = z.object({
  courseTitle: z.string(),
  courseObjective: z.string(),
  level: z.string(),
  estimatedDuration: z.string(),
  modules: z.array(CourseModuleSchema),
  finalAssessment: ModuleAssessmentSchema,
});
export type GenerateCourseOutput = z.infer<typeof GenerateCourseOutputSchema>;


export async function generateCourse(input: GenerateCourseInput, options?: { model?: string }): Promise<GenerateCourseOutput> {
  return courseGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'courseGenerationPrompt',
  input: {schema: GenerateCourseInputSchema},
  output: {schema: GenerateCourseOutputSchema},
  prompt: `You are StudYear AI Course Generator. You must generate a complete, structured course based on the provided details, not just a list of topics.

You must be **board-aware**. If an exam board is provided, tailor the content to that board's specification.

**Context:**
- Subject: {{{subject}}}
- Topic: {{{topic}}}
- Student Level: {{{level}}}
{{#if examBoard}}
- Exam Board: {{{examBoard}}}
{{/if}}

**Output Format:**
You must return a single JSON object matching this exact structure:
{
  "courseTitle": "A comprehensive title for the course on the topic.",
  "courseObjective": "A clear objective for what a student will be able to do after completing the course.",
  "level": "{{{level}}}",
  "estimatedDuration": "An estimated time to complete the course, e.g., '4-6 hours'.",
  "modules": [
    {
      "moduleTitle": "Title for the first module.",
      "moduleObjective": "Objective for this specific module.",
      "lessons": [
        {
          "lessonTitle": "Title for the first lesson in the module.",
          "lessonContent": "Detailed content for the lesson in Markdown format. Explain the concept clearly and provide examples.",
          "workedExample": "A step-by-step worked example related to the lesson content. Use plain text and formatting that can be rendered in a <pre> tag.",
          "practiceQuestions": ["A list of 2-3 practice questions for the student."],
          "miniQuiz": [
            {
              "question": "A quick-check question.",
              "answer": "The correct answer to the question."
            }
          ]
        }
      ],
      "moduleAssessment": {
        "questions": ["A list of assessment questions for the module."],
        "markScheme": ["A corresponding mark scheme for the assessment questions."]
      }
    }
  ],
  "finalAssessment": {
    "questions": ["A list of final assessment questions covering the entire course."],
    "markScheme": ["A corresponding mark scheme for the final assessment."]
  }
}

Generate the course now.`,
});

const courseGenerationFlow = ai.defineFlow(
  {
    name: 'courseGenerationFlow',
    inputSchema: GenerateCourseInputSchema,
    outputSchema: GenerateCourseOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
