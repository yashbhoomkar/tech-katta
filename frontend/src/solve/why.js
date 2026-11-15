// "Why did this part crash?" (context 36, step 19): at a minute of a replay, the parts in trouble and, for one of
// them, its load against what it can take, what fed it, and why it went down, from the run's own timeline and events.
// Pure; the replay bar draws it.

const DOWN = new Set(['crashed', 'failover']);

// Parts in trouble at tick i: down, over their limit, or just crashed. -> [id] (worst first).
export function troubleAt(r, i) {
  const tl = r?.timeline; if (!tl?.nodes) return [];
  const t0 = i * tl.tickMinutes, out = [];
  for (const [id, n] of Object.entries(tl.nodes)) {
    const rho = n.rho?.[i] ?? 0, up = n.up?.[i] ?? 1;
    const recent = (r.events || []).some((e) => e.node === id && DOWN.has(e.kind) && e.t <= t0 && e.t > t0 - 3 * tl.tickMinutes);
    if (up < 1 || rho > 1 || recent) out.push({ id, score: (up < 1 ? 10 : 0) + rho });
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.id);
}

// -> { id, name, now: {up, rho, inst}, fedBy: [{from, name, rate}], sends: [...], story: [string], fix: string|null }
export function whyPart(r, i, id, { nameOf = (x) => x, comp = null, clock = (m) => `minute ${m}` } = {}) {
  const tl = r.timeline, n = tl.nodes[id]; if (!n) return null;
  const t0 = i * tl.tickMinutes, rho = n.rho?.[i] ?? 0, up = n.up?.[i] ?? 1, inst = n.instances?.[i] ?? 0;
  const rate = (k) => tl.arrows?.[k]?.[i] ?? 0;
  const fedBy = Object.keys(tl.arrows || {}).filter((k) => k.endsWith('>' + id)).map((k) => { const from = k.split('>')[0]; return { from, name: nameOf(from), rate: rate(k) }; }).filter((x) => x.rate > 0).sort((a, b) => b.rate - a.rate);
  const sends = Object.keys(tl.arrows || {}).filter((k) => k.startsWith(id + '>')).map((k) => { const to = k.split('>')[1]; return { to, name: nameOf(to), rate: rate(k) }; }).filter((x) => x.rate > 0).sort((a, b) => b.rate - a.rate);
  const mine = (r.events || []).filter((e) => e.node === id || (e.node === null && e.kind === 'zoneDown'));
  const fell = [...mine].reverse().find((e) => DOWN.has(e.kind) && e.t <= t0 && (e.node === id));
  const back = fell && mine.find((e) => e.node === id && e.kind === 'recovered' && e.t > fell.t);
  const zone = [...mine].reverse().find((e) => e.kind === 'zoneDown' && e.t <= t0);
  const story = [];
  const pct = (x) => `${Math.round(x * 100)}%`;
  story.push(up < 1 ? 'Now: down.' : `Now: at ${pct(rho)} of what ${inst > 1 ? `its ${inst} instances` : 'it'} can take.`);
  let fix = null;
  if (fell) {
    const crash = comp?.crash;
    if (fell.forced) story.push(zone && zone.t === fell.t ? `At ${clock(fell.t)} a zone went dark and took it down: this test does that on purpose.` : `At ${clock(fell.t)} the test failed it on purpose: this test is about what happens next.`);
    else {
      // how long it ran over its limit before it fell
      const lim = crash?.above ?? 1.5, ti = Math.round(fell.t / tl.tickMinutes);
      let k = ti - 1, over = 0; while (k >= 0 && (n.rho?.[k] ?? 0) > lim) { over += tl.tickMinutes; k--; }
      story.push(`At ${clock(fell.t)} it fell over: it had run above ${pct(lim)} of what it can take${over ? ` for ${over} minute${over === 1 ? '' : 's'}` : ''}${crash?.minutes ? ` (it gives way after ${crash.minutes})` : ''}.`);
      fix = comp?.type === 'database' ? 'Give it a larger size, read replicas for reads, or a cache in front that answers repeated reads.' : comp?.type === 'cache' ? 'Give it more nodes or a larger size.' : comp?.type === 'server' ? 'Give it more instances, a larger size, or autoscaling started before the rush; or a cache in front of it for repeated reads.' : 'Give it more capacity: more instances, nodes or a larger size.';
    }
    story.push(back ? `It came back at ${clock(back.t)}${fell.kind === 'failover' ? ', on its standby' : ''}.` : `It was still down at the end of the test.`);
  } else if (rho > 1) {
    story.push('Calls queue and slow down above 100%; held there long enough, it falls over.');
    fix = 'More capacity here, or fewer calls reaching it.';
  }
  return { id, name: nameOf(id), now: { up, rho, inst }, fedBy, sends, story, fix };
}
