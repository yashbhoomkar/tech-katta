// Stage 1: compile (design + problem → plans), evaluator.md §7.
//
//   compile(design, lab, practice) → { ok, design, graph, plans: {opId: Plan}, system: [], copies, errors, warnings }
//
// `ok` is false only when nothing can be simulated (no Clients, a loop…). An operation that can't be planned gets a
// plan with ok: false and an error; its tests fail with that message. Pure: no randomness, no clock, input order.
//
// System plans (change data capture) are in `system`: [{ op, plan }], simulated like operations with no clients.
import { cleanDesign2, configOf, evalCatalogue } from './design.js';
import { buildGraph } from './graph.js';
import { accessPath, fieldMatcher, fitOf, tablesOf, holds, stepFields, isRead, isWrite } from './access.js';
import { PLAN, cap1 } from './words.js';
import { monthlyCost } from '../lab/engine.js';

const PASS = new Set(['cdn', 'apigw', 'lb']);
const MAX_SERVICES = 4, MAX_QUEUES = 3;

export function prefer(op) {
  if (op.source === 'schedule') return ['server', 'queue'];   // a scheduler starts the job on a Service, or through a queue
  if (op.kind === 'connect') return ['lb', 'apigw', 'realtime'];
  if (op.cacheable || op.live) return ['cdn', 'apigw', 'lb', 'server'];
  return ['apigw', 'lb', 'server', 'cdn'];
}
// Does an arrow carry this operation? (§7.3)
export const carries = (edge, op) => !edge?.carries || edge.carries.includes(op.id) || (edge.carries.includes('reads') && op.kind === 'read') || (edge.carries.includes('writes') && op.kind === 'write');

const err = (code, message, extra = {}) => ({ code, message, ...extra });

