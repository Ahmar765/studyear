
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/firebase/client-app';

export async function createCheckoutSession(productCode: string, userId: string | undefined): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'You must be logged in to make a purchase.' };
  }
  
  try {
    const functions = getFunctions(getFirebaseApp(), 'europe-west2');
    const createStripeCheckoutSessionFn = httpsCallable(functions, 'createStripeCheckoutSession');
    
    // Pass the userId to the Cloud Function so it can be added to Stripe's metadata
    const result = await createStripeCheckoutSessionFn({ productCode, userId });
    const data = result.data as { sessionId?: string };

    if (data.sessionId) {
      return { success: true, sessionId: data.sessionId };
    } else {
      return { success: false, error: 'Failed to create checkout session.' };
    }
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return { success: false, error: error.message || 'An unexpected server error occurred.' };
  }
}
