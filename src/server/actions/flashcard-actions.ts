
"use server";

import { generateFlashcards, GenerateFlashcardsInput } from "@/server/ai/flows/flashcard-generation";
import { z } from "zod";
import { runStudYearAction } from "../services/pipeline";

const FormSchema = z.object({
  topic: z.string().min(3, "Please enter a topic with at least 3 characters."),
  subject: z.string().min(1, "Please select a subject."),
  level: z.string().min(1, "Please select a level."),
  userId: z.string().min(1, "User ID is required."),
});

export async function createAiFlashcards(formData: FormData) {
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
            featureKey: 'AI_QUIZ_GENERATION', // Assuming flashcards fall under quiz/test prep cost
            entityType: 'FLASHCARD',
            action: 'generateFlashcards',
            eventType: 'RESOURCE_GENERATED',
            stage: 'LEARN',
            payload: validatedData,
            execute: () => generateFlashcards({ topic: validatedData.topic }),
        });

        return { success: true, flashcards: result.result.flashcards };

    } catch (error: any) {
        console.error("Error in createAiFlashcards action:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, error: error.message || "An unexpected error occurred while generating the flashcards." };
    }
}