export function compile(design, lab, practice) {
  const ops = Array.isArray(practice?.operations) ? practice.operations : [];
  const d = cleanDesign2(design, lab, ops.map((o) => o.id));
  const g = buildGraph(d, lab);
  const cat = evalCatalogue(lab), W = lab.eval.work, limits = lab.eval.limits;
  const result = { ok: true, design: d, graph: g, plans: Object.create(null), system: [], copies: [], errors: [], warnings: [] };
  if (g.errors.length) { result.ok = false; result.errors = g.errors; return result; }

  const match = fieldMatcher(practice);
  const order = new Map(d.nodes.map((n, i) => [n.id, i]));
  const node = (id) => g.byId.get(id), type = (id) => g.byId.get(id)?.type;
  const name = (id) => { const n = node(id); return n?.name || cat[n?.type]?.name || n?.type || id; };
  const edgeOf = new Map(d.edges.map((e) => [`${e.from}\u0000${e.to}`, e]));
  const flowOut = (id, op) => (type(id) === 'database' ? [] : g.out.get(id).filter((to) => carries(edgeOf.get(`${id}\u0000${to}`), op)));

  // ---- what a handler reaches (§7.5) ----------------------------------------------------------------------
  // sync: h → (server | cache)* → store, at most 4 Services deep. A cache is a store only through its structures,
  // and also a step on the way to a database (look-aside).
  function syncReach(h, op) {
    const out = [];
    const walk = (id, path, services) => {
      for (const to of flowOut(id, op)) {
        if (path.includes(to)) continue;
        const t = type(to), p = [...path, to];
        if (t === 'database') out.push({ store: to, path: p });
        else if (t === 'cache') { out.push({ store: to, path: p }); walk(to, p, services); }
        else if (t === 'external') out.push({ store: to, path: p });
        else if (t === 'server' && services < MAX_SERVICES) walk(to, p, services + 1);
      }
    };
    walk(h, [h], 1);
    return out;
  }
  // async: h → … → queue → worker, then the worker's sync reach (and its own queues, at most 3 deep).
  function asyncReach(h, op, depth = 1) {
    const out = [];
    const walk = (id, path, services) => {
      for (const to of flowOut(id, op)) {
        if (path.includes(to)) continue;
        const t = type(to);
        if ((t === 'queue' || t === 'stream') && depth <= MAX_QUEUES) {
          for (const w of flowOut(to, op)) {
            // a queue's workers are Services; a stream's consumers may also be stream processors (phase 6)
            if (!(type(w) === 'server' || (t === 'stream' && type(w) === 'processor')) || path.includes(w)) continue;
            const pre = [...path, to, w];
            for (const r of syncReach(w, op)) out.push({ store: r.store, path: [...pre, ...r.path.slice(1)], queue: to, worker: w, qi: path.length });
            for (const r of asyncReach(w, op, depth + 1)) out.push({ ...r, path: [...pre, ...r.path.slice(1)], queue: to, worker: w, qi: path.length });
          }
        } else if (t === 'server' && services < MAX_SERVICES) walk(to, [...path, to], services + 1);
      }
    };
    walk(h, [h], 1);
    return out;
  }
  // stores the consumers of a database's change stream reach: a copy there is fed by change data capture (§7.6),
  // so the handler that writes the database does not write it as well
  const cdcReach = (D) => {
    const out = new Set();
    if (type(D) !== 'database') return out;
    for (const q of g.out.get(D)) if (type(q) === 'queue' || type(q) === 'stream') for (const w of g.out.get(q)) if (type(w) === 'server') for (const r of syncReach(w, {})) if (r.store !== D) out.add(r.store);
    return out;
  };
  // Shards (§5.6 database): a step that names the table's shard key (default the first field of its key) goes to one shard; one that
  // doesn't asks every shard, so its work is multiplied by the number of shards.
  // (a transaction goes to one shard when its first part does: the others are on the same shard or it is refused)
  const routedOn = (table, step) => {
    const keyF = table.shardKey?.length ? table.shardKey : (table.key || []).slice(0, 1);   // default: the first key field
    const given = Object.keys(step.by || step.key || step.values || step.where || {});
    return keyF.length > 0 && keyF.every((k) => given.some((g) => g === k || match(g, k)));
  };
  const shardRoute = (hop, store, table, step, parts) => {
    const n = node(store); if (type(store) !== 'database') return;
    const sh = configOf(n, lab).shards || 1; if (sh <= 1 || !table) return;
    hop.shardRouted = step.op === 'tx' && parts?.length ? routedOn(parts[0].table, parts[0].step) : routedOn(table, step);
    if (!hop.shardRouted) hop.work *= sh;
  };
  const viaCache = (path) => (path.length >= 3 && type(path.at(-1)) === 'database' && type(path.at(-2)) === 'cache' ? path.at(-2) : null);
  const better = (a, b) => (a.a.work - b.a.work) || (a.e.path.length - b.e.path.length) || (order.get(a.e.store) - order.get(b.e.store)) || (a.ti - b.ti);

  // Candidates for a step among reach entries: [{e, t, ti, a, miss}] split by whether the path works.
  function candidates(step, entries) {
    const ok = [], partial = [], fails = [];
    for (const e of entries) tablesOf(node(e.store), lab).forEach((t, ti) => {
      const fit = fitOf(t, step, match);
      if (!fit.have.length) return;
      const a = accessPath(node(e.store), t, step, practice, lab, match);
      const c = { e, t, ti, a, miss: fit.miss };
      if (!a.ok) fails.push(c); else (fit.miss.length ? partial : ok).push(c);
    });
    return { ok: ok.sort(better), partial: partial.sort(better), fails: fails.sort((x, y) => (x.miss.length - y.miss.length) || better({ ...x, a: { work: 0 } }, { ...y, a: { work: 0 } })) };
  }
  const queueOf = (entries) => entries.find((e) => e.queue)?.queue;
  function nothingFound(step, h, sR) {
    const fields = stepFields(step);
    const dbs = sR.filter((e) => type(e.store) === 'database' || tablesOf(node(e.store), lab).length);
    if (!dbs.length) return err('E_NO_DATABASE', PLAN.E_NO_DATABASE(name(h), step.entity));
    if (!dbs.some((e) => tablesOf(node(e.store), lab).length)) return err('E_NO_SCHEMA', PLAN.E_NO_SCHEMA(step.entity, fields));
    return err('E_NO_STORE', PLAN.E_NO_STORE(name(h), step.entity, fields));
  }

  // ---- binding one step from handler h (§7.5) --------------------------------------------------------------
  function bindRead(op, h, step, sR, aR) {
    // a read that can wait (phase 6) is done by the worker behind a queue when one reaches the store
    if (step.timing === 'defer') {
      const later = candidates(step, aR).ok[0];
      if (later) return { step, store: later.e.store, table: later.t, a: later.a, path: later.e.path, viaCache: viaCache(later.e.path), async: true, queue: later.e.queue, worker: later.e.worker, qi: later.e.qi };
    }
    const c = candidates(step, sR);
    const best = c.ok[0] || c.partial[0];
    if (!best) {
      const behind = candidates(step, aR);
      if (behind.ok.length || behind.partial.length) return { error: err('E_READ_BEHIND_QUEUE', PLAN.E_READ_BEHIND_QUEUE(step.entity, name((behind.ok[0] || behind.partial[0]).e.queue)), { step: step.id }) };
      if (c.fails.length) return { error: err('E_NO_PATH', c.fails[0].a.why, { node: c.fails[0].e.store, step: step.id }) };
      return { error: { ...nothingFound(step, h, sR), step: step.id } };
    }
    // the same store may be reached directly and through a look-aside cache (§7.5 rule 3)
    const paths = sR.filter((e) => e.store === best.e.store).sort((x, y) => x.path.length - y.path.length);
    const direct = paths.find((e) => !viaCache(e.path)), cached = paths.find((e) => viaCache(e.path));
    const e = op.consistency === 'strong' ? (direct || cached) : (cached || direct);
    return { step, store: e.store, table: best.t, a: best.a, path: e.path, viaCache: viaCache(e.path), missing: best.miss.length ? best.miss : undefined };
  }
  function bindWrite(op, h, step, sR, aR) {
    const defer = step.timing === 'defer';
    const sync = candidates(step, sR), later = candidates(step, aR);
    const pool = defer ? [...later.ok, ...sync.ok] : sync.ok;
    const best = pool[0];
    if (!best) {
      if (!defer && (later.ok.length)) { const b = later.ok[0]; return { error: err('E_SYNC_BEHIND_QUEUE', PLAN.E_SYNC_BEHIND_QUEUE(`${step.op === 'put' ? 'Storing' : 'Changing'} ${step.entity}`, name(b.e.store), name(b.e.queue)), { step: step.id }) }; }
      const partial = defer ? (later.partial[0] || sync.partial[0]) : sync.partial[0];
      if (partial) return { error: err('E_MISSING_FIELDS', PLAN.E_MISSING_FIELDS(partial.t.name, partial.miss), { node: partial.e.store, step: step.id }) };
      const fail = (defer ? [...later.fails, ...sync.fails] : sync.fails)[0];
      if (fail) return { error: err('E_NO_PATH', fail.a.why, { node: fail.e.store, step: step.id }) };
      return { error: { ...nothingFound(step, h, defer ? [...sR, ...aR] : sR), step: step.id } };
    }
    return { step, store: best.e.store, table: best.t, a: best.a, path: best.e.path, viaCache: viaCache(best.e.path), async: !!best.e.queue, queue: best.e.queue, worker: best.e.worker, qi: best.e.qi };
  }
  function bindTx(op, h, step, sR, aR) {
    const parts = (step.steps || []).map((s) => bindWrite(op, h, { ...s, timing: step.timing }, sR, aR));
    const bad = parts.find((p) => p.error); if (bad) return bad;
    const other = parts.find((p) => p.store !== parts[0].store);
    if (other) return { error: err('E_TX_SPLIT', PLAN.E_TX_SPLIT(name(parts[0].store), name(other.store)), { step: step.id }) };
    const store = node(parts[0].store);
    if (!lab.eval.engines?.[configOf(store, lab).engine]?.caps?.includes('tx') || store.type !== 'database') return { error: err('E_NO_TX', PLAN.E_NO_TX(name(store.id)), { node: store.id, step: step.id }) };
    const work = parts.reduce((s, p) => s + p.a.work, 0) * W.txFactor;
    return { ...parts[0], step, parts, a: { ...parts[0].a, how: 'transaction', work, query: parts.map((p) => p.a.query).join('\n') } };
  }

  // A call to another company (§7.5): an arrow, from the handler or a Service it reaches, to an external service of
  // that kind. A call that can wait may go through a queue.
  function bindCall(op, h, step, sR, aR) {
    const fits = (e) => type(e.store) === 'external' && configOf(node(e.store), lab).preset === step.preset;
    const defer = step.timing === 'defer', now = sR.filter(fits), later = aR.filter(fits);
    const e = (defer ? [...later, ...now] : now).sort((x, y) => x.path.length - y.path.length)[0];
    if (!e) {
      if (!defer && later.length) return { error: err('E_SYNC_BEHIND_QUEUE', PLAN.E_SYNC_BEHIND_QUEUE(step.label || 'The call', name(later[0].store), name(later[0].queue)), { step: step.id }) };
      return { error: err('E_NO_EXTERNAL', PLAN.E_NO_EXTERNAL(step.label || 'This call', step.preset), { step: step.id }) };
    }
    return { step, call: true, store: e.store, table: { name: step.preset }, path: e.path, async: !!e.queue, queue: e.queue, worker: e.worker, qi: e.qi, a: { how: 'call', work: lab.eval.work.pass, rows: 1, query: `call ${name(e.store)}` } };
  }

  // Publishing to people who are connected (§9.3): from the handler through a pub/sub channel or an event stream to a
  // real-time gateway (or straight to one), and that gateway must hold the connections of a "connect" call.
  const connected = () => new Set(ops.filter((o) => o.kind === 'connect').flatMap((o) => { const p = result.plans[o.id]; const out = []; const walk = (x) => { if (x.kind === 'handle' && type(x.node) === 'realtime') out.push(x.node); x.children.forEach(walk); }; (p?.roots || []).forEach(walk); return out; }));
  function bindPublish(op, h, step) {
    const routes = [];
    for (const via of flowOut(h, op)) {
      const t = type(via);
      if (t === 'realtime') routes.push({ via: null, gw: via, kind: 'direct' });
      else if (t === 'pubsub' || t === 'stream') for (const gw of flowOut(via, op)) if (type(gw) === 'realtime') routes.push({ via, gw, kind: t });
    }
    if (!routes.length) return { error: err('E_NO_PUBLISH', PLAN.E_NO_PUBLISH(step.label || 'Sending to connected people'), { step: step.id }) };
    const live = connected(), ok = routes.filter((r) => live.has(r.gw));
    if (!ok.length) return { error: err('E_NO_CONNECTION', PLAN.E_NO_CONNECTION(name(routes[0].gw)), { node: routes[0].gw, step: step.id }) };
    const best = ok.find((r) => r.kind === 'stream') || ok.find((r) => r.kind === 'pubsub') || ok[0];
    return { step, publish: true, ...best, store: best.gw, table: { name: best.kind }, a: { how: 'publish', work: W.pass, rows: 1, query: '' } };
  }

  // Every step of op from handler h. Memoised per (op, h). → { ok, bindings, error?, unbound }
  const bindMemo = new Map();
  function bindAll(op, h) {
    const k = `${op.id}\u0000${h}`;
    if (bindMemo.has(k)) return bindMemo.get(k);
    const sR0 = syncReach(h, op), aR = asyncReach(h, op), bindings = [];
    let error = null, unbound = 0, queued = false;
    for (const step of op.steps || []) {
      // work that waits for a step done behind a queue uses that step's result: it is done behind the queue too
      // (a page is saved after it is fetched, not by the API before the fetch)
      const sR = queued && step.timing === 'defer' ? [] : sR0;
      let b;
      if (step.op === 'compute') {
        const defer = step.timing === 'defer', worker = defer ? aR.find((e) => e.worker)?.worker || flowOut(h, op).flatMap((q) => (type(q) === 'queue' ? flowOut(q, op).filter((w) => type(w) === 'server') : []))[0] : null;
        const at = worker || h;
        b = step.isolated && !configOf(node(at), lab).sandbox ? { error: err('E_NO_SANDBOX', PLAN.E_NO_SANDBOX(name(at), step.label || 'This step'), { node: at, step: step.id }) } : { step, compute: true, node: at, async: !!worker };
      } else if (step.op === 'call') b = bindCall(op, h, step, sR, aR);
      else if (step.op === 'publish') b = bindPublish(op, h, step);
      else if (step.op === 'tx') b = bindTx(op, h, step, sR, aR);
      else if (isWrite(step)) b = bindWrite(op, h, step, sR, aR);
      else if (isRead(step)) b = bindRead(op, h, step, sR, aR);
      else b = { error: err('E_NOT_YET', PLAN.E_NOT_YET(step.op), { step: step.id }) };
      if (b.error) { unbound++; error = error || b.error; } else { bindings.push(b); if (b.async && step.timing === 'defer') queued = true; }
    }
    const r = { ok: !error, bindings, error, unbound, sR: sR0, aR };
    bindMemo.set(k, r);
    return r;
  }

  // ---- routing (§7.3) --------------------------------------------------------------------------------------
  // → { ok: true, kids: [{ node, weight, next | null, store? }] } | { ok: false, error, unbound }
  function route(op, id, seen) {
    const outs = flowOut(id, op);
    let failure = null;
    const remember = (f) => { if (f && (!failure || f.unbound < failure.unbound)) failure = f; };
    const handler = op.kind === 'connect' ? 'realtime' : 'server';
    for (const t of prefer(op)) {
      const targets = outs.filter((x) => type(x) === t && !seen.has(x));
      if (!targets.length) continue;
      if (t === handler) {
        const good = targets.filter((x) => bindAll(op, x).ok);
        if (good.length) return { ok: true, kids: good.map((x) => ({ node: x, weight: 1 / good.length, next: null })) };
        for (const x of targets) { const b = bindAll(op, x); remember({ ok: false, error: b.error, unbound: b.unbound }); }
      } else if (PASS.has(t) || (t === 'queue' && op.source === 'schedule')) {
        const found = [];
        for (const x of targets) { const r = route(op, x, new Set([...seen, x])); if (r.ok) found.push({ node: x, next: r.kids }); else remember(r); }
        if (found.length) return { ok: true, kids: found.map((f) => ({ ...f, weight: 1 / found.length })) };
      }
    }
    // straight to object storage: one blob step, the source (or a CDN) points at an S3 store
    const real = (op.steps || []).filter((s) => s.op !== 'compute');
    if (real.length === 1 && real[0].op === 'blob') {
      const s3 = (from) => flowOut(from, op).filter((x) => type(x) === 'database' && configOf(node(x), lab).engine === 's3');
      const viaHere = s3(id).map((x) => ({ x, b: directBlob(op, real[0], x) })).filter((y) => y.b);
      if (viaHere.length) return { ok: true, kids: viaHere.map((y) => ({ node: y.x, weight: 1 / viaHere.length, next: null, store: y.b })) };
      if (type(id) === 'client') {
        const cdns = outs.filter((x) => type(x) === 'cdn').map((c) => ({ c, s: s3(c).map((x) => ({ x, b: directBlob(op, real[0], x) })).filter((y) => y.b) })).filter((y) => y.s.length);
        if (cdns.length) return { ok: true, kids: cdns.map((y) => ({ node: y.c, weight: 1 / cdns.length, next: y.s.map((z) => ({ node: z.x, weight: 1 / y.s.length, next: null, store: z.b })) })) };
      }
    }
    return failure || { ok: false, error: err('E_NO_HANDLER', PLAN.E_NO_HANDLER(op.name || op.id)), unbound: Infinity };
  }
  function directBlob(op, step, s3) {
    for (const [ti, t] of tablesOf(node(s3), lab).entries()) {
      const fit = fitOf(t, step, match); if (fit.miss.length) continue;
      const a = accessPath(node(s3), t, step, practice, lab, match);
      if (a.ok) return { step, store: s3, table: t, ti, a, path: [s3] };
    }
    return null;
  }

  // ---- the hop tree (§7.7) ---------------------------------------------------------------------------------
  function buildPlan(op) {
    const plan = { op: op.id, ok: true, root: null, roots: [], staleness: [], steps: Object.create(null), bindings: [] };
    const fail = (e) => ({ ...plan, ok: false, error: e });
    const source = op.source || 'clients';
    // webhooks (source external) start at the external services (of the operation's preset, when it names one)
    const sources = source === 'clients' ? d.nodes.filter((n) => n.type === 'client').map((n) => n.id)
      : source === 'external' ? d.nodes.filter((n) => n.type === 'external' && (!op.preset || configOf(n, lab).preset === op.preset)).map((n) => n.id)
      : source === 'schedule' ? d.nodes.filter((n) => n.type === 'scheduler').map((n) => n.id) : [];
    if (!sources.length) return fail(err('E_NO_SOURCE', PLAN.E_NO_SOURCE(op.name || op.id, source)));
    const routes = sources.map((s) => route(op, s, new Set([s])));
    const bad = routes.find((r) => !r.ok);
    if (bad && bad.error.code === 'E_NO_HANDLER' && source === 'external') return fail(err('E_NO_HANDLER', PLAN.E_NO_WEBHOOK(op.name || op.id, name(sources[0]))));
    if (bad) return fail(bad.error);

    const mk = (n, kind, extra = {}) => ({ id: '', node: n, kind, sync: true, per: 1, share: 1, work: 0, write: false, children: [], ...extra });
    const splitShare = (count, weight, parent, kid) => (count > 1 ? { kind: 'split', group: `${parent}:${type(kid)}`, weight } : 1);
    // a chain of hops for the nodes of `path` after its first (the hop already made for it), ending in `last`
    const chain = (parentHop, nodes, last, sharesForCache) => {
      let at = parentHop, first = null;
      nodes.forEach((n, i) => {
        if (i === nodes.length - 1) { at.children.push(last); at = last; return; }
        const t = type(n);
        const hop = t === 'cache' ? mk(n, 'cache', { work: sharesForCache ? W.get : W.put, step: last?.step, entity: last?.entity, write: !sharesForCache }) : mk(n, 'handle', { work: W.handle, step: last?.step, cpuMs: 0 });
        if (!first) first = hop;
        at.children.push(hop); at = hop;
      });
      // a step done `times` times makes that many calls from the handler: the first hop on its path takes them all
      if (first && last && (last.per || 1) > 1) { first.per = last.per; last.per = 1; }
      if (last && sharesForCache && type(nodes.at(-2)) === 'cache') last.share = { kind: 'miss', cache: nodes.at(-2), entity: sharesForCache };
      return at;
    };
    const queues = new Map(), enqOf = new Map();   // deferred steps through the same queue share one message (§7.5)
    const enqueues = new Map();
    // `frac`: a step done less than once a call (times < 1, "one swipe in ten matches") sends that share of messages
    const consumeHop = (handleHop, b, frac = 1) => {
      const k = b.path.slice(0, b.qi + 2).join('\u0000');
      if (queues.has(k)) { const con = queues.get(k), enq = enqOf.get(con); if (enq) enq.per = Math.max(enq.per, frac); return con; }
      const pre = b.path.slice(1, b.qi + 1); // nodes from after h up to the queue
      // a stream's message is stored once and read by every consumer; a queue's goes to one of its workers
      const ek = b.path.slice(0, b.qi + 1).join('\u0000');
      let enq = type(b.queue) === 'stream' ? enqueues.get(ek) : null;
      if (!enq) { enq = mk(b.queue, 'enqueue', { work: W.enqueue, per: frac }); chain(handleHop, pre, enq, null); enqueues.set(ek, enq); } else enq.per = Math.max(enq.per, frac);
      const con = mk(b.worker, 'consume', { work: type(b.worker) === 'processor' ? W.consume : W.consume + W.handle, sync: false, cpuMs: 0 });
      enq.children.push(con);
      queues.set(k, con); enqOf.set(con, enq);
      return con;
    };
    const writers = [];  // for feeds: {entity, store, table, kind}
    const addStep = (handleHop, h, b) => {
      const step = b.step, per = step.times || 1;
      if (b.compute) {
        const units = (step.cpuMs || 0) / W.cpuMsPerUnit;
        let at = handleHop;
        if (b.async) {
          // through the queue to the worker (which may reach no store at all: it only computes)
          const e = bindAll(op, h).aR.find((x) => x.worker === b.node);
          const q = e ? null : flowOut(h, op).find((x) => type(x) === 'queue' && flowOut(x, op).includes(b.node));
          if (e) at = consumeHop(handleHop, { path: e.path, qi: e.qi, queue: e.queue, worker: e.worker });
          else if (q) at = consumeHop(handleHop, { path: [h, q, b.node], qi: 1, queue: q, worker: b.node });
          if (at !== handleHop) {
            at.computeSteps = [...(at.computeSteps || []), step.id];
            plan.steps[step.id] = { node: b.node, table: null, how: 'compute', work: units * per, rows: 0, query: '', sync: false };
          }
        }
        at.work += units * per; at.cpuMs = (at.cpuMs || 0) + (step.cpuMs || 0) * per;
        return;
      }
      if (b.publish) {
        const per = (step.times || 1) * (step.audience?.avg || 1) * (step.online ?? 1);
        const deliver = mk(b.gw, 'deliver', { step: step.id, work: W.pass, sync: false, per, via: b.kind });
        if (b.via) { const enq = mk(b.via, 'enqueue', { step: step.id, work: W.enqueue }); handleHop.children.push(enq); enq.children.push(deliver); }
        else handleHop.children.push(deliver);
        plan.steps[step.id] = { node: b.gw, table: b.kind, how: 'publish', work: W.pass, rows: 1, query: '', sync: false, via: b.via, viaKind: b.kind };
        return;
      }
      // (a stream processor reads every event and writes a share: its messages are not thinned)
      const write = isWrite(step), frac = b.async && per < 1 && type(b.worker) !== 'processor' ? per : 1;
      const storeHop = mk(b.store, b.call ? 'call' : 'store', { step: step.id, work: b.a.work, write, per: frac < 1 ? 1 : per, entity: step.entity || b.parts?.[0]?.step.entity, how: b.a.how, rows: b.a.rows, bytes: step.bytes });
      if (!b.call) shardRoute(storeHop, b.store, b.table, step, b.parts);
      // `batch: n` (phase 6): a stream processor keeps a running total and writes it once every n events; anything
      // else writes once per event
      if (step.batch > 1 && b.async && type(b.worker) === 'processor') storeHop.per /= step.batch;
      let from = handleHop, nodes = b.path.slice(1);
      if (b.async) { from = consumeHop(handleHop, b, frac); nodes = b.path.slice(b.qi + 2); }
      if (!nodes.length) nodes = [b.store];
      chain(from, nodes, storeHop, write ? null : step.entity);
      plan.steps[step.id] = { node: b.store, table: b.table.name, how: b.a.how, work: b.a.work, rows: b.a.rows, query: b.a.query, sync: !b.async, viaCache: b.viaCache || null, ...(b.missing ? { missing: b.missing } : {}) };
      if (b.call) return;
      if (!write) { plan.bindings.push({ step: step.id, entity: step.entity, store: b.store, table: b.table.name, viaCache: b.viaCache || null }); return; }
      // writes: the primary, invalidations of look-aside caches, then every other copy (§7.5 rule 5, §7.6)
      // a transaction's parts each write their own table (all in one store): each is a primary, none a copy
      const inner = step.op === 'tx' ? b.parts.map((p) => ({ entity: p.step.entity, step: p.step, table: p.table.name })) : [{ entity: step.entity, step, table: b.table.name }];
      const own = new Set(inner.map((x) => `${b.store}\u0000${x.table}`));
      const copies = [];
      for (const { entity, step: s, table } of inner) {
        writers.push({ entity, store: b.store, table, kind: b.async ? 'async' : 'primary', op: op.id, step: s });
        // a write-through cache on the write path is updated by the write itself
        for (const c of b.path) if (type(c) === 'cache' && c !== b.store) writers.push({ entity, store: c, table: null, kind: 'invalidate', db: b.store, op: op.id });
        const reach = bindAll(op, h);
        const all = [...reach.sR.map((e) => ({ ...e, sync: true })), ...reach.aR.map((e) => ({ ...e, sync: false }))];
        const seenCache = new Set();
        for (const e of all) {
          const c = viaCache(e.path);
          if (!c || e.store !== b.store || seenCache.has(c) || b.path.includes(c)) continue;
          if (b.async && e.sync) continue;   // a write behind a queue: only what the worker reaches can clear a cache
          seenCache.add(c);
          const inv = mk(c, 'invalidate', { step: step.id, work: W.get, per, entity });
          if (e.sync) chain(handleHop, e.path.slice(1, -1), inv, null); else chain(consumeHop(handleHop, e), e.path.slice(e.qi + 2, -1), inv, null);
          writers.push({ entity, store: c, table: null, kind: 'invalidate', db: b.store, op: op.id });
        }
        const done = new Set(own), byCdc = cdcReach(b.store);
        for (const e of all) tablesOf(node(e.store), lab).forEach((t) => {
          if (byCdc.has(e.store)) return;
          const key = `${e.store}\u0000${t.name}`;
          if (done.has(key) || !holds(t, entity, practice, match)) return;
          const a = accessPath(node(e.store), t, s, practice, lab, match);
          if (!a.ok) return;
          done.add(key);
          const hop = mk(e.store, 'store', { step: step.id, work: a.work, write: true, per, copy: true, table: t.name, entity, how: a.how, rows: a.rows, bytes: s.bytes });
          if (e.sync) chain(handleHop, e.path.slice(1), hop, null); else chain(consumeHop(handleHop, e), e.path.slice(e.qi + 2), hop, null);
          const kind = e.sync ? 'dual' : 'async';
          copies.push({ node: e.store, table: t.name, feed: kind });
          writers.push({ entity, store: e.store, table: t.name, kind, op: op.id, step: s });
        });
      }
      if (copies.length) plan.steps[step.id].copies = copies;
    };

    const buildKids = (parentHop, kids) => {
      for (const k of kids) {
        let share = splitShare(kids.length, k.weight, parentHop, k.node);
        if (type(parentHop.node) === 'cdn') share = share === 1 ? { kind: 'cdnMiss' } : { ...share, cdnMiss: true };
        if (k.next) { const hop = mk(k.node, 'pass', { work: W.pass, share }); parentHop.children.push(hop); buildKids(hop, k.next); }
        else if (k.store) {
          const b = k.store, hop = mk(k.node, 'store', { step: b.step.id, work: b.a.work, write: b.step.mode === 'put', share, per: b.step.times || 1, entity: b.step.entity, how: b.a.how, rows: b.a.rows, bytes: b.step.bytes });
          parentHop.children.push(hop);
          plan.steps[b.step.id] = { node: k.node, table: b.table.name, how: b.a.how, work: b.a.work, rows: b.a.rows, query: b.a.query, sync: true, viaCache: null };
          if (b.step.mode === 'put') writers.push({ entity: b.step.entity, store: k.node, table: b.table.name, kind: 'primary', op: op.id, step: b.step });
          else plan.bindings.push({ step: b.step.id, entity: b.step.entity, store: k.node, table: b.table.name, viaCache: null });
        } else {
          const hop = mk(k.node, 'handle', { work: W.handle, share, cpuMs: 0 });
          parentHop.children.push(hop);
          for (const b of bindAll(op, k.node).bindings) addStep(hop, k.node, b);
        }
      }
    };
    sources.forEach((s, i) => {
      const root = mk(s, 'source', { share: sources.length > 1 ? { kind: 'split', group: 'sources', weight: 1 / sources.length } : 1 });
      buildKids(root, routes[i].kids);
      plan.roots.push(root);
    });
    plan.root = plan.roots[0];
    // ids in pre-order; split groups named after their parent's id
    let n = 0, count = 0;
    const number = (hop, parent) => {
      hop.id = `${op.id}#${n++}`; count++;
      if (parent && hop.share?.kind === 'split' && hop.share.group !== 'sources') hop.share = { ...hop.share, group: `${parent.id}:${type(hop.node)}` };
      hop.children.forEach((c) => number(c, hop));
    };
    plan.roots.forEach((r) => number(r, null));
    plan.writers = writers;
    if (count > limits.hopsPerOperation) return fail(err('E_TOO_TANGLED', PLAN.E_TOO_TANGLED()));
    return plan;
  }

  // connect calls first (a publish needs to know which gateways hold connections), then kept in the problem's order
  for (const op of [...ops.filter((o) => o.kind === 'connect'), ...ops.filter((o) => o.kind !== 'connect')]) result.plans[op.id] = buildPlan(op);
  { const built = result.plans; result.plans = Object.create(null); for (const op of ops) result.plans[op.id] = built[op.id]; }

  // ---- change data capture (§7.6 system plans) ---------------------------------------------------------------------
  // For each database D whose arrows carry its changes, and each entity written into D: one plan "cdc:D:E" whose
  // calls are D's writes of E in the previous tick. Hops: the queue or stream, each consumer, and every copy of E the
  // consumer reaches. Writing back into D itself is left out (it would feed itself).
  const opWriters = Object.values(result.plans).flatMap((p) => p.writers || []);
  const cdcByDb = new Map();
  for (const e of g.cdcEdges) { if (!cdcByDb.has(e.from)) cdcByDb.set(e.from, []); cdcByDb.get(e.from).push(e.to); }
  for (const [D, targets] of cdcByDb) {
    const ents = [...new Map(opWriters.filter((w) => w.store === D && w.table && w.kind !== 'invalidate' && w.step).map((w) => [w.entity, w])).values()];
    for (const w0 of ents) {
      const E = w0.entity, id = `cdc:${D}:${E}`;
      const sop = { id, name: PLAN.CDC_NAME(name(D), E), system: true, db: D, entity: E, steps: [] };
      const mk = (n, kind, extra = {}) => ({ id: '', node: n, kind, sync: true, per: 1, share: 1, work: 0, write: false, children: [], ...extra });
      const root = mk(D, 'source'), writes = [];
      for (const q of targets) {
        if (type(q) !== 'queue' && type(q) !== 'stream') continue;
        const enq = mk(q, 'enqueue', { work: W.enqueue });
        root.children.push(enq);
        const consumers = g.out.get(q).filter((x) => type(x) === 'server');
        consumers.forEach((wk) => {
          const con = mk(wk, 'consume', { work: W.consume + W.handle, sync: false, cpuMs: 0 });
          enq.children.push(con);
          const done = new Set();
          for (const r of syncReach(wk, sop)) {
            if (r.store === D) continue;
            tablesOf(node(r.store), lab).forEach((t) => {
              const key = `${r.store}\u0000${t.name}`;
              if (done.has(key) || !holds(t, E, practice, match)) return;
              const a = accessPath(node(r.store), t, w0.step, practice, lab, match);
              if (!a.ok) return;
              done.add(key);
              const hop = mk(r.store, 'store', { step: `cdc`, work: a.work, write: true, per: 1, copy: true, table: t.name, entity: E, how: a.how, rows: a.rows, bytes: w0.step.bytes });
              let at = con;
              for (const n of r.path.slice(1, -1)) { const h = type(n) === 'cache' ? mk(n, 'cache', { work: W.put, entity: E, write: true }) : mk(n, 'handle', { work: W.handle, cpuMs: 0 }); at.children.push(h); at = h; }
              at.children.push(hop);
              writes.push({ entity: E, store: r.store, table: t.name, kind: 'cdc', op: id, step: w0.step, via: q });
            });
          }
        });
      }
      if (!root.children.length) continue;
      let n = 0; const number = (h) => { h.id = `${id}#${n++}`; h.children.forEach(number); }; number(root);
      result.system.push({ op: sop, plan: { op: id, ok: true, system: true, root, roots: [root], staleness: [], steps: Object.create(null), bindings: [], writers: writes } });
    }
  }

  // ---- feeds (§7.6): every store a read uses must be written by something ------------------------------------
  const writers = [...opWriters, ...result.system.flatMap((s) => s.plan.writers)];
  const written = new Set(ops.flatMap((o) => (o.steps || []).flatMap((s) => (s.op === 'tx' ? s.steps || [] : [s])).filter(isWrite).map((s) => s.entity)));
  const unplanned = new Set(ops.filter((o) => !result.plans[o.id].ok).flatMap((o) => (o.steps || []).flatMap((s) => (s.op === 'tx' ? s.steps || [] : [s])).filter(isWrite).map((s) => s.entity)));
  for (const op of ops) {
    const plan = result.plans[op.id];
    if (!plan.ok) continue;
    for (const b of plan.bindings) {
      const w = writers.filter((x) => x.entity === b.entity && x.store === b.store && x.table === b.table);
      const feed = w.find((x) => x.kind === 'primary') ? 'primary' : w.find((x) => x.kind === 'dual') ? 'dual' : w.find((x) => x.kind === 'async') ? 'async' : w.find((x) => x.kind === 'cdc') ? 'cdc'
        : !written.has(b.entity) || unplanned.has(b.entity) ? 'primary' : null;
      if (!feed) {
        const primary = writers.find((x) => x.entity === b.entity && (x.kind === 'primary' || x.kind === 'async'));
        Object.assign(plan, { ok: false, error: err('E_UNFED', PLAN.E_UNFED(b.entity, name(b.store), op.name || op.id, primary ? name(primary.store) : null), { node: b.store, step: b.step }) });
        break;
      }
      plan.steps[b.step].feed = feed;
      plan.staleness.push({ store: b.store, feed });
      result.copies.push({ store: b.store, table: b.table, entity: b.entity, feed });
      if (b.viaCache) {
        // a writer can clear the cached copy of one item it writes; a cached query result (many rows) waits for its TTL
        const single = (op.steps || []).find((s) => s.id === b.step)?.op === 'get';
        const invalidated = single && writers.some((x) => x.kind === 'invalidate' && x.store === b.viaCache && x.db === b.store && x.entity === b.entity);
        plan.staleness.push({ store: b.viaCache, feed: 'lookAside', cacheTtlSec: invalidated ? 1 : configOf(node(b.viaCache), lab).ttlSec });
      }
    }
  }
  for (const w of writers) if (w.table && !result.copies.some((c) => c.store === w.store && c.table === w.table && c.entity === w.entity)) result.copies.push({ store: w.store, table: w.table, entity: w.entity, feed: w.kind });

  // ---- warnings: nodes no plan uses ----------------------------------------------------------------------------
  const used = new Set();
  const visit = (hop) => { used.add(hop.node); hop.children.forEach(visit); };
  for (const p of [...Object.values(result.plans), ...result.system.map((s) => s.plan)]) (p.roots || []).forEach(visit);
  // only when every operation was planned: a failed route would make every node look unused
  const allPlanned = Object.values(result.plans).every((p) => p.ok);
  // a coordination service a scheduler points at holds its lease: used, though no call goes through it
  for (const n of d.nodes) if (n.type === 'coord' && g.inn.get(n.id).some((x) => type(x) === 'scheduler')) used.add(n.id);
  if (allPlanned) for (const n of d.nodes) if (!used.has(n.id) && n.type !== 'client') {
    const comp = cat[n.type];
    let cost = 0;
    try { cost = monthlyCost(comp, configOf(n, lab), 0); } catch { cost = 0; }
    result.warnings.push({ code: 'W_UNUSED', message: PLAN.W_UNUSED(cap1(name(n.id)), Number.isFinite(cost) ? cost : 0), node: n.id });
  }
  return result;
}

