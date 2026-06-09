
'use server';

import { generateInteractiveLesson, GenerateInteractiveLessonInput } from '@/server/ai/flows/ai-lesson-generation';
import { aiTutorAssistance, AiTutorAssistanceInput } from '@/server/ai/flows/ai-tutor-assistance';
import { generateQuiz, GenerateQuizInput } from '@/server/ai/flows/quiz-generation';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin-app';
import { savedResourceService } from '@/server/services/resources';
import * as admin from 'firebase-admin';
import { AIGatewayService } from '../services/ai-gateway';
import type { AIRequestContext, AIUserInput } from '../ai/gateway-schema';
import { randomUUID } from 'crypto';
import { getUserProfileServer } from '../services/user';
import type { UserProfile } from '@/lib/firebase/services/user';
import { enrichWithEducationalVisuals } from '@/server/lib/enrich-ai-visuals';
import type { GeneratedReviewVisual } from '@/server/services/assignment-review-visuals';

/** Quiz / lesson calibration — never guess A-Level for younger profiles. */
function resolveQuizAcademicLevel(profile: UserProfile | null): string {
  const raw = String(profile?.studyLevel ?? profile?.yearGroup ?? '').trim();
  if (raw.length > 0) return raw;
  return 'GCSE';
}

function resolveQuizSubject(profile: UserProfile | null, lessonTitle: string): string {
  const subjects = profile?.subjects;
  if (Array.isArray(subjects) && subjects.length > 0) {
    const names = subjects.map((s) => String(s?.name ?? '').trim()).filter(Boolean);
    if (names.length === 1) return names[0];
    if (names.length > 1) return names.slice(0, 3).join(', ');
  }
  return lessonTitle.trim() || 'General studies';
}

export async function createLesson(topic: string, userId: string) {
  if (!topic || topic.length < 3) {
    return { success: false, error: 'Please enter a valid topic.' };
  }
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const userProfile = await getUserProfileServer(userId);
    if (!userProfile) throw new Error("User profile not found.");

    const gateway = new AIGatewayService();
    const context: AIRequestContext = {
      requestId: randomUUID(),
      userId,
      taskType: 'AI_INTERACTIVE_LESSON',
      featureName: 'ai-interactive-lesson',
      entitlement: 'AI_INTERACTIVE_LESSON',
      role: userProfile.role,
      subscriptionTier: userProfile.subscription || 'free',
      idempotencyKey: randomUUID(),
      estimatedInputTokens: Math.ceil(topic.length / 4),
    };
    const academicLevel = resolveQuizAcademicLevel(userProfile);
    const input: AIUserInput<GenerateInteractiveLessonInput> = {
        promptPayload: { topic, academicLevel },
    };
    
    const response = await gateway.execute(context, input, generateInteractiveLesson);
    const enriched = await enrichWithEducationalVisuals(
      response.output,
      userId,
      resolveQuizSubject(userProfile, response.output.lessonTitle),
      academicLevel,
    );

    await savedResourceService.save({
      studentId: userId,
      type: 'AI_INTERACTIVE_LESSON',
      title: enriched.lessonTitle,
      content: enriched,
    });

    return { success: true, lesson: enriched };
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    return { success: false, error: error.message || 'Failed to generate lesson.' };
  }
}

const LessonStepSchema = z.object({
    step: z.number(),
    title: z.string(),
    concept: z.string(),
});
const LessonPlanSchema = z.array(LessonStepSchema);

export async function getNextStep(
  lessonPlan: z.infer<typeof LessonPlanSchema>,
  currentStep: number,
  topic: string,
  userId?: string,
) {
    try {
        const userProfile = userId ? await getUserProfileServer(userId) : null;
        const academicLevel = resolveQuizAcademicLevel(userProfile);
        const subject = resolveQuizSubject(userProfile, topic);
        const step =
          lessonPlan.find((s) => s.step === currentStep) ??
          lessonPlan[currentStep - 1];

        const input: AiTutorAssistanceInput = {
            query: step
              ? `Teach interactive lesson step ${currentStep}: "${step.title}". Key concept: ${step.concept}. Overall topic: ${topic}. Explain clearly, use examples, and check understanding before moving on.`
              : `Continue the interactive lesson on ${topic} (step ${currentStep}).`,
            lessonPlan: lessonPlan,
            currentStep: currentStep,
        }
        const raw = await aiTutorAssistance(input);
        const enriched = userId && !raw.escalated
          ? await enrichWithEducationalVisuals(raw, userId, subject, academicLevel)
          : raw;
        return {
          success: true,
          response: enriched.response,
          generatedVisuals: (enriched as { generatedVisuals?: GeneratedReviewVisual[] }).generatedVisuals,
        };
    } catch(error) {
        console.error('Error getting next step:', error);
        return { success: false, error: 'Failed to get next step.' };
    }
}

/**
 * End-of-lesson quiz — academic level comes from the student's profile (student_profiles / merged user), not the client.
 */
export async function createLessonFollowUpQuiz(lessonTitle: string, userId: string) {
  if (!userId) {
    return { success: false, error: 'Not signed in.' };
  }
  try {
    const profile = await getUserProfileServer(userId);
    const level = resolveQuizAcademicLevel(profile);
    const subject = resolveQuizSubject(profile, lessonTitle);
    const input: GenerateQuizInput = {
      topic: lessonTitle,
      level,
      numberOfQuestions: 5,
      subject,
    };
    const result = await generateQuiz(input);
    return { success: true, quiz: result };
  } catch (error) {
    console.error('Error creating quiz:', error);
    return { success: false, error: 'Failed to generate quiz.' };
  }
}
