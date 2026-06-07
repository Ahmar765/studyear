
/**
 * ACU debit amounts per activity. £1 = 100 ACUs; max variable cost ≤ £0.50 per 100 ACUs.
 * Premium unlocks tools — usage is always metered (no unlimited AI).
 */
export const ACU_FEATURE_COSTS = {
  // Explanations & Tutoring
  AI_EXPLANATION: 5,
  AI_HOMEWORK_HELP: 8,
  AI_TUTOR_SESSION: 15,
  AI_TUTOR_SESSION_DEEP: 25,
  AI_INTERACTIVE_LESSON: 25,

  // Planning & Diagnostics
  AI_STUDY_PLAN: 20,
  AI_MIND_MAP: 18,
  DIAGNOSTIC_REPORT: 25,
  DIAGNOSTIC_RESULTS: 15,
  RECOVERY_PLAN: 25,

  // Practice & Assessment
  AI_QUIZ_GENERATION: 10,
  AI_FLASHCARDS: 12,
  EXAM_SIMULATION: 20,
  GRADE_PREDICTION: 20,

  // Written Feedback
  AI_FEEDBACK: 15,
  AI_ASSIGNMENT_REVIEW: 60,
  AI_ESSAY_REVIEW: 50,
  AI_DISSERTATION_REVIEW: 60,

  // Resource Generation
  AI_COURSE_GENERATOR: 30,
  AI_ESSAY_PLAN: 12,
  FORMULA_SHEET: 15,
  TOPIC_SUMMARY: 12,

  // Visual Tools (unified metered rate)
  VISUAL_DRAWING: 40,
  EDUCATIONAL_IMAGE: 40,
  BAR_GRAPH: 40,
  LINE_GRAPH: 40,
  PIE_CHART: 40,
  SCATTER_PLOT: 40,
  HISTOGRAM: 40,
  PICTOGRAPH: 40,
  COORDINATE_GRAPH: 40,
  GEOMETRY_DIAGRAM: 40,
  FUNCTION_GRAPH: 40,
  GRAPH_THEORY_DIAGRAM: 40,
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
