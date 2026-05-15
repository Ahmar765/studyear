
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import {
  SystemSettingsSchema,
  type SystemSettings,
} from '@/server/schemas/system-settings';

const defaultSettings: SystemSettings = {
  featureFlags: {
    tutor_marketplace: true,
    parent_dashboard: true,
    school_portal: true,
    ai_feedback: true,
  },
  pricingRules: {
    multiplier: 3,
    tutor_commission: 20,
  },
  communications: {
    supportEmail: 'support@studyear.ai',
    contactEmail: 'contact@studyear.ai',
    noreplyEmail: 'noreply@studyear.ai',
    forgotPassword: {
      title: 'Check your inbox',
      description:
        'If an account exists for that email, we sent a password reset link. Check spam or contact support.',
      body: "Enter your email and we'll send you a link to reset your password.",
    },
    contactForm: {
      title: 'Message sent',
      description: 'Thank you for contacting us. We will get back to you shortly.',
    },
    signupWelcome: {
      title: 'Account created',
      description: 'You can now complete your profile.',
    },
  },
  aiProvider: {
    defaultProvider: 'gemini',
    fallbackOrder: ['vertex', 'openai'],
    modelMap: {
      openai: { costEffective: 'gpt-4-turbo', performance: 'gpt-4o' },
      // Genkit / Gemini API: prefer 2.5 series; 1.5 IDs are often retired or error-prone.
      gemini: { costEffective: 'gemini-2.5-flash', performance: 'gemini-2.5-pro' },
      vertex: { costEffective: 'gemini-2.5-flash', performance: 'gemini-2.5-pro' },
    },
  },
};

function mergeAiProvider(
  base: NonNullable<SystemSettings['aiProvider']>,
  override?: SystemSettings['aiProvider'],
): NonNullable<SystemSettings['aiProvider']> {
  if (!override) return base;
  return {
    ...base,
    ...override,
    defaultProvider: override.defaultProvider ?? base.defaultProvider,
    fallbackOrder: override.fallbackOrder ?? base.fallbackOrder,
    modelMap: {
      openai: { ...base.modelMap.openai, ...override.modelMap?.openai },
      gemini: { ...base.modelMap.gemini, ...override.modelMap?.gemini },
      vertex: { ...base.modelMap.vertex, ...override.modelMap?.vertex },
    },
  };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const docRef = adminDb.collection('system_settings').doc('global');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data() as Partial<SystemSettings>;
      /** Shallow merge was wiping `modelMap` when Firestore only stored partial `aiProvider`. */
      return {
        ...defaultSettings,
        ...data,
        featureFlags: { ...defaultSettings.featureFlags, ...data.featureFlags },
        pricingRules: { ...defaultSettings.pricingRules, ...data.pricingRules },
        aiProvider: mergeAiProvider(defaultSettings.aiProvider!, data.aiProvider),
        communications: { ...defaultSettings.communications, ...data.communications },
      };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return defaultSettings;
  }
}

export async function updateSystemSettingsAction(settings: SystemSettings) {
  try {
    const validatedSettings = SystemSettingsSchema.parse(settings);
    const docRef = adminDb.collection('system_settings').doc('global');
    await docRef.set(validatedSettings, { merge: true });
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error updating system settings:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/** Public copy for login, contact, forgot-password pages (no secrets). */
export async function getPublicCommunicationsSettings() {
  const settings = await getSystemSettings();
  return settings.communications ?? defaultSettings.communications!;
}

export async function submitContactFormAction(input: {
  fullName: string;
  email: string;
  enquiryType: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const fullName = input.fullName?.trim();
    const email = input.email?.trim().toLowerCase();
    const message = input.message?.trim();
    if (!fullName || !email || !message) {
      return { success: false, error: 'Please complete all required fields.' };
    }
    await adminDb.collection('contact_submissions').add({
      fullName,
      email,
      enquiryType: input.enquiryType?.trim() || 'support',
      message,
      status: 'NEW',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'Could not send your message. Please try again.' };
  }
}
