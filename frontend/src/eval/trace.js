// Stage 2: trace (one call, on sample data), evaluator.md §9.
//
//   expected(practice, op)                → { status, body }: the steps run on the sample rows, no design involved
//   runTrace(compiled, practice, test, lab) → the result of a trace test, in the shape of v1's runRequest
//
// Running steps on sample data was ported from v1's judge/requests.js (removed in phase 7).
import { evalCatalogue } from './design.js';

// ---- running steps on the sample data ------------------------------------------------------------------
const km = (a, b) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
const eq = (row, where) => Object.entries(where || {}).every(([k, v]) => row[k] === v);
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/).filter(Boolean);
const cmp = (f, desc) => (a, b) => (a[f] < b[f] ? -1 : a[f] > b[f] ? 1 : 0) * (desc ? -1 : 1);
export function execute(step, db) {
  const rows = db[step.entity] || (db[step.entity] = []);
  const pick = (r) => Object.fromEntries((step.fields || Object.keys(r)).map((f) => [f, r[f] ?? null]));
  if (step.op === 'get') { const r = rows.find((x) => eq(x, step.by)); return r ? pick(r) : null; }
  if (step.op === 'query' || step.op === 'sum') {
    let rs = rows.filter((x) => eq(x, step.where));
    if (step.range) rs = rs.filter((x) => x[step.range.field] >= step.range.from && x[step.range.field] <= step.range.to);
    if (step.text) { const want = words(step.text.q); rs = rs.filter((x) => { const have = words(x[step.text.field]); return want.every((w) => have.some((h) => h.startsWith(w))); }); }
    if (step.op === 'sum') return rs.reduce((a, x) => a + (+x[step.field] || 0), 0);
    if (step.near) rs = rs.map((x) => ({ ...x, distance_km: +km(step.near.at, x[step.near.field]).toFixed(2) })).filter((x) => x.distance_km <= step.near.km).sort((a, b) => a.distance_km - b.distance_km);
    if (step.order) rs = [...rs].sort(cmp(step.order.field, step.order.desc));
    if (step.limit) rs = rs.slice(0, step.limit);
    return rs.map((r) => ({ ...pick(r), ...(step.near ? { distance_km: r.distance_km } : {}) }));
  }
  if (step.op === 'rank') {
    const rs = [...rows].sort(cmp(step.order.field, step.order.desc));
    if (step.of) { const i = rs.findIndex((x) => eq(x, step.of)); return i < 0 ? null : { rank: i + 1, ...pick(rs[i]) }; }
    return rs.slice(0, step.limit || rs.length).map(pick);
  }
  if (step.op === 'put') {
    if (Array.isArray(step.unique) && step.unique.length && rows.some((x) => step.unique.every((f) => x[f] === step.values[f]))) return { ok: false };
    rows.push({ ...step.values }); return { ...step.values };
  }
  if (step.op === 'update') {
    const r = rows.find((x) => eq(x, step.by)); if (!r) return null;
    for (const [k, c] of Object.entries(step.cond || {})) if ((c.gte !== undefined && !(r[k] >= c.gte)) || (c.eq !== undefined && r[k] !== c.eq)) return { ok: false };
    Object.assign(r, step.set || {}); for (const [k, v] of Object.entries(step.add || {})) r[k] = (+r[k] || 0) + v;
    return { ok: true, ...r };
  }
  if (step.op === 'incr') {
    let r = rows.find((x) => eq(x, step.by));
    if (!r) { r = { ...step.by, [step.field]: 0 }; rows.push(r); }
    r[step.field] = (+r[step.field] || 0) + 1;
    return { ok: true, [step.field]: r[step.field] };
  }
  if (step.op === 'tx') { const out = step.steps.map((s) => execute(s, db)); return out.every((o) => o && o.ok !== false) ? { ok: true } : { ok: false }; }
  if (step.op === 'blob') { if (step.mode === 'put') { rows.push({ ...step.key, [step.field]: '<bytes>' }); return { ok: true }; } const r = rows.find((x) => eq(x, step.key)); return r ? { ok: true } : null; }
  if (step.op === 'compute') return { ok: true };
  return null;
}
export const fill = (tpl, out) => {
  const val = (ref) => { const [s, ...path] = ref.split('.'); let v = out[s]; for (const p of path) v = p === 'length' ? v?.length : v?.[p]; return v ?? null; };
  if (typeof tpl === 'string') { if (/^\$[a-z0-9_]+(\.[a-z0-9_]+)*$/i.test(tpl)) return val(tpl.slice(1)); return tpl.replace(/\{\$([a-z0-9_.]+)\}/gi, (_, r) => String(val(r) ?? '')); }
  if (Array.isArray(tpl)) return tpl.map((x) => fill(x, out));
  if (tpl && typeof tpl === 'object') return Object.fromEntries(Object.entries(tpl).map(([k, v]) => [k, fill(v, out)]));
  return tpl;
};
const seed = (practice) => Object.fromEntries(Object.entries(practice?.entities || {}).map(([k, e]) => [k, structuredClone(e.sample || [])]));

