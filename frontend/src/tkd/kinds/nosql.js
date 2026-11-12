// A partitioned key-value store: `nodes`, each item on `rf` of them; a write waits for `w`, a read asks `r`.
// It is down once a replica set can't gather max(r, w) answers (nodes − alive ≥ rf − max(r, w) + 1).
import { CAP, P99, PRICE, ARGS } from '../catalogue.js';
export default {
  kind: 'nosql', managed: false, role: 'store', args: ARGS.nosql,
  initState: (p) => ({ alive: p.nodes }),
  cost: (p) => PRICE.nosql * p.nodes,
  capacity: (p, s) => CAP.nosql * s.alive,
  baseP99: () => P99.nosql,
  onEvent: (p, s, ev) => (ev.type === 'kill' ? { state: { ...s, alive: Math.max(0, s.alive - 1) }, lag: p.w === 1 } : null),
  isDown: (p, s) => p.nodes - s.alive >= p.rf - Math.max(p.r, p.w) + 1,
  units: (p) => p.nodes,
};
