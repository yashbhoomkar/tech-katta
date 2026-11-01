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
// Each served request calls one component of every kind it points at (a server calls the
// database once); several components of the same kind share the traffic evenly (load balancing).
// End-to-end latency adds the calls made along the way; success is the share of requests that
// were served by every component they passed through.

export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;
const SATURATED = 20; // latency multiplier once a component is past capacity

export const catalogue = (lab) => Object.fromEntries(lab.components.map((c) => [c.type, c]));
const sizeOf = (comp, config) => comp.sizes?.find((s) => s.id === config?.size) || comp.sizes?.find((s) => s.id === comp.defaultSize);

export function defaultConfig(comp) {
  if (comp.type === 'client') return { rps: comp.rps.default };
  if (comp.type === 'server') return { size: comp.defaultSize, count: comp.count.default };
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
  if (comp.type === 'client') return `${(config.rps ?? 0).toLocaleString('en-IN')} req/s`;
  if (comp.type === 'apigw') return `limit ${comp.limitRps.toLocaleString('en-IN')} req/s`;
  if (comp.type === 'server') return `${config.count || 1} × ${sizeOf(comp, config).id}`;
  if (comp.type === 'database') return `${sizeOf(comp, config).id}${config.multiAz ? ' · Multi-AZ' : ''}`;
  return '';
}

export function simulate(design, lab) {
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

  // Topological order (Kahn); a cycle means a request could loop forever.
  const order = [];
  const deg = new Map(indeg);
  const queue = nodes.filter((n) => deg.get(n.id) === 0).map((n) => n.id);
  while (queue.length) { const id = queue.shift(); order.push(id); for (const to of out.get(id)) { deg.set(to, deg.get(to) - 1); if (deg.get(to) === 0) queue.push(to); } }
  if (order.length < nodes.length) problems.push('Remove the loop: arrows must not lead back to a component they came from.');

  const res = Object.fromEntries(nodes.map((n) => [n.id, { offered: 0, served: 0, dropped: 0, capacity: capacity(cat[n.type], n.config), utilisation: 0, latencyMs: 0, pathMs: 0, success: 1, cost: 0, reached: false }]));
  const groups = (id) => { const g = new Map(); for (const to of out.get(id)) { const t = byId.get(to).type; if (!g.has(t)) g.set(t, []); g.get(t).push(to); } return [...g.values()]; };

  if (order.length === nodes.length) {
    for (const c of clients) { res[c.id].offered = c.config?.rps || 0; res[c.id].reached = true; }
    for (const id of order) {
      const r = res[id], comp = cat[byId.get(id).type];
      r.served = Math.min(r.offered, r.capacity);
      r.dropped = r.offered - r.served;
      r.utilisation = r.capacity === Infinity ? 0 : r.offered / r.capacity;
      r.latencyMs = comp.latencyMs ? (r.utilisation < 1 ? comp.latencyMs / (1 - Math.min(r.utilisation, 0.95)) : comp.latencyMs * SATURATED) : 0;
      for (const group of groups(id)) for (const to of group) { res[to].offered += r.served / group.length; if (r.served > 0) res[to].reached = true; }
    }
    // End-to-end latency and success, from the deepest components back to the Clients.
    for (const id of [...order].reverse()) {
      const r = res[id];
      let path = r.latencyMs, ok = r.offered > 0 ? r.served / r.offered : 1;
      for (const group of groups(id)) {
        path += group.reduce((s, to) => s + res[to].pathMs, 0) / group.length;
        ok *= group.reduce((s, to) => s + res[to].success, 0) / group.length;
      }
      r.pathMs = path; r.success = ok;
    }
  }
  for (const n of nodes) res[n.id].cost = monthlyCost(cat[n.type], n.config, res[n.id].served);

  const sent = clients.reduce((s, c) => s + res[c.id].offered, 0);
  const total = {
    sentRps: sent,
    successPct: sent ? 100 * clients.reduce((s, c) => s + res[c.id].offered * res[c.id].success, 0) / sent : 0,
    latencyMs: sent ? clients.reduce((s, c) => s + res[c.id].offered * res[c.id].pathMs, 0) / sent : 0,
    monthlyCost: nodes.reduce((s, n) => s + res[n.id].cost, 0),
    budget: lab.budget,
    bottleneck: nodes.filter((n) => n.type !== 'client' && res[n.id].reached).sort((a, b) => res[b.id].utilisation - res[a.id].utilisation)[0]?.id || null,
  };
  total.overBudget = total.monthlyCost > lab.budget;
  const unreached = nodes.filter((n) => n.type !== 'client' && !res[n.id].reached);
  if (!problems.length && unreached.length) problems.push(`${unreached.length} component${unreached.length > 1 ? 's get' : ' gets'} no traffic: connect ${unreached.length > 1 ? 'them' : 'it'} or remove ${unreached.length > 1 ? 'them' : 'it'}.`);
  return { ok: problems.length === 0 || problems.every((p) => p.includes('no traffic')), problems, nodes: res, total };
}
