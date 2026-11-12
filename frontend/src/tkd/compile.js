// Statements + problem → a checked design (spec sections 3.4, 4 and 5; layer 2).
//   compile(textOrParsed, problem) → { ok:true, design, warnings } or { ok:false, errors }   (at most 20, sorted by line)
// design: { parts: {name: {kind, ...settings, line}}, tables: {"db.links": {part, name, pk, columns, indexes, line}},
//           routes: {REQUEST: {mode, line, hops:[{op, part, replica, nolb}], invalidate, update, store, scan}} }
// A hop's `nolb`: a server reached with no lb before it on this route; with count > 1 that is W002, and the judge gives
// this route's calls one instance's capacity.
import { parse } from './parse.js';
import { msg } from './messages.js';
import { KINDS } from './kinds/index.js';
import { ARGS, STORES, COMPUTE, KIND_NAMES } from './catalogue.js';

const e = (code, line, col, vars) => ({ code, line, col: col || 1, message: msg(code, vars) });
const w = (code, line, vars, name) => ({ code, line, col: 1, message: msg(code, vars), ...(name ? { part: name } : {}) });
const ruleText = (spec, settings) => {
  if (spec.type === 'enum') return spec.values.length === 2 ? `${spec.values[0]} or ${spec.values[1]}` : `${spec.values.slice(0, -1).join(', ')} or ${spec.values[spec.values.length - 1]}`;
  if (spec.type === 'bool') return 'true or false';
  const max = spec.max === 'rf' ? settings.rf : spec.max;
  return `a whole number from ${spec.min} to ${max}${spec.max === 'rf' ? ' (its rf)' : ''}`;
};
const valid = (spec, v, settings) => {
  if (spec.type === 'enum') return spec.values.includes(v);
  if (spec.type === 'bool') return v === true || v === false;
  const max = spec.max === 'rf' ? settings.rf : spec.max;
  return Number.isInteger(v) && v >= spec.min && v <= max;
};

// A part's settings: defaults, then what was written (each checked). Errors are pushed to `errors`.
function settingsOf(st, errors) {
  const kind = KINDS[st.kind];
  if (!kind) { errors.push(e('E010', st.line, st.col, { kind: st.kind })); return null; }
  const specs = ARGS[st.kind], names = Object.keys(specs), out = {};
  for (const n of names) out[n] = specs[n].default;
  let bad = false;
  for (const a of st.args) {
    if (!specs[a.name]) { errors.push(e('E011', st.line, a.col, { kind: st.kind, arg: a.name, list: names.length ? names.join(', ') : 'none' })); bad = true; continue; }
    out[a.name] = a.value;
  }
  // rf first, so w and r are checked against this part's rf
  const order = [...names].sort((x, y) => (x === 'rf' ? -1 : y === 'rf' ? 1 : 0));
  for (const n of order) {
    const a = st.args.find((x) => x.name === n);
    if (!a) continue;
    if (!valid(specs[n], out[n], out)) { errors.push(e('E012', st.line, a.col, { arg: n, rule: ruleText(specs[n], out), value: a.raw })); bad = true; }
  }
  if (st.kind === 'nosql' && Number.isInteger(out.rf) && out.rf > out.nodes) {
    const a = st.args.find((x) => x.name === 'rf');
    errors.push(e('E012', st.line, a?.col || st.col, { arg: 'rf', rule: `at most nodes (${out.nodes})`, value: out.rf })); bad = true;
  }
  // idgen's own setting "kind" (counter, snowflake…) is kept as id_kind, so `kind` always names the part's kind
  if (st.kind === 'idgen') { out.id_kind = out.kind; delete out.kind; }
  return bad ? null : { kind: st.kind, ...out, line: st.line };
}

