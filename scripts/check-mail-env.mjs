import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  let val = line.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = val;
}

const pass = env.MAIL_PASSWORD ?? '';
console.log('Local MAIL_USERNAME:', env.MAIL_USERNAME);
console.log('Local MAIL_PASSWORD length:', pass.length, 'chars');
