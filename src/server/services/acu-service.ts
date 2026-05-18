import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { HttpsError } from '@/server/lib/errors';
import { readAcuBalance } from '@/server/lib/acu-wallet-balance';
import type { AcuWallet } from '@/server/schemas';
import { ACU_FEATURE_COSTS, FeatureKey } from '@/data/acu-costs';
import { canUsePremiumFeature, requiresSubscriptionForFeature } from '@/data/entitlements';
import { resolveAcuWalletUserId } from '@/server/lib/school-acu-billing';
import { getTeacherSchoolLink } from '@/server/lib/school-staff-link';
import { getUserProfileServer } from './user';
import type { SubscriptionType } from '../schemas';

function normalizeWallet(
  walletRef: admin.firestore.DocumentReference,
  userId: string,
  data: admin.firestore.DocumentData | undefined,
): AcuWallet {
  const balance = readAcuBalance(data);
  const locked = data?.locked === true || data?.status === 'locked';
  return {
    id: walletRef.id,
    userId: (typeof data?.userId === 'string' ? data.userId : userId) as string,
    balance,
    locked,
    ownerType: (data?.ownerType as AcuWallet['ownerType']) ?? 'USER',
    createdAt: (data?.createdAt as admin.firestore.Timestamp) ?? admin.firestore.Timestamp.now(),
    updatedAt: (data?.updatedAt as admin.firestore.Timestamp) ?? admin.firestore.Timestamp.now(),
  };
}

export class ACUService {
  static async getOrCreateWallet(transaction: admin.firestore.Transaction, walletRef: admin.firestore.DocumentReference, userId: string): Promise<AcuWallet> {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists) {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const newWalletData = {
            userId,
            balance: 0,
            balanceACU: 0,
            locked: false,
            ownerType: 'USER',
            createdAt: now,
            updatedAt: now,
        };
        transaction.set(walletRef, newWalletData);
        return normalizeWallet(walletRef, userId, newWalletData);
    }
    const data = walletDoc.data()!;
    const normalized = normalizeWallet(walletRef, userId, data);
    if (typeof data.balance !== 'number' && normalized.balance > 0) {
      transaction.update(walletRef, {
        balance: normalized.balance,
        balanceACU: normalized.balance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return normalized;
  }

  static async creditACUs(params: {
    userId: string;
    amount: number;
    type: "PURCHASE" | "BONUS" | "ADMIN_ADJUSTMENT";
    description?: string;
    metadata?: any;
  }) {
    const walletRef = adminDb.collection('acuWallets').doc(params.userId);

    return adminDb.runTransaction(async (transaction) => {
        const wallet = await this.getOrCreateWallet(transaction, walletRef, params.userId);
        
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + params.amount;

        transaction.update(walletRef, {
          balance: balanceAfter,
          balanceACU: balanceAfter,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const txRef = adminDb.collection('acuTransactions').doc();
        transaction.set(txRef, {
            walletId: wallet.id,
            userId: params.userId,
            type: params.type,
            amount: params.amount,
            balanceBefore,
            balanceAfter,
            description: params.description ?? null,
            metadata: params.metadata ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { ...wallet, balance: balanceAfter };
    });
  }

  static async enforceAndDebit(params: {
    userId: string;
    featureKey: FeatureKey;
    metadata?: any;
    actualAICostGBP?: number;
  }) {
    const cost = ACU_FEATURE_COSTS[params.featureKey];
    if (cost === undefined) {
      throw new HttpsError("invalid-argument", `UNKNOWN_AI_FEATURE: ${params.featureKey}`);
    }

    const user = await getUserProfileServer(params.userId);
    if (!user) throw new HttpsError("not-found", "USER_NOT_FOUND");
    
    // Admins bypass entitlement checks, but not billing. ACU-only features skip plan checks.
    if (user.role !== 'ADMIN' && requiresSubscriptionForFeature(params.featureKey)) {
      const subscriptionType = user.subscription as SubscriptionType;
      const schoolLinkedTutor =
        user.role === 'SCHOOL_TUTOR' && (await getTeacherSchoolLink(params.userId)).linked;
      if (
        !schoolLinkedTutor &&
        !canUsePremiumFeature(subscriptionType, params.featureKey)
      ) {
        throw new HttpsError("failed-precondition", `FEATURE_NOT_INCLUDED_IN_PLAN. '${params.featureKey}' requires a premium subscription.`);
      }
      if (
        schoolLinkedTutor &&
        !canUsePremiumFeature('SCHOOL_TUTOR', params.featureKey) &&
        !canUsePremiumFeature(subscriptionType, params.featureKey)
      ) {
        throw new HttpsError("failed-precondition", `FEATURE_NOT_INCLUDED_IN_PLAN. '${params.featureKey}' is not enabled for school teachers.`);
      }
    }

    const walletUserId = await resolveAcuWalletUserId(params.userId, user.role);
    const walletRef = adminDb.collection('acuWallets').doc(walletUserId);
    const staffLink =
      user.role === 'SCHOOL_TUTOR' ? await getTeacherSchoolLink(params.userId) : { linked: false };
    return adminDb.runTransaction(async (transaction) => {
        const wallet = await this.getOrCreateWallet(transaction, walletRef, walletUserId);
        
        if (wallet.locked) {
            throw new HttpsError("failed-precondition", "ACU_WALLET_LOCKED");
        }
        
        const balanceBefore = wallet.balance;
        if (balanceBefore < cost) {
          if (user.role === 'SCHOOL_TUTOR' && staffLink.linked) {
            throw new HttpsError(
              'resource-exhausted',
              'INSUFFICIENT_SCHOOL_ACU_BALANCE: Your school ACU pool is empty. Ask your school administrator to top up under School → ACU command.',
            );
          }
          throw new HttpsError('resource-exhausted', 'INSUFFICIENT_ACU_BALANCE');
        }

        const balanceAfter = balanceBefore - cost;

        transaction.update(walletRef, {
          balance: balanceAfter,
          balanceACU: balanceAfter,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const txRef = adminDb.collection('acuTransactions').doc();
        transaction.set(txRef, {
            walletId: wallet.id,
            userId: walletUserId,
            type: "DEBIT",
            featureKey: params.featureKey,
            amount: -cost,
            balanceBefore,
            balanceAfter,
            actualAICostGBP: params.actualAICostGBP ?? null,
            platformChargeGBP: params.actualAICostGBP ? params.actualAICostGBP * 3 : null,
            metadata: {
              ...(params.metadata && typeof params.metadata === 'object' ? params.metadata : {}),
              initiatedByUserId: params.userId,
              ...(staffLink.linked && staffLink.schoolId
                ? { schoolId: staffLink.schoolId, billedViaSchoolPool: walletUserId !== params.userId }
                : {}),
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return {
            wallet: { ...wallet, balance: balanceAfter },
            chargedACUs: cost
        };
    });
  }
}
