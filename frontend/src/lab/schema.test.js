import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanSchema, schemaIssues, schemaSummary, vocab } from './schema.js';
import { engineOf, catalogue } from './engine.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
const db = catalogue(lab).database;
const E = (id) => engineOf(db, { engine: id });
const errors = (id, schema) => schemaIssues(E(id), cleanSchema(schema)).filter((x) => x.level === 'error').map((x) => x.text);
const warns = (id, schema) => schemaIssues(E(id), cleanSchema(schema)).filter((x) => x.level === 'warn').map((x) => x.text);

test('cleanSchema keeps valid names and references, drops the rest, and respects limits', () => {
  const s = cleanSchema({ tables: [
    { name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'long_url', type: 'weird' }, { name: 'code', type: 'int' }, { name: '9bad', type: 'int' }],
      key: ['code', 'missing', 'code'], sortKey: 'nope', indexes: [{ kind: 'btree', fields: ['long_url', 'ghost'] }, { kind: 'magic', fields: ['code'] }, { kind: 'geo', fields: [] }], ttl: 'code' },
    { name: 'LINKS', fields: [] }, { name: 'bad name', fields: [] }, null, 'x'] });
  assert.deepEqual(s, { tables: [{ name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'long_url', type: 'string' }], key: ['code'], indexes: [{ fields: ['long_url'], kind: 'btree' }], ttl: 'code' }] });
  assert.equal(cleanSchema({ tables: [] }), undefined);
  assert.equal(cleanSchema('x'), undefined);
  assert.equal(cleanSchema({ tables: Array.from({ length: 20 }, (_, i) => ({ name: 't' + i, fields: [] })) }).tables.length, 12);
});

test('every engine has its own words for tables and keys', () => {
  assert.equal(vocab(E('postgres')).key, 'Primary key');
  assert.equal(vocab(E('dynamodb')).sortKey, 'Sort key');
  assert.equal(vocab(E('mongodb')).table, 'Collection');
  assert.equal(vocab(E('cassandra')).sortKey, 'Clustering column');
  assert.equal(vocab(E('s3')).table, 'Bucket');
  assert.equal(vocab(E('opensearch')).allIndexed, true);
  for (const e of db.engines) assert.ok(e.schema && e.schema.table && e.schema.key, e.id);
});

test('schemaIssues: what each engine can and cannot do', () => {
  const geoTable = { name: 'places', fields: [{ name: 'id', type: 'string' }, { name: 'loc', type: 'geo' }], key: ['id'] };
  // relational: a key is required; a location without a geo index is a warning; a geo index is fine
  assert.match(errors('postgres', { tables: [{ name: 't', fields: [{ name: 'a', type: 'string' }] }] })[0], /primary key/);
  assert.match(warns('postgres', { tables: [geoTable] })[0], /no geo index/);
  assert.deepEqual(errors('postgres', { tables: [{ ...geoTable, indexes: [{ kind: 'geo', fields: ['loc'] }] }] }), []);
  // a geo index on a text field, and a text index on a number, are errors
  assert.match(errors('postgres', { tables: [{ ...geoTable, indexes: [{ kind: 'geo', fields: ['id'] }] }] })[0], /needs a location/);
  // DynamoDB: no geo index (use a geohash key instead), no sort-key-less mistakes, keys must be scalar
  assert.match(errors('dynamodb', { tables: [{ ...geoTable, indexes: [{ kind: 'geo', fields: ['loc'] }] }] })[0], /geohash/);
  assert.match(errors('dynamodb', { tables: [{ name: 't', fields: [{ name: 'tags', type: 'list' }], key: ['tags'] }] })[0], /can't be part of a key/);
  assert.deepEqual(errors('dynamodb', { tables: [{ name: 'msgs', fields: [{ name: 'chat', type: 'string' }, { name: 'at', type: 'time' }], key: ['chat'], sortKey: 'at', ttl: 'at' }] }), []);
  // PostgreSQL has no sort key or TTL
  assert.equal(errors('postgres', { tables: [{ name: 'msgs', fields: [{ name: 'chat', type: 'string' }, { name: 'at', type: 'time' }], key: ['chat'], sortKey: 'at', ttl: 'at' }] }).length, 2);
  // Cassandra: no secondary indexes
  assert.match(errors('cassandra', { tables: [{ name: 'm', fields: [{ name: 'a', type: 'string' }, { name: 'b', type: 'string' }], key: ['a'], indexes: [{ kind: 'btree', fields: ['b'] }] }] })[0], /no secondary indexes/);
  // OpenSearch: no key needed
  assert.deepEqual(errors('opensearch', { tables: [{ name: 'dishes', fields: [{ name: 'name', type: 'text' }] }] }), []);
  // files: S3 wants them, a database warns about them
  assert.match(warns('s3', { tables: [{ name: 'b', fields: [{ name: 'path', type: 'string' }], key: ['path'] }] })[0], /no file field/);
  assert.match(warns('postgres', { tables: [{ name: 'p', fields: [{ name: 'id', type: 'string' }, { name: 'img', type: 'blob' }], key: ['id'] }] })[0], /object storage/);
});

test('schemaSummary names what the database holds, in its own words', () => {
  assert.equal(schemaSummary(E('mongodb'), { tables: [{ name: 'users' }, { name: 'orders' }] }), '2 collections: users, orders');
  assert.equal(schemaSummary(E('s3'), { tables: [{ name: 'photos' }] }), '1 bucket: photos');
  assert.equal(schemaSummary(E('postgres'), undefined), '');
});
