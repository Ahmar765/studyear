
export const ACU_PACKAGES = {
  /** £5 */
  ENTRY: {
    code: "ENTRY",
    pricePence: 500,
    baseACUs: 500,
    bonusACUs: 0,
    totalACUs: 500,
    label: "Entry"
  },
  /** £10 */
  GROWTH: {
    code: "GROWTH",
    pricePence: 1000,
    baseACUs: 1000,
    bonusACUs: 0,
    totalACUs: 1000,
    label: "Growth"
  },
  /** £15 — total ACUs align with Premium Plus monthly allowance */
  SCALE: {
    code: "SCALE",
    pricePence: 1500,
    baseACUs: 1500,
    bonusACUs: 150,
    totalACUs: 1650,
    label: "Scale"
  }
} as const;

/** Credited on each paid Premium Plus subscription invoice (Stripe webhook). */
export const STUDENT_PREMIUM_PLUS_MONTHLY_ACUS = ACU_PACKAGES.SCALE.totalACUs;
