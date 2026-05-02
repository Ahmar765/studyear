import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

export const autosaveService = {
  async capture(input: {
    userId: string;
    studentId?: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: any;
  }) {
    return adminDb.collection("autosave_events").add({
      userId: input.userId,
      studentId: input.studentId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};

    