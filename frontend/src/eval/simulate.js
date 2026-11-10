// Stage 3: simulate (plans + one load test → what happened, minute by minute), evaluator.md §8.
//
//   simulateTest(compiled, lab, practice, test) → { ops, nodes, events, timeline, cost, lost, duplicates, ticks, … }
//
// A fluid model: each tick it computes the calls a second flowing along every hop of every plan, how loaded each
// node is, and what that does to success and latency. Deterministic: no randomness, no clock, input order only.
// Phase 2 scope: no timeouts / concurrency / breakers (§8.9), no hot keys (§8.11), no change data capture.
import { configOf, evalCatalogue } from './design.js';
import { hopTime, summarise, slowShare, mix, harmonic, harmonic2 } from './latency.js';
import { cacheHit, cdnHit, CACHE_OVERHEAD } from './hits.js';
import { engineOfNode } from './access.js';
import { trafficAt, sizeOf, monthlyCost, HOURS_PER_MONTH, SECONDS_PER_MONTH } from '../lab/engine.js';
import { faultsOf, startFault, endFaults, takeDown, downFor } from './faults.js';

const dict = () => Object.create(null);
const PASS_TYPES = new Set(['cdn', 'apigw', 'lb', 'queue']);
const LB_TYPES = new Set(['lb', 'apigw']);
const r3 = (x) => Math.round(x * 1000) / 1000;

// Base time of a store hop by access path (§8.8), as a factor of the engine's latency.
function pathFactor(hop) {
  const rows = hop.rows || 1;
  switch (hop.how) {
    case 'index': return 1.5;
    case 'key-range': case 'index-range': return 1 + rows / 200;
    case 'geo': case 'text': return 3;
    case 'scan': return 1 + rows / 5000;
    case 'agg': return 1 + rows / 10000;
    case 'blob': return 1 + ((hop.bytes ?? 1e6) / 1e6) * 10;
    default: return 1;
  }
}

// Static facts about every node of the design.
function nodeInfo(d, lab) {
  const cat = evalCatalogue(lab), info = dict();
  for (const n of d.nodes) {
    const comp = cat[n.type], cfg = configOf(n, lab);
    const engine = n.type === 'database' ? engineOfNode(n, lab) : null;
    const perRequest = engine?.capacity === 'request';
    const size = n.type === 'database' ? (perRequest ? null : sizeOf(comp, cfg)) : comp?.sizes ? sizeOf(comp, cfg) : null;
    const standby = n.type === 'database' && (engine?.multiAz === 'builtin' || (engine?.multiAz !== 'none' && !!cfg.multiAz));
    const managed = !!comp?.managed || perRequest || n.type === 'client';
    const crashable = !!comp?.crash && !managed && !(n.type === 'database' && engine?.crash === false);
    const replicas = n.type === 'database' && engine?.replicas !== false && !perRequest ? cfg.replicas || 0 : 0;
    const memGb = n.type === 'cache' ? (comp.sizeExtras?.[cfg.size]?.memoryGb ?? 0) : 0;
    info[n.id] = { id: n.id, type: n.type, comp, cfg, engine, perRequest, size, standby, managed, crashable, replicas, memGb, node: n };
  }
  return info;
}

