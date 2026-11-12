// An in-memory cache: `nodes` × `memory_gb`. Its hit ratio is section 22.2 of the spec; a kill takes a node (and its
// share of the copies) away, a flush empties it. With no node left it is bypassed, never a failure.
import { CAP, P99, PRICE, ARGS, HIT_MAX } from '../catalogue.js';
import { round } from '../round.js';
export default {
  kind: 'cache', managed: false, role: 'cache', args: ARGS.cache, cache: true,
  initState: (p) => ({ alive: p.nodes }),
  cost: (p) => PRICE.cachePerGb * p.memory_gb * p.nodes,
  capacity: (p, s) => CAP.cache * s.alive,
  baseP99: () => P99.cache,
  onEvent: (p, s, ev) => {
    if (ev.type === 'kill') { const alive = Math.max(0, s.alive - 1); return { state: { ...s, alive }, cold: s.alive ? alive / s.alive : 0 }; }
    if (ev.type === 'flush') return { state: s, cold: 0 };
    return null;
  },
  isDown: () => false, // a dead cache is skipped (bypassed), so it never takes a request down
  units: (p) => p.nodes,
  // r: { q: the request's rate, D: distinct keys, B: bytes per item, s: skew, churn: writes / reads that clear it }
  hitRatio: (p, st, r) => {
    if (!st.alive || !(r.q > 0) || !(r.D > 0) || !(r.B > 0)) return 0;
    const items = st.alive * p.memory_gb * 1e9 / r.B;
    const c = Math.min(1, items / r.D);
    const warm = round(1 - round(Math.exp(-r.q * p.ttl_s / r.D), 6), 6);
    const shaped = round(Math.pow(c * warm, 1 - r.s), 6);
    return round(Math.min(HIT_MAX, shaped * (1 - r.churn)), 6);
  },
};
