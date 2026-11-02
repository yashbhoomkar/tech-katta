// Steady-state simulation of a Lab design (no UI; also run by engine.test.js).
//
// A design is {nodes:[{id,type,config}], edges:[{from,to}]}; the catalogue (content/lab.json, from
// GET /v1/lab) gives each component type its capacity, latency and price.
//
// Traffic starts at Clients and flows along the arrows in topological order. At each component:
//   offered  = requests per second arriving
//   capacity = what it can serve (API Gateway limit, instances × rps per instance, database qps)
//   served   = min(offered, capacity); the rest is dropped (errors)
//   latency  = base / (1 − utilisation), capped near saturation (a simple queueing model)
// Each served request calls one component of every kind it points at; a server makes
// `queriesPerRequest` database queries per request; several components of the same kind share the
// traffic evenly (load balancing). Crashed components serve nothing. Clients retry a failed request
// `lab.retries` times, which adds load exactly when the system is struggling. End-to-end latency adds
// the calls made along the way; success is the share of user requests that eventually succeed.
//
// Phase 2 components:
//   Load Balancer: spreads requests over what it points at; billed per hour plus per LCU (load).
//   Cache: sits in front of a database (Server → Cache → Database). Reads it holds (hitPct) are
//     answered by the cache; misses and every write (writePct) go on to the database. All queries
//     touch the cache (writes update it), so it needs capacity for the full query rate.
//   Cache behaviour (optional catalogue fields `warmupMinutes`, `onDown`, `writePolicy`, `flushSeconds`):
//     - A cache that restarts after a crash comes back empty: its hit rate climbs from 0 to its hit %
//       over `warmupMinutes`, and the misses land on the database meanwhile.
//     - When it is down, queries either go straight to the database (`onDown: database`, what
//       cache-aside code does when the cache errors) or fail (`fail`).
//     - Write-through (default): writes go to the database at once and callers wait for it.
//       Write-back: the cache acknowledges writes and flushes them to the database later, as fast as
//       the database's spare capacity allows; a backlog of unflushed writes builds when it can't keep
//       up. If the cache crashes, the backlog and the last `flushSeconds` of writes are lost.
//   CDN: in front of everything (Clients → CDN → your edge). It answers `hitPct` % of requests from
//     servers near the users; only the rest reach what it points at. Managed: it never crashes.
//     Billed per 10,000 requests (data transfer is not counted, like everywhere in the Lab).
//     `live` content (a live video stream: every chunk is new) can't be served until your servers have
//     sent it, so their failures reach every viewer even though they carry only the misses.
//   Queue: asynchronous. The caller's request is done once the message is stored; whatever the
//     queue points at (workers) takes messages at its own capacity. When arrivals beat the workers
//     a backlog builds up (advance() tracks it) and drains once they catch up. Workers never get
//     more than they can handle, so a queue protects them from spikes; users never wait on them.
//
// Time-based traffic: a Clients component can follow a daily pattern from the catalogue
// (`patterns`: [hour, multiplier] points from 0 to 24, linear in between, two points at the same hour
// make a jump). Its rps setting is the rate at the peak (multiplier 1). The pattern repeats every
// simulated day, on the same clock the Lab shows.
//
// Autoscaling (catalogue `server.autoscaling`, design `autoscale: true`): a server group keeps its
// instances near `targetPct` % load, between `count` (minimum) and `maxCount`. New instances take
// `warmupMinutes` to boot; instances are removed only after load has stayed low for
// `scaleInMinutes`. You pay for the instances that are running.
//
// advance() moves a running simulation forward in simulated minutes and applies the crash policy
// from the catalogue (`crash` on a component): above `above` × capacity for `minutes` the component
// crashes; it is back after `downMinutes` (a Multi-AZ database fails over after `failoverMinutes`).

export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;
const SATURATED = 20; // latency multiplier once a component is past capacity

export const catalogue = (lab) => Object.fromEntries(lab.components.map((c) => [c.type, c]));
export const sizeOf = (comp, config) => comp.sizes?.find((s) => s.id === config?.size) || comp.sizes?.find((s) => s.id === comp.defaultSize);

