
/**
 * ACU debit amounts per activity. £1 = 100 ACUs; max variable cost ≤ £0.50 per 100 ACUs.
 * Premium unlocks tools — usage is always metered (no unlimited AI).
 */
export const ACU_FEATURE_COSTS = {
  // Explanations & Tutoring
  AI_EXPLANATION: 3,
  AI_HOMEWORK_HELP: 5,
  AI_TUTOR_SESSION: 8,
  AI_TUTOR_SESSION_DEEP: 15,
  AI_INTERACTIVE_LESSON: 12,

  // Planning & Diagnostics
  AI_STUDY_PLAN: 10,
  AI_MIND_MAP: 8,
  DIAGNOSTIC_REPORT: 12,
  DIAGNOSTIC_RESULTS: 8,
  RECOVERY_PLAN: 12,

  // Practice & Assessment
  AI_QUIZ_GENERATION: 5,
  AI_FLASHCARDS: 6,
  EXAM_SIMULATION: 10,
  GRADE_PREDICTION: 10,

  // Written Feedback
  AI_FEEDBACK: 8,
  AI_ASSIGNMENT_REVIEW: 35,
  AI_ESSAY_REVIEW: 30,
  AI_DISSERTATION_REVIEW: 35,

  // Resource Generation
  AI_COURSE_GENERATOR: 15,
  AI_ESSAY_PLAN: 6,
  FORMULA_SHEET: 8,
  TOPIC_SUMMARY: 6,

  // Visual Tools — image generation uses AI; SVG charts are cheaper
  VISUAL_DRAWING: 20,
  EDUCATIONAL_IMAGE: 20,
  BAR_GRAPH: 8,
  LINE_GRAPH: 8,
  PIE_CHART: 8,
  SCATTER_PLOT: 8,
  HISTOGRAM: 8,
  PICTOGRAPH: 8,
  COORDINATE_GRAPH: 8,
  GEOMETRY_DIAGRAM: 8,
  FUNCTION_GRAPH: 8,
  GRAPH_THEORY_DIAGRAM: 8,
} as const;

export type FeatureKey = keyof typeof ACU_FEATURE_COSTS;
/** Alias used by the AI gateway contracts */
export type AIFeatureKey = FeatureKey;

/**
 * Features that debit ACUs only — still require the correct subscription tier
 * (see entitlements.ts). Assignment Review is never ACU-only.
 */
export const ACU_ONLY_FEATURES = new Set<FeatureKey>([]);

export function isAcuOnlyFeature(featureKey: FeatureKey): boolean {
  return ACU_ONLY_FEATURES.has(featureKey);
}

export function getAcuFeatureCost(featureKey: FeatureKey): number {
  return ACU_FEATURE_COSTS[featureKey];
}
