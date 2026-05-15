import type { SubscriptionType } from "@/server/schemas";
import { FeatureKey } from "./acu-costs";

export const PLAN_ENTITLEMENTS: Record<SubscriptionType, FeatureKey[]> = {
  /**
   * Free tier: core tutoring, diagnostics, study planner, etc.
   * Premium toolkit (courses, quizzes, flashcards, summaries, visuals, AI assignment review, …)
   * requires STUDENT_PREMIUM or STUDENT_PREMIUM_PLUS.
   */
  FREE: [
    "AI_EXPLANATION",
    "AI_INTERACTIVE_LESSON",
    "AI_TUTOR_SESSION",
    "AI_STUDY_PLAN",
    "DIAGNOSTIC_REPORT",
    "RECOVERY_PLAN",
    "EXAM_SIMULATION",
    "GRADE_PREDICTION",
    "AI_FEEDBACK",
  ],
  STUDENT_PREMIUM: [
    "AI_EXPLANATION",
    "AI_QUIZ_GENERATION",
    "AI_FLASHCARDS",
    "AI_FEEDBACK",
    "AI_STUDY_PLAN",
    "AI_ESSAY_PLAN",
    "AI_COURSE_GENERATOR",
    "TOPIC_SUMMARY",
    "AI_MIND_MAP",
    "FORMULA_SHEET",
    "AI_INTERACTIVE_LESSON",
    "EXAM_SIMULATION",
    "GRADE_PREDICTION",
    "AI_ASSIGNMENT_REVIEW",
    "AI_ESSAY_REVIEW",
    "AI_DISSERTATION_REVIEW",
    // Visuals
    "VISUAL_DRAWING",
    "EDUCATIONAL_IMAGE",
    "BAR_GRAPH",
    "LINE_GRAPH",
    "PIE_CHART",
    "SCATTER_PLOT",
    "HISTOGRAM",
    "PICTOGRAPH",
    "COORDINATE_GRAPH",
    "GEOMETRY_DIAGRAM",
    "FUNCTION_GRAPH",
    "GRAPH_THEORY_DIAGRAM",
  ],
  STUDENT_PREMIUM_PLUS: [
    "AI_EXPLANATION",
    "AI_QUIZ_GENERATION",
    "AI_FLASHCARDS",
    "AI_FEEDBACK",
    "AI_STUDY_PLAN",
    "AI_ESSAY_PLAN",
    "AI_COURSE_GENERATOR",
    "TOPIC_SUMMARY",
    "AI_MIND_MAP",
    "FORMULA_SHEET",
    "AI_INTERACTIVE_LESSON",
    "EXAM_SIMULATION",
    "GRADE_PREDICTION",
    "AI_ASSIGNMENT_REVIEW",
    "AI_ESSAY_REVIEW",
    "AI_DISSERTATION_REVIEW",
    // Visuals
    "VISUAL_DRAWING",
    "EDUCATIONAL_IMAGE",
    "BAR_GRAPH",
    "LINE_GRAPH",
    "PIE_CHART",
    "SCATTER_PLOT",
    "HISTOGRAM",
    "PICTOGRAPH",
    "COORDINATE_GRAPH",
    "GEOMETRY_DIAGRAM",
    "FUNCTION_GRAPH",
    "GRAPH_THEORY_DIAGRAM",
  ],
  PARENT_PRO: [],
  PARENT_PRO_PLUS: [],
  PARENT_ELITE: [],
  PRIVATE_TUTOR: [],
  SCHOOL_STARTER: [],
  SCHOOL_GROWTH: [],
  SCHOOL_ENTERPRISE: [],
  SCHOOL_TUTOR: [],
  SCHOOL_ADMIN: [],
  ADMIN: [ // Admins get all entitlements
    "AI_EXPLANATION",
    "AI_QUIZ_GENERATION",
    "AI_FLASHCARDS",
    "AI_FEEDBACK",
    "AI_STUDY_PLAN",
    "AI_ESSAY_PLAN",
    "AI_COURSE_GENERATOR",
    "TOPIC_SUMMARY",
    "AI_MIND_MAP",
    "FORMULA_SHEET",
    "AI_INTERACTIVE_LESSON",
    "EXAM_SIMULATION",
    "GRADE_PREDICTION",
    "AI_ASSIGNMENT_REVIEW",
    "AI_ESSAY_REVIEW",
    "AI_DISSERTATION_REVIEW",
    // Visuals
    "VISUAL_DRAWING",
    "EDUCATIONAL_IMAGE",
    "BAR_GRAPH",
    "LINE_GRAPH",
    "PIE_CHART",
    "SCATTER_PLOT",
    "HISTOGRAM",
    "PICTOGRAPH",
    "COORDINATE_GRAPH",
    "GEOMETRY_DIAGRAM",
    "FUNCTION_GRAPH",
    "GRAPH_THEORY_DIAGRAM",
  ],
};

export function canUsePremiumFeature(
  subscriptionType: SubscriptionType,
  featureKey: FeatureKey
): boolean {
  if (subscriptionType === 'ADMIN') return true;
  
  // If a feature is in the FREE tier, anyone can use it (assuming they have ACUs)
  const freeEntitlements = PLAN_ENTITLEMENTS['FREE'];
  if (freeEntitlements.includes(featureKey)) {
    return true;
  }
  
  // For other features, they must have a premium plan that includes it
  const planEntitlements = PLAN_ENTITLEMENTS[subscriptionType] || [];
  return planEntitlements.includes(featureKey);
}
