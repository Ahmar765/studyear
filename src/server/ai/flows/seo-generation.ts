/**
 * @fileOverview An AI agent that generates SEO-optimized metadata for a web page.
 *
 * - generateSeoMetadata - A function that analyzes content to produce a title, description, and keywords.
 * - GenerateSeoMetadataInput - The input type for the function.
 * - GenerateSeoMetadataOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import {z} from 'zod';

export const GenerateSeoMetadataInputSchema = z.object({
  content: z.string().describe('The main content of the page to analyze for SEO.'),
  existingTitle: z.string().optional().describe('The current title of the page.'),
});
export type GenerateSeoMetadataInput = z.infer<typeof GenerateSeoMetadataInputSchema>;

export const GenerateSeoMetadataOutputSchema = z.object({
  suggestedTitle: z.string().describe('A compelling, SEO-optimized title for the page (max 60 characters).'),
  metaDescription: z.string().describe('An engaging meta description that encourages clicks (max 160 characters).'),
  keywords: z.array(z.string()).describe('A list of 5-7 relevant keywords for the page content.'),
});
export type GenerateSeoMetadataOutput = z.infer<typeof GenerateSeoMetadataOutputSchema>;


export async function generateSeoMetadata(input: GenerateSeoMetadataInput, options?: { model?: string }): Promise<GenerateSeoMetadataOutput> {
  return seoMetadataGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'seoMetadataGenerationPrompt',
  input: {schema: GenerateSeoMetadataInputSchema},
  output: {schema: GenerateSeoMetadataOutputSchema},
  prompt: `You are a world-class SEO expert with a specialization in content for students and academic platforms. Your task is to generate optimized metadata for a web page based on its content.

Analyze the following page content and generate:
1.  **suggestedTitle:** A highly clickable, SEO-friendly title under 60 characters. It should be compelling and relevant to the content. If an existing title is provided, improve upon it.
2.  **metaDescription:** A meta description under 160 characters. It must summarize the page's value and include a call-to-action to entice users to click.
3.  **keywords:** A list of 5 to 7 primary and secondary keywords that accurately represent the page content.

**Existing Title (optional):** {{{existingTitle}}}
**Page Content:**
---
{{{content}}}
---
`,
});

const seoMetadataGenerationFlow = ai.defineFlow(
  {
    name: 'seoMetadataGenerationFlow',
    inputSchema: GenerateSeoMetadataInputSchema,
    outputSchema: GenerateSeoMetadataOutputSchema,
  },
  async (input, options) => {
    const {output} = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
