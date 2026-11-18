// The 3D figure of each article: a short list of steps for story.js (a system and a state per step) with the words
// for that step. Hand-built for the most-read concepts; every other article gets a figure built from its section.
// Systems are built from the same parts and colours as everywhere (palette.js); one system per figure.
import { layout } from './sim.js';

const all = (ids, st) => Object.fromEntries(ids.map((k) => [k, st]));
const D = (o) => layout({ apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0, ...o });
const P = (kind, x, z, name, extra = {}) => ({ kind, x, z, name, ...extra });

// ---- networking: one request from a phone to the database ----
const netSys = () => ({
  parts: { phone: P('laptop', -2, 0, 'Phone'), dns: P('globe', 1.6, -2.4, 'DNS'), cdn: P('globe', 1.6, 2.4, 'CDN'), lb: P('lb', 5, 0, 'Load balancer'),
    a1: P('server', 8.4, -1.2, 'App server'), a2: P('server', 8.4, 1.2, 'App server'), db: P('db', 12, 0, 'Database') },
  paths: { q: ['phone', 'dns'], s: ['phone', 'cdn'], r: ['phone', 'lb'], l1: ['lb', 'a1'], l2: ['lb', 'a2'], d1: ['a1', 'db'], d2: ['a2', 'db'] },
});
// ---- sharding: a router in front of shards ----
const shardSys = (n) => {
  const parts = { a1: P('server', 0, -1.2, 'App server'), a2: P('server', 0, 1.2, 'App server'), r: P('lb', 3.6, 0, 'Shard router') };
  const paths = { x1: ['a1', 'r'], x2: ['a2', 'r'] };
  if (n === 1) { parts.s1 = P('db', 7.4, 0, 'Database'); paths.y1 = ['r', 's1']; }
  else for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * 2.4; parts[`s${i + 1}`] = P('db', 7.4, z, `Shard ${i + 1}`); paths[`y${i + 1}`] = ['r', `s${i + 1}`]; }
  return { parts, paths };
};
// ---- consistent hashing: nodes on a ring, keys between them ----
const ringSys = (nodes) => {
  const parts = {}, paths = {};
  nodes.forEach(([id, deg]) => { const r = deg * Math.PI / 180; parts[id] = P('db', Math.cos(r) * 5.2, Math.sin(r) * 5.2, `Node ${id.toUpperCase()}`, { layers: 2 }); });
  const keys = [['k1', 20], ['k2', 70], ['k3', 130], ['k4', 200], ['k5', 250], ['k6', 320]];
  const owner = (deg) => { const sorted = [...nodes].sort((a, b) => a[1] - b[1]); return (sorted.find(([, d]) => d >= deg) || sorted[0])[0]; };
  keys.forEach(([id, deg]) => { const r = deg * Math.PI / 180; parts[id] = P('small', Math.cos(r) * 2.4, Math.sin(r) * 2.4, `key ${id.slice(1)}`); paths[`${id}-o`] = [id, owner(deg)]; });
  return { parts, paths, owner };
};
// ---- CAP: two copies in two cities ----
const capSys = () => ({
  parts: { u1: P('laptop', -2, -1.8, 'Users in Mumbai'), m: P('db', 3, -1.8, 'Copy in Mumbai'), d: P('db', 9, 1.8, 'Copy in Delhi'), u2: P('laptop', 14, 1.8, 'Users in Delhi') },
  paths: { a: ['u1', 'm'], link: ['m', 'd'], b: ['u2', 'd'] },
});

