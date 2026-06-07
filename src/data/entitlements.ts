import type { SubscriptionType } from "@/server/schemas";
import { FeatureKey, isAcuOnlyFeature } from "./acu-costs";

/** Shared premium toolkit — requires Student Premium or above. */
const STUDENT_PREMIUM_TOOLKIT: FeatureKey[] = [
  "AI_QUIZ_GENERATION",
  "AI_FLASHCARDS",
  "AI_ESSAY_PLAN",
  "AI_COURSE_GENERATOR",
  "TOPIC_SUMMARY",
  "AI_MIND_MAP",
  "FORMULA_SHEET",
  "AI_ASSIGNMENT_REVIEW",
  "AI_ESSAY_REVIEW",
  "AI_DISSERTATION_REVIEW",
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
];

/** Full learning access without premium toolkit (Student Access tier). */
const STUDENT_LEARNING_ACCESS: FeatureKey[] = [
  "AI_EXPLANATION",
  "AI_HOMEWORK_HELP",
  "AI_TUTOR_SESSION",
  "AI_TUTOR_SESSION_DEEP",
  "AI_INTERACTIVE_LESSON",
  "AI_STUDY_PLAN",
  "DIAGNOSTIC_REPORT",
  "DIAGNOSTIC_RESULTS",
  "RECOVERY_PLAN",
  "EXAM_SIMULATION",
  "GRADE_PREDICTION",
  "AI_FEEDBACK",
];

export const PLAN_ENTITLEMENTS: Record<SubscriptionType, FeatureKey[]> = {
  /**
   * Child Free: basic access only — 100 ACUs every 3 months (see free-plan-acu.ts).
   * No Assignment Review, no premium toolkit, no heavy course generation.
   */
  FREE: [
    "AI_EXPLANATION",
    "AI_HOMEWORK_HELP",
  ],
  /** £5/mo — full learning access except premium tools + Assignment Review. */
  STUDENT_ACCESS: [...STUDENT_LEARNING_ACCESS],
  STUDENT_PREMIUM: [
    ...STUDENT_LEARNING_ACCESS,
    ...STUDENT_PREMIUM_TOOLKIT,
  ],
  STUDENT_PREMIUM_PLUS: [
    ...STUDENT_LEARNING_ACCESS,
    ...STUDENT_PREMIUM_TOOLKIT,
  ],
  STUDENT_MAX: [
    ...STUDENT_LEARNING_ACCESS,
    ...STUDENT_PREMIUM_TOOLKIT,
  ],
  PARENT_VIEW: [],
  PARENT_PRO: ['AI_EXPLANATION'],
  PARENT_PRO_PLUS: ['AI_EXPLANATION'],
  PARENT_ELITE: ['AI_EXPLANATION'],
  PRIVATE_TUTOR: [
    ...STUDENT_LEARNING_ACCESS,
    ...STUDENT_PREMIUM_TOOLKIT,
  ],
  SCHOOL_STARTER: [],
  SCHOOL_GROWTH: [],
  SCHOOL_ENTERPRISE: [],
  SCHOOL_TUTOR: [
    ...STUDENT_LEARNING_ACCESS,
    ...STUDENT_PREMIUM_TOOLKIT,
  ],
  SCHOOL_ADMIN: [
    "AI_EXPLANATION",
    "AI_QUIZ_GENERATION",
    "AI_FLASHCARDS",
    "AI_FEEDBACK",
    "AI_STUDY_PLAN",
    "AI_COURSE_GENERATOR",
    "TOPIC_SUMMARY",
    "AI_INTERACTIVE_LESSON",
    "GRADE_PREDICTION",
    "AI_ASSIGNMENT_REVIEW",
    "AI_ESSAY_REVIEW",
    "AI_DISSERTATION_REVIEW",
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
  ADMIN: [
    "AI_EXPLANATION",
    "AI_HOMEWORK_HELP",
    "AI_TUTOR_SESSION",
    "AI_TUTOR_SESSION_DEEP",
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
    "DIAGNOSTIC_REPORT",
    "DIAGNOSTIC_RESULTS",
    "GRADE_PREDICTION",
    "AI_ASSIGNMENT_REVIEW",
    "AI_ESSAY_REVIEW",
    "AI_DISSERTATION_REVIEW",
    "RECOVERY_PLAN",
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

/** Subscription plan gate — ACU-only features always pass (billing is ACU-only). */
export function requiresSubscriptionForFeature(featureKey: FeatureKey): boolean {
  return !isAcuOnlyFeature(featureKey);
}

export function canUsePremiumFeature(
  subscriptionType: SubscriptionType,
  featureKey: FeatureKey
): boolean {
  if (isAcuOnlyFeature(featureKey)) return true;
  if (subscriptionType === 'ADMIN') return true;

  const planEntitlements = PLAN_ENTITLEMENTS[subscriptionType] || [];
  return planEntitlements.includes(featureKey);
}
