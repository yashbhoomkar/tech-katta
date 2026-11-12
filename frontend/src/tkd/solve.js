// The phase solver (spec 7.1–7.7, 21.4, 22.5–22.7; layer 5). Pure: reads only its arguments.
//   runTest(design, problem, test) → { segments: [...], lost: {R: {n, part, phase}}, faultSeen, totalSeconds, events, backlog }
// Each phase is cut into segments with constant conditions (a failover, a cold cache); every segment is solved in one
// left-to-right walk per route: load on every part, utilisation (rho), drops, latency, outage, queue backlog.
import { KINDS } from './kinds/index.js';
import { CAP, P99, SCAN_FACTOR, RHO_MAX, P50_RATIO, REPLICA_LAG_S, FAILOVER_S, COLD_S, ROLES } from './catalogue.js';
import { round } from './round.js';

const isCacheKind = (k) => k === 'cache' || k === 'cdn';

// Events of a phase → [{part, type}] in declaration order. kill_role/flush_role reach every part of that kind; a part
// that doesn't exist is a no-op (22.7).
export function expandEvents(design, events = []) {
  const names = Object.keys(design.parts), out = [];
  for (const ev of events) {
    if (ev.kill_role && ROLES.includes(ev.kill_role)) for (const n of names) { if (design.parts[n].kind === ev.kill_role) out.push({ part: n, type: 'kill' }); }
    if (ev.flush_role === 'cache') for (const n of names) { if (design.parts[n].kind === 'cache') out.push({ part: n, type: 'flush' }); }
    if (typeof ev.kill === 'string' && design.parts[ev.kill]) out.push({ part: ev.kill, type: 'kill' });
    if (typeof ev.flush === 'string' && design.parts[ev.flush]?.kind === 'cache') out.push({ part: ev.flush, type: 'flush' });
  }
  return out;
}

// A request's numbers for a cache's hit ratio (22.2): churn from writes of the same table that clear this cache.
function hitInputs(design, problem, R, q, rates, cachePart) {
  let w = 0;
  if (R.table) for (const W of problem.requests) {
    if (W.mode !== 'write' || W.table !== R.table) continue;
    const wr = design.routes[W.name];
    if (wr && wr.invalidate === cachePart) w += rates[W.name] || 0;
  }
  return { q, D: R.distinct_keys, B: R.item_bytes, s: R.skew || 0, churn: q > 0 ? Math.min(1, w / q) : 0 };
}

