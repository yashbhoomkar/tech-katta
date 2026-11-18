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
      state: { parts: { cache0: 'ok', db: 'alert' }, paths: { 'app0-db': 'alert', 'app1-db': 'alert' }, labels: { cache0: ['popular menu expired', 'warn'], db: ['thousands of misses at once', 'alert'] }, speed: 1.7 } },
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
    { system: API, words: ['One request', 'Three places for input'], text: 'The path says which resource, the query says how to narrow or shape the answer, and the body carries the data being created or changed.',
      state: { parts: { api: 'ok', orders: 'ok' }, paths: { c: 'dim', e: 'dim' }, labels: { api: ['POST /orders', 'ok'], orders: ['path · query · body', 'ok'] }, speed: 1.2 } },
    { system: API, words: ['A retry sends it twice', 'An idempotency key stops a double order'], text: 'Only POST, and some PATCHes, change the outcome when sent twice. Placing an order carries a key, so the second copy returns the first answer.',
      state: { parts: { phone: 'warn', orders: 'ok', db: 'ok' }, paths: { a: 'warn', c: 'dim', e: 'dim' }, labels: { phone: ['retried', 'warn'], db: ['one order, not two', 'ok'] }, speed: 1.4 } },
    { system: API, words: ['50 orders and their restaurants', '51 queries, or 2'], text: 'One query for the list and one per order makes 51. A batching loader collects the 50 restaurant ids and fetches them together: 2 in all.',
      state: { parts: { menus: 'warn', db: 'warn' }, paths: { b: 'dim', d: 'dim' }, labels: { menus: ['batching loader', 'ok'], db: ['51 → 2 queries', 'warn'] }, speed: 1.3 } },
  ],
  'data-modelling': [
    { system: DM(false), state: { labels: { db: ['restaurants · menus · orders'] }, speed: 0.8 } },
    { system: DM(false), words: ['Start from the screens', 'Tables, keys and links'], text: 'List what each main screen reads and writes, then draw the tables, their keys and how they link. The shape decides which reads are one lookup.',
      state: { parts: { db: 'ok' }, labels: { db: ['tables, keys, links', 'ok'] }, speed: 1.1 } },
    { system: DM(false), words: ['Index what the screens read', 'Then decide how far to normalise'], text: 'Add the indexes that serve the main screens, and keep each fact in one place unless a hot read needs a copy.',
      state: { parts: { db: 'ok', app: 'ok' }, labels: { db: ['index: orders by customer', 'ok'] }, speed: 1.2 } },
    { system: DM(true), words: ['When one database isn’t enough', 'A key-value store for hot reads'], text: 'The relational database stays the source of truth; a key-value store in front of it serves the hot reads. A change updates the database and removes the cached copy.',
      state: { parts: { db: 'ok', kv: 'ok' }, labels: { db: ['source of truth', 'ok'], kv: ['hot reads', 'ok'] }, speed: 1.4 } },
  ],
  'database-indexing': [
    { system: IDX0, state: { labels: { db: ['crores of rows'] }, speed: 0.8 } },
    { system: IDX0, words: ['Without an index', 'Page after page'], text: 'To find one phone number, the database reads the table page by page until it finds the row.',
      state: { parts: { db: 'alert' }, labels: { db: ['reads every page', 'alert'] }, speed: 1.5 } },
    { system: IDX1, words: ['A B-tree', 'Three page reads'], text: 'Looking up id 350: the root says between 300 and 600, an internal page narrows it to 340 to 360, and the leaf points to the row. The top levels stay in memory.',
      state: { parts: { root: 'ok', mid: 'ok', leaf: 'ok', db: 'ok' }, labels: { root: ['300 to 600', 'ok'], mid: ['340 to 360', 'ok'], leaf: ['id 350', 'ok'] }, speed: 1.2 } },
    { system: IDX2, words: ['Every index costs a write', 'One order, four writes'], text: 'A new order updates the table and each of its three indexes before the insert is done. Index what you read, not everything.',
      state: { parts: { db: 'ok', i1: 'warn', i2: 'warn', i3: 'warn' }, labels: { db: ['1 insert', 'ok'], i2: ['+3 index writes', 'warn'] }, speed: 1.3 } },
  ],
  'numbers-to-know': [
    { system: NUM, state: { labels: { one: ['one machine'] }, speed: 0.8 } },
    { system: NUM, words: ['One machine', 'Does more than old figures say'], text: 'A single cloud machine today has many cores, terabytes of memory when optimised for it, tens of terabytes of local SSD and a fast network.',
      state: { parts: { one: 'ok', mem: 'ok', ssd: 'ok' }, paths: { d: 'dim' }, labels: { one: ['cores and a fast network', 'ok'], mem: ['terabytes', 'ok'], ssd: ['tens of TB', 'ok'] }, speed: 1.2 } },
    { system: NUM, words: ['Each hop costs more', 'About ten times the one before'], text: 'Memory, SSD, a call in the same zone, another zone, another region: each step is roughly ten times slower than the one before.',
      state: { parts: { mem: 'ok', ssd: 'ok', far: 'warn' }, labels: { mem: ['fastest', 'ok'], ssd: ['~10× slower', 'ok'], far: ['far slower again', 'warn'] }, speed: 1.2 } },
    { system: NUM, words: ['Most features fit', 'Shard when the numbers say so'], text: 'Zotato’s users and a year of orders fit on one large database many times over. Sharding makes sense only for many years of history or far higher write rates.',
      state: { parts: { ssd: 'ok', one: 'ok' }, paths: { d: 'dim' }, labels: { ssd: ['users + a year of orders: fits', 'ok'] }, speed: 1 } },
  ],
  'real-time-updates': [
    { system: RT, state: { labels: { asha: ['', '', 'Asha'], ravi: ['', '', 'Ravi'] }, speed: 0.8 } },
    { system: RT, words: ['Asking on a timer', 'Up to one interval late'], text: 'Polling asks again and again and learns of a message up to one interval late. Long polling keeps the request waiting so the answer leaves the moment the message arrives.',
      state: { parts: { ravi: 'warn' }, paths: { c: 'warn' }, labels: { ravi: ['asks every few seconds', 'warn'] }, speed: 1.3 } },
    { system: RT, words: ['A message takes two hops', 'Service, then connection'], text: 'From the chat service to the connection server holding Ravi’s open connection, then down that connection to his phone.',
      state: { parts: { chat: 'ok', conn: 'ok' }, labels: { chat: ['hop 1', 'ok'], conn: ['holds Ravi’s connection', 'ok'] }, speed: 1.3 } },
    { system: RT, words: ['Keep the connection open', 'Send the moment it happens'], text: 'Server-sent events push down one open response and resume from the last id after a cut. A WebSocket lets either side send whenever it has something.',
      state: { parts: { chat: 'ok', conn: 'ok', ravi: 'ok', asha: 'ok' }, paths: { a: 'ok', b: 'ok', c: 'ok' }, labels: { ravi: ['delivered', 'ok'] }, speed: 1.8 } },
  ],
  contention: [
    { system: CON(false), state: { labels: { db: ['1 seat left'] }, speed: 0.8 } },
    { system: CON(false), words: ['Two buyers, one seat', 'Read then write leaves a gap'], text: 'Both requests read “1 left”, both write “sold”. In the gap between the read and the write, another request read the same value.',
      state: { parts: { db: 'alert', u1: 'warn', u2: 'warn' }, labels: { db: ['sold twice', 'alert'] }, speed: 1.6 } },
    { system: CON(false), words: ['Let the database decide', 'One conditional update'], text: 'Update the row only if the seat is still free. The database applies it one request at a time, so exactly one buyer wins and the other is told no.',
      state: { parts: { db: 'ok', u1: 'ok', u2: 'dim' }, labels: { db: ['update only if still free', 'ok'] }, speed: 1.2 } },
    { system: CON(true), words: ['Hold it, then sell it', 'A hold ends by itself'], text: 'A hold with an expiry needs nobody to release it, so an app that crashes mid-payment can’t keep the seat forever.',
      state: { parts: { hold: 'warn', db: 'ok' }, labels: { hold: ['held, with an expiry', 'warn'], db: ['sold after payment', 'ok'] }, speed: 1.2 } },
  ],
  workflows: [
    { system: WF0, state: { labels: { app: ['one order'] }, speed: 0.8 } },
    { system: WF0, words: ['Many steps, many services', 'One request can’t do it all'], text: 'Payment, the restaurant and dispatch each take their own time and can fail on their own. One request that waits for all of them breaks halfway.',
      state: { parts: { app: 'warn', rider: 'alert' }, labels: { app: ['waiting on three services', 'warn'], rider: ['timed out', 'alert'] }, speed: 1.4 } },
    { system: WF1, words: ['One state, a few allowed moves', 'Impossible moves are ruled out'], text: 'Every order is in exactly one state. The table of allowed moves rules out the impossible ones, like accepting an order that was already cancelled.',
      state: { parts: { placed: 'ok', acc: 'ok', pick: 'ok', del: 'ok', cancel: 'warn' }, paths: { e: 'down' }, labels: { cancel: ['can’t be accepted', 'warn'], del: ['', '', 'Delivered'] }, speed: 1.2 } },
    { system: WF2, words: ['Durable workflows', 'A crash replays the history'], text: 'The engine records each finished step. When a worker dies, a new one replays the history to learn which steps are done and what they returned.',
      state: { parts: { w1: 'alert', w2: 'ok', hist: 'ok' }, paths: { a: 'down', c: 'down' }, labels: { w1: ['crashed', 'alert'], w2: ['picks up from the history', 'ok'], hist: ['steps done', 'ok'] }, speed: 1.2 } },
  ],
  'scaling-reads': [
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), state: { labels: { db: ['primary'] }, speed: 0.8 } },
    { system: NEW({}), words: ['Count first', 'Fix the cheap things'], text: 'Find out how many reads there really are and which ones. A missing index or an extra query often costs more than any new layer.',
      state: { parts: { db: 'warn' }, labels: { db: ['most of the reads', 'warn'] }, speed: 1.4 } },
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), words: ['Layers, from the user inwards', '400 of 1 lakh reach the primary'], text: 'Each layer answers what it can and passes on the rest. Of 1 lakh reads a second, 400 reach the primary database.',
      state: { parts: { cdn: 'ok', cache0: 'ok', rep0: 'ok', rep1: 'ok', db: 'ok' }, labels: { cdn: ['answers first', 'ok'], cache0: ['most of the rest', 'ok'], db: ['400 a second', 'ok'] }, speed: 1.6 } },
    { system: NEW({ cdn: 1, cache: 1, replicas: 2 }), words: ['One key everyone wants', 'Coalesce the misses'], text: 'A hot key turns one expired entry into a flood. Coalescing sends one request to the database, and a short copy in each server spreads the reads.',
      state: { parts: { cache0: 'warn', db: 'ok' }, labels: { cache0: ['hot key expired', 'warn'], db: ['one request', 'ok'] }, speed: 1.6 } },
  ],
  'scaling-writes': [
    { system: NEW({ apps: 3 }), state: { labels: { db: ['primary'] }, speed: 0.8 } },
    { system: NEW({ apps: 3 }), words: ['Writes are different', 'Every one lands on the primary'], text: 'Reads can be copied and cached; writes can’t. Each one must reach the one primary that owns the row.',
      state: { parts: { db: 'alert' }, labels: { db: ['at its limit', 'alert'] }, speed: 1.8 } },
    { system: NEW({ apps: 3, queue: 1 }), words: ['Absorb the spike', 'A queue keeps the pace steady'], text: 'The queue turns a 10-minute spike into a 34-minute stretch of steady writing. Nothing is lost, and the database never goes past what it can take.',
      state: { parts: { queue: 'warn', db: 'ok' }, labels: { queue: ['holding the spike', 'warn'], db: ['steady', 'ok'] }, speed: 1.5 } },
    { system: shardSys(5), words: ['One counter everyone updates', 'Split it into parts'], text: 'Ten parts on five shards turn one overloaded key into ten easy ones. A read adds ten numbers instead of reading one.',
      state: { parts: all(['s1', 's2', 's3', 's4', 's5'], 'ok'), labels: { s1: ['2 parts', 'ok'], s5: ['2 parts', 'ok'], r: ['picks a part', 'ok'] }, speed: 1.3 } },
  ],
  'big-files': [
    { system: BF(false, false), state: { labels: { store: ['the bytes'] }, speed: 0.8 } },
    { system: BF(false, false), words: ['Bytes through your servers', 'The slow way'], text: 'A 1.6 GB video sent through the API ties up an app server for the whole upload, and one dropped connection means starting again.',
      state: { parts: { app: 'alert' }, paths: { c: 'alert' }, labels: { app: ['busy moving 1.6 GB', 'alert'] }, speed: 1.6 } },
    { system: BF(true, false), words: ['Upload straight to storage', 'In 100 MB parts'], text: 'The server only signs the upload. The phone sends parts straight to storage, so a dropped connection costs one 100 MB part, not the whole 1.6 GB.',
      state: { parts: { app: 'ok', store: 'ok' }, labels: { app: ['signs the upload', 'ok'], store: ['keeps the parts', 'ok'] }, speed: 1.4 } },
    { system: BF(true, true), words: ['The row is the truth', 'Downloads come from a CDN'], text: 'Storage holds the bytes, but only the database row says whether a file is safe to show. Downloads are served from a CDN near the user.',
      state: { parts: { db: 'ok', cdn: 'ok', store: 'ok' }, labels: { db: ['file row: safe to show', 'ok'], cdn: ['near the user', 'ok'] }, speed: 1.3 } },
  ],
  'long-jobs': [
    { system: LJ(false), state: { labels: { q: ['jobs'] }, speed: 0.8 } },
    { system: LJ(false), words: ['From request to job', 'Answer now, work later'], text: 'The API records the job, puts it on a queue and answers at once with an id. Workers take jobs from the queue at their own pace.',
      state: { parts: { q: 'ok', api: 'ok' }, labels: { api: ['returns a job id', 'ok'], q: ['waiting jobs', 'ok'] }, speed: 1.2 } },
    { system: LJ(false), words: ['Leases', 'Silence hands the job on'], text: 'A lease is a promise with an expiry. Renewals keep it while the worker is healthy; if it goes quiet, the job goes to someone else.',
      state: { parts: { w0: 'alert', w1: 'ok' }, paths: { d: 'down' }, labels: { w0: ['stopped renewing', 'alert'], w1: ['took the job', 'ok'] }, speed: 1.2 } },
    { system: LJ(true), words: ['Retries, then a dead letter', 'Growing waits between tries'], text: 'Growing waits give a struggling service room to recover, and after the last try the dead-letter queue takes the job out of the way.',
      state: { parts: { dlq: 'warn', w0: 'ok', w1: 'ok' }, labels: { dlq: ['after the last try', 'warn'] }, speed: 1.2 } },
  ],
  'nearby-search': [
    { system: NB0, state: { labels: { phone: ['', '', 'Restaurants near me'] }, speed: 0.8 } },
    { system: NB0, words: ['An ordinary index struggles', 'Two ranges, one circle'], text: 'An index on latitude finds a long strip, an index on longitude another. Near me is neither: the database still filters a lot of rows.',
      state: { parts: { db: 'warn' }, labels: { db: ['scans a strip', 'warn'] }, speed: 1.3 } },
    { system: NB1, words: ['Geohash', 'Cells with names'], text: 'The map is cut into cells with short names. Every extra character divides a cell into 32, so the length you index decides how many cells a search touches.',
      state: { parts: { g11: 'ok', g01: 'warn', g10: 'warn', g12: 'warn', g21: 'warn' }, labels: { g11: ['tdr1g', 'ok'] }, speed: 1 } },
    { system: NB2, words: ['A quadtree', 'Splits only where it is busy'], text: 'A fixed grid wastes cells on empty land and overloads the busy centre. A quadtree splits only where the restaurants are.',
      state: { parts: { b11: 'ok', b12: 'ok', b21: 'ok', b22: 'ok' }, labels: { q1: ['one big cell', ''], b22: ['many small cells', 'ok'] }, speed: 1 } },
  ],
  'vector-search': [
    { system: VEC(false), state: { labels: { paneer: ['', '', 'paneer'], cake: ['', '', 'cake'] }, speed: 0.8 } },
    { system: VEC(false), words: ['From words to points', 'Close in meaning, close in space'], text: 'An embedding turns text into a point. Keyword search needs shared words; embeddings need shared meaning. That is why cottage cheese finds paneer.',
      state: { parts: { paneer: 'ok', cottage: 'ok', cake: 'dim' }, labels: { paneer: ['', 'ok', 'paneer'], cottage: ['', 'ok', 'cottage cheese'] }, speed: 1.1 } },
    { system: VEC(true), words: ['Find the nearest, fast', 'A few hundred checked, not crores'], text: 'An approximate index trades a little accuracy for a huge saving: it checks a few hundred vectors instead of crores.',
      state: { parts: { idx: 'ok', paneer: 'ok', cottage: 'ok' }, labels: { idx: ['approximate', 'ok'], paneer: ['', 'ok', 'paneer'] }, speed: 1.3 } },
  ],
  'time-series': [
    { system: TS(false), state: { labels: { raw: ['points by the clock'] }, speed: 0.8 } },
    { system: TS(false), words: ['Data that arrives by the clock', 'Always appended, read in ranges'], text: 'Rider locations, metrics and prices arrive every few seconds, almost never change, and are read as “the last hour”.',
      state: { parts: { ing: 'ok' }, labels: { ing: ['steady stream', 'ok'] }, speed: 1.6 } },
    { system: TS(false), words: ['Store what changed', 'About ten times smaller'], text: 'Points from one series are similar to their neighbours, so storing only what changed shrinks them about tenfold.',
      state: { parts: { raw: 'ok' }, labels: { raw: ['~10× smaller', 'ok'] }, speed: 1.3 } },
    { system: TS(true), words: ['Keep less detail as it ages', 'Summaries for last year'], text: 'Dashboards rarely need ten-second detail from last year. Summaries keep the shape of old data at a fraction of the cost.',
      state: { parts: { raw: 'ok', sum: 'ok' }, labels: { raw: ['recent, full detail', 'ok'], sum: ['older, summarised', 'ok'] }, speed: 1.2 } },
  ],
  sketches: [
    { system: SK(0), state: { labels: { stream: ['page views'] }, speed: 0.8 } },
    { system: SK(0), words: ['Exact counts get expensive', 'Every id, kept forever'], text: 'Counting distinct users exactly means remembering every id you have seen. At crores of users a day, that set is huge.',
      state: { parts: { db: 'alert' }, labels: { db: ['grows with every user', 'alert'] }, speed: 1.6 } },
    { system: SK(1), words: ['HyperLogLog', 'Distinct counts in a small fixed space'], text: 'The longest run of zeros in a hash is a noisy clue to how many distinct items were hashed; averaging thousands of such clues makes it precise.',
      state: { parts: { hll: 'ok' }, labels: { hll: ['small, fixed size', 'ok'] }, speed: 1.4 } },
    { system: SK(2), words: ['Count-Min', 'The smallest counter is closest'], text: 'Collisions can only add to a counter, never subtract, so the smallest of an item’s counters is the closest to the truth.',
      state: { parts: { hll: 'ok', cms: 'ok' }, labels: { cms: ['how often each dish', 'ok'] }, speed: 1.4 } },
  ],
  'change-capture': [
    { system: CDC(false), state: { labels: { db: ['orders'] }, speed: 0.8 } },
    { system: CDC(false), words: ['Why not just write twice', 'One of the writes will fail'], text: 'The service writes the database, then the search index and the cache. When the second write fails, they disagree and nothing notices.',
      state: { parts: { search: 'alert', db: 'ok' }, paths: { b: 'alert' }, labels: { search: ['missed an update', 'alert'] }, speed: 1.4 } },
    { system: CDC(true), words: ['Read the database’s own log', 'One more reader'], text: 'The log already has every committed change, in order, and is how replicas stay in step. CDC reads it and publishes each change to a stream.',
      state: { parts: { cdc: 'ok', topic: 'ok', db: 'ok' }, labels: { cdc: ['reads the log', 'ok'], topic: ['every change, in order', 'ok'] }, speed: 1.3 } },
    { system: CDC(true), words: ['A snapshot, then the log', 'Nothing missed'], text: 'A snapshot gives a new consumer the present, and the log position taken with it makes sure every change after that is delivered.',
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
    { system: REDIS(0), words: ['One command at a time', 'No locks in your code'], text: 'Strings, hashes, lists, sets and sorted sets. Every command changes one structure in one step, so a cart, a ranking or a rate limit needs no locks.',
      state: { parts: { r1: 'ok' }, labels: { r1: ['cart · ranking · rate limit', 'ok'] }, speed: 1.6 } },
    { system: REDIS(1), words: ['Keeping data across a restart', 'Snapshots and a log'], text: 'Memory is lost on a restart. Redis can save snapshots and an append-only log to disk; how often decides how much you can lose.',
      state: { parts: { r1: 'ok', disk: 'ok' }, labels: { disk: ['snapshot + log', 'ok'] }, speed: 1.2 } },
    { system: REDIS(2), words: ['Redis Cluster', 'Keys split by slot'], text: 'The client knows which node owns each slot, so a request takes one hop; a MOVED reply corrects it after slots change hands.',
      state: { parts: all(['r0', 'r1', 'r2'], 'ok'), labels: { r0: ['slots 0–5460', 'ok'], r2: ['slots 10923–16383', 'ok'] }, speed: 1.3 } },
  ],
  elasticsearch: [
    { system: ES(0), state: { labels: { s1: ['by words'] }, speed: 0.8 } },
    { system: ES(0), words: ['An index of words', 'Each search reads its own lists'], text: 'The index is built once per change; every search then reads only the lists for its own words. That is why searching crores of dishes takes milliseconds.',
      state: { parts: { s1: 'ok' }, labels: { s1: ['paneer → dishes 4, 19, 77', 'ok'] }, speed: 1.2 } },
    { system: ES(1), words: ['Keep it in step', 'One source of truth, a stream of changes'], text: 'Never write the database and the index from the same request and hope both succeed. Feed the index from a stream of the database’s changes.',
      state: { parts: { db: 'ok', cdc: 'ok', s1: 'ok' }, labels: { db: ['source of truth', 'ok'], cdc: ['every change', 'ok'] }, speed: 1.3 } },
    { system: ES(2), words: ['Shards, replicas, refresh', 'Searchable after a short delay'], text: 'An index is split into shards with replicas. New documents become searchable after the next refresh, so search is a little behind the database.',
      state: { parts: all(['s0', 's1', 's2'], 'ok'), labels: { s1: ['refreshed every second or so', 'ok'] }, speed: 1.3 } },
  ],
  'kafka-in-practice': [
    { system: KAFKA(3), state: { labels: { topic: ['3 partitions'] }, speed: 0.8 } },
    { system: KAFKA(3), words: ['Keys and partitions', 'Same key, same partition, in order'], text: 'An order’s events carry its id as the key, so they land on one partition and stay in order. Order holds within a partition, not across the topic.',
      state: { parts: { topic: 'ok' }, labels: { topic: ['key = order id', 'ok'] }, speed: 1.3 } },
    { system: KAFKA(4), words: ['Consumer groups', 'Up to one consumer per partition'], text: 'The group decides who reads what. Adding a consumer is how you scale reading, up to one per partition: a fourth consumer on three partitions sits idle.',
      state: { parts: { c0: 'ok', c1: 'ok', c2: 'ok', c3: 'dim' }, paths: { t3: 'dim' }, labels: { c3: ['', '', 'Idle'], c1: ['one partition each', 'ok'] }, speed: 1.3 } },
    { system: KAFKA(3), words: ['When consumers fall behind', 'Lag grows, nothing is lost'], text: 'Events wait in the log while consumers catch up. Watch the lag, add consumers up to the partition count, and make each one faster.',
      state: { parts: { topic: 'warn', c0: 'warn', c1: 'warn', c2: 'warn' }, fill: { topic: 0.8 }, labels: { topic: ['lag growing', 'warn'] }, speed: 1.4 } },
  ],
  temporal: [
    { system: TEMPORAL, state: { labels: { svc: ['remembers every step'] }, speed: 0.8 } },
    { system: TEMPORAL, words: ['The service is the memory', 'Workers are the hands'], text: 'Workers run your code and report each step. The service records it, so losing a worker loses nothing.',
      state: { parts: { svc: 'ok', hist: 'ok', w0: 'ok', w1: 'ok', w2: 'ok' }, labels: { hist: ['every step recorded', 'ok'] }, speed: 1.3 } },
    { system: TEMPORAL, words: ['A worker dies', 'Another carries on'], text: 'The history tells the next worker which steps are done and what they returned. The workflow continues as if nothing happened.',
      state: { parts: { w1: 'alert', w2: 'ok', svc: 'ok' }, paths: { b: 'down', d: 'down' }, labels: { w1: ['gone', 'alert'], w2: ['continues', 'ok'] }, speed: 1.2 } },
    { system: TEMPORAL, words: ['Waiting a day', 'Costs a row, not a thread'], text: 'Timers and signals are stored in the service, not in a sleeping thread. A workflow waiting a day for a refund costs a row in a database.',
      state: { parts: { hist: 'ok' }, paths: { a: 'dim', b: 'dim', c: 'dim', d: 'dim' }, labels: { hist: ['timer: tomorrow 10:00', 'ok'] }, speed: 0.6 } },
  ],
  'api-gateways': [
    { system: GW(false), state: { labels: { gw: ['the front door'] }, speed: 0.8 } },
    { system: GW(false), words: ['Every request, four checks', 'Then routed to its service'], text: 'The gateway checks who is calling, whether they may, whether they are within their limit, and where the request goes. A customer’s order passes and reaches Orders.',
      state: { parts: { gw: 'ok', orders: 'ok' }, paths: { b: 'dim', d: 'dim' }, labels: { gw: ['auth · access · limit · route', 'ok'] }, speed: 1.3 } },
    { system: GW(false), words: ['Rate limiting', 'Too many requests stop here'], text: 'A restaurant’s billing system that sends too many requests is stopped at the limit check and told to slow down, before it reaches any service.',
      state: { parts: { bill: 'alert', gw: 'ok' }, paths: { b: 'alert', d: 'dim' }, labels: { bill: ['429: slow down', 'alert'] }, speed: 1.5 } },
    { system: GW(true), words: ['Release safely', 'Split traffic, undo the split'], text: 'Every request passes the gateway, so it is the natural place to send a small share to a new version and to undo that if it misbehaves.',
      state: { parts: { orders: 'ok', v2: 'warn' }, labels: { orders: ['95%', 'ok'], v2: ['5%', 'warn'] }, speed: 1.3 } },
  ],
  cassandra: [
    { system: CASS, state: { labels: { n0: ['a ring of equals'] }, speed: 0.8 } },
    { system: CASS, words: ['The partition key is the address', 'Three nodes hold each row'], text: 'A query that gives the partition key goes to the three nodes that own it. There is no leader: any node can take the request.',
      state: { parts: { n3: 'ok', n4: 'ok', n2: 'ok' }, labels: { n3: ['owns the key', 'ok'] }, speed: 1.3 } },
    { system: CASS, words: ['No key in the query', 'Every node is asked'], text: 'A query that doesn’t give the partition key goes to all of them. Model one table per question so every query has its key.',
      state: { parts: all(['n0', 'n1', 'n2', 'n3', 'n4', 'n5'], 'warn'), labels: { n0: ['asked', 'warn'] }, speed: 1.6 } },
    { system: CASS, words: ['Deletes leave tombstones', 'Or old rows come back'], text: 'Without a leader, a delete must be remembered for a while, or a replica that missed it would bring the row back. That memory is the tombstone.',
      state: { parts: { n4: 'warn', n3: 'ok' }, labels: { n4: ['tombstone', 'warn'] }, speed: 1 } },
  ],
  dynamodb: [
    { system: DDB(false), state: { labels: { t: ['you never run it'] }, speed: 0.8 } },
    { system: DDB(false), words: ['Keys from the questions', 'The table answers one'], text: 'Design the keys from the questions: partition key customer, sort key time, and “my recent orders” is one query.',
      state: { parts: { t: 'ok' }, labels: { t: ['customer · time', 'ok'] }, speed: 1.2 } },
    { system: DDB(true), words: ['Each index answers another', 'No matching key means a scan'], text: 'An index keyed by restaurant answers “this kitchen’s orders”. A question with no matching key is a scan.',
      state: { parts: { t: 'ok', gsi: 'ok' }, labels: { gsi: ['restaurant · time', 'ok'] }, speed: 1.2 } },
    { system: DDB(true), words: ['A hot partition', 'Fixed in the key, not with capacity'], text: 'The table’s total capacity hides a per-partition limit. A key everyone writes to is throttled; the fix is in the key design.',
      state: { parts: { t: 'alert' }, labels: { t: ['one key throttled', 'alert'] }, speed: 1.6 } },
  ],
  postgresql: [
    { system: PG(false), state: { labels: { pri: ['the default'] }, speed: 0.8 } },
    { system: PG(false), words: ['Row versions instead of locks', 'Readers see a snapshot'], text: 'A long report and a stream of price changes don’t wait for each other. The price is old versions that vacuum has to clean up.',
      state: { parts: { pri: 'ok' }, labels: { pri: ['snapshot reads', 'ok'] }, speed: 1.2 } },
    { system: PG(true), words: ['Connections', 'A few dozen busy, not thousands idle'], text: 'PostgreSQL wants a few dozen busy connections. A pooler is the usual answer once there are many app servers.',
      state: { parts: { pool: 'ok', pri: 'ok' }, labels: { pool: ['shares connections', 'ok'] }, speed: 1.4 } },
    { system: PG(true), words: ['Replication and failover', 'A replica takes over'], text: 'Replicas follow the primary’s log and serve reads. If the primary fails, one is promoted and the app reconnects to it.',
      state: { parts: { pri: 'alert', rep: 'ok' }, paths: { d: 'down' }, labels: { pri: ['down', 'alert'], rep: ['promoted', 'ok'] }, speed: 1.1 } },
  ],
  flink: [
    { system: FLINK, state: { labels: { src: ['events'] }, speed: 0.8 } },
    { system: FLINK, words: ['Count by event time', 'Not by arrival'], text: 'Arrival order is an accident of the network. Counting by when events happened, with a watermark to decide when to stop waiting, gives the same answer every time.',
      state: { parts: { j0: 'ok', j1: 'ok', out: 'ok' }, labels: { j0: ['5-minute windows', 'ok'], out: ['orders per area', 'ok'] }, speed: 1.4 } },
    { system: FLINK, words: ['State and checkpoints', 'Saved at one moment'], text: 'Saving every task’s state and the input positions at the same logical moment is what makes a replay consistent.',
      state: { parts: { st: 'ok', ck: 'ok' }, labels: { st: ['running counts', 'ok'], ck: ['state + positions', 'ok'] }, speed: 1.2 } },
    { system: FLINK, words: ['A task fails', 'Restart from the checkpoint'], text: 'The job reloads the last checkpoint and rereads the input from the saved positions. The counts come out the same.',
      state: { parts: { j1: 'alert', ck: 'ok' }, paths: { b: 'down', d: 'down', g: 'down' }, labels: { j1: ['restarting', 'alert'], ck: ['reload from here', 'ok'] }, speed: 1 } },
  ],
  zookeeper: [
    { system: ZK, state: { labels: { z0: ['agreed tree'] }, speed: 0.8 } },
    { system: ZK, words: ['A write needs a majority', 'Five servers survive two failures'], text: 'A write is safe once a majority has it. Reads are local and fast, which is why they can lag a little.',
      state: { parts: { z0: 'ok', z1: 'ok', z2: 'alert', z3: 'alert', z4: 'ok' }, labels: { z0: ['3 of 5 agree', 'ok'], z2: ['down', 'alert'] }, speed: 1.2 } },
    { system: ZK, words: ['Leader election', 'Watch only your predecessor'], text: 'Each candidate watches the one just before it. A leader’s death wakes one waiting worker, not all of them.',
      state: { parts: { w0: 'ok', w1: 'warn', w2: 'dim' }, labels: { w0: ['leader', 'ok'], w1: ['next in line', 'warn'] }, speed: 1.1 } },
  ],
});

/** the step a list preview shows: the system working, not failing */
export const PREVIEW = { 'networking-essentials': 1, caching: 2, sharding: 2, 'consistent-hashing': 3, 'cap-theorem': 1, 'api-design': 1, 'data-modelling': 3,
  'database-indexing': 2, 'numbers-to-know': 2, 'real-time-updates': 3, contention: 2, workflows: 2, 'scaling-reads': 2, 'scaling-writes': 2, 'big-files': 2,
  'long-jobs': 1, 'nearby-search': 2, 'vector-search': 1, 'time-series': 3, sketches: 3, 'change-capture': 3,
  redis: 3, elasticsearch: 2, 'kafka-in-practice': 2, temporal: 1, 'api-gateways': 1, cassandra: 1, dynamodb: 2, postgresql: 2, flink: 2, zookeeper: 1 };

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
