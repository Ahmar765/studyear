
'use server';

import { z } from 'zod';
import { generateMindMap, GenerateMindMapInput, GenerateMindMapOutput } from '@/server/ai/flows/mind-map-generation';
import { runStudYearAction } from '../services/pipeline';

const FormSchema = z.object({
  topic: z.string().min(3, "Please enter a topic with at least 3 characters."),
  userId: z.string().min(1),
});

export async function generateMindMapAction(formData: FormData): Promise<{ success: boolean; map?: GenerateMindMapOutput; error?: string }> {
  try {
    const validatedData = FormSchema.parse({
      topic: formData.get("topic"),
      userId: formData.get("userId"),
    });

    const result = await runStudYearAction({
        userId: validatedData.userId,
        studentId: validatedData.userId,
        featureKey: 'AI_MIND_MAP',
        entityType: 'MIND_MAP',
        action: 'generateMindMap',
        eventType: 'RESOURCE_GENERATED',
        stage: 'LEARN',
        payload: validatedData,
        execute: () => generateMindMap({ topic: validatedData.topic }),
    });

    return { success: true, map: result.result };

  } catch (error: any) {
    console.error("Error in generateMindMapAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: error.message || "An unexpected error occurred while generating the mind map." };
  }
}
