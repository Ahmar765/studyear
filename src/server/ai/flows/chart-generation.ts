import { ai } from '..';
import { z } from 'zod';

const ChartDataItemSchema = z.object({
  name: z.string().describe("The label for the data point (e.g., a month, a category)."),
  value: z.number().describe("The numerical value for the data point."),
});

export const GenerateChartInputSchema = z.object({
  description: z.string().min(10, "Please describe the chart you want to create."),
  type: z.enum(['bar', 'line', 'pie']).describe("The desired type of chart."),
});
export type GenerateChartInput = z.infer<typeof GenerateChartInputSchema>;

export const GenerateChartOutputSchema = z.object({
  title: z.string().describe("A suitable title for the chart."),
  data: z.array(ChartDataItemSchema).describe("The structured data for the chart, ready for a charting library."),
});
export type GenerateChartOutput = z.infer<typeof GenerateChartOutputSchema>;


export async function generateChartData(input: GenerateChartInput): Promise<GenerateChartOutput> {
  return generateChartDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChartDataPrompt',
  input: {schema: GenerateChartInputSchema},
  output: {schema: GenerateChartOutputSchema},
  prompt: `You are a data visualization assistant. Your task is to convert a natural language description into a structured JSON object that can be used to render a chart.

You will be given a description of data and a chart type. You must generate a suitable title and a data array for a charting library like Recharts. The data array should consist of objects with a 'name' (for the label) and a 'value' (for the numerical data).

Chart Type: {{{type}}}
Description: {{{description}}}

Generate the JSON output now.
`,
});

const generateChartDataFlow = ai.defineFlow(
  {
    name: 'generateChartDataFlow',
    inputSchema: GenerateChartInputSchema,
    outputSchema: GenerateChartOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
