
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import {
  grantSubscriptionMonthlyAcusForInvoice,
  manageSubscriptionStatusChange,
  recordAcuTopUpFromCheckoutSession,
} from '@/server/lib/billing';
import { recordDiscountRedemption } from '@/server/lib/discount-codes';
import type { SubscriptionType } from '@/server/schemas';
import { sendSubscriptionReceiptEmail } from '@/server/lib/mail';
import { subscriptionTypeDisplayName } from '@/data/subscription-plans';
import { adminDb } from '@/lib/firebase/admin-app';
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
      console.error('Stripe webhook secret is not set.');
      return new NextResponse('Webhook secret not configured', { status: 500 });
  }
  
  let event: Stripe.Event;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('✅ Stripe Webhook Success:', event.id, event.type);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session?.metadata?.userId;

        if (!userId) {
            console.error('Webhook Error: Missing userId in checkout.session.completed metadata.');
            break;
        }

        if (session.mode === 'payment' && session.metadata?.productCode) {
            if (session.metadata?.discountCode && session.payment_status === 'paid') {
              await recordDiscountRedemption(
                session.metadata.discountCode,
                session.id,
              ).catch((err) =>
                console.error('discount redemption record failed', err),
              );
            }
            const outcome = await recordAcuTopUpFromCheckoutSession(session);
            if (outcome.ok && !outcome.duplicate) {
              console.log(
                `Updated ACU balance and logged payment for user ${userId} with product ${session.metadata.productCode}`,
              );
            } else if (outcome.ok && outcome.duplicate) {
              console.log(`checkout.session.completed duplicate/skipped for session ${session.id}`);
            } else if (!outcome.ok) {
              console.error(`recordAcuTopUpFromCheckoutSession failed for session ${session.id}:`, outcome.reason);
            }
        }
        
        if (session.mode === 'subscription') {
            if (session.metadata?.discountCode && session.payment_status === 'paid') {
              await recordDiscountRedemption(
                session.metadata.discountCode,
                session.id,
              ).catch((err) =>
                console.error('discount redemption record failed', err),
              );
            }
            const subscriptionId = session.subscription as string;
            const subscriptionType = session.metadata?.productCode
              ?.trim()
              .toUpperCase() as SubscriptionType;
            if (!subscriptionType) {
              console.error(`Webhook Error: Missing productCode in metadata for subscription checkout session ${session.id}`);
              break;
            }
            await manageSubscriptionStatusChange(
                subscriptionId,
                session.customer as string,
                userId,
                subscriptionType,
                'ACTIVE'
            );
            console.log(`Created subscription for user ${userId}`);
            try {
              const userSnap = await adminDb.doc(`users/${userId}`).get();
              const userEmail = userSnap.data()?.email as string | undefined;
              if (userEmail) {
                const amountGbp =
                  typeof session.amount_total === 'number'
                    ? `£${(session.amount_total / 100).toFixed(2)}`
                    : undefined;
                void sendSubscriptionReceiptEmail({
                  email: userEmail,
                  name: userSnap.data()?.name as string | undefined,
                  planLabel: subscriptionTypeDisplayName(subscriptionType),
                  amountGbp,
                }).catch((err) =>
                  console.error('[stripe] subscription receipt email failed:', err),
                );
              }
            } catch (mailErr) {
              console.error('[stripe] could not send subscription receipt:', mailErr);
            }
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.error(
            'Webhook Error: Missing userId on invoice.paid (subscription.metadata.userId from Checkout).',
          );
          break;
        }
        const productCode = (
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode
        )
          ?.trim()
          .toUpperCase();

        if (!productCode) {
          console.error(
            `Webhook Error: Missing productCode for subscription ${subscription.id} (Stripe Price metadata or subscription metadata).`,
          );
          break;
        }
        await manageSubscriptionStatusChange(
            invoice.subscription as string,
            invoice.customer as string,
            userId,
            productCode as SubscriptionType,
            'ACTIVE'
        );

        const grant = await grantSubscriptionMonthlyAcusForInvoice({
          userId,
          invoiceId: invoice.id,
          amountPaidPence: invoice.amount_paid ?? 0,
          productCode: productCode as SubscriptionType,
        });
        if (grant.granted) {
          console.log(
            `Subscription ACUs (${grant.acus}) credited for invoice ${invoice.id}`,
          );
        } else if (grant.skipReason && grant.skipReason !== 'no_monthly_acu_allowance') {
          console.log(
            `Subscription ACU grant skipped for invoice ${invoice.id}: ${grant.skipReason}`,
          );
        }

        console.log(`Subscription renewed for user ${userId}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.error(
            'Webhook Error: Missing userId on invoice.payment_failed (subscription.metadata.userId).',
          );
          break;
        }
        const productCode = (
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode
        )
          ?.trim()
          .toUpperCase();

        if (!productCode) {
          console.error(
            `Webhook Error: Missing productCode for subscription ${subscription.id}.`,
          );
          break;
        }
        await manageSubscriptionStatusChange(
            invoice.subscription as string,
            invoice.customer as string,
            userId,
            productCode as SubscriptionType,
            'PENDING_PAYMENT'
        );
        console.log(`Subscription payment failed for user ${userId}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
         if (!userId) {
            console.error('Webhook Error: Missing userId in customer.subscription.deleted metadata.');
            break;
        }
        const productCode = (
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode
        )
          ?.trim()
          .toUpperCase();
        if (!productCode) {
          console.error(
            `Webhook Error: Missing productCode for subscription ${subscription.id}.`,
          );
          break;
        }
        await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            userId,
            productCode as SubscriptionType,
            'CANCELLED'
        );
         console.log(`Subscription cancelled for user ${userId}`);
        break;
      }
       case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
         if (!userId) {
            console.error('Webhook Error: Missing userId in customer.subscription.updated metadata.');
            break;
        }
        const productCode = (
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode
        )
          ?.trim()
          .toUpperCase();
        if (!productCode) {
          console.error(
            `Webhook Error: Missing productCode for subscription ${subscription.id}.`,
          );
          break;
        }
        await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            userId,
            productCode as SubscriptionType,
            (subscription.status === 'active' || subscription.status === 'trialing') ? 'ACTIVE' : 'INACTIVE'
        );
         console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
        break;
      }
      default:
        console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new NextResponse('Webhook handler error.', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