export const RECIPES = {
  'networking-essentials': [
    { system: netSys(), state: { labels: { phone: ['', '', 'Phone in Pune'], db: ['', '', 'Database'] }, speed: 0.7 } },
    { system: netSys(), words: ['One tap', 'Becomes one request'], text: 'The phone asks DNS for the address, then sends the request to a load balancer, which passes it to one app server. The server reads the database and the answer travels back the same way.',
      state: { parts: { dns: 'ok', lb: 'ok', a1: 'ok', db: 'ok' }, paths: { s: 'dim', l2: 'dim', d2: 'dim' }, labels: { dns: ['name → address', 'ok'], lb: ['picks a server', 'ok'], db: ['reads the row', 'ok'] }, speed: 1.2 } },
    { system: netSys(), words: ['Distance costs time', 'Serve from close by'], text: 'Every round trip pays for distance. Images and pages that rarely change are served from a CDN near the user, so most of the bytes never cross the country.',
      state: { parts: { cdn: 'ok' }, paths: { r: 'dim', l1: 'dim', l2: 'dim', d1: 'dim', d2: 'dim', q: 'dim' }, labels: { cdn: ['close to the user', 'ok'], phone: ['images, scripts', ''] }, speed: 1.2 } },
    { system: netSys(), words: ['Calls fail', 'Retry, but carefully'], text: 'A server can stop answering at any moment. The load balancer stops sending to it, and clients retry with a growing wait, so a hiccup does not turn into a flood.',
      state: { parts: { a1: 'alert', a2: 'ok', lb: 'ok' }, paths: { l1: 'down', d1: 'down' }, labels: { a1: ['not answering', 'alert'], lb: ['sends to the healthy one', 'ok'] }, speed: 1.3 } },
  ],
  caching: [
    { system: D({}), state: { labels: { db: ['menu reads'] }, speed: 0.8 } },
    { system: D({}), words: ['Every read', 'Goes to the database'], text: 'Zotato’s menus are read thousands of times a second at dinner and changed a few times a day. Without a cache, each read is a database query of tens of milliseconds.',
      state: { parts: { db: 'alert' }, labels: { db: ['12,000 reads/s at dinner', 'alert'] }, speed: 1.6 } },
    { system: D({ cache: 1 }), words: ['Keep the answer in memory', 'Most reads stop at the cache'], text: 'The app asks the cache first and goes to the database only on a miss. With 90% of reads answered from memory, the database sees a tenth of the traffic.',
      state: { parts: { cache0: 'ok', db: 'ok' }, labels: { cache0: ['hit 90%', 'ok'], db: ['a tenth of the reads', 'ok'] }, speed: 1.4 } },
    { system: D({ cache: 1 }), words: ['When the cache is full', 'Something has to go'], text: 'Memory is small. An eviction policy decides what leaves: usually the entry used least recently, because what was read a minute ago will probably be read again.',
      state: { parts: { cache0: 'warn' }, labels: { cache0: ['full: evict the least recently used', 'warn'] }, speed: 1.2 } },
    { system: D({ cache: 1 }), words: ['A hot key expires', 'Everyone misses at once'], text: 'When a popular entry expires, every request misses together and hits the database in the same second. Refresh it a little early, or let one request rebuild it while the rest wait.',
      state: { parts: { cache0: 'ok', db: 'alert' }, paths: { db: 'alert' }, labels: { cache0: ['popular menu expired', 'warn'], db: ['thousands of misses at once', 'alert'] }, speed: 1.7 } },
  ],
  sharding: [
    { system: shardSys(1), state: { labels: { s1: ['every order'] }, speed: 0.8 } },
    { system: shardSys(1), words: ['One database', 'Runs out of room'], text: 'First prove you need it: one machine can hold a lot. Shard only when the data or the writes outgrow the biggest machine you can buy.',
      state: { parts: { s1: 'alert' }, labels: { s1: ['disk and writes at the limit', 'alert'] }, speed: 1.5 } },
    { system: shardSys(3), words: ['Split the rows by a key', 'Each shard holds a part'], text: 'A shard key decides where each row lives. The router reads the key and sends the request to the one shard that holds it.',
      state: { parts: all(['s1', 's2', 's3'], 'ok'), labels: { r: ['by shard key', 'ok'], s1: ['keys A to H', 'ok'], s3: ['keys Q to Z', 'ok'] }, speed: 1.2 } },
    { system: shardSys(3), words: ['A bad key', 'Makes one shard hot'], text: 'Shard by city, and Mumbai lands on one machine while the others idle. A good key spreads both data and traffic evenly.',
      state: { parts: { s1: 'ok', s2: 'alert', s3: 'ok' }, labels: { s2: ['one big city', 'alert'], s1: ['quiet', ''], s3: ['quiet', ''] }, speed: 1.4 } },
    { system: shardSys(3), words: ['What sharding breaks', 'Queries across shards'], text: 'A query that needs rows from every shard asks all of them and waits for the slowest. Choose the key so the common queries stay on one shard.',
      state: { parts: all(['s1', 's2', 's3'], 'warn'), labels: { r: ['asks every shard', 'warn'] }, speed: 1.2 } },
  ],
  'consistent-hashing': (() => {
    const three = ringSys([['a', 0], ['b', 120], ['c', 240]]), four = ringSys([['a', 0], ['b', 120], ['c', 240], ['d', 180]]);
    return [
      { system: three, state: { labels: { a: ['', '', 'Node A'], b: ['', '', 'Node B'], c: ['', '', 'Node C'] }, speed: 0.8 } },
      { system: three, words: ['Hash, then mod N', 'Fine until N changes'], text: 'Send each key to hash(key) mod 3 and the load is even. Add a fourth server and the answer changes for almost every key: most of the cache is suddenly in the wrong place.',
        state: { parts: all(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], 'warn'), labels: { k3: ['moves when N changes', 'warn'] }, speed: 1.2 } },
      { system: three, words: ['Put servers on a ring', 'A key goes to the next one'], text: 'Hash servers and keys onto the same circle. Each key belongs to the first server clockwise from it.',
        state: { parts: all(['a', 'b', 'c'], 'ok'), labels: { a: ['owns its arc', 'ok'], b: ['owns its arc', 'ok'], c: ['owns its arc', 'ok'] }, speed: 1 } },
      { system: four, words: ['Add a server', 'Only its neighbour’s keys move'], text: 'A new node takes over one arc. Only the keys on that arc move; every other key stays where it was.',
        state: { parts: { d: 'ok', k4: 'warn' }, labels: { d: ['new node', 'ok'], k4: ['the only key that moves', 'warn'] }, speed: 1 } },
    ];
  })(),
  'cap-theorem': [
    { system: capSys(), state: { labels: { m: ['', '', 'Copy in Mumbai'], d: ['', '', 'Copy in Delhi'] }, speed: 0.8 } },
    { system: capSys(), words: ['Two copies', 'That agree'], text: 'The same data lives in two cities so either can answer. Every write reaches both copies over the link between them.',
      state: { parts: { m: 'ok', d: 'ok' }, paths: { link: 'ok' }, labels: { m: ['in sync', 'ok'], d: ['in sync', 'ok'] }, speed: 1.2 } },
    { system: capSys(), words: ['The link breaks', 'Now you must choose'], text: 'Networks fail. While the copies cannot talk, a write in Mumbai cannot reach Delhi. Each copy can either refuse, or answer with what it has.',
      state: { paths: { link: 'down' }, parts: { m: 'warn', d: 'warn' }, labels: { m: ['cannot reach Delhi', 'warn'], d: ['cannot reach Mumbai', 'warn'] }, speed: 1.2 } },
    { system: capSys(), words: ['Choose consistency', 'Refuse rather than be wrong'], text: 'For a bank balance or the last seat on a flight, the cut-off copy refuses until the link is back. Some users get an error, nobody gets a wrong answer.',
      state: { paths: { link: 'down', b: 'dim' }, parts: { m: 'ok', d: 'alert', u2: 'dim' }, labels: { d: ['refuses: may be out of date', 'alert'] }, speed: 1 } },
    { system: capSys(), words: ['Or availability', 'Answer, maybe a little old'], text: 'For a like count or a menu, both copies keep answering and catch up later. Everyone gets an answer, some see an older one for a while.',
      state: { paths: { link: 'down' }, parts: { m: 'ok', d: 'ok' }, labels: { m: ['answers', 'ok'], d: ['answers, may be stale', 'warn'] }, speed: 1.2 } },
  ],
};

/** the step a list preview shows: the system working, not failing */
export const PREVIEW = { 'networking-essentials': 1, caching: 2, sharding: 2, 'consistent-hashing': 3, 'cap-theorem': 1 };

const splitHead = (t) => { const i = t.indexOf(': '); return i < 0 ? [t, ''] : [t.slice(0, i), t.charAt(i + 2).toUpperCase() + t.slice(i + 3)]; };

/** a figure for any article: its own recipe, or one built from its section with the article's own dek as words */
export function recipeFor(a) {
  if (RECIPES[a.slug]) return RECIPES[a.slug];
  const sys = a.section === 'components' ? D({ cache: 1, queue: 1 }) : a.section === 'real-systems' ? D({ apps: 3, cache: 2, replicas: 1, cdn: 1 }) : D({ cache: 1, replicas: 1 });
  return [
    { system: sys, state: { speed: 0.8 } },
    { system: sys, words: [splitHead(a.title)[0], splitHead(a.title)[1] || 'What it covers'], text: a.dek || '', state: { parts: all(Object.keys(sys.parts).filter((k) => k !== 'client'), 'ok'), speed: 1.1 } },
  ];
}
