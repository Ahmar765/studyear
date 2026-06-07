'use server';

import { verifyIdTokenString } from '@/server/lib/auth';
import { grantFreeQuarterlyAcusIfDue } from '@/server/lib/free-plan-acu';

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