// Traffic multiplier for a Clients config at a simulated minute (1 = its rps setting).
export function trafficAt(comp, config, minute = 0) {
  const p = patternOf(comp, config);
  if (!p) return 1;
  const h = (((minute / 60) % 24) + 24) % 24, pts = p.points;
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i][0] <= h) {
    const a = pts[i], b = pts[i + 1];
    return !b || b[0] === a[0] ? a[1] : a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]);
  }
  return pts[0][1];
}
export const patternOf = (comp, config) => comp?.patterns?.find((p) => p.id === config?.pattern) || null;
const steady = (comp, config) => { const p = patternOf(comp, config); return !p || p.points.every((x) => x[1] === p.points[0][1]); };
export const autoscaled = (comp, config) => !!(comp?.autoscaling && config?.autoscale);
export const scaleRange = (comp, config) => { const lo = config?.count || 1; return [lo, Math.max(lo, Math.min(comp.count.max, config?.maxCount ?? comp.autoscaling?.defaultMax ?? lo))]; };

export function defaultConfig(comp) {
  if (comp.type === 'client') return { rps: comp.rps.default, ...(comp.patterns ? { pattern: comp.patterns[0].id } : {}) };
  if (comp.type === 'cache') return { size: comp.defaultSize, hitPct: comp.hitPct.default, writePct: comp.writePct.default };
  if (comp.type === 'cdn') return { hitPct: comp.hitPct.default };
  if (comp.type === 'server') return { size: comp.defaultSize, count: comp.count.default, ...(comp.queriesPerRequest ? { queriesPerRequest: comp.queriesPerRequest.default } : {}) };
  if (comp.type === 'database') return { size: comp.defaultSize, multiAz: comp.multiAz.default };
  return {};
}

export function capacity(comp, config = {}) {
  if (comp.type === 'client') return Infinity;
  if (comp.type === 'apigw' || comp.type === 'lb' || comp.type === 'queue' || comp.type === 'cdn') return comp.limitRps;
  if (comp.type === 'cache') return sizeOf(comp, config).ops;
  if (comp.type === 'server') return sizeOf(comp, config).rps * (config.count || 1);
  if (comp.type === 'database') return sizeOf(comp, config).qps;
  return Infinity;
}

// Monthly cost in USD; the API Gateway is billed for the requests it serves.
export function monthlyCost(comp, config = {}, servedRps = 0) {
  if (comp.type === 'cdn') return (servedRps * SECONDS_PER_MONTH / 1e4) * comp.pricePer10k;
  if (comp.type === 'apigw' || comp.type === 'queue') return (servedRps * SECONDS_PER_MONTH / 1e6) * comp.pricePerMillion;
  if (comp.type === 'lb') return (comp.hourly + Math.max(1, servedRps / comp.rpsPerLcu) * comp.lcuHourly) * HOURS_PER_MONTH;
  if (comp.type === 'cache') return sizeOf(comp, config).hourly * HOURS_PER_MONTH;
  if (comp.type === 'server') return sizeOf(comp, config).hourly * HOURS_PER_MONTH * (config.count || 1);
  if (comp.type === 'database') return sizeOf(comp, config).hourly * HOURS_PER_MONTH * (config.multiAz ? comp.multiAz.priceFactor : 1);
  return 0;
}

// One-line description of a component's setup, e.g. "2 × m5.large".
export function summary(comp, config = {}) {
  if (comp.type === 'client') { const p = patternOf(comp, config); return `${(config.rps ?? 0).toLocaleString('en-US')} req/s${p && !steady(comp, config) ? ` · ${p.short}` : ''}`; }
  if (comp.type === 'apigw') return `limit ${comp.limitRps.toLocaleString('en-US')} req/s`;
  if (comp.type === 'lb') return 'spreads load evenly';
  if (comp.type === 'cdn') return `${pct(comp, config, 'hitPct')}% from the edge`;
  if (comp.type === 'queue') return 'async · workers pull';
  if (comp.type === 'cache') return `${sizeOf(comp, config).id} · ${pct(comp, config, 'hitPct')}% hits · ${pct(comp, config, 'writePct')}% writes`;
  if (comp.type === 'server') { const auto = autoscaled(comp, config), [lo, hi] = scaleRange(comp, config); return `${auto ? config.live ?? lo : config.count || 1} × ${sizeOf(comp, config).id}${auto ? ` · up to ${hi}` : ''}${comp.queriesPerRequest ? ` · ${qpr(comp, config)} q/req` : ''}`; }
  if (comp.type === 'database') return `${sizeOf(comp, config).id}${config.multiAz ? ' · Multi-AZ' : ''}`;
  return '';
}

