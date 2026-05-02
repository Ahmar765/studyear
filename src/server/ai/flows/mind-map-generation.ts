/**
 * @fileOverview An AI agent that generates a mind map for a given topic.
 *
 * - generateMindMap - A function that handles generating the mind map data.
 * - GenerateMindMapInput - The input type for the function.
 * - GenerateMindMapOutput - The return type for the function.
 */

import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';
import { z } from 'zod';

export const GenerateMindMapInputSchema = z.object({
  topic: z.string().describe('The central topic for the mind map.'),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

// Define a recursive schema for the mind map node
const MindMapNodeSchema: z.ZodType<MindMapNode> = z.lazy(() => 
  z.object({
    title: z.string().describe("The title of this node/branch."),
    children: z.array(MindMapNodeSchema).optional().describe("An array of child nodes branching from this one."),
  })
);

export interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}

export const GenerateMindMapOutputSchema = z.object({
  title: z.string().describe("The main title of the mind map, usually the central topic."),
  rootNode: MindMapNodeSchema.describe("The central root node of the mind map from which all other branches extend."),
});
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;

export async function generateMindMap(input: GenerateMindMapInput, options?: { model?: string }): Promise<GenerateMindMapOutput> {
  return mindMapGenerationFlow(input, options);
}

const prompt = ai.definePrompt({
  name: 'mindMapGenerationPrompt',
  input: { schema: GenerateMindMapInputSchema },
  output: { schema: GenerateMindMapOutputSchema },
  prompt: `You are an expert at structuring information visually. Your task is to generate the data structure for a mind map based on a central topic.

Create a hierarchical structure with a central root node and several main branches (3-5). Each main branch should then have its own sub-branches (2-4 each). The structure should be logical and represent the key components and relationships of the topic.

The root node should be the main topic itself.

**Central Topic:** {{{topic}}}

Generate the mind map structure now.
`,
});

const mindMapGenerationFlow = ai.defineFlow(
  {
    name: 'mindMapGenerationFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
  },
  async (input, options) => {
    const { output } = await prompt(input, { model: toGoogleAiGenkitModel(options?.model) });
    return output!;
  }
);
