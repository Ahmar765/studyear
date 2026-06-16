'use server';

import { verifyIdTokenString } from '@/server/lib/auth';
import { grantFreeMonthlyAcusIfDue } from '@/server/lib/free-plan-acu';
import { provisionChildFreeStudentAccount } from '@/server/lib/provision-free-account';

/** Claim Child Free monthly ACUs if the 30-day window has elapsed (FREE students only). */
export async function claimFreeMonthlyAcusAction(
  idToken: string | null | undefined,
): Promise<
  | { ok: true; granted: boolean; acus?: number }
  | { ok: false; error: string }
> {
  const user = await verifyIdTokenString(idToken);
  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  try {
    const result = await grantFreeMonthlyAcusIfDue(user.uid);
    return { ok: true, granted: result.granted, acus: result.acus };
  } catch (error: unknown) {
    console.error('claimFreeMonthlyAcusAction:', error);
    const message =
      error instanceof Error ? error.message : 'Could not claim free ACUs.';
    return { ok: false, error: message };
  }
}

/** @deprecated Use claimFreeMonthlyAcusAction */
export async function claimFreeQuarterlyAcusAction(
  idToken: string | null | undefined,
) {
  return claimFreeMonthlyAcusAction(idToken);
}

/** Activate Child Free — standalone student tier, no Stripe. Rejects paid accounts. */
export async function activateChildFreePlanAction(
  idToken: string | null | undefined,
): Promise<
  | { ok: true; acusGranted?: number }
  | { ok: false; error: string }
> {
  const user = await verifyIdTokenString(idToken);
  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  try {
    const result = await provisionChildFreeStudentAccount(user.uid);
    if (!result.ok) {
      const messages: Record<string, string> = {
        child_free_students_only:
          'Child Free is only for student accounts. Paid parent, tutor, and school plans use checkout.',
        already_on_paid_plan:
          'You already have a paid subscription. Child Free ACUs are not added to paid accounts.',
        user_not_found: 'Account not found.',
      };
      return {
        ok: false,
        error: messages[result.reason] ?? 'Could not activate Child Free.',
      };
    }
    return { ok: true, acusGranted: result.acusGranted };
  } catch (error: unknown) {
    console.error('activateChildFreePlanAction:', error);
    const message =
      error instanceof Error ? error.message : 'Could not activate Child Free.';
    return { ok: false, error: message };
  }
}