const pct = (comp, config, key) => config?.[key] ?? comp[key].default;
// Share of a cache's queries that go on to the database: every write, and the reads it misses.
export const missShare = (comp, config) => { const w = pct(comp, config, 'writePct') / 100, h = pct(comp, config, 'hitPct') / 100; return w + (1 - w) * (1 - h); };
const choice = (comp, config, key) => (comp[key] ? (comp[key].options.some((o) => o.id === config?.[key]) ? config[key] : comp[key].default) : null);
// How a cache splits its queries: w = writes, readMiss = reads it has to fetch from the database
// (hit % scaled by `warm`, 0–1, while it warms up), back = write-back, fallThrough = on its way down
// queries go to the database. Without the optional catalogue fields: write-through, and failing.
export function cacheFlow(comp, config, warm = 1) {
  const w = pct(comp, config, 'writePct') / 100, h = (pct(comp, config, 'hitPct') / 100) * warm;
  return { w, readMiss: (1 - w) * (1 - h), hit: h, back: choice(comp, config, 'writePolicy') === 'back', fallThrough: choice(comp, config, 'onDown') === 'database' };
}
const qpr = (comp, config) => comp.queriesPerRequest ? (config?.queriesPerRequest ?? comp.queriesPerRequest.default) : 1;

// One steady pass with clients sending `factor` × their rps (1 + retries); `down` = crashed ids.
function pass(nodes, byId, out, order, cat, factor, down, backlog, warm) {
  const res = Object.fromEntries(nodes.map((n) => [n.id, { offered: 0, served: 0, dropped: 0, capacity: down.has(n.id) ? 0 : capacity(cat[n.type], n.config), utilisation: 0, latencyMs: 0, pathMs: 0, success: 1, cost: 0, reached: false, down: down.has(n.id), delivered: 0, writes: 0, hit: 0 }]));
  const flow = (node) => cacheFlow(cat.cache, node.config, Object.hasOwn(warm, node.id) ? warm[node.id] : 1);
  const groups = (id) => { const g = new Map(); for (const to of out.get(id)) { const t = byId.get(to).type; if (!g.has(t)) g.set(t, []); g.get(t).push(to); } return [...g.values()]; };
  for (const n of nodes) if (n.type === 'client') { res[n.id].offered = (n.config?.rps || 0) * factor; res[n.id].reached = true; }
  for (const id of order) {
    const r = res[id], node = byId.get(id), comp = cat[node.type];
    r.served = Math.min(r.offered, r.capacity);
    r.dropped = r.offered - r.served;
    r.utilisation = r.capacity === Infinity ? 0 : r.capacity === 0 ? (r.offered > 0 ? Infinity : 0) : r.offered / r.capacity;
    r.latencyMs = r.down ? 0 : comp.latencyMs ? (r.utilisation < 1 ? comp.latencyMs / (1 - Math.min(r.utilisation, 0.95)) : comp.latencyMs * SATURATED) : 0;
    // What this component passes on: a queue hands workers only what they can take (all of it
    // while there is a backlog to work through); everything else passes on what it served.
    let sent = r.served;
    // A cache's traffic to the database: read misses plus writes (write-through) or plus what it can
    // flush (write-back); everything when it is down and falls through.
    // A CDN passes on only the requests it can't answer from the edge.
    if (node.type === 'cdn') sent = r.served * (1 - pct(comp, node.config, 'hitPct') / 100);
    let toDb = null;
    if (node.type === 'cache') {
      const c = flow(node), dbs = groups(id).find((g) => byId.get(g[0]).type === 'database') || [];
      r.hit = c.hit;
      if (r.down && c.fallThrough) { r.dropped = 0; toDb = r.offered; }
      else if (c.back && !r.down) {
        const cap = dbs.reduce((a, to) => a + (down.has(to) ? 0 : capacity(cat.database, byId.get(to).config)), 0), reads = r.served * c.readMiss, spare = Math.max(0, cap - reads);
        r.writes = r.served * c.w;
        r.delivered = backlog.has(id) ? spare : Math.min(r.writes, spare);
        toDb = reads + r.delivered;
      } else toDb = r.served * (c.w + c.readMiss);
    }
    if (node.type === 'queue') {
      const take = groups(id).map((g) => g.reduce((a, to) => a + (down.has(to) ? 0 : capacity(cat[byId.get(to).type], byId.get(to).config)), 0));
      const cap = take.length ? Math.min(...take) : 0;
      sent = backlog.has(id) ? cap : Math.min(r.served, cap);
      r.delivered = sent;
    }
    for (const group of groups(id)) for (const to of group) {
      const t = byId.get(to).type;
      if (toDb !== null && t === 'database') { res[to].offered += toDb / group.length; if (toDb > 0) res[to].reached = true; continue; }
      const per = node.type === 'server' && (t === 'database' || t === 'cache') ? qpr(comp, node.config) : 1;
      res[to].offered += sent * per / group.length; if (sent > 0) res[to].reached = true;
    }
  }
  for (const id of [...order].reverse()) {
    const r = res[id];
    let path = r.latencyMs, ok = r.offered > 0 ? r.served / r.offered : (r.down ? 0 : 1);
    const node = byId.get(id);
    // A cache that is down but falls through fails nothing itself: the database answers.
    const c = node.type === 'cache' ? flow(node) : null;
    if (c && r.down && c.fallThrough) ok = 1;
    // A queue answers the caller once the message is stored: what happens after is not on the path.
    if (node.type !== 'queue') for (const group of groups(id)) {
      // A cache only waits for the database on the queries it passes on: read misses, plus writes
      // unless it is write-back (those are acknowledged by the cache); all of them while it is down.
      const share = node.type === 'cdn' ? 1 - pct(cat.cdn, node.config, 'hitPct') / 100 : c && byId.get(group[0]).type === 'database' ? (r.down && c.fallThrough ? 1 : c.readMiss + (c.back ? 0 : c.w)) : 1;
      const okShare = node.type === 'cdn' && node.config?.live ? 1 : share;
      path += share * group.reduce((s, to) => s + res[to].pathMs, 0) / group.length;
      ok *= 1 - okShare + okShare * group.reduce((s, to) => s + res[to].success, 0) / group.length;
    }
    r.pathMs = path; r.success = ok;
  }
  return res;
}