// Solve one segment. `cond`: {failover:Set of sql parts, cold:{cache: factor}}; `backlog`: {worker: calls waiting}
// (updated in place). Returns the segment's per-part and per-request numbers.
function solveSegment(design, problem, state, rates, seconds, cond, backlog) {
  const P = design.parts, requests = problem.requests;
  // hit ratio of each cache/cdn hop for each read request
  const hit = (part, R) => {
    const p = P[part], k = KINDS[p.kind];
    if (R.mode !== 'read') return 0;
    const q = rates[R.name] || 0;
    if (p.kind === 'cdn') return q > 0 ? k.hitRatio(p, state[part], {}) : 0;
    let h = k.hitRatio(p, state[part], hitInputs(design, problem, R, q, rates, part));
    if (cond.cold[part] !== undefined) h = round(h * cond.cold[part], 6);
    return h;
  };
  const primaryDown = (name) => !state[name].primaryUp || cond.failover.has(name);
  // is this hop unable to answer (down), for a request of `mode`? A cache with no node left is skipped instead.
  const hopDown = (h, mode) => {
    const p = P[h.part], s = state[h.part];
    if (p.kind === 'sql') return (h.replica && mode === 'read' && s.replicasUp > 0) ? false : primaryDown(h.part);
    if (p.kind === 'cache') return false;
    return KINDS[p.kind].isDown(p, s);
  };
  const skipped = (h) => P[h.part].kind === 'cache' && state[h.part].alive === 0;

  // walk a route: [{part, x, bg, hop, hit, viaQueue}]; arrivals at the first worker after a queue are recorded, and
  // with `ratios` the worker passes on only what it serves (a queue protects what is behind it).
  const walk = (R, ratios, arrive) => {
    const route = design.routes[R.name], q = rates[R.name] || 0, out = [];
    let x = q, bg = false, prevHit = 0;
    route.hops.forEach((h, i) => {
      if (h.op === '~>') bg = true;
      if (h.op === '|') x *= (1 - prevHit);
      const prev = i ? P[route.hops[i - 1].part].kind : null, kind = P[h.part].kind;
      const viaQueue = kind === 'worker' && prev === 'queue';
      if (viaQueue) { arrive[h.part] = (arrive[h.part] || 0) + x; if (ratios) x *= ratios[h.part] ?? 1; }
      const hh = isCacheKind(kind) && !skipped(h) ? hit(h.part, R) : 0;
      out.push({ part: h.part, x, bg, hop: h, hit: isCacheKind(kind) ? hh : undefined, viaQueue, nextOp: route.hops[i + 1]?.op });
      prevHit = skipped(h) ? 0 : hh;
    });
    return out;
  };

  // pass 1: what arrives at each worker behind a queue; then how much of it the worker serves now
  const arrive1 = {};
  for (const R of requests) if (design.routes[R.name]) walk(R, null, arrive1);
  const ratios = {}, queueInfo = {};
  for (const [worker, arr] of Object.entries(arrive1)) {
    const p = P[worker], s = state[worker];
    // a worker can't finish work while something after it (on any route through it) is down: the work waits
    const blocked = requests.some((R) => { const r = design.routes[R.name]; if (!r) return false; const i = r.hops.findIndex((h) => h.part === worker); return i >= 0 && r.hops.slice(i + 1).some((h) => hopDown(h, R.mode)); });
    const cap = blocked ? 0 : CAP.server[p.size] * s.alive;
    const before = backlog[worker] || 0;
    const serve = Math.min(cap, arr + before / seconds);
    const after = Math.max(0, before + (arr - cap) * seconds);
    backlog[worker] = after;
    ratios[worker] = arr > 0 ? serve / arr : 1;
    queueInfo[worker] = { arrive: arr, cap, serve, backlog: after, delay_s: cap > 0 ? after / cap : null, stuck: cap === 0 && after > 0 };
  }

  // pass 2: load on every part
  const load = {}; // part → [{R, mode, x, eff, replica}]
  const add = (part, c) => { (load[part] ||= []).push(c); };
  const walks = {};
  for (const R of requests) {
    const route = design.routes[R.name];
    if (!route) continue;
    const q = rates[R.name] || 0, w = walk(R, ratios, {});
    walks[R.name] = w;
    for (const st of w) {
      if (skipped(st.hop)) continue;
      const p = P[st.part];
      let eff = st.x;
      if (st.part === route.store && route.scan) eff *= SCAN_FACTOR;
      if (st.hop.nolb && p.kind === 'server' && p.count > 1) eff *= state[st.part].alive; // one instance's capacity (W002)
      add(st.part, { R: R.name, mode: R.mode, x: st.x, eff, replica: st.hop.replica });
    }
    if (route.invalidate) add(route.invalidate, { R: R.name, mode: 'write', x: q, eff: q, replica: false, after: true });
    if (route.update) add(route.update, { R: R.name, mode: 'write', x: q, eff: q, replica: false, after: true });
  }

  // utilisation of every part (rho rounded to 4 decimals, 22.8); sql has a primary and a replica figure
  const parts = {};
  for (const [name, p] of Object.entries(P)) {
    const s = state[name], cs = load[name] || [], calls = cs.reduce((t, c) => t + c.x, 0);
    let rho = 0, rhoRep = null, down = false;
    if (p.kind === 'sql') {
      const rc = CAP.sql[p.size].read, wc = CAP.sql[p.size].write, toReplica = (c) => c.mode === 'read' && c.replica && s.replicasUp > 0;
      const writes = cs.filter((c) => c.mode === 'write').reduce((t, c) => t + c.eff, 0);
      rho = cs.filter((c) => c.mode === 'read' && !toReplica(c)).reduce((t, c) => t + c.eff, 0) / rc + writes / wc;
      if (s.replicasUp > 0) rhoRep = cs.filter(toReplica).reduce((t, c) => t + c.eff, 0) / (rc * s.replicasUp) + (p.sync ? writes / wc : 0);
      down = primaryDown(name);
    } else if (p.kind === 'cache') {
      rho = s.alive ? cs.reduce((t, c) => t + c.eff, 0) / (CAP.cache * s.alive) : 0;
    } else {
      const k = KINDS[p.kind], cap = k.capacity(p, s);
      down = k.isDown(p, s);
      rho = cap > 0 ? cs.reduce((t, c) => t + c.eff, 0) / cap : 0;
    }
    rho = round(rho, 4); if (rhoRep !== null) rhoRep = round(rhoRep, 4);
    parts[name] = { calls, rho: down ? null : rho, rhoRep, down, drop: !down && rho > 1 ? 1 - 1 / rho : 0, dropRep: rhoRep > 1 ? 1 - 1 / rhoRep : 0 };
  }

  // every request: latency (p99, p50), outage, drops, its trace
  const perRequest = {};
  for (const R of requests) {
    const route = design.routes[R.name], q = rates[R.name] || 0;
    if (!route || !(q > 0)) continue;
    const w = walks[R.name], trace = [];
    let p99 = 0, p50 = 0, out = false, drop = 0, missed = false, downPart = null;
    for (const st of w) {
      const p = P[st.part], info = parts[st.part];
      if (skipped(st.hop)) { trace.push({ part: st.part, ms: 0, rho: null, skipped: true, bg: st.bg }); continue; }
      const toRep = p.kind === 'sql' && st.hop.replica && R.mode === 'read' && state[st.part].replicasUp > 0;
      const rho = toRep ? info.rhoRep : info.rho, d = toRep ? info.dropRep : info.drop;
      drop = Math.max(drop, d);
      if (!st.bg && hopDown(st.hop, R.mode)) { out = true; downPart ||= st.part; trace.push({ part: st.part, ms: null, rho: null, down: true }); continue; }
      let base = KINDS[p.kind].baseP99(p, R.mode === 'write' ? 'write' : 'read');
      if (st.part === route.store && route.scan) base *= SCAN_FACTOR;
      if (p.kind === 'sql' && R.mode === 'write' && p.sync) base *= 2;
      const ms = round(base / (1 - Math.min(rho, RHO_MAX)), 2);
      trace.push({ part: st.part, ms, base, rho, ...(st.hit !== undefined ? { hit: st.hit } : {}), ...(st.bg ? { bg: true } : {}) });
      if (st.bg) continue;
      p99 += ms;
      if (!missed) p50 += ms;
      if (st.hit !== undefined && st.hit >= 0.5 && st.nextOp === '|') missed = true; // the median read is answered here
    }
    if (route.update) {
      const info = parts[route.update], ms = round(P99.cache / (1 - Math.min(info.rho || 0, RHO_MAX)), 2);
      drop = Math.max(drop, info.drop);
      p99 += ms; p50 += ms; trace.push({ part: route.update, ms, base: P99.cache, rho: info.rho, update: true });
    }
    p99 = round(p99, 2); p50 = round(P50_RATIO * p50, 2);
    const total = q * seconds, failed = out ? total : q * drop * seconds;
    const worker = w.find((st) => st.viaQueue)?.part;
    perRequest[R.name] = { q, p99: out ? null : p99, p50: out ? null : p50, total, failed, outage: out, downPart, drop, trace, ...(worker ? { worker, queue: queueInfo[worker] } : {}) };
  }
  return { parts, perRequest, queues: queueInfo, walks };
}

