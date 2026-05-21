import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '@/server/lib/errors';
import type { ParentDashboardPayload, ParentPlanTier } from '@/types/parent-dashboard';

export const ACTIVE_PARENT_PLANS: ParentPlanTier[] = [
  'PARENT_PRO',
  'PARENT_PRO_PLUS',
  'PARENT_ELITE',
];

export type ParentFeatureKey =
  | 'earlyWarnings'
  | 'verifiedStudyHours'
  | 'weeklyBriefing'
  | 'performanceOverview'
  | 'homeworkCentre'
  | 'studyBehaviourEngine'
  | 'emotionalIntelligence'
  | 'pathwayEngine'
  | 'microWeaknesses'
  | 'parentAdvisor'
  | 'aiIntervention'
  | 'familyIntelligence'
  | 'fullLiveAlerts';

const ALL_PARENT_FEATURES: ParentFeatureKey[] = [
  'earlyWarnings',
  'verifiedStudyHours',
  'weeklyBriefing',
  'performanceOverview',
  'homeworkCentre',
  'studyBehaviourEngine',
  'emotionalIntelligence',
  'pathwayEngine',
  'microWeaknesses',
  'parentAdvisor',
  'aiIntervention',
  'familyIntelligence',
  'fullLiveAlerts',
];

const PARENT_PRO_FEATURES = new Set<ParentFeatureKey>([
  'earlyWarnings',
  'verifiedStudyHours',
  'weeklyBriefing',
  'performanceOverview',
  'homeworkCentre',
]);

const PARENT_PRO_PLUS_FEATURES = new Set<ParentFeatureKey>([
  ...PARENT_PRO_FEATURES,
  'studyBehaviourEngine',
  'emotionalIntelligence',
  'pathwayEngine',
  'microWeaknesses',
  'parentAdvisor',
  'aiIntervention',
  'fullLiveAlerts',
]);

export function parentPlanHasFeature(tier: ParentPlanTier, feature: ParentFeatureKey): boolean {
  if (tier === 'PARENT_ELITE') return true;
  if (tier === 'PARENT_PRO_PLUS') return PARENT_PRO_PLUS_FEATURES.has(feature);
  return PARENT_PRO_FEATURES.has(feature);
}

export function parentFeatureFlagsFromTier(
  tier: ParentPlanTier,
): ParentDashboardPayload['features'] {
  const flags = {} as ParentDashboardPayload['features'];
  for (const key of ALL_PARENT_FEATURES) {
    flags[key] = parentPlanHasFeature(tier, key);
  }
  return flags;
}

export function resolveParentPlanType(type: string | undefined): ParentPlanTier | null {
  if (type && ACTIVE_PARENT_PLANS.includes(type as ParentPlanTier)) {
    return type as ParentPlanTier;
  }
  return null;
}

const PARENT_TIER_RANK: Record<ParentPlanTier, number> = {
  PARENT_PRO: 1,
  PARENT_PRO_PLUS: 2,
  PARENT_ELITE: 3,
};

function pickHigherParentTier(
  a: ParentPlanTier | null,
  b: ParentPlanTier | null,
): ParentPlanTier | null {
  if (!a) return b;
  if (!b) return a;
  return PARENT_TIER_RANK[a] >= PARENT_TIER_RANK[b] ? a : b;
}

/** Active tier from Stripe `subscriptions` doc and/or `users.subscription` (whichever is higher). */
export async function getActiveParentPlanTier(userId: string): Promise<ParentPlanTier | null> {
  const [subSnap, userSnap] = await Promise.all([
    adminDb.collection('subscriptions').doc(userId).get(),
    adminDb.collection('users').doc(userId).get(),
  ]);

  let tier: ParentPlanTier | null = null;

  const subData = subSnap.data();
  if (subSnap.exists && subData?.status === 'ACTIVE') {
    tier = pickHigherParentTier(tier, resolveParentPlanType(String(subData?.type ?? '')));
  }

  const userData = userSnap.data();
  if (userData?.role === 'PARENT') {
    tier = pickHigherParentTier(
      tier,
      resolveParentPlanType(String(userData?.subscription ?? '')),
    );
  }

  return tier;
}

export async function assertParentFeature(
  userId: string,
  feature: ParentFeatureKey,
): Promise<ParentPlanTier> {
  const tier = await getActiveParentPlanTier(userId);
  if (!tier) {
    throw new HttpsError(
      'failed-precondition',
      'An active Parent subscription is required.',
    );
  }
  if (!parentPlanHasFeature(tier, feature)) {
    const upgrade =
      feature === 'familyIntelligence' || feature === 'fullLiveAlerts'
        ? 'Parent Elite'
        : 'Parent Pro+';
    throw new HttpsError(
      'permission-denied',
      `Upgrade to ${upgrade} to use this feature.`,
    );
  }
  return tier;
}

/** Remove premium payload sections so lower tiers cannot read them from the network tab. */
export function applyParentPlanGates(payload: ParentDashboardPayload): ParentDashboardPayload {
  const { features } = payload;

  if (!features.studyBehaviourEngine) {
    payload.studyInsights = [];
  }
  if (!features.emotionalIntelligence) {
    payload.emotionalSignals = [];
  }
  if (!features.pathwayEngine) {
    payload.gradeProbabilities = [];
    payload.universityPathways = [];
  }
  if (!features.microWeaknesses) {
    payload.microWeaknesses = [];
  }
  if (!features.familyIntelligence) {
    payload.family = null;
  }
  if (!features.fullLiveAlerts) {
    payload.liveAlerts = payload.liveAlerts.slice(0, 3);
  }

  return payload;
}

export async function assertParentStudentLink(
  parentId: string,
  studentId: string,
): Promise<void> {
  const snap = await adminDb
    .collection('parent_student_links')
    .where('parentId', '==', parentId)
    .where('studentId', '==', studentId)
    .where('status', '==', 'APPROVED')
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError('permission-denied', 'You are not linked to this student.');
  }
}
