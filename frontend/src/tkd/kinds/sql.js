// A relational database: one primary and `replicas`. Reads marked [replica] go to the replicas, everything else to the
// primary. A kill promotes a replica (FAILOVER_S of outage for the primary) or, with none left, takes it down for good.
import { CAP, P99, PRICE, ARGS } from '../catalogue.js';
export default {
  kind: 'sql', managed: false, role: 'store', args: ARGS.sql,
  initState: (p) => ({ primaryUp: true, replicasUp: p.replicas }),
  cost: (p) => PRICE.sql[p.size] * (1 + p.replicas),
  capacity: (p, s, mode) => CAP.sql[p.size][mode],
  baseP99: (p, mode) => P99.sql[mode],
  onEvent: (p, s, ev) => {
    if (ev.type !== 'kill' || !s.primaryUp) return null;
    if (s.replicasUp >= 1) return { state: { ...s, replicasUp: s.replicasUp - 1 }, failover: true, lag: !p.sync };
    return { state: { ...s, primaryUp: false } };
  },
  isDown: (p, s) => !s.primaryUp,
  units: (p) => 1 + p.replicas,
};
