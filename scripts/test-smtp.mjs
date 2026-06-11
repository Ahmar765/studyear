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
for (const c of configs) {
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    requireTLS: c.requireTLS,
    auth: { user, pass },
    connectionTimeout: 12000,
  });
  try {
    await t.verify();
    console.log('OK', c.name, c.host, c.port);
  } catch (e) {
    console.log('FAIL', c.name, String(e.message).slice(0, 100));
  }
}
