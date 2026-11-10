// Mutants of a reference design (evaluator.md §14.3): one small change each. A strong test suite fails every
// mutant except the few a problem lists in `practice.mutantsAllowed`. Pure; used by tools/eval/calibrate.mjs and
// eval/calibration.test.js.
import { evalCatalogue, configOf, allowedEdge } from './design.js';
import { sizesOf } from '../lab/engine.js';

const clone = (d) => JSON.parse(JSON.stringify(d));
const withNode = (d, id, f) => { const c = clone(d); const n = c.nodes.find((x) => x.id === id); n.config = { ...(n.config || {}) }; f(n, c); return c; };

// → [{ id, design }] in a stable order.
export function mutants(design, lab) {
  const cat = evalCatalogue(lab), out = [];
  const db = (lab.components || []).find((c) => c.type === 'database');
  for (const n of design.nodes) {
    const comp = cat[n.type]; if (!comp) continue;
    const cfg = configOf(n, lab);
    // remove: arrows into it are joined to what it pointed at, where allowed
    {
      const c = clone(design); c.nodes = c.nodes.filter((x) => x.id !== n.id);
      const ins = design.edges.filter((e) => e.to === n.id).map((e) => e.from), outs = design.edges.filter((e) => e.from === n.id).map((e) => e.to);
      c.edges = c.edges.filter((e) => e.from !== n.id && e.to !== n.id);
      const byId = new Map(c.nodes.map((x) => [x.id, x]));
      for (const a of ins) for (const b of outs) if (a !== b && !c.edges.some((e) => e.from === a && e.to === b) && allowedEdge(byId.get(a), byId.get(b), lab)) c.edges.push({ from: a, to: b });
      out.push({ id: `remove:${n.id}`, design: c });
    }
    for (const k of ['count', 'nodes', 'shards', 'replicas']) {
      if (!(cfg[k] > 1) || (k === 'replicas' && n.type !== 'database')) continue;
      out.push({ id: `half:${n.id}${k === 'count' ? '' : `:${k}`}`, design: withNode(design, n.id, (x) => { x.config[k] = Math.max(1, Math.floor(cfg[k] / 2)); if (k === 'count' && x.config.maxCount) x.config.maxCount = Math.max(x.config[k], x.config.maxCount); }) });
    }
    if (comp.sizes || n.type === 'database') {
      const [list] = sizesOf(comp, cfg);
      const i = (list || []).findIndex((s) => s.id === cfg.size);
      if (i > 0) out.push({ id: `smaller:${n.id}`, design: withNode(design, n.id, (x) => { x.config.size = list[i - 1].id; }) });
    }
    if ((cfg.zones || 1) > 1 || cfg.multiAz || cfg.replica) out.push({ id: `onezone:${n.id}`, design: withNode(design, n.id, (x) => { if (cfg.zones > 1) x.config.zones = 1; if (cfg.multiAz) x.config.multiAz = false; if (cfg.replica) x.config.replica = false; }) });
    for (const t of n.type === 'database' ? cfg.schema?.tables || [] : n.type === 'cache' ? cfg.structures || [] : []) {
      (t.indexes || []).forEach((_, i) => out.push({ id: `noindex:${n.id}:${t.name}:${i}`, design: withNode(design, n.id, (x) => { const key = n.type === 'database' ? 'schema' : 'structures'; const tabs = clone(n.type === 'database' ? x.config.schema.tables : x.config.structures); const tt = tabs.find((y) => y.name === t.name); tt.indexes = tt.indexes.filter((__, j) => j !== i); if (key === 'schema') x.config.schema = { tables: tabs }; else x.config.structures = tabs; }) }));
      if (t.sortKey) out.push({ id: `noindex:${n.id}:${t.name}:sort`, design: withNode(design, n.id, (x) => { const tabs = clone(x.config.schema.tables); delete tabs.find((y) => y.name === t.name).sortKey; x.config.schema = { tables: tabs }; }) });
    }
    if (n.type === 'database') {
      const family = (db?.engines || []).find((e) => e.id === cfg.engine)?.family, seen = new Set([family]);
      for (const e of db?.engines || []) {
        if (seen.has(e.family)) continue;
        seen.add(e.family);
        out.push({ id: `engine:${n.id}:${e.id}`, design: withNode(design, n.id, (x) => { x.config.engine = e.id; delete x.config.size; }) });
      }
    }
    if (n.type === 'cache') out.push({ id: `ttl:${n.id}`, design: withNode(design, n.id, (x) => { x.config.ttlSec = Math.min(604800, (cfg.ttlSec || 300) * 100); }) });
    if (n.type === 'queue' && cfg.kind === 'fifo') out.push({ id: `standard:${n.id}`, design: withNode(design, n.id, (x) => { x.config.kind = 'standard'; }) });
    if (n.type === 'queue' && cfg.dlq) out.push({ id: `nodlq:${n.id}`, design: withNode(design, n.id, (x) => { x.config.dlq = false; }) });
  }
  for (const e of design.edges) {
    const c = clone(design); c.edges = c.edges.filter((x) => !(x.from === e.from && x.to === e.to));
    out.push({ id: `cut:${e.from}-${e.to}`, design: c });
  }
  return out;
}

// More capacity never breaks function (§14.3): every `count` doubled (within its limit).
export function doubled(design, lab) {
  const c = clone(design), cat = evalCatalogue(lab);
  for (const n of c.nodes) {
    const s = cat[n.type]?.settings?.find((x) => x.key === 'count');
    if (s && n.config) { n.config = { ...n.config, count: Math.min(s.max, (configOf(n, lab).count || 1) * 2) }; if (n.config.maxCount) n.config.maxCount = Math.max(n.config.count, n.config.maxCount); }
  }
  return c;
}
