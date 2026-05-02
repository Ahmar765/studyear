
"use server";

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from "@/server/ai/flows/blog-post-generation";
import { z } from "zod";
import { randomUUID } from "crypto";
import { runStudYearAction } from "../services/pipeline";

const GenerateBlogPostSchema = z.object({
  topic: z.string().min(5, "Please enter a topic with at least 5 characters."),
  userId: z.string().min(1, "User ID is required."),
});

export async function createAiBlogPost(formData: FormData): Promise<{ success: boolean, blogPost?: GenerateBlogPostOutput, error?: string }> {
    try {
        const validatedData = GenerateBlogPostSchema.parse({
            topic: formData.get("topic"),
            userId: formData.get("userId"),
        });

        const result = await runStudYearAction({
            userId: validatedData.userId,
            studentId: validatedData.userId, // Admin acts on their own behalf
            featureKey: 'AI_EXPLANATION', // Re-use cost for now
            entityType: 'BLOG_POST',
            action: 'generateBlogPost',
            eventType: 'RESOURCE_GENERATED',
            stage: 'LEARN',
            payload: validatedData,
            execute: () => generateBlogPost({ topic: validatedData.topic }),
        });

        return { success: true, blogPost: result.result };

    } catch (error) {
        console.error(error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: errorMessage };
    }
}
