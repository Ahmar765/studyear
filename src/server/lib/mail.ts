import nodemailer from 'nodemailer';
import { getSystemSettings } from '@/server/actions/settings-actions';

type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function smtpConfigured(): boolean {
  return Boolean(
    process.env.MAIL_SMTP_HOST?.trim() &&
      process.env.MAIL_USERNAME?.trim() &&
      process.env.MAIL_PASSWORD?.trim(),
  );
}

function createTransport() {
  const port = Number(process.env.MAIL_SMTP_PORT || 465);
  const secure =
    process.env.MAIL_SMTP_SECURE === 'true' || process.env.MAIL_SMTP_SECURE === '1' || port === 465;
  return nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST!.trim(),
    port,
    secure,
    auth: {
      user: process.env.MAIL_USERNAME!.trim(),
      pass: process.env.MAIL_PASSWORD!.trim(),
    },
  });
}

export async function sendPlatformEmail(
  input: SendMailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!smtpConfigured()) {
    console.warn('[mail] SMTP not configured (set MAIL_PASSWORD and related env vars).');
    return { sent: false, error: 'smtp_not_configured' };
  }

  const fromAddress =
    process.env.MAIL_FROM_ADDRESS?.trim() ||
    process.env.MAIL_USERNAME?.trim() ||
    'noreply@studyear.com';
  const fromName = process.env.MAIL_FROM_NAME?.trim() || 'StudYear';

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, '<br/>'),
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[mail] send failed:', message);
    return { sent: false, error: message };
  }
}

export async function sendContactFormNotification(input: {
  fullName: string;
  email: string;
  enquiryType: string;
  message: string;
}): Promise<{ sent: boolean }> {
  const settings = await getSystemSettings();
  const to =
    settings.communications?.contactEmail?.trim() ||
    settings.communications?.supportEmail?.trim() ||
    'contact@studyear.com';

  const result = await sendPlatformEmail({
    to,
    replyTo: input.email,
    subject: `[StudYear Contact] ${input.enquiryType} — ${input.fullName}`,
    text: [
      `Name: ${input.fullName}`,
      `Email: ${input.email}`,
      `Type: ${input.enquiryType}`,
      '',
      input.message,
    ].join('\n'),
  });
  return { sent: result.sent };
}

export async function sendWelcomeEmail(email: string, name?: string | null): Promise<void> {
  const settings = await getSystemSettings();
  const title = settings.communications?.signupWelcome?.title ?? 'Welcome to StudYear';
  const body =
    settings.communications?.signupWelcome?.description ??
    'Your account is ready. Sign in to complete your profile and start learning.';

  await sendPlatformEmail({
    to: email,
    subject: title,
    text: `Hi ${name?.trim() || 'there'},\n\n${body}\n\n— StudYear`,
  });
}

export async function sendAcuTopUpReceiptEmail(input: {
  email: string;
  name?: string | null;
  acus: number;
  amountGbp: string;
}): Promise<void> {
  await sendPlatformEmail({
    to: input.email,
    subject: 'StudYear — ACU top-up receipt',
    text: [
      `Hi ${input.name?.trim() || 'there'},`,
      '',
      `Your wallet was credited with ${input.acus.toLocaleString()} ACUs.`,
      `Amount paid: ${input.amountGbp}`,
      '',
      'Thank you for using StudYear.',
    ].join('\n'),
  });
}
