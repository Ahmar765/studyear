import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import type { AcuTransaction, AcuWallet } from '@/server/schemas';
import { HttpsError } from '@/server/lib/errors';
import type { QuoteResult } from './pricing';


async function ensureWalletExists(
  transaction: admin.firestore.Transaction,
  walletRef: admin.firestore.DocumentReference,
  ownerId: string,
  ownerType: 'user' | 'school'
): Promise<AcuWallet> {
  const walletSnap = await transaction.get(walletRef);
  if (!walletSnap.exists) {
    const newWalletData: AcuWallet = {
      walletId: walletRef.id,
      ownerId: ownerId,
      ownerType: ownerType,
      balanceACU: 0,
      reservedACU: 0,
      spentLifetimeACU: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };
    transaction.set(walletRef, newWalletData);
    return newWalletData;
  }
  return walletSnap.data() as AcuWallet;
}


async function appendLedgerEntry(
    transaction: admin.firestore.Transaction,
    ledgerRef: admin.firestore.DocumentReference,
    data: Omit<AcuTransaction, 'transactionId' | 'createdAt'>
) {
    transaction.set(ledgerRef, {
        ...data,
        transactionId: ledgerRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export async function reserveAcu(
    billingTarget: { ownerId: string, ownerType: 'user' | 'school' },
    billableAmountACU: number,
    costAmount: number,
    featureName: string,
    idempotencyKey: string,
    metadata: Record<string, any>,
    callerUid: string,
): Promise<string> {
    const { ownerId: walletId, ownerType } = billingTarget;
    const walletRef = adminDb.doc(`acuWallets/${walletId}`);
    const ledgerDocRef = adminDb.collection(`acuTransactions`).doc(idempotencyKey);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const existingTx = await transaction.get(ledgerDocRef);
            if (existingTx.exists) {
                console.warn(`Idempotency check: Reservation ${idempotencyKey} already processed.`);
                return;
            }
            
            const wallet = await ensureWalletExists(transaction, walletRef, walletId, ownerType);

            if (wallet.status === 'locked') throw new HttpsError('failed-precondition', 'WALLET_LOCKED');
            
            const availableBalance = wallet.balanceACU - wallet.reservedACU;
            if (availableBalance < billableAmountACU) {
                throw new HttpsError('resource-exhausted', `Insufficient ACU balance. Available: ${availableBalance}, Required: ${billableAmountACU}`);
            }

            transaction.update(walletRef, {
                reservedACU: admin.firestore.FieldValue.increment(billableAmountACU),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            await appendLedgerEntry(transaction, ledgerDocRef, {
                walletId: walletId, 
                userId: callerUid,
                requestId: idempotencyKey,
                idempotencyKey: idempotencyKey,
                entryType: 'reservation',
                status: 'pending',
                featureType: featureName,
                amount: billableAmountACU, // Positive for reservation
                meta: { ...metadata, settled: false, realCost: costAmount },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            } as any);
        });
        console.info(`Successfully reserved ${billableAmountACU} ACUs for wallet ${walletId}.`);
        return idempotencyKey;
    } catch (error) {
        console.error(`ACU reservation failed for wallet ${walletId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Could not process your reservation.");
    }
}

export async function settleAcuReservation(
    reservationId: string,
    finalQuote: QuoteResult,
    settlementIdempotencyKey: string,
    metadata: Record<string, any>,
    callerUid: string,
) {
    const reservationRef = adminDb.doc(`acuTransactions/${reservationId}`);
    const settlementLedgerRef = adminDb.collection(`acuTransactions`).doc(settlementIdempotencyKey);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const existingSettlement = await transaction.get(settlementLedgerRef);
            if (existingSettlement.exists) {
                console.warn(`Idempotency check: Settlement ${settlementIdempotencyKey} already processed.`);
                return;
            }

            const reservationSnap = await transaction.get(reservationRef);
            if (!reservationSnap.exists) throw new HttpsError('not-found', 'Reservation not found.');
            const reservationData = reservationSnap.data() as AcuTransaction;
            if (reservationData.meta?.settled) throw new HttpsError('failed-precondition', 'Reservation already settled.');
            
            const walletId = reservationData.walletId;
            const walletRef = adminDb.doc(`acuWallets/${walletId}`);

            const walletData = await ensureWalletExists(transaction, walletRef, walletId, reservationData.meta?.ownerType || 'user');
            
            const reservedAmountACU = Math.abs(reservationData.amount || 0);
            
            let debitAmount = finalQuote.chargedAcus;

            if (debitAmount > reservedAmountACU) {
                console.warn(`Final debit amount ${debitAmount} exceeds reserved ${reservedAmountACU}. Clamping to reserved amount.`);
                debitAmount = reservedAmountACU;
            }
            
            const updatedReservedACU = admin.firestore.FieldValue.increment(-reservedAmountACU);
            const updatedBalanceACU = admin.firestore.FieldValue.increment(-debitAmount);


            transaction.update(walletRef, {
                balanceACU: updatedBalanceACU,
                reservedACU: updatedReservedACU,
                spentLifetimeACU: admin.firestore.FieldValue.increment(debitAmount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(reservationRef, { status: 'completed', 'meta.settled': true, 'meta.settlementId': settlementIdempotencyKey });
            
            const newBalance = walletData.balanceACU - debitAmount;

            await appendLedgerEntry(transaction, settlementLedgerRef, {
                ...reservationData,
                entryType: finalQuote.chargedAcus > 0 ? 'debit' : 'reversal',
                status: 'completed',
                idempotencyKey: settlementIdempotencyKey,
                amount: -debitAmount,
                balanceBefore: walletData.balanceACU,
                balanceAfter: newBalance,
                meta: { ...metadata, reservationId, finalQuote }, 
            } as any);
        });

        console.info(`Settled reservation ${reservationId} with final debit of ${finalQuote.chargedAcus} ACUs.`);
        return { success: true, transactionId: settlementIdempotencyKey };

    } catch (error) {
        console.error(`ACU settlement failed for reservation ${reservationId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Could not settle the reservation.");
    }
}
