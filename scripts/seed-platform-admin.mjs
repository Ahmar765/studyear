/**
 * One-shot: create or reset platform admin auth user + Firestore + claims.
 * Requires the same env as the app: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON,
 * and NEXT_PUBLIC_FIREBASE_PROJECT_ID (optional if in service account JSON).
 *
 * Usage (from repo root):
 *   node scripts/seed-platform-admin.mjs
 *
 * Loads `.env` from the project root when present (simple parser; no dotenv package).
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = 'admin@studyear.com';
/** Override with env ADMIN_SEED_PASSWORD if you do not want the default in source. */
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'TestUser123!';
const DISPLAY_NAME = 'Platform Admin (test)';

function loadDotEnv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function normalizeCredPath(raw) {
  if (!raw) return undefined;
  const t = raw.trim().replace(/^["']|["']$/g, '');
  return t.length ? t : undefined;
}

function initAdmin() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const credPath = normalizeCredPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (credPath && existsSync(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  } else if (json?.trim()) {
    const serviceAccount = JSON.parse(json);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId ?? serviceAccount.project_id,
    });
  } else {
    console.error(
      'Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS (path to JSON) or FIREBASE_SERVICE_ACCOUNT_JSON in .env',
    );
    process.exit(1);
  }
}

async function main() {
  loadDotEnv();
  initAdmin();

  const auth = admin.auth();
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let uid;
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: ADMIN_PASSWORD,
      emailVerified: true,
      displayName: DISPLAY_NAME,
    });
    console.log(`Updated existing user ${ADMIN_EMAIL} (${uid}) — password reset.`);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        emailVerified: true,
        displayName: DISPLAY_NAME,
      });
      uid = created.uid;
      console.log(`Created user ${ADMIN_EMAIL} (${uid}).`);
    } else {
      throw e;
    }
  }

  await auth.setCustomUserClaims(uid, { role: 'ADMIN' });

  await db.doc(`users/${uid}`).set(
    {
      id: uid,
      email: ADMIN_EMAIL,
      name: DISPLAY_NAME,
      role: 'ADMIN',
      onboardingComplete: true,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.doc(`subscriptions/${uid}`).set(
    {
      type: 'ADMIN',
      status: 'ACTIVE',
      updatedAt: now,
    },
    { merge: true },
  );

  console.log('Done. Login with:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
