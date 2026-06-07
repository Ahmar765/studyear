/**
 * User referral programme — reward after first successful payment clears.
 * Referral ACUs expire after 90 days; no cash-out value.
 */
export const REFERRAL_RULES = {
  /** 5% of first payment value as ACUs (£1 = 100 ACUs). */
  referrerPercentOfFirstPayment: 0.05,
  /** New paying user welcome bonus after first payment. */
  newUserWelcomeAcus: 100,
  /** Max referral bonus ACUs per referrer per calendar month. */
  maxReferrerBonusAcusPerMonth: 1_000,
  /** Referral ACU expiry (days). */
  referralAcuExpiryDays: 90,
  /** No reward on Free plan signups. */
  rewardOnFreePlan: false,
  /** No reward on refunds. */
  rewardOnRefund: false,
} as const;

/** Convert first payment GBP to referrer bonus ACUs (5%). */
export function referrerBonusAcusFromPaymentGbp(amountGbp: number): number {
  return Math.floor(amountGbp * REFERRAL_RULES.referrerPercentOfFirstPayment * 100);
}
