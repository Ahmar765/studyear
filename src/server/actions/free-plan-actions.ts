'use server';

import { verifyIdTokenString } from '@/server/lib/auth';
import { grantFreeQuarterlyAcusIfDue } from '@/server/lib/free-plan-acu';
import { provisionFreeAccount } from '@/server/lib/provision-free-account';

/** Claim Child Free quarterly ACUs if the 90-day window has elapsed. */
export async function claimFreeQuarterlyAcusAction(
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
    const result = await grantFreeQuarterlyAcusIfDue(user.uid);
    return { ok: true, granted: result.granted, acus: result.acus };
  } catch (error: unknown) {
    console.error('claimFreeQuarterlyAcusAction:', error);
    const message = error instanceof Error ? error.message : 'Could not claim free ACUs.';
    return { ok: false, error: message };
  }
}

/** Activate Child Free (or keep free tier) without Stripe — students get welcome ACUs if due. */
export async function activateFreePlanAction(
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
    const result = await provisionFreeAccount(user.uid);
    if (!result.ok) {
      return { ok: false, error: 'Could not activate free plan.' };
    }
    return { ok: true, acusGranted: result.acusGranted };
  } catch (error: unknown) {
    console.error('activateFreePlanAction:', error);
    const message =
      error instanceof Error ? error.message : 'Could not activate free plan.';
    return { ok: false, error: message };
  }
}
