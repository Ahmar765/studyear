import { z } from 'zod';

export const VisualRequestSchema = z.object({
  userId: z.string(),
  studentId: z.string(),
  type: z.enum([
    'VISUAL_DRAWING',
    'EDUCATIONAL_IMAGE',
    'BAR_GRAPH',
    'LINE_GRAPH',
    'PIE_CHART',
    'SCATTER_PLOT',
    'HISTOGRAM',
    'PICTOGRAPH',
    'COORDINATE_GRAPH',
    'GEOMETRY_DIAGRAM',
    'FUNCTION_GRAPH',
    'GRAPH_THEORY_DIAGRAM',
  ]),
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  subject: z.string().optional(),
  studyLevel: z.string().optional(),
  prompt: z.string().optional(),
  data: z.any().optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  colourMode: z.enum(['DEFAULT', 'BRIGHT', 'PRIMARY_CHILDREN', 'EXAM_STYLE']).optional(),
});

export type VisualRequest = z.infer<typeof VisualRequestSchema>;