// The expected response: the steps run on the sample data, no design involved.
export function expected(practice, op) {
  const db = seed(practice), out = {};
  for (const s of op.steps || []) out[s.id] = execute(s, db);
  return { status: op.respond?.status ?? 200, body: fill(op.respond?.body ?? {}, out) };
}

// What a store does for a step, in words (the access path's `how`, §7.4).
const HOW = {
  key: (t, s) => (s?.op === 'query' ? `reads the matching ${t} by their key` : `finds the ${t} row by its key`),
  index: (t) => `finds ${t} through an index`,
  scan: (t) => `reads the whole ${t} table`,
  'key-range': (t) => `reads ${t} in key order`,
  'index-range': (t) => `reads ${t} in index order`,
  geo: (t) => `finds ${t} near the point (geo index)`,
  text: (t) => `finds ${t} by their words (text index)`,
  agg: (t) => `adds up ${t} in one query`,
  zset: (t) => `reads the sorted set ${t}`,
  write: (t, s) => (s?.op === 'put' ? `writes the new row into ${t}` : `changes the row in ${t}`),
  blob: (t, s) => (s?.mode === 'put' ? `stores the file in ${t}` : `returns the file from ${t}`),
  transaction: (t) => `writes ${t} in one transaction`,
};

// ---- the trace for "▶ Watch" (§9.2) ------------------------------------------------------------------------
// Entries in v1's shape ({n, at, from, title, json}) plus {kind, back?, after?, query?, table?}.
function flatten(compiled, plan, op, lab, request, output) {
  const g = compiled.graph, cat = evalCatalogue(lab), out = [], later = [];
  const name = (id) => { const n = g.byId.get(id); return n?.name || cat[n?.type]?.name || id; };
  const push = (e) => out.push({ n: out.length, ...e });
  const stepOf = (id) => (op.steps || []).find((s) => s.id === id);
  const go = (hop, parent, after) => {
    const nm = name(hop.node), info = hop.step ? plan.steps[hop.step] : null, step = hop.step ? stepOf(hop.step) : null;
    const title = {
      source: `${nm} send the request`,
      pass: g.byId.get(hop.node)?.type === 'cdn' ? `${nm}: not cached at the edge, passes it on` : `${nm} passes it on`,
      handle: `${nm} runs the call`,
      cache: `${nm}: looks for the ${step?.entity || 'item'}, asks the database on a miss`,
      store: `${nm}: ${hop.copy ? `keeps a copy in ${hop.table}` : HOW[info?.how]?.(info?.table || 'it', step) || 'does it'}`,
      invalidate: `${nm}: drops the old copy`,
      enqueue: `${nm}: holds the message`,
      consume: `${nm} takes the message`,
    }[hop.kind] || nm;
    push({ at: hop.node, from: parent?.node ?? null, kind: hop.kind, title, json: hop.kind === 'source' ? request : hop.kind === 'store' && !hop.copy ? info?.query || null : null, ...(hop.kind === 'store' ? { query: !!info?.query, table: info?.table } : {}), ...(after ? { after: true } : {}) });
    // a split group shows its first member only
    const shown = new Set();
    for (const c of hop.children) {
      const grp = c.share?.kind === 'split' ? c.share.group : null;
      if (grp) { if (shown.has(grp)) continue; shown.add(grp); }
      if (!c.sync) { later.push([c, hop]); continue; }
      go(c, hop, after);
    }
    if (parent) push({ at: parent.node, from: hop.node, kind: hop.kind, back: true, title: parent.kind === 'source' ? `${output.status} back to the ${name(parent.node)}` : `${name(parent.node)} gets it back`, json: parent.kind === 'source' ? output.body : null, ...(after ? { after: true } : {}) });
  };
  go(plan.root, null, false);
  while (later.length) { const [c, p] = later.shift(); go(c, p, true); }
  return out;
}

