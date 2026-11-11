// Stage 3: simulate (plans + one load test → what happened, minute by minute), evaluator.md §8.
//
//   simulateTest(compiled, lab, practice, test) → { ops, nodes, events, timeline, cost, lost, duplicates, ticks, … }
//
// A fluid model: each tick it computes the calls a second flowing along every hop of every plan, how loaded each
// node is, and what that does to success and latency. Deterministic: no randomness, no clock, input order only.
// Phase 5 (§8.9): a Service's calls in progress, the timeout, retries and the circuit breaker on the calls it makes.
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
  // change data capture (§7.6): each system plan's calls are its database's writes of the entity last tick
  const sysOps = (compiled.system || []).map((x) => { roots[x.op.id] = [add(x.plan.root, x.op, null)]; return x.op; });
  const cdcPrev = dict();
  for (const o of sysOps) cdcPrev[o.id] = 0;
  const hopsAt = dict();
  for (const id of order) hopsAt[id] = [];
  for (const r of recs) if (r.hop.kind !== 'source') hopsAt[r.node].push(r);
  const nodeOrder = g.topo.filter((id) => hopsAt[id]?.length);
  const enqRecs = recs.filter((r) => r.hop.kind === 'enqueue');
  // consumers back off while what they call is overloaded (§8.7): each consume hop keeps a throttle from the last
  // tick, rescaled so the busiest node below it would be at about 80% whenever it is above 85% or below 70%
  // (an external provider's rate limit refuses the excess at once and never falls over: workers run up to it)
  const below = (r) => { const out = new Set(); const walk = (x) => { for (const c of x.units.flatMap((u) => u.one ? [u.one] : u.group)) { if (c.hop.kind === 'store' || c.hop.kind === 'cache') out.add(c.node); walk(c); } }; walk(r); return [...out]; };
  // one throttle per worker group and queue: the workers take messages without knowing which call sent them
  const tkey = (r) => `${r.parent?.node}|${r.node}`;
  const throttle = dict(), throttleNodes = dict();
  for (const r of recs) if (r.hop.kind === 'consume') { const k = tkey(r); throttle[k] = 1; throttleNodes[k] = [...new Set([...(throttleNodes[k] || []), ...below(r)])]; }
  const thr = (r) => throttle[tkey(r)] ?? 1;
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
    lostInst: dict(), cold: dict(), slow: dict(), spikes: [], zoneUntil: -1, prevRho: dict(), lost: 0, writeRate: dict(), hot: [], poison: null, abuse: null,
  };
  for (const id of order) { st.lostInst[id] = []; st.pending[id] = []; st.writeRate[id] = 0; if (info[id].type === 'server' || info[id].type === 'realtime') st.inst[id] = info[id].cfg.count || 1; }
  const backlog = dict(), waitSec = dict(), waitWorst = dict(), lastDone = dict();
  for (const e of enqRecs) { backlog[e.hop.id] = 0; waitSec[e.hop.id] = 0; waitWorst[e.hop.id] = 0; }
  // a stream keeps one position per consumer group: each consumer has its own backlog
  const isStream = (e) => info[e.node]?.type === 'stream', groupBacklog = dict();
  for (const e of enqRecs) if (isStream(e)) for (const c of e.async) groupBacklog[c.hop.id] = 0;
  const hitNow = dict(); for (const id in cacheFit) hitNow[id] = dict();
  const rho = dict(), busy = dict(), offered = dict(), served = dict(), readsAt = dict(), writesAt = dict();
  const isDown = (id) => st.down[id] !== undefined;
  // §8.9: how long a call occupies each Service (last tick), and per call a Service makes: last success, breaker
  const holdMs = dict(), holdWorst = dict(), unitsPerCall = dict(), lastS = dict(), open = dict();
  const caller = (r) => r.parent && info[r.parent.node]?.type === 'server' && (r.parent.hop.kind === 'handle' || r.parent.hop.kind === 'consume') && r.hop.sync !== false ? info[r.parent.node] : null;
  const CONC = ev.components?.find?.((c) => c.type === 'server')?.concurrency ?? 256;

  const instancesNow = (id) => {
    const n = info[id]; let k = Math.max(0, st.inst[id] - st.lostInst[id].reduce((a, x) => a + x.n, 0));
    if (st.zoneUntil > -1) { const z = n.cfg.zones || 1; k = z <= 1 ? 0 : Math.floor(k * (1 - 1 / z)); }
    return k;
  };
  const capacityNow = (id) => {
    const n = info[id];
    if (n.type === 'client') return Infinity;
    if (isDown(id)) return 0;
    if (n.type === 'server') {
      const k = instancesNow(id), units = (n.size?.rps || 0) * k * (n.cfg.sandbox ? 0.8 : 1);
      // calls in progress: at most `concurrency` per instance, each held for holdMs (§8.9)
      const conc = holdMs[id] > 0 ? (k * (n.size?.concurrency ?? CONC) * 1000 / holdMs[id]) * (unitsPerCall[id] || 1) : Infinity;
      return Math.min(units, conc);
    }
    if (n.type === 'stream') return 10000 * (n.cfg.partitions || 6);
    if (n.type === 'realtime') return (n.size?.messagesPerSec || 0) * instancesNow(id);
    if (n.type === 'cache') return (n.size?.ops || 0) * (n.cfg.nodes || 1);
    if (n.type === 'database') return n.perRequest ? n.engine.limitQps : (n.size?.qps || 0) * (n.cfg.shards || 1);
    if (n.type === 'queue') return n.cfg.kind === 'fifo' ? 3000 : n.comp.limitRps;
    if (n.type === 'external') return n.cfg.limitRps ?? n.comp.limitRps;
    return n.comp?.limitRps ?? Infinity;
  };

  // share of the parent's calls this hop gets now (§8.4 shareNow)
  const cdnMissNow = dict(), abuseRate = dict(), abuseFrac = dict();
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

  // ---- poison messages (§8.7) and hot keys (§8.11) ---------------------------------------------------------------------
  // A consume hop under poison: a standard queue retries the bad messages (with a dead-letter queue, maxReceives
  // times; without, for ever, about 20 tries each); a FIFO queue or a stream stops behind them (that share stays).
  const poisonOf = (r) => {
    const x = st.poison?.share || 0;
    if (!(x > 0) || r.hop.kind !== 'consume') return { work: 1, blocked: 0 };
    const q = info[r.parent.node];
    if (q.type === 'queue' && q.cfg.kind !== 'fifo') return { work: q.cfg.dlq ? 1 + x * ((q.cfg.maxReceives || 5) - 1) : 1 + 20 * x, blocked: 0 };
    return { work: 1, blocked: x };
  };
  const poisonSeen = dict();   // queue id → { dlq, kind, share }
  const hotShare = (op) => { let x = op.keys?.hot || 0; for (const h of st.hot) if (!h.op || h.op === op.id) x = Math.max(x, h.share); return x; };
  const partsOf = (id) => {
    const n = info[id];
    if (n.type === 'database') return ['dynamodb', 'cassandra'].includes(n.cfg.engine) ? 10 : n.cfg.shards || 1;
    if (n.type === 'cache') return n.cfg.nodes || 1;
    if (n.type === 'stream') return n.cfg.partitions || 6;
    return 1;
  };
  const hotParts = dict();     // "node|op" → { node, op, share, parts, rhoHot, lost }

  // ---- one flow pass (§8.4) -----------------------------------------------------------------------------------------
  function flowPass(rate, t) {
    for (const op of [...planned, ...sysOps]) {
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
          // a stream: every consumer group reads every message, from its own position
          if (isStream(e)) r.in = e.out + groupBacklog[r.hop.id] / secs;
          else {
            const caps = cons.map((c) => capacityNow(c.node)), sum = caps.reduce((a, x) => a + x, 0);
            const wgt = sum > 0 ? capacityNow(r.node) / sum : 1 / cons.length;
            r.in = (e.out + backlog[e.hop.id] / secs) * wgt;
          }
          r.in *= thr(r);
        } else {
          r.p = shareNow(r); r.in = r.parent.out * r.p * r.hop.per;
          const cs = caller(r);
          if (cs) {
            const k = cs.cfg.callRetries || 0, f = 1 - (lastS[r.i] ?? 1);
            let m = 1; for (let j = 1; j <= k; j++) m += f ** j;
            r.in *= m * (cs.cfg.breaker && open[r.i] ? 0.1 : 1);
          }
          // a rate-limited API gateway refuses the abusive client's calls: they cost it, and go no further
          if (info[r.node].type === 'apigw' && info[r.node].cfg.rateLimit === 'perClient' && abuseFrac[r.op.id]) r.blocked = abuseFrac[r.op.id]; else r.blocked = 0;
        }
      }
      const cap = capacityNow(id), down = isDown(id);
      let sync = 0, pull = 0, R = 0, Wr = 0, calls = 0;
      const free = (r) => n.type === 'cache' && down && (r.hop.kind === 'cache' || r.hop.kind === 'invalidate') && n.cfg.onDown !== 'fail';
      for (const r of list) {
        calls += r.in;
        if (free(r)) continue;
        const u = r.in * r.hop.work * (r.hop.kind === 'consume' ? poisonOf(r).work : 1);
        if (r.hop.kind === 'consume') pull += u; else { sync += u; if (r.hop.write) Wr += u; else R += u; }
      }
      let phiR = 1, phiW = 1, phiPull = 1, rr = 0;
      if (n.type === 'realtime') {
        let conns = 0, msgs = 0;
        for (const r of list) { if (r.hop.kind === 'deliver') msgs += r.in; else if (r.hop.kind === 'handle') conns += r.in * (r.op.sessionSec || 600); }
        const k = down ? 0 : instancesNow(id), capC = (n.size?.connections || 0) * k, capM = (n.size?.messagesPerSec || 0) * k;
        const rc = capC > 0 ? conns / capC : conns > 0 ? Infinity : 0, rm = capM > 0 ? msgs / capM : msgs > 0 ? Infinity : 0;
        rr = Math.max(rc, rm);
        for (const r of list) { const x = r.hop.kind === 'deliver' ? rm : rc; r.phi = x > 1 ? 1 / x : x === Infinity ? 0 : 1; r.out = r.in * r.phi; }
        rho[id] = rr; offered[id] = conns + msgs; served[id] = msgs; readsAt[id] = 0; writesAt[id] = 0;
        continue;
      }
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
      // an external service also fails a share of the calls it accepts (errorPct)
      const errShare = n.type === 'external' ? Math.min(1, Math.max(0, (n.cfg.errorPct ?? 0) / 100)) : 0;
      for (const r of list) {
        r.phi = (free(r) ? 1 : n.type === 'cache' && down ? 0 : r.hop.kind === 'consume' ? phiPull : r.hop.write ? phiW : phiR) * (r.hop.kind === 'call' ? 1 - errShare : 1);
        if (r.hop.kind === 'consume') {
          const pz = poisonOf(r);
          if (pz.work > 1 || pz.blocked > 0) { const q = info[r.parent.node]; poisonSeen[q.id] = { dlq: !!q.cfg.dlq, kind: q.type === 'stream' ? 'stream' : q.cfg.kind || 'standard', share: st.poison.share }; }
          r.phi *= 1 - pz.blocked;
        }
        r.out = r.in * r.phi * (1 - (r.blocked || 0));
      }
      // a hot item: the part (shard, partition, cache node) that holds it takes more than its share
      const P = partsOf(id);
      if (P > 1 && !down && st.hot.length + planned.some((o) => o.keys?.hot) > 0) {
        const capN = capacityNow(id), tot = n.type === 'database' && !n.perRequest ? Wr + R : sync;
        for (const r of list) {
          if (!['store', 'cache', 'enqueue'].includes(r.hop.kind) || r.hop.share?.kind === 'miss' || r.op.system) continue;
          const x = hotShare(r.op); if (!(x > 0) || !(capN > 0)) continue;
          const u = r.in * r.hop.work, f = x + (1 - x) / P, rh = (u * f + Math.max(0, tot - u) / P) / (capN / P);
          const k = `${id}|${r.op.id}`, prev = hotParts[k];
          if (rh > 0.8 && (!prev || rh > prev.rhoHot)) {
            if (!prev) st.events.push({ t, node: id, kind: 'hotPart', op: r.op.id });
            hotParts[k] = { node: id, op: r.op.id, share: x, parts: P, rhoHot: rh, lost: (prev?.lost || false) || rh > 1 };
          }
          if (rh > 1) { r.phi *= 1 - f * (1 - 1 / rh); r.out = r.in * r.phi; }
        }
      }
      rho[id] = rr; offered[id] = sync + pull; served[id] = calls; readsAt[id] = 0; writesAt[id] = 0;
      // how busy it is, counting the messages it pulls from queues (they do not slow its own answers or crash it)
      busy[id] = n.type === 'server' && pull > 0 && cap > 0 ? (sync + pull * phiPull) / cap : rr;
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
    else if (k === 'call') b = n.cfg.latencyMs ?? n.comp.latencyMs ?? 300;
    else if (k === 'deliver') b = n.comp.latencyMs || 5;
    else if (k === 'store') {
      const lat = n.type === 'database' ? n.engine?.latencyMs ?? n.comp.latencyMs : n.comp.latencyMs;
      b = (lat || 1) * pathFactor(r.hop) + (r.hop.write && n.type === 'database' && n.replicas > 0 && n.cfg.replication === 'sync' ? 2 : 0);
    }
    return b * (st.slow[r.node]?.factor || 1);
  }
  // A call made by a Service (§8.9): cut at its timeout (slower is a failure), retried, or refused by an open breaker.
  function seen(c) {
    const cs = caller(c);
    if (!cs) return { S: c.S, L: c.L };
    const T = cs.cfg.timeoutMs ?? 1000, Ec = c.L.F + c.L.M;
    let S = c.S * (1 - slowShare(c.L, T)), L = c.L;
    if (Ec > T) { const k = T / Ec; L = { F: L.F * k, M: L.M * k, V: L.V * k * k }; }
    lastS[c.i] = S;
    const k = cs.cfg.callRetries || 0;
    if (k > 0) S = 1 - (1 - S) ** (k + 1);
    if (cs.cfg.breaker && open[c.i]) { S *= 0.1; L = { F: 0.1 * L.F + 0.9, M: 0.1 * L.M, V: 0.1 * L.V }; }
    return { S, L };
  }
  function solve() {
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i], n = info[r.node];
      let S = 1;
      const b = baseTime(r);
      // a node that is down refuses calls at once (they fail fast); only a slow or overloaded one makes callers wait
      // (an external provider answers at its usual speed up to its limit and refuses the rest; a managed service or a
      // per-request store throttles: over its limit it refuses the excess at once, so callers never queue far there)
      const rq = n.type === 'external' ? 0 : n.managed && n.type !== 'client' ? Math.min(rho[r.node] ?? 0, 0.7) : rho[r.node] ?? 0;
      const ht = r.hop.kind === 'source' || isDown(r.node) ? { fixed: 0, wait: 0, v: 0 } : hopTime(b, rq);
      let wait = ht.wait, v = ht.v;
      if (r.hop.kind === 'store' && n.type === 'database' && (n.cfg.shards || 1) > 1 && r.hop.shardRouted === false) { const s = n.cfg.shards; wait *= harmonic(s); v *= harmonic2(s); }
      let F = b, M = wait, V = v;
      for (const u of r.units) {
        if (u.one) {
          const c = u.one, per = c.hop.per || 1, sh = c.hop.share, x = seen(c);
          const partial = typeof sh === 'object' && (sh.kind === 'miss' || sh.kind === 'cdnMiss');
          const p = partial ? c.p : 1, pS = partial && sh.kind === 'cdnMiss' && r.op.live ? 1 : p;
          S *= partial ? 1 - pS + pS * x.S ** per : x.S ** per;
          const Ec = x.L.F + x.L.M;
          if (p >= 1 - 1e-12) { F += per * x.L.F; M += per * x.L.M; V += per * x.L.V; }
          else { M += p * per * Ec; V += p * per * x.L.V + p * (1 - p) * (per * Ec) ** 2; }
        } else {
          const xs = u.group.map(seen), ws = u.group.map((c) => c.p / (c.hop.per || 1)), tw = ws.reduce((a, x) => a + x, 0);
          S *= tw > 0 ? xs.reduce((a, x, j) => a + (ws[j] / tw) * x.S, 0) : 0;
          const m = mix(xs.map((x, j) => ({ w: tw > 0 ? ws[j] : 1, F: x.L.F, M: x.L.M, V: x.L.V })));
          F += m.F; M += m.M; V += m.V;
        }
      }
      r.Sb = S; r.S = r.phi * S; r.L = { F, M, V }; r.ownWait = wait;
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
  for (const id of order) timeline.nodes[id] = { rho: [], up: [], instances: [], backlog: [], held: [], callsLimit: [] };
  const feedDelay = dict();   // "store|entity" → worst seconds behind (async copies)
  // work done after answering: writes and calls behind a queue (their delay and what is left undone)
  const deferredSteps = recs.filter((r) => (r.hop.kind === 'store' || r.hop.kind === 'call') && r.enq.length);
  const deliverRecs = recs.filter((r) => r.hop.kind === 'deliver');
  const computeRecs = recs.filter((r) => r.hop.kind === 'consume' && r.hop.computeSteps?.length);   // work done by a worker only
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
    if (n.type === 'external') return (n.cfg.pricePerCall || 0) * (served[id] || 0) * SECONDS_PER_MONTH;
    if (n.type === 'stream') return Math.max(3, Math.ceil((n.cfg.partitions || 6) / 50)) * (n.comp.brokerHourly || 0.21) * HOURS_PER_MONTH;
    if (n.type === 'pubsub') return (n.comp.pricePerMillion || 0) * (served[id] || 0) * SECONDS_PER_MONTH / 1e6;
    if (n.type === 'realtime') return (n.size?.hourly || 0) * Math.max(0, st.inst[id] - st.lostInst[id].reduce((a, x) => a + x.n, 0)) * HOURS_PER_MONTH;
    if (n.comp?.v2only) return 0;
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
      // webhooks follow the test's traffic too (their share of it); scheduled jobs come in phase 6
      base[op.id] = (op.source === 'schedule' ? 0 : rps * m * share(op)) * f;
    }
    // the abusive client (fault abuse): extra calls on top, not counted in the operation's success (§8.13)
    for (const op of ops) { const a = st.abuse ? rps * m * share(op) * st.abuse.factor : 0; abuseRate[op.id] = a; }
    // 3. the retry loop
    const factor = dict(), s = dict();
    for (const op of planned) factor[op.id] = 1;
    for (let k = 0; k < 4; k++) {
      const rate = dict(); for (const op of planned) { rate[op.id] = base[op.id] * factor[op.id] + abuseRate[op.id]; abuseFrac[op.id] = rate[op.id] > 0 ? abuseRate[op.id] / rate[op.id] : 0; }
      for (const o of sysOps) rate[o.id] = cdcPrev[o.id];
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
      const nt = nodeT[id], rb = Math.max(rho[id] ?? 0, busy[id] ?? 0), rv = Number.isFinite(rb) ? rb : 10;
      if (rv > nt.rhoMax) { nt.rhoMax = rv; nt.rhoMaxAt = t; }
      if (isDown(id)) nt.downMinutes += D;
      const tl = timeline.nodes[id];
      tl.rho.push(r3(Math.min(rv, 10))); tl.up.push(isDown(id) ? 0 : 1); tl.instances.push(info[id].type === 'server' || info[id].type === 'realtime' ? instancesNow(id) : 0);
      tl.backlog.push(r3(enqRecs.filter((e) => e.node === id).reduce((a, e) => a + backlog[e.hop.id], 0)));
      // a Service limited by its calls in progress (§8.9) rather than by its work units
      if (info[id].type === 'server') { const n = info[id], k = instancesNow(id), units = (n.size?.rps || 0) * k * (n.cfg.sandbox ? 0.8 : 1); tl.held.push(r3(holdMs[id] || 0)); tl.callsLimit.push(!isDown(id) && k > 0 && capacityNow(id) < units - 1e-9 ? 1 : 0); } else { tl.held.push(0); tl.callsLimit.push(0); }
      const c = monthlyNow(id); byNode[id] += c * D / (60 * HOURS_PER_MONTH);
    }
    transferTotal += transferNow * D / (60 * HOURS_PER_MONTH);
    // 6. move on: queues (§8.7)
    for (const e of enqRecs) {
      if (isStream(e)) {
        // each consumer group from its own position; the stream shows the slowest group
        let worstB = 0, worstW = 0, sumDone = 0;
        for (const c of e.async) {
          const d = c.out * c.Sb;
          groupBacklog[c.hop.id] = Math.max(0, groupBacklog[c.hop.id] + (e.out - d) * secs);
          // while the consumer backs off its rate says little about how soon the backlog clears: age the wait instead
          const est = groupBacklog[c.hop.id] / d, w = d > 1e-12 ? (thr(c) < 1 ? Math.min(est, (waitSec[e.hop.id] || 0) + secs) : est) : groupBacklog[c.hop.id] > 0.5 ? (waitSec[e.hop.id] || 0) + secs : 0;
          if (groupBacklog[c.hop.id] >= worstB) { worstB = groupBacklog[c.hop.id]; }
          if (w > worstW) worstW = w;
          sumDone += d;
        }
        backlog[e.hop.id] = worstB; waitSec[e.hop.id] = worstW; lastDone[e.hop.id] = e.async.length ? sumDone / e.async.length : e.out;
        if (worstW > waitWorst[e.hop.id]) waitWorst[e.hop.id] = worstW;
        continue;
      }
      const done = e.async.reduce((a, c) => a + c.out * c.Sb, 0);
      backlog[e.hop.id] = Math.max(0, backlog[e.hop.id] + (e.out - done) * secs);
      // nothing taken this tick (the workers' calls all fail): the oldest message waits a tick longer
      // (and while the workers back off, their rate says little about how soon it clears: age the wait instead)
      const backing = e.async.some((c) => thr(c) < 1);
      waitSec[e.hop.id] = done > 1e-12 ? (backing ? Math.min(backlog[e.hop.id] / done, waitSec[e.hop.id] + secs) : backlog[e.hop.id] / done) : backlog[e.hop.id] > 0.5 ? waitSec[e.hop.id] + secs : 0;
      lastDone[e.hop.id] = done;
      if (waitSec[e.hop.id] > waitWorst[e.hop.id]) waitWorst[e.hop.id] = waitSec[e.hop.id];
      if (backlog[e.hop.id] > 0.5 && !e.backlogged) { e.backlogged = true; st.events.push({ t, node: e.node, kind: 'backlog' }); }
      else if (backlog[e.hop.id] <= 0.5 && e.backlogged) { e.backlogged = false; st.events.push({ t, node: e.node, kind: 'drained' }); }
    }
    // a queue several calls send to is one line: every message in it waits as long (standard queues: about in order)
    const byQueue = new Map();
    for (const e of enqRecs) if (!isStream(e)) { if (!byQueue.has(e.node)) byQueue.set(e.node, []); byQueue.get(e.node).push(e); }
    for (const es of byQueue.values()) {
      if (es.length < 2) continue;
      const B = es.reduce((a, e) => a + backlog[e.hop.id], 0), Dn = es.reduce((a, e) => a + (lastDone[e.hop.id] || 0), 0);
      const w = Math.max(...es.map((e) => waitSec[e.hop.id]));
      const shared = Dn > 1e-12 ? Math.min(B / Dn, es.some((e) => e.async.some((c) => thr(c) < 1)) ? w : Infinity) : B > 0.5 ? w : 0;
      for (const e of es) { waitSec[e.hop.id] = shared; if (shared > waitWorst[e.hop.id]) waitWorst[e.hop.id] = shared; }
    }
    for (const r of deliverRecs) {
      const dd = opT[r.op.id]?.deferred[r.hop.step];
      if (!dd) continue;
      dd.lost = (dd.lost || 0) + Math.max(0, r.in - r.out) * secs;
      const delay = r.enq.reduce((a, e) => a + waitSec[e.hop.id], 0) + ((r.L?.F || 0) + (r.L?.M || 0)) / 1000;
      if (delay > dd.worstDelaySec) dd.worstDelaySec = delay;
    }
    for (const r of computeRecs) {
      const delay = r.enq.reduce((a, e) => a + waitSec[e.hop.id] + 1, 0);
      for (const sid of r.hop.computeSteps) { const dd = opT[r.op.id]?.deferred[sid]; if (dd && delay > dd.worstDelaySec) dd.worstDelaySec = delay; }
    }
    for (const r of deferredSteps) {
      const delay = r.enq.reduce((a, e) => a + waitSec[e.hop.id] + 1, 0);
      const dd = opT[r.op.id]?.deferred[r.hop.step];
      if (dd && !r.hop.copy && delay > dd.worstDelaySec) dd.worstDelaySec = delay;
      const key = `${r.node}|${r.hop.entity}`;
      if (r.hop.write && delay > (feedDelay[key] || 0)) feedDelay[key] = delay;
    }
    // how long a call occupied each Service this tick (its own time and the calls it made, each cut at its timeout)
    for (const id of order) {
      if (info[id].type !== 'server') continue;
      let w = 0, h = 0, calls = 0;
      // (not the time it waited for the Service itself: that is its load, counted already)
      for (const r of hopsAt[id]) if ((r.hop.kind === 'handle' || r.hop.kind === 'consume') && r.L && r.in > 0) { w += r.in; h += r.in * Math.max(0, r.L.F + r.L.M - (r.ownWait || 0)); }
      for (const r of hopsAt[id]) calls += r.in;
      // smoothed over ticks: a call's hold changes with the load it causes, and a one-tick lag would make it swing
      const now = w > 0 ? h / w : 0;
      holdMs[id] = holdMs[id] > 0 ? 0.5 * holdMs[id] + 0.5 * now : now;
      if (holdMs[id] > (holdWorst[id] || 0)) holdWorst[id] = holdMs[id];
      unitsPerCall[id] = calls > 0 ? (offered[id] || 0) / calls : 1;
    }
    for (const r of recs) { const cs = caller(r); if (cs?.cfg.breaker) open[r.i] = (lastS[r.i] ?? 1) < 0.5; }
    for (const k in throttle) {
      const worst = Math.max(0, ...throttleNodes[k].map((id) => (Number.isFinite(rho[id]) ? rho[id] || 0 : 10)));
      if (worst > 0.85 || worst < 0.7) throttle[k] = Math.min(1, Math.max(0.05, (throttle[k] * 0.8) / Math.max(worst, 1e-6)));
    }
    // the writes each database took this tick become its change events next tick
    for (const o of sysOps) cdcPrev[o.id] = recs.reduce((a, r) => a + (r.node === o.db && r.hop.kind === 'store' && r.hop.write && r.hop.entity === o.entity && !r.op.system ? r.out : 0), 0);
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
      // what one more tick of the workers would clear is in flight (retries of a few failed calls), not left undone
      const left = [...deferredSteps.filter((r) => r.op === op && r.hop.step === sid && !r.hop.copy), ...computeRecs.filter((r) => r.op === op && r.hop.computeSteps.includes(sid))].flatMap((r) => r.enq).reduce((a, e) => a + (backlog[e.hop.id] > (lastDone[e.hop.id] || 0) * secs + 0.5 ? backlog[e.hop.id] : 0), 0);
      // deliveries the channel or a gateway could not make are lost: left undone too
      x.deferred[sid].notDone = Math.round(left + (x.deferred[sid].lost || 0));
      delete x.deferred[sid].lost;
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
    for (const id in timeline.nodes) { const o = timeline.nodes[id]; o.rho = squeeze(o.rho, (a) => Math.max(...a)); o.up = squeeze(o.up, (a) => Math.min(...a)); o.instances = squeeze(o.instances, (a) => Math.min(...a)); o.backlog = squeeze(o.backlog, (a) => Math.max(...a)); o.held = squeeze(o.held, (a) => Math.max(...a)); o.callsLimit = squeeze(o.callsLimit, (a) => Math.max(...a)); }
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
    storageGb, lost: st.lost, duplicates: 0, queues, feedDelay, hotParts: Object.values(hotParts), poison: poisonSeen, holdMs: { ...holdWorst },
  };
}
