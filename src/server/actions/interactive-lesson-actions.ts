
'use server';

import { generateInteractiveLesson, GenerateInteractiveLessonInput } from '@/server/ai/flows/ai-lesson-generation';
import { aiTutorAssistance, AiTutorAssistanceInput } from '@/server/ai/flows/ai-tutor-assistance';
import { generateQuiz, GenerateQuizInput } from '@/server/ai/flows/quiz-generation';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { AIGatewayService } from '../services/ai-gateway';
import type { AIRequestContext, AIUserInput } from '../ai/gateway-schema';
import { randomUUID } from 'crypto';
import { getUserProfileServer } from '../services/user';

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
    const input: AIUserInput<GenerateInteractiveLessonInput> = {
        promptPayload: { topic }
    };
    
    const response = await gateway.execute(context, input, generateInteractiveLesson);
    const result = response.output;

    const savedResourceRef = adminDb.collection('users').doc(userId).collection('saved_resources').doc();
    await savedResourceRef.set({
        studentId: userId,
        type: 'AI_INTERACTIVE_LESSON',
        title: result.lessonTitle,
        content: result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, lesson: result };
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

export async function getNextStep(lessonPlan: z.infer<typeof LessonPlanSchema>, currentStep: number, topic: string) {
    try {
        const input: AiTutorAssistanceInput = {
            query: `Continue to the next step. The topic is ${topic}.`,
            lessonPlan: lessonPlan,
            currentStep: currentStep,
        }
        const result = await aiTutorAssistance(input);
        return { success: true, response: result.response };
    } catch(error) {
        console.error('Error getting next step:', error);
        return { success: false, error: 'Failed to get next step.' };
    }
}

export async function createQuiz(topic: string, level: string) {
    try {
        const input: GenerateQuizInput = {
            topic,
            level,
            numberOfQuestions: 5,
            subject: 'General Knowledge' // Placeholder
        }
        const result = await generateQuiz(input);
        return { success: true, quiz: result };
    } catch (error) {
        console.error('Error creating quiz:', error);
        return { success: false, error: 'Failed to generate quiz.' };
    }
}
