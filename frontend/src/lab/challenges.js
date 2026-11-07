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
//   spend {max}          dollars spent during the run (for short, expensive evenings)
//   noCrash {type?}      no component (of that type) crashed from overload; chaos crashes don't count
//   noLostWrites         no writes lost by a write-back cache
import { simulate, advance, newRun, runOptions, crashNow, catalogue, crashOf } from './engine.js';

export function applyChallenge(design, ch) {
  const clients = design.nodes.filter((n) => n.type === 'client').length || 1;
  const f = ch.fixed || {};
  return { ...design, nodes: design.nodes.map((n) => {
    if (n.type === 'client') return { ...n, config: { ...n.config, rps: ch.traffic.rps / clients, pattern: ch.traffic.pattern } };
    if (n.type === 'server' && f.queriesPerRequest) return { ...n, config: { ...n.config, queriesPerRequest: f.queriesPerRequest } };
    if (n.type === 'cdn' && (f.cdnHitPct !== undefined || f.cdnLive !== undefined)) return { ...n, config: { ...n.config, ...(f.cdnHitPct !== undefined ? { hitPct: f.cdnHitPct } : {}), ...(f.cdnLive !== undefined ? { live: f.cdnLive } : {}) } };
    if (n.type === 'cache' && (f.hitPct !== undefined || f.writePct !== undefined)) return { ...n, config: { ...n.config, ...(f.hitPct !== undefined ? { hitPct: f.hitPct } : {}), ...(f.writePct !== undefined ? { writePct: f.writePct } : {}) } };
    return n;
  }) };
}

// The component of a type with the most traffic right now: what a chaos event crashes.
export function chaosTarget(design, lab, run, type) {
  const cat = catalogue(lab), r = simulate(design, lab, runOptions(run, (run.start || 0) * 60 + run.t, lab));
  return design.nodes.filter((n) => n.type === type && cat[n.type] && crashOf(cat[n.type], n.config) && !Object.hasOwn(run.down, n.id)).sort((a, b) => r.nodes[b.id].offered - r.nodes[a.id].offered)[0]?.id || null;
}

const STEP = 5; // simulated minutes per scoring step (chaos minutes and windows are multiples of 5)

// Structure: `requires` lists component types every request must pass through on its way from the
// Clients to wherever it ends (e.g. a Server and a Database). Returns the first type some path
// skips, or null. Paths through a queue continue to its workers; a path ends where nothing follows.
export function missingOnPath(design, required = []) {
  if (!required.length) return null;
  const out = new Map(design.nodes.map((n) => [n.id, []]));
  for (const e of design.edges) if (out.has(e.from) && out.has(e.to)) out.get(e.from).push(e.to);
  const type = new Map(design.nodes.map((n) => [n.id, n.type])), memo = new Map();
  // types found on every path from a node to an end (intersection over the branches)
  const cover = (id, seen = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    if (seen.has(id)) return new Set(required); // a loop is reported elsewhere
    seen.add(id);
    const next = out.get(id); let all = null;
    for (const to of next) { const c = cover(to, seen); all = all ? new Set([...all].filter((x) => c.has(x))) : new Set(c); }
    const mine = new Set(all || []); mine.add(type.get(id)); memo.set(id, mine); return mine;
  };
  for (const n of design.nodes) if (n.type === 'client') { const c = cover(n.id); const miss = required.find((t) => !c.has(t)); if (miss) return miss; }
  return null;
}

// Scores the whole scenario. Availability goals can look at a window of the run ({from, to} minutes
// after the start), e.g. the minutes around the toss. Messages still waiting in a queue and writes a
// write-back cache never passed on by the end count as requests that failed.
export function runChallenge(design, lab, ch) {
  const d = applyChallenge(design, ch), cat = catalogue(lab);
  const blocking = simulate(d, lab).problems.filter((p) => !p.includes('no traffic'));
  if (blocking.length) return { error: blocking[0] };
  const miss = missingOnPath(d, ch.requires);
  const type = Object.fromEntries(d.nodes.map((n) => [n.id, n.type]));
  const chaos = [...(ch.chaos || [])].sort((a, b) => a.minute - b.minute);
  let run = { ...newRun(), start: ch.startHour || 0 }, cost = 0, next = 0;
  const total = ch.hours * 60, windows = ch.stars.map(() => ({ sent: 0, served: 0 }));
  for (let t = 0; t < total; t += STEP) {
    for (; next < chaos.length && chaos[next].minute <= t; next++) {
      const target = chaosTarget(d, lab, run, chaos[next].type);
      if (target) run = crashNow(d, lab, run, target);
    }
    const dt = Math.min(STEP, total - t);
    cost += simulate(d, lab, runOptions(run, run.start * 60 + run.t, lab)).total.burnPerHour * dt / 60;
    const before = run;
    run = advance(d, lab, run, dt);
    ch.stars.forEach((s, i) => { if (s.from !== undefined && t >= s.from && t < s.to) { windows[i].sent += run.sent - before.sent; windows[i].served += run.served - before.served; } });
  }
  const left = Object.values(run.backlog || {}).reduce((a, b) => a + b, 0);
  const served = Math.max(0, run.served - left);
  const availability = run.sent ? 100 * served / run.sent : 0;
  const avgMonthly = cost / ch.hours * 730;
  const overload = run.events.filter((e) => (e.kind === 'crashed' || e.kind === 'failover') && !e.forced);
  const checks = ch.stars.map((s, i) => {
    if (s.kind === 'availability') { const v = s.from !== undefined ? (windows[i].sent ? 100 * windows[i].served / windows[i].sent : 100) : availability; return { ...s, ok: v >= s.min - 1e-9, value: v }; }
    if (s.kind === 'cost') return { ...s, ok: avgMonthly <= s.max + 1e-9, value: avgMonthly };
    if (s.kind === 'spend') return { ...s, ok: cost <= s.max + 1e-9, value: cost };
    if (s.kind === 'noCrash') { const n = overload.filter((e) => !s.type || type[e.id] === s.type).length; return { ...s, ok: n === 0, value: n }; }
    if (s.kind === 'noLostWrites') return { ...s, ok: !(run.lost > 0), value: run.lost || 0 };
    return { ...s, ok: false, value: null };
  });
  // A design that lets requests skip a required part earns nothing, whatever the numbers say.
  if (miss) for (const c of checks) c.ok = false;
  const stars = checks[0]?.ok ? checks.filter((c) => c.ok).length : 0;
  return { stars, max: checks.length, checks, missing: miss, availability, avgMonthly, spent: cost, crashes: overload.length, lost: run.lost || 0, unprocessed: left, events: run.events, run };
}
