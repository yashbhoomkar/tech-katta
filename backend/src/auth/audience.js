// Meta Custom Audience file for the accounts included in Tech Katta ads (users.adsConsent.ads: accepted the
// Terms since 2026-11-13, or opted in with the old menu switch).
// Meta's format: one row per person, columns email, fn, ln, country, each value normalised the way
// Meta asks (lowercase; names without punctuation; 2-letter country) and then SHA-256 hashed, so the
// file never holds a readable email. Rows without an email are skipped.
import { createHash } from 'node:crypto';

const sha = (v) => (v ? createHash('sha256').update(v, 'utf8').digest('hex') : '');
export const norm = {
  email: (v) => String(v || '').trim().toLowerCase(),
  name: (v) => String(v || '').trim().toLowerCase().normalize('NFC').replace(/[\p{P}\p{S}\s]/gu, ''),
  country: (v) => (/^[a-z]{2}$/i.test(String(v || '').trim()) ? String(v).trim().toLowerCase() : ''),
};
export function audienceCsv(users) {
  const rows = ['email,fn,ln,country'];
  for (const u of users) {
    const email = norm.email(u.email);
    if (!email.includes('@')) continue;
    rows.push([sha(email), sha(norm.name(u.firstName)), sha(norm.name(u.lastName)), sha(norm.country(u.country || u.lastCountry))].join(','));
  }
  return rows.join('\n') + '\n';
}
