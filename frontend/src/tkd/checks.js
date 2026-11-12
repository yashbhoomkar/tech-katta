// Findings that don't depend on load (spec 7.6; layer 4): stale reads, read-your-writes, ids. They apply to every test.
// A finding: { type, request, phase, part, line, expected, actual, numbers }.
import { REPLICA_LAG_S } from './catalogue.js';
import { group } from './inr.js';

const kindOf = (design, name) => design.parts[name]?.kind;

// How old a read route's answer can be, and which part makes it so (the cache with the largest TTL share, else the
// replica-read store).
export function staleness(design, problem, request) {
  const r = design.routes[request.name];
  const writes = (problem.requests || []).filter((w) => w.mode === 'write' && request.table && w.table === request.table);
  let stale = 0, cachePart = null, cacheTtl = -1, storePart = null;
  for (const h of r.hops) {
    const p = design.parts[h.part];
    if (p.kind === 'cache' || p.kind === 'cdn') {
      // fresh when every write of the same table clears (or rewrites) this copy
      const fresh = writes.every((w) => { const wr = design.routes[w.name]; return wr && (wr.invalidate === h.part || wr.update === h.part); });
      if (!fresh) { stale += p.ttl_s; if (p.ttl_s > cacheTtl) { cacheTtl = p.ttl_s; cachePart = h.part; } }
    }
    if (p.kind === 'sql' && h.replica && !p.sync) { stale += REPLICA_LAG_S; storePart ||= h.part; }
    if (p.kind === 'nosql' && p.r + p.w <= p.rf) { stale += REPLICA_LAG_S; storePart ||= h.part; }
  }
  return { stale_s: stale, part: cachePart || storePart };
}

export function staticFindings(design, problem) {
  const out = [];
  for (const R of problem.requests || []) {
    const route = design.routes[R.name];
    if (!route) continue;
    if (R.mode === 'read' && (R.read_your_writes || Number.isFinite(R.max_stale_s))) {
      const { stale_s, part } = staleness(design, problem, R);
      if (R.read_your_writes && stale_s > 0) {
        out.push({ type: 'ryw', request: R.name, phase: null, part, expected: 'the newest data after a write', actual: `up to ${stale_s} s old`, numbers: { stale_s } });
      } else if (Number.isFinite(R.max_stale_s) && stale_s > R.max_stale_s) {
        out.push({ type: 'stale', request: R.name, phase: null, part, expected: `at most ${R.max_stale_s} s old`, actual: `up to ${stale_s} s old`, numbers: { stale_s, max: R.max_stale_s } });
      }
    }
    if (R.mode === 'write' && R.unique_id) {
      const idHop = route.hops.find((h) => kindOf(design, h.part) === 'idgen');
      if (!idHop) { out.push({ type: 'no_id', request: R.name, phase: null, part: route.store, expected: 'an idgen on the route', actual: 'no idgen', numbers: {} }); continue; }
      const g = design.parts[idHop.part];
      if (g.id_kind === 'random' || g.id_kind === 'hash') {
        const n = problem.total_items || 0, expected = (n * n) / 2 ** (g.bits + 1);
        if (expected >= 1) out.push({ type: 'collision', request: R.name, phase: null, part: idHop.part, expected: 'no repeated ids', actual: `about ${group(Math.round(expected))} repeats expected`, numbers: { n, bits: g.bits, kind: g.id_kind, collisions: expected } });
      }
    }
  }
  return out;
}
