
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { manageSubscriptionStatusChange, updateUserAcuBalance } from '@/server/lib/billing';
import type { SubscriptionType } from '@/server/schemas';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

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
            await updateUserAcuBalance(userId, session.metadata.productCode);
            // Also log the payment
             await adminDb.collection('payments').add({
                userId: userId,
                amount: session.amount_total, // Amount in cents
                currency: session.currency,
                productCode: session.metadata.productCode,
                stripeCheckoutId: session.id,
                status: session.payment_status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Updated ACU balance and logged payment for user ${userId} with product ${session.metadata.productCode}`);
        }
        
        if (session.mode === 'subscription') {
            const subscriptionId = session.subscription as string;
            const subscriptionType = session.metadata?.productCode as SubscriptionType;
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
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const userId =
          invoice.customer_metadata?.userId || subscription.metadata?.userId;
        if (!userId) {
          console.error(
            'Webhook Error: Missing userId on invoice.paid (set subscription metadata userId from Checkout).',
          );
          break;
        }
        const productCode =
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode;

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
        console.log(`Subscription renewed for user ${userId}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const userId =
          invoice.customer_metadata?.userId || subscription.metadata?.userId;
        if (!userId) {
          console.error(
            'Webhook Error: Missing userId on invoice.payment_failed (subscription metadata userId).',
          );
          break;
        }
        const productCode =
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode;

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
        const userId = subscription.metadata.userId;
         if (!userId) {
            console.error('Webhook Error: Missing userId in customer.subscription.deleted metadata.');
            break;
        }
        const productCode =
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode;
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
        const userId = subscription.metadata.userId;
         if (!userId) {
            console.error('Webhook Error: Missing userId in customer.subscription.updated metadata.');
            break;
        }
        const productCode =
          subscription.items.data[0]?.price?.metadata?.productCode ||
          subscription.metadata?.productCode;
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
