// Request tests: does the design turn a client's request into the right response?
//
// A problem's request test gives the HTTP request, the data steps a correct backend does, and a response
// template. The expected response is those steps run on the problem's sample data. The design's own
// response is the same steps run *through the design*: the request travels from the Clients through
// edge components to a server; each step is planned against the databases that server can reach, using
// their engines and schemas (lab/schema.js); the query is written in the engine's own language and run on
// the sample data; the response is built from what came back. Where the design can't do a step (no table
// holds the fields, no index for the lookup, a read stuck behind a queue, files in a database row…) the
// response is the error a real system would give, with the reason. Every hop is recorded for the
// animation (trace).
//
//   problem.data = {entities: {name: {rows, sample: [row]}}, fields: [name], aliases: {field: [other names]}}
//   test = {id, name, desc, sample?, request: {method, path, body?}, async?: true, steps: [step],
//           respond: {status, body}}
//   step = {id, op: "get",    entity, by: {field: value}, fields}
//        | {id, op: "query",  entity, where?, near?: {field, at: [lat, lng], km}, text?: {field, q},
//                             range?: {field, from, to}, order?: {field, desc?}, limit?, fields, matches?}
//        | {id, op: "put",    entity, values}
//        | {id, op: "update", entity, by, set?, add?, cond?: {field: {gte: n} | {eq: value}}}
//        | {id, op: "tx",     steps: [put | update]}            (one store, with transactions)
//        | {id, op: "blob",   entity, key: {field: value}, field, mode: "put" | "get"}  (object storage)
//        | {id, op: "sum",    entity, where?, range?, field}
//   Template strings in respond.body: "$s1.long_url" (a value), "$s1" (a row or rows), "{$s1.code}" inside text.
import { catalogue, engineOf, displayName } from '../lab/engine.js';
import { vocab } from '../lab/schema.js';

export const SCAN_LIMIT = 50000;   // a table this small can be read whole
export const SORT_LIMIT = 10000;   // this many matching rows can be sorted in memory
const PASS = new Set(['cdn', 'apigw', 'lb']);
const SCANNERS = new Set(['postgres', 'mysql', 'mongodb', 'opensearch', 'graph', 'timeseries']);
const fmtN = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)} crore` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)} lakh` : n.toLocaleString('en-US'));

// ---- field names: the user's names are matched loosely to the problem's ------------------------------
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
export function fieldMatcher(problemData) {
  const al = problemData?.aliases || {};
  return (logical, userName) => { const u = norm(userName); return u === norm(logical) || (al[logical] || []).some((a) => norm(a) === u); };
}
// The user's field (in table t) for a logical field, or null.
const userField = (match, t, logical) => t.fields.find((f) => norm(f.name) === norm(logical)) || t.fields.find((f) => match(logical, f.name)) || null;

// ---- the design as a graph -----------------------------------------------------------------------------
function graph(design, lab) {
  const cat = catalogue(lab), byId = new Map(design.nodes.filter((n) => cat[n.type]).map((n) => [n.id, n])), out = new Map([...byId.keys()].map((id) => [id, []]));
  for (const e of design.edges) if (out.has(e.from) && byId.has(e.to)) out.get(e.from).push(e.to);
  return { cat, byId, out };
}
// The way in: Clients → edge components → the first server (breadth first, design order). Returns the hops.
function wayIn(g) {
  const clients = [...g.byId.values()].filter((n) => n.type === 'client');
  for (const c of clients) {
    const prev = new Map([[c.id, null]]), todo = [c.id];
    while (todo.length) {
      const x = todo.shift();
      for (const y of g.out.get(x)) {
        if (prev.has(y)) continue; prev.set(y, x);
        const t = g.byId.get(y).type;
        if (t === 'server') { const path = [y]; let p = x; while (p) { path.unshift(p); p = prev.get(p); } return { client: c.id, path, server: y }; }
        if (PASS.has(t)) todo.push(y);
      }
    }
  }
  return { client: clients[0]?.id || null, path: clients[0] ? [clients[0].id] : [], server: null };
}
// Databases a server reaches: through caches and other servers (sync), or past a queue (async).
function stores(g, server) {
  const found = [], seen = new Set([server]), todo = [{ id: server, path: [server], async: false }];
  while (todo.length) {
    const { id, path, async } = todo.shift();
    for (const y of g.out.get(id)) {
      if (seen.has(y + async)) continue; seen.add(y + async);
      const n = g.byId.get(y), p = [...path, y];
      if (n.type === 'database') found.push({ id: y, path: p, async });
      else if (n.type === 'queue') todo.push({ id: y, path: p, async: true });
      else if (n.type === 'server' || n.type === 'cache') todo.push({ id: y, path: p, async });
    }
  }
  return found.sort((a, b) => a.async - b.async || a.path.length - b.path.length);
}

