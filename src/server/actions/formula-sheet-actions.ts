
'use server';

import { z } from 'zod';
import { generateFormulaSheet, GenerateFormulaSheetInput, GenerateFormulaSheetOutput } from '@/server/ai/flows/formula-sheet-generation';
import { runStudYearAction } from '../services/pipeline';

const FormSchema = z.object({
  subject: z.string().min(1, "Please select a subject."),
  level: z.string().min(1, "Please select a study level."),
  userId: z.string().min(1),
});

export async function generateFormulaSheetAction(formData: FormData): Promise<{ success: boolean; sheet?: GenerateFormulaSheetOutput; error?: string }> {
  try {
    const validatedData = FormSchema.parse({
      subject: formData.get("subject"),
      level: formData.get("level"),
      userId: formData.get("userId"),
    });

    const result = await runStudYearAction({
        userId: validatedData.userId,
        studentId: validatedData.userId,
        featureKey: 'FORMULA_SHEET',
        entityType: 'FORMULA_SHEET',
        action: 'generateFormulaSheet',
        eventType: 'RESOURCE_GENERATED',
        stage: 'LEARN',
        payload: validatedData,
        execute: () => generateFormulaSheet(validatedData),
    });

    return { success: true, sheet: result.result };

  } catch (error: any) {
    console.error("Error in generateFormulaSheetAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: error.message || "An unexpected error occurred while generating the formula sheet." };
  }
}
