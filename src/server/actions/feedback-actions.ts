
'use server';

import { getWrittenFeedback, WrittenFeedbackInputSchema, WrittenFeedbackOutput, WrittenFeedbackInput } from "@/server/ai/flows/written-answer-feedback";
import { z } from "zod";
import { runStudYearAction } from "../services/pipeline";

const FormSchema = WrittenFeedbackInputSchema.extend({
    userId: z.string().min(1, "User ID is required."),
});

export async function generateAnswerFeedback(formData: FormData): Promise<{ success: boolean; feedback?: WrittenFeedbackOutput; error?: string }> {
    try {
        const validatedData = FormSchema.parse({
            question: formData.get("question"),
            studentAnswer: formData.get("studentAnswer"),
            subject: formData.get("subject"),
            level: formData.get("level"),
            userId: formData.get("userId"),
        });

        const result = await runStudYearAction({
            userId: validatedData.userId,
            studentId: validatedData.userId,
            featureKey: 'AI_FEEDBACK',
            entityType: 'AI_FEEDBACK',
            action: 'generateAnswerFeedback',
            eventType: 'RESOURCE_GENERATED',
            stage: 'PRACTISE',
            payload: validatedData,
            execute: () => getWrittenFeedback(validatedData)
        });

        return { success: true, feedback: result.result };

    } catch (error: any) {
        console.error("Error in generateAnswerFeedback action:", error);
        return { success: false, error: error.message };
    }
}
