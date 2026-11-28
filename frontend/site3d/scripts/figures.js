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
    { system: netSys(), 
      state: { parts: { dns: 'ok', lb: 'ok', a1: 'ok', db: 'ok' }, paths: { s: 'dim', l2: 'dim', d2: 'dim' }, labels: { dns: ['name → address', 'ok'], lb: ['picks a server', 'ok'], db: ['reads the row', 'ok'] }, speed: 1.2 } },
    { system: netSys(), 
      state: { parts: { cdn: 'ok' }, paths: { r: 'dim', l1: 'dim', l2: 'dim', d1: 'dim', d2: 'dim', q: 'dim' }, labels: { cdn: ['close to the user', 'ok'], phone: ['images, scripts', ''] }, speed: 1.2 } },
    { system: netSys(), 
      state: { parts: { a1: 'alert', a2: 'ok', lb: 'ok' }, paths: { l1: 'down', d1: 'down' }, labels: { a1: ['not answering', 'alert'], lb: ['sends to the healthy one', 'ok'] }, speed: 1.3 } },
  ],
  caching: [
    { system: D({}), state: { labels: { db: ['menu reads'] }, speed: 0.8 } },
    { system: D({}), 
      state: { parts: { db: 'alert' }, labels: { db: ['12,000 reads/s at dinner', 'alert'] }, speed: 1.6 } },
    { system: D({ cache: 1 }), 
      state: { parts: { cache0: 'ok', db: 'ok' }, labels: { cache0: ['hit 90%', 'ok'], db: ['a tenth of the reads', 'ok'] }, speed: 1.4 } },
    { system: D({ cache: 1 }), 
      state: { parts: { cache0: 'warn' }, labels: { cache0: ['full: evict the least recently used', 'warn'] }, speed: 1.2 } },
    { system: D({ cache: 1 }), 
      state: { parts: { cache0: 'ok', db: 'alert' }, paths: { 'app0-db': 'alert', 'app1-db': 'alert' }, labels: { cache0: ['popular menu expired', 'warn'], db: ['thousands of misses at once', 'alert'] }, speed: 1.7 } },
  ],
  sharding: [
    { system: shardSys(1), state: { labels: { s1: ['every order'] }, speed: 0.8 } },
    { system: shardSys(1), 
      state: { parts: { s1: 'alert' }, labels: { s1: ['disk and writes at the limit', 'alert'] }, speed: 1.5 } },
    { system: shardSys(3), 
      state: { parts: all(['s1', 's2', 's3'], 'ok'), labels: { r: ['by shard key', 'ok'], s1: ['keys A to H', 'ok'], s3: ['keys Q to Z', 'ok'] }, speed: 1.2 } },
    { system: shardSys(3), 
      state: { parts: { s1: 'ok', s2: 'alert', s3: 'ok' }, labels: { s2: ['one big city', 'alert'], s1: ['quiet', ''], s3: ['quiet', ''] }, speed: 1.4 } },
    { system: shardSys(3), 
      state: { parts: all(['s1', 's2', 's3'], 'warn'), labels: { r: ['asks every shard', 'warn'] }, speed: 1.2 } },
  ],
  'consistent-hashing': (() => {
    const three = ringSys([['a', 0], ['b', 120], ['c', 240]]), four = ringSys([['a', 0], ['b', 120], ['c', 240], ['d', 180]]);
    return [
      { system: three, state: { labels: { a: ['', '', 'Node A'], b: ['', '', 'Node B'], c: ['', '', 'Node C'] }, speed: 0.8 } },
      { system: three, 
        state: { parts: all(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], 'warn'), labels: { k3: ['moves when N changes', 'warn'] }, speed: 1.2 } },
      { system: three, 
        state: { parts: all(['a', 'b', 'c'], 'ok'), labels: { a: ['owns its arc', 'ok'], b: ['owns its arc', 'ok'], c: ['owns its arc', 'ok'] }, speed: 1 } },
      { system: four, 
        state: { parts: { d: 'ok', k4: 'warn' }, labels: { d: ['new node', 'ok'], k4: ['the only key that moves', 'warn'] }, speed: 1 } },
    ];
  })(),
  'cap-theorem': [
    { system: capSys(), state: { labels: { m: ['', '', 'Copy in Mumbai'], d: ['', '', 'Copy in Delhi'] }, speed: 0.8 } },
    { system: capSys(), 
      state: { parts: { m: 'ok', d: 'ok' }, paths: { link: 'ok' }, labels: { m: ['in sync', 'ok'], d: ['in sync', 'ok'] }, speed: 1.2 } },
    { system: capSys(), 
      state: { paths: { link: 'down' }, parts: { m: 'warn', d: 'warn' }, labels: { m: ['cannot reach Delhi', 'warn'], d: ['cannot reach Mumbai', 'warn'] }, speed: 1.2 } },
    { system: capSys(), 
      state: { paths: { link: 'down', b: 'dim' }, parts: { m: 'ok', d: 'alert', u2: 'dim' }, labels: { d: ['refuses: may be out of date', 'alert'] }, speed: 1 } },
    { system: capSys(), 
      state: { paths: { link: 'down' }, parts: { m: 'ok', d: 'ok' }, labels: { m: ['answers', 'ok'], d: ['answers, may be stale', 'warn'] }, speed: 1.2 } },
  ],
};

