/**
 * @fileOverview An AI agent that generates a formula sheet for a subject.
 *
 * - generateFormulaSheet - A function that handles generating the formula sheet.
 * - GenerateFormulaSheetInput - The input type for the function.
 * - GenerateFormulaSheetOutput - The return type for the function.
 */

import { ai } from '..';
import {z} from 'zod';

export const GenerateFormulaSheetInputSchema = z.object({
  subject: z.string().describe('The subject for the formula sheet (e.g., Physics, Mathematics).'),
  level: z.string().describe('The academic level (e.g., GCSE, A-Level).'),
});
export type GenerateFormulaSheetInput = z.infer<typeof GenerateFormulaSheetInputSchema>;

const FormulaSchema = z.object({
    formula: z.string().describe("The formula itself (e.g., 'E = mc^2')."),
    description: z.string().describe("What the formula is used for."),
    variables: z.string().describe("Explanation of each variable in the formula (e.g., 'E = Energy, m = mass, c = speed of light').")
});

export const GenerateFormulaSheetOutputSchema = z.object({
  title: z.string().describe("The title of the formula sheet."),
  formulas: z.array(FormulaSchema).describe("A list of important formulas for the subject."),
});
export type GenerateFormulaSheetOutput = z.infer<typeof GenerateFormulaSheetOutputSchema>;

export async function generateFormulaSheet(input: GenerateFormulaSheetInput): Promise<GenerateFormulaSheetOutput> {
  return formulaSheetGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'formulaSheetGenerationPrompt',
  input: {schema: GenerateFormulaSheetInputSchema},
  output: {schema: GenerateFormulaSheetOutputSchema},
  prompt: `You are an expert {{{subject}}} teacher for the {{{level}}} level. Create a formula sheet for this subject.

  Your response must be a JSON object containing:
  1. A title for the sheet.
  2. A list of 'formulas'. Each formula object must contain:
     - 'formula': The equation itself.
     - 'description': A brief explanation of what it calculates.
     - 'variables': A clear breakdown of what each variable represents.

  Only include the most essential formulas that a student would need for their exams at this level.`,
});

const formulaSheetGenerationFlow = ai.defineFlow(
  {
    name: 'formulaSheetGenerationFlow',
    inputSchema: GenerateFormulaSheetInputSchema,
    outputSchema: GenerateFormulaSheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
