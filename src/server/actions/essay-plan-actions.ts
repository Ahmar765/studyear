
'use server';

import { generateEssayPlan, GenerateEssayPlanInput, GenerateEssayPlanOutput } from "@/server/ai/flows/essay-plan-generation";
import { z } from "zod";
import { runStudYearAction } from "../services/pipeline";

const FormSchema = z.object({
  topic: z.string().min(10, "Please enter a topic or question with at least 10 characters."),
  subject: z.string().min(1, "Please select a subject."),
  level: z.string().min(1, "Please select a level."),
  userId: z.string().min(1, "User ID is required."),
});

export async function createAiEssayPlan(formData: FormData): Promise<{ success: boolean, plan?: GenerateEssayPlanOutput, error?: string }> {
    try {
        const validatedData = FormSchema.parse({
            topic: formData.get("topic"),
            subject: formData.get("subject"),
            level: formData.get("level"),
            userId: formData.get("userId"),
        });
        
        const result = await runStudYearAction({
            userId: validatedData.userId,
            studentId: validatedData.userId,
            featureKey: 'AI_STUDY_PLAN', // Re-using study plan cost for essay plans
            entityType: 'ESSAY_PLAN',
            action: 'generateEssayPlan',
            eventType: 'RESOURCE_GENERATED',
            stage: 'PLAN',
            payload: validatedData,
            execute: () => generateEssayPlan({ essayTopicOrQuestion: validatedData.topic }),
        });

        return { success: true, plan: result.result };
    } catch (error: any) {
        console.error("Error in createAiEssayPlan action:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, error: error.message || "An unexpected error occurred while generating the essay plan." };
    }
}
