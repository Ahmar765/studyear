/**
 * Child Free plan — standalone student tier (not combined with paid subscriptions).
 * Paid accounts never receive these monthly ACUs (enforced in free-plan-acu.ts).
 */
export const FREE_PLAN_RULES = {
  /** 100 ACUs granted every calendar month (30-day window). */
  monthlyAcus: 100,
  /** Days between free ACU grants. */
  grantIntervalDays: 30,
  /** Free ACUs expire — no rollover into the next month. */
  acuExpiryDays: 30,
  /** No cash-out value for free or referral ACUs. */
  cashOutAllowed: false,
  /** Students only — not parents, tutors, or schools. */
  studentRoleOnly: true,
  /** No Assignment Review on free tier. */
  assignmentReviewAllowed: false,
  /** No heavy AI course generation abuse — gated via entitlements + ACU balance. */
  heavyCourseGenerationAllowed: false,
} as const;