// Options: down / backlog (sets of ids), minute (simulated clock, for traffic patterns), counts
// ({server id: instances running} for autoscaled groups).
export function simulate(design, lab, { down = new Set(), backlog = new Set(), minute = 0, counts = {}, warm = {} } = {}) {
  const cat = catalogue(lab);
  // What each component is doing at this minute: Clients at their pattern's rate, autoscaled
  // server groups with the instances running now.
  const nodes = design.nodes.filter((n) => cat[n.type]).map((n) => {
    if (n.type === 'client') { const m = trafficAt(cat.client, n.config, minute); return m === 1 ? n : { ...n, config: { ...n.config, rps: (n.config?.rps || 0) * m } }; }
    if (n.type === 'server' && autoscaled(cat.server, n.config)) { const [lo, hi] = scaleRange(cat.server, n.config); const c = Object.hasOwn(counts, n.id) ? counts[n.id] : lo; return { ...n, config: { ...n.config, count: Math.min(hi, Math.max(lo, c)) } }; }
    return n;
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = design.edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to);
  const out = new Map(nodes.map((n) => [n.id, []]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) { out.get(e.from).push(e.to); indeg.set(e.to, indeg.get(e.to) + 1); }

  const problems = [];
  const clients = nodes.filter((n) => n.type === 'client');
  if (!clients.length) problems.push('Add Clients: traffic starts there.');
  for (const n of clients) if (!out.get(n.id).length) problems.push('Connect the Clients to the component they call first.');
  for (const n of nodes) if (n.type === 'client' && indeg.get(n.id) > 0) problems.push('Clients only send traffic; remove the arrows pointing into them.');

  const order = [];
  const deg = new Map(indeg);
  const queue = nodes.filter((n) => deg.get(n.id) === 0).map((n) => n.id);
  while (queue.length) { const id = queue.shift(); order.push(id); for (const to of out.get(id)) { deg.set(to, deg.get(to) - 1); if (deg.get(to) === 0) queue.push(to); } }
  if (order.length < nodes.length) problems.push('Remove the loop: arrows must not lead back to a component they came from.');

  // Retries: an attempt succeeds with probability s; with k retries a user request succeeds with
  // 1 − (1 − s)^(k+1) and costs 1 + (1 − s) + … attempts. Solved by iterating a few passes.
  const retries = lab.retries || 0;
  let res = null, s = 1, factor = 1;
  if (order.length === nodes.length) {
    for (let i = 0; i < 4; i++) {
      res = pass(nodes, byId, out, order, cat, factor, down, backlog, warm);
      const sent = clients.reduce((a, c) => a + res[c.id].offered, 0);
      s = sent ? clients.reduce((a, c) => a + res[c.id].offered * res[c.id].success, 0) / sent : 1;
      let f = 1, miss = 1; for (let k = 0; k < retries; k++) { miss *= 1 - s; f += miss; }
      if (Math.abs(f - factor) < 1e-6) break;
      factor = f;
    }
  } else res = pass(nodes, byId, out, [], cat, 1, down, backlog, warm);
  for (const n of nodes) res[n.id].cost = monthlyCost(cat[n.type], n.config, res[n.id].served);

  const users = clients.reduce((a, c) => a + (c.config?.rps || 0), 0);
  const total = {
    sentRps: users,
    attemptRps: users * factor,
    retryRps: users * (factor - 1),
    successPct: users ? 100 * (1 - Math.pow(1 - s, retries + 1)) : 0,
    latencyMs: users ? clients.reduce((a, c) => a + res[c.id].offered * res[c.id].pathMs, 0) / clients.reduce((a, c) => a + res[c.id].offered, 0) : 0,
    monthlyCost: nodes.reduce((a, n) => a + res[n.id].cost, 0),
    budget: lab.budget,
    bottleneck: nodes.filter((n) => n.type !== 'client' && res[n.id].reached && !res[n.id].down).sort((a, b) => res[b.id].utilisation - res[a.id].utilisation)[0]?.id || null,
    down: nodes.filter((n) => res[n.id].down).map((n) => n.id),
  };
  total.burnPerHour = total.monthlyCost / HOURS_PER_MONTH;
  total.clients = clients.length;
  total.overBudget = total.monthlyCost > lab.budget;
  const unreached = nodes.filter((n) => n.type !== 'client' && !res[n.id].reached && !res[n.id].down);
  if (!problems.length && unreached.length && !total.down.length) problems.push(`${unreached.length} component${unreached.length > 1 ? 's get' : ' gets'} no traffic: connect ${unreached.length > 1 ? 'them' : 'it'} or remove ${unreached.length > 1 ? 'them' : 'it'}.`);
  return { ok: problems.length === 0 || problems.every((p) => p.includes('no traffic')), problems, nodes: res, total };
}

// A running simulation: { t (simulated minutes), down: {id: minute it comes back}, over: {id:
// minutes spent above its crash threshold}, sent, served (user requests), events: [{t, id, kind}] }.
// backlog: {queue id: messages waiting}.
// scale: {server id: {n: instances running, pending: [{at, n}] booting, low: minutes below target}}.
const dict = (from) => Object.assign(Object.create(null), from);
// cold: {cache id: minute it came back empty}; lost: writes lost with write-back caches that crashed.
export const newRun = () => ({ t: 0, start: 0, down: dict(), over: dict(), backlog: dict(), scale: dict(), cold: dict(), lost: 0, sent: 0, served: 0, events: [] });
// How warm each restarted cache is at the run's time (0 = empty, 1 = back to its hit %).
const warmth = (run, lab) => { const m = catalogue(lab).cache?.warmupMinutes; return Object.fromEntries(Object.entries(run.cold || {}).map(([id, at]) => [id, m ? Math.min(1, Math.max(0, (run.t - at) / m)) : 1])); };
// The simulate() options for a run at a simulated minute.
export const runOptions = (run, minute, lab) => ({ warm: lab ? warmth(run, lab) : {}, down: new Set(Object.keys(run.down)), backlog: new Set(Object.keys(run.backlog || {}).filter((id) => run.backlog[id] > 0)), minute, counts: Object.fromEntries(Object.entries(run.scale || {}).map(([id, s]) => [id, s.n])) });

// Crash a component now, whatever its load (a challenge's chaos event). Same consequences as the
// crash policy: down for downMinutes (a Multi-AZ database fails over), a cache comes back cold, a
// write-back cache loses what it had not flushed. Components that never crash are left alone.
export function crashNow(design, lab, run, id) {
  const cat = catalogue(lab), n = design.nodes.find((x) => x.id === id), crash = n && cat[n.type]?.crash;
  if (!crash || Object.hasOwn(run.down, id)) return run;
  const st = { ...run, down: dict(run.down), over: dict(run.over), backlog: dict(run.backlog), cold: dict(run.cold), events: [...run.events] };
  if (n.type === 'cache') {
    delete st.cold[id];
    if (cacheFlow(cat.cache, n.config).back) {
      const r = simulate(design, lab, runOptions(run, (run.start || 0) * 60 + run.t, lab));
      const lost = (st.backlog[id] || 0) + (r.nodes[id]?.writes || 0) * (cat.cache.flushSeconds || 0);
      delete st.backlog[id];
      if (lost > 0) { st.lost = (st.lost || 0) + lost; st.events.push({ t: st.t, id, kind: 'writesLost', n: Math.round(lost) }); }
    }
  }
  const failover = n.type === 'database' && n.config?.multiAz && crash.failoverMinutes;
  st.down[id] = st.t + (failover ? crash.failoverMinutes : crash.downMinutes); st.over[id] = 0;
  st.events.push({ t: st.t, id, kind: failover ? 'failover' : 'crashed', forced: true });
  return st;
}

// Advance by `minutes`, jumping from event to event (load is steady between crashes/recoveries).
export function advance(design, lab, run, minutes) {
  const cat = catalogue(lab);
  // Per-node maps have no prototype: node ids are user data, and an id such as "__proto__" or
  // "constructor" must stay an ordinary key.
  const st = { ...run, down: dict(run.down), over: dict(run.over), backlog: dict(run.backlog), events: [...run.events], scale: dict(), cold: dict(run.cold), lost: run.lost || 0 };
  for (const [id, s] of Object.entries(run.scale || {})) st.scale[id] = { ...s, pending: s.pending.map((p) => ({ ...p })) };
  const nodes = design.nodes.filter((n) => cat[n.type]);
  const as = cat.server?.autoscaling;
  const scaled = nodes.filter((n) => n.type === 'server' && autoscaled(cat.server, n.config));
  for (const id of Object.keys(st.scale)) if (!scaled.some((n) => n.id === id)) delete st.scale[id];
  for (const n of scaled) { const [lo, hi] = scaleRange(cat.server, n.config); if (!Object.hasOwn(st.scale, n.id)) st.scale[n.id] = { n: lo, pending: [], low: 0 }; const s = st.scale[n.id]; s.n = Math.min(hi, Math.max(lo, s.n)); }
  // Load that changes with the clock (a traffic pattern, autoscaling) is followed in small steps;
  // steady load jumps straight from one event to the next.
  const varying = scaled.length > 0 || nodes.some((n) => n.type === 'client' && !steady(cat.client, n.config));
  const step = Math.max(1, minutes / 1500);
  for (const id of Object.keys(st.down)) if (!nodes.some((n) => n.id === id)) delete st.down[id];
  for (const id of Object.keys(st.backlog)) if (!nodes.some((n) => n.id === id && (n.type === 'queue' || n.type === 'cache'))) delete st.backlog[id];
  for (const id of Object.keys(st.cold)) if (!nodes.some((n) => n.id === id && n.type === 'cache')) delete st.cold[id];
  const warmup = cat.cache?.warmupMinutes;
  let left = minutes;
  for (let guard = 0; left > 1e-9 && guard < 4000; guard++) {
    const r = simulate(design, lab, runOptions(st, (st.start || 0) * 60 + st.t, lab));
    let dt = varying || Object.keys(st.cold).length ? Math.min(left, step) : left;
    // Autoscaling: launch instances as soon as load needs them (they arrive after the warm-up);
    // remove them once load has stayed low for scaleInMinutes.
    const want = {}, low = [];
    for (const n of scaled) {
      const s = st.scale[n.id], [lo, hi] = scaleRange(cat.server, n.config);
      const desired = Math.min(hi, Math.max(lo, Math.ceil(r.nodes[n.id].offered / (sizeOf(cat.server, n.config).rps * as.targetPct / 100) - 1e-9)));
      const coming = s.pending.reduce((a, p) => a + p.n, 0);
      want[n.id] = desired;
      if (desired > s.n + coming) { s.pending.push({ at: st.t + as.warmupMinutes, n: desired - s.n - coming }); s.low = 0; }
      else if (desired < s.n && !coming) { low.push(n.id); dt = Math.min(dt, Math.max(0, as.scaleInMinutes - s.low)); }
      else s.low = 0;
      for (const p of s.pending) dt = Math.min(dt, Math.max(0, p.at - st.t));
    }
    const hot = [];
    // queue backlogs change at (arrivals − deliveries) messages a second; stop when one empties
    const growth = {};
    for (const n of nodes) if (n.type === 'queue' || (n.type === 'cache' && cacheFlow(cat.cache, n.config).back)) {
      const g = n.type === 'queue' ? r.nodes[n.id].served - r.nodes[n.id].delivered : r.nodes[n.id].writes - r.nodes[n.id].delivered; growth[n.id] = g;
      if ((st.backlog[n.id] || 0) > 0 && g < 0) dt = Math.min(dt, st.backlog[n.id] / -g / 60);
    }
    for (const n of nodes) {
      const crash = cat[n.type].crash; if (!crash) continue;
      if (st.down[n.id] !== undefined) { dt = Math.min(dt, Math.max(0, st.down[n.id] - st.t)); continue; }
      if (r.nodes[n.id].utilisation > crash.above) { hot.push(n.id); dt = Math.min(dt, Math.max(0, crash.minutes - (st.over[n.id] || 0))); }
      else st.over[n.id] = 0;
    }
    st.sent += r.total.sentRps * dt * 60; st.served += r.total.sentRps * dt * 60 * r.total.successPct / 100;
    st.t += dt; left -= dt;
    for (const [id, g] of Object.entries(growth)) {
      const before = st.backlog[id] || 0, after = Math.max(0, before + g * dt * 60);
      const cache = nodes.find((n) => n.id === id)?.type === 'cache';
      if (before <= 1e-6 && after > 1e-6) st.events.push({ t: st.t - dt, id, kind: cache ? 'dirty' : 'backlog' });
      if (before > 1e-6 && after <= 1e-6) st.events.push({ t: st.t, id, kind: cache ? 'flushed' : 'drained' });
      if (after > 1e-6) st.backlog[id] = after; else delete st.backlog[id];
    }
    for (const id of hot) st.over[id] = (st.over[id] || 0) + dt;
    for (const n of scaled) {
      const s = st.scale[n.id], [, hi] = scaleRange(cat.server, n.config), before = s.n;
      for (const p of s.pending) if (p.at <= st.t + 1e-9) s.n += p.n;
      s.pending = s.pending.filter((p) => p.at > st.t + 1e-9); s.n = Math.min(hi, s.n);
      if (low.includes(n.id)) { s.low += dt; if (s.low >= as.scaleInMinutes - 1e-9) { s.n = want[n.id]; s.low = 0; } }
      if (s.n !== before) st.events.push({ t: st.t, id: n.id, kind: s.n > before ? 'scaledOut' : 'scaledIn', n: s.n });
    }
    for (const n of nodes) {
      const crash = cat[n.type].crash; if (!crash) continue;
      if (st.down[n.id] !== undefined && st.down[n.id] <= st.t + 1e-9) {
        delete st.down[n.id]; st.over[n.id] = 0;
        // a cache comes back empty and has to warm up again
        if (n.type === 'cache' && warmup) { st.cold[n.id] = st.t; st.events.push({ t: st.t, id: n.id, kind: 'cold' }); }
        else st.events.push({ t: st.t, id: n.id, kind: 'recovered' });
      }
      else if (st.down[n.id] === undefined && (st.over[n.id] || 0) >= crash.minutes - 1e-9) {
        const failover = n.type === 'database' && n.config?.multiAz && crash.failoverMinutes;
        if (n.type === 'cache') delete st.cold[n.id];
        // a write-back cache loses the writes it had not flushed yet
        if (n.type === 'cache' && cacheFlow(cat.cache, n.config).back) {
          const lost = (st.backlog[n.id] || 0) + r.nodes[n.id].writes * (cat.cache.flushSeconds || 0);
          delete st.backlog[n.id];
          if (lost > 0) { st.lost += lost; st.events.push({ t: st.t, id: n.id, kind: 'writesLost', n: Math.round(lost) }); }
        }
        st.down[n.id] = st.t + (failover ? crash.failoverMinutes : crash.downMinutes); st.over[n.id] = 0;
        st.events.push({ t: st.t, id: n.id, kind: failover ? 'failover' : 'crashed' });
      }
    }
  }
  // caches that have finished warming up
  for (const [id, at] of Object.entries(st.cold)) if (!warmup || st.t - at >= warmup - 1e-9) { delete st.cold[id]; st.events.push({ t: Math.min(st.t, at + (warmup || 0)), id, kind: 'warm' }); }
  if (st.events.length > 200) st.events = st.events.slice(-200);
  return st;
}
