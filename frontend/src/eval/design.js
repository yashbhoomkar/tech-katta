// The v2 evaluator's view of a design (tech-katta-context/evaluator.md §5, §7.1).
//
// The component catalogue is lab.json's `components` (sizes, prices, latencies, engines, crash policy) merged
// with eval.json's `components` (settings, allowed arrows, extra numbers). A type exists for v2 only when both
// files have it. eval.json reaches the code as `lab.eval` (the API serves it inside /v1/lab).
//
// cleanDesign2() never throws: it keeps what is valid and drops the rest. It keeps only the settings a node
// gives (validated), never fills in defaults: a well-formed design comes out unchanged, so content can be
// checked with "cleaning changes nothing". configOf() reads a node's settings with the defaults applied.
import { cleanSchema } from '../lab/schema.js';
import { engineOf, sizesOf } from '../lab/engine.js';

const obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const ID = /^[^\u0000-\u001f]{1,64}$/;
const OPID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const NAME_MAX = 40;
export const STRUCTURE_KINDS = ['kv', 'counter', 'zset', 'geo', 'set'];

// type → { ...lab.json component, ...eval.json component } (eval's keys win), for the types both files have.
// Cached per catalogue object: the evaluator calls this many times with the same lab.
const catCache = new WeakMap();
export function evalCatalogue(lab) {
  if (!lab || !lab.eval) return Object.create(null);
  if (catCache.has(lab)) return catCache.get(lab);
  const v1 = Object.create(null);
  for (const c of lab.components || []) if (c && typeof c.type === 'string') v1[c.type] = c;
  const out = Object.create(null);
  // types lab.json also has are merged with it; v2-only types (phase 4: external, stream, pubsub, realtime) carry
  // their own name, description and numbers in eval.json. v1's Lab never sees them (it reads lab.components).
  for (const e of lab.eval.components || []) if (e && typeof e.type === 'string' && (own(v1, e.type) || e.v2only)) out[e.type] = { ...(own(v1, e.type) ? v1[e.type] : {}), ...e };
  catCache.set(lab, out);
  return out;
}

// The settings list of a type ([] for an unknown type).
export const settingsOf = (type, lab) => evalCatalogue(lab)[type]?.settings || [];

// Sizes a node can have: a database's engine may bring its own (lab/engine.js sizesOf); none for per-request engines.
function sizeList(comp, config) {
  if (!comp) return [[], undefined];
  if (comp.type === 'database') { const e = engineOf(comp, config); if (e?.capacity === 'request') return [[], undefined]; }
  const [list, def] = sizesOf(comp, config);
  return [Array.isArray(list) ? list : [], def];
}

// One setting's value, or undefined when the given value is not valid for it.
function validValue(s, v, comp, config) {
  if (s.kind === 'number') {
    if (!fin(v)) return undefined;
    let x = Math.min(s.max, Math.max(s.min, v));
    if (s.step === 1) x = Math.round(x);
    return x;
  }
  if (s.kind === 'bool') return typeof v === 'boolean' ? v : undefined;
  if (s.kind === 'choice') return (s.options || []).some((o) => o.id === v) ? v : undefined;
  if (s.kind === 'engine') return (comp?.engines || []).some((e) => e.id === v) ? v : undefined;
  if (s.kind === 'size') return sizeList(comp, config)[0].some((z) => z.id === v) ? v : undefined;
  if (s.kind === 'fields') return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(x)).slice(0, 4) : undefined;
  if (s.kind === 'schema') return cleanSchema(v);
  if (s.kind === 'structures') return cleanStructures(v);
  return undefined;
}

// Cache structures: like schema tables, each with a kind (kv, counter, zset, geo, set).
export function cleanStructures(v) {
  if (!Array.isArray(v)) return undefined;
  const kinds = new Map();
  for (const s of v) if (obj(s) && typeof s.name === 'string' && STRUCTURE_KINDS.includes(s.kind)) kinds.set(s.name.toLowerCase(), s.kind);
  const cleaned = cleanSchema({ tables: v.filter((s) => obj(s) && kinds.has(String(s.name).toLowerCase())) });
  if (!cleaned) return undefined;
  return cleaned.tables.map((t) => ({ ...t, kind: kinds.get(t.name.toLowerCase()) }));
}

