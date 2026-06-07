import { ACU_PACKAGES } from '@/data/acu-packages';

/** Core rule: £1 revenue = 100 ACUs. */
export const ACUS_PER_GBP = 100;

/** Internal profitability rule: max real variable cost per 100 ACUs ≤ £0.50. */
export const MAX_VARIABLE_COST_PER_100_ACUS_GBP = 0.5;

/** Stripe UK card cost model: ~1.5% + 20p per payment. */
export const STRIPE_UK_PERCENT = 0.015;
export const STRIPE_UK_FIXED_PENCE = 20;

export function estimateStripeCostGbp(amountPence: number): number {
  return (amountPence / 100) * STRIPE_UK_PERCENT + STRIPE_UK_FIXED_PENCE / 100;
}

/** Rule-of-thumb customer £ value per ACU using the Core Boost pack (£5 / 500 ACU). */
export const GBP_PER_ACU_ENTRY_RATE =
  ACU_PACKAGES.CORE_BOOST.pricePence / 100 / ACU_PACKAGES.CORE_BOOST.totalACUs;

/**
 * Margin protection: if estimated costs exceed 50% of plan revenue, reduce ACUs,
 * throttle expensive tools, or require top-up (enforced operationally via fixed ACU debits).
 */
export function exceedsMarginFloor(params: {
  revenueGbp: number;
  estimatedProviderCostGbp: number;
  stripeCostGbp?: number;
  hostingAllocationGbp?: number;
}): boolean {
  const stripe =
    params.stripeCostGbp ??
    estimateStripeCostGbp(Math.round(params.revenueGbp * 100));
  const hosting = params.hostingAllocationGbp ?? 0;
  const totalCost =
    params.estimatedProviderCostGbp + stripe + hosting;
  return totalCost > params.revenueGbp * 0.5;
}

/** Bonus / referral / free ACU expiry windows (days). */
export const ACU_EXPIRY_DAYS = {
  FREE_QUARTERLY: 90,
  BONUS: 60,
  REFERRAL: 90,
} as const;
