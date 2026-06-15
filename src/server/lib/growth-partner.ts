import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import {
  deriveGrowthPartnerCode,
  normalizeGrowthPartnerCode,
} from '@/lib/growth-partner-code';
import {
  GROWTH_PARTNER_PROGRAMME,
  calculateNetEligibleRevenueGbp,
  commissionGbpFromNet,
  commissionRateForTier,
  type GrowthPartnerTier,
} from '@/data/growth-partner-programme';
import { ACUService } from '@/server/services/acu-service';

const PROFILES = 'growth_partner_profiles';
const CODE_INDEX = 'growth_partner_code_index';
const ATTRIBUTIONS = 'referral_attributions';
const PAYMENT_EVENTS = 'growth_partner_payment_events';
const ACU_REWARDS = 'growth_partner_acu_rewards';
const COMMISSIONS = 'growth_partner_commissions';

async function indexReferralCode(userId: string, referralCode: string) {
  await adminDb.collection(CODE_INDEX).doc(referralCode).set({
    userId,
    referralCode,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await adminDb.doc(`users/${userId}`).set(
    { growthPartnerCode: referralCode },
    { merge: true },
  );
}

function monthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export interface GrowthPartnerProfile {
  userId: string;
  referralCode: string;
  tier: GrowthPartnerTier;
  successfulPaidReferrals: number;
  influencerApprovedAt?: admin.firestore.Timestamp;
  influencerApprovedBy?: string;
  monthlyCommissionGbp: number;
  monthlyCommissionMonth: string;
  customerCommissionTotals: Record<string, number>;
  customCommissionRate?: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export async function ensureGrowthPartnerProfile(
  userId: string,
): Promise<GrowthPartnerProfile> {
  const ref = adminDb.collection(PROFILES).doc(userId);
  const snap = await ref.get();
  if (snap.exists) {
    const profile = snap.data() as GrowthPartnerProfile;
    void indexReferralCode(userId, profile.referralCode).catch((err) =>
      console.error('[growth-partner] code index sync failed', err),
    );
    return profile;
  }
  const now = admin.firestore.Timestamp.now();
  const code = deriveGrowthPartnerCode(userId);
  const profile: GrowthPartnerProfile = {
    userId,
    referralCode: code,
    tier: 'STANDARD_REFERRER',
    successfulPaidReferrals: 0,
    monthlyCommissionGbp: 0,
    monthlyCommissionMonth: monthKey(),
    customerCommissionTotals: {},
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(profile);
  await indexReferralCode(userId, code);
  return profile;
}

export async function findReferrerByCode(
  code: string,
): Promise<GrowthPartnerProfile | null> {
  const normalized = normalizeGrowthPartnerCode(code);
  if (!normalized) return null;

  const indexed = await adminDb.collection(CODE_INDEX).doc(normalized).get();
  if (indexed.exists) {
    const userId = indexed.data()?.userId as string | undefined;
    if (userId) {
      return ensureGrowthPartnerProfile(userId);
    }
  }

  const userSnap = await adminDb
    .collection('users')
    .where('growthPartnerCode', '==', normalized)
    .limit(1)
    .get();
  if (!userSnap.empty) {
    return ensureGrowthPartnerProfile(userSnap.docs[0].id);
  }

  const snap = await adminDb
    .collection(PROFILES)
    .where('referralCode', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const profile = snap.docs[0].data() as GrowthPartnerProfile;
  await indexReferralCode(profile.userId, profile.referralCode);
  return profile;
}

export async function attributeReferral(params: {
  referredUserId: string;
  referralCode: string;
  meta?: { ip?: string; deviceId?: string };
}): Promise<{ ok: boolean; reason?: string }> {
  const normalized = normalizeGrowthPartnerCode(params.referralCode);
  if (!normalized) {
    return { ok: false, reason: 'invalid_code' };
  }

  const existing = await adminDb
    .collection(ATTRIBUTIONS)
    .doc(params.referredUserId)
    .get();
  if (existing.exists) {
    return { ok: false, reason: 'already_attributed' };
  }

  const referrer = await findReferrerByCode(normalized);
  if (!referrer) {
    return { ok: false, reason: 'code_not_found' };
  }

  if (
    GROWTH_PARTNER_PROGRAMME.antiFraud.blockSelfReferral &&
    referrer.userId === params.referredUserId
  ) {
    return { ok: false, reason: 'self_referral' };
  }

  if (referrer.status !== 'ACTIVE') {
    return { ok: false, reason: 'referrer_inactive' };
  }

  const fraudFlags: string[] = [];
  if (params.meta?.deviceId) fraudFlags.push('device_recorded');
  if (params.meta?.ip) fraudFlags.push('ip_recorded');

  await adminDb.collection(ATTRIBUTIONS).doc(params.referredUserId).set({
    referredUserId: params.referredUserId,
    referrerUserId: referrer.userId,
    referralCode: normalized,
    attributedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: fraudFlags.length ? 'ACTIVE' : 'ACTIVE',
    fraudFlags,
    qualifyingSpendGbp: 0,
    referralRewardGranted: false,
    meta: params.meta ?? {},
  });

  return { ok: true };
}

export async function recordGrowthPartnerPayment(params: {
  payerUserId: string;
  amountPaidPence: number;
  stripeEventId: string;
  source: 'checkout' | 'invoice';
  isTrial?: boolean;
  discountPence?: number;
}): Promise<void> {
  if (params.amountPaidPence <= 0 || params.isTrial) return;

  const attributionSnap = await adminDb
    .collection(ATTRIBUTIONS)
    .doc(params.payerUserId)
    .get();
  if (!attributionSnap.exists) return;

  const attribution = attributionSnap.data()!;
  if (attribution.status === 'REVOKED') return;

  const referrerUserId = attribution.referrerUserId as string;
  if (referrerUserId === params.payerUserId) return;

  const duplicate = await adminDb
    .collection(PAYMENT_EVENTS)
    .where('stripeEventId', '==', params.stripeEventId)
    .limit(1)
    .get();
  if (!duplicate.empty) return;

  const grossGbp = params.amountPaidPence / 100;
  const discountGbp = (params.discountPence ?? 0) / 100;
  const netEligibleGbp = calculateNetEligibleRevenueGbp({
    grossGbp,
    discountGbp,
    isTrial: params.isTrial,
  });
  if (netEligibleGbp <= 0) return;

  const now = new Date();
  const reviewEligibleAt = admin.firestore.Timestamp.fromDate(
    addDays(now, GROWTH_PARTNER_PROGRAMME.influencer.commissionReviewDays),
  );

  const eventRef = adminDb.collection(PAYMENT_EVENTS).doc();
  await eventRef.set({
    id: eventRef.id,
    referredUserId: params.payerUserId,
    referrerUserId,
    stripeEventId: params.stripeEventId,
    source: params.source,
    grossGbp,
    discountGbp,
    netEligibleGbp,
    status: 'APPROVED',
    reviewEligibleAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const priorSpend = Number(attribution.qualifyingSpendGbp ?? 0);
  const newSpend = Math.round((priorSpend + netEligibleGbp) * 100) / 100;
  const minSpend =
    GROWTH_PARTNER_PROGRAMME.standardReferrer.minimumReferralSpendGbp;
  const alreadyGranted = attribution.referralRewardGranted === true;

  await attributionSnap.ref.update({
    qualifyingSpendGbp: newSpend,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (!alreadyGranted && newSpend >= minSpend) {
    const releaseAt = admin.firestore.Timestamp.fromDate(
      addDays(
        now,
        GROWTH_PARTNER_PROGRAMME.standardReferrer.acuReleaseDays,
      ),
    );
    const rewardRef = adminDb.collection(ACU_REWARDS).doc();
    await rewardRef.set({
      id: rewardRef.id,
      referrerUserId,
      referredUserId: params.payerUserId,
      acus: GROWTH_PARTNER_PROGRAMME.standardReferrer.acusPerPaidReferral,
      status: 'PENDING',
      releaseAt,
      paymentEventId: eventRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await attributionSnap.ref.update({
      referralRewardGranted: true,
      firstQualifyingPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const referrerProfile = await ensureGrowthPartnerProfile(referrerUserId);
  if (referrerProfile.status !== 'ACTIVE') return;

  const rate = commissionRateForTier(
    referrerProfile.tier,
    referrerProfile.customCommissionRate,
  );
  if (rate <= 0) return;

  let commissionGbp = commissionGbpFromNet(netEligibleGbp, rate);
  if (commissionGbp <= 0) return;

  const customerTotals = {
    ...(referrerProfile.customerCommissionTotals ?? {}),
  };
  const priorCustomerTotal = customerTotals[params.payerUserId] ?? 0;
  const customerCap =
    GROWTH_PARTNER_PROGRAMME.influencer.customerLifetimeCapGbp;
  const customerRemaining = Math.max(0, customerCap - priorCustomerTotal);
  commissionGbp = Math.min(commissionGbp, customerRemaining);
  if (commissionGbp <= 0) return;

  let monthlyEarned = referrerProfile.monthlyCommissionGbp ?? 0;
  const currentMonth = monthKey();
  if (referrerProfile.monthlyCommissionMonth !== currentMonth) {
    monthlyEarned = 0;
  }
  const monthlyCap = GROWTH_PARTNER_PROGRAMME.influencer.monthlyCapGbp;
  const monthlyRemaining = Math.max(0, monthlyCap - monthlyEarned);
  commissionGbp = Math.min(commissionGbp, monthlyRemaining);
  if (commissionGbp <= 0) return;

  const userSnap = await adminDb.doc(`users/${params.payerUserId}`).get();
  const payerRole = userSnap.data()?.role as string | undefined;
  let schoolHoldUntil: admin.firestore.Timestamp | null = null;
  if (payerRole === 'SCHOOL_ADMIN') {
    schoolHoldUntil = admin.firestore.Timestamp.fromDate(
      addDays(now, GROWTH_PARTNER_PROGRAMME.school.minActiveDays),
    );
  }

  const commissionRef = adminDb.collection(COMMISSIONS).doc();
  await commissionRef.set({
    id: commissionRef.id,
    partnerUserId: referrerUserId,
    customerUserId: params.payerUserId,
    paymentEventId: eventRef.id,
    netEligibleGbp,
    commissionRate: rate,
    commissionGbp,
    status: 'PENDING',
    reviewEligibleAt:
      schoolHoldUntil && schoolHoldUntil.toMillis() > reviewEligibleAt.toMillis()
        ? schoolHoldUntil
        : reviewEligibleAt,
    monthKey: currentMonth,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  customerTotals[params.payerUserId] =
    Math.round((priorCustomerTotal + commissionGbp) * 100) / 100;

  await adminDb.collection(PROFILES).doc(referrerUserId).update({
    monthlyCommissionGbp: Math.round((monthlyEarned + commissionGbp) * 100) / 100,
    monthlyCommissionMonth: currentMonth,
    customerCommissionTotals: customerTotals,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function releasePendingAcuRewards(): Promise<{
  released: number;
  errors: number;
}> {
  const now = admin.firestore.Timestamp.now();
  const pending = await adminDb
    .collection(ACU_REWARDS)
    .where('status', '==', 'PENDING')
    .limit(100)
    .get();

  let released = 0;
  let errors = 0;

  for (const doc of pending.docs) {
    const data = doc.data();
    const releaseAt = data.releaseAt as admin.firestore.Timestamp | undefined;
    if (!releaseAt || releaseAt.toMillis() > now.toMillis()) continue;
    try {
      await ACUService.creditACUs({
        userId: data.referrerUserId,
        amount: data.acus,
        type: 'BONUS',
        description: 'Growth Partner referral reward',
        metadata: {
          referredUserId: data.referredUserId,
          rewardId: doc.id,
          programme: GROWTH_PARTNER_PROGRAMME.name,
        },
      });

      await doc.ref.update({
        status: 'RELEASED',
        releasedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const profileRef = adminDb.collection(PROFILES).doc(data.referrerUserId);
      await adminDb.runTransaction(async (tx) => {
        const profileSnap = await tx.get(profileRef);
        if (!profileSnap.exists) return;
        const profile = profileSnap.data() as GrowthPartnerProfile;
        const count = (profile.successfulPaidReferrals ?? 0) + 1;
        const updates: Record<string, unknown> = {
          successfulPaidReferrals: count,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (
          profile.tier === 'STANDARD_REFERRER' &&
          count >=
            GROWTH_PARTNER_PROGRAMME.growthReferrer.requiredSuccessfulReferrals
        ) {
          updates.tier = 'GROWTH_REFERRER';
        }
        tx.update(profileRef, updates);
      });

      released++;
    } catch (err) {
      console.error('[growth-partner] ACU release failed:', doc.id, err);
      errors++;
    }
  }

  return { released, errors };
}

export async function advancePendingCommissions(): Promise<{
  advanced: number;
}> {
  const now = admin.firestore.Timestamp.now();
  const pending = await adminDb
    .collection(COMMISSIONS)
    .where('status', '==', 'PENDING')
    .limit(100)
    .get();

  let advanced = 0;
  const batch = adminDb.batch();
  for (const doc of pending.docs) {
    const reviewEligibleAt = doc.data()
      .reviewEligibleAt as admin.firestore.Timestamp | undefined;
    if (!reviewEligibleAt || reviewEligibleAt.toMillis() > now.toMillis()) {
      continue;
    }
    batch.update(doc.ref, {
      status: 'PAYABLE',
      payableAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    advanced++;
  }
  if (advanced > 0) await batch.commit();
  return { advanced };
}

export async function clawBackPayment(stripeEventId: string): Promise<void> {
  const events = await adminDb
    .collection(PAYMENT_EVENTS)
    .where('stripeEventId', '==', stripeEventId)
    .limit(1)
    .get();
  if (events.empty) return;

  const event = events.docs[0];
  const eventData = event.data();
  await event.ref.update({ status: 'CLAWED_BACK' });

  const rewards = await adminDb
    .collection(ACU_REWARDS)
    .where('paymentEventId', '==', event.id)
    .get();
  for (const reward of rewards.docs) {
    const status = reward.data().status;
    if (status === 'PENDING') {
      await reward.ref.update({ status: 'CLAWED_BACK' });
    } else if (status === 'RELEASED') {
      await reward.ref.update({ status: 'CLAWED_BACK' });
      // Manual ACU clawback may be required — flagged for admin review
    }
  }

  const commissions = await adminDb
    .collection(COMMISSIONS)
    .where('paymentEventId', '==', event.id)
    .get();
  for (const comm of commissions.docs) {
    await comm.ref.update({ status: 'CLAWED_BACK' });
  }

  if (eventData.referredUserId) {
    const attrRef = adminDb
      .collection(ATTRIBUTIONS)
      .doc(eventData.referredUserId);
    const attr = await attrRef.get();
    if (attr.exists) {
      const spend = Math.max(
        0,
        Number(attr.data()?.qualifyingSpendGbp ?? 0) -
          Number(eventData.netEligibleGbp ?? 0),
      );
      await attrRef.update({
        qualifyingSpendGbp: spend,
        status: 'FLAGGED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

export async function approveInfluencer(
  userId: string,
  adminUserId: string,
): Promise<void> {
  await ensureGrowthPartnerProfile(userId);
  await adminDb.collection(PROFILES).doc(userId).update({
    tier: 'APPROVED_INFLUENCER',
    influencerApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
    influencerApprovedBy: adminUserId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function suspendPartner(
  userId: string,
  reason: string,
): Promise<void> {
  await adminDb.collection(PROFILES).doc(userId).update({
    status: 'SUSPENDED',
    suspensionReason: reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function getPartnerDashboardData(userId: string) {
  const profile = await ensureGrowthPartnerProfile(userId);

  const attributionsSnap = await adminDb
    .collection(ATTRIBUTIONS)
    .where('referrerUserId', '==', userId)
    .limit(50)
    .get();

  const pendingRewardsSnap = await adminDb
    .collection(ACU_REWARDS)
    .where('referrerUserId', '==', userId)
    .where('status', '==', 'PENDING')
    .get();

  const commissionsSnap = await adminDb
    .collection(COMMISSIONS)
    .where('partnerUserId', '==', userId)
    .limit(50)
    .get();

  const pendingAcus = pendingRewardsSnap.docs.reduce(
    (sum, d) => sum + (d.data().acus ?? 0),
    0,
  );
  const payableCommissionGbp = commissionsSnap.docs
    .filter((d) => d.data().status === 'PAYABLE')
    .reduce((sum, d) => sum + (d.data().commissionGbp ?? 0), 0);
  const pendingCommissionGbp = commissionsSnap.docs
    .filter((d) => d.data().status === 'PENDING')
    .reduce((sum, d) => sum + (d.data().commissionGbp ?? 0), 0);

  return {
    profile,
    referralCount: attributionsSnap.size,
    pendingAcus,
    payableCommissionGbp: Math.round(payableCommissionGbp * 100) / 100,
    pendingCommissionGbp: Math.round(pendingCommissionGbp * 100) / 100,
    recentReferrals: attributionsSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          referredUserId: data.referredUserId,
          status: data.status,
          qualifyingSpendGbp: data.qualifyingSpendGbp ?? 0,
          attributedAt: data.attributedAt?.toDate?.()?.toISOString?.() ?? null,
        };
      })
      .sort((a, b) => {
        const ta = a.attributedAt ? Date.parse(a.attributedAt) : 0;
        const tb = b.attributedAt ? Date.parse(b.attributedAt) : 0;
        return tb - ta;
      }),
  };
}

export async function listPartnersForAdmin(limit = 100) {
  const snap = await adminDb.collection(PROFILES).limit(limit).get();

  const partners = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data() as GrowthPartnerProfile;
      const userSnap = await adminDb.doc(`users/${data.userId}`).get();
      return {
        ...data,
        email: userSnap.data()?.email ?? null,
        name: userSnap.data()?.name ?? null,
      };
    }),
  );
  return partners.sort(
    (a, b) =>
      (b.successfulPaidReferrals ?? 0) - (a.successfulPaidReferrals ?? 0),
  );
}

export async function listFlaggedAttributions(limit = 50) {
  const snap = await adminDb
    .collection(ATTRIBUTIONS)
    .where('status', '==', 'FLAGGED')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
