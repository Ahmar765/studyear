import type { SubscriptionType } from '@/server/schemas';

/**
 * Marketing copy for checkout. `productCode` must match `SubscriptionType` — Stripe webhook
 * and `checkout.session.completed` pass this through session metadata as `productCode`.
 */
export type CheckoutPlanDefinition = {
  productCode: SubscriptionType;
  name: string;
  price: string;
  priceSuffix: string;
  features: string[];
  popular?: boolean;
  tagline?: string;
};

/** Monthly ACU allowances credited on each paid subscription invoice (idempotent per invoice). */
export const SUBSCRIPTION_MONTHLY_ACUS: Partial<Record<SubscriptionType, number>> = {
  STUDENT_ACCESS: 500,
  STUDENT_PREMIUM: 700,
  STUDENT_PREMIUM_PLUS: 1_650,
  STUDENT_MAX: 2_750,
  PARENT_VIEW: 300,
  PARENT_PRO: 700,
  PARENT_PRO_PLUS: 1_650,
  PARENT_ELITE: 3_900,
  SCHOOL_STARTER: 10_000,
  SCHOOL_GROWTH: 22_000,
  SCHOOL_ENTERPRISE: 48_000,
};

export const PARENT_PRO_PLUS_MONTHLY_ACUS = SUBSCRIPTION_MONTHLY_ACUS.PARENT_PRO_PLUS!;
export const PARENT_ELITE_MONTHLY_ACUS = SUBSCRIPTION_MONTHLY_ACUS.PARENT_ELITE!;

export const SCHOOL_STARTER_MONTHLY_ACUS = SUBSCRIPTION_MONTHLY_ACUS.SCHOOL_STARTER!;
export const SCHOOL_GROWTH_MONTHLY_ACUS = SUBSCRIPTION_MONTHLY_ACUS.SCHOOL_GROWTH!;
export const SCHOOL_ENTERPRISE_MONTHLY_ACUS = SUBSCRIPTION_MONTHLY_ACUS.SCHOOL_ENTERPRISE!;

export const CHILD_FREE_PLAN = {
  name: 'Child Free',
  price: '0',
  priceSuffix: '',
  tagline: 'Start learning — no card required.',
  features: [
    '100 ACUs every 3 months',
    'AI homework help & explanations',
    'Upgrade anytime for more tools and monthly ACUs',
  ],
} as const;

export const STUDENT_SUBSCRIPTION_PLANS: CheckoutPlanDefinition[] = [
  {
    productCode: 'STUDENT_ACCESS',
    name: 'Student Access',
    price: '5.00',
    priceSuffix: '/ month',
    tagline: 'A full week of AI-supported study.',
    features: [
      '500 ACUs added on each successful monthly payment',
      'Full learning access — tutor, planner, diagnostics, predictions, interactive lessons',
      'Premium creator toolkit and Assignment Review not included',
    ],
  },
  {
    productCode: 'STUDENT_PREMIUM',
    name: 'Student Premium',
    price: '10.00',
    priceSuffix: '/ month',
    popular: true,
    tagline: 'Unlock every premium learning tool.',
    features: [
      '700 ACUs added on each successful monthly payment',
      'Unlocks the full premium toolkit — courses, flashcards, summaries, visuals, and more',
      'Metered AI still spends ACUs — no unlimited usage',
      'Assignment Review available (60 ACUs per use)',
    ],
  },
  {
    productCode: 'STUDENT_PREMIUM_PLUS',
    name: 'Student Premium+',
    price: '20.00',
    priceSuffix: '/ month',
    tagline: 'Built for serious exam terms.',
    features: [
      'Everything in Student Premium',
      '1,650 ACUs added on each successful monthly payment',
      'Built for GCSE, A-Level, 11+, and intensive exam periods',
    ],
  },
  {
    productCode: 'STUDENT_MAX',
    name: 'Student Max',
    price: '30.00',
    priceSuffix: '/ month',
    tagline: 'For students who use StudYear daily.',
    features: [
      'Everything in Student Premium+',
      '2,750 ACUs added on each successful monthly payment',
      'Heavy daily usage — GCSE, A-Level, 11+, SATs, university prep',
    ],
  },
];

