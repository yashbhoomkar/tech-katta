// Defend your design (context 36, step 17; after spec 22 §11.2): questions about the learner's own design whose answers
// come from running it, so nobody has to write them and every design gets its own. Three kinds:
//   kill: "At the peak, X fails. What happens?"  first: "Which part gives first?"  room: "How much more can it take?"
// Pure: -> [{ id, kind, part?, q, choices: [string], right: index, say }]. The console asks them one at a time.
import { evaluate } from './judge.js';
import { baseTest, headroom } from './probes.js';

export const KILL_CLASSES = [
  ['fine', 'Nobody notices: every promise still holds'],
  ['slower', 'It still works, but slower than promised'],
  ['drops', 'Some calls fail while it is down, then it recovers'],
  ['blip', 'Calls stop for a few minutes, then it recovers'],
  ['down', 'Calls keep failing until someone fixes it'],
];
const KILLABLE = new Set(['server', 'database', 'cache', 'queue', 'realtime', 'scheduler', 'stream', 'processor', 'pubsub', 'coord']);
const ROOM = [[0, 1.25, 'Barely: under 1.25 times'], [1.25, 2, 'About one and a half times'], [2, 4, 'Two to four times'], [4, Infinity, 'More than four times']];

const nameOf = (n, lab) => n.name || (lab?.components || []).find((c) => c.type === n.type)?.name || n.type;

// What one part failing at `minute` of the base test does, as one of KILL_CLASSES, from the share of calls that
// succeed minute by minute for the worst-hit operation.
export function killOutcome(design, lab, practice, base, id, minute = 10) {
  const t = { ...base, id: `${base.id}~kill`, faults: [{ minute, kind: 'crash', node: id }], checks: (base.checks || []).filter((c) => c.kind !== 'cost') };
  const r = evaluate(design, lab, { ...practice, tests: [t] }).results[0];
  if (!r || r.error) return null;
  if (r.ok) return { cls: 'fine', why: '' };
  let worst = null;
  for (const o of Object.values(r.timeline?.ops || {})) { const ok = (o.ok || []).slice(minute); if (!ok.length) continue; const lo = Math.min(...ok); if (!worst || lo < worst.lo) worst = { lo, ok }; }
  if (!worst || worst.lo >= 0.999) return { cls: 'slower', why: r.why?.[0] || '' };
  const out = worst.ok.filter((x) => x < 0.5).length, end = worst.ok[worst.ok.length - 1];
  const cls = end < 0.99 ? 'down' : worst.lo < 0.5 ? 'blip' : 'drops';
  return { cls, why: r.why?.[0] || '', minutes: out };
}
// The minute of the base test with the most traffic (the design's own run), past the first ten.
function busiestMinute(r) {
  const ops = Object.values(r?.timeline?.ops || {}); if (!ops.length) return 10;
  const len = Math.max(...ops.map((o) => (o.rate || []).length)); let best = 10, top = -1;
  for (let i = 10; i < len - 5; i++) { const v = ops.reduce((s, o) => s + (o.rate?.[i] || 0), 0); if (v > top) { top = v; best = i; } }
  return best;
}

export function defendQuestions(design, lab, practice, { kills = 4 } = {}) {
  const base = baseTest(practice);
  if (!base || !design?.nodes?.length) return [];
  const out = [], peak = `“${base.name}”`;
  // which parts to fail: the most expensive killable ones
  const ref = evaluate(design, lab, { ...practice, tests: [{ ...base, checks: [] }] }).results[0];
  const cost = ref?.cost?.byNode || {};
  const parts = design.nodes.filter((n) => KILLABLE.has(n.type)).sort((a, b) => (cost[b.id] || 0) - (cost[a.id] || 0)).slice(0, kills);
  const minute = busiestMinute(ref), outcomes = parts.map((n) => ({ n, o: killOutcome(design, lab, practice, base, n.id, minute) })).filter((x) => x.o);
  // the most telling first: a part whose failure is felt, then the most expensive
  const rank = { down: 0, blip: 1, drops: 2, slower: 3, fine: 4 };
  outcomes.sort((a, b) => rank[a.o.cls] - rank[b.o.cls]);
  const killQ = ({ n, o }) => ({ id: `kill:${n.id}`, kind: 'kill', part: n.id, q: `In the test ${peak}, ${nameOf(n, lab)} fails at the busiest minute. What happens to the users?`, choices: KILL_CLASSES.map((c) => c[1]), right: KILL_CLASSES.findIndex((c) => c[0] === o.cls), say: o.cls === 'fine' ? `The simulator failed ${nameOf(n, lab)} at the busiest minute and every promise held.` : `${o.minutes ? `Calls failed for about ${o.minutes} minute${o.minutes === 1 ? '' : 's'}. ` : ''}${o.why}` });
  if (outcomes[0]) out.push(killQ(outcomes[0]));

  const h = headroom(design, lab, practice);
  if (h && !h.capped && h.first) {
    const named = design.nodes.filter((n) => n.type !== 'client').map((n) => ({ n, at: h.first.indexOf(nameOf(n, lab)) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
    if (named[0]) {
      const right = named[0].n, others = design.nodes.filter((n) => n.type !== 'client' && n.id !== right.id).slice(0, 3);
      const opts = [right, ...others].sort((a, b) => design.nodes.indexOf(a) - design.nodes.indexOf(b));
      out.push({ id: 'first', kind: 'first', part: right.id, q: `Traffic keeps growing past the test ${peak}. Which part gives first?`, choices: opts.map((n) => nameOf(n, lab)), right: opts.indexOf(right), say: h.first });
    }
  }
  if (h) {
    const m = h.exact, band = ROOM.findIndex(([lo, hi]) => m >= lo && m < hi), near = ROOM.some(([lo]) => lo > 0 && Math.abs(m - lo) / lo < 0.03);
    if (band >= 0 && !near && m >= 1) out.push({ id: 'room', kind: 'room', q: `How much more traffic than the test ${peak} can this design take before a promise breaks?`, choices: ROOM.map((b) => b[2]), right: band, say: h.capped ? `It held ${h.m} times, the most the check tries.` : `It holds ${h.m} times the traffic of ${peak}.${h.first ? ` Then: ${h.first}` : ''}` });
  }
  for (const x of outcomes.slice(1)) { if (out.length >= 3) break; out.push(killQ(x)); }
  return out.slice(0, 3);
}