// ---- the other sixteen concepts: one system each, built from the same parts; words from each article ----
const sys = (parts, paths) => ({ parts, paths });
const row = (prefix, n, x, gap, kind, name, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}`, P(kind, x, (i - (n - 1) / 2) * gap, name, extra)]));

const API = sys({ phone: P('laptop', -2, 0, 'Customer app'), api: P('lb', 2.4, 0, 'API'), orders: P('server', 6, -1.3, 'Orders service'), menus: P('server', 6, 1.3, 'Menus service'), db: P('db', 9.8, 0, 'Database') },
  { a: ['phone', 'api'], b: ['api', 'orders'], c: ['api', 'menus'], d: ['orders', 'db'], e: ['menus', 'db'] });
const DM = (cache) => sys({ app: P('server', 0, 0, 'App server'), db: P('db', 4.4, 1.2, 'Database'), ...(cache ? { kv: P('cache', 4.4, -2, 'Key-value store') } : {}) },
  { a: ['app', 'db'], ...(cache ? { b: ['app', 'kv'] } : {}) });
const IDX0 = sys({ app: P('server', 0, 0, 'App server'), db: P('db', 6, 0, 'Orders table') }, { a: ['app', 'db'] });
const IDX1 = sys({ app: P('server', 0, 0, 'App server'), root: P('small', 3, -1.6, 'Root page'), mid: P('small', 5, -1.6, 'Internal page'), leaf: P('small', 7, -1.6, 'Leaf page'), db: P('db', 9.4, 0, 'Orders table') },
  { a: ['app', 'root'], b: ['root', 'mid'], c: ['mid', 'leaf'], d: ['leaf', 'db'] });
const IDX2 = sys({ app: P('server', 0, 0, 'App server'), db: P('db', 6, 0, 'Orders table'), i1: P('small', 9, -2, 'Index 1'), i2: P('small', 9.6, 0, 'Index 2'), i3: P('small', 9, 2, 'Index 3') },
  { a: ['app', 'db'], b: ['db', 'i1'], c: ['db', 'i2'], d: ['db', 'i3'] });
const NUM = sys({ users: P('laptop', -2, 0, 'Users'), one: P('server', 2.4, 0, 'One machine'), mem: P('cache', 5.6, -2, 'Memory'), ssd: P('db', 6, 1.4, 'SSD'), far: P('db', 12, 1.4, 'Another region', { layers: 2 }) },
  { a: ['users', 'one'], b: ['one', 'mem'], c: ['one', 'ssd'], d: ['ssd', 'far'] });
const RT = sys({ asha: P('laptop', -2, -1.4, 'Asha'), chat: P('server', 2.4, -1.4, 'Chat service'), conn: P('server', 6, 1.4, 'Connection server'), ravi: P('laptop', 10, 1.4, 'Ravi') },
  { a: ['asha', 'chat'], b: ['chat', 'conn'], c: ['conn', 'ravi'] });
const CON = (hold) => sys({ u1: P('laptop', -2, -2, 'Buyer'), u2: P('laptop', -2, 0.4, 'Buyer'), app: P('server', 2.6, -0.8, 'Booking service'), db: P('db', 6.6, -0.8, 'Seats'), ...(hold ? { hold: P('cache', 6.6, 2.4, 'Holds') } : {}) },
  { a: ['u1', 'app'], b: ['u2', 'app'], c: ['app', 'db'], ...(hold ? { d: ['app', 'hold'] } : {}) });
const WF0 = sys({ app: P('server', 0, 0, 'Order service'), pay: P('server', 4, -2, 'Payments'), kit: P('server', 4, 0, 'Restaurant'), rider: P('server', 4, 2, 'Dispatch') },
  { a: ['app', 'pay'], b: ['app', 'kit'], c: ['app', 'rider'] });
const WF1 = sys({ placed: P('small', 0, 0, 'Placed'), acc: P('small', 3, 0, 'Accepted'), pick: P('small', 6, 0, 'Picked up'), del: P('small', 9, 0, 'Delivered'), cancel: P('small', 3, 3, 'Cancelled') },
  { a: ['placed', 'acc'], b: ['acc', 'pick'], c: ['pick', 'del'], d: ['placed', 'cancel'], e: ['cancel', 'acc'] });
const WF2 = sys({ engine: P('server', 0, 0, 'Workflow engine'), w1: P('consumer', 4, -1.6, 'Worker'), w2: P('consumer', 4, 1.6, 'Worker'), hist: P('db', 8, 0, 'History') },
  { a: ['engine', 'w1'], b: ['engine', 'w2'], c: ['w1', 'hist'], d: ['w2', 'hist'] });
const BF = (direct, cdn) => sys({ phone: P('laptop', -2, 0, 'Phone'), app: P('server', 3, -1.6, 'App server'), db: P('db', 7, -1.6, 'Files table'), store: P('db', 6, 2.4, 'Object storage', { layers: 4 }), ...(cdn ? { cdn: P('globe', 1.6, 3.6, 'CDN') } : {}) },
  { a: ['phone', 'app'], b: ['app', 'db'], ...(direct ? { c: ['phone', 'store'] } : { c: ['app', 'store'] }), ...(cdn ? { d: ['store', 'cdn'] } : {}) });
const LJ = (dlq) => sys({ api: P('server', 0, 0, 'API'), q: P('queue', 4, 0, 'Job queue'), ...row('w', 2, 8, 2.6, 'consumer', 'Worker'), db: P('db', 11.6, 0, 'Results'), ...(dlq ? { dlq: P('queue', 8, 3.8, 'Dead-letter queue') } : {}) },
  { a: ['api', 'q'], b: ['q', 'w0'], c: ['q', 'w1'], d: ['w0', 'db'], e: ['w1', 'db'], ...(dlq ? { f: ['q', 'dlq'] } : {}) });
const NB0 = sys({ phone: P('laptop', -2, 0, 'Customer'), app: P('server', 2.4, 0, 'Search service'), db: P('db', 6.2, 0, 'Restaurants') }, { a: ['phone', 'app'], b: ['app', 'db'] });
const grid = (n, gap, x0 = 0, z0 = 0, name = 'Cell') => { const o = {}; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o[`g${i}${j}`] = P('small', x0 + i * gap, z0 + j * gap, name); return o; };
const NB1 = sys(grid(3, 1.6), {});
const NB2 = sys({ q0: P('small', 0, 0, 'Quiet area'), q1: P('small', 0, 4.4, 'Quiet area'), q2: P('small', 3.4, 4.4, 'Quiet area'), ...Object.fromEntries([0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].map((j) => [`b${i}${j}`, P('small', 2.8 + i * 1.2, -1.4 + j * 1.2, 'Busy centre')]))) }, {});
const VEC = (index) => sys({ q: P('laptop', -2, 0, 'Search'), emb: P('server', 2, 0, 'Embedding model'), ...(index ? { idx: P('db', 6, -2.6, 'Vector index') } : {}),
  paneer: P('small', 8, 0.4, 'paneer'), cottage: P('small', 9, 1.2, 'cottage cheese'), dosa: P('small', 11, -1.6, 'dosa'), cake: P('small', 12.4, 2.6, 'cake') },
  { a: ['q', 'emb'], ...(index ? { b: ['emb', 'idx'], c: ['idx', 'paneer'] } : { b: ['emb', 'paneer'] }) });
const TS = (old) => sys({ ...row('d', 3, 0, 2, 'laptop', 'Rider phone'), ing: P('server', 3.6, 0, 'Ingest'), raw: P('db', 7.4, -1.2, 'Recent points'), ...(old ? { sum: P('db', 10.6, 1.6, 'Summaries', { layers: 1 }) } : {}) },
  { a: ['d0', 'ing'], b: ['d1', 'ing'], c: ['d2', 'ing'], d: ['ing', 'raw'], ...(old ? { e: ['raw', 'sum'] } : {}) });
const SK = (k) => sys({ stream: P('kafka', 0, 0, 'Events', { partitions: 2 }), app: P('server', 4.4, 0, 'Counter'),
  ...(k === 0 ? { db: P('db', 8.4, 0, 'Every id seen', { layers: 4 }) } : { hll: P('cache', 8.4, -1.6, 'HyperLogLog'), ...(k > 1 ? { cms: P('cache', 8.4, 1.6, 'Count-Min') } : {}) }) },
  { a: ['stream', 'app'], ...(k === 0 ? { b: ['app', 'db'] } : { b: ['app', 'hll'], ...(k > 1 ? { c: ['app', 'cms'] } : {}) }) });
const CDC = (cap) => sys({ app: P('server', 0, 0, 'Orders service'), db: P('db', 4, 0, 'Database'), search: P('db', 12, 1.8, 'Search index', { layers: 2 }), cache: P('cache', 12, -1.8, 'Cache'),
  ...(cap ? { cdc: P('consumer', 6.8, 0, 'CDC reader'), topic: P('kafka', 9.2, 0, 'Change stream', { partitions: 2 }) } : {}) },
  cap ? { a: ['app', 'db'], b: ['db', 'cdc'], c: ['cdc', 'topic'], d: ['topic', 'search'], e: ['topic', 'cache'] } : { a: ['app', 'db'], b: ['app', 'search'], c: ['app', 'cache'] });
const NEW = (design) => layout({ apps: 2, cache: 0, replicas: 0, queue: 0, cdn: 0, ...design });

Object.assign(RECIPES, {
  'api-design': [
    { system: API, state: { labels: { api: ['the contract'] }, speed: 0.8 } },
    { system: API, 
      state: { parts: { api: 'ok', orders: 'ok' }, paths: { c: 'dim', e: 'dim' }, labels: { api: ['POST /orders', 'ok'], orders: ['path · query · body', 'ok'] }, speed: 1.2 } },
    { system: API, 
      state: { parts: { phone: 'warn', orders: 'ok', db: 'ok' }, paths: { a: 'warn', c: 'dim', e: 'dim' }, labels: { phone: ['retried', 'warn'], db: ['one order, not two', 'ok'] }, speed: 1.4 } },
    { system: API, 
      state: { parts: { menus: 'warn', db: 'warn' }, paths: { b: 'dim', d: 'dim' }, labels: { menus: ['batching loader', 'ok'], db: ['51 → 2 queries', 'warn'] }, speed: 1.3 } },
  ],
  'data-modelling': [
    { system: DM(false), state: { labels: { db: ['restaurants · menus · orders'] }, speed: 0.8 } },
    { system: DM(false), 
      state: { parts: { db: 'ok' }, labels: { db: ['tables, keys, links', 'ok'] }, speed: 1.1 } },
    { system: DM(false), 
      state: { parts: { db: 'ok', app: 'ok' }, labels: { db: ['index: orders by customer', 'ok'] }, speed: 1.2 } },
    { system: DM(true), 
      state: { parts: { db: 'ok', kv: 'ok' }, labels: { db: ['source of truth', 'ok'], kv: ['hot reads', 'ok'] }, speed: 1.4 } },
  ],
  'database-indexing': [
    { system: IDX0, state: { labels: { db: ['crores of rows'] }, speed: 0.8 } },
    { system: IDX0, 
      state: { parts: { db: 'alert' }, labels: { db: ['reads every page', 'alert'] }, speed: 1.5 } },
    { system: IDX1, 
      state: { parts: { root: 'ok', mid: 'ok', leaf: 'ok', db: 'ok' }, labels: { root: ['300 to 600', 'ok'], mid: ['340 to 360', 'ok'], leaf: ['id 350', 'ok'] }, speed: 1.2 } },
    { system: IDX2, 
      state: { parts: { db: 'ok', i1: 'warn', i2: 'warn', i3: 'warn' }, labels: { db: ['1 insert', 'ok'], i2: ['+3 index writes', 'warn'] }, speed: 1.3 } },
  ],
  'numbers-to-know': [
    { system: NUM, state: { labels: { one: ['one machine'] }, speed: 0.8 } },
    { system: NUM, 
      state: { parts: { one: 'ok', mem: 'ok', ssd: 'ok' }, paths: { d: 'dim' }, labels: { one: ['cores and a fast network', 'ok'], mem: ['terabytes', 'ok'], ssd: ['tens of TB', 'ok'] }, speed: 1.2 } },
    { system: NUM, 
      state: { parts: { mem: 'ok', ssd: 'ok', far: 'warn' }, labels: { mem: ['fastest', 'ok'], ssd: ['~10× slower', 'ok'], far: ['far slower again', 'warn'] }, speed: 1.2 } },
    { system: NUM, 
      state: { parts: { ssd: 'ok', one: 'ok' }, paths: { d: 'dim' }, labels: { ssd: ['users + a year of orders: fits', 'ok'] }, speed: 1 } },
  ],
  'real-time-updates': [
    { system: RT, state: { labels: { asha: ['', '', 'Asha'], ravi: ['', '', 'Ravi'] }, speed: 0.8 } },
    { system: RT, 
      state: { parts: { ravi: 'warn' }, paths: { c: 'warn' }, labels: { ravi: ['asks every few seconds', 'warn'] }, speed: 1.3 } },
    { system: RT, 
      state: { parts: { chat: 'ok', conn: 'ok' }, labels: { chat: ['hop 1', 'ok'], conn: ['holds Ravi’s connection', 'ok'] }, speed: 1.3 } },
    { system: RT, 
      state: { parts: { chat: 'ok', conn: 'ok', ravi: 'ok', asha: 'ok' }, paths: { a: 'ok', b: 'ok', c: 'ok' }, labels: { ravi: ['delivered', 'ok'] }, speed: 1.8 } },
  ],
  contention: [
    { system: CON(false), state: { labels: { db: ['1 seat left'] }, speed: 0.8 } },
    { system: CON(false), 
      state: { parts: { db: 'alert', u1: 'warn', u2: 'warn' }, labels: { db: ['sold twice', 'alert'] }, speed: 1.6 } },
    { system: CON(false), 
      state: { parts: { db: 'ok', u1: 'ok', u2: 'dim' }, labels: { db: ['update only if still free', 'ok'] }, speed: 1.2 } },
    { system: CON(true), 
      state: { parts: { hold: 'warn', db: 'ok' }, labels: { hold: ['held, with an expiry', 'warn'], db: ['sold after payment', 'ok'] }, speed: 1.2 } },
  ],
  workflows: [
    { system: WF0, state: { labels: { app: ['one order'] }, speed: 0.8 } },
    { system: WF0, 
      state: { parts: { app: 'warn', rider: 'alert' }, labels: { app: ['waiting on three services', 'warn'], rider: ['timed out', 'alert'] }, speed: 1.4 } },
    { system: WF1, 
      state: { parts: { placed: 'ok', acc: 'ok', pick: 'ok', del: 'ok', cancel: 'warn' }, paths: { e: 'down' }, labels: { cancel: ['can’t be accepted', 'warn'], del: ['', '', 'Delivered'] }, speed: 1.2 } },
    { system: WF2, 
      state: { parts: { w1: 'alert', w2: 'ok', hist: 'ok' }, paths: { a: 'down', c: 'down' }, labels: { w1: ['crashed', 'alert'], w2: ['picks up from the history', 'ok'], hist: ['steps done', 'ok'] }, speed: 1.2 } },
  ],
  'scaling-reads': [
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), state: { labels: { db: ['primary'] }, speed: 0.8 } },
    { system: NEW({}), 
      state: { parts: { db: 'warn' }, labels: { db: ['most of the reads', 'warn'] }, speed: 1.4 } },
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), 
      state: { parts: { cdn: 'ok', cache0: 'ok', rep0: 'ok', rep1: 'ok', db: 'ok' }, labels: { cdn: ['answers first', 'ok'], cache0: ['most of the rest', 'ok'], db: ['400 a second', 'ok'] }, speed: 1.6 } },
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), 
      state: { parts: { cache0: 'warn', db: 'ok' }, labels: { cache0: ['hot key expired', 'warn'], db: ['one request', 'ok'] }, speed: 1.6 } },
  ],
  'scaling-writes': [
    { system: NEW({ apps: 3 }), state: { labels: { db: ['primary'] }, speed: 0.8 } },
    { system: NEW({ apps: 3 }), 
      state: { parts: { db: 'alert' }, labels: { db: ['at its limit', 'alert'] }, speed: 1.8 } },
    { system: NEW({ apps: 3, queue: 1 }), 
      state: { parts: { queue: 'warn', db: 'ok' }, labels: { queue: ['holding the spike', 'warn'], db: ['steady', 'ok'] }, speed: 1.5 } },
    { system: shardSys(5), 
      state: { parts: all(['s1', 's2', 's3', 's4', 's5'], 'ok'), labels: { s1: ['2 parts', 'ok'], s5: ['2 parts', 'ok'], r: ['picks a part', 'ok'] }, speed: 1.3 } },
  ],
  'big-files': [
    { system: BF(false, false), state: { labels: { store: ['the bytes'] }, speed: 0.8 } },
    { system: BF(false, false), 
      state: { parts: { app: 'alert' }, paths: { c: 'alert' }, labels: { app: ['busy moving 1.6 GB', 'alert'] }, speed: 1.6 } },
    { system: BF(true, false), 
      state: { parts: { app: 'ok', store: 'ok' }, labels: { app: ['signs the upload', 'ok'], store: ['keeps the parts', 'ok'] }, speed: 1.4 } },
    { system: BF(true, true), 
      state: { parts: { db: 'ok', cdn: 'ok', store: 'ok' }, labels: { db: ['file row: safe to show', 'ok'], cdn: ['near the user', 'ok'] }, speed: 1.3 } },
  ],
  'long-jobs': [
    { system: LJ(false), state: { labels: { q: ['jobs'] }, speed: 0.8 } },
    { system: LJ(false), 
      state: { parts: { q: 'ok', api: 'ok' }, labels: { api: ['returns a job id', 'ok'], q: ['waiting jobs', 'ok'] }, speed: 1.2 } },
    { system: LJ(false), 
      state: { parts: { w0: 'alert', w1: 'ok' }, paths: { d: 'down' }, labels: { w0: ['stopped renewing', 'alert'], w1: ['took the job', 'ok'] }, speed: 1.2 } },
    { system: LJ(true), 
      state: { parts: { dlq: 'warn', w0: 'ok', w1: 'ok' }, labels: { dlq: ['after the last try', 'warn'] }, speed: 1.2 } },
  ],
  'nearby-search': [
    { system: NB0, state: { labels: { phone: ['', '', 'Restaurants near me'] }, speed: 0.8 } },
    { system: NB0, 
      state: { parts: { db: 'warn' }, labels: { db: ['scans a strip', 'warn'] }, speed: 1.3 } },
    { system: NB1, 
      state: { parts: { g11: 'ok', g01: 'warn', g10: 'warn', g12: 'warn', g21: 'warn' }, labels: { g11: ['tdr1g', 'ok'] }, speed: 1 } },
    { system: NB2, 
      state: { parts: { b11: 'ok', b12: 'ok', b21: 'ok', b22: 'ok' }, labels: { q1: ['one big cell', ''], b22: ['many small cells', 'ok'] }, speed: 1 } },
  ],
  'vector-search': [
    { system: VEC(false), state: { labels: { paneer: ['', '', 'paneer'], cake: ['', '', 'cake'] }, speed: 0.8 } },
    { system: VEC(false), 
      state: { parts: { paneer: 'ok', cottage: 'ok', cake: 'dim' }, labels: { paneer: ['', 'ok', 'paneer'], cottage: ['', 'ok', 'cottage cheese'] }, speed: 1.1 } },
    { system: VEC(true), 
      state: { parts: { idx: 'ok', paneer: 'ok', cottage: 'ok' }, labels: { idx: ['approximate', 'ok'], paneer: ['', 'ok', 'paneer'] }, speed: 1.3 } },
  ],
  'time-series': [
    { system: TS(false), state: { labels: { raw: ['points by the clock'] }, speed: 0.8 } },
    { system: TS(false), 
      state: { parts: { ing: 'ok' }, labels: { ing: ['steady stream', 'ok'] }, speed: 1.6 } },
    { system: TS(false), 
      state: { parts: { raw: 'ok' }, labels: { raw: ['~10× smaller', 'ok'] }, speed: 1.3 } },
    { system: TS(true), 
      state: { parts: { raw: 'ok', sum: 'ok' }, labels: { raw: ['recent, full detail', 'ok'], sum: ['older, summarised', 'ok'] }, speed: 1.2 } },
  ],
  sketches: [
    { system: SK(0), state: { labels: { stream: ['page views'] }, speed: 0.8 } },
    { system: SK(0), 
      state: { parts: { db: 'alert' }, labels: { db: ['grows with every user', 'alert'] }, speed: 1.6 } },
    { system: SK(1), 
      state: { parts: { hll: 'ok' }, labels: { hll: ['small, fixed size', 'ok'] }, speed: 1.4 } },
    { system: SK(2), 
      state: { parts: { hll: 'ok', cms: 'ok' }, labels: { cms: ['how often each dish', 'ok'] }, speed: 1.4 } },
  ],
  'change-capture': [
    { system: CDC(false), state: { labels: { db: ['orders'] }, speed: 0.8 } },
    { system: CDC(false), 
      state: { parts: { search: 'alert', db: 'ok' }, paths: { b: 'alert' }, labels: { search: ['missed an update', 'alert'] }, speed: 1.4 } },
    { system: CDC(true), 
      state: { parts: { cdc: 'ok', topic: 'ok', db: 'ok' }, labels: { cdc: ['reads the log', 'ok'], topic: ['every change, in order', 'ok'] }, speed: 1.3 } },
    { system: CDC(true), 
      state: { parts: { search: 'ok', cache: 'ok', topic: 'ok' }, labels: { search: ['in step', 'ok'], cache: ['in step', 'ok'] }, speed: 1.4 } },
  ],
});

// ---- the ten components: each one's inside, built from the same parts ----
const ring = (n, r, kind, name, prefix = 'n', extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [`${prefix}${i}`, P(kind, Math.cos(a) * r, Math.sin(a) * r, name, extra)]; }));
const REDIS = (k) => sys({ ...row('a', 2, 0, 2.4, 'server', 'App server'),
  ...(k === 2 ? row('r', 3, 4.6, 2.2, 'cache', 'Redis node') : { r1: P('cache', 4.6, 0, 'Redis') }), ...(k === 1 ? { disk: P('db', 8.4, 0, 'Disk', { layers: 2 }) } : {}) },
  k === 2 ? { x: ['a0', 'r0'], y: ['a0', 'r1'], z: ['a1', 'r2'] } : { x: ['a0', 'r1'], y: ['a1', 'r1'], ...(k === 1 ? { d: ['r1', 'disk'] } : {}) });
const ES = (k) => sys({ app: P('server', 0, 0, 'Menus service'), db: P('db', 3.8, -2, 'Database'), ...(k ? { cdc: P('kafka', 7.4, -2, 'Change stream', { partitions: 2 }) } : {}),
  ...(k === 2 ? row('s', 3, 11.4, 1.9, 'db', 'Index shard', { layers: 2 }) : { s1: P('db', 11.4, 0, 'Search index', { layers: 2 }) }) },
  { a: ['app', 'db'], ...(k ? { b: ['db', 'cdc'], ...(k === 2 ? { c0: ['cdc', 's0'], c1: ['cdc', 's1'], c2: ['cdc', 's2'] } : { c: ['cdc', 's1'] }) } : { c: ['app', 's1'] }) });
const KAFKA = (n) => sys({ ...row('p', 2, 0, 2.6, 'server', 'Producer'), topic: P('kafka', 4.8, 0, 'orders topic', { partitions: 3 }), ...row('c', n, 9.4, 1.7, 'consumer', 'Consumer') },
  { a: ['p0', 'topic'], b: ['p1', 'topic'], ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}`, ['topic', `c${i}`]])) });
