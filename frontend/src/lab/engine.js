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
// advance() moves a running simulation forward in simulated minutes and applies the crash policy
// from the catalogue (`crash` on a component): above `above` × capacity for `minutes` the component
// crashes; it is back after `downMinutes` (a Multi-AZ database fails over after `failoverMinutes`).

export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;
const SATURATED = 20; // latency multiplier once a component is past capacity

export const catalogue = (lab) => Object.fromEntries(lab.components.map((c) => [c.type, c]));
const sizeOf = (comp, config) => comp.sizes?.find((s) => s.id === config?.size) || comp.sizes?.find((s) => s.id === comp.defaultSize);

export function defaultConfig(comp) {
  if (comp.type === 'client') return { rps: comp.rps.default };
  if (comp.type === 'server') return { size: comp.defaultSize, count: comp.count.default, ...(comp.queriesPerRequest ? { queriesPerRequest: comp.queriesPerRequest.default } : {}) };
  if (comp.type === 'database') return { size: comp.defaultSize, multiAz: comp.multiAz.default };
  return {};
}

export function capacity(comp, config = {}) {
  if (comp.type === 'client') return Infinity;
  if (comp.type === 'apigw') return comp.limitRps;
  if (comp.type === 'server') return sizeOf(comp, config).rps * (config.count || 1);
  if (comp.type === 'database') return sizeOf(comp, config).qps;
  return Infinity;
}

// Monthly cost in USD; the API Gateway is billed for the requests it serves.
export function monthlyCost(comp, config = {}, servedRps = 0) {
  if (comp.type === 'apigw') return (servedRps * SECONDS_PER_MONTH / 1e6) * comp.pricePerMillion;
  if (comp.type === 'server') return sizeOf(comp, config).hourly * HOURS_PER_MONTH * (config.count || 1);
  if (comp.type === 'database') return sizeOf(comp, config).hourly * HOURS_PER_MONTH * (config.multiAz ? comp.multiAz.priceFactor : 1);
  return 0;
}

// One-line description of a component's setup, e.g. "2 × m5.large".
export function summary(comp, config = {}) {
  if (comp.type === 'client') return `${(config.rps ?? 0).toLocaleString('en-US')} req/s`;
  if (comp.type === 'apigw') return `limit ${comp.limitRps.toLocaleString('en-US')} req/s`;
  if (comp.type === 'server') return `${config.count || 1} × ${sizeOf(comp, config).id}${comp.queriesPerRequest ? ` · ${qpr(comp, config)} q/req` : ''}`;
  if (comp.type === 'database') return `${sizeOf(comp, config).id}${config.multiAz ? ' · Multi-AZ' : ''}`;
  return '';
}

const qpr = (comp, config) => comp.queriesPerRequest ? (config?.queriesPerRequest ?? comp.queriesPerRequest.default) : 1;

// One steady pass with clients sending `factor` × their rps (1 + retries); `down` = crashed ids.
function pass(nodes, byId, out, order, cat, factor, down) {
  const res = Object.fromEntries(nodes.map((n) => [n.id, { offered: 0, served: 0, dropped: 0, capacity: down.has(n.id) ? 0 : capacity(cat[n.type], n.config), utilisation: 0, latencyMs: 0, pathMs: 0, success: 1, cost: 0, reached: false, down: down.has(n.id) }]));
  const groups = (id) => { const g = new Map(); for (const to of out.get(id)) { const t = byId.get(to).type; if (!g.has(t)) g.set(t, []); g.get(t).push(to); } return [...g.values()]; };
  for (const n of nodes) if (n.type === 'client') { res[n.id].offered = (n.config?.rps || 0) * factor; res[n.id].reached = true; }
  for (const id of order) {
    const r = res[id], node = byId.get(id), comp = cat[node.type];
    r.served = Math.min(r.offered, r.capacity);
    r.dropped = r.offered - r.served;
    r.utilisation = r.capacity === Infinity ? 0 : r.capacity === 0 ? (r.offered > 0 ? Infinity : 0) : r.offered / r.capacity;
    r.latencyMs = r.down ? 0 : comp.latencyMs ? (r.utilisation < 1 ? comp.latencyMs / (1 - Math.min(r.utilisation, 0.95)) : comp.latencyMs * SATURATED) : 0;
    for (const group of groups(id)) for (const to of group) {
      const per = node.type === 'server' && byId.get(to).type === 'database' ? qpr(comp, node.config) : 1;
      res[to].offered += r.served * per / group.length; if (r.served > 0) res[to].reached = true;
    }
  }
  for (const id of [...order].reverse()) {
    const r = res[id];
    let path = r.latencyMs, ok = r.offered > 0 ? r.served / r.offered : (r.down ? 0 : 1);
    for (const group of groups(id)) {
      path += group.reduce((s, to) => s + res[to].pathMs, 0) / group.length;
      ok *= group.reduce((s, to) => s + res[to].success, 0) / group.length;
    }
    r.pathMs = path; r.success = ok;
  }
  return res;
}

