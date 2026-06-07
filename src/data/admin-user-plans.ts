import type { SubscriptionType } from '@/server/schemas';

/** Must match `subscriptionTypes` in `admin-actions.ts` / `UpdateUserSchema`. */
export const ADMIN_SUBSCRIPTION_TYPES: SubscriptionType[] = [
  'FREE',
  'STUDENT_ACCESS',
  'STUDENT_PREMIUM',
  'STUDENT_PREMIUM_PLUS',
  'STUDENT_MAX',
  'PARENT_VIEW',
  'PARENT_PRO',
  'PARENT_PRO_PLUS',
  'PARENT_ELITE',
  'PRIVATE_TUTOR',
  'SCHOOL_STARTER',
  'SCHOOL_GROWTH',
  'SCHOOL_ENTERPRISE',
  'SCHOOL_TUTOR',
  'SCHOOL_ADMIN',
  'ADMIN',
];

export function adminSubscriptionLabel(type: SubscriptionType): string {
  return type.replace(/_/g, ' ');
}

export function subscriptionOptionsForRole(role: string): SubscriptionType[] {
  switch (role) {
    case 'PARENT':
      return ['FREE', 'PARENT_VIEW', 'PARENT_PRO', 'PARENT_PRO_PLUS', 'PARENT_ELITE'];
    case 'STUDENT':
      return ['FREE', 'STUDENT_ACCESS', 'STUDENT_PREMIUM', 'STUDENT_PREMIUM_PLUS', 'STUDENT_MAX'];
    case 'PRIVATE_TUTOR':
      return ['FREE', 'PRIVATE_TUTOR'];
    case 'SCHOOL_ADMIN':
      return ['FREE', 'SCHOOL_STARTER', 'SCHOOL_GROWTH', 'SCHOOL_ENTERPRISE', 'SCHOOL_ADMIN'];
    case 'SCHOOL_TUTOR':
      return ['FREE', 'SCHOOL_TUTOR'];
    case 'ADMIN':
      return ['ADMIN'];
    default:
      return ADMIN_SUBSCRIPTION_TYPES;
  }
}

export function isActiveParentPlan(type: SubscriptionType): boolean {
  return (
    type === 'PARENT_VIEW' ||
    type === 'PARENT_PRO' ||
    type === 'PARENT_PRO_PLUS' ||
    type === 'PARENT_ELITE'
  );
}
