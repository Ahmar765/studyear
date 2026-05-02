import * as admin from 'firebase-admin';
import { existsSync } from 'node:fs';

function normalizeCredPath(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim().replace(/^["']|["']$/g, '');
  return t.length ? t : undefined;
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  const credPath = normalizeCredPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (credPath && existsSync(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  } else if (json?.trim()) {
    try {
      const serviceAccount = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: projectId ?? serviceAccount.project_id,
      });
    } catch (e) {
      console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.', e);
      admin.initializeApp(projectId ? { projectId } : {});
    }
  } else {
    if (credPath && !existsSync(credPath)) {
      console.warn(
        `[firebase-admin] Service account file not found: ${credPath}. ` +
          'Point GOOGLE_APPLICATION_CREDENTIALS to your downloaded JSON, or set FIREBASE_SERVICE_ACCOUNT_JSON in .env.',
      );
    }
    admin.initializeApp(projectId ? { projectId } : {});
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
