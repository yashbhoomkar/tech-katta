// The judge's physics: every number of tech-katta-context/21-PROBLEM-EXPERIENCE-LEETCODE-STYLE.md section 6 (with the
// section 22 constants), and the part kinds' settings. Teaching values, round on purpose. Nothing else in tkd/ writes a
// capacity, a latency or a price: a change here changes verdicts, so raise JUDGE_VERSION (judge.js) with it.

// cap: calls a second one unit serves; p99: milliseconds at low load; price: rupees a month per unit.
export const CAP = {
  lb: 50_000, cdn: 1_000_000, queue: 20_000, objectstore: 1_000_000, idgen: 1_000_000,
  server: { small: 500, medium: 1_000, large: 2_000 },
  cache: 50_000, nosql: 5_000,
  sql: { small: { read: 1_000, write: 300 }, medium: { read: 3_000, write: 1_000 }, large: { read: 8_000, write: 2_500 } },
};
export const P99 = { lb: 2, cdn: 15, server: 20, cache: 2, sql: { read: 10, write: 15 }, nosql: 8, queue: 5, objectstore: 40, idgen: 0 };
export const PRICE = {
  lb: 2_000, cdn: 3_000, queue: 4_000, objectstore: 2_000, idgen: 0,
  server: { small: 3_000, medium: 6_000, large: 12_000 },
  cachePerGb: 1_500, nosql: 10_000,
  sql: { small: 8_000, medium: 20_000, large: 45_000 },
};

export const REPLICA_LAG_S = 1;   // an async sql replica, or nosql with r + w <= rf, is this far behind
export const FAILOVER_S = 30;     // a promoted replica takes this long to take over
export const SCAN_FACTOR = 100;   // a lookup without an index reads every row
export const RHO_MAX = 0.95;      // latency stops growing at this utilisation (the part is dropping calls by then)
export const CDN_HIT = 0.95;
export const HIT_MAX = 0.99;      // at least 1 % of reads always miss
export const P50_RATIO = 0.25;
export const COLD_S = 60;         // a restarted cache is cold (or short of a node's share) for this long

export const SIZES = ['small', 'medium', 'large'];
export const ID_KINDS = ['counter', 'snowflake', 'random', 'hash'];
export const STORES = new Set(['sql', 'nosql', 'objectstore']);
export const COMPUTE = new Set(['server', 'worker']);
export const KIND_NAMES = ['lb', 'cdn', 'server', 'worker', 'cache', 'sql', 'nosql', 'queue', 'objectstore', 'idgen'];
// Roles a test can kill or flush without knowing the learner's names (kill_role / flush_role).
export const ROLES = ['server', 'worker', 'cache', 'sql', 'nosql'];

// Settings of each kind, in the order format() writes them. int: whole number in [min, max]; enum: one of values;
// bool: true/false. max "rf" means "at most this part's rf" (nosql w and r).
const int = (min, max, def) => ({ type: 'int', min, max, default: def });
const oneOf = (values, def) => ({ type: 'enum', values, default: def });
export const ARGS = {
  lb: {},
  cdn: { ttl_s: int(1, 86_400, 60) },
  server: { count: int(1, 200, 1), size: oneOf(SIZES, 'small') },
  worker: { count: int(1, 200, 1), size: oneOf(SIZES, 'small') },
  cache: { nodes: int(1, 20, 1), memory_gb: int(1, 256, 1), ttl_s: int(1, 86_400, 300) },
  sql: { size: oneOf(SIZES, 'small'), replicas: int(0, 5, 0), sync: { type: 'bool', default: false } },
  nosql: { nodes: int(3, 50, 3), rf: int(1, 5, 3), w: int(1, 'rf', 1), r: int(1, 'rf', 1) },
  queue: {},
  objectstore: {},
  idgen: { kind: oneOf(ID_KINDS, 'counter'), bits: int(16, 128, 64) },
};
// Kinds with no single point of failure: a test can't kill them.
export const MANAGED = new Set(['lb', 'cdn', 'queue', 'objectstore', 'idgen']);

// Every number above, as one object, for the "How the judge works" page and the catalogue hash.
export const CATALOGUE = { CAP, P99, PRICE, REPLICA_LAG_S, FAILOVER_S, SCAN_FACTOR, RHO_MAX, CDN_HIT, HIT_MAX, P50_RATIO, COLD_S, ARGS };
