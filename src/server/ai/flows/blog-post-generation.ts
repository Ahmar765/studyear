/**
 * @fileOverview An AI agent that generates a complete blog post from a topic.
 *
 * - generateBlogPost - A function that handles generating the blog post.
 * - GenerateBlogPostInput - The input type for the function.
 * - GenerateBlogPostOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a blog post.'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;


const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe("The catchy, SEO-friendly title of the blog post."),
  metaDescription: z.string().describe("A brief, compelling meta description for SEO purposes (approx. 155-160 characters)."),
  content: z.string().describe("The full content of the blog post in Markdown format. It should include a strong introduction, a well-structured body with subheadings (using ##), lists, and a conclusion with a clear call to action."),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;


export async function generateBlogPost(input: GenerateBlogPostInput, options?: { model?: string }): Promise<GenerateBlogPostOutput> {
  return blogPostGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'blogPostGenerationPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: GenerateBlogPostOutputSchema},
  prompt: `You are an expert content creator and SEO specialist. Your task is to write a comprehensive, engaging, and well-structured blog post based on the provided topic.

Follow these instructions carefully:
1.  **Title:** Create a catchy, attention-grabbing title that is also optimized for search engines.
2.  **Meta Description:** Write a concise meta description (around 155 characters) that summarizes the post and encourages clicks.
3.  **Content:** The main body of the post should be written in Markdown.
    *   **Introduction:** Start with a strong, compelling introduction that hooks the reader and clearly states what the post is about.
    *   **Body:** Structure the body with clear subheadings (using '##' for H2 tags). Break up long paragraphs. Use bulleted or numbered lists where appropriate to make the content scannable and easy to digest. The content should be well-researched, informative, and valuable to the reader.
    *   **Conclusion:** End with a strong conclusion that summarizes the key takeaways and includes a clear call to action (e.g., encouraging comments, suggesting they try a feature, or pointing to other resources).

Topic: {{{topic}}}`,
});

const blogPostGenerationFlow = ai.defineFlow(
  {
    name: 'blogPostGenerationFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
