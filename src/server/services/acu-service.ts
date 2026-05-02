import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { HttpsError } from '@/server/lib/errors';
import type { AcuWallet } from '@/server/schemas';
import { ACU_FEATURE_COSTS, FeatureKey } from '@/data/acu-costs';
import { canUsePremiumFeature } from '@/data/entitlements';
import { getUserProfileServer } from './user';
import type { SubscriptionType } from '../schemas';

export class ACUService {
  static async getOrCreateWallet(transaction: admin.firestore.Transaction, walletRef: admin.firestore.DocumentReference, userId: string): Promise<AcuWallet> {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists) {
        const newWalletData: AcuWallet = {
            id: walletRef.id,
            userId,
            balance: 0,
            locked: false,
            ownerType: 'USER',
            createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        };
        transaction.set(walletRef, newWalletData);
        return newWalletData;
    }
    return { id: walletDoc.id, ...walletDoc.data() } as AcuWallet;
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

        transaction.update(walletRef, { balance: balanceAfter, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const txRef = adminDb.collection('acuTransactions').doc();
        transaction.set(txRef, {
            walletId: wallet.id,
            userId: params.userId,
            type: params.type,
            amount: params.amount,
            balanceBefore,
            balanceAfter,
            description: params.description,
            metadata: params.metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    
    // Admins bypass entitlement checks, but not billing.
    if (user.role !== 'ADMIN') {
      const subscriptionType = user.subscription as SubscriptionType;
      if (!canUsePremiumFeature(subscriptionType, params.featureKey)) {
        throw new HttpsError("failed-precondition", `FEATURE_NOT_INCLUDED_IN_PLAN. '${params.featureKey}' requires a premium subscription.`);
      }
    }

    const walletRef = adminDb.collection('acuWallets').doc(params.userId);
    return adminDb.runTransaction(async (transaction) => {
        const wallet = await this.getOrCreateWallet(transaction, walletRef, params.userId);
        
        if (wallet.locked) {
            throw new HttpsError("failed-precondition", "ACU_WALLET_LOCKED");
        }
        
        if (wallet.balance < cost) {
            throw new HttpsError("resource-exhausted", "INSUFFICIENT_ACU_BALANCE");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - cost;
        
        transaction.update(walletRef, { balance: balanceAfter, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const txRef = adminDb.collection('acuTransactions').doc();
        transaction.set(txRef, {
            walletId: wallet.id,
            userId: params.userId,
            type: "DEBIT",
            featureKey: params.featureKey,
            amount: -cost,
            balanceBefore,
            balanceAfter,
            actualAICostGBP: params.actualAICostGBP ?? null,
            platformChargeGBP: params.actualAICostGBP ? params.actualAICostGBP * 3 : null,
            metadata: params.metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            wallet: { ...wallet, balance: balanceAfter },
            chargedACUs: cost
        };
    });
  }
}