// A node's settings with every default filled in (what the evaluator uses).
export function configOf(node, lab) {
  const comp = evalCatalogue(lab)[node?.type];
  if (!comp) return {};
  const src = obj(node.config) ? node.config : {}, out = {};
  // the engine first: a database's sizes depend on it
  for (const s of comp.settings) if (s.kind === 'engine') {
    const v = validValue(s, src[s.key], comp, out);
    out[s.key] = v ?? (comp.defaultEngine || comp.engines?.[0]?.id);
  }
  for (const s of comp.settings) {
    if (s.kind === 'engine') continue;
    const v = own(src, s.key) ? validValue(s, src[s.key], comp, out) : undefined;
    if (v !== undefined) out[s.key] = v;
    else if (s.kind === 'size') { const d = sizeList(comp, out)[1]; if (d !== undefined) out[s.key] = d; }
    else if (own(s, 'default')) out[s.key] = s.default;
  }
  // an autoscaled group's ceiling is never below its floor
  if (own(out, 'count') && own(out, 'maxCount')) out.maxCount = Math.max(out.count, out.maxCount);
  return out;
}

// Can an arrow go from this node to that one? Rules from eval.json `to` (types), `toIf` (conditions on the
// target's settings) and `toCdc` (a database's arrows carry its changes: its engine must have the cdc capability).
export function allowedEdge(from, to, lab) {
  const cat = evalCatalogue(lab), a = cat[from?.type], b = cat[to?.type];
  if (!a || !b || from.id === to.id) return false;
  if (!(a.to || []).includes(b.type)) return false;
  const cond = a.toIf?.[b.type];
  if (cond) { const cfg = configOf(to, lab); for (const [k, allowed] of Object.entries(cond)) if (!allowed.includes(cfg[k])) return false; }
  if (a.toCdc && !capsOf(from, lab).includes('cdc')) return false;
  return true;
}

// What a node can do for a step (evaluator.md §5.3). Databases: their engine's caps. Caches: from their structures.
export function capsOf(node, lab) {
  const comp = evalCatalogue(lab)[node?.type];
  if (!comp) return [];
  const cfg = configOf(node, lab);
  if (node.type === 'database') return lab.eval.engines?.[cfg.engine]?.caps || [];
  if (node.type === 'cache') {
    const caps = new Set(['get', 'cas', 'ttl', 'counter']);
    for (const s of cfg.structures || []) { if (s.kind === 'zset') caps.add('zset'); if (s.kind === 'geo') caps.add('geo'); }
    if (cfg.persistence === 'aof') caps.add('durable');
    return [...caps];
  }
  if (node.type === 'queue') return ['durable'];
  return [];
}

// A clean copy of a design for the v2 evaluator (evaluator.md §7.1). `opIds`: the problem's operation ids,
// for arrows that carry only some operations. Order of nodes and edges is kept.
export function cleanDesign2(design, lab, opIds = []) {
  const cat = evalCatalogue(lab), max = lab?.eval?.limits?.nodes || 200;
  const nodes = [], seen = new Set();
  for (const n of obj(design) && Array.isArray(design.nodes) ? design.nodes : []) {
    if (nodes.length >= max) break;
    if (!obj(n) || typeof n.id !== 'string' || !ID.test(n.id) || seen.has(n.id) || !own(cat, n.type)) continue;
    const comp = cat[n.type], src = obj(n.config) ? n.config : {}, config = {};
    // the engine is checked first: which sizes are valid depends on it
    for (const s of comp.settings) if (s.kind === 'engine' && own(src, s.key)) { const v = validValue(s, src[s.key], comp, config); if (v !== undefined) config[s.key] = v; }
    for (const s of comp.settings) if (s.kind !== 'engine' && own(src, s.key)) { const v = validValue(s, src[s.key], comp, config); if (v !== undefined) config[s.key] = v; }
    seen.add(n.id);
    const name = typeof n.name === 'string' ? n.name.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '';
    nodes.push({ id: n.id, type: n.type, x: fin(n.x) && Math.abs(n.x) < 1e6 ? n.x : 0, y: fin(n.y) && Math.abs(n.y) < 1e6 ? n.y : 0, ...(name ? { name } : {}), config });
  }
  const byId = new Map(nodes.map((n) => [n.id, n])), edges = [], keys = new Set();
  const opSet = new Set(opIds);
  for (const e of obj(design) && Array.isArray(design.edges) ? design.edges : []) {
    if (!obj(e) || !byId.has(e.from) || !byId.has(e.to)) continue;
    const k = JSON.stringify([e.from, e.to]);
    if (keys.has(k) || !allowedEdge(byId.get(e.from), byId.get(e.to), lab)) continue;
    keys.add(k);
    const edge = { from: e.from, to: e.to };
    if (Array.isArray(e.carries)) {
      const c = e.carries.filter((x, i, a) => typeof x === 'string' && a.indexOf(x) === i && (x === 'reads' || x === 'writes' || (OPID.test(x) && opSet.has(x))));
      if (c.length && c.length === e.carries.length) edge.carries = c;
    }
    edges.push(edge);
  }
  return { nodes, edges };
}
