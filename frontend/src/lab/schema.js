// Database schemas: the tables (collections, indexes, buckets…) a design's database holds, their fields,
// keys and indexes. Used by the Lab's schema editor, saved designs (store.js), content validation and
// the v2 evaluator (eval/access.js), which plans each step against the schema.
//
//   config.schema = {tables: [{name, fields: [{name, type}], key: [field], sortKey?: field, shardKey?: [field],
//                              indexes?: [{fields: [field], kind}], ttl?: field}]}
//
// What a key and an index mean depends on the engine (content/lab.json `engines[].schema`):
//   PostgreSQL/MySQL: a table with a primary key; indexes of any kind (geo: PostGIS, text: full text).
//   DynamoDB: a partition key and an optional sort key; global secondary indexes of one or two fields.
//   MongoDB: a collection keyed by _id; indexes, geo (2dsphere) and text indexes, TTL.
//   Cassandra: a partition key and clustering column; queries must give the partition key.
//   OpenSearch: an index of documents; every field is searchable by its type (text, geo…).
//   S3: a bucket of objects found by their key (a path built from fields); nothing else is indexed.
//   InfluxDB: a measurement with tags (indexed) and fields, ordered by time.
//   Neptune: vertices and edges, found by id or an index.

export const TYPES = [
  ['string', 'text (short)'], ['text', 'long text (words)'], ['int', 'whole number'], ['float', 'number'],
  ['bool', 'yes / no'], ['time', 'date and time'], ['geo', 'location (lat, lng)'], ['json', 'JSON'],
  ['list', 'list'], ['blob', 'file bytes'],
];
const TYPE_IDS = new Set(TYPES.map((t) => t[0]));
export const INDEX_KINDS = [['btree', 'index (lookups, ranges, sorting)'], ['unique', 'unique index'], ['geo', 'geo index (near a point)'], ['text', 'text index (search by words)']];
const KIND_IDS = new Set(INDEX_KINDS.map((k) => k[0]));
export const LIMITS = { tables: 12, fields: 30, indexes: 10, indexFields: 3 };
const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const SCALAR = new Set(['string', 'int', 'float', 'time', 'bool']);

// What an engine calls things and allows. Engines without a `schema` entry behave like PostgreSQL.
const RELATIONAL = { table: 'Table', tables: 'tables', key: 'Primary key', sortKey: null, index: 'Index', indexKinds: ['btree', 'unique', 'geo', 'text'], ttl: false, keyRequired: true, maxIndexFields: 3 };
export const vocab = (engine) => ({ ...RELATIONAL, ...(engine?.schema || {}) });

// A clean copy of whatever was stored: names checked, types known, keys and indexes only on fields that
// exist, within the limits. Returns undefined when nothing usable is left.
export function cleanSchema(src) {
  if (!src || typeof src !== 'object' || !Array.isArray(src.tables)) return undefined;
  const tables = [], seen = new Set();
  for (const t of src.tables) {
    if (tables.length >= LIMITS.tables) break;
    if (!t || typeof t !== 'object' || typeof t.name !== 'string' || !NAME.test(t.name) || seen.has(t.name.toLowerCase())) continue;
    const fields = [], names = new Set();
    for (const f of Array.isArray(t.fields) ? t.fields : []) {
      if (fields.length >= LIMITS.fields) break;
      if (!f || typeof f.name !== 'string' || !NAME.test(f.name) || names.has(f.name.toLowerCase())) continue;
      names.add(f.name.toLowerCase()); fields.push({ name: f.name, type: TYPE_IDS.has(f.type) ? f.type : 'string' });
    }
    const has = (x) => typeof x === 'string' && fields.some((f) => f.name === x);
    const key = (Array.isArray(t.key) ? t.key : []).filter(has).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
    const indexes = (Array.isArray(t.indexes) ? t.indexes : []).filter((ix) => ix && KIND_IDS.has(ix.kind) && Array.isArray(ix.fields))
      .map((ix) => ({ fields: ix.fields.filter(has).filter((x, i, a) => a.indexOf(x) === i).slice(0, LIMITS.indexFields), kind: ix.kind }))
      .filter((ix) => ix.fields.length).slice(0, LIMITS.indexes);
    seen.add(t.name.toLowerCase());
    // shardKey (v2, phase 6): the fields that pick a shard when the database has several (default: the key)
    const shardKey = (Array.isArray(t.shardKey) ? t.shardKey : []).filter(has).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2);
    tables.push({ name: t.name, fields, key, ...(has(t.sortKey) ? { sortKey: t.sortKey } : {}), ...(indexes.length ? { indexes } : {}), ...(has(t.ttl) ? { ttl: t.ttl } : {}), ...(shardKey.length ? { shardKey } : {}) });
  }
  return tables.length ? { tables } : undefined;
}

