
"use server";

import { generateBlogPost, GenerateBlogPostOutput } from "@/server/ai/flows/blog-post-generation";
import { z } from "zod";
import { runStudYearAction } from "../services/pipeline";

const GenerateBlogPostSchema = z.object({
  topic: z.string().min(5, "Please enter a topic with at least 5 characters."),
  userId: z.string().min(1, "User ID is required."),
});

function formText(fd: FormData, key: string): string {
  const v = fd.get(key);
  if (typeof v === "string") return v;
  return "";
}

export async function createAiBlogPost(formData: FormData): Promise<{ success: boolean, blogPost?: GenerateBlogPostOutput, error?: string }> {
    try {
        const validatedData = GenerateBlogPostSchema.parse({
            topic: formText(formData, "topic"),
            userId: formText(formData, "userId"),
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

    } catch (error: unknown) {
        /** Genkit / SDK errors can break Next dev overlay when passed raw into `console.error`. */
        if (error instanceof z.ZodError) {
            const msg = error.issues.map((e) => e.message).join(", ");
            console.error("[createAiBlogPost] validation:", msg);
            return { success: false, error: msg };
        }
        const errorMessage =
            error instanceof Error && typeof error.message === "string"
                ? error.message
                : "An unexpected error occurred.";
        console.error("[createAiBlogPost]", errorMessage);
        return { success: false, error: errorMessage };
    }
}