const TEMPORAL = sys({ svc: P('server', 0, 0, 'Temporal service'), hist: P('db', 0, 3.4, 'History'), ...row('w', 3, 5, 2, 'consumer', 'Worker'), pay: P('server', 9, 0, 'Payments') },
  { h: ['svc', 'hist'], a: ['svc', 'w0'], b: ['svc', 'w1'], c: ['svc', 'w2'], d: ['w1', 'pay'] });
const GW = (canary) => sys({ cust: P('laptop', -2, -1.6, 'Customer app'), bill: P('laptop', -2, 1.8, 'Restaurant billing'), gw: P('lb', 2.6, 0, 'API gateway'),
  orders: P('server', 6.6, -1.6, canary ? 'Orders v1' : 'Orders'), ...(canary ? { v2: P('server', 6.6, 1.6, 'Orders v2') } : { menus: P('server', 6.6, 1.6, 'Menus') }) },
  { a: ['cust', 'gw'], b: ['bill', 'gw'], c: ['gw', 'orders'], d: ['gw', canary ? 'v2' : 'menus'] });
const CASS = sys({ client: P('laptop', -9, 0, 'App'), ...ring(6, 4.2, 'db', 'Node', 'n', { layers: 2 }) },
  { q: ['client', 'n3'], r0: ['n3', 'n4'], r1: ['n3', 'n2'], k0: ['n0', 'n1'], k1: ['n1', 'n2'], k2: ['n4', 'n5'], k3: ['n5', 'n0'] });
