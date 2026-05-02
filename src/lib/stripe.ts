
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publicKey) {
      throw new Error("Missing Stripe public key. Make sure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in your .env file.");
    }
    stripePromise = loadStripe(publicKey);
  }
  return stripePromise;
};
