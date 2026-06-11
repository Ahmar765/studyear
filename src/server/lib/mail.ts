import nodemailer from 'nodemailer';
import { readSystemSettingsCommunications } from '@/server/lib/system-settings-read';

type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.MAIL_SMTP_HOST?.trim() &&
      process.env.MAIL_USERNAME?.trim() &&
      process.env.MAIL_PASSWORD?.trim(),
  );
}

function smtpFromAddress(): string {
  return (
    process.env.MAIL_FROM_ADDRESS?.trim() ||
    process.env.MAIL_USERNAME?.trim() ||
    'noreply@studyear.com'
  );
}

function smtpFromName(): string {
  return process.env.MAIL_FROM_NAME?.trim() || 'StudYear';
}

function normalizeMailSecret(value: string | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\r?\n/g, '')
    .replace(/\uFEFF/g, '');
}

function smtpAuth() {
  return {
    user: normalizeMailSecret(process.env.MAIL_USERNAME),
    pass: normalizeMailSecret(process.env.MAIL_PASSWORD),
  };
}

function formatSmtpError(message: string): string {
  if (/535|authentication failed|EAUTH|invalid login/i.test(message)) {
    return [
      'SMTP login rejected (535) — the mailbox username or password is wrong.',
      'Use the full email as MAIL_USERNAME (e.g. contact@studyear.com).',
      'MAIL_PASSWORD must be the mailbox webmail password (Hostinger → Emails → Manage → reset if unsure), not your hPanel login.',
      'After resetting, update Firebase App Hosting env vars and redeploy.',
      'If email uses Titan, try MAIL_SMTP_HOST=smtp.titan.email',
    ].join(' ');
  }
  return message;
}

function createTransport() {
  const port = Number(process.env.MAIL_SMTP_PORT || 465);
  const secureExplicit = process.env.MAIL_SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureExplicit === 'true' || secureExplicit === '1'
      ? true
      : secureExplicit === 'false' || secureExplicit === '0'
        ? false
        : port === 465;

  return nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST!.trim(),
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: smtpAuth(),
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

/** Mailbox that receives contact form notifications and internal alerts. */
export async function resolveContactInboxEmail(): Promise<string> {
  const communications = await readSystemSettingsCommunications();
  return (
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    communications.contactEmail?.trim() ||
    communications.supportEmail?.trim() ||
    'contact@studyear.com'
  );
}

export async function getMailDeliveryStatus(): Promise<{
  configured: boolean;
  host?: string;
  port?: number;
  username?: string;
  fromAddress: string;
  contactInbox: string;
  passwordLength: number;
}> {
  const contactInbox = await resolveContactInboxEmail();
  const auth = smtpAuth();
  return {
    configured: smtpConfigured(),
    host: process.env.MAIL_SMTP_HOST?.trim(),
    port: Number(process.env.MAIL_SMTP_PORT || 465),
    username: auth.user || undefined,
    fromAddress: smtpFromAddress(),
    contactInbox,
    passwordLength: auth.pass.length,
  };
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) {
    return { ok: false, error: 'SMTP not configured (MAIL_SMTP_HOST, MAIL_USERNAME, MAIL_PASSWORD).' };
  }
  try {
    const transport = createTransport();
    await transport.verify();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: formatSmtpError(message) };
  }
}

