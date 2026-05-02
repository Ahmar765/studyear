import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

export const learningEventService = {
  async create(input: {
    studentId: string;
    type: any;
    stage: any;
    payload: any;
  }) {
    return adminDb.collection("learning_events").add({
      studentId: input.studentId,
      type: input.type,
      stage: input.stage,
      payload: input.payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};

    