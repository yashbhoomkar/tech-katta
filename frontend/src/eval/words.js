// Every sentence the v2 evaluator shows for a plan error (evaluator.md §7, Appendix A). One place, so the wording
// stays consistent and tests can compare against it. Pure functions of names and numbers.

export const fmtN = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)} crore` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)} lakh` : Math.round(n).toLocaleString('en-US'));
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
export const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const PLAN = {
  E_NO_SOURCE: (op) => `${op} has nowhere to start: add the Clients.`,
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
