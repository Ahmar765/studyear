import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

export const auditLogService = {
  async record(input: {
    userId: string;
    action: string;
    metadata: any;
  }) {
    return adminDb.collection("audit_logs").add({
      userId: input.userId,
      action: input.action,
      metadata: input.metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};

    