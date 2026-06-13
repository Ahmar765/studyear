/**
 * @deprecated Use `@/data/growth-partner-programme` — StudYear Growth Partner Programme.
 */
export { GROWTH_PARTNER_PROGRAMME as INFLUENCER_RULES } from '@/data/growth-partner-programme';

import {
  GROWTH_PARTNER_PROGRAMME,
  commissionGbpFromNet,
} from '@/data/growth-partner-programme';

export function influencerCommissionGbp(netEligibleGbp: number): number {
  return commissionGbpFromNet(
    netEligibleGbp,
    GROWTH_PARTNER_PROGRAMME.influencer.commissionRate,
  );
}

/** Example commission table for dashboard copy. */
export const INFLUENCER_COMMISSION_EXAMPLES = [
  { netRevenueGbp: 100, commissionGbp: influencerCommissionGbp(100) },
  { netRevenueGbp: 500, commissionGbp: influencerCommissionGbp(500) },
  { netRevenueGbp: 1000, commissionGbp: influencerCommissionGbp(1000) },
  { netRevenueGbp: 5000, commissionGbp: influencerCommissionGbp(5000) },
] as const;
