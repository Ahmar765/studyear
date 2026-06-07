import { generateChartData } from '@/server/ai/flows/chart-generation';
import { generateImage } from '@/server/ai/flows/image-generation';
import { buildEducationalImagePrompt } from '@/server/lib/educational-image-prompt';
import { generateChartSvg } from '@/server/services/visual-svg.service';
import type { VisualRequest } from '@/server/schemas/visual-request';
import { z } from 'zod';

export const ReviewVisualSpecSchema = z.object({
  visualType: z.enum([
    'BAR_GRAPH',
    'LINE_GRAPH',
    'PIE_CHART',
    'COORDINATE_GRAPH',
    'FUNCTION_GRAPH',
    'GEOMETRY_DIAGRAM',
    'EDUCATIONAL_IMAGE',
    'VISUAL_DRAWING',
    'SCATTER_PLOT',
    'HISTOGRAM',
  ]),
  title: z.string(),
  rationale: z.string(),
  prompt: z.string().optional(),
  chartDescription: z.string().optional(),
  data: z.unknown().optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
});

export type ReviewVisualSpec = z.infer<typeof ReviewVisualSpecSchema>;

export type GeneratedReviewVisual = ReviewVisualSpec & {
  svg?: string;
  imageUrl?: string;
};

const CHART_TYPES = new Set([
  'BAR_GRAPH',
  'LINE_GRAPH',
  'PIE_CHART',
  'COORDINATE_GRAPH',
  'FUNCTION_GRAPH',
  'GEOMETRY_DIAGRAM',
  'SCATTER_PLOT',
  'HISTOGRAM',
]);

const IMAGE_TYPES = new Set(['EDUCATIONAL_IMAGE', 'VISUAL_DRAWING']);

function chartGenType(
  visualType: ReviewVisualSpec['visualType'],
): 'bar' | 'line' | 'pie' {
  if (visualType === 'LINE_GRAPH' || visualType === 'SCATTER_PLOT') return 'line';
  if (visualType === 'PIE_CHART') return 'pie';
  return 'bar';
}

function toSvgChartType(visualType: ReviewVisualSpec['visualType']): VisualRequest['type'] {
  if (visualType === 'HISTOGRAM') return 'HISTOGRAM';
  if (visualType === 'SCATTER_PLOT') return 'SCATTER_PLOT';
  return visualType as VisualRequest['type'];
}

function buildChartDataFromAi(
  visualType: ReviewVisualSpec['visualType'],
  items: { name: string; value: number }[],
): VisualRequest['data'] {
  if (visualType === 'LINE_GRAPH' || visualType === 'SCATTER_PLOT') {
    return items.map((d, i) => ({ x: i + 1, y: d.value }));
  }
  return items.map((d) => ({ label: d.name, value: d.value }));
}

export async function generateEducationalVisuals(params: {
  specs: ReviewVisualSpec[];
  userId: string;
  studentId: string;
  subject: string;
  studyLevel: string;
}): Promise<GeneratedReviewVisual[]> {
  return generateEducationalVisualsImpl(params);
}

export async function generateAssignmentReviewVisuals(params: {
  specs: ReviewVisualSpec[];
  userId: string;
  studentId: string;
  subject: string;
  studyLevel: string;
}): Promise<GeneratedReviewVisual[]> {
  return generateEducationalVisualsImpl(params);
}

async function generateEducationalVisualsImpl(params: {
  specs: ReviewVisualSpec[];
  userId: string;
  studentId: string;
  subject: string;
  studyLevel: string;
}): Promise<GeneratedReviewVisual[]> {
  const out: GeneratedReviewVisual[] = [];

  for (const spec of params.specs.slice(0, 4)) {
    try {
      const parsed = ReviewVisualSpecSchema.parse(spec);

      if (CHART_TYPES.has(parsed.visualType)) {
        let data = parsed.data;
        if (!data && parsed.chartDescription?.trim()) {
          const chartOut = await generateChartData({
            description: `${parsed.title}. ${parsed.chartDescription}. Subject: ${params.subject}. Level: ${params.studyLevel}.`,
            type: chartGenType(parsed.visualType),
          });
          data = buildChartDataFromAi(parsed.visualType, chartOut.data);
        }

        const visualReq: VisualRequest = {
          userId: params.userId,
          studentId: params.studentId,
          type: toSvgChartType(parsed.visualType),
          title: parsed.title,
          subject: params.subject,
          studyLevel: params.studyLevel,
          prompt: parsed.prompt,
          data,
          xAxisLabel: parsed.xAxisLabel,
          yAxisLabel: parsed.yAxisLabel,
        };

        const { svg } = generateChartSvg(visualReq);
        out.push(svg ? { ...parsed, svg } : { ...parsed });
        continue;
      }

      if (IMAGE_TYPES.has(parsed.visualType)) {
        const prompt =
          parsed.prompt?.trim() ||
          buildEducationalImagePrompt({
            title: parsed.title,
            topic: parsed.rationale ?? parsed.title,
            studyLevel: params.studyLevel,
            subject: params.subject,
            rationale: parsed.rationale,
          });
        const img = await generateImage({ prompt });
        out.push({ ...parsed, imageUrl: img.imageUrl });
        continue;
      }
    } catch (err) {
      console.error('[generateAssignmentReviewVisuals] visual failed:', spec.title, err);
    }
  }

  return out;
}