const DDB = (idx) => sys({ app: P('server', 0, 0, 'Orders service'), t: P('db', 4.6, -1.4, 'Orders table'), ...(idx ? { gsi: P('db', 4.6, 2.2, 'Index by restaurant', { layers: 2 }) } : {}) },
  { a: ['app', 't'], ...(idx ? { b: ['t', 'gsi'] } : {}) });
const PG = (pool) => sys({ ...row('a', 3, 0, 2.1, 'server', 'App server'), ...(pool ? { pool: P('lb', 3.6, 0, 'Pooler') } : {}), pri: P('db', 7.4, 0, 'Primary'), rep: P('db', 11, 0, 'Replica', { layers: 2 }) },
  pool ? { a: ['a0', 'pool'], b: ['a1', 'pool'], c: ['a2', 'pool'], d: ['pool', 'pri'], r: ['pri', 'rep'] } : { a: ['a0', 'pri'], b: ['a1', 'pri'], c: ['a2', 'pri'], r: ['pri', 'rep'] });
const FLINK = sys({ src: P('kafka', 0, 0, 'Rider pings', { partitions: 2 }), ...row('j', 2, 4.4, 2, 'consumer', 'Flink task'), st: P('cache', 7.8, -2.4, 'State'), ck: P('db', 7.8, 2.6, 'Checkpoints', { layers: 2 }), out: P('db', 11, 0, 'Live counts') },
  { a: ['src', 'j0'], b: ['src', 'j1'], c: ['j0', 'st'], d: ['j1', 'st'], e: ['st', 'ck'], f: ['j0', 'out'], g: ['j1', 'out'] });
const ZK = sys({ ...ring(5, 2.6, 'server', 'ZooKeeper', 'z'), ...row('w', 3, 7.6, 2.2, 'consumer', 'Worker') },
  { a: ['w0', 'z0'], b: ['w1', 'z0'], c: ['w2', 'z4'], d: ['z0', 'z1'], e: ['z0', 'z4'] });

