// Access paths: can this table answer this step, and at what cost (evaluator.md §7.4)?
//
// Ported from v1's judge/requests.js (field matching, access by engine and schema, the query in the engine's own
// language); that file is unchanged because v1 problems still use it. Costs are work units (eval.json `work`).
//
// A "table" is a database schema table, or a cache structure ({...table, kind: kv|counter|zset|geo|set}).
import { vocab } from '../lab/schema.js';
import { configOf, capsOf } from './design.js';
import { ACCESS } from './words.js';

// ---- field names: the learner's names are matched loosely to the problem's ----------------------------
export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
export function fieldMatcher(practice) {
  const al = practice?.aliases || {};
  return (logical, userName) => { const u = norm(userName); return u === norm(logical) || (Array.isArray(al[logical]) ? al[logical] : []).some((a) => norm(a) === u); };
}
// The learner's field in table t for a logical field, or null.
export const userField = (match, t, logical) => (t.fields || []).find((f) => norm(f.name) === norm(logical)) || (t.fields || []).find((f) => match(logical, f.name)) || null;

// ---- what a step uses -------------------------------------------------------------------------------------
const READING = new Set(['get', 'query', 'sum', 'rank']);
export const isRead = (s) => READING.has(s.op) || (s.op === 'blob' && s.mode !== 'put');
export const isWrite = (s) => ['put', 'update', 'tx', 'incr'].includes(s.op) || (s.op === 'blob' && s.mode === 'put');
export const lookupOf = (step) => ({ ...(step.by || {}), ...(step.where || {}), ...(step.key || {}), ...(step.of || {}) });
// Fields the store must have to find the rows (missing ones make the path impossible).
export function accessFields(step) {
  const s = new Set(Object.keys(lookupOf(step)));
  for (const k of ['near', 'text', 'range', 'order']) if (step[k]?.field) s.add(step[k].field);
  if (['sum', 'blob', 'incr'].includes(step.op) && step.field) s.add(step.field);
  return [...s];
}
// Every field a step uses: found by, filtered on, returned, written.
export function stepFields(step) {
  if (step.op === 'tx') return [...new Set((step.steps || []).flatMap(stepFields))];
  const s = new Set([...accessFields(step), ...(step.fields || []), ...Object.keys(step.values || {}), ...Object.keys(step.set || {}), ...Object.keys(step.add || {}), ...Object.keys(step.cond || {})]);
  return [...s];
}
// Which of the step's fields the table has.
export function fitOf(table, step, match) {
  const have = [], miss = [];
  for (const l of stepFields(step)) (userField(match, table, l) ? have : miss).push(l);
  return { have, miss };
}

// ---- stores --------------------------------------------------------------------------------------------
export const engineOfNode = (node, lab) => {
  const db = (lab?.components || []).find((c) => c.type === 'database');
  const id = configOf(node, lab).engine;
  return db?.engines?.find((e) => e.id === id) || null;
};
// The tables a node keeps: a database's schema, a cache's structures (only those make a cache a store).
export function tablesOf(node, lab) {
  if (node?.type === 'database') return configOf(node, lab).schema?.tables || [];
  if (node?.type === 'cache') return configOf(node, lab).structures || [];
  return [];
}
export const rowsOf = (practice, entity) => practice?.entities?.[entity]?.rows ?? 1000;
const eq = (row, where) => Object.entries(where || {}).every(([k, v]) => row[k] === v);
// Rows that match a query at the problem's scale (default: how many sample rows match).
export function matchesOf(step, practice) {
  if (Number.isFinite(step.matches)) return step.matches;
  const sample = practice?.entities?.[step.entity]?.sample || [];
  return Math.max(1, sample.filter((r) => eq(r, step.where)).length);
}
// Does this table keep (a copy of) the entity? Its name is the entity's, or it has every field of a reading step
// on the entity. Used for copies and feeds (§7.6); binding a step only needs the step's own fields.
export function holds(table, entity, practice, match = fieldMatcher(practice)) {
  const n = norm(table.name), e = norm(entity);
  if (n === e || n === e.replace(/s$/, '') || `${n}s` === e) return true;
  return (practice?.operations || []).some((op) => (op.steps || []).some((s) => s.entity === entity && isRead(s) && stepFields(s).every((l) => userField(match, table, l))));
}