// ---- one trace test (§9.1) ----------------------------------------------------------------------------------
const STATUS = { E_NO_HANDLER: 502, E_NO_SOURCE: 502, E_READ_BEHIND_QUEUE: 504, E_SYNC_BEHIND_QUEUE: 504 };
export function runTrace(compiled, practice, test, lab) {
  const op = (practice?.operations || []).find((o) => o.id === test.op);
  const label = 'Returns the expected response';
  if (!op) return { id: test.id, ok: false, error: `Test ${test.id} names no operation of this problem.`, why: [], checks: [], trace: [] };
  const request = { method: op.request?.method || 'GET', path: op.request?.path || '/', ...(op.request?.body ? { body: op.request.body } : {}) };
  const want = expected(practice, op);
  const failed = (e) => {
    const status = STATUS[e.code] || (/would read all|sorted in memory|too slow/.test(e.message) ? 504 : 500);
    return { id: test.id, ok: false, why: [e.message], code: e.code, checks: [{ kind: 'response', label, ok: false }], request, output: { status, body: { error: e.message } }, expect: want, trace: [] };
  };
  if (!compiled.ok) return failed(compiled.errors[0]);
  const plan = compiled.plans[op.id];
  if (!plan?.ok) return failed(plan?.error || { code: 'E_NO_HANDLER', message: 'This operation could not be planned.' });

  // Got: each step against the table it is bound to; fields that table lacks come back empty (as v1)
  const db = seed(practice), out = {}, lacking = [];
  for (const step of op.steps || []) {
    const missing = plan.steps[step.id]?.missing || [];
    let r;
    if (missing.length && (step.op === 'get' || step.op === 'query')) {
      r = execute({ ...step, fields: (step.fields || []).filter((f) => !missing.includes(f)) }, db);
      const blank = Object.fromEntries((step.fields || []).map((f) => [f, null]));
      r = Array.isArray(r) ? r.map((x) => ({ ...blank, ...x })) : r && { ...blank, ...r };
      lacking.push(`${plan.steps[step.id].table} has no ${missing.join(', ')}`);
    } else r = execute(step, db);
    out[step.id] = r;
    if (r && r.ok === false) {
      const msg = step.op === 'put' ? 'The write was refused: an item with the same key already exists.' : 'The conditional update didn’t apply.';
      return { id: test.id, ok: false, why: [msg], checks: [{ kind: 'response', label, ok: false }], request, output: { status: 409, body: { error: msg } }, expect: want, trace: [] };
    }
  }
  const output = { status: op.respond?.status ?? 200, body: fill(op.respond?.body ?? {}, out) };
  const same = output.status === want.status && JSON.stringify(output.body) === JSON.stringify(want.body);
  const diff = same ? [] : Object.keys(want.body || {}).filter((k) => JSON.stringify(output.body?.[k]) !== JSON.stringify(want.body[k]));
  const why = same ? [] : [`The response differs from the expected one${diff.length ? ` (${diff.join(', ')})` : ''}${lacking.length ? `: ${lacking.join('; ')}` : ''}.`];
  return { id: test.id, ok: same, why, checks: [{ kind: 'response', label, ok: same }], request, output, expect: want, trace: flatten(compiled, plan, op, lab, request, output) };
}