// ---- running steps on the sample data ------------------------------------------------------------------
const km = (a, b) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
const eq = (row, where) => Object.entries(where || {}).every(([k, v]) => row[k] === v);
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/).filter(Boolean);
function execute(step, db) {
  const rows = db[step.entity] || (db[step.entity] = []);
  const pick = (r) => Object.fromEntries((step.fields || Object.keys(r)).map((f) => [f, r[f] ?? null]));
  if (step.op === 'get') { const r = rows.find((x) => eq(x, step.by)); return r ? pick(r) : null; }
  if (step.op === 'query' || step.op === 'sum') {
    let rs = rows.filter((x) => eq(x, step.where));
    if (step.range) rs = rs.filter((x) => x[step.range.field] >= step.range.from && x[step.range.field] <= step.range.to);
    if (step.text) { const want = words(step.text.q); rs = rs.filter((x) => { const have = words(x[step.text.field]); return want.every((w) => have.some((h) => h.startsWith(w))); }); }
    if (step.op === 'sum') return rs.reduce((a, x) => a + (+x[step.field] || 0), 0);
    if (step.near) rs = rs.map((x) => ({ ...x, distance_km: +km(step.near.at, x[step.near.field]).toFixed(2) })).filter((x) => x.distance_km <= step.near.km).sort((a, b) => a.distance_km - b.distance_km);
    if (step.order) rs = [...rs].sort((a, b) => (a[step.order.field] < b[step.order.field] ? -1 : a[step.order.field] > b[step.order.field] ? 1 : 0) * (step.order.desc ? -1 : 1));
    if (step.limit) rs = rs.slice(0, step.limit);
    return rs.map((r) => ({ ...pick(r), ...(step.near ? { distance_km: r.distance_km } : {}) }));
  }
  if (step.op === 'put') { rows.push({ ...step.values }); return { ...step.values }; }
  if (step.op === 'update') {
    const r = rows.find((x) => eq(x, step.by)); if (!r) return null;
    for (const [k, c] of Object.entries(step.cond || {})) if ((c.gte !== undefined && !(r[k] >= c.gte)) || (c.eq !== undefined && r[k] !== c.eq)) return { ok: false };
    Object.assign(r, step.set || {}); for (const [k, v] of Object.entries(step.add || {})) r[k] = (+r[k] || 0) + v;
    return { ok: true, ...r };
  }
  if (step.op === 'tx') { const out = step.steps.map((s) => execute(s, db)); return out.every((o) => o && o.ok !== false) ? { ok: true } : { ok: false }; }
  if (step.op === 'blob') { if (step.mode === 'put') { rows.push({ ...step.key, [step.field]: '<bytes>' }); return { ok: true }; } const r = rows.find((x) => eq(x, step.key)); return r ? { ok: true } : null; }
  return null;
}
const fill = (tpl, out) => {
  const val = (ref) => { const [s, ...path] = ref.split('.'); let v = out[s]; for (const p of path) v = p === 'length' ? v?.length : v?.[p]; return v ?? null; };
  if (typeof tpl === 'string') { if (/^\$[a-z0-9_]+(\.[a-z0-9_]+)*$/i.test(tpl)) return val(tpl.slice(1)); return tpl.replace(/\{\$([a-z0-9_.]+)\}/gi, (_, r) => String(val(r) ?? '')); }
  if (Array.isArray(tpl)) return tpl.map((x) => fill(x, out));
  if (tpl && typeof tpl === 'object') return Object.fromEntries(Object.entries(tpl).map(([k, v]) => [k, fill(v, out)]));
  return tpl;
};
const seed = (data) => Object.fromEntries(Object.entries(data?.entities || {}).map(([k, e]) => [k, structuredClone(e.sample || [])]));

// The expected response: the steps run on the sample data, no design involved.
export function expected(problem, test) {
  const db = seed(problem.data), out = {};
  for (const s of test.steps) out[s.id] = execute(s, db);
  return { status: test.respond.status, body: fill(test.respond.body, out) };
}

