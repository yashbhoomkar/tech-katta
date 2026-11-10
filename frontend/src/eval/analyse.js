// Stage 4: analyse (rules over the plans → findings), evaluator.md §10.
//
//   analyse(compiled, practice, lab, sims = []) → Finding[]   (sims: [{ test, sim }] of the load tests run)
//
// The simulator says how much, how fast, how often. These rules say what can go wrong for one request: a write
// that is acknowledged but not safe, a read that is older than allowed, a component whose loss stops everything.
// Phase 2 rules: §10.2 durability, §10.3 freshness, §10.7 single points of failure, §10.8 things that grow.
import { configOf, evalCatalogue } from './design.js';
import { engineOfNode, isWrite, isRead } from './access.js';
import { FIND } from './words.js';

const SEV = { fail: 0, warn: 1, info: 2 };

export function analyse(compiled, practice, lab, sims = []) {
  if (!compiled?.ok) return [];
  const ops = practice?.operations || [], g = compiled.graph, cat = evalCatalogue(lab), ev = lab.eval, out = [];
  const node = (id) => g.byId.get(id), cfg = (id) => configOf(node(id), lab);
  const name = (id) => { const n = node(id); return n?.name || cat[n?.type]?.name || id; };
  const opName = (op) => op.name || op.id;
  const push = (f) => out.push({ nodes: [], ...f });
  const hopsOf = (plan) => { const all = []; const walk = (h) => { all.push(h); h.children.forEach(walk); }; (plan.roots || []).forEach(walk); return all; };
  const engine = (id) => engineOfNode(node(id), lab);
  const standby = (id) => { const e = engine(id); return e?.multiAz === 'builtin' || (e?.multiAz !== 'none' && !!cfg(id).multiAz); };
  const perRequest = (id) => engine(id)?.capacity === 'request';
  const firstLoad = sims[0];
  const rateOf = (op) => (firstLoad ? (firstLoad.test.traffic?.rps || 0) * (op.share || 0) : 0);

  // ---- §10.2 durability ---------------------------------------------------------------------------------------
  for (const op of ops) {
    const plan = compiled.plans[op.id];
    if (!plan?.ok || !op.durable) continue;
    const hops = hopsOf(plan);
    for (const step of op.steps || []) {
      if (!isWrite(step)) continue;
      const b = plan.steps[step.id]; if (!b) continue;
      const entity = step.entity || step.steps?.[0]?.entity;
      if (node(b.node)?.type === 'cache' && cfg(b.node).persistence !== 'aof')
        push({ code: 'F_NOT_DURABLE', severity: 'fail', op: op.id, nodes: [b.node], ...FIND.notDurableCache(entity, name(b.node)) });
      for (const h of hops) if (h.kind === 'cache' && h.write && h.step === step.id && cfg(h.node).writePolicy === 'back') {
        const flush = cat.cache?.flushSeconds ?? 5;
        push({ code: 'F_WRITE_BACK', severity: 'fail', op: op.id, nodes: [h.node], ...FIND.writeBack(name(h.node), entity, flush, Math.round(rateOf(op) * flush)) });
      }
      if (b.sync && node(b.node)?.type === 'database' && !perRequest(b.node) && !standby(b.node))
        push({ code: 'F_SINGLE_ZONE', severity: 'warn', op: op.id, nodes: [b.node], ...FIND.singleZone(name(b.node), cat.database?.crash?.downMinutes ?? 30) });
    }
  }

  // ---- §10.3 freshness ----------------------------------------------------------------------------------------------
  const worstFeed = (store, entity) => Math.max(0, ...sims.map((s) => s.sim.feedDelay?.[`${store}|${entity}`] || 0));
  for (const op of ops) {
    const plan = compiled.plans[op.id];
    if (!plan?.ok) continue;
    const hops = hopsOf(plan), viaCdn = !!op.cacheable && hops.some((h) => node(h.node)?.type === 'cdn');
    let worst = 0, why = null;
    for (const step of op.steps || []) {
      if (!isRead(step)) continue;
      const b = plan.steps[step.id]; if (!b) continue;
      const e = engine(b.node), c = cfg(b.node), broken = [];
      let sec = 0, how = 'the primary copy';
      if (b.feed === 'async') { sec = (worstFeed(b.node, step.entity) || 1) + (ev.engines?.[c.engine]?.refreshSec || 0); how = 'fed through a queue'; broken.push('async'); }
      if (node(b.node)?.type === 'database' && c.readFrom === 'replicas' && (c.replicas || 0) >= 1 && c.replication !== 'sync') { sec += ev.engines?.[c.engine]?.replicaLagSec || 1; how = 'a read replica'; broken.push('replica'); }
      const la = (plan.staleness || []).find((s) => s.feed === 'lookAside' && s.store === b.viaCache);
      if (la) { sec += la.cacheTtlSec; how = la.cacheTtlSec > 1 ? `a cache that keeps items for ${la.cacheTtlSec} seconds` : 'a cache that writers clear'; if (la.cacheTtlSec > 1) broken.push('cache'); }
      if (viaCdn && !op.live) { sec += op.cacheable.ttlSec; how = `the CDN, which keeps answers for ${op.cacheable.ttlSec} seconds`; broken.push('cdn'); }
      if (sec > worst) { worst = sec; why = { step, store: la ? b.viaCache : b.node, how, broken, cache: b.viaCache, db: b.node }; }
      else if (!why && broken.length) why = { step, store: b.node, how, broken, cache: b.viaCache, db: b.node };
    }
    if (!why && worst === 0) continue;
    const req = op.consistency;
    const strongBroken = req === 'strong' && (worst > 1 || why?.broken.length);
    const maxBroken = req && typeof req === 'object' && Number.isFinite(req.maxStalenessSec) && worst > req.maxStalenessSec;
    if (strongBroken || maxBroken) {
      const fix = why.broken.includes('cache') ? FIND.fixCache(name(why.cache)) : why.broken.includes('replica') ? FIND.fixReplica() : why.broken.includes('async') ? FIND.fixQueue() : FIND.fixCdn();
      push({ code: 'F_STALE', severity: 'fail', op: op.id, nodes: [why.store], ...FIND.stale(opName(op), req === 'strong' ? 'up to date' : `at most ${req.maxStalenessSec} seconds old`, why.step.entity, name(why.store), why.how, Math.round(worst)), fix, concept: 'consistency' });
    } else if (!req && worst > 0) push({ code: 'F_STALE_INFO', severity: 'info', op: op.id, nodes: [why.store], ...FIND.staleInfo(opName(op), Math.round(worst)) });
  }

  // ---- §10.7 single points of failure ---------------------------------------------------------------------------------
  const candidates = compiled.design.nodes.filter((n) => {
    const c = configOf(n, lab);
    if (n.type === 'server') return (c.zones || 1) <= 1;
    if (n.type === 'database') return !perRequest(n.id) && !standby(n.id);
    if (n.type === 'cache') return c.onDown === 'fail';
    return false;
  });
  // can the operation still succeed with `dead` gone? (no simulation: structure only)
  const alive = (h, dead, op) => {
    if (h.node === dead && !(h.kind === 'cache' && cfg(dead).onDown !== 'fail') && h.kind !== 'invalidate') return false;
    const groups = new Map();
    for (const c of h.children) {
      if (!c.sync) continue;
      const sh = c.share;
      if (sh && typeof sh === 'object' && sh.kind === 'split') { if (!groups.has(sh.group)) groups.set(sh.group, []); groups.get(sh.group).push(c); continue; }
      if (sh && typeof sh === 'object' && sh.kind === 'miss' && sh.cache !== dead) continue;   // hits still answer
      if (sh && typeof sh === 'object' && sh.kind === 'cdnMiss' && !op.live) continue;
      if (!alive(c, dead, op)) return false;
    }
    for (const grp of groups.values()) if (!grp.some((c) => alive(c, dead, op))) return false;
    return true;
  };
  for (const n of candidates) {
    const hit = ops.filter((op) => { const p = compiled.plans[op.id]; return p?.ok && hopsOf(p).some((h) => h.node === n.id) && !(p.roots || []).some((r) => alive(r, n.id, op)); });
    if (hit.length) push({ code: 'F_SPOF', severity: 'warn', op: hit[0].id, nodes: [n.id], ...FIND.spof(name(n.id), hit.map(opName), n.type, configOf(n, lab)), concept: 'availability' });
  }

  // ---- §10.8 things that grow -------------------------------------------------------------------------------------------
  const seenQ = new Set();
  for (const { sim } of sims) for (const q of sim.queues || []) {
    if (!q.growing || seenQ.has(q.node)) continue;
    seenQ.add(q.node);
    push({ code: 'F_BACKLOG', severity: 'warn', op: q.op, nodes: [q.node], ...FIND.backlog(name(q.node), Math.round(q.backlogEnd)) });
  }
  for (const n of compiled.design.nodes) {
    if (n.type === 'database') {
      const gb = Math.max(0, ...sims.map((s) => s.sim.storageGb?.[n.id] || 0)), max = ev.engines?.[configOf(n, lab).engine]?.maxStorageGb;
      const per = gb / Math.max(1, configOf(n, lab).shards || 1) / (1 + (engine(n.id)?.replicas !== false ? configOf(n, lab).replicas || 0 : 0)) / (configOf(n, lab).multiAz && engine(n.id)?.multiAz === 'option' ? 2 : 1);
      if (max && per > max) push({ code: 'F_STORAGE', severity: 'fail', nodes: [n.id], ...FIND.storage(name(n.id), Math.round(per), engine(n.id)?.label || 'this engine', max) });
    }
    if (n.type === 'cache') {
      const c = configOf(n, lab), mem = (cat.cache?.sizeExtras?.[c.size]?.memoryGb || 0) * 1e9 * (c.nodes || 1);
      const held = [...new Set((compiled.copies || []).filter((x) => x.store === n.id).map((x) => x.entity))];
      const need = held.reduce((a, E) => a + (practice.entities?.[E]?.rows || 0) * (practice.entities?.[E]?.rowBytes || 0) * 1.3, 0);
      if (held.length && need > mem) push({ code: 'F_CACHE_FULL', severity: 'fail', nodes: [n.id], ...FIND.cacheFull(name(n.id), held.join(', '), Math.ceil(need / 1e9), Math.round(mem / 1e9)) });
    }
  }
  for (const [E, ent] of Object.entries(practice.entities || {})) {
    if (!ent?.expires) continue;
    for (const c of compiled.copies || []) {
      if (c.entity !== E) continue;
      const n = node(c.store), t = n?.type === 'database' ? (cfg(c.store).schema?.tables || []).find((x) => x.name === c.table) : (cfg(c.store).structures || []).find((x) => x.name === c.table);
      if (t && !t.ttl && !(n.type === 'cache' && (cfg(c.store).ttlSec || 0) > 0 && t.kind === 'kv')) { push({ code: 'F_NO_TTL', severity: 'warn', nodes: [c.store], ...FIND.noTtl(E, name(c.store)) }); break; }
    }
  }
  if (sims.length) {
    const bill = Math.max(...sims.map((s) => s.sim.cost.monthly)) || 1;
    for (const n of compiled.design.nodes) {
      if (n.type === 'client' || evalCatalogue(lab)[n.type]?.managed) continue;
      const rhoMax = Math.max(...sims.map((s) => s.sim.nodes[n.id]?.rhoMax || 0)), cost = Math.max(...sims.map((s) => s.sim.nodes[n.id]?.cost || 0));
      if (rhoMax < 0.15 && cost > 0.15 * bill) push({ code: 'F_OVERSIZED', severity: 'info', nodes: [n.id], ...FIND.oversized(name(n.id), Math.round(rhoMax * 100)) });
    }
  }
  for (const w of compiled.warnings || []) push({ code: w.code, severity: 'warn', nodes: [w.node], title: w.message, story: w.message, fix: 'Connect it to the path of an operation, or remove it.' });

  const opIx = new Map(ops.map((o, i) => [o.id, i]));
  return out.map((f, i) => ({ f, i })).sort((a, b) => (SEV[a.f.severity] - SEV[b.f.severity]) || ((opIx.get(a.f.op) ?? 99) - (opIx.get(b.f.op) ?? 99)) || (a.f.code < b.f.code ? -1 : a.f.code > b.f.code ? 1 : 0) || a.i - b.i).map((x) => x.f);
}
