
import { getFirestoreDb } from '@/lib/firebase/client-app';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { AcuWallet as AcuWalletSchema } from '@/server/schemas';

export type AcuWallet = AcuWalletSchema;


export function getAcuWallet(uid: string, callback: (wallet: AcuWallet | null) => void) {
  try {
    const db = getFirestoreDb();
    // Must match admin SDK collection: server uses `acuWallets` (see acu-service, auth-actions).
    const walletDocRef = doc(db, 'acuWallets', uid);

    const unsubscribe = onSnapshot(
      walletDocRef,
      (walletDocSnap) => {
        if (walletDocSnap.exists) {
          const raw = walletDocSnap.data() as Record<string, unknown>;
          const balance =
            typeof raw.balance === 'number' && Number.isFinite(raw.balance)
              ? raw.balance
              : typeof raw.balanceACU === 'number' && Number.isFinite(raw.balanceACU)
                ? raw.balanceACU
                : 0;
          callback({
            id: walletDocSnap.id,
            ...(raw as Omit<AcuWallet, 'id' | 'balance'>),
            balance,
          });
        } else {
          callback({
            id: uid,
            userId: uid,
            balance: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      },
      (error) => {
        console.error('ACU wallet snapshot error:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting ACU wallet:', error);
    callback(null);
    return () => {};
  }
}