export function runTest(design, problem, test) {
  const P = design.parts, state = {};
  for (const [name, p] of Object.entries(P)) state[name] = KINDS[p.kind].initState(p);
  const backlog = {}, segments = [], lost = {}, events = [];
  const totalSeconds = (test.phases || []).reduce((t, ph) => t + (ph.seconds || 0), 0);
  let faultSeen = false, t0 = 0;
  (test.phases || []).forEach((phase, pi) => {
    const T = phase.seconds, rates = phase.rates || {};
    // events at the start of the phase: new state, and windows (failover, cold cache) that cut the phase
    const windows = [], lagParts = [];
    for (const ev of expandEvents(design, phase.events)) {
      const p = P[ev.part], res = KINDS[p.kind].onEvent(p, state[ev.part], ev);
      if (!res) continue;
      state[ev.part] = res.state; faultSeen = true;
      events.push({ phase: pi + 1, part: ev.part, type: ev.type });
      if (res.failover) windows.push({ kind: 'failover', part: ev.part, until: Math.min(FAILOVER_S, T) });
      if (res.cold !== undefined) windows.push({ kind: 'cold', part: ev.part, factor: res.cold, until: Math.min(COLD_S, T) });
      if (res.lag) lagParts.push(ev.part);
    }
    const cuts = [...new Set([0, ...windows.map((w) => w.until), T])].filter((x) => x <= T).sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i += 1) {
      const a = cuts[i], b = cuts[i + 1];
      if (b <= a) continue;
      const cond = { failover: new Set(), cold: {} };
      for (const w of windows) if (a < w.until) { if (w.kind === 'failover') cond.failover.add(w.part); else cond.cold[w.part] = Math.min(cond.cold[w.part] ?? 1, w.factor); }
      const seg = solveSegment(design, problem, state, rates, b - a, cond, backlog);
      // writes acknowledged but only on a part that failed (7.2, 7.6): counted once, at the phase's first segment
      if (i === 0) for (const part of lagParts) for (const R of problem.requests) {
        if (R.mode !== 'write' || !R.durable) continue;
        const st = seg.walks[R.name]?.find((x) => x.part === part);
        if (st && st.x > 0) { const l = (lost[R.name] ||= { n: 0, part, phase: pi + 1 }); l.n += st.x * REPLICA_LAG_S; }
      }
      segments.push({ phase: pi + 1, start: t0 + a, seconds: b - a, faultSeen, ...seg });
    }
    t0 += T;
  });
  return { segments, lost, faultSeen, totalSeconds, events, backlog };
}
