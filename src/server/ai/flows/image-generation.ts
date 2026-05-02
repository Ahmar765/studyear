import { ai } from '..';
import { z } from 'zod';

export const GenerateImageInputSchema = z.object({
  prompt: z.string().min(3, "Please enter a prompt with at least 3 characters."),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().url().describe("The data URI of the generated image."),
  revisedPrompt: z.string().describe("The prompt that was actually used to generate the image, potentially revised by the model for clarity.")
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const { media, info } = await ai.generate({
    model: 'googleai/imagen-4.0-fast-generate-001',
    prompt: input.prompt,
    config: {
      aspectRatio: '16:9',
    },
  });

  if (!media?.url) {
    throw new Error('Image generation failed to produce an image.');
  }

  return {
    imageUrl: media.url,
    revisedPrompt: info?.prompt as string || input.prompt,
  };
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    return await generateImage(input);
  }
);
