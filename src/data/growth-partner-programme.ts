/**
 * StudYear Growth Partner Programme — referral + influencer rules.
 * Pays only for verified, retained, revenue-generating users.
 */

export const GROWTH_PARTNER_PROGRAMME = {
  name: 'StudYear Growth Partner Programme',
  tagline: 'Refer learning. Earn rewards. Help students rise.',
  positioning:
    'Earn by helping families, tutors and schools access smarter learning — but StudYear only rewards real paid usage, not fake sign-ups.',

  /** Tier 1 — Standard Referrer */
  standardReferrer: {
    acusPerPaidReferral: 250,
    minimumReferralSpendGbp: 10,
    acuReleaseDays: 14,
    rewardOnFreeSignup: false,
    rewardOnTrial: false,
    rewardOnRefund: false,
  },

  /** Tier 2 — Growth Referrer (after 20 successful paid referrals) */
  growthReferrer: {
    requiredSuccessfulReferrals: 20,
    commissionRate: 0.0025,
  },

  /** Tier 3 — Approved Influencer (manual approval) */
  influencer: {
    commissionRate: 0.01,
    monthlyCapGbp: 10_000,
    customerLifetimeCapGbp: 20_000,
    commissionReviewDays: 30,
  },

  /** Tier 4 — Strategic Education Partner */
  strategicPartner: {
    maxAutoCommissionRate: 0.01,
  },

  /** School-specific commission gates */
  school: {
    minActiveDays: 30,
    requiresIdentityVerification: true,
    requiresPaidInvoice: true,
  },

  antiFraud: {
    blockSelfReferral: true,
    reviewSameDevice: true,
    reviewSameIpCluster: true,
    reviewSamePaymentCard: true,
    reviewDuplicateHousehold: true,
    clawbackOnRefund: true,
    clawbackOnChargeback: true,
    clawbackOnFraud: true,
  },
} as const;

export type GrowthPartnerTier =
  | 'STANDARD_REFERRER'
  | 'GROWTH_REFERRER'
  | 'APPROVED_INFLUENCER'
  | 'STRATEGIC_PARTNER';

export function tierDisplayName(tier: GrowthPartnerTier): string {
  switch (tier) {
    case 'STANDARD_REFERRER':
      return 'Standard Referrer';
    case 'GROWTH_REFERRER':
      return 'Growth Referrer';
    case 'APPROVED_INFLUENCER':
      return 'Approved Influencer';
    case 'STRATEGIC_PARTNER':
      return 'Strategic Education Partner';
  }
}

export function commissionRateForTier(tier: GrowthPartnerTier, customRate?: number): number {
  if (tier === 'STRATEGIC_PARTNER' && typeof customRate === 'number') {
    return customRate;
  }
  if (tier === 'APPROVED_INFLUENCER' || tier === 'STRATEGIC_PARTNER') {
    return GROWTH_PARTNER_PROGRAMME.influencer.commissionRate;
  }
  if (tier === 'GROWTH_REFERRER') {
    return GROWTH_PARTNER_PROGRAMME.growthReferrer.commissionRate;
  }
  return 0;
}

/** Net eligible revenue — never pay commission on gross. */
export function calculateNetEligibleRevenueGbp(params: {
  grossGbp: number;
  discountGbp?: number;
  refundGbp?: number;
  isTrial?: boolean;
  isInternalCredit?: boolean;
}): number {
  if (params.isTrial || params.isInternalCredit) return 0;
  const net =
    params.grossGbp - (params.discountGbp ?? 0) - (params.refundGbp ?? 0);
  return Math.max(0, Math.round(net * 100) / 100);
}

export function commissionGbpFromNet(
  netEligibleGbp: number,
  rate: number,
): number {
  return Math.round(netEligibleGbp * rate * 100) / 100;
}

/** Public marketing copy blocks */
export const GROWTH_PARTNER_PUBLIC_COPY = {
  everydayUsers: {
    headline: 'Invite friends. Help them learn smarter.',
    reward: `Get ${GROWTH_PARTNER_PROGRAMME.standardReferrer.acusPerPaidReferral} free ACUs for every paid referral.`,
    upgrade: `After ${GROWTH_PARTNER_PROGRAMME.growthReferrer.requiredSuccessfulReferrals} successful paid referrals, unlock Growth Referrer status and start earning from the customers you bring.`,
  },
  influencers: {
    headline: 'Earn lifetime commission from the customers you bring.',
    reward: `${GROWTH_PARTNER_PROGRAMME.influencer.commissionRate * 100}% lifetime commission on net eligible revenue — capped at £${GROWTH_PARTNER_PROGRAMME.influencer.monthlyCapGbp.toLocaleString()} per month, with up to £${GROWTH_PARTNER_PROGRAMME.influencer.customerLifetimeCapGbp.toLocaleString()} earning potential per customer.`,
    pitch:
      'Promote a platform that helps students, parents, tutors and schools close learning gaps with AI.',
  },
} as const;
