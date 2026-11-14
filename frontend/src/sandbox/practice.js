// The sandbox canvas (context 36, §5.12): a problem with nothing decided. The visitor chooses the traffic and what goes
// wrong; this file turns those choices into the practice object the v2 evaluator already runs, so the sandbox needs no
// judge code of its own. Two calls: read an item by its id, and save one. One load test: the visitor's traffic, with
// the visitor's failures, checked for the calls' targets, crashes and lost writes. Nothing here is scored.

export const PATTERNS = ['steady', 'meals', 'sale', 'match', 'monday', 'rush9', 'noon'];
// a steady hour at 8 pm; every other pattern is a whole day
export const hoursOf = (pattern) => (pattern === 'steady' ? 1 : 24);
// faults start on a whole tick: 1 minute up to 6 hours, else 5 (evaluator.md §8.13)
export const tickOf = (hours) => (hours <= 6 ? 1 : 5);

export const SCHEMA = { tables: [{ name: 'items', fields: [{ name: 'id', type: 'string' }, { name: 'data', type: 'string' }], key: ['id'] }] };

export const DEFAULTS = { rps: 2000, pattern: 'steady', readShare: 0.9, itemKb: 2, p99Ms: 200, faults: [] };

const clamp = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);

// The settings, repaired: any value out of range is brought back into it.
export function cleanSettings(s = {}) {
  const pattern = PATTERNS.includes(s.pattern) ? s.pattern : DEFAULTS.pattern, hours = hoursOf(pattern), tick = tickOf(hours);
  const faults = (Array.isArray(s.faults) ? s.faults : []).slice(0, 6).map((f) => {
    const minute = Math.round(clamp(f.minute, 0, hours * 60 - tick, 10) / tick) * tick;
    if (f.kind === 'crash' && typeof f.type === 'string') return { kind: 'crash', type: f.type, ...(typeof f.node === 'string' ? { node: f.node } : {}), minute };
    if (f.kind === 'zoneDown') return { kind: 'zoneDown', minute, minutes: clamp(f.minutes, tick, 120, 15) };
    if (f.kind === 'spike') return { kind: 'spike', minute, minutes: clamp(f.minutes, tick, 120, 15), factor: clamp(f.factor, 1.5, 10, 2), mark: true };
    if (f.kind === 'cacheFlush') return { kind: 'cacheFlush', minute };
    return null;
  }).filter(Boolean);
  return { rps: Math.round(clamp(s.rps, 1, 2000000, DEFAULTS.rps)), pattern, readShare: clamp(s.readShare, 0, 1, DEFAULTS.readShare), itemKb: clamp(s.itemKb, 0.1, 5000, DEFAULTS.itemKb), p99Ms: Math.round(clamp(s.p99Ms, 10, 10000, DEFAULTS.p99Ms)), faults };
}

export function sandboxPractice(settings) {
  const s = cleanSettings(settings), hours = hoursOf(s.pattern), bytes = Math.round(s.itemKb * 1000);
  const read = { id: 'read', name: 'Read an item', kind: 'read', share: s.readShare, sample: true, request: { method: 'GET', path: '/items/a1' }, bytesOut: bytes, keys: { entity: 'items', skew: 'zipf', active: 1000000 }, steps: [{ id: 's1', op: 'get', entity: 'items', by: { id: 'a1' }, fields: ['data'] }], respond: { status: 200, body: { data: '$s1.data' } }, slo: { availability: 99.9, p99Ms: s.p99Ms } };
  const write = { id: 'write', name: 'Save an item', kind: 'write', share: Math.round((1 - s.readShare) * 1000) / 1000, sample: true, request: { method: 'POST', path: '/items', body: { data: 'hello' } }, steps: [{ id: 's1', op: 'put', entity: 'items', unique: ['id'], values: { id: 'c3', data: 'hello' } }], respond: { status: 201, body: { id: '$s1.id' } }, slo: { availability: 99.9, p99Ms: s.p99Ms * 2 }, durable: true };
  return {
    v: 2,
    brief: 'Your own traffic: reads and saves of items by their id.',
    entities: { items: { rows: 10000000, rowBytes: bytes, fields: { id: 'string', data: 'string' }, sample: [{ id: 'a1', data: 'hello' }, { id: 'b2', data: 'world' }] } },
    operations: [read, write].filter((o) => o.share > 0 || o.id === 'read'),
    tests: [{ id: 'sandbox', name: 'Your traffic', desc: '', sample: true, hours, startHour: hours === 1 ? 20 : 0, traffic: { rps: s.rps, pattern: s.pattern }, faults: s.faults, checks: [{ kind: 'slo' }, { kind: 'noCrash' }, { kind: 'noLostWrites' }] }],
    start: { nodes: [{ id: 'clients', type: 'client', x: 0, y: 0, config: {} }], edges: [] },
  };
}

// Starting designs: shapes worth trying, not answers to any problem on the site.
const db = (id, x, y, extra = {}) => ({ id, type: 'database', x, y, config: { engine: 'postgres', size: 'db.m5.large', schema: SCHEMA, ...extra } });
const clients = { id: 'clients', type: 'client', x: 0, y: 0, config: {} };
export const TEMPLATES = [
  { id: 'blank', name: 'Blank: only the Clients', nodes: [clients], edges: [] },
  { id: 'basic', name: 'Clients, load balancer, servers, database', nodes: [clients, { id: 'lb', type: 'lb', x: 240, y: 0, config: {} }, { id: 'app', type: 'server', x: 480, y: 0, config: { size: 'm5.large', count: 2 } }, db('db', 720, 0)], edges: [{ from: 'clients', to: 'lb' }, { from: 'lb', to: 'app' }, { from: 'app', to: 'db' }] },
  { id: 'cache', name: 'Read-heavy: a cache in front of the database', nodes: [clients, { id: 'lb', type: 'lb', x: 240, y: 0, config: {} }, { id: 'app', type: 'server', x: 480, y: 0, config: { size: 'm5.large', count: 2 } }, { id: 'cache', type: 'cache', x: 720, y: -120, config: { size: 'cache.t3.medium', nodes: 1 } }, db('db', 960, 0)], edges: [{ from: 'clients', to: 'lb' }, { from: 'lb', to: 'app' }, { from: 'app', to: 'cache' }, { from: 'cache', to: 'db' }] },
  { id: 'cdn', name: 'A CDN in front of everything', nodes: [clients, { id: 'cdn', type: 'cdn', x: 240, y: 0, config: {} }, { id: 'lb', type: 'lb', x: 480, y: 0, config: {} }, { id: 'app', type: 'server', x: 720, y: 0, config: { size: 'm5.large', count: 2 } }, db('db', 960, 0)], edges: [{ from: 'clients', to: 'cdn' }, { from: 'cdn', to: 'lb' }, { from: 'lb', to: 'app' }, { from: 'app', to: 'db' }] },
  { id: 'replicas', name: 'Standby and read replicas, three zones', nodes: [clients, { id: 'lb', type: 'lb', x: 240, y: 0, config: {} }, { id: 'app', type: 'server', x: 480, y: 0, config: { size: 'm5.large', count: 3, zones: 3 } }, db('db', 720, 0, { multiAz: true, replicas: 2 })], edges: [{ from: 'clients', to: 'lb' }, { from: 'lb', to: 'app' }, { from: 'app', to: 'db' }] },
];