export async function sendPlatformEmail(
  input: SendMailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!smtpConfigured()) {
    console.warn('[mail] SMTP not configured (set MAIL_SMTP_* env vars).');
    return { sent: false, error: 'smtp_not_configured' };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"${smtpFromName()}" <${smtpFromAddress()}>`,
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
    return { sent: false, error: formatSmtpError(message) };
  }
}

export async function sendTestEmail(to: string): Promise<{ sent: boolean; error?: string }> {
  const inbox = await resolveContactInboxEmail();
  return sendPlatformEmail({
    to,
    subject: 'StudYear — test email',
    text: [
      'This is a test message from StudYear.',
      '',
      `SMTP host: ${process.env.MAIL_SMTP_HOST ?? '(not set)'}`,
      `From: ${smtpFromAddress()}`,
      `Contact inbox: ${inbox}`,
      '',
      'If you received this, outbound email is working.',
    ].join('\n'),
  });
}

export async function sendContactFormNotification(input: {
  fullName: string;
  email: string;
  enquiryType: string;
  message: string;
}): Promise<{ sent: boolean; error?: string; inbox?: string }> {
  const to = await resolveContactInboxEmail();

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
      '',
      '—',
      'Reply directly to this email to respond to the sender.',
    ].join('\n'),
  });
  return { sent: result.sent, error: result.error, inbox: to };
}

export async function sendContactInboxReplyEmail(input: {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  originalMessage?: string;
  enquiryType?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const inbox = await resolveContactInboxEmail();
  const greet = input.toName.trim() ? `Hi ${input.toName.trim()},` : 'Hi there,';
  const quotedOriginal = input.originalMessage?.trim()
    ? [
        '',
        '—',
        'Your original message:',
        input.originalMessage.trim(),
      ].join('\n')
    : '';

  const text = [greet, '', input.body.trim(), quotedOriginal, '', '— StudYear Support'].join('\n');

  const htmlQuoted = input.originalMessage?.trim()
    ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/><p style="color:#6b7280;font-size:13px"><strong>Your original message</strong> (${input.enquiryType ?? 'enquiry'}):</p><blockquote style="margin:0;padding-left:12px;border-left:3px solid #e5e7eb;color:#6b7280">${input.originalMessage.trim().replace(/\n/g, '<br/>')}</blockquote>`
    : '';

  const result = await sendPlatformEmail({
    to: input.toEmail.trim(),
    replyTo: inbox,
    subject: input.subject.trim(),
    text,
    html: [
      `<p>${greet}</p>`,
      `<p>${input.body.trim().replace(/\n/g, '<br/>')}</p>`,
      htmlQuoted,
      '<p>— StudYear Support</p>',
    ].join(''),
  });

  return result;
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
}): Promise<{ sent: boolean; error?: string }> {
  const greet = greeting(input.name);
  const accountUrl = `${appBaseUrl()}/account`;
  const result = await sendPlatformEmail({
    to: input.email,
    subject: 'StudYear — ACU top-up receipt',
    text: [
      greet,
      '',
      `Your wallet was credited with ${input.acus.toLocaleString()} ACUs.`,
      `Amount paid: ${input.amountGbp}`,
      '',
      `View your account: ${accountUrl}`,
      '',
      'Thank you for using StudYear.',
    ].join('\n'),
    html: [
      `<p>${greet}</p>`,
      `<p>Your wallet was credited with <strong>${input.acus.toLocaleString()} ACUs</strong>.</p>`,
      `<p>Amount paid: <strong>${input.amountGbp}</strong></p>`,
      `<p><a href="${accountUrl}">View your account</a></p>`,
      '<p>Thank you for using StudYear.</p>',
    ].join(''),
  });
  if (!result.sent) {
    console.warn('[mail] ACU receipt email not sent:', result.error);
  }
  return result;
}

export async function sendSubscriptionReceiptEmail(input: {
  email: string;
  name?: string | null;
  planLabel: string;
  amountGbp?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const greet = greeting(input.name);
  const accountUrl = `${appBaseUrl()}/account`;
  const amountLine = input.amountGbp ? `Amount: ${input.amountGbp}` : '';

  const result = await sendPlatformEmail({
    to: input.email,
    subject: 'StudYear — subscription confirmation',
    text: [
      greet,
      '',
      `Your ${input.planLabel} subscription is now active.`,
      amountLine,
      '',
      `Manage your plan: ${accountUrl}`,
      '',
      'Thank you for subscribing to StudYear.',
    ]
      .filter(Boolean)
      .join('\n'),
    html: [
      `<p>${greet}</p>`,
      `<p>Your <strong>${input.planLabel}</strong> subscription is now active.</p>`,
      input.amountGbp ? `<p>Amount: <strong>${input.amountGbp}</strong></p>` : '',
      `<p><a href="${accountUrl}">Manage your plan</a></p>`,
      '<p>Thank you for subscribing to StudYear.</p>',
    ]
      .filter(Boolean)
      .join(''),
  });

  if (!result.sent) {
    console.warn('[mail] subscription receipt email not sent:', result.error);
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