Object.assign(RECIPES, {
  redis: [
    { system: REDIS(0), state: { labels: { r1: ['in memory'] }, speed: 0.8 } },
    { system: REDIS(0), 
      state: { parts: { r1: 'ok' }, labels: { r1: ['cart · ranking · rate limit', 'ok'] }, speed: 1.6 } },
    { system: REDIS(1), 
      state: { parts: { r1: 'ok', disk: 'ok' }, labels: { disk: ['snapshot + log', 'ok'] }, speed: 1.2 } },
    { system: REDIS(2), 
      state: { parts: all(['r0', 'r1', 'r2'], 'ok'), labels: { r0: ['slots 0–5460', 'ok'], r2: ['slots 10923–16383', 'ok'] }, speed: 1.3 } },
  ],
  elasticsearch: [
    { system: ES(0), state: { labels: { s1: ['by words'] }, speed: 0.8 } },
    { system: ES(0), 
      state: { parts: { s1: 'ok' }, labels: { s1: ['paneer → dishes 4, 19, 77', 'ok'] }, speed: 1.2 } },
    { system: ES(1), 
      state: { parts: { db: 'ok', cdc: 'ok', s1: 'ok' }, labels: { db: ['source of truth', 'ok'], cdc: ['every change', 'ok'] }, speed: 1.3 } },
    { system: ES(2), 
      state: { parts: all(['s0', 's1', 's2'], 'ok'), labels: { s1: ['refreshed every second or so', 'ok'] }, speed: 1.3 } },
  ],
  'kafka-in-practice': [
    { system: KAFKA(3), state: { labels: { topic: ['3 partitions'] }, speed: 0.8 } },
    { system: KAFKA(3), 
      state: { parts: { topic: 'ok' }, labels: { topic: ['key = order id', 'ok'] }, speed: 1.3 } },
    { system: KAFKA(4), 
      state: { parts: { c0: 'ok', c1: 'ok', c2: 'ok', c3: 'dim' }, paths: { t3: 'dim' }, labels: { c3: ['', '', 'Idle'], c1: ['one partition each', 'ok'] }, speed: 1.3 } },
    { system: KAFKA(3), 
      state: { parts: { topic: 'warn', c0: 'warn', c1: 'warn', c2: 'warn' }, fill: { topic: 0.8 }, labels: { topic: ['lag growing', 'warn'] }, speed: 1.4 } },
  ],
  temporal: [
    { system: TEMPORAL, state: { labels: { svc: ['remembers every step'] }, speed: 0.8 } },
    { system: TEMPORAL, 
      state: { parts: { svc: 'ok', hist: 'ok', w0: 'ok', w1: 'ok', w2: 'ok' }, labels: { hist: ['every step recorded', 'ok'] }, speed: 1.3 } },
    { system: TEMPORAL, 
      state: { parts: { w1: 'alert', w2: 'ok', svc: 'ok' }, paths: { b: 'down', d: 'down' }, labels: { w1: ['gone', 'alert'], w2: ['continues', 'ok'] }, speed: 1.2 } },
    { system: TEMPORAL, 
      state: { parts: { hist: 'ok' }, paths: { a: 'dim', b: 'dim', c: 'dim', d: 'dim' }, labels: { hist: ['timer: tomorrow 10:00', 'ok'] }, speed: 0.6 } },
  ],
  'api-gateways': [
    { system: GW(false), state: { labels: { gw: ['the front door'] }, speed: 0.8 } },
    { system: GW(false), 
      state: { parts: { gw: 'ok', orders: 'ok' }, paths: { b: 'dim', d: 'dim' }, labels: { gw: ['auth · access · limit · route', 'ok'] }, speed: 1.3 } },
    { system: GW(false), 
      state: { parts: { bill: 'alert', gw: 'ok' }, paths: { b: 'alert', d: 'dim' }, labels: { bill: ['429: slow down', 'alert'] }, speed: 1.5 } },
    { system: GW(true), 
      state: { parts: { orders: 'ok', v2: 'warn' }, labels: { orders: ['95%', 'ok'], v2: ['5%', 'warn'] }, speed: 1.3 } },
  ],
  cassandra: [
    { system: CASS, state: { labels: { n0: ['a ring of equals'] }, speed: 0.8 } },
    { system: CASS, 
      state: { parts: { n3: 'ok', n4: 'ok', n2: 'ok' }, labels: { n3: ['owns the key', 'ok'] }, speed: 1.3 } },
    { system: CASS, 
      state: { parts: all(['n0', 'n1', 'n2', 'n3', 'n4', 'n5'], 'warn'), labels: { n0: ['asked', 'warn'] }, speed: 1.6 } },
    { system: CASS, 
      state: { parts: { n4: 'warn', n3: 'ok' }, labels: { n4: ['tombstone', 'warn'] }, speed: 1 } },
  ],
  dynamodb: [
    { system: DDB(false), state: { labels: { t: ['you never run it'] }, speed: 0.8 } },
    { system: DDB(false), 
      state: { parts: { t: 'ok' }, labels: { t: ['customer · time', 'ok'] }, speed: 1.2 } },
    { system: DDB(true), 
      state: { parts: { t: 'ok', gsi: 'ok' }, labels: { gsi: ['restaurant · time', 'ok'] }, speed: 1.2 } },
    { system: DDB(true), 
      state: { parts: { t: 'alert' }, labels: { t: ['one key throttled', 'alert'] }, speed: 1.6 } },
  ],
  postgresql: [
    { system: PG(false), state: { labels: { pri: ['the default'] }, speed: 0.8 } },
    { system: PG(false), 
      state: { parts: { pri: 'ok' }, labels: { pri: ['snapshot reads', 'ok'] }, speed: 1.2 } },
    { system: PG(true), 
      state: { parts: { pool: 'ok', pri: 'ok' }, labels: { pool: ['shares connections', 'ok'] }, speed: 1.4 } },
    { system: PG(true), 
      state: { parts: { pri: 'alert', rep: 'ok' }, paths: { d: 'down' }, labels: { pri: ['down', 'alert'], rep: ['promoted', 'ok'] }, speed: 1.1 } },
  ],
  flink: [
    { system: FLINK, state: { labels: { src: ['events'] }, speed: 0.8 } },
    { system: FLINK, 
      state: { parts: { j0: 'ok', j1: 'ok', out: 'ok' }, labels: { j0: ['5-minute windows', 'ok'], out: ['orders per area', 'ok'] }, speed: 1.4 } },
    { system: FLINK, 
      state: { parts: { st: 'ok', ck: 'ok' }, labels: { st: ['running counts', 'ok'], ck: ['state + positions', 'ok'] }, speed: 1.2 } },
    { system: FLINK, 
      state: { parts: { j1: 'alert', ck: 'ok' }, paths: { b: 'down', d: 'down', g: 'down' }, labels: { j1: ['restarting', 'alert'], ck: ['reload from here', 'ok'] }, speed: 1 } },
  ],
  zookeeper: [
    { system: ZK, state: { labels: { z0: ['agreed tree'] }, speed: 0.8 } },
    { system: ZK, 
      state: { parts: { z0: 'ok', z1: 'ok', z2: 'alert', z3: 'alert', z4: 'ok' }, labels: { z0: ['3 of 5 agree', 'ok'], z2: ['down', 'alert'] }, speed: 1.2 } },
    { system: ZK, 
      state: { parts: { w0: 'ok', w1: 'warn', w2: 'dim' }, labels: { w0: ['leader', 'ok'], w1: ['next in line', 'warn'] }, speed: 1.1 } },
  ],
});

// ---- real systems: what each company changed, as one system per figure ----
const SHOP = (redis) => sys({ ...row('a', 3, 0, 2, 'server', 'Checkout'), ...(redis ? { r: P('cache', 4.4, -2.6, 'Redis holds') } : {}), db: P('db', 6, 1, 'MySQL stock') },
  { a: ['a0', 'db'], b: ['a1', 'db'], c: ['a2', 'db'], ...(redis ? { d: ['a0', 'r'], e: ['a1', 'r'] } : {}) });
const DISC = (svc, scylla) => sys({ users: P('laptop', -2, 0, 'Discord'), api: P('server', 1.8, 0, 'API'), ...(svc ? { ds: P('server', 5, 0, 'Data service') } : {}),
  ...ring(5, 2.2, 'db', scylla ? 'ScyllaDB' : 'Cassandra', 'n', { layers: 2 }) },
  { a: ['users', 'api'], b: [svc ? 'ds' : 'api', 'n2'], ...(svc ? { c: ['api', 'ds'] } : {}) });
// the ring sits to the right of the API
const shift = (sy, dx) => ({ parts: Object.fromEntries(Object.entries(sy.parts).map(([k, v]) => [k, k.startsWith('n') ? { ...v, x: v.x + dx } : v])), paths: sy.paths });
const SLACK = (kafka) => sys({ ...row('web', 2, 0, 2.4, 'server', 'Web app'), ...(kafka ? { k: P('kafka', 3.8, 0, 'Kafka', { partitions: 2 }), relay: P('consumer', 6.8, 0, 'Relay') } : {}),
  redis: P('cache', kafka ? 9.6 : 4.4, 0, 'Redis queue'), ...row('w', 2, kafka ? 13 : 8, 2.4, 'consumer', 'Worker') },
  kafka ? { a: ['web0', 'k'], b: ['web1', 'k'], c: ['k', 'relay'], d: ['relay', 'redis'], e: ['redis', 'w0'], f: ['redis', 'w1'] } : { a: ['web0', 'redis'], b: ['web1', 'redis'], e: ['redis', 'w0'], f: ['redis', 'w1'] });
const FIG = sys({ ...row('u', 3, 0, 2.2, 'laptop', 'Editor'), mp: P('server', 4.4, 0, 'Multiplayer server'), db: P('db', 8.4, 0, 'File') },
  { a: ['u0', 'mp'], b: ['u1', 'mp'], c: ['u2', 'mp'], d: ['mp', 'db'] });
const SPOT = (idx) => sys({ svc: P('server', 0, 0, 'Service'), bt: P('db', 4, -2.6, 'Bigtable', { layers: 2 }), lake: P('db', 8, 1.4, 'Parquet on cloud storage', { layers: 4 }), ...(idx ? { ix: P('cache', 4, 1.4, 'Key index') } : {}) },
  { a: ['svc', 'bt'], ...(idx ? { b: ['svc', 'ix'], c: ['ix', 'lake'] } : { b: ['svc', 'lake'] }) });
const META = (gw) => { const parts = { ...row('c', 4, 0, 1.8, 'laptop', 'Client host'), ...row('d', 3, gw ? 8.4 : 6, 2.4, 'db', 'ZippyDB host', { layers: 2 }), ...(gw ? row('g', 2, 4.2, 2.4, 'lb', 'ZGateway') : {}) };
  const paths = {};
  if (gw) { for (let i = 0; i < 4; i++) paths[`cg${i}`] = [`c${i}`, `g${i < 2 ? 0 : 1}`]; for (let g = 0; g < 2; g++) for (let d = 0; d < 3; d++) paths[`g${g}d${d}`] = [`g${g}`, `d${d}`]; }
  else for (let i = 0; i < 4; i++) for (let d = 0; d < 3; d++) paths[`c${i}d${d}`] = [`c${i}`, `d${d}`];
  return sys(parts, paths); };

