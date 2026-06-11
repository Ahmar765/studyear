
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import {
  SystemSettingsSchema,
  type SystemSettings,
} from '@/server/schemas/system-settings';
import {
  getMailDeliveryStatus,
  sendContactFormNotification,
  sendContactInboxReplyEmail,
  sendTestEmail,
  verifySmtpConnection,
} from '@/server/lib/mail';
import { getVerifiedUser } from '@/server/lib/auth';
import { ensurePlatformAdminAccess, isPlatformAdmin } from '@/server/lib/platform-admin';

const defaultSettings: SystemSettings = {
  featureFlags: {
    tutor_marketplace: true,
    parent_dashboard: true,
    school_portal: true,
    ai_feedback: true,
  },
  pricingRules: {
    multiplier: 3,
    tutor_commission: 15,
  },
  communications: {
    supportEmail: 'support@studyear.com',
    contactEmail: 'contact@studyear.com',
    noreplyEmail: 'contact@studyear.com',
    businessDetails: {
      companyName: 'StudYear Ltd.',
      registeredAddress: '123 Learning Lane, London, UK, SW1A 0AA',
    },
    forgotPassword: {
      title: 'Check your inbox',
      description:
        'If an account exists for that email, we sent a password reset link. Check your spam or junk folder — messages from new senders often land there until your mail provider learns to trust them.',
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
        communications: {
          ...defaultSettings.communications,
          ...data.communications,
          businessDetails: {
            ...defaultSettings.communications?.businessDetails,
            ...data.communications?.businessDetails,
          },
        },
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
}): Promise<{ success: boolean; emailSent?: boolean; inbox?: string; error?: string }> {
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

    const mail = await sendContactFormNotification({
      fullName,
      email,
      enquiryType: input.enquiryType?.trim() || 'support',
      message,
    });
    if (!mail.sent) {
      console.warn('[contact] stored in Firestore but outbound email was not sent (check MAIL_* env).');
    }

    return { success: true, emailSent: mail.sent, inbox: mail.inbox };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'Could not send your message. Please try again.' };
  }
}

async function assertPlatformAdmin(idToken?: string | null) {
  const user = await getVerifiedUser(idToken);
  if (!user) throw new Error('You must be signed in.');
  await ensurePlatformAdminAccess(user.uid, user.email);
  if (!(await isPlatformAdmin(user.uid, user))) {
    throw new Error('Administrator access required.');
  }
  return user;
}

export async function getMailDeliveryStatusAction(idToken?: string | null) {
  try {
    await assertPlatformAdmin(idToken);
    const status = await getMailDeliveryStatus();
    const verify = status.configured ? await verifySmtpConnection() : { ok: false };
    return {
      success: true,
      ...status,
      connectionOk: verify.ok,
      connectionError: verify.error,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function sendTestEmailAction(idToken: string | null | undefined, to: string) {
  try {
    await assertPlatformAdmin(idToken);
    const email = to.trim().toLowerCase();
    if (!email.includes('@')) {
      return { success: false, error: 'Enter a valid email address.' };
    }
    const result = await sendTestEmail(email);
    return {
      success: result.sent,
      error: result.sent ? undefined : result.error ?? 'Email could not be sent.',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export type ContactSubmissionRow = {
  id: string;
  fullName: string;
  email: string;
  enquiryType: string;
  message: string;
  status: string;
  createdAt: string;
};

export async function listContactSubmissionsAction(
  idToken?: string | null,
): Promise<{ success: boolean; submissions: ContactSubmissionRow[]; inbox?: string; error?: string }> {
  try {
    await assertPlatformAdmin(idToken);
    const inbox = (await getMailDeliveryStatus()).contactInbox;
    const snap = await adminDb
      .collection('contact_submissions')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const submissions: ContactSubmissionRow[] = snap.docs.map((doc) => {
      const d = doc.data();
      const created = d.createdAt as admin.firestore.Timestamp | undefined;
      return {
        id: doc.id,
        fullName: (d.fullName as string) ?? '',
        email: (d.email as string) ?? '',
        enquiryType: (d.enquiryType as string) ?? 'support',
        message: (d.message as string) ?? '',
        status: (d.status as string) ?? 'NEW',
        createdAt: created?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return { success: true, submissions, inbox };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, submissions: [], error: msg };
  }
}

export async function updateContactSubmissionStatusAction(
  idToken: string | null | undefined,
  submissionId: string,
  status: 'NEW' | 'READ' | 'REPLIED',
) {
  try {
    await assertPlatformAdmin(idToken);
    await adminDb.collection('contact_submissions').doc(submissionId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function replyToContactSubmissionAction(
  idToken: string | null | undefined,
  input: {
    submissionId: string;
    subject: string;
    message: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await assertPlatformAdmin(idToken);
    const subject = input.subject?.trim();
    const message = input.message?.trim();
    if (!subject || !message) {
      return { success: false, error: 'Subject and message are required.' };
    }

    const ref = adminDb.collection('contact_submissions').doc(input.submissionId);
    const snap = await ref.get();
    if (!snap.exists) {
      return { success: false, error: 'Submission not found.' };
    }

    const data = snap.data()!;
    const toEmail = (data.email as string)?.trim().toLowerCase();
    const toName = (data.fullName as string)?.trim() ?? '';
    if (!toEmail || !toEmail.includes('@')) {
      return { success: false, error: 'This submission has no valid email address.' };
    }

    const mail = await sendContactInboxReplyEmail({
      toEmail,
      toName,
      subject,
      body: message,
      originalMessage: (data.message as string) ?? '',
      enquiryType: (data.enquiryType as string) ?? 'support',
    });

    if (!mail.sent) {
      return {
        success: false,
        error: mail.error ?? 'Email could not be sent. Check SMTP settings.',
      };
    }

    await ref.update({
      status: 'REPLIED',
      lastReplyAt: admin.firestore.FieldValue.serverTimestamp(),
      lastReplyBy: adminUser.email ?? adminUser.uid,
      lastReplySubject: subject,
      replyCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