export function simulateTest(compiled, lab, practice, test) {
  const ev = lab.eval, d = compiled.design, g = compiled.graph;
  const ops = Array.isArray(practice?.operations) ? practice.operations : [];
  const hours = test.hours || 1, D = hours <= 6 ? ev.tickMinutes : ev.longTickMinutes, T = Math.max(1, Math.round((hours * 60) / D));
  const secs = 60 * D, clientComp = (lab.components || []).find((c) => c.type === 'client');
  const rps = test.traffic?.rps || 0, pattern = { pattern: test.traffic?.pattern || 'steady' };
  const info = nodeInfo(d, lab), retries = ev.retries ?? 1;
  const order = d.nodes.map((n) => n.id), orderIx = new Map(order.map((id, i) => [id, i]));

  // ---- flatten the plans into records (pre-order), with parents, children and split groups ---------------------
  const recs = [], roots = dict(), planned = [];
  const add = (hop, op, parent) => {
    const r = { hop, op, parent, node: hop.node, i: recs.length, in: 0, out: 0, phi: 1, p: 1, S: 1, Sb: 1, L: null, units: [], async: [], siblings: null, enq: [] };
    recs.push(r);
    if (parent && parent.enq) r.enq = hop.kind === 'consume' ? [...parent.enq] : parent.enq;
    if (hop.kind === 'enqueue') r.enq = [...(parent?.enq || []), r];
    const groups = new Map();
    for (const c of hop.children) {
      const cr = add(c, op, r);
      if (!c.sync) { r.async.push(cr); continue; }
      const gk = c.share?.kind === 'split' ? c.share.group : null;
      if (gk) { if (!groups.has(gk)) { const u = { group: [] }; groups.set(gk, u); r.units.push(u); } groups.get(gk).group.push(cr); }
      else r.units.push({ one: cr });
    }
    for (const u of r.units) if (u.group) for (const cr of u.group) cr.siblings = u.group;
    return r;
  };
  for (const op of ops) {
    const plan = compiled.plans?.[op.id];
    if (!plan?.ok) continue;
    planned.push(op);
    roots[op.id] = (plan.roots || [plan.root]).map((h) => add(h, op, null));
    const rs = roots[op.id]; if (rs.length > 1) for (const r of rs) r.siblings = rs;
  }
  const hopsAt = dict();
  for (const id of order) hopsAt[id] = [];
  for (const r of recs) if (r.hop.kind !== 'source') hopsAt[r.node].push(r);
  const nodeOrder = g.topo.filter((id) => hopsAt[id]?.length);
  const enqRecs = recs.filter((r) => r.hop.kind === 'enqueue');
  const opIndex = new Map(ops.map((o, i) => [o.id, i]));

  // ---- caches: what fits, per entity (§8.6) -------------------------------------------------------------------
  const cacheFit = dict();
  for (const id of order) {
    const n = info[id]; if (n.type !== 'cache') continue;
    const reads = recs.filter((r) => r.node === id && r.hop.kind === 'cache' && !r.hop.write);
    const ents = [...new Set(reads.map((r) => r.hop.entity))];
    const per = ents.map((E) => {
      const users = ops.filter((o) => reads.some((r) => r.op === o && r.hop.entity === E));
      const ent = practice.entities?.[E] || {};
      const N = Math.max(1, ...users.map((o) => (o.keys?.entity === E && o.keys.active) || 0)) > 1 ? Math.max(...users.map((o) => (o.keys?.entity === E && o.keys.active) || 0)) : ent.rows ?? 1000;
      return { E, N, entry: (ent.rowBytes ?? 1000) * CACHE_OVERHEAD, rate: users.reduce((a, o) => a + rps * (o.share || 0), 0), zipf: users.some((o) => o.keys?.entity === E && o.keys.skew === 'zipf') };
    });
    const mem = n.memGb * 1e9 * (n.cfg.nodes || 1), want = per.reduce((a, x) => a + x.N * x.entry, 0), rate = per.reduce((a, x) => a + x.rate, 0) || 1;
    cacheFit[id] = dict();
    for (const x of per) cacheFit[id][x.E] = { ...x, C: want <= mem ? x.N : (mem * (per.length > 1 ? x.rate / rate : 1)) / x.entry };
  }

  // ---- state (§8.2) -------------------------------------------------------------------------------------------------
  const st = {
    order, info, events: [], crashes: dict(), down: dict(), keepData: dict(), over: dict(), inst: dict(), pending: dict(), low: dict(),
    lostInst: dict(), cold: dict(), slow: dict(), spikes: [], zoneUntil: -1, prevRho: dict(), lost: 0, writeRate: dict(),
  };
  for (const id of order) { st.lostInst[id] = []; st.pending[id] = []; st.writeRate[id] = 0; if (info[id].type === 'server') st.inst[id] = info[id].cfg.count || 1; }
  const backlog = dict(), waitSec = dict(), waitWorst = dict();
  for (const e of enqRecs) { backlog[e.hop.id] = 0; waitSec[e.hop.id] = 0; waitWorst[e.hop.id] = 0; }
  const hitNow = dict(); for (const id in cacheFit) hitNow[id] = dict();
  const rho = dict(), offered = dict(), served = dict(), readsAt = dict(), writesAt = dict();
  const isDown = (id) => st.down[id] !== undefined;

  const instancesNow = (id) => {
    const n = info[id]; let k = Math.max(0, st.inst[id] - st.lostInst[id].reduce((a, x) => a + x.n, 0));
    if (st.zoneUntil > -1) { const z = n.cfg.zones || 1; k = z <= 1 ? 0 : Math.floor(k * (1 - 1 / z)); }
    return k;
  };
  const capacityNow = (id) => {
    const n = info[id];
    if (n.type === 'client') return Infinity;
    if (isDown(id)) return 0;
    if (n.type === 'server') return (n.size?.rps || 0) * instancesNow(id) * (n.cfg.sandbox ? 0.8 : 1);
    if (n.type === 'cache') return (n.size?.ops || 0) * (n.cfg.nodes || 1);
    if (n.type === 'database') return n.perRequest ? n.engine.limitQps : (n.size?.qps || 0) * (n.cfg.shards || 1);
    if (n.type === 'queue') return n.cfg.kind === 'fifo' ? 3000 : n.comp.limitRps;
    return n.comp?.limitRps ?? Infinity;
  };

  // share of the parent's calls this hop gets now (§8.4 shareNow)
  const cdnMissNow = dict();
  const isUp = (id) => !isDown(id) && capacityNow(id) > 0;
  function shareNow(r) {
    const sh = r.hop.share;
    if (typeof sh === 'number') return sh;
    if (sh.kind === 'cdnMiss') return cdnMissNow[r.op.id] ?? 1;
    if (sh.kind === 'miss') {
      if (isDown(sh.cache)) return info[sh.cache].cfg.onDown === 'fail' ? 0 : 1;
      return 1 - (hitNow[sh.cache]?.[sh.entity] ?? 0);
    }
    let w = sh.weight;
    const parentType = r.parent ? info[r.parent.node].type : null;
    if (r.siblings && LB_TYPES.has(parentType)) {
      const up = r.siblings.filter((s) => isUp(s.node));
      if (up.length && up.length < r.siblings.length) w = isUp(r.node) ? sh.weight / up.reduce((a, s) => a + s.hop.share.weight, 0) : 0;
    }
    return w * (sh.cdnMiss ? cdnMissNow[r.op.id] ?? 1 : 1);
  }

  // ---- one flow pass (§8.4) -----------------------------------------------------------------------------------------
  function flowPass(rate, t) {
    for (const op of planned) {
      const c = op.cacheable && op.cacheable.ttlSec > 0;
      const K = op.keys?.active ?? practice.entities?.[op.keys?.entity]?.rows ?? 1000;
      cdnMissNow[op.id] = c ? 1 - cdnHit({ K, R: rate[op.id], tau: op.cacheable.ttlSec, zipf: op.keys?.skew === 'zipf' }) : 1;
      for (const r of roots[op.id]) { r.in = r.out = rate[op.id] * (r.siblings ? r.hop.share.weight : 1); r.phi = 1; }
    }
    for (const id of nodeOrder) {
      const n = info[id], list = hopsAt[id];
      for (const r of list) {
        if (r.hop.kind === 'consume') {
          const e = r.parent, cons = e.async.length ? e.async : [r];
          const caps = cons.map((c) => capacityNow(c.node)), sum = caps.reduce((a, x) => a + x, 0);
          const wgt = sum > 0 ? capacityNow(r.node) / sum : 1 / cons.length;
          r.in = (e.out + backlog[e.hop.id] / secs) * wgt;
        } else { r.p = shareNow(r); r.in = r.parent.out * r.p * r.hop.per; }
      }
      const cap = capacityNow(id), down = isDown(id);
      let sync = 0, pull = 0, R = 0, Wr = 0, calls = 0;
      const free = (r) => n.type === 'cache' && down && (r.hop.kind === 'cache' || r.hop.kind === 'invalidate') && n.cfg.onDown !== 'fail';
      for (const r of list) {
        calls += r.in;
        if (free(r)) continue;
        const u = r.in * r.hop.work;
        if (r.hop.kind === 'consume') pull += u; else { sync += u; if (r.hop.write) Wr += u; else R += u; }
      }
      let phiR = 1, phiW = 1, phiPull = 1, rr = 0;
      if (n.type === 'database' && !n.perRequest) {
        const q = (n.size?.qps || 0) * (n.cfg.shards || 1), k = n.replicas;
        if (down && k >= 1) { const qr = q * k; rr = qr > 0 ? R / qr : R > 0 ? Infinity : 0; phiR = rr > 1 ? 1 / rr : 1; phiW = 0; }
        else if (down) { phiR = phiW = 0; rr = sync > 0 ? Infinity : 0; }
        else {
          const prim = n.cfg.readFrom === 'replicas' && k >= 1 ? Wr : Wr + R / (1 + k);
          const rep = k >= 1 ? (n.cfg.readFrom === 'replicas' ? R / k : R / (1 + k)) + Wr : 0;
          rr = q > 0 ? Math.max(prim, rep) / q : sync > 0 ? Infinity : 0;
          phiR = phiW = rr > 1 ? 1 / rr : 1;
        }
      } else {
        rr = cap > 0 ? sync / cap : sync > 0 ? Infinity : 0;
        phiR = phiW = sync <= cap ? 1 : cap > 0 ? cap / sync : 0;
        const spare = Math.max(0, cap - Math.min(sync, cap));
        phiPull = pull <= spare ? 1 : spare > 0 ? spare / pull : 0;
      }
      for (const r of list) {
        r.phi = free(r) ? 1 : n.type === 'cache' && down ? 0 : r.hop.kind === 'consume' ? phiPull : r.hop.write ? phiW : phiR;
        r.out = r.in * r.phi;
      }
      rho[id] = rr; offered[id] = sync + pull; served[id] = calls; readsAt[id] = 0; writesAt[id] = 0;
      for (const r of list) if (r.hop.kind === 'store') { if (r.hop.write) writesAt[id] += r.in; else readsAt[id] += r.in; }
      if (n.type === 'cache') {
        let wr = 0;
        for (const r of list) if (r.hop.kind === 'cache' && r.hop.write) wr += r.in;
        st.writeRate[id] = wr;
        const fit = cacheFit[id];
        for (const E in fit) {
          let Rr = 0, Wi = 0;
          for (const r of list) if (r.hop.entity === E) { if (r.hop.kind === 'cache' && !r.hop.write) Rr += r.in; else if (r.hop.kind === 'invalidate') Wi += r.in; }
          const warm = st.cold[id] !== undefined ? Math.min(1, Math.max(0, (t - st.cold[id]) / (n.comp.warmupMinutes || 10))) : 1;
          hitNow[id][E] = down ? 0 : cacheHit({ C: fit[E].C, N: fit[E].N, zipf: fit[E].zipf, R: Rr, tau: n.cfg.ttlSec || 300, W: Wi, warm });
        }
      }
    }
  }

  // ---- success (§8.10) and latency (§8.8), bottom-up --------------------------------------------------------------
  function baseTime(r) {
    const n = info[r.node], k = r.hop.kind;
    let b = 0;
    if (k === 'source') return 0;
    if (k === 'pass' || k === 'enqueue') b = (n.comp.latencyMs || 0) + (n.type === 'apigw' && n.cfg.auth ? 2 : 0);
    else if (k === 'handle' || k === 'consume') b = (n.comp.latencyMs || 0) + (r.hop.cpuMs || 0);
    else if (k === 'cache' || k === 'invalidate') b = n.comp.latencyMs || 1;
    else if (k === 'store') {
      const lat = n.type === 'database' ? n.engine?.latencyMs ?? n.comp.latencyMs : n.comp.latencyMs;
      b = (lat || 1) * pathFactor(r.hop) + (r.hop.write && n.type === 'database' && n.replicas > 0 && n.cfg.replication === 'sync' ? 2 : 0);
    }
    return b * (st.slow[r.node]?.factor || 1);
  }
  function solve() {
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i], n = info[r.node];
      let S = 1;
      const b = baseTime(r);
      const ht = r.hop.kind === 'source' ? { fixed: 0, wait: 0, v: 0 } : hopTime(b, rho[r.node] ?? 0);
      let wait = ht.wait, v = ht.v;
      if (r.hop.kind === 'store' && n.type === 'database' && (n.cfg.shards || 1) > 1 && r.hop.shardRouted === false) { const s = n.cfg.shards; wait *= harmonic(s); v *= harmonic2(s); }
      let F = b, M = wait, V = v;
      for (const u of r.units) {
        if (u.one) {
          const c = u.one, per = c.hop.per || 1, sh = c.hop.share;
          const partial = typeof sh === 'object' && (sh.kind === 'miss' || sh.kind === 'cdnMiss');
          const p = partial ? c.p : 1, pS = partial && sh.kind === 'cdnMiss' && r.op.live ? 1 : p;
          S *= partial ? 1 - pS + pS * c.S ** per : c.S ** per;
          const Ec = c.L.F + c.L.M;
          if (p >= 1 - 1e-12) { F += per * c.L.F; M += per * c.L.M; V += per * c.L.V; }
          else { M += p * per * Ec; V += p * per * c.L.V + p * (1 - p) * (per * Ec) ** 2; }
        } else {
          const ws = u.group.map((c) => c.p / (c.hop.per || 1)), tw = ws.reduce((a, x) => a + x, 0);
          S *= tw > 0 ? u.group.reduce((a, c, j) => a + (ws[j] / tw) * c.S, 0) : 0;
          const m = mix(u.group.map((c, j) => ({ w: tw > 0 ? ws[j] : 1, F: c.L.F, M: c.L.M, V: c.L.V })));
          F += m.F; M += m.M; V += m.V;
        }
      }
      r.Sb = S; r.S = r.phi * S; r.L = { F, M, V };
    }
  }
  const opLatency = (op) => {
    const rs = roots[op.id];
    if (rs.length === 1) return rs[0].L;
    return mix(rs.map((r) => ({ w: r.hop.share.weight, ...r.L })));
  };
  const opSuccess = (op) => roots[op.id].reduce((a, r) => a + (roots[op.id].length > 1 ? r.hop.share.weight : 1) * r.S, 0);

  // ---- totals ---------------------------------------------------------------------------------------------------------
  const opT = dict(), perTick = dict();
  for (const op of ops) {
    opT[op.id] = { calls: 0, ok: 0, slow: 0, p50w: 0, p99Worst: 0, p99WorstAt: 0, deferred: dict() };
    perTick[op.id] = { calls: new Float64Array(T), ok: new Float64Array(T), slow: new Float64Array(T), p99: new Float64Array(T), F: new Float64Array(T), M: new Float64Array(T), V: new Float64Array(T) };
    for (const s of op.steps || []) if (compiled.plans?.[op.id]?.steps?.[s.id]?.sync === false) opT[op.id].deferred[s.id] = { worstDelaySec: 0, notDone: 0 };
  }
  const nodeT = dict();
  for (const id of order) nodeT[id] = { rhoMax: 0, rhoMaxAt: 0, crashes: 0, downMinutes: 0, cost: 0 };
  const timeline = { tickMinutes: D, ops: dict(), nodes: dict() };
  for (const op of ops) timeline.ops[op.id] = { rate: [], ok: [], p99: [] };
  for (const id of order) timeline.nodes[id] = { rho: [], up: [], instances: [], backlog: [] };
  const feedDelay = dict();   // "store|entity" → worst seconds behind (async copies)
  const deferredSteps = recs.filter((r) => r.hop.kind === 'store' && r.enq.length);
  let costTotal = 0, transferTotal = 0;
  const byNode = dict(); for (const id of order) byNode[id] = 0;

  // storage: constant for the test (§8.12)
  let storageMonthly = 0;
  const storageGb = dict();
  for (const id of order) {
    const n = info[id]; if (n.type !== 'database') continue;
    const held = new Map();
    for (const c of compiled.copies || []) if (c.store === id && !held.has(c.entity)) held.set(c.entity, c.table);
    let gb = 0;
    for (const [E, table] of held) {
      const ent = practice.entities?.[E]; if (!ent) continue;
      const t = (n.cfg.schema?.tables || []).find((x) => x.name === table);
      gb += ((ent.rows || 0) * (ent.rowBytes || 0) * (1 + 0.3 * (t?.indexes?.length || 0))) / 1e9;
    }
    gb *= (1 + n.replicas) * (!n.perRequest && n.cfg.multiAz && n.engine?.multiAz === 'option' ? 2 : 1);
    storageGb[id] = gb;
    storageMonthly += gb * (ev.engines?.[n.cfg.engine]?.storagePerGbMonth || 0);
  }
  const cdnEgress = (lab.eval.components || []).find((c) => c.type === 'cdn')?.egressPerGb ?? ev.egressPerGb;

  const monthlyNow = (id) => {
    const n = info[id];
    if (n.type === 'client') return 0;
    if (n.type === 'server') return (n.size?.hourly || 0) * Math.max(0, st.inst[id] - st.lostInst[id].reduce((a, x) => a + x.n, 0)) * HOURS_PER_MONTH;
    if (n.type === 'cache') return (n.size?.hourly || 0) * HOURS_PER_MONTH * (n.cfg.nodes || 1) * (n.cfg.replica ? 2 : 1);
    if (n.type === 'database') {
      if (n.perRequest) return ((readsAt[id] || 0) * n.engine.readPerMillion + (writesAt[id] || 0) * n.engine.writePerMillion) / 1e6 * SECONDS_PER_MONTH;
      return (n.size?.hourly || 0) * HOURS_PER_MONTH * ((n.cfg.multiAz && n.engine?.multiAz === 'option' ? n.comp.multiAz?.priceFactor ?? 2 : 1) + n.replicas) * (n.cfg.shards || 1);
    }
    return monthlyCost(n.comp, n.cfg, served[id] || 0);
  };

  const faults = faultsOf(test);
  let fi = 0;
  const share = (op) => op.share || 0;

  for (let i = 0; i < T; i++) {
    const t = i * D, clock = (test.startHour || 0) * 60 + t;
    // 1. faults and recoveries
    endFaults(st, t);
    for (const id of order) if (st.down[id] !== undefined && st.down[id] <= t) {
      delete st.down[id];
      st.events.push({ t, node: id, kind: 'recovered' });
      if (info[id].type === 'cache' && !st.keepData[id]) { st.cold[id] = t; st.events.push({ t, node: id, kind: 'cold' }); }
    }
    for (const id of order) {
      const p = st.pending[id]; if (!p.length) continue;
      const come = p.filter((x) => x.at <= t); if (!come.length) continue;
      st.pending[id] = p.filter((x) => x.at > t);
      st.inst[id] += come.reduce((a, x) => a + x.n, 0);
    }
    while (fi < faults.length && faults[fi].minute < t + D) { if (faults[fi].minute >= t) startFault(faults[fi], st, t); fi++; }
    // 2. rates
    const m = clientComp ? trafficAt(clientComp, pattern, clock) : 1;
    const base = dict();
    for (const op of ops) {
      let f = 1; for (const s of st.spikes) if (!s.op || s.op === op.id) f *= s.factor;
      base[op.id] = (op.source && op.source !== 'clients' ? 0 : rps * m * share(op)) * f;
    }
    // 3. the retry loop
    const factor = dict(), s = dict();
    for (const op of planned) factor[op.id] = 1;
    for (let k = 0; k < 4; k++) {
      const rate = dict(); for (const op of planned) rate[op.id] = base[op.id] * factor[op.id];
      flowPass(rate, t); solve();
      let done = true;
      for (const op of planned) {
        s[op.id] = Math.max(0, Math.min(1, opSuccess(op) * (1 - slowShare(opLatency(op), ev.clientTimeoutMs))));
        let f = 1; for (let j = 1; j <= retries; j++) f += (1 - s[op.id]) ** j;
        if (Math.abs(f - factor[op.id]) >= 1e-6) done = false;
        factor[op.id] = f;
      }
      if (done) break;
    }
    // 4–5. latency and record
    let transferNow = 0;
    for (const op of ops) {
      const T_ = opT[op.id], pt = perTick[op.id], calls = base[op.id] * secs;
      let ok = 0, slow = 0, p99 = 0, p50 = 0;
      if (compiled.plans?.[op.id]?.ok) {
        const L = opLatency(op), sum = summarise(L);
        const user = 1 - (1 - s[op.id]) ** (retries + 1);
        ok = calls * user; p99 = sum.p99; p50 = sum.p50; pt.F[i] = L.F; pt.M[i] = L.M; pt.V[i] = L.V;
        slow = op.slo?.p99Ms ? calls * slowShare(L, op.slo.p99Ms) : 0;
        const cdnShare = op.cacheable ? 1 - (cdnMissNow[op.id] ?? 1) : 0;
        const bytes = (base[op.id] * user) * (op.bytesOut ?? 1000) * SECONDS_PER_MONTH / 1e9;
        transferNow += bytes * (cdnShare * cdnEgress + (1 - cdnShare) * ev.egressPerGb);
      }
      T_.calls += calls; T_.ok += ok; T_.slow += slow; T_.p50w += p50 * calls;
      if (p99 > T_.p99Worst) { T_.p99Worst = p99; T_.p99WorstAt = t; }
      pt.calls[i] = calls; pt.ok[i] = ok; pt.slow[i] = slow; pt.p99[i] = p99;
      timeline.ops[op.id].rate.push(r3(base[op.id])); timeline.ops[op.id].ok.push(r3(calls > 0 ? ok / calls : 1)); timeline.ops[op.id].p99.push(r3(p99));
    }
    for (const id of order) {
      const nt = nodeT[id], rv = rho[id] === undefined ? 0 : Number.isFinite(rho[id]) ? rho[id] : 10;
      if (rv > nt.rhoMax) { nt.rhoMax = rv; nt.rhoMaxAt = t; }
      if (isDown(id)) nt.downMinutes += D;
      const tl = timeline.nodes[id];
      tl.rho.push(r3(Math.min(rv, 10))); tl.up.push(isDown(id) ? 0 : 1); tl.instances.push(info[id].type === 'server' ? instancesNow(id) : 0);
      tl.backlog.push(r3(enqRecs.filter((e) => e.node === id).reduce((a, e) => a + backlog[e.hop.id], 0)));
      const c = monthlyNow(id); byNode[id] += c * D / (60 * HOURS_PER_MONTH);
    }
    transferTotal += transferNow * D / (60 * HOURS_PER_MONTH);
    // 6. move on: queues (§8.7)
    for (const e of enqRecs) {
      const done = e.async.reduce((a, c) => a + c.out * c.Sb, 0);
      backlog[e.hop.id] = Math.max(0, backlog[e.hop.id] + (e.out - done) * secs);
      waitSec[e.hop.id] = done > 1e-12 ? backlog[e.hop.id] / done : backlog[e.hop.id] > 0.5 ? hours * 3600 : 0;
      if (waitSec[e.hop.id] > waitWorst[e.hop.id]) waitWorst[e.hop.id] = waitSec[e.hop.id];
      if (backlog[e.hop.id] > 0.5 && !e.backlogged) { e.backlogged = true; st.events.push({ t, node: e.node, kind: 'backlog' }); }
      else if (backlog[e.hop.id] <= 0.5 && e.backlogged) { e.backlogged = false; st.events.push({ t, node: e.node, kind: 'drained' }); }
    }
    for (const r of deferredSteps) {
      const delay = r.enq.reduce((a, e) => a + waitSec[e.hop.id] + 1, 0);
      const dd = opT[r.op.id].deferred[r.hop.step];
      if (dd && !r.hop.copy && delay > dd.worstDelaySec) dd.worstDelaySec = delay;
      const key = `${r.node}|${r.hop.entity}`;
      if (r.hop.write && delay > (feedDelay[key] || 0)) feedDelay[key] = delay;
    }
    // crash timers, autoscaling, warm-up (§8.11)
    for (const id of order) {
      const n = info[id];
      st.prevRho[id] = rho[id] === undefined ? 0 : Number.isFinite(rho[id]) ? rho[id] : 10;
      if (n.crashable && !isDown(id)) {
        const pol = n.comp.crash;
        if ((rho[id] || 0) > pol.above) {
          st.over[id] = (st.over[id] || 0) + D;
          if (st.over[id] >= pol.minutes) { st.over[id] = 0; takeDown(st, id, t + D, t + D + downFor(n), n.type === 'database' && n.standby ? 'failover' : 'crashed', false); }
        } else st.over[id] = 0;
      }
      if (n.type === 'server' && n.cfg.autoscale && n.comp.autoscaling) {
        const a = n.comp.autoscaling, per = (n.size?.rps || 1) * (a.targetPct / 100) * (n.cfg.sandbox ? 0.8 : 1);
        const want = Math.min(n.cfg.maxCount, Math.max(n.cfg.count, Math.ceil((offered[id] || 0) / per)));
        const coming = st.pending[id].reduce((x, p) => x + p.n, 0);
        if (want > st.inst[id] + coming) { st.pending[id].push({ at: t + D + a.warmupMinutes, n: want - st.inst[id] - coming }); st.events.push({ t, node: id, kind: 'scaledOut', n: want - st.inst[id] - coming }); st.low[id] = 0; }
        else if (want < st.inst[id]) { st.low[id] = (st.low[id] || 0) + D; if (st.low[id] >= a.scaleInMinutes) { st.events.push({ t, node: id, kind: 'scaledIn', n: st.inst[id] - want }); st.inst[id] = want; st.low[id] = 0; } }
        else st.low[id] = 0;
      }
      if (n.type === 'cache' && st.cold[id] !== undefined && t + D - st.cold[id] >= (n.comp.warmupMinutes || 10)) { delete st.cold[id]; st.events.push({ t: t + D, node: id, kind: 'warm' }); }
    }
  }

  // ---- results (§8.14) -----------------------------------------------------------------------------------------------
  for (const id of order) { nodeT[id].crashes = st.crashes[id] || 0; nodeT[id].cost = byNode[id] * HOURS_PER_MONTH / hours; }
  const out = dict();
  for (const op of ops) {
    const x = opT[op.id];
    for (const sid in x.deferred) {
      const left = deferredSteps.filter((r) => r.op === op && r.hop.step === sid && !r.hop.copy).flatMap((r) => r.enq).reduce((a, e) => a + backlog[e.hop.id], 0);
      x.deferred[sid].notDone = Math.round(left);
    }
    out[op.id] = {
      calls: x.calls, ok: x.ok, availability: x.calls > 0 ? Math.min(100, Math.max(0, (100 * x.ok) / x.calls)) : 100,
      slowShare: x.calls > 0 ? x.slow / x.calls : 0, p50: x.calls > 0 ? x.p50w / x.calls : 0, p99Worst: x.p99Worst, p99WorstAt: x.p99WorstAt,
      deferred: x.deferred, planned: !!compiled.plans?.[op.id]?.ok,
    };
  }
  // keep at most 300 points per series
  if (T > 300) {
    const k = Math.ceil(T / 300), squeeze = (arr, f) => { const o = []; for (let j = 0; j < arr.length; j += k) o.push(f(arr.slice(j, j + k))); return o; };
    for (const id in timeline.ops) { const o = timeline.ops[id]; o.rate = squeeze(o.rate, (a) => a[0]); o.ok = squeeze(o.ok, (a) => Math.min(...a)); o.p99 = squeeze(o.p99, (a) => Math.max(...a)); }
    for (const id in timeline.nodes) { const o = timeline.nodes[id]; o.rho = squeeze(o.rho, (a) => Math.max(...a)); o.up = squeeze(o.up, (a) => Math.min(...a)); o.instances = squeeze(o.instances, (a) => Math.min(...a)); o.backlog = squeeze(o.backlog, (a) => Math.max(...a)); }
    timeline.tickMinutes = D * k;
  }
  const nodeCosts = Object.values(nodeT).reduce((a, n) => a + n.cost, 0), transfer = transferTotal * HOURS_PER_MONTH / hours;
  const queues = enqRecs.map((e) => ({ hop: e.hop.id, node: e.node, op: e.op.id, backlogEnd: backlog[e.hop.id], waitWorst: waitWorst[e.hop.id], growing: false }));
  // a backlog still growing at the end (§10.8): larger than ever before and rising over the last 10 ticks
  for (const q of queues) {
    const series = timeline.nodes[q.node].backlog, n = series.length;
    if (n >= 2 && q.backlogEnd > 0.5) { const from = Math.max(0, n - 11); q.growing = series[n - 1] >= Math.max(...series) - 1e-9 && series[n - 1] > series[from] + 1e-9; }
  }
  return {
    ops: out, nodes: nodeT, events: st.events, timeline, ticks: perTick, tickMinutes: D, T, hours,
    cost: { monthly: nodeCosts + storageMonthly + transfer, byNode: Object.fromEntries(order.map((id) => [id, nodeT[id].cost])), storage: storageMonthly, transfer },
    storageGb, lost: st.lost, duplicates: 0, queues, feedDelay,
  };
}
