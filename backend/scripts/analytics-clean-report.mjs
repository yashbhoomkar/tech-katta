#!/usr/bin/env node
// Read-only report of "real" usage for one day, without deleting or changing anything: the events and visitors left after taking out
//   1. the owner's visitor ids: every visitor id that ever sent an event while signed in as an internal account (admins, ADMIN_EMAILS, INTERNAL_EMAILS), or whose events are marked internal, and
//   2. single-event visitors that day with no account: one event and gone, which is what a fresh automated browser (a Playwright check) looks like.
// Days are India time, like the admin summary.
//   MONGODB_URI=... [ACCOUNTS_DB=techkatta_app] node scripts/analytics-clean-report.mjs [--day 2026-11-27]
//   node scripts/analytics-clean-report.mjs --json events.json users.json [--day 2026-11-27]   (collections exported as JSON arrays)
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isInternal } from '../src/auth/accounts.js';

const IST = 330 * 60_000;
export function dayRange(day) { const t = Date.parse(`${day}T00:00:00Z`) - IST; return [new Date(t), new Date(t + 86_400_000)]; }

/** events: the stored documents ({ visitor, userId?, internal?, at }); users: { _id, email, role }. Returns the counts. */
export function cleanReport(events, users, day) {
  const [from, to] = dayRange(day);
  const internalIds = new Set(users.filter((u) => isInternal(u)).map((u) => String(u._id)));
  const owner = new Set(events.filter((e) => e.internal === true || (e.userId && internalIds.has(String(e.userId)))).map((e) => e.visitor));
  const today = events.filter((e) => { const t = new Date(e.at); return t >= from && t < to; });
  const per = new Map();
  for (const e of today) { const v = per.get(e.visitor) || { n: 0, signedIn: false }; v.n++; v.signedIn ||= !!e.userId; per.set(e.visitor, v); }
  const single = new Set([...per].filter(([, v]) => v.n === 1 && !v.signedIn).map(([id]) => id));
  const kept = today.filter((e) => !owner.has(e.visitor) && !single.has(e.visitor));
  const people = (list) => new Set(list.map((e) => e.visitor)).size;
  const ownerEvents = today.filter((e) => owner.has(e.visitor)).length;
  return {
    day, all: { events: today.length, visitors: per.size },
    owner: { visitorIds: [...owner].filter((v) => per.has(v)).length, events: ownerEvents, shareOfEvents: today.length ? Math.round((ownerEvents / today.length) * 100) : 0 },
    singleEventVisitors: { visitors: single.size, events: single.size },
    real: { events: kept.length, visitors: people(kept) },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const day = arg('--day') || '2026-11-27';
  let events, users;
  if (process.argv.includes('--json')) {
    const i = process.argv.indexOf('--json');
    [events, users] = await Promise.all([readFile(process.argv[i + 1], 'utf8'), readFile(process.argv[i + 2], 'utf8')]).then((r) => r.map((x) => JSON.parse(x)));
  } else {
    if (!process.env.MONGODB_URI) { console.error('Set MONGODB_URI (or use --json events.json users.json).'); process.exit(1); }
    const { MongoClient } = await import('mongodb');
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db(process.env.ACCOUNTS_DB || 'techkatta_app');
    users = await db.collection('users').find({}, { projection: { email: 1, role: 1 } }).toArray();
    events = await db.collection('events').find({}, { projection: { visitor: 1, userId: 1, internal: 1, at: 1 } }).toArray();
    await client.close();
  }
  const r = cleanReport(events, users, day);
  console.log(`Day ${r.day} (India time)`);
  console.log(`  all:       ${r.all.events} events, ${r.all.visitors} visitors`);
  console.log(`  owner:     ${r.owner.visitorIds} visitor ids, ${r.owner.events} events (${r.owner.shareOfEvents}% of all)`);
  console.log(`  one-event visitors (no account): ${r.singleEventVisitors.visitors}`);
  console.log(`  REAL:      ${r.real.events} events, ${r.real.visitors} visitors`);
}