// ---- the access path -------------------------------------------------------------------------------------
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// → { ok, how, work, rows, why?, query }
export function accessPath(node, table, step, practice, lab, match = fieldMatcher(practice)) {
  const ev = lab.eval, W = ev.work, caps = new Set(capsOf(node, lab)), cache = node.type === 'cache';
  const eng = cache ? null : engineOfNode(node, lab), id = cache ? 'cache' : eng?.id || 'postgres';
  const v = vocab(eng), label = cache ? 'A cache' : eng?.label || 'This database', keyWord = cache ? 'key' : v.key.toLowerCase();
  const uf = (l) => userField(match, table, l)?.name;
  const query = dialect(step, table, id, match);
  const yes = (how, work, rows = 1, extra = {}) => ({ ok: true, how, work, rows, query, ...extra });
  const no = (why) => ({ ok: false, why, query });

  const absent = accessFields(step).filter((l) => !uf(l));
  if (absent.length) return no(ACCESS.missing(table.name, absent));

  const rows = rowsOf(practice, step.entity), matches = matchesOf(step, practice), rpu = W.rowsPerUnit;
  const F = Object.keys(lookupOf(step)).map(uf), by = F.join(', ') || 'this';
  const key = table.key || [], sk = table.sortKey || null;
  const ixs = cache ? [] : (table.indexes || []).filter((i) => v.indexKinds.includes(i.kind));
  // an engine with B-tree indexes keeps its primary key as one too: a query on the key's first fields uses it
  const btree = caps.has('index') ? [...(key.length > 1 ? [{ fields: key, kind: 'btree', primary: true }] : []), ...ixs.filter((i) => i.kind === 'btree' || i.kind === 'unique')] : [];
  // an index whose first fields are F (any order), then `then`
  const prefixIx = (fields, then) => (fields.length || then ? btree.find((i) => i.fields.length >= fields.length + (then ? 1 : 0) && same(i.fields.slice(0, fields.length), fields) && (!then || i.fields[fields.length] === then)) : null);
  const allIx = !cache && !!v.allIndexed;
  const scanOk = caps.has('scan') && rows <= ev.scanLimit, scanWork = Math.max(5, rows / W.scanRowsPerUnit);
  const noFind = () => (caps.has('scan') ? ACCESS.scan(table.name, by, rows, keyWord) : cache ? ACCESS.cacheOnly(table.name) : ACCESS.noFind(label, table.name, by, keyWord, v.indexKinds.length > 0));
  // one row by F
  const getPath = () => {
    if (key.length && (same(F, key) || (sk && same(F, [...key, sk])))) return { how: 'key', work: W.get };
    const ix = prefixIx(F); if (F.length && ix) return { how: 'index', work: W.indexRead };
    if (allIx) return { how: 'index', work: W.indexRead };
    if (scanOk) return { how: 'scan', work: scanWork };
    return null;
  };
  // many rows by F (equality only)
  const manyPath = () => {
    if (key.length && key.every((k) => F.includes(k))) return { how: 'key', work: 1 };
    const ix = F.length ? btree.find((i) => i.fields.length >= 1 && i.fields.slice(0, F.length).every((f) => F.includes(f)) && F.includes(i.fields[0])) : null;
    if (ix) return { how: 'index', work: W.indexRead };
    if (allIx) return { how: 'index', work: W.indexRead };
    if (scanOk) return { how: 'scan', work: scanWork };
    return null;
  };

  if (id === 's3') {
    if (step.op === 'blob' || step.op === 'get' || step.op === 'put') {
      if (step.op === 'put' || (step.op === 'blob' && step.mode === 'put')) { /* written by its key */ }
      else if (!(key.length && same(F, key))) return no(ACCESS.s3Key(key.join(', ')));
    } else return no(step.op === 'update' || step.op === 'incr' ? ACCESS.s3Update() : ACCESS.s3Query());
  }

  if (step.op === 'get') { const p = getPath(); return p ? yes(p.how, p.work) : no(noFind()); }

  if (step.op === 'query' || (step.op === 'rank' && !cache)) {
    const r = Math.min(step.limit ?? matches, matches);
    if (step.near) {
      const f = uf(step.near.field), type = (table.fields || []).find((x) => x.name === f)?.type;
      if (type !== 'geo') return no(ACCESS.geoField(table.name, f));
      if ((cache && table.kind === 'geo') || (allIx) || ixs.some((i) => i.kind === 'geo' && i.fields[0] === f)) return yes('geo', W.geo + r / rpu, r);
      if (scanOk) return yes('scan', scanWork + r / rpu, r);
      return no(ACCESS.geo(table.name, f));
    }
    if (step.text) {
      const f = uf(step.text.field), type = (table.fields || []).find((x) => x.name === f)?.type;
      if ((allIx && ['text', 'string'].includes(type)) || ixs.some((i) => i.kind === 'text' && i.fields[0] === f)) return yes('text', W.text + r / rpu, r);
      if (scanOk) return yes('scan', scanWork + r / rpu, r);
      return no(ACCESS.text(table.name, f));
    }
    const g = uf(step.order?.field || step.range?.field || '') || null;
    if (g) {
      if (key.length && same(F, key) && sk === g) return yes('key-range', 1 + r / rpu, r);
      if (prefixIx(F, g)) return yes('index-range', W.indexRead + r / rpu, r);
    }
    const p = manyPath();
    if (!p) return no(step.op === 'rank' ? ACCESS.rank(table.name, g || step.order?.field) : noFind());
    if (g && !allIx) {
      if (matches > ev.sortLimit) return no(ACCESS.sort(matches, g, v.sortKey ? v.sortKey.toLowerCase() : 'second field of an index'));
      return yes(p.how, p.work + matches / rpu, r, { sorted: true });
    }
    return yes(p.how, p.work + r / rpu, r);
  }

  if (step.op === 'rank') {
    const f = uf(step.order?.field || '');
    if (table.kind === 'zset' && (!sk || sk === f)) return yes('zset', W.rank, Math.min(step.limit ?? 1, matchesOf(step, practice)));
    return no(ACCESS.rank(table.name, f || step.order?.field));
  }

  if (step.op === 'sum') {
    if (!caps.has('agg')) return no(ACCESS.agg(label));
    if (matches > 1e6) return no(ACCESS.aggBig(matches));
    const p = F.length ? manyPath() : (allIx || scanOk || caps.has('agg') ? { how: 'agg', work: 1 } : null);
    return p ? yes('agg', 1 + matches / rpu, 1) : no(noFind());
  }

  const indexWork = W.indexWrite * (allIx ? (table.fields || []).length : ixs.length);

  if (step.op === 'put') {
    const given = Object.keys(step.values || {});
    const missingKey = v.keyRequired !== false ? key.filter((k) => !given.some((l) => match(l, k) || norm(l) === norm(k))) : [];
    if (missingKey.length) return no(ACCESS.putKey(table.name, keyWord, missingKey));
    if (Array.isArray(step.unique) && step.unique.length) {
      const U = step.unique.map(uf);
      // the primary key of a store with a sort key is the key and the sort key together
      const onKey = key.length && (same(U, key) || (sk && same(U, [...key, sk]))) && (caps.has('cas') || !!lab.eval.engines?.[id]?.uniqueOnKey || cache);
      const onIx = caps.has('unique') && ixs.some((i) => i.kind === 'unique' && same(i.fields, U));
      if (!onKey && !onIx) return no(caps.has('cas') || caps.has('unique') ? ACCESS.uniqueWhere(table.name, U.join(', ')) : ACCESS.unique(label));
    }
    return yes('write', W.put + indexWork);
  }

  if (step.op === 'update' || step.op === 'incr') {
    if (step.op === 'incr' && !caps.has('counter')) return no(ACCESS.counter(label));
    // a sorted set adds to a member's score (ZINCRBY): a leaderboard's points
    if (step.op === 'incr' && cache && !['counter', 'kv', 'zset'].includes(table.kind)) return no(ACCESS.counter(`The ${table.kind} ${table.name}`));
    if (step.cond && !caps.has('cas')) return no(ACCESS.cas(label));
    const p = getPath();
    if (!p) return no(noFind());
    const find = p.how === 'key' ? 0 : p.work;
    const base = step.op === 'incr' ? W.incr : W.update + indexWork;
    return yes('write', base * (step.cond && id === 'cassandra' ? W.casFactorCassandra : 1) + find);
  }

  if (step.op === 'blob') {
    if (!caps.has('blob')) return no(ACCESS.blobRows(label));
    const f = uf(step.field);
    if ((table.fields || []).find((x) => x.name === f)?.type !== 'blob') return no(ACCESS.blobField(table.name));
    return yes('blob', Math.max(1, ((step.bytes ?? 1e6) / 1e6) * W.blobPerMB));
  }

  return no(`${step.op} is not something a table can do.`);
}

