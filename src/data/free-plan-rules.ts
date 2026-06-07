/**
 * Child Free plan — access, trust, community goodwill (not unlimited AI).
 */
export const FREE_PLAN_RULES = {
  /** 100 ACUs granted every 3 months. */
  quarterlyAcus: 100,
  /** Days between free ACU grants. */
  grantIntervalDays: 90,
  /** Free ACUs expire — no rollover after 90 days. */
  acuExpiryDays: 90,
  /** No cash-out value for free or referral ACUs. */
  cashOutAllowed: false,
  /** One child account per verified parent/device (enforced at signup/link layer). */
  oneChildPerVerifiedParent: true,
  /** No Assignment Review on free tier. */
  assignmentReviewAllowed: false,
  /** No heavy AI course generation abuse — gated via entitlements + ACU balance. */
  heavyCourseGenerationAllowed: false,
} as const;
