'use server';

import { z } from 'zod';
import { getVerifiedUser } from '@/server/lib/auth';
import { HttpsError } from '@/server/lib/errors';
import { assertParentFeature, assertParentStudentLink } from '@/server/lib/parent-plan';
import { runStudYearAction } from '@/server/services/pipeline';
import {
  generateParentAdvisorResponse,
  ParentAdvisorOutputSchema,
} from '@/server/ai/flows/parent-advisor-generation';

const AskSchema = z.object({
  idToken: z.string().min(1),
  studentId: z.string().min(1),
  question: z.string().min(3),
  childName: z.string().min(1),
  childSummary: z.string().min(10),
});

export type ParentAdvisorResponse = z.infer<typeof ParentAdvisorOutputSchema>;

export async function askParentAdvisorAction(
  input: z.infer<typeof AskSchema>,
): Promise<{ success: boolean; response?: ParentAdvisorResponse; error?: string }> {
  const parsed = AskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const user = await getVerifiedUser(parsed.data.idToken);
  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    await assertParentFeature(user.uid, 'parentAdvisor');
    await assertParentStudentLink(user.uid, parsed.data.studentId);
    const result = await runStudYearAction({
      userId: user.uid,
      studentId: parsed.data.studentId,
      featureKey: 'AI_EXPLANATION',
      entityType: 'PARENT_ADVISOR',
      action: 'askParentAdvisor',
      eventType: 'QUESTION_ASKED',
      stage: 'ANALYSE',
      payload: { question: parsed.data.question },
      execute: () =>
        generateParentAdvisorResponse({
          question: parsed.data.question,
          childName: parsed.data.childName,
          childSummary: parsed.data.childSummary,
        }),
    });

    const response = ParentAdvisorOutputSchema.parse(result.result);
    return { success: true, response };
  } catch (error: unknown) {
    if (error instanceof HttpsError) {
      return { success: false, error: error.message };
    }
    const message = error instanceof Error ? error.message : 'Could not get advisor response.';
    console.error('[askParentAdvisorAction]', message);
    return { success: false, error: message };
  }
}
