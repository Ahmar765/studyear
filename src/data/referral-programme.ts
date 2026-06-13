/**
 * @deprecated Use `@/data/growth-partner-programme` — StudYear Growth Partner Programme.
 * Kept for backward-compatible imports.
 */
export {
  GROWTH_PARTNER_PROGRAMME as REFERRAL_RULES,
  calculateNetEligibleRevenueGbp,
} from '@/data/growth-partner-programme';

import { GROWTH_PARTNER_PROGRAMME } from '@/data/growth-partner-programme';

/** @deprecated Use standard referrer ACU reward from growth partner programme. */
export function referrerBonusAcusFromPaymentGbp(_amountGbp: number): number {
  return GROWTH_PARTNER_PROGRAMME.standardReferrer.acusPerPaidReferral;
}