// ---- planning a step against a design's databases ------------------------------------------------------
// Logical fields a step needs: looked up by, filtered on, returned, written.
function needs(step) {
  const s = new Set([...Object.keys(step.by || {}), ...Object.keys(step.where || {}), ...(step.fields || []), ...Object.keys(step.values || {}), ...Object.keys(step.set || {}), ...Object.keys(step.add || {}), ...Object.keys(step.key || {})]);
  for (const k of ['near', 'text', 'range', 'order']) if (step[k]) s.add(step[k].field);
  if (step.op === 'sum' || step.op === 'blob') s.add(step.field);
  return [...s];
}
const lookup = (step) => ({ ...(step.by || {}), ...(step.where || {}), ...(step.key || {}) });
// How a table can serve a step: {ok, how, cost, why}. cost: 0 key, 1 index, 2 scan.
function access(step, t, e, match, rows) {
  const v = vocab(e), id = e?.id || 'postgres', uf = (l) => userField(match, t, l)?.name, eqs = Object.keys(lookup(step)).map(uf);
  const keyAll = t.key.length > 0 && t.key.every((k) => eqs.includes(k));
  const ix = (t.indexes || []).filter((i) => i.kind === 'btree' || i.kind === 'unique');
  const ixFor = (fields) => ix.find((i) => i.fields.length && eqs.includes(i.fields[0]) && (!fields || i.fields.slice(1).includes(fields)));
  const big = rows > SCAN_LIMIT, scan = SCANNERS.has(id) && !big;
  const scanWhy = SCANNERS.has(id) ? `it would read all ${fmtN(rows)} rows of ${t.name} for every request` : `${e?.label || id} can't search ${t.name} by ${eqs.join(', ') || 'this'}: it only finds rows by the ${v.key.toLowerCase()}${v.indexKinds?.length ? ' or an index' : ''}`;
  if (id === 's3') return step.op === 'blob' || step.op === 'get' || step.op === 'put' ? (keyAll || step.op === 'put' ? { ok: true, how: 'by object key', cost: 0 } : { ok: false, why: `S3 finds an object only by its whole key (${t.key.join(', ')})` }) : { ok: false, why: 'S3 can only get and put whole objects by key: it can’t filter, sort or count' };
  if (step.op === 'put') { const missing = t.key.filter((k) => !Object.keys(step.values).some((l) => match(l, k))); return missing.length ? { ok: false, why: `writing to ${t.name} needs its ${v.key.toLowerCase()} (${missing.join(', ')}), which this call doesn't have` } : { ok: true, how: 'insert', cost: 0 }; }
  if (step.near) {
    const f = uf(step.near.field), type = t.fields.find((x) => x.name === f)?.type;
    if (type !== 'geo') return { ok: false, why: `${f} in ${t.name} isn't a location field` };
    if (v.allIndexed || (t.indexes || []).some((i) => i.kind === 'geo' && i.fields[0] === f)) return { ok: true, how: `geo index on ${f}`, cost: 1 };
    return scan ? { ok: true, how: `reads all ${fmtN(rows)} rows and measures each distance`, cost: 2 } : { ok: false, why: id === 'dynamodb' ? `DynamoDB has no geo index: "near this point" needs a geohash of the location as a key` : `there is no geo index on ${f}: "near this point" ${SCANNERS.has(id) ? `would measure all ${fmtN(rows)} rows` : `isn't possible in ${e.label}`}` };
  }
  if (step.text) {
    const f = uf(step.text.field), type = t.fields.find((x) => x.name === f)?.type;
    if ((v.allIndexed && ['text', 'string'].includes(type)) || (t.indexes || []).some((i) => i.kind === 'text' && i.fields[0] === f)) return { ok: true, how: `text index on ${f}`, cost: 1 };
    return scan ? { ok: true, how: `reads all ${fmtN(rows)} rows looking for the words`, cost: 2 } : { ok: false, why: `there is no text index on ${f}: searching by words would read all ${fmtN(rows)} rows` };
  }
  // equality lookups (and ranges or order): the key, then an index, then a search engine, then a scan
  const order = step.order || (step.range ? { field: step.range.field } : null), many = step.op === 'query' || step.op === 'sum';
  const inOrder = (how, cost, pathSort) => (!order || pathSort || (step.matches ?? 100) <= SORT_LIMIT ? { ok: true, how: how + (order && !pathSort ? ', sorted in memory' : ''), cost }
    : { ok: false, why: `${fmtN(step.matches)} matching rows would be sorted in memory for every request: keep them in order (${v.sortKey ? `a ${v.sortKey.toLowerCase()}` : 'an index'} on ${uf(order.field) || order.field})` });
  if (keyAll) return inOrder(`by ${v.key.toLowerCase()}`, 0, !!order && t.sortKey === uf(order.field));
  const i = (order && ixFor(uf(order.field))) || ixFor(null);
  if (i) return inOrder(`${v.index.toLowerCase()} on ${i.fields.join(', ')}`, 1, !!order && i.fields.slice(1).includes(uf(order.field)));
  if (v.allIndexed) return { ok: true, how: 'its searchable fields', cost: 1 };
  if (scan) return { ok: true, how: `reads all ${fmtN(rows)} rows (a small table)`, cost: 2 };
  return { ok: false, why: many || !eqs.length ? scanWhy : `${t.name} has no ${v.key.toLowerCase()} or index on ${eqs.join(', ')}: ${scanWhy}` };
}

// The query a server would send, in the engine's language.
function dialect(step, t, e, match) {
  const id = e?.id || 'postgres', uf = (l) => userField(match, t, l)?.name || l, q = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v));
  const where = Object.entries(lookup(step)).map(([k, v]) => [uf(k), v]), cols = (step.fields || []).map(uf);
  const sqlWhere = [...where.map(([k, v]) => `${k} = ${q(v)}`), ...(step.near ? [`ST_DWithin(${uf(step.near.field)}, ST_Point(${step.near.at[1]}, ${step.near.at[0]}), ${step.near.km * 1000})`] : []), ...(step.text ? [`${uf(step.text.field)} @@ plainto_tsquery(${q(step.text.q)})`] : []), ...(step.range ? [`${uf(step.range.field)} BETWEEN ${q(step.range.from)} AND ${q(step.range.to)}`] : [])].join(' AND ');
  const order = step.near ? ` ORDER BY ${uf(step.near.field)} <-> ST_Point(${step.near.at[1]}, ${step.near.at[0]})` : step.order ? ` ORDER BY ${uf(step.order.field)}${step.order.desc ? ' DESC' : ''}` : '', lim = step.limit ? ` LIMIT ${step.limit}` : '';
  const vals = (o) => Object.entries(o || {}).map(([k, v]) => [uf(k), v]);
  if (id === 'postgres' || id === 'mysql' || id === 'cassandra' || id === 'timeseries') {
    if (step.op === 'put') { const v = vals(step.values); return `INSERT INTO ${t.name} (${v.map((x) => x[0]).join(', ')}) VALUES (${v.map((x) => q(x[1])).join(', ')})${id === 'cassandra' && t.ttl ? ' USING TTL 2592000' : ''};`; }
    if (step.op === 'update') return `UPDATE ${t.name} SET ${[...vals(step.set).map(([k, v]) => `${k} = ${q(v)}`), ...vals(step.add).map(([k, v]) => `${k} = ${k} + ${v}`)].join(', ')} WHERE ${sqlWhere}${Object.entries(step.cond || {}).map(([k, c], i) => ` ${id === 'cassandra' ? (i ? 'AND' : 'IF') : 'AND'} ${uf(k)} ${c.eq !== undefined ? `= ${q(c.eq)}` : `>= ${c.gte}`}`).join('')};`;
    if (step.op === 'sum') return `SELECT sum(${uf(step.field)}) FROM ${t.name} WHERE ${sqlWhere};`;
    return `SELECT ${cols.join(', ') || '*'} FROM ${t.name}${sqlWhere ? ` WHERE ${sqlWhere}` : ''}${order}${lim};`;
  }
  if (id === 'dynamodb') {
    const key = Object.fromEntries(where);
    if (step.op === 'put') return JSON.stringify({ PutItem: { TableName: t.name, Item: Object.fromEntries(vals(step.values)) } }, null, 1);
    if (step.op === 'update') return JSON.stringify({ UpdateItem: { TableName: t.name, Key: key, UpdateExpression: [...vals(step.set).map(([k]) => `SET ${k} = :${k}`), ...vals(step.add).map(([k, v]) => `ADD ${k} ${v}`)].join(' '), ...(step.cond ? { ConditionExpression: Object.entries(step.cond).map(([k, c]) => (c.eq !== undefined ? `${uf(k)} = :${uf(k)}` : `${uf(k)} >= ${c.gte}`)).join(' AND ') } : {}) } }, null, 1);
    if (step.op === 'get') return JSON.stringify({ GetItem: { TableName: t.name, Key: key, ProjectionExpression: cols.join(', ') } }, null, 1);
    return JSON.stringify({ Query: { TableName: t.name, KeyConditionExpression: where.map(([k]) => `${k} = :${k}`).join(' AND '), ...(step.order ? { ScanIndexForward: !step.order.desc } : {}), ...(step.limit ? { Limit: step.limit } : {}) } }, null, 1);
  }
  if (id === 'mongodb') {
    const filter = Object.fromEntries([...where, ...(step.near ? [[uf(step.near.field), { $near: { $geometry: { type: 'Point', coordinates: [step.near.at[1], step.near.at[0]] }, $maxDistance: step.near.km * 1000 } }]] : []), ...(step.text ? [['$text', { $search: step.text.q }]] : [])]);
    if (step.op === 'put') return `db.${t.name}.insertOne(${JSON.stringify(Object.fromEntries(vals(step.values)))})`;
    if (step.op === 'update') return `db.${t.name}.updateOne(${JSON.stringify(filter)}, ${JSON.stringify({ ...(step.set ? { $set: Object.fromEntries(vals(step.set)) } : {}), ...(step.add ? { $inc: Object.fromEntries(vals(step.add)) } : {}) })})`;
    return `db.${t.name}.${step.op === 'get' ? 'findOne' : 'find'}(${JSON.stringify(filter)})${step.order ? `.sort({${uf(step.order.field)}: ${step.order.desc ? -1 : 1}})` : ''}${step.limit ? `.limit(${step.limit})` : ''}`;
  }
  if (id === 'opensearch') {
    if (step.op === 'put') return `PUT /${t.name}/_doc\n${JSON.stringify(Object.fromEntries(vals(step.values)))}`;
    const must = [...where.map(([k, v]) => ({ term: { [k]: v } })), ...(step.text ? [{ match: { [uf(step.text.field)]: step.text.q } }] : [])];
    const filter = step.near ? [{ geo_distance: { distance: `${step.near.km}km`, [uf(step.near.field)]: { lat: step.near.at[0], lon: step.near.at[1] } } }] : [];
    return `GET /${t.name}/_search\n${JSON.stringify({ query: { bool: { must, filter } }, ...(step.limit ? { size: step.limit } : {}) })}`;
  }
  if (id === 's3') { const k = t.key.map((x) => `{${x}}`).join('/'); const path = Object.entries(lookup(step).constructor === Object ? lookup(step) : {}).reduce((p, [l, v]) => p.replace(`{${uf(l)}}`, v), k); return `${step.mode === 'put' || step.op === 'put' ? 'PUT' : 'GET'} s3://${t.name}/${path}`; }
  if (id === 'graph') return `g.V().hasLabel('${t.name}')${where.map(([k, v]) => `.has('${k}', ${q(v)})`).join('')}${step.op === 'put' ? '.fold().coalesce(unfold(), addV())' : '.valueMap()'}`;
  return '';
}