// ---- the query a Service would send, in the store's own language ---------------------------------------------
export function dialect(step, t, id, match) {
  const uf = (l) => userField(match, t, l)?.name || l, q = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v));
  const where = Object.entries(lookupOf(step)).map(([k, v]) => [uf(k), v]), cols = (step.fields || []).map(uf);
  const vals = (o) => Object.entries(o || {}).map(([k, v]) => [uf(k), v]);
  const order = step.order ? { f: uf(step.order.field), desc: !!step.order.desc } : null;
  if (step.op === 'tx') return '';
  if (id === 'cache') {
    const k = `${t.name}:${where.map(([, v]) => v).join(':')}`;
    if (step.op === 'incr') return `INCR ${k}`;
    if (step.op === 'rank') return step.of ? `ZREVRANK ${t.name} ${where.map(([, v]) => v).join(':')}` : `ZREVRANGE ${t.name} 0 ${(step.limit || 10) - 1} WITHSCORES`;
    if (step.near) return `GEOSEARCH ${t.name} FROMLONLAT ${step.near.at[1]} ${step.near.at[0]} BYRADIUS ${step.near.km} km ASC`;
    if (step.op === 'put') { const key = (t.key || []).map((x) => vals(step.values).find(([n]) => n === x)?.[1]).join(':'); return `HSET ${t.name}:${key} ${vals(step.values).map(([n, v]) => `${n} ${q(v)}`).join(' ')}`; }
    if (step.op === 'update') return `HSET ${k} ${[...vals(step.set).map(([n, v]) => `${n} ${q(v)}`), ...vals(step.add).map(([n, v]) => `${n} +${v}`)].join(' ')}`;
    return `HGETALL ${k}`;
  }
  const sqlWhere = [...where.map(([k, v]) => `${k} = ${q(v)}`), ...(step.near ? [`ST_DWithin(${uf(step.near.field)}, ST_Point(${step.near.at[1]}, ${step.near.at[0]}), ${step.near.km * 1000})`] : []), ...(step.text ? [`${uf(step.text.field)} @@ plainto_tsquery(${q(step.text.q)})`] : []), ...(step.range ? [`${uf(step.range.field)} BETWEEN ${q(step.range.from)} AND ${q(step.range.to)}`] : [])].join(' AND ');
  const ord = step.near ? ` ORDER BY ${uf(step.near.field)} <-> ST_Point(${step.near.at[1]}, ${step.near.at[0]})` : order ? ` ORDER BY ${order.f}${order.desc ? ' DESC' : ''}` : '', lim = step.limit ? ` LIMIT ${step.limit}` : '';
  if (id === 'postgres' || id === 'mysql' || id === 'cassandra' || id === 'timeseries') {
    if (step.op === 'put') { const v = vals(step.values); return `INSERT INTO ${t.name} (${v.map((x) => x[0]).join(', ')}) VALUES (${v.map((x) => q(x[1])).join(', ')})${id === 'cassandra' && step.unique ? ' IF NOT EXISTS' : ''};`; }
    if (step.op === 'incr') return `UPDATE ${t.name} SET ${uf(step.field)} = ${uf(step.field)} + 1 WHERE ${sqlWhere};`;
    if (step.op === 'update') return `UPDATE ${t.name} SET ${[...vals(step.set).map(([k, v]) => `${k} = ${q(v)}`), ...vals(step.add).map(([k, v]) => `${k} = ${k} + ${v}`)].join(', ')} WHERE ${sqlWhere}${Object.entries(step.cond || {}).map(([k, c], i) => ` ${id === 'cassandra' ? (i ? 'AND' : 'IF') : 'AND'} ${uf(k)} ${c.eq !== undefined ? `= ${q(c.eq)}` : `>= ${c.gte}`}`).join('')};`;
    if (step.op === 'sum') return `SELECT sum(${uf(step.field)}) FROM ${t.name}${sqlWhere ? ` WHERE ${sqlWhere}` : ''};`;
    return `SELECT ${cols.join(', ') || '*'} FROM ${t.name}${sqlWhere ? ` WHERE ${sqlWhere}` : ''}${ord}${lim};`;
  }
  if (id === 'dynamodb') {
    const key = Object.fromEntries(where);
    if (step.op === 'put') return JSON.stringify({ PutItem: { TableName: t.name, Item: Object.fromEntries(vals(step.values)), ...(step.unique ? { ConditionExpression: `attribute_not_exists(${uf(step.unique[0])})` } : {}) } }, null, 1);
    if (step.op === 'update' || step.op === 'incr') return JSON.stringify({ UpdateItem: { TableName: t.name, Key: key, UpdateExpression: step.op === 'incr' ? `ADD ${uf(step.field)} 1` : [...vals(step.set).map(([k]) => `SET ${k} = :${k}`), ...vals(step.add).map(([k, v]) => `ADD ${k} ${v}`)].join(' '), ...(step.cond ? { ConditionExpression: Object.entries(step.cond).map(([k, c]) => (c.eq !== undefined ? `${uf(k)} = :${uf(k)}` : `${uf(k)} >= ${c.gte}`)).join(' AND ') } : {}) } }, null, 1);
    if (step.op === 'get') return JSON.stringify({ GetItem: { TableName: t.name, Key: key, ProjectionExpression: cols.join(', ') } }, null, 1);
    return JSON.stringify({ Query: { TableName: t.name, KeyConditionExpression: where.map(([k]) => `${k} = :${k}`).join(' AND '), ...(order ? { ScanIndexForward: !order.desc } : {}), ...(step.limit ? { Limit: step.limit } : {}) } }, null, 1);
  }
  if (id === 'mongodb') {
    const filter = Object.fromEntries([...where, ...(step.near ? [[uf(step.near.field), { $near: { $geometry: { type: 'Point', coordinates: [step.near.at[1], step.near.at[0]] }, $maxDistance: step.near.km * 1000 } }]] : []), ...(step.text ? [['$text', { $search: step.text.q }]] : [])]);
    if (step.op === 'put') return `db.${t.name}.insertOne(${JSON.stringify(Object.fromEntries(vals(step.values)))})`;
    if (step.op === 'incr') return `db.${t.name}.updateOne(${JSON.stringify(filter)}, {"$inc": {"${uf(step.field)}": 1}})`;
    if (step.op === 'update') return `db.${t.name}.updateOne(${JSON.stringify(filter)}, ${JSON.stringify({ ...(step.set ? { $set: Object.fromEntries(vals(step.set)) } : {}), ...(step.add ? { $inc: Object.fromEntries(vals(step.add)) } : {}) })})`;
    if (step.op === 'sum') return `db.${t.name}.aggregate([{"$match": ${JSON.stringify(filter)}}, {"$group": {"_id": null, "total": {"$sum": "$${uf(step.field)}"}}}])`;
    return `db.${t.name}.${step.op === 'get' ? 'findOne' : 'find'}(${JSON.stringify(filter)})${order ? `.sort({${order.f}: ${order.desc ? -1 : 1}})` : ''}${step.limit ? `.limit(${step.limit})` : ''}`;
  }
  if (id === 'opensearch') {
    if (step.op === 'put') return `PUT /${t.name}/_doc\n${JSON.stringify(Object.fromEntries(vals(step.values)))}`;
    const must = [...where.map(([k, v]) => ({ term: { [k]: v } })), ...(step.text ? [{ match: { [uf(step.text.field)]: step.text.q } }] : [])];
    const filter = step.near ? [{ geo_distance: { distance: `${step.near.km}km`, [uf(step.near.field)]: { lat: step.near.at[0], lon: step.near.at[1] } } }] : [];
    return `GET /${t.name}/_search\n${JSON.stringify({ query: { bool: { must, filter } }, ...(step.limit ? { size: step.limit } : {}) })}`;
  }
  if (id === 's3') {
    const parts = Object.fromEntries(step.op === 'put' ? vals(step.values) : where);
    const path = (t.key || []).map((k) => parts[k] ?? `{${k}}`).join('/');
    return `${step.mode === 'put' || step.op === 'put' ? 'PUT' : 'GET'} s3://${t.name}/${path}`;
  }
  if (id === 'graph') return `g.V().hasLabel('${t.name}')${where.map(([k, v]) => `.has('${k}', ${q(v)})`).join('')}${step.op === 'put' ? '.fold().coalesce(unfold(), addV())' : '.valueMap()'}`;
  return '';
}