Object.assign(RECIPES, {
  'shopify-reservations': [
    { system: SHOP(true), state: { labels: { db: ['the last unit'] }, speed: 0.8 } },
    { system: SHOP(true), 
      state: { parts: { r: 'warn', db: 'warn' }, labels: { r: ['holds', 'warn'], db: ['stock', 'warn'] }, speed: 1.3 } },
    { system: SHOP(false), 
      state: { parts: { db: 'ok', a0: 'ok', a1: 'ok', a2: 'ok' }, labels: { db: ['one row per unit', 'ok'] }, speed: 1.4 } },
    { system: SHOP(false), 
      state: { parts: { a0: 'warn', a1: 'warn', a2: 'warn', db: 'ok' }, labels: { a1: ['waiting for a connection', 'warn'], db: ['queries fast', 'ok'] }, speed: 1.2 } },
  ],
  'discord-messages': [
    { system: shift(DISC(false, false), 7), state: { labels: { n0: ['trillions of messages'] }, speed: 0.8 } },
    { system: shift(DISC(false, false), 7), 
      state: { parts: { n2: 'alert', n3: 'warn' }, labels: { n2: ['hot partition', 'alert'] }, speed: 1.6 } },
    { system: shift(DISC(true, false), 9), 
      state: { parts: { ds: 'ok', n2: 'ok' }, labels: { ds: ['one query per burst', 'ok'] }, speed: 1.4 } },
    { system: shift(DISC(true, true), 9), 
      state: { parts: all(['n0', 'n1', 'n2', 'n3', 'n4'], 'ok'), labels: { n0: ['calm', 'ok'] }, speed: 1.2 } },
  ],
  'slack-job-queue': [
    { system: SLACK(false), state: { labels: { redis: ['up to 33,000 jobs/s'] }, speed: 0.8 } },
    { system: SLACK(false), 
      state: { parts: { redis: 'alert', w0: 'dim', w1: 'dim' }, labels: { redis: ['out of memory', 'alert'] }, speed: 1.8 } },
    { system: SLACK(true), 
      state: { parts: { k: 'warn', relay: 'ok', redis: 'ok' }, fill: { k: 0.6 }, labels: { k: ['backlog on disk', 'warn'], redis: ['within memory', 'ok'] }, speed: 1.4 } },
  ],
  'figma-multiplayer': [
    { system: FIG, state: { labels: { mp: ['one file, many people'] }, speed: 0.8 } },
    { system: FIG, 
      state: { parts: { mp: 'ok' }, labels: { mp: ['one order for all', 'ok'] }, speed: 1.3 } },
    { system: FIG, 
      state: { parts: { u0: 'warn', u2: 'ok' }, labels: { u0: ['colour: red', 'warn'], u2: ['colour: blue · wins', 'ok'] }, speed: 1.3 } },
  ],
  'spotify-data-lake': [
    { system: SPOT(false), state: { labels: { lake: ['exabytes'], bt: ['petabytes'] }, speed: 0.8 } },
    { system: SPOT(false), 
      state: { parts: { lake: 'warn' }, labels: { lake: ['read after read', 'warn'] }, speed: 1.3 } },
    { system: SPOT(true), 
      state: { parts: { ix: 'ok', lake: 'ok' }, labels: { ix: ['key → files and rows', 'ok'], lake: ['ranged reads', 'ok'] }, speed: 1.4 } },
  ],
  'meta-zgateway': [
    { system: META(false), state: { labels: { d1: ['ZippyDB'] }, speed: 0.8 } },
    { system: META(false), 
      state: { parts: { d0: 'warn', d1: 'warn', d2: 'warn' }, labels: { d1: ['connections keep growing', 'warn'] }, speed: 1.6 } },
    { system: META(true), 
      state: { parts: { g0: 'ok', g1: 'ok', d0: 'ok', d1: 'ok', d2: 'ok' }, labels: { g0: ['batches and merges', 'ok'], d1: ['bounded', 'ok'] }, speed: 1.3 } },
  ],
});

