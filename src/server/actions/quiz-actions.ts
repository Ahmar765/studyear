
'use server';

import { generateQuiz, GenerateQuizInput } from '@/server/ai/flows/quiz-generation';
import { z } from 'zod';
import { runStudYearAction } from '../services/pipeline';
import { learningEventService } from '../services/learning-events';
import { dashboardSyncService } from '../services/dashboard-sync';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

const FormSchema = z.object({
  subject: z.string().min(1, 'Please select a subject.'),
  topic: z.string().min(3, 'Please enter a topic with at least 3 characters.'),
  level: z.string().min(1, 'Please select a study level.'),
  numberOfQuestions: z.coerce
    .number()
    .int()
    .min(3, 'Must be at least 3 questions')
    .max(10, 'Cannot be more than 10 questions'),
  userId: z.string().min(1, 'User ID is required.'),
});

export async function createAiQuiz(formData: FormData) {
  try {
    const validatedData = FormSchema.parse({
      subject: formData.get('subject'),
      topic: formData.get('topic'),
      level: formData.get('level'),
      numberOfQuestions: formData.get('numberOfQuestions'),
      userId: formData.get('userId'),
    });

    const result = await runStudYearAction({
        userId: validatedData.userId,
        studentId: validatedData.userId,
        featureKey: 'AI_QUIZ_GENERATION',
        entityType: 'QUIZ',
        action: 'generateQuiz',
        eventType: 'RESOURCE_GENERATED',
        stage: 'PRACTISE',
        payload: validatedData,
        execute: () => generateQuiz(validatedData),
    });

    return { success: true, quiz: { ...result.result, id: result.entityId } };

  } catch (error: any) {
    console.error("Error in createAiQuiz action:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(', ') };
    }
    return { success: false, error: (error as Error).message || 'An unexpected error occurred while generating the quiz.' };
  }
}


export async function logQuizAttempt(attemptData: {
  quizId: string;
  studentId: string;
  subjectId: string;
  score: number;
  outOf: number;
}) {
  try {
    const attemptRef = adminDb.collection('quiz_attempts').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const scorePercent =
      attemptData.outOf > 0 ? (attemptData.score / attemptData.outOf) * 100 : 0;

    await attemptRef.set({
      attemptId: attemptRef.id,
      quizId: attemptData.quizId,
      studentId: attemptData.studentId,
      subjectId: attemptData.subjectId,
      startedAt: now,
      submittedAt: now,
      status: 'marked',
      scoreRaw: attemptData.score,
      scorePercent,
      createdAt: now,
      updatedAt: now,
      weaknessTopicIds: [],
      strengthTopicIds: [],
      aiFeedbackStatus: 'pending',
    });

    await learningEventService.create({
      studentId: attemptData.studentId,
      type: 'QUIZ_SUBMITTED',
      stage: 'PRACTISE',
      payload: {
        subjectId: attemptData.subjectId,
        scoreRaw: attemptData.score,
        outOf: attemptData.outOf,
        scorePercent,
        quizId: attemptData.quizId,
      },
    });

    await dashboardSyncService.updateStudentDashboard(attemptData.studentId);

    return { success: true };
  } catch (error: any) {
    console.error('Error logging quiz attempt:', error);
    return { success: false, error: 'Failed to log quiz attempt.' };
  }
}
