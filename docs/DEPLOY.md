# Deploying StudYear (Firebase App Hosting)

Project: `revision-rocket-4nuir` (see `.firebaserc`).

## Symptom: stuck on “Launching your learning experience…”

The homepage waited for Firebase Auth before rendering. If `NEXT_PUBLIC_FIREBASE_*` is missing at **build time**, auth never starts and the splash never clears.

**Fix:** Add all variables below in [Firebase Console](https://console.firebase.google.com) → **App Hosting** → your backend → **Environment variables**, then **roll out a new build**.

`NEXT_PUBLIC_*` variables must be present for **BUILD** and **RUNTIME** (default in console).

## Required environment variables

### Client (browser) — prefix `NEXT_PUBLIC_`

Copy values from Firebase Console → Project settings → Your web app:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MEASUREMENT_ID` (optional)

### Server (Firestore, Auth admin, contact form, billing)

One of:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — full service account JSON (one line), **or**
- `GOOGLE_APPLICATION_CREDENTIALS` — path to JSON file (local only)

Also set:

- `GEMINI_API_KEY` — AI features
- `NEXT_PUBLIC_APP_URL` — e.g. `https://studyear.com` (Stripe redirects)

### Stripe (checkout)

Set in **Firebase App Hosting → Environment variables** (BUILD + RUNTIME for `NEXT_PUBLIC_*`):

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — starts with `pk_live_…`
- `STRIPE_SECRET_KEY` — **must start with `sk_live_…`** (standard Secret key from Stripe → Developers → API keys). Do **not** use a publishable key (`pk_`) here. Restricted keys (`rk_`) only work if granted Checkout, Customers, Prices, Coupons, and Webhooks permissions.
- `STRIPE_WEBHOOK_SECRET` — from Stripe → Developers → Webhooks → your endpoint → Signing secret (`whsec_…`). Endpoint URL: `https://studyear.com/api/webhooks/stripe`
- `STRIPE_PRICE_STUDENT_PREMIUM`, `STRIPE_PRICE_STUDENT_PREMIUM_PLUS`, etc. (see `.env.template`)

**Webhook events required:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`

After updating keys in Firebase, **roll out a new deployment**. Verify in **Admin → Billing → Stripe connection** panel.

Local check: `npm run stripe:check-env`

### Email (signup welcome + admin ACU credits + contact form)

Triggers when `MAIL_*` is set:

- **New registration** — welcome email after `signup` (copy editable in Admin → Settings → Communications).
- **Admin → Users → Adjust ACUs** — confirmation email to that user with amount and new balance.
- **Stripe ACU checkout** — receipt email (existing).
- **Contact form** — notification to your contact inbox (existing).

### Email env (optional; contact form still saves to Firestore without mail)

- `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_SECURE`
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`

### Cloudinary (uploads)

Server (production): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`  
Or client preset: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## Local vs production

- **Local:** copy `.env.template` → `.env` and fill in values.
- **Production:** never commit `.env`. Set the same keys in App Hosting (or `apphosting.yaml` with Secret Manager for passwords).

## After changing env

Trigger a new deployment (push to connected branch or “Roll out” in console). Next.js bakes `NEXT_PUBLIC_*` into the client bundle at build time.

## Checklist

1. All `NEXT_PUBLIC_FIREBASE_*` set in App Hosting  
2. `FIREBASE_SERVICE_ACCOUNT_JSON` or ADC for Admin SDK  
3. `NEXT_PUBLIC_APP_URL` matches live domain  
4. Redeploy and hard-refresh the browser (Ctrl+F5)
