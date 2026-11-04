#!/usr/bin/env node
// Prints the Meta Custom Audience CSV (hashed; consented accounts only) to stdout. Upload it in
// Meta Ads Manager → Audiences → Create audience → Custom audience → Customer list.
//   MONGODB_URI=... [ACCOUNTS_DB=techkatta_app] node scripts/meta-audience.mjs > audience.csv
//   node scripts/meta-audience.mjs --json users.json > audience.csv   (users exported as a JSON array)
// Never commit the output or attach it to a public place (it is personal data, even hashed).
import { readFile } from 'node:fs/promises';
import { audienceCsv } from '../src/auth/audience.js';

const i = process.argv.indexOf('--json');
let users;
if (i > 0) {
  users = JSON.parse(await readFile(process.argv[i + 1], 'utf8')).filter((u) => u?.adsConsent?.ads === true);
} else {
  const { openAccounts } = await import('../src/auth/accounts.js');
  if (!process.env.MONGODB_URI) { console.error('Set MONGODB_URI (or use --json users.json).'); process.exit(1); }
  const accounts = openAccounts({ uri: process.env.MONGODB_URI, dbName: process.env.ACCOUNTS_DB || 'techkatta_app', secret: 'unused-for-export' });
  users = await accounts.consentedUsers(); await accounts.close();
}
process.stdout.write(audienceCsv(users));
console.error(`${users.length} consented account(s).`);
