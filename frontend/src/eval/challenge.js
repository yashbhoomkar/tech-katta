// Lab challenges judged by the v2 evaluator (evaluator.md phase 7). A challenge (content/lab.json `challenges`,
// `v: 2`) is a small problem with one scenario: its entities and operations, the scenario's traffic, hours and
// faults, and up to three stars, which are the scenario's checks.
//
// Stars, in order; the first one (availability) must be met for any star to count:
//   availability {min, from?, to?}  % of calls that succeeded (in a window of minutes, if given)
//   cost {max}                      average monthly cost of the run, in dollars
//   noCrash {type?}                 no component (of that type) fell over from load; a crash the challenge
//                                   causes doesn't count
//   noLostWrites                    no acknowledged write was lost
//   completes {withinSec?}          deferred work done in time, and none left waiting at the end
import { evaluate } from './judge.js';

const CHECK = { availability: 'slo', cost: 'cost', noCrash: 'noCrash', noLostWrites: 'noLostWrites', completes: 'completes' };

// The star as a check of the scenario test. Availability stars look at availability only: a challenge's
// operations carry their own latency target.
function checkOf(s) {
  const kind = CHECK[s.kind];
  if (kind === 'slo') return { kind, availability: s.min, ...(s.from !== undefined ? { from: s.from, to: s.to } : {}), ...(s.op ? { op: s.op } : {}) };
  if (kind === 'cost') return { kind, max: s.max };
  if (kind === 'noCrash') return { kind, ...(s.type ? { type: s.type } : {}) };
  if (kind === 'completes') return { kind, ...(s.withinSec ? { withinSec: s.withinSec } : {}), ...(s.op ? { op: s.op } : {}) };
  return { kind };
}

// The practice the v2 judge runs: the challenge's data and calls, and one test that is the scenario.
export function challengePractice(ch) {
  return {
    v: 2,
    entities: ch.entities,
    operations: ch.operations,
    tests: [{ id: 'scenario', name: ch.title, hours: ch.hours, startHour: ch.startHour || 0, traffic: ch.traffic, ...(ch.faults?.length ? { faults: ch.faults } : {}), checks: ch.stars.map(checkOf) }],
  };
}

// Scores a design: { stars, max, checks: [{ok, label, value}], why, result } or { error } when the design can't
// carry the challenge's calls at all (the first plan problem, in words).
export function runChallenge(design, lab, ch) {
  const practice = challengePractice(ch);
  const r = evaluate({ ...design, v: 2 }, lab, practice);
  const res = r.results[0];
  if (!res || res.error) return { error: res?.error || 'This design could not be judged.' };
  // a call the design can't carry at all: say why rather than score 0%
  const bad = Object.entries(r.plans || {}).find(([, pl]) => !pl.ok);
  if (bad) return { error: `${ch.operations.find((o) => o.id === bad[0])?.name || bad[0]}: ${bad[1].error?.message || 'this design can\'t carry it.'}` };
  const checks = res.checks.map((c, i) => ({ ok: !!c.ok, kind: ch.stars[i].kind, label: ch.stars[i].label, value: c.value ?? null }));
  const stars = checks[0]?.ok ? checks.filter((c) => c.ok).length : 0;
  return { stars, max: ch.stars.length, checks, why: res.why || [], result: res, monthly: r.metrics?.avgMonthly ?? null };
}
