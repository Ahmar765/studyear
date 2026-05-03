
'use server';

import { z } from 'zod';
import { generateCourse, GenerateCourseInput } from '@/server/ai/flows/course-generation';
import { getSimilarContent, SimilarContentInput } from '@/server/ai/flows/similar-content-recommendation';
import { randomUUID } from 'crypto';
import { runStudYearAction } from '../services/pipeline';
import { getUserProfileServer } from '../services/user';
import { AIGatewayService } from '../services/ai-gateway';
import { AIRequestContext, AIUserInput } from '../ai/gateway-schema';


const GenerateCourseSchema = z.object({
  subject: z.string().min(1, "Please select a subject."),
  topic: z.string().min(3, "Please enter a topic with at least 3 characters."),
  level: z.string().min(1, "Please select a study level."),
  examBoard: z.string().optional(),
  userId: z.string().min(1),
});

/** `FormData.get` returns `null` for missing keys; Zod optional strings do not accept `null`. */
function optionalFormString(v: FormDataEntryValue | null): string | undefined {
  if (v === null || v === "") return undefined;
  return typeof v === "string" ? v : undefined;
}

export async function generateCourseAction(formData: FormData) {
  const validatedData = GenerateCourseSchema.parse({
    subject: formData.get("subject"),
    topic: formData.get("topic"),
    level: formData.get("level"),
    examBoard: optionalFormString(formData.get("examBoard")),
    userId: formData.get("userId"),
  });
  
  try {
    const result = await runStudYearAction({
      userId: validatedData.userId,
      studentId: validatedData.userId,
      featureKey: 'AI_COURSE_GENERATOR',
      entityType: 'AI_COURSE',
      action: 'generateCourse',
      eventType: 'RESOURCE_GENERATED',
      stage: 'LEARN',
      payload: validatedData,
      execute: () => generateCourse(validatedData),
    });

    return { success: true, course: result.result };

  } catch (error: any) {
    console.error("Error in generateCourseAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: error.message || "An unexpected error occurred while generating the course." };
  }
}

const SimilarContentSchema = z.object({
    subject: z.string().min(1),
    topic: z.string().min(1),
});

export async function getSimilarContentAction(formData: FormData, userId: string) {
    try {
        const validatedData = SimilarContentSchema.parse({
            subject: formData.get("subject"),
            topic: formData.get("topic"),
        });

        const userProfile = await getUserProfileServer(userId);
        if (!userProfile) throw new Error("User profile not found.");

        const gateway = new AIGatewayService();
        const context: AIRequestContext = {
          requestId: randomUUID(),
          userId: userId,
          taskType: 'AI_EXPLANATION',
          featureName: 'similar-content-recommender',
          role: userProfile.role,
          subscriptionTier: userProfile.subscription || 'free', 
          idempotencyKey: randomUUID(),
          estimatedInputTokens: Math.ceil((JSON.stringify(validatedData).length) / 4),
        };
    
        const gatewayInput: AIUserInput<SimilarContentInput> = {
          promptPayload: validatedData
        };

        const response = await gateway.execute(context, gatewayInput, getSimilarContent);

        return { success: true, recommendations: response.output.recommendations };
    } catch (error: any) {
        console.error("Failed to fetch similar content", error);
        return { success: false, error: error.message || "Could not fetch similar content." };
    }
}