export function compile(input, problem) {
  const parsed = typeof input === 'string' ? parse(input) : input;
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const requests = problem?.requests || [];
  const reqByName = new Map(requests.map((r) => [r.name, r]));
  const errors = [], warnings = [];
  const parts = {}, tables = {}, routes = {}, declared = new Map();
  const lastLine = parsed.statements.reduce((m, s) => Math.max(m, s.line), 1);

  for (const st of parsed.statements) if (st.type === 'part') {
    declared.set(st.name, st.kind);
    const s = settingsOf(st, errors);
    if (s) parts[st.name] = s;
  }
  const kindOf = (n) => (n === 'client' ? 'client' : declared.get(n));

  for (const st of parsed.statements) if (st.type === 'table') {
    const k = kindOf(st.part);
    if (!k) { errors.push(e('E020', st.line, st.partCol, { name: st.part })); continue; }
    if (k !== 'sql' && k !== 'nosql') { errors.push(e('E040', st.line, st.partCol, { name: st.part, kind: k })); continue; }
    const pks = st.columns.filter((c) => c.pk);
    if (pks.length !== 1) { errors.push(e('E041', st.line, st.col)); continue; }
    const cols = st.columns.map((c) => c.name);
    const badIdx = st.index.find((i) => !cols.includes(i.name));
    if (badIdx) { errors.push(e('E042', st.line, badIdx.col, { col: badIdx.name, table: `${st.part}.${st.name}` })); continue; }
    tables[`${st.part}.${st.name}`] = { part: st.part, name: st.name, pk: pks[0].name, columns: cols, indexes: st.index.map((i) => i.name), line: st.line };
  }

  const routeLine = new Map();
  for (const st of parsed.statements) if (st.type === 'route') {
    const R = reqByName.get(st.request);
    if (!R) { errors.push(e('E021', st.line, st.requestCol, { REQUEST: st.request, list: requests.map((r) => r.name).join(', ') })); continue; }
    if (routeLine.has(st.request)) { errors.push(e('E024', st.line, st.requestCol, { REQUEST: st.request, n: routeLine.get(st.request) })); continue; }
    routeLine.set(st.request, st.line);
    if (R.mode !== st.mode) { errors.push(e('E023', st.line, st.col, { REQUEST: st.request, mode: R.mode, other: st.mode })); continue; }
    const before = errors.length, hops = st.hops, seen = new Set();
    let hasLb = false;
    hops.forEach((h, i) => {
      const k = kindOf(h.part);
      if (!k) { errors.push(e('E020', st.line, h.col, { name: h.part })); return; }
      if (seen.has(h.part)) errors.push(e('E031', st.line, h.col, { name: h.part }));
      seen.add(h.part);
      const prev = i ? hops[i - 1] : null, prevKind = prev ? kindOf(prev.part) : 'client';
      if (h.op === '|' && prevKind !== 'cache' && prevKind !== 'cdn') errors.push(e('E026', st.line, h.col, { name: prev ? prev.part : 'client', kind: prevKind || 'unknown part' }));
      if (h.op === '~>' && k !== 'queue') errors.push(e('E027', st.line, h.col, { name: h.part, kind: k }));
      if (prevKind === 'queue' && k !== 'worker') errors.push(e('E028', st.line, h.col));
      if (h.replica && (k !== 'sql' || !(parts[h.part]?.replicas >= 1) || st.mode !== 'read')) errors.push(e('E033', st.line, h.col));
      if (k === 'idgen' && (st.mode !== 'write' || !COMPUTE.has(prevKind) || !hops.slice(i + 1).some((x) => STORES.has(kindOf(x.part))))) errors.push(e('E032', st.line, h.col));
      if (k === 'cdn' && !R.cdn_ok) errors.push(e('E035', st.line, h.col, { REQUEST: st.request }));
      if (k === 'lb') hasLb = true;
      h.nolb = k === 'server' && !hasLb;
    });
    const last = hops[hops.length - 1];
    if (last && kindOf(last.part) === 'queue') errors.push(e('E028', st.line, last.col));
    let invalidate = null, update = null;
    if (st.after) {
      const k = kindOf(st.after.part);
      if (!k) errors.push(e('E020', st.line, st.after.col, { name: st.after.part }));
      else if (st.mode !== 'write' || !(k === 'cache' || (k === 'cdn' && st.after.action === 'invalidate'))) errors.push(e('E034', st.line, st.after.col));
      else if (st.after.action === 'invalidate') invalidate = st.after.part; else update = st.after.part;
    }
    if (errors.length > before) continue;
    if (!last || !STORES.has(kindOf(last.part))) { errors.push(e(st.mode === 'read' ? 'E029' : 'E030', st.line, st.col, { REQUEST: st.request })); continue; }
    // the store the route ends at holds the request's table; a lookup by a column with no index is a full scan
    let scan = false;
    const storeKind = kindOf(last.part);
    if (R.table && (storeKind === 'sql' || storeKind === 'nosql')) {
      const t = tables[`${last.part}.${R.table}`];
      if (!t) { errors.push(e('E043', st.line, last.col, { REQUEST: st.request, table: R.table, part: last.part })); continue; }
      scan = !!R.key && R.key !== t.pk && !t.indexes.includes(R.key);
    }
    routes[st.request] = { mode: st.mode, line: st.line, hops: hops.map((h) => ({ op: h.op, part: h.part, replica: !!h.replica, ...(h.nolb ? { nolb: true } : {}) })), invalidate, update, store: last.part, scan };
  }
  for (const R of requests) if (!routeLine.has(R.name)) errors.push(e('E022', lastLine, 1, { REQUEST: R.name, mode: R.mode }));
  if (errors.length) return { ok: false, errors: errors.sort((a, b) => a.line - b.line || a.col - b.col).slice(0, 20) };

  // notes that never fail a design
  const used = new Set(), fg = new Map();
  for (const [name, r] of Object.entries(routes)) {
    let bg = false;
    for (const h of r.hops) {
      if (h.op === '~>') bg = true;
      used.add(h.part);
      if (!bg) { if (!fg.has(h.part)) fg.set(h.part, []); fg.get(h.part).push(name); }
    }
    if (r.invalidate) used.add(r.invalidate);
    if (r.update) used.add(r.update);
  }
  for (const [name, p] of Object.entries(parts)) {
    if (!used.has(name)) warnings.push(w('W001', p.line, { name }, name));
    const single = p.kind === 'server' && p.count > 1 && Object.values(routes).some((r) => r.hops.some((h) => h.part === name && h.nolb));
    if (single) warnings.push(w('W002', p.line, { count: p.count, name }, name));
    const spare = (p.kind === 'server' || p.kind === 'worker') ? p.count > 1 : p.kind === 'cache' ? p.nodes > 1 : p.kind === 'sql' ? p.replicas > 0 : true;
    if (!spare && fg.has(name)) warnings.push(w('W003', p.line, { name, requests: listWords(fg.get(name)) }, name));
  }
  warnings.sort((a, b) => a.line - b.line);
  return { ok: true, design: { parts, tables, routes }, warnings };
}

export const listWords = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export { KIND_NAMES };