// Problems with a schema for an engine, in plain words: [{table, level: "error" | "warn", text}].
// Errors are things the engine can't do; warnings are choices that usually hurt.
export function schemaIssues(engine, schema) {
  const v = vocab(engine), out = [], id = engine?.id;
  const err = (t, text) => out.push({ table: t, level: 'error', text }), warn = (t, text) => out.push({ table: t, level: 'warn', text });
  for (const t of schema?.tables || []) {
    const type = (f) => t.fields.find((x) => x.name === f)?.type;
    if (!t.fields.length) err(t.name, `${v.table} ${t.name} has no fields.`);
    if (v.keyRequired && !t.key.length) err(t.name, `${t.name} needs a ${v.key.toLowerCase()}.`);
    if (!v.sortKey && t.sortKey) err(t.name, `${engine?.label || 'This engine'} has no ${'sort key'}: order rows with an index instead.`);
    if (t.ttl && !v.ttl) err(t.name, `${engine?.label || 'This engine'} can't expire rows by themselves; delete them with a job.`);
    if (t.ttl && type(t.ttl) !== 'time') err(t.name, `The expiry field ${t.ttl} must be a date and time.`);
    for (const k of [...t.key, ...(t.sortKey ? [t.sortKey] : [])]) if (!SCALAR.has(type(k)) && id !== 's3') err(t.name, `${k} can't be part of a key: it is ${TYPES.find((x) => x[0] === type(k))?.[1]}.`);
    for (const ix of t.indexes || []) {
      if (!v.indexKinds.includes(ix.kind)) { err(t.name, v.indexKinds.length ? `${engine?.label} has no ${INDEX_KINDS.find((k) => k[0] === ix.kind)[1]}${ix.kind === 'geo' && id === 'dynamodb' ? ': store a geohash of the location as a key instead' : ''}.` : `${engine?.label} has no secondary indexes: queries must use the ${v.key.toLowerCase()}.`); continue; }
      if (ix.fields.length > v.maxIndexFields) err(t.name, `A ${v.index.toLowerCase()} in ${engine?.label} covers at most ${v.maxIndexFields} fields.`);
      if (ix.kind === 'geo' && type(ix.fields[0]) !== 'geo') err(t.name, `A geo index needs a location field; ${ix.fields[0]} is ${TYPES.find((x) => x[0] === type(ix.fields[0]))?.[1]}.`);
      if (ix.kind === 'text' && !['text', 'string'].includes(type(ix.fields[0]))) err(t.name, `A text index needs a text field; ${ix.fields[0]} is ${TYPES.find((x) => x[0] === type(ix.fields[0]))?.[1]}.`);
    }
    if (id === 's3' && !t.fields.some((f) => f.type === 'blob')) warn(t.name, `Bucket ${t.name} has no file field: S3 is for files.`);
    if (id !== 's3' && t.fields.some((f) => f.type === 'blob')) warn(t.name, `Files in ${engine?.label || 'the database'} make every read and backup heavy: keep files in object storage (S3) and their key here.`);
    if (['postgres', 'mysql', 'mongodb', undefined].includes(id) && t.fields.some((f) => f.type === 'geo') && !(t.indexes || []).some((ix) => ix.kind === 'geo')) warn(t.name, `${t.name} has a location but no geo index: "near this point" would read every row.`);
  }
  return out;
}

// One line for the canvas: "2 tables: links, clicks".
export function schemaSummary(engine, schema) {
  const n = schema?.tables?.length || 0; if (!n) return '';
  const v = vocab(engine), noun = n === 1 ? v.table.toLowerCase() : v.tables;
  const names = schema.tables.map((t) => t.name).join(', ');
  return `${n} ${noun}: ${names.length > 34 ? names.slice(0, 33) + '…' : names}`;
}
