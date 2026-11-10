// Faults a load test injects (evaluator.md §8.13): crash, instanceCrash, groupDown, zoneDown, slow, spike,
// cacheFlush (phase 2); externalDown, poison, hotKey (phase 4). A fault names a component **type**; "busiest" is the node of that type with the highest load in the
// previous tick (ties: design order). Each function changes the simulator's state `st` and pushes events.

export const PHASE2_FAULTS = ['crash', 'instanceCrash', 'groupDown', 'zoneDown', 'slow', 'spike', 'cacheFlush'];
export const PHASE4_FAULTS = ['externalDown', 'poison', 'hotKey'];

// v1's `chaos: [{minute, type}]` is an alias of crash faults (§6.5).
export function faultsOf(test) {
  const out = Array.isArray(test?.faults) ? test.faults.filter((f) => f && Number.isFinite(f.minute) && typeof f.kind === 'string') : [];
  for (const c of Array.isArray(test?.chaos) ? test.chaos : []) if (c && Number.isFinite(c.minute)) out.push({ minute: c.minute, kind: 'crash', type: c.type });
  return out.sort((a, b) => a.minute - b.minute);
}

function busiest(st, type, filter = () => true) {
  let best = null;
  for (const id of st.order) {
    const n = st.info[id];
    if (n.type !== type || !filter(n)) continue;
    if (!best || (st.prevRho[id] || 0) > (st.prevRho[best] || 0) + 1e-12) best = id;
  }
  return best;
}

// Take a node down until minute `until`. `forced`: caused by a fault (not counted by noCrash).
export function takeDown(st, id, t, until, kind, forced) {
  const n = st.info[id];
  if (st.down[id] !== undefined && st.down[id] >= until) return;
  if (st.down[id] === undefined) {
    st.events.push({ t, node: id, kind, ...(forced ? { forced: true } : {}) });
    if (!forced) st.crashes[id] = (st.crashes[id] || 0) + 1;
    // a write-back cache loses what it had not saved (§10.2, v1's flushSeconds)
    if (n.type === 'cache' && n.cfg.writePolicy === 'back') {
      const lost = st.writeRate[id] * (n.comp.flushSeconds ?? 5);
      if (lost > 0) { st.lost += lost; st.events.push({ t, node: id, kind: 'writesLost', n: Math.round(lost) }); }
    }
  }
  st.down[id] = until;
  st.keepData[id] = false;
}
// How long a node stays down after it crashes: a database with a standby fails over.
export const downFor = (n) => (n.type === 'database' && n.standby ? n.comp.crash?.failoverMinutes ?? 2 : n.comp.crash?.downMinutes ?? 5);

export function startFault(f, st, t) {
  const crashable = (n) => n.crashable;
  if (f.kind === 'crash') {
    const id = busiest(st, f.type, crashable);
    if (id) takeDown(st, id, t, t + downFor(st.info[id]), st.info[id].type === 'database' && st.info[id].standby ? 'failover' : 'crashed', true);
  } else if (f.kind === 'groupDown') {
    const id = busiest(st, f.type, (n) => !n.managed);
    if (id) takeDown(st, id, t, t + (f.minutes ?? 5), 'crashed', true);
  } else if (f.kind === 'instanceCrash') {
    const id = busiest(st, f.type || 'server', (n) => n.type === 'server');
    if (id) { st.lostInst[id].push({ until: t + (f.minutes ?? 5), n: 1 }); st.events.push({ t, node: id, kind: 'crashed', forced: true, n: 1 }); }
  } else if (f.kind === 'zoneDown') {
    const until = t + (f.minutes ?? 15);
    st.zoneUntil = Math.max(st.zoneUntil, until);
    st.events.push({ t, node: null, kind: 'zoneDown' });
    for (const id of st.order) {
      const n = st.info[id];
      if (n.type === 'database' && !n.perRequest && n.engine?.multiAz !== 'builtin') {
        if (n.standby) takeDown(st, id, t, t + (n.comp.crash?.failoverMinutes ?? 2), 'failover', true);
        else takeDown(st, id, t, until, 'crashed', true);
      } else if (n.type === 'cache') {
        if (n.cfg.replica) { takeDown(st, id, t, t + 1, 'failover', true); st.keepData[id] = true; } else takeDown(st, id, t, until, 'crashed', true);
      }
    }
  } else if (f.kind === 'slow') {
    const id = busiest(st, f.type || 'database');
    if (id) st.slow[id] = { factor: f.factor ?? 5, until: t + (f.minutes ?? 10) };
  } else if (f.kind === 'spike') {
    st.spikes.push({ factor: f.factor ?? 2, op: f.op || null, until: t + (f.minutes ?? 10) });
  } else if (f.kind === 'externalDown') {
    // every external service of that kind (or of any kind) stops answering for a while
    for (const id of st.order) { const n = st.info[id]; if (n.type === 'external' && (!f.preset || n.cfg.preset === f.preset)) takeDown(st, id, t, t + (f.minutes ?? 10), 'crashed', true); }
  } else if (f.kind === 'poison') {
    // a share of the messages can never be processed (§8.7)
    st.poison = { share: Math.min(1, Math.max(0, f.share ?? 0.01)), until: t + (f.minutes ?? 30) };
    st.events.push({ t, node: null, kind: 'poison', share: st.poison.share });
  } else if (f.kind === 'hotKey') {
    // one item gets a share of an operation's calls (§8.11)
    st.hot.push({ op: f.op || null, share: Math.min(1, Math.max(0, f.share ?? 0.3)), until: t + (f.minutes ?? 15) });
    st.events.push({ t, node: null, kind: 'hotKey', op: f.op || null });
  } else if (f.kind === 'cacheFlush') {
    for (const id of st.order) if (st.info[id].type === 'cache' && st.down[id] === undefined) { st.cold[id] = t; st.events.push({ t, node: id, kind: 'cold', forced: true }); }
  }
}

// Called at the start of every tick: end what is over.
export function endFaults(st, t) {
  if (st.zoneUntil > -1 && st.zoneUntil <= t) { st.zoneUntil = -1; st.events.push({ t, node: null, kind: 'zoneBack' }); }
  for (const id of st.order) {
    if (st.slow[id] && st.slow[id].until <= t) delete st.slow[id];
    const li = st.lostInst[id]; if (li.length) st.lostInst[id] = li.filter((x) => x.until > t);
  }
  st.spikes = st.spikes.filter((s) => s.until > t);
  if (st.poison && st.poison.until <= t) st.poison = null;
  if (st.hot?.length) st.hot = st.hot.filter((h) => h.until > t);
}
