/**
 * Influencer programme — 20% commission on first payment only (not ACU top-ups).
 * Payout after refund window closes; admin approval required.
 */
export const INFLUENCER_RULES = {
  commissionPercentFirstPaymentOnly: 0.2,
  /** Do not pay commission on ACU top-ups. */
  commissionOnAcuTopUps: false,
  tutorOnboardingFeeGbp: 10,
} as const;

export function influencerCommissionGbp(firstPaymentGbp: number): number {
  return Math.round(firstPaymentGbp * INFLUENCER_RULES.commissionPercentFirstPaymentOnly * 100) / 100;
}

/** Example commission table for admin / influencer dashboard copy. */
export const INFLUENCER_COMMISSION_EXAMPLES = [
  { firstPaymentGbp: 5, commissionGbp: 1 },
  { firstPaymentGbp: 10, commissionGbp: 2 },
  { firstPaymentGbp: 20, commissionGbp: 4 },
  { firstPaymentGbp: 39, commissionGbp: 7.8 },
] as const;
