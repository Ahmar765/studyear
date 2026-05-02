
"use server";

import { summarizeTopic, SummarizeTopicInput } from "@/server/ai/flows/topic-summarization";
import { z } from "zod";
import { runStudYearAction } from "../services/pipeline";

const FormSchema = z.object({
  topicText: z.string().min(50, "Please enter text with at least 50 characters."),
  topicName: z.string().min(3, "Please provide a topic name."),
  subject: z.string().min(1, "Please select a subject."),
  level: z.string().min(1, "Please select a level."),
  userId: z.string().min(1, "User ID is required."),
});

export async function generateSummary(formData: FormData) {
    try {
        const validatedData = FormSchema.parse({
            topicText: formData.get("topicText"),
            topicName: formData.get("topicName"),
            subject: formData.get("subject"),
            level: formData.get("level"),
            userId: formData.get("userId"),
        });

        const result = await runStudYearAction({
            userId: validatedData.userId,
            studentId: validatedData.userId,
            featureKey: 'AI_EXPLANATION', // Re-using cost for now
            entityType: 'TOPIC_SUMMARY',
            action: 'generateSummary',
            eventType: 'RESOURCE_GENERATED',
            stage: 'LEARN',
            payload: validatedData,
            execute: () => summarizeTopic({ topic: validatedData.topicText }),
        });

        return { success: true, summary: result.result.summary };

    } catch (error: any) {
        console.error("Error in generateSummary action:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: errorMessage };
    }
}
