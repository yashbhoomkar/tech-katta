// Every sentence the v2 evaluator shows for a plan error (evaluator.md §7, Appendix A). One place, so the wording
// stays consistent and tests can compare against it. Pure functions of names and numbers.

export const fmtN = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)} crore` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)} lakh` : Math.round(n).toLocaleString('en-US'));
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
export const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const PLAN = {
  E_NO_SOURCE: (op, source) => (source === 'external' ? `${op} comes from another company: connect its service (it is on the canvas already) to your design.` : `${op} has nowhere to start: add the Clients.`),
  E_NO_WEBHOOK: (op, from) => `${op} starts at ${from}, but never reaches a Service: draw an arrow from ${from} to the load balancer or Service that takes it.`,
  E_NO_HANDLER: (op) => `${op} never reaches a Service: follow the arrows from the Clients.`,
  E_NO_DATABASE: (handler, entity) => `${handler} reaches no database: draw an arrow from it to the store that keeps ${entity}.`,
  E_NO_SCHEMA: (entity, fields) => `No database has a schema yet: open a database's settings and add the ${entity} it needs (${list(fields)}).`,
  E_NO_STORE: (handler, entity, fields) => `No table reachable from ${handler} holds ${entity} (${list(fields)}).`,
  E_MISSING_FIELDS: (table, fields) => `${table} has no ${list(fields)}, which this call writes.`,
  E_READ_BEHIND_QUEUE: (entity, queue) => `${cap1(entity)} can only be reached through ${queue}; a queue can't answer a read: the caller would wait for a worker.`,
  E_SYNC_BEHIND_QUEUE: (step, store, queue) => `${cap1(step)} must be done before answering, but ${store} is only reached through ${queue}.`,
  E_TX_SPLIT: (a, b) => `These writes must happen together, but they land in ${a} and ${b}; no transaction spans two stores.`,
  E_NO_TX: (store) => `${store} can't make these writes happen together (no transactions).`,
  E_NO_SANDBOX: (node, label) => `${label} runs code from users: turn on "Runs untrusted code (sandboxed)" on ${node}.`,
  E_NO_EXTERNAL: (what, preset) => `${cap1(what)} needs an arrow from a Service to the ${preset} service.`,
  E_NO_PUBLISH: (what) => `${cap1(what)} needs a way to people who are connected: an arrow from the Service to a pub/sub channel or an event stream that reaches a real-time gateway (or to the gateway itself).`,
  E_NO_CONNECTION: (gw) => `Nobody is connected to ${gw}: Clients need an arrow to it, through a load balancer.`,
  E_NOT_YET: (what) => `${cap1(what)} needs components that are not on the canvas yet.`,
  E_UNFED: (entity, store, op, primary) => `Nothing ever writes ${entity} into ${store}: ${op} would find it empty.${primary ? ` Feed it from ${primary} (a worker behind a queue, or change data capture).` : ''}`,
  E_TOO_TANGLED: () => 'This operation fans out over too many paths to follow.',
  W_UNUSED: (name, cost) => `${name} is not used by any operation: connect it or remove it.${cost > 0 ? ` It still costs $${Math.round(cost).toLocaleString('en-US')} a month.` : ''}`,
};

