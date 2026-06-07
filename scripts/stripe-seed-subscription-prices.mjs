/**
 * Create recurring monthly Stripe Prices for StudYear subscriptions — no Dashboard UI needed.
 * Uses STRIPE_SECRET_KEY from `.env`.
 *
 * Usage (repo root):
 *   npm run stripe:seed-subscription-prices              → creates new products/prices
 *   npm run stripe:seed-subscription-prices:missing       → keeps recurring price_ IDs from .env;
 *                                                          replaces missing OR one-time IDs with new monthly prices
 *
 * ACU one-time packs (different script): `npm run stripe:seed-acu-packs` → STRIPE_PRICE_TOPUP_* vars.
 * Webhook signing secret (dashboard-free): `npm run stripe:register-webhook` (needs STRIPE_WEBHOOK_URL) or Stripe CLI `stripe listen`.
 *
 * Env vars used by the app (see billing-actions.ts):
 *   STRIPE_PRICE_STUDENT_ACCESS, STRIPE_PRICE_STUDENT_PREMIUM, STRIPE_PRICE_STUDENT_PREMIUM_PLUS,
 *   STRIPE_PRICE_STUDENT_MAX, STRIPE_PRICE_PARENT_VIEW, STRIPE_PRICE_PARENT_PRO,
 *   STRIPE_PRICE_PARENT_PRO_PLUS, STRIPE_PRICE_PARENT_ELITE,
 *   STRIPE_PRICE_SCHOOL_STARTER, STRIPE_PRICE_SCHOOL_GROWTH, STRIPE_PRICE_SCHOOL_ENTERPRISE
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const onlyMissing = process.argv.includes('--only-missing');

/** GBP amounts — keep in sync with `src/data/subscription-plans.ts` */
const PLANS = [
  { code: 'STUDENT_ACCESS', name: 'StudYear — Student Access', amountPence: 500 },
  { code: 'STUDENT_PREMIUM', name: 'StudYear — Student Premium', amountPence: 1000 },
  { code: 'STUDENT_PREMIUM_PLUS', name: 'StudYear — Student Premium+', amountPence: 2000 },
  { code: 'STUDENT_MAX', name: 'StudYear — Student Max', amountPence: 3000 },
  { code: 'PARENT_VIEW', name: 'StudYear — Parent View', amountPence: 500 },
  { code: 'PARENT_PRO', name: 'StudYear — Parent Pro', amountPence: 1000 },
  { code: 'PARENT_PRO_PLUS', name: 'StudYear — Parent Pro+', amountPence: 2000 },
  { code: 'PARENT_ELITE', name: 'StudYear — Parent Elite', amountPence: 3900 },
  { code: 'SCHOOL_STARTER', name: 'StudYear — Small School', amountPence: 9900 },
  { code: 'SCHOOL_GROWTH', name: 'StudYear — Medium School', amountPence: 19900 },
  { code: 'SCHOOL_ENTERPRISE', name: 'StudYear — Large School', amountPence: 39900 },
];

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

loadDotEnv();

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret?.trim()) {
  console.error('Missing STRIPE_SECRET_KEY in environment or .env');
  process.exit(1);
}

if (secret.startsWith('sk_live')) {
  console.warn('⚠️  Using a LIVE secret key — this creates real billable prices in production.');
}

const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });
const currency = (process.env.STRIPE_SEED_CURRENCY || 'gbp').toLowerCase();

async function recurringPriceIdOrNull(priceId) {
  try {
    const p = await stripe.prices.retrieve(priceId);
    if (p.type === 'recurring') return priceId;
    console.log(
      `  (Stripe reports ${priceId} as "${p.type}" — subscriptions need "recurring".)`,
    );
    return null;
  } catch (e) {
    console.warn(`  (Could not load ${priceId}: ${e.message})`);
    return null;
  }
}

async function main() {
  console.log(
    onlyMissing
      ? '\nEnsuring recurring monthly prices (reuse valid IDs from .env; fix one-time/missing)...\n'
      : '\nCreating Products + recurring monthly Prices (always new)...\n',
  );

  const lines = [];
  let created = 0;

  for (const plan of PLANS) {
    const envName = `STRIPE_PRICE_${plan.code}`;
    const existing = process.env[envName]?.trim();

    if (onlyMissing && existing?.startsWith('price_')) {
      const keep = await recurringPriceIdOrNull(existing);
      if (keep) {
        console.log(`${plan.code}: keeping recurring ${envName}=${keep}\n`);
        lines.push(`${envName}=${keep}`);
        continue;
      }
      console.log(`${plan.code}: will create new recurring price for ${envName}\n`);
    }

    const product = await stripe.products.create({
      name: plan.name,
      metadata: { productCode: plan.code },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: plan.amountPence,
      recurring: { interval: 'month' },
      metadata: { productCode: plan.code },
    });

    lines.push(`${envName}=${price.id}`);
    created += 1;
    console.log(`${plan.code} (new)`);
    console.log(`  product=${product.id}`);
    console.log(`  ${envName}=${price.id}\n`);
  }

  console.log('--- .env block (merge / append new lines only) ---\n');
  console.log(lines.join('\n'));
  console.log('\n---\n');
  if (onlyMissing && created === 0) {
    console.log(
      'Nothing new created — every STRIPE_PRICE_* in .env already points at a recurring monthly price.\n',
    );
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
