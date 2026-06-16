/**
 * Register (or replace) a Stripe webhook endpoint via API — no Dashboard needed.
 *
 * Prerequisites: STRIPE_SECRET_KEY in `.env`, and a public HTTPS URL to your app.
 *
 * Usage:
 *   STRIPE_WEBHOOK_URL=https://your-app.example.com/api/webhooks/stripe node scripts/stripe-register-webhook.mjs
 *   STRIPE_WEBHOOK_URL=https://abc.ngrok-free.app/api/webhooks/stripe node scripts/stripe-register-webhook.mjs
 *
 * With --replace (default): deletes existing endpoints that use the SAME URL, then creates one fresh and prints the signing secret once.
 *
 * Add to `.env`:
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
  'charge.refunded',
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
const url = process.env.STRIPE_WEBHOOK_URL?.trim();
const skipReplace = process.argv.includes('--no-replace');

if (!secret?.trim()) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
if (!url?.startsWith('http')) {
  console.error(
    'Set STRIPE_WEBHOOK_URL to your full webhook URL, e.g.\n' +
      '  STRIPE_WEBHOOK_URL=https://YOUR_HOST/api/webhooks/stripe node scripts/stripe-register-webhook.mjs',
  );
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: '2024-04-10' });

async function main() {
  if (!skipReplace) {
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    for (const ep of list.data) {
      if (ep.url === url) {
        console.log(`Removing existing endpoint ${ep.id} (${url})`);
        await stripe.webhookEndpoints.del(ep.id);
      }
    }
  }

  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: 'StudYear (CLI registration)',
  });

  console.log('\nCreated webhook endpoint:', created.id);
  console.log('\nAdd this line to .env (secret is shown only now):\n');
  console.log(`STRIPE_WEBHOOK_SECRET=${created.secret}\n`);
  console.log('Enabled events:', EVENTS.join(', '));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