// Why a table can't serve a step (evaluator.md §7.4). `t`: table name; `label`: engine label; `key`: what the engine
// calls its key (lower case); `idx`: whether the engine has secondary indexes.
export const ACCESS = {
  missing: (t, fields) => `${t} has no ${list(fields)}.`,
  scan: (t, by, rows, key) => `Looking up ${t} by ${by} would read all ${fmtN(rows)} rows: make ${by} the ${key}, or add an index on it.`,
  noFind: (label, t, by, key, idx) => `${label} can't find ${t} by ${by}: it only finds items by the ${key}${idx ? ' or an index' : ''}. Make ${by} the ${key}${idx ? ', or add an index on it' : ''}.`,
  s3Key: (key) => `S3 finds an object only by its whole key (${key}).`,
  s3Query: () => 'S3 can only get and put whole objects by key: it can’t filter, sort or count.',
  s3Update: () => 'S3 can’t change part of an object: a counter or a status needs a database.',
  geo: (t, f) => `${cap1(t)} near a point need a geo index on ${f} (or a search index, or a geo set in a cache).`,
  geoField: (t, f) => `${f} in ${t} isn't a location field.`,
  text: (t, f) => `Searching ${t} by words needs a text index on ${f} (or a search index).`,
  sort: (n, f, how) => `${n > 10000 ? 'More than 10,000' : fmtN(n)} matching rows can't be sorted in memory: make ${f} the ${how} or add it to the index.`,
  agg: (label) => `${label} can't add up many rows in one query: keep a running total (a counter) instead.`,
  aggBig: (n) => `Adding up ${fmtN(n)} rows on every call is too slow: keep a running total instead.`,
  putKey: (t, key, missing) => `Writing to ${t} needs its ${key} (${list(missing)}), which this call doesn't have.`,
  unique: (label) => `Only-if-absent needs a store that can check and write in one step; ${label} can't.`,
  uniqueWhere: (t, f) => `${t} would accept two rows with the same ${f}: make ${f} the key, or add a unique index on it.`,
  cas: (label) => `${label} can't change a row only if it is still as expected in one step, so two callers could both get the same item.`,
  blobRows: (label) => `File bytes would go into ${label} rows: keep files in object storage (S3) and their key in the database.`,
  blobField: (t) => `${t} has no file field for the bytes.`,
  counter: (label) => `${label} can't add to a number in place.`,
  rank: (t, f) => `Ranking ${t} by ${f} needs a sorted set in a cache, or an index on ${f}.`,
  cacheOnly: (t) => `${t} in a cache is found only by its key.`,
};

