// Managed parts (lb, cdn, queue, objectstore, idgen): one whole part, no single point of failure, a test can't kill it.
import { CAP, P99, PRICE, ARGS } from '../catalogue.js';
export const managed = (kind, role, extra = {}) => ({
  kind, managed: true, role, args: ARGS[kind],
  initState: () => ({}),
  cost: () => PRICE[kind],
  capacity: () => CAP[kind],
  baseP99: () => P99[kind],
  onEvent: () => null,
  isDown: () => false,
  ...extra,
});