// Plan one step: the best table on a reachable database. {ok, store, table, how, why, query}
function plan(step, ctx) {
  const { g, reach, match, problem, test } = ctx, rows = problem.data?.entities?.[step.entity]?.rows ?? 1000;
  if (step.op === 'tx') {
    const parts = step.steps.map((s) => plan(s, ctx)); const bad = parts.find((p) => !p.ok); if (bad) return bad;
    const same = parts.every((p) => p.store === parts[0].store), e = engineOf(g.cat.database, g.byId.get(parts[0].store).config);
    if (!same) return { ok: false, why: `these writes land in different databases, so they can't happen in one transaction` };
    if (!(e?.features || ['transactions']).includes('transactions')) return { ok: false, why: `${e.label} can't do a transaction across these writes` };
    return { ...parts[0], query: parts.map((p) => p.query).join('\n'), how: 'one transaction' };
  }
  const want = needs(step), write = ['put', 'update'].includes(step.op) || (step.op === 'blob' && step.mode === 'put');
  let best = null, partial = null;
  for (const s of reach) {
    const node = g.byId.get(s.id), e = engineOf(g.cat.database, node.config);
    for (const t of node.config?.schema?.tables || []) {
      const have = want.filter((l) => userField(match, t, l)), miss = want.filter((l) => !userField(match, t, l));
      const keyed = Object.keys(lookup(step)).every((l) => userField(match, t, l));
      if (!have.length) continue;
      if (miss.length) { if (keyed && (!partial || miss.length < partial.miss.length)) partial = { s, t, e, miss }; continue; }
      if (step.op === 'blob' && (e?.id !== 's3' || t.fields.find((f) => match(step.field, f.name))?.type !== 'blob')) { partial = partial || { s, t, e, miss: [], blob: true }; continue; }
      if (s.async && !write) { partial = partial || { s, t, e, miss: [], async: true }; continue; }
      const a = access(step, t, e, match, rows);
      const cand = { ...a, store: s.id, path: s.path, async: s.async, table: t.name, t, e, query: dialect(step, t, e, match) };
      if (!best || (cand.ok && !best.ok) || (cand.ok === best.ok && (cand.async < best.async || (cand.async === best.async && (cand.cost ?? 9) < (best.cost ?? 9))))) best = cand;
    }
  }
  if (best && best.ok && best.async && !test.async) return { ...best, ok: false, why: `${g.byId.get(best.store) ? displayName(g.cat.database, g.byId.get(best.store)) : 'the database'} is only reachable through a queue, but this call must answer with the result now` };
  // a change only if the row is still as expected (stock left, seat free): one atomic step, or two callers both win
  if (best && best.ok && step.op === 'update' && step.cond && !['postgres', 'mysql', 'mongodb', 'dynamodb', 'cassandra', 'graph'].includes(best.e?.id)) return { ...best, ok: false, why: `${best.e.label} can't change a row only if it is still as expected in one step, so two callers could both get the same item` };
  if (best && best.ok && step.op === 'update' && best.e?.id === 's3') return { ...best, ok: false, why: `S3 can't change part of an object: a counter or status needs a database` };
  if (best) return best;
  if (partial?.blob) return { ok: false, store: partial.s.id, path: partial.s.path, table: partial.t.name, why: partial.e?.id === 's3' ? `${partial.t.name} has no file field for the bytes` : `file bytes would go into ${partial.e?.label || 'a database'} rows: keep files in object storage (S3) and their key in the database` };
  if (partial?.async) return { ok: false, store: partial.s.id, path: partial.s.path, table: partial.t.name, why: `${partial.t.name} is only reachable through a queue: a read can't wait for workers` };
  if (partial) return { ok: false, store: partial.s.id, path: partial.s.path, table: partial.t.name, partialMiss: partial.miss, why: `${partial.t.name} has no ${partial.miss.join(', ')}` };
  const named = want.join(', ');
  if (!reach.length) return { ok: false, why: 'the server reaches no database' };
  if (!reach.some((s) => g.byId.get(s.id).config?.schema?.tables?.length)) return { ok: false, why: `no database has a schema yet: open a database's settings and add the ${step.entity} it needs (${named})` };
  return { ok: false, why: `no table on a reachable database holds ${named}` };
}

