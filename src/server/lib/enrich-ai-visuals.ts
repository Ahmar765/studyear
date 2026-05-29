import type { AiTutorAssistanceOutput } from '@/server/ai/flows/ai-tutor-assistance';
import {
  generateEducationalVisuals,
  type GeneratedReviewVisual,
  type ReviewVisualSpec,
} from '@/server/services/assignment-review-visuals';
import { getUserProfileServer } from '@/server/services/user';

export async function enrichWithEducationalVisuals<T extends { visuals?: ReviewVisualSpec[] }>(
  output: T,
  userId: string,
  subjectOverride?: string,
  studyLevelOverride?: string,
): Promise<T & { generatedVisuals?: GeneratedReviewVisual[] }> {
  if (!output.visuals?.length) {
    return output;
  }

  const profile = await getUserProfileServer(userId);
  const studyLevel =
    studyLevelOverride ??
    String(profile?.studyLevel ?? profile?.yearGroup ?? 'GCSE');
  const subject =
    subjectOverride ??
    (Array.isArray(profile?.subjects) && profile.subjects[0]?.name
      ? String(profile.subjects[0].name)
      : 'General studies');

  const generatedVisuals = await generateEducationalVisuals({
    specs: output.visuals,
    userId,
    studentId: userId,
    subject,
    studyLevel,
  });

  return { ...output, generatedVisuals };
}

export type TutorLikeOutput = AiTutorAssistanceOutput & {
  generatedVisuals?: GeneratedReviewVisual[];
};
