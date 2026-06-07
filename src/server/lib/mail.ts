import nodemailer from 'nodemailer';
import { readSystemSettingsCommunications } from '@/server/lib/system-settings-read';

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
}): Promise<{ sent: boolean; error?: string }> {
  const communications = await readSystemSettingsCommunications();
  const to =
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    communications.contactEmail?.trim() ||
    communications.supportEmail?.trim() ||
    'contact@studyear.ai';

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
  return { sent: result.sent, error: result.error };
}

function appBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'https://studyear.com';
}

function greeting(name?: string | null): string {
  return name?.trim() ? `Hi ${name.trim()},` : 'Hi there,';
}

export async function sendWelcomeEmail(
  email: string,
  name?: string | null,
): Promise<{ sent: boolean; error?: string }> {
  const communications = await readSystemSettingsCommunications();
  const title = communications.signupWelcome?.title ?? 'Welcome to StudYear';
  const body =
    communications.signupWelcome?.description ??
    'Your account is ready. Sign in to complete your profile and start learning.';
  const loginUrl = `${appBaseUrl()}/login`;
  const greet = greeting(name);

  const text = [
    greet,
    '',
    body,
    '',
    `Sign in: ${loginUrl}`,
    '',
    '— StudYear',
  ].join('\n');

  const result = await sendPlatformEmail({
    to: email,
    subject: title,
    text,
    html: [
      `<p>${greet}</p>`,
      `<p>${body}</p>`,
      `<p><a href="${loginUrl}">Sign in to StudYear</a></p>`,
      '<p>— StudYear</p>',
    ].join(''),
  });

  if (!result.sent) {
    console.warn('[mail] welcome email not sent:', result.error ?? 'smtp_not_configured');
  }
  return result;
}

export async function sendAcuTopUpReceiptEmail(input: {
  email: string;
  name?: string | null;
  acus: number;
  amountGbp: string;
}): Promise<{ sent: boolean }> {
  const greet = greeting(input.name);
  const result = await sendPlatformEmail({
    to: input.email,
    subject: 'StudYear — ACU top-up receipt',
    text: [
      greet,
      '',
      `Your wallet was credited with ${input.acus.toLocaleString()} ACUs.`,
      `Amount paid: ${input.amountGbp}`,
      '',
      'Thank you for using StudYear.',
    ].join('\n'),
  });
  if (!result.sent) {
    console.warn('[mail] ACU receipt email not sent:', result.error);
  }
  return result;
}

/** Sent when a platform admin credits ACUs from Admin → Users → Adjust ACUs. */
export async function sendAdminAcuCreditEmail(input: {
  email: string;
  name?: string | null;
  acus: number;
  reason: string;
  newBalance?: number;
}): Promise<{ sent: boolean }> {
  const greet = greeting(input.name);
  const balanceLine =
    typeof input.newBalance === 'number'
      ? `Your new balance: ${input.newBalance.toLocaleString()} ACUs.`
      : '';

  const result = await sendPlatformEmail({
    to: input.email,
    subject: 'StudYear — ACU credit added to your account',
    text: [
      greet,
      '',
      `A StudYear administrator added ${input.acus.toLocaleString()} ACUs to your wallet.`,
      balanceLine,
      input.reason.trim() ? `Note: ${input.reason.trim()}` : '',
      '',
      `View your account: ${appBaseUrl()}/account`,
      '',
      '— StudYear',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  if (!result.sent) {
    console.warn('[mail] admin ACU credit email not sent:', result.error);
  }
  return result;
}
