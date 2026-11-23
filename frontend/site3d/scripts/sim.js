// The simulator: a design is a handful of counts (app servers, cache nodes, read replicas, a queue, a CDN); layout()
// turns it into a 3D system and run() plays an incident's evening against it, one tick a second.
// The model is deliberately small and honest about what it teaches:
// - app servers each take APP_CAP requests a second; beyond that, requests fail;
// - the CDN answers the static share of traffic before it reaches you;
// - cache nodes each hold 1/n of the keys: when one dies, its keys miss until they are fetched again (re-warm);
// - reads that miss go to the database: the primary takes DB_READ reads beside its writes, each replica DB_READ more;
// - writes go to the primary (DB_WRITE a second); a queue holds the excess and drains it later instead of failing;
// - if the primary dies, a replica is promoted after FAILOVER ticks; with no replica, everything that needs the
//   database fails until it is back.

export const APP_CAP = 10000, CACHE_CAP = 80000, DB_READ = 6000, DB_WRITE = 4000, FAILOVER = 2;
export const PRICE = { apps: 5000, cache: 3000, replicas: 8000, queue: 2500, cdn: 3500, base: 8000 }; // ₹ a month; base = primary db + lb
export const LIMITS = { apps: [1, 6], cache: [0, 3], replicas: [0, 3], queue: [0, 1], cdn: [0, 1] };
export const PARTS_INFO = {
  apps: { name: 'App server', short: 'app', what: `Runs your code. ${(APP_CAP / 1000).toFixed(0)}k requests a second each.` },
  cache: { name: 'Cache node', short: 'cache', what: 'Keeps hot answers in memory. Each node holds a share of the keys.' },
  replicas: { name: 'Read replica', short: 'replica', what: `A copy of the database that serves reads (${DB_READ / 1000}k a second) and can take over.` },
  queue: { name: 'Queue', short: 'queue', what: 'Holds writes the database cannot take yet, and feeds them in later.' },
  cdn: { name: 'CDN', short: 'cdn', what: 'Answers images and pages from near the user, before they reach you.' },
};

