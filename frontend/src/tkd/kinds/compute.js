// server and worker: `count` instances of one size; a kill takes one instance away.
import { CAP, P99, PRICE, ARGS } from '../catalogue.js';
export const compute = (kind) => ({
  kind, managed: false, role: 'compute', args: ARGS[kind],
  initState: (p) => ({ alive: p.count }),
  cost: (p) => PRICE.server[p.size] * p.count,
  unitCapacity: (p) => CAP.server[p.size],
  capacity: (p, s) => CAP.server[p.size] * s.alive,
  baseP99: () => P99.server,
  onEvent: (p, s, ev) => (ev.type === 'kill' ? { state: { ...s, alive: Math.max(0, s.alive - 1) } } : null),
  isDown: (p, s) => s.alive === 0,
  units: (p) => p.count,
});
