// The component catalogue's helpers (no UI): sizes, engines, prices, traffic patterns and names.
//
// A design is {nodes:[{id,type,config}], edges:[{from,to}]}; the catalogue (content/lab.json, from
// GET /v1/lab) gives each component type its sizes, engines and prices, and eval.json (lab.eval) what the
// v2 evaluator (src/eval) needs on top. The steady-load simulator that once lived here (the v1 Lab and judge)
// was removed in evaluator phase 7: every problem and challenge is judged by src/eval.
//
// Time-based traffic: a Clients component can follow a daily pattern from the catalogue (`patterns`:
// [hour, multiplier] points from 0 to 24, linear in between, two points at the same hour make a jump). A
// test's rps is the rate at the peak (multiplier 1). The pattern repeats every simulated day.
//
// Database engines (catalogue `engines`, `defaultEngine` on Database; design `engine`): "instance" engines
// (PostgreSQL, MySQL, MongoDB, OpenSearch…) have sizes and are billed per hour, with a Multi-AZ standby and
// read replicas billed like the primary; "request" engines (DynamoDB, Cassandra/Keyspaces, S3) are billed per
// million reads and writes. An engine without its own sizes uses the component's.
export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;

export const catalogue = (lab) => Object.fromEntries(lab.components.map((c) => [c.type, c]));
// A database's engine ({id, label, capacity, …}), or null when the catalogue has no engines.
export const engineOf = (comp, config) => (comp?.engines ? comp.engines.find((e) => e.id === config?.engine) || comp.engines.find((e) => e.id === comp.defaultEngine) || comp.engines[0] : null);
// The sizes a component can have (a database's engine may bring its own), and its default.
export const sizesOf = (comp, config) => { const e = engineOf(comp, config); return e?.sizes ? [e.sizes, e.defaultSize] : [comp.sizes, comp.defaultSize]; };
export const sizeOf = (comp, config) => { const [list, def] = sizesOf(comp, config); return list?.find((s) => s.id === config?.size) || list?.find((s) => s.id === def); };
// Per request (DynamoDB, S3…) or per instance.
export const perRequest = (comp, config) => engineOf(comp, config)?.capacity === 'request';

// Traffic multiplier for a Clients config at a simulated minute (1 = the peak rate).
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
export const autoscaled = (comp, config) => !!(comp?.autoscaling && config?.autoscale);
export const scaleRange = (comp, config) => { const lo = config?.count || 1; return [lo, Math.max(lo, Math.min(comp.count.max, config?.maxCount ?? comp.autoscaling?.defaultMax ?? lo))]; };

// Monthly cost in USD of a component serving servedRps; the API Gateway, queue and CDN are billed per request.
export function monthlyCost(comp, config = {}, servedRps = 0) {
  if (comp.type === 'cdn') return (servedRps * SECONDS_PER_MONTH / 1e4) * comp.pricePer10k;
  if (comp.type === 'apigw' || comp.type === 'queue') return (servedRps * SECONDS_PER_MONTH / 1e6) * comp.pricePerMillion;
  if (comp.type === 'lb') return (comp.hourly + Math.max(1, servedRps / comp.rpsPerLcu) * comp.lcuHourly) * HOURS_PER_MONTH;
  if (comp.type === 'cache') return sizeOf(comp, config).hourly * HOURS_PER_MONTH;
  if (comp.type === 'server') return sizeOf(comp, config).hourly * HOURS_PER_MONTH * (config.count || 1);
  if (comp.type === 'database') {
    const e = engineOf(comp, config);
    if (e?.capacity === 'request') { const w = 0.2; return (servedRps * SECONDS_PER_MONTH / 1e6) * (w * e.writePerMillion + (1 - w) * e.readPerMillion); }
    return sizeOf(comp, config).hourly * HOURS_PER_MONTH * ((config.multiAz && e?.multiAz !== 'none' && e?.multiAz !== 'builtin' ? comp.multiAz.priceFactor : 1) + replicasOf(comp, config));
  }
  return 0;
}

// What a component is called: the name the user gave it, else its kind.
export const MAX_NAME = 40;
export const displayName = (comp, node) => node?.name || comp?.name || node?.type || '?';
// Read replicas of a database (0 without the catalogue field).
export const replicasOf = (comp, config) => (comp?.replicas && engineOf(comp, config)?.replicas !== false ? Math.max(0, Math.min(comp.replicas.max, Math.round(config?.replicas ?? comp.replicas.default) || 0)) : 0);

// One-line description of a component's setup, e.g. "2 × m5.large · 3 zones".
export function summary(comp, cfg = {}) {
  const t = comp?.type;
  if (t === 'server') { const auto = autoscaled(comp, cfg), [lo, hi] = scaleRange(comp, cfg); return `${auto ? lo : cfg.count || 1} × ${sizeOf(comp, cfg)?.id || ''}${auto ? ` · up to ${hi}` : ''}${cfg.zones > 1 ? ` · ${cfg.zones} zones` : ''}${cfg.sandbox ? ' · sandboxed' : ''}`; }
  if (t === 'database') {
    const e = engineOf(comp, cfg), n = replicasOf(comp, cfg);
    if (e?.capacity === 'request') return `${e.label} · on demand`;
    return `${e && e.id !== comp.defaultEngine ? `${e.label} · ` : ''}${sizeOf(comp, cfg)?.id || ''}${cfg.shards > 1 ? ` · ${cfg.shards} shards` : ''}${cfg.multiAz && e?.multiAz !== 'builtin' ? ' · Multi-AZ' : ''}${n ? ` · ${n} read replica${n > 1 ? 's' : ''}` : ''}`;
  }
  if (t === 'cache') return `${sizeOf(comp, cfg)?.id || ''}${cfg.nodes > 1 ? ` · ${cfg.nodes} nodes` : ''}${cfg.replica ? ' · replica' : ''}${cfg.writePolicy === 'back' ? ' · write-back' : ''}`;
  if (t === 'lb') return 'spreads load evenly';
  if (t === 'queue') return cfg.kind === 'fifo' ? 'FIFO · workers pull' : 'workers pull';
  return '';
}
