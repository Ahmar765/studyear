import type { GenerateCourseOutput } from '@/server/ai/flows/course-generation';
import { generateEducationalVisuals, type GeneratedReviewVisual } from '@/server/services/assignment-review-visuals';

export type EnrichedCourseLesson = GenerateCourseOutput['modules'][number]['lessons'][number] & {
  generatedVisuals?: GeneratedReviewVisual[];
};

export type EnrichedCourseOutput = Omit<GenerateCourseOutput, 'modules'> & {
  modules: Array<
    Omit<GenerateCourseOutput['modules'][number], 'lessons'> & {
      lessons: EnrichedCourseLesson[];
    }
  >;
};

const MAX_COURSE_VISUALS = 8;

export async function enrichCourseWithVisuals(
  course: GenerateCourseOutput,
  userId: string,
  subject: string,
  level: string,
): Promise<EnrichedCourseOutput> {
  let generatedCount = 0;
  const modules = [];

  for (const courseModule of course.modules) {
    const lessons: EnrichedCourseLesson[] = [];
    for (const lesson of courseModule.lessons) {
      if (!lesson.visuals?.length || generatedCount >= MAX_COURSE_VISUALS) {
        lessons.push(lesson);
        continue;
      }
      const generatedVisuals = await generateEducationalVisuals({
        specs: lesson.visuals.slice(0, 1),
        userId,
        studentId: userId,
        subject,
        studyLevel: level,
      });
      generatedCount += generatedVisuals.length;
      lessons.push({ ...lesson, generatedVisuals });
    }
    modules.push({ ...courseModule, lessons });
  }

  return { ...course, modules };
}
