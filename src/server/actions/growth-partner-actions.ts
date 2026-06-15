'use server';

import { getVerifiedUser } from '@/server/lib/auth';
import { ensurePlatformAdminAccess, isPlatformAdmin } from '@/server/lib/platform-admin';
import {
  approveInfluencer,
  attributeReferral,
  ensureGrowthPartnerProfile,
  getPartnerDashboardData,
  listFlaggedAttributions,
  listPartnersForAdmin,
  suspendPartner,
} from '@/server/lib/growth-partner';
import { growthPartnerReferralUrl } from '@/lib/growth-partner-code';
import { GROWTH_PARTNER_PROGRAMME, tierDisplayName } from '@/data/growth-partner-programme';
import { toPlainJson } from '@/server/lib/serialize-firestore';

export async function getGrowthPartnerDashboardAction(idToken?: string | null) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) {
    return { error: 'Unauthorized' as const, data: null };
  }

  const profile = await ensureGrowthPartnerProfile(user.uid);
  const dashboard = await getPartnerDashboardData(user.uid);

  return {
    error: null,
    data: toPlainJson({
      ...dashboard,
      profile: {
        userId: profile.userId,
        referralCode: profile.referralCode,
        tier: profile.tier,
        successfulPaidReferrals: profile.successfulPaidReferrals ?? 0,
        status: profile.status,
      },
      referralUrl: growthPartnerReferralUrl(profile.referralCode),
      tierLabel: tierDisplayName(profile.tier),
      programme: GROWTH_PARTNER_PROGRAMME,
    }),
  };
}

export async function ensureGrowthPartnerProfileAction(idToken?: string | null) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) return { ok: false as const };
  await ensureGrowthPartnerProfile(user.uid);
  return { ok: true as const };
}

export async function applyReferralCodeAction(
  referralCode: string,
  idToken?: string | null,
) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) {
    return { ok: false, error: 'Unauthorized' };
  }

  const result = await attributeReferral({
    referredUserId: user.uid,
    referralCode,
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_code: 'That referral code is not valid.',
      already_attributed: 'Your account already has a referral attribution.',
      code_not_found: 'Referral code not found.',
      self_referral: 'You cannot refer yourself.',
      referrer_inactive: 'This referral programme link is no longer active.',
    };
    return {
      ok: false,
      error: messages[result.reason ?? ''] ?? 'Could not apply referral code.',
    };
  }

  return { ok: true, error: null };
}

export async function getAdminGrowthPartnersAction(idToken?: string | null) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) {
    return { error: 'Unauthorized', partners: [], flagged: [] };
  }
  await ensurePlatformAdminAccess(user.uid, user.email ?? null);
  if (!(await isPlatformAdmin(user.uid))) {
    return { error: 'Forbidden', partners: [], flagged: [] };
  }

  const [partners, flagged] = await Promise.all([
    listPartnersForAdmin(),
    listFlaggedAttributions(),
  ]);

  return { error: null, partners, flagged };
}

export async function approveInfluencerAction(
  partnerUserId: string,
  idToken?: string | null,
) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) return { ok: false, error: 'Unauthorized' };
  await ensurePlatformAdminAccess(user.uid, user.email ?? null);
  if (!(await isPlatformAdmin(user.uid))) {
    return { ok: false, error: 'Forbidden' };
  }

  await approveInfluencer(partnerUserId, user.uid);
  return { ok: true, error: null };
}

export async function suspendPartnerAction(
  partnerUserId: string,
  reason: string,
  idToken?: string | null,
) {
  const user = await getVerifiedUser(idToken);
  if (!user?.uid) return { ok: false, error: 'Unauthorized' };
  await ensurePlatformAdminAccess(user.uid, user.email ?? null);
  if (!(await isPlatformAdmin(user.uid))) {
    return { ok: false, error: 'Forbidden' };
  }

  await suspendPartner(partnerUserId, reason.trim() || 'Admin suspension');
  return { ok: true, error: null };
}
