// Lab challenges (content/lab.json `challenges`): a scenario, a starting design and up to three
// stars. runChallenge() plays the whole scenario at once on the simulated clock and scores it.
//
// The challenge owns the traffic: every Clients component sends its share of `traffic.rps` with
// `traffic.pattern`, and `fixed` settings (queries per request on servers, hit and write % on caches)
// override the design's, so a challenge can't be won by turning the load down. `chaos` events crash
// the busiest component of a type at a minute into the run.
//
// Stars, in order: the first one (availability) must be met for any star to count.
//   availability {min}   % of user requests that eventually succeeded
//   cost {max}           average monthly cost over the run, in dollars
//   noCrash {type?}      no component (of that type) crashed from overload; chaos crashes don't count
//   noLostWrites         no writes lost by a write-back cache
import { simulate, advance, newRun, runOptions, crashNow, catalogue } from './engine.js';

export function applyChallenge(design, ch) {
  const clients = design.nodes.filter((n) => n.type === 'client').length || 1;
  const f = ch.fixed || {};
  return { ...design, nodes: design.nodes.map((n) => {
    if (n.type === 'client') return { ...n, config: { ...n.config, rps: ch.traffic.rps / clients, pattern: ch.traffic.pattern } };
    if (n.type === 'server' && f.queriesPerRequest) return { ...n, config: { ...n.config, queriesPerRequest: f.queriesPerRequest } };
    if (n.type === 'cache' && (f.hitPct !== undefined || f.writePct !== undefined)) return { ...n, config: { ...n.config, ...(f.hitPct !== undefined ? { hitPct: f.hitPct } : {}), ...(f.writePct !== undefined ? { writePct: f.writePct } : {}) } };
    return n;
  }) };
}

const STEP = 5; // simulated minutes per scoring step (chaos minutes are multiples of 5)

export function runChallenge(design, lab, ch) {
  const d = applyChallenge(design, ch), cat = catalogue(lab);
  const blocking = simulate(d, lab).problems.filter((p) => !p.includes('no traffic'));
  if (blocking.length) return { error: blocking[0] };
  const type = Object.fromEntries(d.nodes.map((n) => [n.id, n.type]));
  const chaos = [...(ch.chaos || [])].sort((a, b) => a.minute - b.minute);
  let run = { ...newRun(), start: ch.startHour || 0 }, cost = 0, next = 0;
  const total = ch.hours * 60;
  for (let t = 0; t < total; t += STEP) {
    for (; next < chaos.length && chaos[next].minute <= t; next++) {
      const r = simulate(d, lab, runOptions(run, run.start * 60 + run.t, lab));
      const target = d.nodes.filter((n) => n.type === chaos[next].type && cat[n.type]?.crash && !Object.hasOwn(run.down, n.id)).sort((a, b) => r.nodes[b.id].offered - r.nodes[a.id].offered)[0];
      if (target) run = crashNow(d, lab, run, target.id);
    }
    const dt = Math.min(STEP, total - t);
    cost += simulate(d, lab, runOptions(run, run.start * 60 + run.t, lab)).total.burnPerHour * dt / 60;
    run = advance(d, lab, run, dt);
  }
  const availability = run.sent ? 100 * run.served / run.sent : 0;
  const avgMonthly = cost / ch.hours * 730;
  const overload = run.events.filter((e) => (e.kind === 'crashed' || e.kind === 'failover') && !e.forced);
  const checks = ch.stars.map((s) => {
    if (s.kind === 'availability') return { ...s, ok: availability >= s.min - 1e-9, value: availability };
    if (s.kind === 'cost') return { ...s, ok: avgMonthly <= s.max + 1e-9, value: avgMonthly };
    if (s.kind === 'noCrash') { const n = overload.filter((e) => !s.type || type[e.id] === s.type).length; return { ...s, ok: n === 0, value: n }; }
    if (s.kind === 'noLostWrites') return { ...s, ok: !(run.lost > 0), value: run.lost || 0 };
    return { ...s, ok: false, value: null };
  });
  const stars = checks[0]?.ok ? checks.filter((c) => c.ok).length : 0;
  return { stars, max: checks.length, checks, availability, avgMonthly, crashes: overload.length, lost: run.lost || 0, events: run.events, run };
}