export const PARENT_SUBSCRIPTION_PLANS: CheckoutPlanDefinition[] = [
  {
    productCode: 'PARENT_VIEW',
    name: 'Parent View',
    price: '5.00',
    priceSuffix: '/ month',
    tagline: 'See how your child is progressing.',
    features: [
      '300 ACUs added on each successful monthly payment',
      'Child progress visibility and linked-student snapshots',
      'Upgrade for Academic Command Centre features',
    ],
  },
  {
    productCode: 'PARENT_PRO',
    name: 'Parent Pro',
    price: '10.00',
    priceSuffix: '/ month',
    tagline: 'Academic Command Centre.',
    features: [
      '700 ACUs added on each successful monthly payment',
      'Academic Command Centre — live snapshots & stability scoring',
      'Verified Study Hours™ & weekly AI briefing',
    ],
  },
  {
    productCode: 'PARENT_PRO_PLUS',
    name: 'Parent Pro+',
    price: '20.00',
    priceSuffix: '/ month',
    popular: true,
    tagline: 'Intervention mode + weekly AI briefing.',
    features: [
      'Everything in Parent Pro',
      '1,650 ACUs added on each successful monthly payment',
      'AI intervention mode & Parent Advisor',
      'Emotional intelligence & predictive grade engine',
    ],
  },
  {
    productCode: 'PARENT_ELITE',
    name: 'Parent Elite',
    price: '39.00',
    priceSuffix: '/ month',
    tagline: 'Full family intelligence dashboard.',
    features: [
      'Full AI academic optimisation suite',
      '3,900 ACUs added on each successful monthly payment',
      'Family intelligence dashboard & live alerts',
      'University readiness, burnout prevention & priority AI',
    ],
  },
];

export const SCHOOL_SUBSCRIPTION_PLANS: CheckoutPlanDefinition[] = [
  {
    productCode: 'SCHOOL_STARTER',
    name: 'Small School',
    price: '99.00',
    priceSuffix: '/ month',
    features: [
      'Up to 150 students',
      `${SCHOOL_STARTER_MONTHLY_ACUS.toLocaleString('en-GB')} shared ACUs per month`,
      'Command Centre, risk intelligence & intervention pipeline',
      'Staff deployment hub (up to 15 teachers)',
      'Parent visibility layer',
    ],
  },
  {
    productCode: 'SCHOOL_GROWTH',
    name: 'Medium School',
    price: '199.00',
    priceSuffix: '/ month',
    popular: true,
    features: [
      'Up to 600 students',
      `${SCHOOL_GROWTH_MONTHLY_ACUS.toLocaleString('en-GB')} shared ACUs per month`,
      'Everything in Small School',
      'Unlimited staff deployment',
      'Executive reporting suite & department analytics',
      'MIS sync (CSV import)',
    ],
  },
  {
    productCode: 'SCHOOL_ENTERPRISE',
    name: 'Large School',
    price: '399.00',
    priceSuffix: '/ month',
    features: [
      'Unlimited students & staff',
      `${SCHOOL_ENTERPRISE_MONTHLY_ACUS.toLocaleString('en-GB')} shared ACUs per month`,
      'Everything in Medium School',
      'Dedicated onboarding & SLA support',
      'Custom AI policy & safeguarding controls',
      'Multi-site / academy trust management',
    ],
  },
];

export function subscriptionTypeDisplayName(
  type: string | undefined | null,
): string {
  switch (type) {
    case 'STUDENT_ACCESS':
      return 'Student Access';
    case 'STUDENT_PREMIUM':
      return 'Student Premium';
    case 'STUDENT_PREMIUM_PLUS':
      return 'Student Premium+';
    case 'STUDENT_MAX':
      return 'Student Max';
    case 'PARENT_VIEW':
      return 'Parent View';
    case 'PARENT_PRO':
      return 'Parent Pro';
    case 'PARENT_PRO_PLUS':
      return 'Parent Pro+';
    case 'PARENT_ELITE':
      return 'Parent Elite';
    case 'PRIVATE_TUTOR':
      return 'Private Tutor';
    case 'SCHOOL_STARTER':
      return 'Small School';
    case 'SCHOOL_GROWTH':
      return 'Medium School';
    case 'SCHOOL_ENTERPRISE':
      return 'Large School';
    case 'SCHOOL_TUTOR':
    case 'SCHOOL_ADMIN':
      return 'School staff';
    case 'ADMIN':
      return 'Admin';
    case 'FREE':
    default:
      return 'Child Free';
  }
}
