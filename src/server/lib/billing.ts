import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { HttpsError } from './errors';
import { ACUService } from '../services/acu-service';
import type { SubscriptionType } from '../schemas';
import { ACU_PACKAGES } from '@/data/acu-packages';

export async function updateUserAcuBalance(userId: string, productCode: string) {
    const pack = ACU_PACKAGES[productCode as keyof typeof ACU_PACKAGES];

    if (!pack) {
        console.error(`Invalid productCode received in webhook: ${productCode}`);
        throw new HttpsError('invalid-argument', `Product code ${productCode} is not a valid ACU package.`);
    }

    try {
        const creditData = {
            userId,
            amount: pack.totalACUs,
            type: "PURCHASE" as const,
            description: `${pack.label} ACU purchase via Stripe`,
            metadata: { stripeProductCode: productCode, pricePence: pack.pricePence }
        };

        if (pack.bonusACUs > 0) {
            creditData.description = `${pack.label} ACU purchase (${pack.baseACUs} + ${pack.bonusACUs} bonus)`;
        }

        await ACUService.creditACUs(creditData);

        console.log(`Successfully credited ${pack.totalACUs} ACUs to user ${userId} for product ${productCode}.`);
        return { success: true };

    } catch (error) {
        console.error(`Failed to update ACU balance for user ${userId} from webhook:`, error);
        // We don't re-throw here to prevent Stripe from retrying a potentially permanent business logic failure.
        // The error is logged for manual investigation.
        return { success: false, error: (error as Error).message };
    }
}

type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING_PAYMENT";

export async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  userId: string,
  subscriptionType: SubscriptionType,
  status: SubscriptionStatus
) {
  const subscriptionRef = adminDb.collection('subscriptions').doc(userId);
  
  try {
    await adminDb.runTransaction(async (transaction) => {
      // Set the subscription data
      transaction.set(subscriptionRef, { 
        type: subscriptionType,
        status: status,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // If the user is a PARENT, also stamp their customerId onto their parent_profile
      // This is useful for cross-referencing in other backend services without needing to read the subscription doc
      const userDoc = await transaction.get(adminDb.collection('users').doc(userId));
      if (userDoc.data()?.role === 'PARENT') {
          const parentProfileRef = adminDb.collection('parent_profiles').doc(userId);
          transaction.set(parentProfileRef, {
              stripeCustomerId: customerId,
          }, { merge: true });
      }
    });
    console.log(`Subscription updated for user ${userId}: type=${subscriptionType}, status=${status}.`);
  } catch (error) {
    console.error(`Failed to update subscription status for user ${userId}:`, error);
    // Don't rethrow to avoid webhook retry loops on persistent errors.
  }
}