// Findings (§10): { title, story, fix } in plain words, with this design's names and numbers.
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
export const FIND = {
  notDurableCache: (entity, cache) => ({ title: `${cap1(entity)} lives only in a cache's memory`, story: `${cap1(entity)} lives only in ${cache}'s memory. When it restarts, every ${entity} acknowledged since is lost.`, fix: 'Write it to a database too (the cache can still serve reads), or turn on its append-only file.' }),
  writeBack: (cache, entity, sec, n) => ({ title: `${cache} saves writes later`, story: `${cache} acknowledges writes and saves them later. A crash loses the last ${sec} seconds of ${entity}${n > 0 ? `: about ${n.toLocaleString('en-US')} at this test's rate` : ''}.`, fix: 'Use write-through for data that must not be lost.' }),
  singleZone: (db, minutes) => ({ title: `${db} has no standby`, story: `${db} has no standby. It keeps its data through a crash, but nothing can be written for ${minutes} minutes.`, fix: 'Give it a standby in another zone (Multi-AZ).' }),
  stale: (op, req, entity, store, how, sec) => ({ title: `${op} can read old data`, story: `${op} must be ${req}, but it reads ${entity} from ${store}, which is ${how}: up to ${plural(sec, 'second')} behind.` }),
  staleInfo: (op, sec) => ({ title: `${op} can show data up to ${plural(sec, 'second')} old.`, story: `${op} can show data up to ${plural(sec, 'second')} old.`, fix: 'Nothing to do unless that is too old for this call.' }),
  fixCache: (cache) => `Shorten ${cache}'s time to keep items, or delete the item when it is written.`,
  fixReplica: () => 'Read from the primary, or make replication synchronous.',
  fixQueue: () => 'Add workers behind the queue, or write the copy before answering.',
  fixCdn: () => 'Shorten how long the CDN keeps the answer, or do not cache this call.',
  spof: (name, ops, type, cfg) => ({ title: `${name} is a single point of failure`, story: `If ${name} is lost, every ${list(ops)} call fails: nothing else can take its calls.`,
    fix: type === 'server' ? 'Spread it over two or three zones.' : type === 'database' ? 'Give it a standby in another zone (Multi-AZ).' : cfg?.onDown === 'fail' ? 'Let callers go to the database while the cache is down.' : 'Add a second one.' }),
  backlog: (queue, n) => ({ title: `${queue} was still filling when the test ended`, story: `${queue} was still filling when the test ended, with ${n.toLocaleString('en-US')} messages waiting: its workers take fewer a second than arrive.`, fix: 'Add workers, or make each message cheaper to handle.' }),
  storage: (db, gb, engine, max) => ({ title: `${db} runs out of space`, story: `${db} needs ${gb.toLocaleString('en-US')} GB; one ${engine} holds at most ${max.toLocaleString('en-US')}.`, fix: 'Split it over shards, or choose a store that grows by itself.' }),
  cacheFull: (cache, what, need, have) => ({ title: `${cache} is too small for ${what}`, story: `${cap1(what)} needs about ${need} GB of memory, but ${cache} has ${have} GB.`, fix: 'A larger size or more nodes, or keep it in a database.' }),
  noTtl: (entity, store) => ({ title: `${cap1(entity)} is never removed`, story: `${cap1(entity)} is never removed from ${store}: it grows for ever.`, fix: 'Give the table an expiry field (TTL), or delete the rows with a job.' }),
  double: (way, op, store, queue, timeoutSec, idf) => ({
    title: `${op} can happen twice`,
    story: way === 'call'
      ? `A customer starts ${op}. The other company's answer is slow and the app retries after ${timeoutSec} seconds. Nothing remembers the first attempt, so the other company is called again: a second charge, a second message.`
      : way === 'retry'
        ? `The answer to ${op} is lost on the way back and the app retries after ${timeoutSec} seconds. ${store} accepts the same write again, so it happens twice.`
        : way === 'fifo'
          ? `${queue} removes duplicate messages only within 5 minutes; a message delivered again later is written to ${store} a second time.`
          : `${queue} delivers each message at least once: a worker that crashes after writing but before saying it is done gets the message again, and ${store} accepts it again.`,
    fix: way === 'call'
      ? `Write the request with its id first, in a table that refuses a second row with the same id, and call the other company only for a new row (or use its idempotency key).`
      : `Give every request an id from the client and make the store refuse a second row with the same id (a unique index on ${idf}).`,
  }),
  dualWrite: (svc, entity, a, b) => ({ title: `${cap1(entity)} is written to two stores without a transaction`, story: `${svc} writes ${entity} to ${a}, then to ${b}. If it crashes between the two, ${b} never hears about it, and nothing repairs it.`, fix: `Write once, to ${a}, and let ${b} follow it: change data capture into a stream, or an outbox table read by a worker.` }),
  callThenWrite: (svc, ext) => ({ title: 'A call to another company before anything is saved', story: `If ${svc} crashes after ${ext} answers, the other company has done it (a payment, a message) but your records don't know.`, fix: 'Save the request first (with its id), then call, then record the answer.' }),
  order: (queue, by) => ({ title: 'Changes can be applied out of order', story: `${queue} hands messages to whichever worker is free. Two messages for the same ${by} can be applied the wrong way round.`, fix: `Use an event stream partitioned by ${by}, a FIFO queue, or number the changes and let the store refuse one that is out of turn.` }),
  orderStream: (stream, by) => ({ title: 'Changes can be applied out of order', story: `${stream} keeps order only inside a partition, and it is not partitioned by ${by}: events for one ${by} land in different partitions, and two workers apply them in whichever order they finish.`, fix: `Partition ${stream} by ${by} ("Partition by" in its settings).` }),
  orderPubsub: (ch) => ({ title: 'Order is not guaranteed', story: `${ch} usually delivers in order, but nothing guarantees it: a message can overtake another.`, fix: 'Use an event stream partitioned by the conversation, or number the messages so the app can sort them.' }),
  noCatchUp: (op) => ({ title: 'A message sent while someone is offline is never seen', story: `${op} pushes the message to whoever is connected right now, and nothing stores it: a phone that is offline for a moment never sees it.`, fix: 'Store the message too (in a database the app reads when it reconnects), then push it.' }),
  retention: (stream, hours, keep) => ({ title: `${stream} drops events before they are read`, story: `Events waited up to ${hours} hours to be read, but ${stream} keeps them for ${keep}: the oldest were gone first.`, fix: 'Add consumers (or partitions), or keep events longer.' }),
  oversized: (name, pct) => ({ title: `${name} is larger than it needs to be`, story: `${name} never went above ${pct}% load: a smaller one would do.`, fix: 'Try a smaller size or fewer instances.' }),
};

// Why a load-test check failed (§11.4).
export const WHY = {
  sloAvail: (clock, culprit, state, pct, op, allowed) => `At ${clock} ${culprit} ${state}; ${pct}% of ${op} calls failed (the test allows ${allowed}%).`,
  sloSlow: (clock, culprit, state, pct, op, ms) => `At ${clock} ${culprit} ${state}; ${pct}% of ${op} calls took longer than ${ms} ms (the test allows 1%).`,
  trigger: (what) => ` It began when ${what}.`,
  serverOver: (warm) => `Add instances or a larger size. New instances take ${warm} minutes, so a sudden rush needs them started beforehand.`,
  serverZone: () => 'Spread it over two or three zones.',
  dbReads: (step, work, how) => `${cap1(step)} costs ${work} units through ${how}. Put a cache in front, add read replicas, or give it a key or index.`,
  dbWrites: () => "Replicas don't help writes. A larger size, shards, or a queue in front to smooth the burst.",
  dbDown: (fo, down) => `Give it a standby in another zone (Multi-AZ): it is back in ${fo} minutes instead of ${down}.`,
  cacheOver: () => 'A larger size or more nodes.',
  cacheCold: (db) => `While it refills, its misses land on ${db}. Size the database for that, or keep a replica so the cache survives.`,
  limit: (limit) => `It refuses what is over ${limit.toLocaleString('en-US')} a second. Put a CDN in front for what can be cached, or split the traffic over two.`,
  path: (n, steps) => `The time is the path itself: ${n} steps one after another (${steps}). Cut a step, cache a read, or defer what can wait.`,
  backlog: (consumer, x, y) => `${consumer} takes ${x.toLocaleString('en-US')} a second and ${y.toLocaleString('en-US')} arrive: more workers, or cheaper work per message.`,
  completes: (step, sec, within) => `${cap1(step)} was done up to ${sec.toLocaleString('en-US')} seconds after the call (allowed ${within}).`,
  notDone: (n) => ` ${n.toLocaleString('en-US')} were still waiting when the test ended.`,
  cost: (bill, max, top) => `The bill is $${Math.round(bill).toLocaleString('en-US')} a month (allowed $${max.toLocaleString('en-US')}). Most of it: ${top}.`,
  crash: (name, clock) => `${name} crashed from overload at ${clock}.`,
  has: (type) => `The design has no ${type} that any call goes through.`,
  planError: (op, msg) => `${op} can't run: ${msg}`,
  finding: (f) => `${f.story}${f.fix ? ` ${f.fix}` : ''}`,
};

// A load-test check in words, for the results list (a check may carry its own `label`).
export function checkLabel(c, practice, cat = {}) {
  const ops = practice?.operations || [], op = c.op ? ops.find((o) => o.id === c.op) : null, name = op?.name || 'Every call';
  const type = (t) => (cat[t]?.name || t || '').toLowerCase();
  const win = c.from !== undefined || c.to !== undefined ? ` (minutes ${c.from ?? 0}–${c.to ?? 'end'})` : '';
  switch (c.kind) {
    case 'slo': {
      const a = c.availability ?? op?.slo?.availability, p = c.p99Ms ?? op?.slo?.p99Ms;
      if (!op && c.availability === undefined && c.p99Ms === undefined) return `Every call meets its targets${win}`;
      return `${name}: ${[a !== undefined ? `at least ${a}% succeed` : null, p !== undefined ? `99% within ${p.toLocaleString('en-US')} ms` : null].filter(Boolean).join(' · ')}${win}`;
    }
    case 'completes': return `${op ? `${name}: work` : 'Work'} done after answering finishes${c.withinSec ? ` within ${c.withinSec} s` : ' in time'}`;
    case 'fresh': return `${op ? `${name}: reads` : 'Reads'} are as fresh as required`;
    case 'noCrash': return c.type ? `No ${type(c.type)} crashes from overload` : 'Nothing crashes from overload';
    case 'noLostWrites': return 'No acknowledged write is lost';
    case 'noDuplicates': return `${op ? `${name} never` : 'Nothing'} happens twice`;
    case 'ordered': return `${op ? `${name}: changes` : 'Changes'} are applied in order`;
    case 'atomic': return 'Writes that belong together happen together';
    case 'fits': return 'The data fits where it is kept';
    case 'cost': return `The bill stays under $${(c.max || 0).toLocaleString('en-US')} a month`;
    case 'has': return `Calls go through a ${type(c.type)}`;
    default: return c.kind;
  }
}
