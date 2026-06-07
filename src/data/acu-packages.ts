/**
 * ACU top-up packs — £1 = 100 ACUs. Avoid excessive bonuses below £10 (Stripe fixed fees).
 * Legacy codes ENTRY / GROWTH / SCALE map to current packs for existing Stripe metadata.
 */
export const ACU_PACKAGES = {
  /** £3 — Mini Boost */
  MINI_BOOST: {
    code: 'MINI_BOOST',
    pricePence: 300,
    baseACUs: 250,
    bonusACUs: 0,
    totalACUs: 250,
    label: 'Mini Boost',
  },
  /** £5 — Core Boost */
  CORE_BOOST: {
    code: 'CORE_BOOST',
    pricePence: 500,
    baseACUs: 500,
    bonusACUs: 0,
    totalACUs: 500,
    label: 'Core Boost',
  },
  /** £10 — Growth Boost */
  GROWTH_BOOST: {
    code: 'GROWTH_BOOST',
    pricePence: 1000,
    baseACUs: 1100,
    bonusACUs: 0,
    totalACUs: 1100,
    label: 'Growth Boost',
  },
  /** £20 — Exam Boost */
  EXAM_BOOST: {
    code: 'EXAM_BOOST',
    pricePence: 2000,
    baseACUs: 2400,
    bonusACUs: 0,
    totalACUs: 2400,
    label: 'Exam Boost',
  },
  /** £30 — Power Boost */
  POWER_BOOST: {
    code: 'POWER_BOOST',
    pricePence: 3000,
    baseACUs: 3750,
    bonusACUs: 0,
    totalACUs: 3750,
    label: 'Power Boost',
  },
} as const;

export type AcuPackageCode = keyof typeof ACU_PACKAGES;

/** Backward-compatible aliases from pre-reset Stripe checkouts. */
export const LEGACY_ACU_PACK_ALIASES: Record<string, AcuPackageCode> = {
  ENTRY: 'CORE_BOOST',
  GROWTH: 'GROWTH_BOOST',
  SCALE: 'EXAM_BOOST',
};

export function resolveAcuPackageCode(
  productCode: string,
): AcuPackageCode | undefined {
  const normalized = productCode.trim().toUpperCase();
  if (normalized in ACU_PACKAGES) {
    return normalized as AcuPackageCode;
  }
  return LEGACY_ACU_PACK_ALIASES[normalized];
}

export function isAcuTopUpProductCode(productCode: string): boolean {
  return resolveAcuPackageCode(productCode) !== undefined;
}

/** School institution top-up bundles (shared pool). */
export const SCHOOL_ACU_PACKAGES = {
  SCHOOL_STARTER: {
    code: 'SCHOOL_STARTER_TOPUP',
    pricePence: 10_000,
    totalACUs: 11_000,
    label: 'School Starter',
  },
  SCHOOL_GROWTH: {
    code: 'SCHOOL_GROWTH_TOPUP',
    pricePence: 25_000,
    totalACUs: 30_000,
    label: 'School Growth',
  },
  SCHOOL_SCALE: {
    code: 'SCHOOL_SCALE_TOPUP',
    pricePence: 50_000,
    totalACUs: 65_000,
    label: 'School Scale',
  },
} as const;

export const STUDENT_PREMIUM_PLUS_MONTHLY_ACUS = 1_650;
