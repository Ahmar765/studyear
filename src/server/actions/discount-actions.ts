'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin-app';
import { getVerifiedUser } from '@/server/lib/auth';
import {
  ensureStripeCouponForDiscount,
  findActiveDiscountCode,
  formatDiscountLabel,
  normalizeDiscountCodeInput,
} from '@/server/lib/discount-codes';

function assertPlatformAdmin(tokenUser: Awaited<ReturnType<typeof getVerifiedUser>>) {
    if (!tokenUser) throw new Error('Not authenticated.');
    const role = (tokenUser as { role?: string }).role;
    if (role !== 'ADMIN') throw new Error('Forbidden.');
}

const CreateDiscountSchema = z.object({
    code: z.string().min(2).max(40),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    /** ISO date YYYY-MM-DD — code stops working after this day (UK end of day). */
    validUntil: z.string().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
});

export interface DiscountCodeRow {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    active: boolean;
    createdAt: string | null;
    validUntil: string | null;
    maxRedemptions: number | null;
    redemptionCount: number;
}

export async function listDiscountCodesAction(idToken?: string | null): Promise<{
    codes: DiscountCodeRow[];
    error?: string;
}> {
    try {
        const u = await getVerifiedUser(idToken);
        assertPlatformAdmin(u);
        const snap = await adminDb.collection('admin_discount_codes').limit(100).get();
        const codes: DiscountCodeRow[] = snap.docs.map((doc) => {
            const d = doc.data();
            const createdRaw = d.createdAt as admin.firestore.Timestamp | undefined;
            const dt = createdRaw?.toDate?.() ?? null;
            const validRaw = d.validUntil as admin.firestore.Timestamp | undefined;
            const validDt = validRaw?.toDate?.() ?? null;
            return {
                id: doc.id,
                code: (d.code as string) || doc.id,
                type: (d.type as 'percentage' | 'fixed') || 'percentage',
                value: typeof d.value === 'number' ? d.value : Number(d.value) || 0,
                active: d.active !== false,
                createdAt: dt ? dt.toISOString() : null,
                validUntil: validDt ? validDt.toISOString() : null,
                maxRedemptions:
                    typeof d.maxRedemptions === 'number' ? d.maxRedemptions : null,
                redemptionCount:
                    typeof d.redemptionCount === 'number' ? d.redemptionCount : 0,
            };
        });
        codes.sort((a, b) => (a.createdAt && b.createdAt && a.createdAt < b.createdAt ? 1 : -1));
        return { codes };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('listDiscountCodesAction', error);
        return { codes: [], error: msg };
    }
}

export async function createDiscountCodeAction(
    idToken: string | null | undefined,
    raw: z.infer<typeof CreateDiscountSchema>,
): Promise<{ success: boolean; error?: string }> {
    try {
        const u = await getVerifiedUser(idToken);
        assertPlatformAdmin(u);
        const uid = u!.uid;
        const parsed = CreateDiscountSchema.safeParse(raw);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten().formErrors.join(', ') };
        }
        const code = parsed.data.code.trim().toUpperCase().replace(/\s+/g, '_');
        const ref = adminDb.collection('admin_discount_codes').doc(code);
        const existing = await ref.get();
        if (existing.exists) {
            return { success: false, error: 'That code already exists.' };
        }
        const validUntil = parsed.data.validUntil?.trim()
            ? admin.firestore.Timestamp.fromDate(
                  new Date(`${parsed.data.validUntil.trim()}T23:59:59`),
              )
            : null;

        await ref.set({
            code,
            type: parsed.data.type,
            value: parsed.data.type === 'percentage' ? Math.min(parsed.data.value, 100) : parsed.data.value,
            active: true,
            validUntil,
            maxRedemptions: parsed.data.maxRedemptions ?? null,
            redemptionCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByUid: uid,
        });

        const secret = process.env.STRIPE_SECRET_KEY;
        if (secret) {
            try {
                const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });
                await ensureStripeCouponForDiscount(stripe, {
                    id: code,
                    code,
                    type: parsed.data.type,
                    value: parsed.data.type === 'percentage' ? Math.min(parsed.data.value, 100) : parsed.data.value,
                    active: true,
                    validUntil: validUntil?.toDate() ?? null,
                    maxRedemptions: parsed.data.maxRedemptions ?? null,
                    redemptionCount: 0,
                });
            } catch (stripeErr) {
                console.error('createDiscountCodeAction Stripe sync', stripeErr);
            }
        }

        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('createDiscountCodeAction', error);
        return { success: false, error: msg };
    }
}

export async function deactivateDiscountCodeAction(
    idToken: string | null | undefined,
    codeId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const u = await getVerifiedUser(idToken);
        assertPlatformAdmin(u);
        if (!codeId.trim()) return { success: false, error: 'Invalid code.' };
        await adminDb.collection('admin_discount_codes').doc(codeId).set(
            { active: false, deactivatedAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true },
        );
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('deactivateDiscountCodeAction', error);
        return { success: false, error: msg };
    }
}

/** Lets signed-in users validate a promo code before checkout. */
export async function validateDiscountCodeAction(
    rawCode: string,
): Promise<{
    valid: boolean;
    code?: string;
    label?: string;
    error?: string;
}> {
    try {
        const normalized = normalizeDiscountCodeInput(rawCode);
        if (normalized.length < 2) {
            return { valid: false, error: 'Enter a valid discount code.' };
        }

        const record = await findActiveDiscountCode(normalized);
        if (!record) {
            return { valid: false, error: 'That code is invalid or has expired.' };
        }

        return {
            valid: true,
            code: record.code,
            label: formatDiscountLabel(record),
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('validateDiscountCodeAction', error);
        return { valid: false, error: msg };
    }
}