const PREVIEW_Q = {};
// ---- interview questions: the question's high-level design, then its deep dives. A chapter that names a section
// (h2) takes its words from that section of the article at run time (article.js), so the text is always the article's.
/** columns of parts, left to right; edges as "a>b c>d" */
const hl = (cols, edges, gap = 3.8) => {
  const parts = {};
  cols.forEach((col, ci) => col.forEach(([id, kind, name, extra = {}], ri) => { parts[id] = P(kind, ci * gap, (ri - (col.length - 1) / 2) * 2.4, name, extra); }));
  const paths = Object.fromEntries(edges.split(' ').map((e) => { const [a, b] = e.split('>'); return [`${a}-${b}`, [a, b]]; }));
  return { parts, paths };
};
const qL = (id, name = 'Users') => [id, 'laptop', name];
const qS = (id, name) => [id, 'server', name];
const qD = (id, name, extra) => [id, 'db', name, extra];
const qC = (id, name) => [id, 'cache', name];
const qG = (id, name) => [id, 'globe', name];
const qB = (id, name) => [id, 'lb', name];
const qQ = (id, name) => [id, 'queue', name];
const qK = (id, name, n = 2) => [id, 'kafka', name, { partitions: n }];
const qW = (id, name = 'Worker') => [id, 'consumer', name];
/** a design question: hero, the high-level design, then two deep dives that light the parts they are about */
const design = (system, heroLabel, dives) => [
  { system, state: { labels: heroLabel, speed: 0.8 } },
  { system, h2: '4. High-level design', words: [null, 'The parts and how they connect'], state: { parts: all(Object.keys(system.parts).filter((k) => system.parts[k].kind !== 'laptop'), 'ok'), speed: 1.2 } },
  ...dives.map(([h2, heavy, parts, labels, extra = {}]) => ({ system, h2, words: [null, heavy], state: { parts, labels, speed: 1.4, ...extra } })),
];
const Qs = {
  url: hl([[qL('u')], [qB('lb', 'Load balancer')], [qS('w', 'Write service'), qS('r', 'Redirect service')], [qC('c', 'Cache'), qD('db', 'Links')]], 'u>lb lb>w lb>r w>db r>c r>db'),
  sync: hl([[qL('ph', 'Phone'), qL('lap', 'Laptop')], [qS('api', 'API'), qS('sync', 'Sync service')], [qD('st', 'Object storage', { layers: 4 }), qD('db', 'File records')]], 'ph>api ph>st api>db sync>lap db>sync'),
  near: hl([[qL('u', 'Customer')], [qS('s', 'Search service')], [qC('c', 'Cache'), qD('geo', 'Geo index', { layers: 2 }), qD('db', 'Restaurants')]], 'u>s s>c s>geo s>db'),
  grocery: hl([[qL('u', 'Customer')], [qS('o', 'Order service')], [qC('c', 'Stock cache'), qD('inv', 'Store stock'), qS('dis', 'Dispatch')], [qL('r', 'Rider')]], 'u>o o>c o>inv o>dis dis>r'),
  tickets: hl([[qL('u', 'Fans')], [qQ('wr', 'Waiting room')], [qS('b', 'Booking service')], [qC('h', 'Holds'), qD('db', 'Seats')]], 'u>wr wr>b b>h b>db'),
  photos: hl([[qL('u')], [qG('cdn', 'CDN'), qS('api', 'API')], [qD('st', 'Image storage', { layers: 4 }), qD('db', 'Photo records'), qC('likes', 'Like counts')]], 'u>cdn u>api cdn>st api>db api>likes'),
  feed: hl([[qL('u')], [qS('fs', 'Feed service'), qS('ps', 'Post service')], [qC('fc', 'Feed lists'), qK('k', 'New posts')], [qW('fo', 'Fan-out'), qD('db', 'Posts')]], 'u>fs u>ps fs>fc ps>k k>fo fo>fc ps>db'),
  dating: hl([[qL('u')], [qS('sw', 'Swipe service')], [qD('db', 'Swipes', { layers: 2 }), qC('deck', 'Ready decks')], [qW('dw', 'Deck builder')]], 'u>sw sw>db sw>deck dw>deck'),
  judge: hl([[qL('u', 'Coders')], [qS('api', 'Submit API')], [qQ('q', 'Run queue')], [qW('w0', 'Sandbox'), qW('w1', 'Sandbox')], [qD('db', 'Results')]], 'u>api api>q q>w0 q>w1 w0>db w1>db'),
  chat: hl([[qL('a', 'Asha')], [qS('c1', 'Connection server')], [qS('cs', 'Chat service'), qD('db', 'Messages')], [qS('c2', 'Connection server')], [qL('b', 'Ravi')]], 'a>c1 c1>cs cs>db cs>c2 c2>b'),
  notif: hl([[qS('svc', 'Services')], [qS('api', 'Notify API')], [qQ('otp', 'Urgent lane'), qQ('bulk', 'Bulk lane')], [qW('w0'), qW('w1')], [qG('push', 'SMS and push')]], 'svc>api api>otp api>bulk otp>w0 bulk>w1 w0>push w1>push'),
  pay: hl([[qL('u', 'Customer')], [qS('ps', 'Payment service')], [qD('led', 'Ledger'), qG('prov', 'Payment provider')]], 'u>ps ps>led ps>prov'),
  sched: hl([[qS('api', 'API')], [qD('db', 'Jobs by due time')], [qS('sc', 'Scheduler')], [qQ('q', 'Due jobs')], [qW('w0'), qW('w1')]], 'api>db db>sc sc>q q>w0 q>w1'),
  crawl: hl([[qQ('fr', 'Frontier')], [qW('f0', 'Fetcher'), qW('f1', 'Fetcher')], [qG('web', 'The web'), qC('seen', 'Seen URLs')], [qD('st', 'Pages', { layers: 4 })]], 'fr>f0 fr>f1 f0>web f1>web f0>seen f1>st'),
  board: hl([[qS('g', 'Game servers')], [qS('ss', 'Score service')], [qC('z', 'Sorted set'), qD('db', 'Scores')], [qL('u', 'Players')]], 'g>ss ss>z ss>db z>u'),
  ads: hl([[qL('u')], [qS('api', 'Click API')], [qK('k', 'Clicks', 3)], [qW('sp', 'Stream counter'), qD('raw', 'Raw clicks', { layers: 4 })], [qD('db', 'Counts')]], 'u>api api>k k>sp k>raw sp>db'),
  kv: { parts: { cl: P('laptop', -8.4, 0, 'Client'), ...ring(6, 4, 'db', 'Node', 'n', { layers: 2 }) }, paths: { q: ['cl', 'n3'], a: ['n3', 'n4'], b: ['n3', 'n2'] } },
  editor: hl([[qL('e0', 'Editor'), qL('e1', 'Editor')], [qS('cs', 'Collab server')], [qD('db', 'Document'), qD('ops', 'Edit log', { layers: 4 })]], 'e0>cs e1>cs cs>db cs>ops'),
  dispatch: hl([[qL('r', 'Riders'), qL('u', 'Customer')], [qS('loc', 'Location service'), qS('ord', 'Order service')], [qC('geo', 'Rider locations'), qS('dis', 'Dispatch')], [qD('db', 'Assignments')]], 'r>loc u>ord loc>geo ord>dis dis>geo dis>db'),
  video: hl([[qL('cr', 'Creator')], [qD('raw', 'Uploads', { layers: 3 })], [qW('t0', 'Transcoder'), qW('t1', 'Transcoder')], [qD('st', 'Video chunks', { layers: 4 })], [qG('cdn', 'CDN')], [qL('v', 'Viewers')]], 'cr>raw raw>t0 raw>t1 t0>st t1>st st>cdn cdn>v', 3.4),
  menus: hl([[qL('u')], [qS('s', 'Search service')], [qD('ix', 'Search index', { layers: 2 }), qK('k', 'Menu changes')], [qD('db', 'Menus')]], 'u>s s>ix db>k k>ix', 3.8),
  upi: hl([[qL('u', 'Payer app')], [qS('sw', 'UPI switch')], [qD('db', 'Transactions'), qQ('q', 'Bank calls')], [qW('w0', 'Bank workers'), qG('bk', 'Banks')]], 'u>sw sw>db sw>q q>w0 w0>bk'),
  tatkal: hl([[qL('u', 'Travellers')], [qG('cdn', 'CDN')], [qQ('wr', 'The line')], [qS('b', 'Booking service')], [qD('db', 'Berths')]], 'u>cdn cdn>wr wr>b b>db'),
  ipl: hl([[qS('enc', 'Encoder')], [qD('st', 'Segment store', { layers: 4 })], [qC('sh', 'Origin shield')], [qS('or', 'Origin')], [qG('cdn', 'CDN')], [qL('v', 'Viewers')]], 'enc>st st>sh sh>or or>cdn cdn>v', 3.4),
  live: hl([[qS('enc', 'Encoder')], [qS('or', 'Origin')], [qG('cdn0', 'CDN'), qG('cdn1', 'CDN')], [qL('v0', 'Viewers'), qL('v1', 'Viewers')]], 'enc>or or>cdn0 or>cdn1 cdn0>v0 cdn1>v1'),
};
const ok = (...ids) => all(ids, 'ok');
Object.assign(RECIPES, {
  'url-shortener': design(Qs.url, { r: ['opens'] }, [['Making short codes', 'The write path', ok('w', 'db'), { w: ['new short code', 'ok'] }], ['Fast redirects', 'Answered from the cache', ok('r', 'c'), { c: ['most opens', 'ok'] }]]),
  'file-sync': design(Qs.sync, { st: ['the bytes'] }, [['Big files on patchy networks', 'Parts straight to storage', ok('st'), { st: ['upload in parts', 'ok'] }], ['Keeping devices in step', 'Changes reach every device', ok('sync', 'lap'), { lap: ['in step', 'ok'] }]]),
  'restaurants-near-me': design(Qs.near, { geo: ['by location'] }, [['Finding what', 'A geo index answers first', ok('geo'), { geo: ['cells near you', 'ok'] }], ['The 8 pm rush', 'The cache takes the peak', { c: 'ok', s: 'warn' }, { c: ['popular areas', 'ok'] }]]),
  'grocery-delivery': design(Qs.grocery, { inv: ['per dark store'] }, [['The last packet of milk', 'Two orders, one unit', { inv: 'warn' }, { inv: ['1 left', 'warn'] }], ['Showing stock while browsing', 'Read from a fast copy', ok('c'), { c: ['a little behind', 'ok'] }]]),
  'ticket-booking': design(Qs.tickets, { db: ['every seat'] }, [['Never selling a seat twice', 'The database decides', ok('db', 'h'), { db: ['one buyer per seat', 'ok'] }], ['A fair line', 'A waiting room lets fans in', { wr: 'warn' }, { wr: ['in batches', 'warn'] }]]),
  'photo-sharing': design(Qs.photos, { cdn: ['images'] }, [['Serving images fast', 'The CDN carries the images', ok('cdn', 'st'), { cdn: ['near the viewer', 'ok'] }], ['A like count for a viral photo', 'One hot counter', { likes: 'warn' }, { likes: ['one photo, many likes', 'warn'] }]]),
  'news-feed': design(Qs.feed, { fc: ['one list per person'] }, [['Pull, push, or both', 'Lists written ahead', ok('k', 'fo', 'fc'), { fo: ['writes followers’ lists', 'ok'] }], ['Keeping lists small', 'Short lists in the cache', ok('fc'), { fc: ['recent posts only', 'ok'] }]]),
  'dating-swipes': design(Qs.dating, { db: ['every swipe'] }, [['Spotting a match', 'Check the other side’s swipe', ok('db', 'sw'), { sw: ['both said yes', 'ok'] }], ['Decks that are ready', 'Built ahead by workers', ok('dw', 'deck'), { deck: ['ready before you open', 'ok'] }]]),
  'coding-judge': design(Qs.judge, { q: ['submissions'] }, [['Running strangers', 'Each run in its own sandbox', ok('w0', 'w1'), { w0: ['isolated', 'ok'] }], ['Surviving the last 15 minutes', 'The queue absorbs the rush', { q: 'warn' }, { q: ['last-minute rush', 'warn'] }, { fill: {} }]]),
  'chat-app': design(Qs.chat, { a: ['', '', 'Asha'], b: ['', '', 'Ravi'] }, [['Getting messages to the phone', 'Down an open connection', ok('c2', 'b'), { c2: ['holds Ravi’s connection', 'ok'] }], ['One order, and nothing lost', 'Stored, in order, per chat', ok('db'), { db: ['in order', 'ok'] }]]),
  notifications: design(Qs.notif, { api: ['one front door'] }, [['Lanes', 'Urgent messages skip the queue', { otp: 'ok', bulk: 'warn' }, { otp: ['OTPs', 'ok'], bulk: ['offers can wait', 'warn'] }], ['Never twice', 'One send per id', ok('w0', 'w1'), { w0: ['sent once', 'ok'] }]]),
  payments: design(Qs.pay, { led: ['every rupee'] }, [['Never twice', 'One key per payment', ok('ps', 'led'), { ps: ['same key, same answer', 'ok'] }], ['Unknown is not failed', 'Ask the provider before retrying', { prov: 'warn' }, { prov: ['no reply yet', 'warn'] }]]),
  'job-scheduler': design(Qs.sched, { db: ['by due time'] }, [['Finding what', 'Due jobs, found by time', ok('db', 'sc'), { sc: ['what is due now', 'ok'] }], ['When a worker dies', 'Its lease runs out', { w0: 'alert', w1: 'ok' }, { w0: ['stopped', 'alert'], w1: ['takes it over', 'ok'] }]]),
  'web-crawler': design(Qs.crawl, { fr: ['URLs to visit'] }, [['Being polite', 'A few requests per site', { web: 'ok', f0: 'ok', f1: 'warn' }, { f1: ['waits its turn', 'warn'] }], ['Never twice', 'Check before fetching', ok('seen'), { seen: ['already fetched?', 'ok'] }]]),
  leaderboard: design(Qs.board, { z: ['always sorted'] }, [['Keeping it sorted', 'A sorted set in memory', ok('z'), { z: ['top scores', 'ok'] }], ['Your rank, cheaply', 'Ask the sorted set', ok('z', 'u'), { u: ['your rank', 'ok'] }]]),
  'ad-clicks': design(Qs.ads, { k: ['every click'] }, [['Counting fast', 'Counted in the stream', ok('sp', 'db'), { sp: ['running counts', 'ok'] }], ['Late events and windows', 'By when the click happened', { sp: 'warn' }, { sp: ['late clicks', 'warn'] }]]),
  'key-value-store': design(Qs.kv, { n0: ['a ring of nodes'] }, [['Where a key lives', 'Consistent hashing on a ring', ok('n3'), { n3: ['owns the key', 'ok'] }], ['Three copies', 'Agree enough to answer', ok('n2', 'n3', 'n4'), { n4: ['copy', 'ok'], n2: ['copy', 'ok'] }]]),
  'shared-editor': design(Qs.editor, { cs: ['one document'] }, [['Two people, one line', 'The server orders the edits', ok('cs', 'ops'), { ops: ['one order', 'ok'] }], ['Your own typing feels instant', 'Shown on your screen first', ok('e0'), { e0: ['instant', 'ok'] }]]),
  'rider-dispatch': design(Qs.dispatch, { geo: ['every few seconds'] }, [['Where riders are', 'Pings into a fast store', ok('loc', 'geo'), { geo: ['live positions', 'ok'] }], ['One order at a time', 'A rider is claimed once', ok('dis', 'db'), { db: ['one order per rider', 'ok'] }]]),
  'video-streaming': design(Qs.video, { cdn: ['the weight'] }, [['Getting it ready fast', 'Chunks transcoded in parallel', ok('t0', 't1'), { t0: ['chunk by chunk', 'ok'] }], ['The CDN carries the weight', 'Viewers stream from the edge', ok('cdn', 'v'), { cdn: ['most of the bytes', 'ok'] }]]),
  'menu-search': design(Qs.menus, { ix: ['by words'] }, [['Finding dishes by their words', 'An index of words', ok('ix', 's'), { ix: ['paneer → dishes', 'ok'] }], ['Fresh enough', 'Changes stream into the index', ok('k', 'ix'), { k: ['menu edits', 'ok'] }]]),
  'upi-switch': design(Qs.upi, { db: ['one row per payment'] }, [['Never twice', 'One request id per payment', ok('sw', 'db'), { db: ['same id, same payment', 'ok'] }], ['Unknown is not failed', 'Pending until the bank answers', { bk: 'warn' }, { bk: ['no reply yet', 'warn'] }]]),
  'tatkal-booking': design(Qs.tatkal, { db: ['every berth'] }, [['The page everyone refreshes', 'The CDN answers it', ok('cdn'), { cdn: ['the same page for all', 'ok'] }], ['A fair line', 'Admitted at the rate booking can take', { wr: 'warn' }, { wr: ['in batches', 'warn'] }]]),
  'ipl-live-streaming': design(Qs.ipl, { cdn: ['a crore viewers'] }, [['Protect the origin', 'The shield reads the store once', ok('sh', 'or'), { sh: ['one read per segment', 'ok'] }], ['Everyone arrives at the toss', 'Servers started before 7 pm', { or: 'warn' }, { or: ['ready before the toss', 'warn'] }]]),
  'ind-vs-pak': design(Qs.live, { v0: ['crores watching'] }, [['Everyone arrives at the toss', 'The CDN takes the crowd', { cdn0: 'warn', cdn1: 'warn', or: 'ok' }, { cdn0: ['the toss', 'warn'] }], ['Degrade, don', 'Lower quality, never down', ok('cdn0', 'cdn1'), { cdn1: ['lower bitrate', 'ok'] }]]),
});
// the start-here guides: one system that grows as the guide goes
const FULL = hl([[qL('u')], [qB('lb', 'Load balancer')], [qS('a0', 'App server'), qS('a1', 'App server')], [qC('c', 'Cache'), qD('db', 'Database'), qK('k', 'Kafka')], [qW('w', 'Worker')]], 'u>lb lb>a0 lb>a1 a0>c a0>db a1>db a1>k k>w');
const SMALL = hl([[qL('u')], [qS('a0', 'App server')], [qD('db', 'Database')]], 'u>a0 a0>db');
const named = (sy, names) => ({ parts: Object.fromEntries(Object.entries(sy.parts).map(([k, v]) => [k, names[k] ? { ...v, name: names[k] } : v])), paths: sy.paths });
const TECH = named(FULL, { lb: 'API gateway', c: 'Redis', db: 'PostgreSQL', k: 'Kafka', w: 'Flink' });
const guide = (system, steps) => [{ system: steps[0][0], state: { speed: 0.8 } }, ...steps.map(([sy, h2, heavy, parts = {}, labels = {}]) => ({ system: sy, h2, words: [null, heavy], state: { parts, labels, speed: 1.2 } }))];
Object.assign(RECIPES, {
  'system-design-interviews': guide(FULL, [[SMALL, 'What happens in the room', 'You design, out loud'], [FULL, 'What is being scored', 'The reasons, not the boxes', ok('lb', 'a0', 'a1', 'db')], [FULL, 'What changes with seniority', 'Deeper on the hard part', { db: 'warn', k: 'ok' }, { db: ['the hard part', 'warn'] }]]),
  'how-to-prepare': guide(FULL, [[SMALL, 'Weeks 1 and 2', 'Learn the parts'], [FULL, 'Weeks 2 to 4', 'Whole designs, worked', ok('a0', 'a1', 'c', 'db')], [FULL, 'Mock interviews', 'Practise under pressure', { a0: 'warn', a1: 'warn' }, { a1: ['out loud, on the clock', 'warn'] }]]),
  'how-to-answer': guide(FULL, [[SMALL, '1. Requirements', 'What it must do'], [SMALL, '2. The numbers', 'Only the numbers that change the design', ok('db'), { db: ['how much data, how fast', 'ok'] }], [FULL, '4. High-level design', 'Every part, one sentence each', ok('lb', 'a0', 'a1', 'c', 'db', 'k', 'w')], [FULL, '5. Deep dives', 'Two or three hard parts', { c: 'warn', k: 'warn' }, { c: ['deep dive', 'warn'], k: ['deep dive', 'warn'] }]]),
  'core-concepts-guide': guide(FULL, [[FULL, 'Networking essentials', 'How a request travels', ok('lb'), { lb: ['networking', 'ok'] }], [FULL, 'Caching', 'Answers kept in memory', ok('c'), { c: ['caching', 'ok'] }], [FULL, 'Sharding', 'Data split across machines', ok('db'), { db: ['sharding', 'ok'] }]]),
  'technologies-guide': guide(TECH, [[TECH, 'Redis', 'In memory, very fast', ok('c'), { c: ['Redis', 'ok'] }], [TECH, 'Kafka', 'A log many can read', ok('k'), { k: ['Kafka', 'ok'] }], [TECH, 'PostgreSQL', 'The default database', ok('db'), { db: ['PostgreSQL', 'ok'] }]]),
  'patterns-guide': guide(FULL, [[FULL, 'Real-time updates', 'From one event to every screen', ok('lb', 'u'), { u: ['live', 'ok'] }], [FULL, 'Scaling reads', 'Layers that take the load', ok('c'), { c: ['most reads', 'ok'] }], [FULL, 'Long jobs', 'Queued for workers', ok('k', 'w'), { w: ['minutes of work', 'ok'] }]]),
  'questions-guide': guide(FULL, [[SMALL, 'Easy', 'Few parts, one hard idea'], [FULL, 'Medium', 'More parts, more trade-offs', ok('a0', 'a1', 'c', 'db', 'k')], [FULL, 'An order to take them in', 'Easy first, then build up', ok('lb', 'a0', 'a1', 'c', 'db', 'k', 'w')]]),
});
for (const k of ['url-shortener', 'file-sync', 'restaurants-near-me', 'grocery-delivery', 'ticket-booking', 'photo-sharing', 'news-feed', 'dating-swipes', 'coding-judge', 'chat-app', 'notifications', 'payments', 'job-scheduler', 'web-crawler', 'leaderboard', 'ad-clicks', 'key-value-store', 'shared-editor', 'rider-dispatch', 'video-streaming', 'menu-search', 'ind-vs-pak', 'upi-switch', 'tatkal-booking', 'ipl-live-streaming']) PREVIEW_Q[k] = 1;

