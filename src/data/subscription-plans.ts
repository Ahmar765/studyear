import type { SubscriptionType } from '@/server/schemas';

/**
 * Marketing copy for checkout. `productCode` must match `SubscriptionType` — Stripe webhook
 * and `checkout.session.completed` pass this through session metadata as `productCode`.
 *
 * Configure your Stripe Prices with metadata key `productCode` set to the same string (e.g. STUDENT_PREMIUM).
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
    price: '7.99',
    priceSuffix: '/ month',
    popular: true,
    features: [
      'Full AI study toolkit — planner, quizzes, interactive lessons',
      'Essay, assignment & dissertation reviews',
      'Exam simulations, grade predictions & mind maps',
      'Charts, diagrams & visual learning tools',
    ],
  },
  {
    productCode: 'STUDENT_PREMIUM_PLUS',
    name: 'Premium Plus',
    price: '14.99',
    priceSuffix: '/ month',
    popular: false,
    features: [
      'Everything in Premium',
      'Higher allowances for daily AI use',
      'Best for intensive revision seasons',
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