// ---- one request test ---------------------------------------------------------------------------------
export function runRequest(design, lab, problem, test) {
  const g = graph(design, lab), nm = (id) => displayName(g.cat[g.byId.get(id)?.type], g.byId.get(id)), match = fieldMatcher(problem.data);
  const want = expected(problem, test), trace = [], hop = (at, from, title, json, extra = {}) => trace.push({ n: trace.length, at, from, title, json, ...extra });
  const fail = (status, why) => { const output = { status, body: { error: why } }; if (trace.length && entry.client) { const back = entry.server ? entry.path : [entry.client]; if (trace.at(-1).at !== entry.server && entry.server) hop(entry.server, trace.at(-1).at, `${nm(entry.server)} gets an error`, null); for (let i = back.length - 2; i >= 0; i--) hop(back[i], back[i + 1], i === 0 ? `${status} back to the ${nm(entry.client)}` : `${nm(back[i])} passes the error back`, i === 0 ? output.body : null); } return { id: test.id, ok: false, why: [`${why[0].toUpperCase()}${why.slice(1)}.`], checks: [{ kind: 'response', label: test.respondLabel || 'Returns the expected response', ok: false }], output, expect: want, trace }; };
  const entry = wayIn(g);
  if (!entry.client) return { id: test.id, ok: false, error: 'Add the Clients: requests start there.', checks: [], expect: want, trace };
  const req = { method: test.request.method, path: test.request.path, ...(test.request.body ? { body: test.request.body } : {}) };
  hop(entry.client, null, `${nm(entry.client)} send the request`, req);
  for (let i = 1; i < entry.path.length; i++) { const id = entry.path[i], t = g.byId.get(id).type; hop(id, entry.path[i - 1], t === 'server' ? `${nm(id)} runs the call` : t === 'cdn' ? `${nm(id)}: not cached at the edge, passes it on` : `${nm(id)} passes it on${g.out.get(entry.path[i - 1]).filter((x) => g.byId.get(x).type === t).length > 1 ? ' (one of several)' : ''}`, t === 'server' ? { steps: test.steps.map((s) => `${s.op} ${s.entity || ''}`.trim()) } : req); }
  if (!entry.server) return fail(502, 'the request never reaches a server to run the logic');
  const ctx = { g, reach: stores(g, entry.server), match, problem, test }, db = seed(problem.data), out = {};
  for (const step of test.steps) {
    const p = plan(step, ctx);
    if (p.path) { let prev = entry.server; for (const id of p.path.slice(1)) { const t = g.byId.get(id).type; const last = id === p.store; hop(id, prev, last ? `${nm(id)}: ${p.ok ? p.how : 'can’t do it'}` : t === 'cache' ? (['get', 'query'].includes(step.op) ? `${nm(id)}: miss, asks the database` : `${nm(id)}: updated`) : t === 'queue' ? `${nm(id)}: holds the message` : `${nm(id)} takes it`, last ? (p.query || null) : t === 'queue' ? { op: step.op, entity: step.entity } : null, last ? { query: !!p.query, table: p.table } : {}); prev = id; } }
    if (!p.ok) {
      // a table missing some fields: the call still answers, with those fields empty
      if (p.partialMiss && ['get', 'query'].includes(step.op)) { const r = execute({ ...step, fields: (step.fields || []).filter((f) => !p.partialMiss.includes(f)) }, db); out[step.id] = Array.isArray(r) ? r.map((x) => ({ ...Object.fromEntries((step.fields || []).map((f) => [f, null])), ...x })) : r && { ...Object.fromEntries((step.fields || []).map((f) => [f, null])), ...r }; hop(p.store, p.path.at(-2), `${nm(p.store)}: ${p.table} has no ${p.partialMiss.join(', ')}`, out[step.id]); continue; }
      return fail(p.why.includes('would read all') || p.why.includes('sorted in memory') || p.why.includes('measure all') ? 504 : 500, p.why);
    }
    out[step.id] = execute(step, db);
    if (out[step.id]?.ok === false) return fail(409, 'the conditional update didn’t apply');
    // the way back: through the caches to the server (a write behind a queue is answered once queued)
    if (p.async) hop(entry.server, p.path[1], `${nm(p.path[1])} has the message: ${nm(entry.server)} answers without waiting`, null);
    else for (let k = p.path.length - 2; k >= 0; k--) { const id = p.path[k], t = g.byId.get(id).type; hop(id, p.path[k + 1], k === 0 ? `${nm(id)} gets the result` : t === 'cache' && ['get', 'query'].includes(step.op) ? `${nm(id)} keeps a copy for next time` : `${nm(id)} passes it back`, k === 0 ? out[step.id] : null); }
  }
  const output = { status: test.respond.status, body: fill(test.respond.body, out) };
  if (test.async && ctx.reach.length && test.steps.every((s) => { const p = plan(s, ctx); return p.ok && p.async; })) output.status = test.asyncStatus || 202;
  for (let i = entry.path.length - 2; i >= 0; i--) hop(entry.path[i], entry.path[i + 1], i === 0 ? `${output.status} back to the ${nm(entry.client)}` : `${nm(entry.path[i])} passes the response back`, i === 0 ? output.body : null);
  const same = JSON.stringify(output.body) === JSON.stringify(want.body) && (output.status === want.status || (test.async && output.status === (test.asyncStatus || 202)));
  const missing = same ? [] : Object.keys(want.body || {}).filter((k) => JSON.stringify(output.body?.[k]) !== JSON.stringify(want.body[k]));
  return { id: test.id, ok: same, why: same ? [] : [`The response differs from the expected one${missing.length ? ` (${missing.join(', ')})` : ''}: a table on the path is missing fields the response needs.`], checks: [{ kind: 'response', label: test.respondLabel || 'Returns the expected response', ok: same }], output, expect: want, trace };
}
