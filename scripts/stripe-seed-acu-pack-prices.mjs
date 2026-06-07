/**
 * Create one-time Stripe Prices for ACU top-ups — no Stripe Dashboard needed.
 * Uses STRIPE_SECRET_KEY from `.env`.
 *
 * Writes Price metadata `productCode`: MINI_BOOST | CORE_BOOST | GROWTH_BOOST | EXAM_BOOST | POWER_BOOST
 * (must match checkout / webhook; legacy ENTRY/GROWTH/SCALE still accepted via aliases).
 *
 * Usage (repo root):
 *   npm run stripe:seed-acu-packs              → always creates new products + prices
 *   npm run stripe:seed-acu-packs:missing      → reuse valid one-time price_* from .env; create missing/wrong-type
 *
 * Paste printed lines into `.env`:
 *   STRIPE_PRICE_TOPUP_MINI, STRIPE_PRICE_TOPUP_CORE, STRIPE_PRICE_TOPUP_GROWTH,
 *   STRIPE_PRICE_TOPUP_EXAM, STRIPE_PRICE_TOPUP_POWER
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const onlyMissing = process.argv.includes('--only-missing');

/** GBP one-time packs — keep in sync with `src/data/acu-packages.ts` */
const PACKS = [
  {
    code: 'MINI_BOOST',
    envKey: 'STRIPE_PRICE_TOPUP_MINI',
    name: 'StudYear ACU — Mini Boost (£3)',
    amountPence: 300,
  },
  {
    code: 'CORE_BOOST',
    envKey: 'STRIPE_PRICE_TOPUP_CORE',
    name: 'StudYear ACU — Core Boost (£5)',
    amountPence: 500,
  },
  {
    code: 'GROWTH_BOOST',
    envKey: 'STRIPE_PRICE_TOPUP_GROWTH',
    name: 'StudYear ACU — Growth Boost (£10)',
    amountPence: 1000,
  },
  {
    code: 'EXAM_BOOST',
    envKey: 'STRIPE_PRICE_TOPUP_EXAM',
    name: 'StudYear ACU — Exam Boost (£20)',
    amountPence: 2000,
  },
  {
    code: 'POWER_BOOST',
    envKey: 'STRIPE_PRICE_TOPUP_POWER',
    name: 'StudYear ACU — Power Boost (£30)',
    amountPence: 3000,
  },
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
  console.warn('⚠️  LIVE secret — creates real billable prices.\n');
}

const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });
const currency = (process.env.STRIPE_SEED_CURRENCY || 'gbp').toLowerCase();

async function oneTimePriceIdOrNull(priceId) {
  try {
    const p = await stripe.prices.retrieve(priceId);
    if (p.type === 'one_time') return priceId;
    console.log(`  (${priceId} is "${p.type}" — ACU packs need one_time.)`);
    return null;
  } catch (e) {
    console.warn(`  (Could not load ${priceId}: ${e.message})`);
    return null;
  }
}

async function main() {
  console.log(
    onlyMissing
      ? '\nEnsuring one-time ACU prices (reuse valid IDs from .env)...\n'
      : '\nCreating Products + one-time Prices for ACU packs...\n',
  );

  const lines = [];
  let created = 0;

  for (const pack of PACKS) {
    const existing = process.env[pack.envKey]?.trim();

    if (onlyMissing && existing?.startsWith('price_')) {
      const keep = await oneTimePriceIdOrNull(existing);
      if (keep) {
        console.log(`${pack.code}: keeping ${pack.envKey}=${keep}\n`);
        lines.push(`${pack.envKey}=${keep}`);
        continue;
      }
      console.log(`${pack.code}: creating new price for ${pack.envKey}\n`);
    }

    const product = await stripe.products.create({
      name: pack.name,
      metadata: { productCode: pack.code },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: pack.amountPence,
      metadata: { productCode: pack.code },
    });

    lines.push(`${pack.envKey}=${price.id}`);
    created += 1;
    console.log(`${pack.code} (new one-time)`);
    console.log(`  product=${product.id}`);
    console.log(`  ${pack.envKey}=${price.id}\n`);
  }

  console.log('--- .env block ---\n');
  console.log(lines.join('\n'));
  console.log('\n---\n');
  if (onlyMissing && created === 0) {
    console.log('All ACU price env vars already point at valid one-time prices.\n');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
