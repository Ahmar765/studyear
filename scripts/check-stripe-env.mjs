/**
 * Verify Stripe env vars and API connectivity (reads `.env` locally — never commit secrets).
 *
 *   npm run stripe:check-env
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

loadDotEnv();

const secret = process.env.STRIPE_SECRET_KEY?.trim();
const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();

console.log('Stripe env check\n');
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', publishable ? `${publishable.slice(0, 12)}…` : 'MISSING');
console.log('STRIPE_SECRET_KEY:', secret ? `${secret.slice(0, 8)}… (${secret.length} chars)` : 'MISSING');
console.log('STRIPE_WEBHOOK_SECRET:', webhook ? `${webhook.slice(0, 8)}…` : 'MISSING');

if (!secret) {
  console.error('\nSet STRIPE_SECRET_KEY in .env or Firebase App Hosting.');
  process.exit(1);
}

if (secret.startsWith('pk_')) {
  console.error('\nERROR: STRIPE_SECRET_KEY is a publishable key (pk_). Use sk_live_… from Stripe Dashboard.');
  process.exit(1);
}

if (secret.startsWith('rk_')) {
  console.warn(
    '\nWARN: Restricted key (rk_). Checkout needs sk_live_… unless this rk_ key has full Checkout permissions.',
  );
}

const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });

try {
  const balance = await stripe.balance.retrieve();
  console.log('\nAPI connection: OK');
  console.log('Live mode:', balance.livemode);
} catch (err) {
  console.error('\nAPI connection: FAILED');
  console.error(err.message || err);
  process.exit(1);
}

const samplePrice = process.env.STRIPE_PRICE_STUDENT_PREMIUM?.trim();
if (samplePrice) {
  try {
    const price = await stripe.prices.retrieve(samplePrice);
    console.log(`Price ${samplePrice}: OK (${price.currency} ${(price.unit_amount ?? 0) / 100})`);
  } catch (err) {
    console.warn(`Price ${samplePrice}: not found on this Stripe account — re-run stripe:seed-subscription-prices`);
  }
}

const priceVars = Object.entries(process.env).filter(([k]) => k.startsWith('STRIPE_PRICE_'));
if (priceVars.length > 0) {
  console.log('\nAll STRIPE_PRICE_* in .env:');
  for (const [key, id] of priceVars.sort(([a], [b]) => a.localeCompare(b))) {
    if (!id?.trim()) {
      console.log(`  ${key}: (empty)`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id.trim());
      const amount = (price.unit_amount ?? 0) / 100;
      const recurring = price.recurring ? ` / ${price.recurring.interval}` : ' (one-time)';
      console.log(`  ${key}: OK — ${price.currency} ${amount}${recurring}`);
    } catch {
      console.log(`  ${key}: NOT FOUND on this account (${id})`);
    }
  }
}

console.log('\nProduction: set the same vars in Firebase → App Hosting → Environment variables, then redeploy.');
