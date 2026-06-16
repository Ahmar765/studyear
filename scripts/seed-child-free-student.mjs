/**
 * Create or reset a Child Free test student (standalone FREE tier + welcome ACUs).
 *
 * Usage (from repo root):
 *   npm run seed:child-free
 *
 * Override password: CHILD_FREE_SEED_PASSWORD=YourPass123! npm run seed:child-free
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STUDENT_EMAIL = process.env.CHILD_FREE_SEED_EMAIL ?? 'childfree@studyear.com';
const STUDENT_PASSWORD = process.env.CHILD_FREE_SEED_PASSWORD ?? 'ChildFree100!';
const DISPLAY_NAME = 'Child Free Test Student';

function loadDotEnv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
      'Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON in .env',
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
    const existing = await auth.getUserByEmail(STUDENT_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: STUDENT_PASSWORD,
      emailVerified: true,
      displayName: DISPLAY_NAME,
    });
    console.log(`Updated existing user ${STUDENT_EMAIL} (${uid}).`);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD,
        emailVerified: true,
        displayName: DISPLAY_NAME,
      });
      uid = created.uid;
      console.log(`Created user ${STUDENT_EMAIL} (${uid}).`);
    } else {
      throw e;
    }
  }

  await auth.setCustomUserClaims(uid, { role: 'STUDENT' });

  await db.doc(`users/${uid}`).set(
    {
      id: uid,
      email: STUDENT_EMAIL,
      name: DISPLAY_NAME,
      role: 'STUDENT',
      subscription: 'FREE',
      onboardingComplete: true,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.doc(`student_profiles/${uid}`).set(
    { userId: uid, studyLevel: 'GCSE', yearGroup: 'Year 10', subjects: [] },
    { merge: true },
  );

  await db.doc(`acuWallets/${uid}`).set(
    {
      userId: uid,
      ownerType: 'USER',
      balance: 0,
      locked: false,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.doc(`subscriptions/${uid}`).set(
    {
      type: 'FREE',
      status: 'ACTIVE',
      planLabel: 'Child Free',
      userId: uid,
      updatedAt: now,
    },
    { merge: true },
  );

  // Grant first monthly 100 ACUs
  const grantRef = db.collection('free_monthly_acu_grants').doc(uid);
  await grantRef.set({
    lastGrantedAt: now,
    acus: 100,
    expiresAfterDays: 30,
  });

  const walletRef = db.doc(`acuWallets/${uid}`);
  const walletSnap = await walletRef.get();
  const balance = (walletSnap.data()?.balance ?? 0) + 100;
  await walletRef.set({ balance, balanceACU: balance, updatedAt: now }, { merge: true });

  console.log('\nChild Free test account ready.\n');
  console.log('  Plan:     Child Free (standalone — not combined with paid plans)');
  console.log('  ACUs:     100/month on FREE tier only');
  console.log(`  Email:    ${STUDENT_EMAIL}`);
  console.log(`  Password: ${STUDENT_PASSWORD}`);
  console.log('\nLogin at /login then check Account or /checkout for Child Free.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
