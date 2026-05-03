'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase/admin-app';
import { getVerifiedUser } from '@/server/lib/auth';

function assertPlatformAdmin(tokenUser: Awaited<ReturnType<typeof getVerifiedUser>>) {
    if (!tokenUser) throw new Error('Not authenticated.');
    const role = (tokenUser as { role?: string }).role;
    if (role !== 'ADMIN') throw new Error('Forbidden.');
}

const CreateDiscountSchema = z.object({
    code: z.string().min(2).max(40),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
});

export interface DiscountCodeRow {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    active: boolean;
    createdAt: string | null;
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
            return {
                id: doc.id,
                code: (d.code as string) || doc.id,
                type: (d.type as 'percentage' | 'fixed') || 'percentage',
                value: typeof d.value === 'number' ? d.value : Number(d.value) || 0,
                active: d.active !== false,
                createdAt: dt ? dt.toISOString() : null,
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
        await ref.set({
            code,
            type: parsed.data.type,
            value: parsed.data.type === 'percentage' ? Math.min(parsed.data.value, 100) : parsed.data.value,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByUid: uid,
        });
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
