// Findings → the verdict of a test, the `failed` object, its explanation and blame (spec 7.7–7.9, 21.5; layer 7).
import { msg } from './messages.js';
import { group, count } from './inr.js';
import { KINDS } from './kinds/index.js';

export const VERDICT_OF = { stale: 'Wrong Answer', ryw: 'Wrong Answer', no_id: 'Wrong Answer', collision: 'Wrong Answer', lost: 'Data Lost', unavailable: 'Unavailable', overloaded: 'Overloaded', p99: 'Too Slow', p50: 'Too Slow', backlog: 'Too Slow', budget: 'Over Budget' };
export const PRECEDENCE = ['Wrong Answer', 'Data Lost', 'Unavailable', 'Overloaded', 'Too Slow', 'Over Budget'];
export const VERDICTS = ['Accepted', 'Wrong Answer', 'Data Lost', 'Unavailable', 'Overloaded', 'Too Slow', 'Over Budget', 'Invalid Design'];

// Sorted by the precedence of 7.7; ties: the problem's request order, then phase.
export const rank = (findings) => [...findings].sort((a, b) => PRECEDENCE.indexOf(VERDICT_OF[a.type]) - PRECEDENCE.indexOf(VERDICT_OF[b.type]) || (a.order ?? 0) - (b.order ?? 0) || (a.phase ?? 0) - (b.phase ?? 0));

const pctWhole = (rho) => (Number.isFinite(rho) ? `${Math.round(rho * 100)} %` : 'down');
export function costOf(design) {
  return Object.values(design.parts).reduce((t, p) => t + KINDS[p.kind].cost(p), 0);
}
// The part a budget finding points at: the most expensive one.
const priciest = (design) => Object.entries(design.parts).map(([n, p]) => [n, KINDS[p.kind].cost(p)]).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

export function explain(f, design) {
  const n = f.numbers || {};
  switch (f.type) {
    case 'stale': return msg('stale', { request: f.request, stale_s: n.stale_s, max: n.max });
    case 'ryw': return msg('ryw', { request: f.request, part: f.part });
    case 'no_id': return msg('no_id', { request: f.request });
    case 'collision': return msg('collision', { n: count(n.n), bits: n.bits, kind: n.kind });
    case 'lost': return msg('lost', { part: f.part, n: group(n.n) });
    case 'unavailable': return msg('unavailable', { request: f.request, actual: f.actual, expected: f.expected, part: f.part });
    case 'overloaded': return msg('overloaded', { part: f.part, load: group(n.load), cap: group(n.cap) });
    case 'p99': return msg('p99', { request: f.request, actual: f.actual.replace(/^p99 /, ''), expected: `${n.limit} ms`, part: f.part, rho: pctWhole(f.rho) });
    case 'p50': return msg('p50', { request: f.request, actual: f.actual.replace(/^p50 /, ''), expected: `${n.limit} ms` });
    case 'backlog': return msg('backlog', { request: f.request, delay: n.delay, n: n.n, part: f.part, cap: group(n.cap), arrive: group(n.arrive) });
    case 'budget': return msg('budget', { cost: group(n.cost), budget: group(n.budget) });
    default: return '';
  }
}

// The blamed part, with its line and load (21.5).
export function blame(f, design) {
  const part = f.type === 'budget' ? priciest(design) : f.part;
  if (!part || !design.parts[part]) return null;
  const rho = Number.isFinite(f.rho) ? f.rho : null;
  const note = rho !== null ? `${part} is at ${Math.round(rho * 100)} % of its capacity` : f.type === 'budget' ? `${part} is the most expensive part` : f.type === 'unavailable' ? `${part} failed` : '';
  return { part, line: design.parts[part].line, rho, note };
}

export function failedObject(test, f, design) {
  return {
    test: test.id, title: test.title, hidden: !!test.hidden, reason: f.type, request: f.request, phase: f.phase,
    expected: f.expected, actual: f.actual, message: explain(f, design), blame: blame(f, design),
    trace: (f.trace || []).map((t) => ({ part: t.part, ms: t.ms, rho: t.rho, ...(t.hit !== undefined ? { hit: t.hit } : {}), ...(t.bg ? { bg: true } : {}), ...(t.down ? { down: true } : {}), ...(t.skipped ? { skipped: true } : {}) })),
  };
}
