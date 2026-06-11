import fs from 'fs';
import nodemailer from 'nodemailer';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  const key = line.slice(0, i).trim();
  let val = line.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const user = env.MAIL_USERNAME;
const pass = env.MAIL_PASSWORD;

const configs = [
  { name: 'hostinger-465', host: 'smtp.hostinger.com', port: 465, secure: true },
  { name: 'hostinger-587', host: 'smtp.hostinger.com', port: 587, secure: false, requireTLS: true },
  { name: 'titan-465', host: 'smtp.titan.email', port: 465, secure: true },
  { name: 'titan-587', host: 'smtp.titan.email', port: 587, secure: false, requireTLS: true },
];

console.log('Testing user:', user);
let working = null;
for (const c of configs) {
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    requireTLS: c.requireTLS,
    auth: { user, pass },
    connectionTimeout: 12000,
    tls: { minVersion: 'TLSv1.2' },
  });
  try {
    await t.verify();
    console.log('OK', c.name, c.host, c.port);
    if (!working) working = { ...c, transport: t };
  } catch (e) {
    console.log('FAIL', c.name, String(e.message).slice(0, 100));
  }
}

if (working) {
  const to = env.CONTACT_INBOX_EMAIL || user;
  const from = env.MAIL_FROM_ADDRESS || user;
  const info = await working.transport.sendMail({
    from: `"StudYear Test" <${from}>`,
    to,
    subject: `StudYear — SMTP test ${new Date().toISOString().slice(0, 19)}`,
    text: 'If you received this, SMTP is working. Welcome emails, receipts, and contact form notifications should deliver when MAIL_* env vars match in production.',
  });
  console.log('SENT test email to', to, 'messageId:', info.messageId);
} else {
  console.log('No working SMTP config — test email not sent.');
  process.exit(1);
}