/** the step a list preview shows: the system working, not failing */
export const PREVIEW = { 'networking-essentials': 1, caching: 2, sharding: 2, 'consistent-hashing': 3, 'cap-theorem': 1, 'api-design': 1, 'data-modelling': 3,
  'database-indexing': 2, 'numbers-to-know': 2, 'real-time-updates': 3, contention: 2, workflows: 2, 'scaling-reads': 2, 'scaling-writes': 2, 'big-files': 2,
  'long-jobs': 1, 'nearby-search': 2, 'vector-search': 1, 'time-series': 3, sketches: 3, 'change-capture': 3,
  redis: 3, elasticsearch: 2, 'kafka-in-practice': 2, temporal: 1, 'api-gateways': 1, cassandra: 1, dynamodb: 2, postgresql: 2, flink: 2, zookeeper: 1,
  'shopify-reservations': 2, 'discord-messages': 2, 'slack-job-queue': 2, 'figma-multiplayer': 2, 'spotify-data-lake': 2, 'meta-zgateway': 2, ...PREVIEW_Q,
  'how-to-answer': 3, 'core-concepts-guide': 1, 'technologies-guide': 2, 'patterns-guide': 2, 'questions-guide': 3, 'system-design-interviews': 2, 'how-to-prepare': 2 };

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

// The words and the sentence of each story step are the text of the 3D story: they are not in this file. A signed-in reader's
// browser gets them from the API (GET /v1/stories, tech-katta-context 52) and puts them back here; signing out takes them away again.
const restored = [];
export function applyStories(stories) {
  clearStories();
  for (const [slug, steps] of Object.entries(stories || {})) {
    const rec = RECIPES[slug];
    if (!rec) continue;
    steps.forEach((s, i) => {
      const step = rec[i];
      if (!s || !step) return;
      restored.push([step, step.words, step.text]);
      if (s.words) step.words = s.words.map((w, k) => w ?? step.words?.[k] ?? null);
      if (s.text) step.text = s.text;
    });
  }
}
export function clearStories() { for (const [step, words, text] of restored.splice(0)) { if (words === undefined) delete step.words; else step.words = words; if (text === undefined) delete step.text; else step.text = text; } }