export const cost = (d) => PRICE.base + d.apps * PRICE.apps + d.cache * PRICE.cache + d.replicas * PRICE.replicas + d.queue * PRICE.queue + d.cdn * PRICE.cdn;
export const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const perSec = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k/s` : `${Math.round(n)}/s`;

/** the 3D system for a design: parts and paths, ids app0.., cache0.., rep0.., db, queue, cdn, lb, client */
export function layout(d) {
  const parts = { client: { kind: 'laptop', x: 0, z: 0, name: 'Users' }, lb: { kind: 'lb', x: 5.4, z: 0, name: 'Load balancer' }, db: { kind: 'db', x: 14.4, z: 1.2, name: 'Database' } };
  const paths = {};
  if (d.cdn) { parts.cdn = { kind: 'globe', x: 2.7, z: 0, name: 'CDN' }; paths.in = ['client', 'cdn']; paths.edge = ['cdn', 'lb']; }
  else paths.in = ['client', 'lb'];
  const rows = (n, gap) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap);
  rows(d.apps, 2.2).forEach((z, i) => { parts[`app${i}`] = { kind: 'server', x: 8.6, z, name: 'App server' }; paths[`lb-app${i}`] = ['lb', `app${i}`]; });
  for (let i = 0; i < d.cache; i++) parts[`cache${i}`] = { kind: 'cache', x: 11.6 + i * 1.9, z: -3.9 - (d.apps > 4 ? 1.2 : 0), name: 'Cache' };
  rows(d.replicas, 2.1).forEach((z, i) => { parts[`rep${i}`] = { kind: 'db', x: 17.6, z: 1.2 + z, name: 'Replica', layers: 2 }; paths[`db-rep${i}`] = ['db', `rep${i}`]; });
  if (d.queue) { parts.queue = { kind: 'queue', x: 11.8, z: 4.6 + (d.apps > 4 ? 1.2 : 0), name: 'Queue' }; paths['queue-db'] = ['queue', 'db']; }
  for (let i = 0; i < d.apps; i++) {
    if (d.cache) paths[`app${i}-cache`] = [`app${i}`, `cache${i % d.cache}`];
    paths[`app${i}-db`] = [`app${i}`, d.replicas ? `rep${i % d.replicas}` : 'db'];
    if (d.queue) paths[`app${i}-queue`] = [`app${i}`, 'queue'];
    else if (d.replicas) paths[`app${i}-w`] = [`app${i}`, 'db'];
  }
  return { parts, paths };
}

const lat = (u) => (u < 0.7 ? u * 18 : u < 1 ? 13 + (u - 0.7) ** 2 * 900 : 95 + (u - 1) * 2400);

/** Plays an incident against a design. Returns one row per tick and a verdict. */
export function run(inc, d) {
  const ticks = [];
  let backlog = 0, errors = 0, total = 0, worstP99 = 0;
  const cacheDeath = inc.events.find((e) => e.kind === 'cache'), dbDeath = inc.events.find((e) => e.kind === 'primary');
  for (let t = 0; t < inc.length; t++) {
    const R = traffic(inc, t);
    total += R;
    // edge
    const fromCdn = d.cdn ? R * inc.staticShare * 0.92 : 0;
    const R1 = R - fromCdn;
    const appCap = d.apps * APP_CAP, appErr = Math.max(0, R1 - appCap), served = R1 - appErr, uApp = R1 / appCap;
    const reads = served * inc.readShare, writes = served - reads;
    // cache
    let live = d.cache, hit = 0;
    if (d.cache) {
      hit = inc.hitRate;
      if (cacheDeath && t >= cacheDeath.at) {
        live = d.cache - 1;
        const since = t - cacheDeath.at, warm = Math.min(1, since / 5);
        hit = live <= 0 ? 0 : inc.hitRate * (live / d.cache + (1 - live / d.cache) * warm);
      }
    }
    const uCache = live > 0 ? reads / (live * CACHE_CAP) : 0;
    const dbReads = reads * (1 - hit);
    // database
    const primaryDown = dbDeath && t >= dbDeath.at && t < dbDeath.at + dbDeath.length;
    const promoted = primaryDown && d.replicas > 0 && t >= dbDeath.at + FAILOVER;
    const primaryOk = !primaryDown || promoted;
    const repLive = Math.max(0, d.replicas - (promoted ? 1 : 0));
    let writesIn = writes + backlog, writeOk = 0;
    if (primaryOk) writeOk = Math.min(writesIn, DB_WRITE);
    let writeErr = 0;
    if (d.queue) backlog = writesIn - writeOk; else { writeErr = writes - Math.min(writes, writeOk); backlog = 0; }
    const primaryReadCap = primaryOk ? Math.max(0, DB_READ * (1 - writeOk / DB_WRITE * 0.5)) : 0;
    const readCap = repLive * DB_READ + primaryReadCap;
    const readErr = Math.max(0, dbReads - readCap);
    const uDb = readCap > 0 ? dbReads / readCap : dbReads > 0 ? 9 : 0, uWrite = writes / DB_WRITE;
    const err = appErr + readErr + writeErr;
    errors += err;
    const p99 = Math.round(28 + lat(uApp) + (d.cache ? 2 : 0) + (dbReads > 0 ? lat(uDb) * Math.min(1, dbReads / Math.max(1, reads)) * 1.6 + 6 : 0) + (d.queue ? 0 : lat(uWrite) * 0.3));
    worstP99 = Math.max(worstP99, Math.min(p99, 9999));
    ticks.push({ t, R, fromCdn, uApp, uCache, hit, live, dbReads, readCap, uDb, writes, writeOk, backlog, primaryOk, primaryDown, promoted, err, errRate: R ? err / R : 0, p99: Math.min(p99, 9999) });
  }
  const errRate = total ? errors / total : 0;
  const c = cost(d);
  const checks = [
    { id: 'errors', label: 'Errors under 1 %', ok: errRate < 0.01, value: `${(errRate * 100).toFixed(errRate < 0.1 ? 2 : 1)} %` },
    { id: 'p99', label: `p99 under ${inc.p99} ms`, ok: worstP99 < inc.p99, value: `${worstP99 >= 9999 ? '> 9,999' : worstP99.toLocaleString('en-IN')} ms` },
    { id: 'budget', label: `Within ${rupees(inc.budget)} a month`, ok: c <= inc.budget, value: rupees(c) },
  ];
  const passed = checks.every((x) => x.ok);
  const score = Math.max(0, Math.round(100 - Math.min(60, errRate * 400) - (worstP99 > inc.p99 ? Math.min(25, (worstP99 - inc.p99) / 40) : 0) - (c > inc.budget ? Math.min(30, (c - inc.budget) / 1000) : 0) - (passed ? 0 : 10)));
  return { ticks, errRate, worstP99, cost: c, checks, passed, score, why: explain(inc, d, ticks) };
}

export function traffic(inc, t) {
  const k = inc.curve;
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, r0] = k[i], [t1, r1] = k[i + 1];
    if (t >= t0 && t <= t1) return r0 + (r1 - r0) * ((t - t0) / (t1 - t0 || 1));
  }
  return k[k.length - 1][1];
}

/** what broke, in plain words, with the lesson that explains the fix */
function explain(inc, d, ticks) {
  const out = [];
  const worst = (f) => ticks.reduce((a, b) => (f(b) > f(a) ? b : a));
  const app = worst((x) => x.uApp);
  if (app.uApp > 1) out.push({ part: 'apps', text: `At ${perSec(app.R)} the app servers ran at ${Math.round(app.uApp * 100)} %. Add servers, or answer more before traffic reaches them.`, lesson: 'load-balancing' });
  const db = worst((x) => x.dbReads - x.readCap);
  if (db.dbReads > db.readCap) out.push({ part: d.cache ? 'replicas' : 'cache', text: d.cache ? `Reads that missed the cache reached ${perSec(db.dbReads)}; the database could serve ${perSec(db.readCap)}.${inc.events.some((e) => e.kind === 'cache') ? ' A cache node died and its keys all fell through.' : ''}` : `Every read went to the database: ${perSec(db.dbReads)} against ${perSec(db.readCap)}. A cache answers most of them first.`, lesson: d.cache ? 'replicas' : 'caching' });
  const w = worst((x) => x.writes - x.writeOk);
  if (!d.queue && w.writes > w.writeOk + 1) out.push({ part: 'queue', text: `Writes peaked at ${perSec(w.writes)}; the primary takes ${perSec(DB_WRITE)}. The rest failed. A queue would have held them.`, lesson: 'queues' });
  if (ticks.some((x) => x.primaryDown && !x.promoted) && !d.replicas) out.push({ part: 'replicas', text: 'The primary database went down and nothing could take its place.', lesson: 'replicas' });
  const last = ticks[ticks.length - 1];
  if (d.queue && last.backlog > 1) out.push({ part: 'queue', text: `The queue still held ${Math.round(last.backlog).toLocaleString('en-IN')} writes at the end: they are late, not lost.`, lesson: 'queues', soft: true });
  if (cost(d) > inc.budget) out.push({ part: 'budget', text: `This design costs ${rupees(cost(d))} a month; the budget is ${rupees(inc.budget)}. Something here is more than the evening needs.`, lesson: null });
  return out;
}

export const INCIDENTS = [
  { id: 'ind-vs-pak', no: '01', title: 'IND vs PAK: 36,000 link opens a second', level: 'Easy', system: 'URL shortener',
    brief: 'The promo SMS goes to crores of fans at the toss. Every tap opens a short link. At 20:14, during the peak, one cache node dies.',
    readShare: 0.97, staticShare: 0, hitRate: 0.95, length: 24, p99: 300, budget: 55000,
    curve: [[0, 4000], [5, 6000], [8, 36000], [16, 34000], [20, 12000], [23, 6000]], events: [{ kind: 'cache', at: 11, label: 'cache node dies' }],
    start: { apps: 2, cache: 1, replicas: 0, queue: 0, cdn: 0 }, lessons: ['caching', 'replicas'] },
  { id: 'concert-tickets', no: '02', title: 'Concert tickets open at 12:00', level: 'Medium', system: 'Ticket booking',
    brief: '1.2 lakh fans press Book in the same minute. Most of what they send is a write: hold this seat, take this payment.',
    readShare: 0.35, staticShare: 0.1, hitRate: 0.6, length: 24, p99: 400, budget: 32000,
    curve: [[0, 1500], [4, 2000], [6, 16000], [12, 15000], [15, 5000], [23, 2000]], events: [],
    start: { apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0 }, lessons: ['queues'] },
  { id: 'big-sale', no: '03', title: 'Big sale: the phone everyone wants', level: 'Medium', system: 'Product page',
    brief: 'A ₹9,999 phone goes on sale at midnight. Millions refresh one product page: mostly images and the same few answers.',
    readShare: 0.94, staticShare: 0.7, hitRate: 0.9, length: 24, p99: 300, budget: 35000,
    curve: [[0, 5000], [6, 8000], [8, 90000], [14, 80000], [18, 20000], [23, 8000]], events: [],
    start: { apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0 }, lessons: ['caching', 'cdn'] },
  { id: 'salary-day', no: '04', title: 'Salary day: the database goes down', level: 'Medium', system: 'Payments',
    brief: 'On the 1st, everyone checks their balance and pays rent. At 10:02 the primary database crashes for six seconds.',
    readShare: 0.65, staticShare: 0, hitRate: 0.4, length: 24, p99: 500, budget: 42000,
    curve: [[0, 3000], [6, 9000], [12, 10000], [18, 7000], [23, 4000]], events: [{ kind: 'primary', at: 10, length: 6, label: 'primary db crashes' }],
    start: { apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0 }, lessons: ['replicas'] },
  { id: 'election-results', no: '05', title: 'Election results morning', level: 'Hard', system: 'News feed',
    brief: 'Counting starts at 8. The whole country refreshes the live tally. A cache node dies at the peak, and later the primary crashes.',
    readShare: 0.93, staticShare: 0.45, hitRate: 0.93, length: 26, p99: 350, budget: 62000,
    curve: [[0, 6000], [5, 20000], [8, 70000], [17, 64000], [22, 25000], [25, 10000]], events: [{ kind: 'cache', at: 10, label: 'cache node dies' }, { kind: 'primary', at: 16, length: 5, label: 'primary db crashes' }],
    start: { apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0 }, lessons: ['caching', 'replicas', 'queues', 'cdn'] },
];
