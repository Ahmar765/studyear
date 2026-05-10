import type { SubscriptionType } from '@/server/schemas';
import { STUDENT_PREMIUM_PLUS_MONTHLY_ACUS } from '@/data/acu-packages';

/**
 * Marketing copy for checkout. `productCode` must match `SubscriptionType` — Stripe webhook
 * and `checkout.session.completed` pass this through session metadata as `productCode`.
 *
 * Configure recurring Stripe Prices to match displayed GBP (£10 Premium, £15 Premium Plus as shown)
 * with metadata key `productCode` set to the same string (e.g. STUDENT_PREMIUM).
 */
export type CheckoutPlanDefinition = {
  productCode: SubscriptionType;
  name: string;
  price: string;
  priceSuffix: string;
  features: string[];
  popular?: boolean;
};

export const STUDENT_SUBSCRIPTION_PLANS: CheckoutPlanDefinition[] = [
  {
    productCode: 'STUDENT_PREMIUM',
    name: 'Premium',
    price: '10.00',
    priceSuffix: '/ month',
    popular: true,
    features: [
      '£10/month — unlocks the full premium toolkit (courses, essay plans, flashcards, summaries, visuals, AI assignment review, and more)',
      'Metered AI features (planner, tutor, diagnostics, predictions, interactive lessons, etc.) still spend ACUs — buy £5 / £10 / £15 packs above',
      'Best if you already top up ACUs and want every premium creator included in your plan',
    ],
  },
  {
    productCode: 'STUDENT_PREMIUM_PLUS',
    name: 'Premium Plus',
    price: '15.00',
    priceSuffix: '/ month',
    popular: false,
    features: [
      'Everything in Premium',
      `Includes ${STUDENT_PREMIUM_PLUS_MONTHLY_ACUS.toLocaleString('en-GB')} ACUs added automatically on each successful monthly payment`,
      'Built for intensive terms — bundled allowance matches the £15 one-off Scale pack size',
    ],
  },
];

export const PARENT_SUBSCRIPTION_PLANS: CheckoutPlanDefinition[] = [
  {
    productCode: 'PARENT_PRO',
    name: 'Parent Pro',
    price: '9.99',
    priceSuffix: '/ month',
    popular: true,
    features: [
      'Parent dashboard access',
      'Linked student progress overview',
      'Weekly summary emails',
    ],
  },
  {
    productCode: 'PARENT_PRO_PLUS',
    name: 'Parent Pro Plus',
    price: '19.99',
    priceSuffix: '/ month',
    popular: false,
    features: [
      'Everything in Parent Pro',
      'Real-time alerts & engagement insights',
      'Higher monitoring limits',
    ],
  },
];

export function subscriptionTypeDisplayName(
  type: string | undefined | null,
): string {
  switch (type) {
    case 'STUDENT_PREMIUM':
      return 'Premium';
    case 'STUDENT_PREMIUM_PLUS':
      return 'Premium Plus';
    case 'PARENT_PRO':
      return 'Parent Pro';
    case 'PARENT_PRO_PLUS':
      return 'Parent Pro Plus';
    case 'PRIVATE_TUTOR':
      return 'Private Tutor';
    case 'SCHOOL_STARTER':
    case 'SCHOOL_GROWTH':
    case 'SCHOOL_ENTERPRISE':
      return 'School plan';
    case 'SCHOOL_TUTOR':
    case 'SCHOOL_ADMIN':
      return 'School staff';
    case 'ADMIN':
      return 'Admin';
    case 'FREE':
    default:
      return 'Free';
  }
}