export function simulate(design, lab, { down = new Set() } = {}) {
  const cat = catalogue(lab);
  const nodes = design.nodes.filter((n) => cat[n.type]);
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
      res = pass(nodes, byId, out, order, cat, factor, down);
      const sent = clients.reduce((a, c) => a + res[c.id].offered, 0);
      s = sent ? clients.reduce((a, c) => a + res[c.id].offered * res[c.id].success, 0) / sent : 1;
      let f = 1, miss = 1; for (let k = 0; k < retries; k++) { miss *= 1 - s; f += miss; }
      if (Math.abs(f - factor) < 1e-6) break;
      factor = f;
    }
  } else res = pass(nodes, byId, out, [], cat, 1, down);
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
export const newRun = () => ({ t: 0, start: 0, down: {}, over: {}, sent: 0, served: 0, events: [] });

// Advance by `minutes`, jumping from event to event (load is steady between crashes/recoveries).
export function advance(design, lab, run, minutes) {
  const cat = catalogue(lab);
  const st = { ...run, down: { ...run.down }, over: { ...run.over }, events: [...run.events] };
  const nodes = design.nodes.filter((n) => cat[n.type]);
  for (const id of Object.keys(st.down)) if (!nodes.some((n) => n.id === id)) delete st.down[id];
  let left = minutes;
  for (let guard = 0; left > 1e-9 && guard < 500; guard++) {
    const r = simulate(design, lab, { down: new Set(Object.keys(st.down)) });
    let dt = left;
    const hot = [];
    for (const n of nodes) {
      const crash = cat[n.type].crash; if (!crash) continue;
      if (st.down[n.id] !== undefined) { dt = Math.min(dt, Math.max(0, st.down[n.id] - st.t)); continue; }
      if (r.nodes[n.id].utilisation > crash.above) { hot.push(n.id); dt = Math.min(dt, Math.max(0, crash.minutes - (st.over[n.id] || 0))); }
      else st.over[n.id] = 0;
    }
    st.sent += r.total.sentRps * dt * 60; st.served += r.total.sentRps * dt * 60 * r.total.successPct / 100;
    st.t += dt; left -= dt;
    for (const id of hot) st.over[id] = (st.over[id] || 0) + dt;
    for (const n of nodes) {
      const crash = cat[n.type].crash; if (!crash) continue;
      if (st.down[n.id] !== undefined && st.down[n.id] <= st.t + 1e-9) { delete st.down[n.id]; st.over[n.id] = 0; st.events.push({ t: st.t, id: n.id, kind: 'recovered' }); }
      else if (st.down[n.id] === undefined && (st.over[n.id] || 0) >= crash.minutes - 1e-9) {
        const failover = n.type === 'database' && n.config?.multiAz && crash.failoverMinutes;
        st.down[n.id] = st.t + (failover ? crash.failoverMinutes : crash.downMinutes); st.over[n.id] = 0;
        st.events.push({ t: st.t, id: n.id, kind: failover ? 'failover' : 'crashed' });
      }
    }
  }
  if (st.events.length > 200) st.events = st.events.slice(-200);
  return st;
}
