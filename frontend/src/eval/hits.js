// Hit rates of caches and CDNs, derived from the design and the workload (evaluator.md §8.6). Nothing here is
// given by the problem: a bigger cache or a longer TTL raises the hit rate; data nobody asks for twice is not
// helped by a cache. Pure functions.

const EULER = 0.5772;
// Bytes a cached item takes, per byte of the row (keys, pointers, allocator overhead).
export const CACHE_OVERHEAD = 1.3;
// Points of presence a CDN spreads requests over.
export const CDN_POPS = 50;
export const MAX_HIT = 0.999;
export const MAX_CDN_HIT = 0.99;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Items of size rowBytes that fit in memBytes.
export const itemsThatFit = (memBytes, rowBytes) => Math.floor(memBytes / (rowBytes * CACHE_OVERHEAD));

// Best hit rate with C items held out of N that get traffic: popular items stay (zipf), or any C of N (uniform).
export function hitCap(C, N, zipf) {
  if (!(N > 0) || C >= N) return 1;
  if (!(C > 0)) return 0;
  return zipf ? Math.log(1 + C) / Math.log(1 + N) : C / N;
}

// Share of all reads that find their item expired, with R reads a second, TTL tau seconds, Ce items held.
export function expiryMiss(R, tau, Ce, N, zipf, cap) {
  if (!(R > 0) || !(tau > 0) || !(Ce > 0)) return 0;
  if (zipf) { const H = Math.log(N) + EULER; return Math.log(1 + Ce * H / (R * tau)) / H; }
  return cap / (1 + R * tau / Ce);
}

// A look-aside cache's hit rate for one entity.
//   C: items of it the cache can hold; N: items that get traffic; R: reads a second arriving; tau: TTL (s);
//   W: writes a second that delete an item; warm: 0…1 while the cache refills after a restart.
export function cacheHit({ C, N, zipf, R, tau, W = 0, warm = 1 }) {
  const cap = hitCap(C, N, zipf);
  if (!(R > 0)) return clamp(cap * warm, 0, MAX_HIT);
  const Ce = Math.min(C, N);
  const exp = expiryMiss(R, tau, Ce, N, zipf, cap);
  const invalid = Math.min(1, W / R);
  return clamp((cap - exp) * (1 - invalid) * warm, 0, MAX_HIT);
}

// A CDN's hit rate for a cacheable operation: K objects, R calls a second in all, TTL tau seconds.
export function cdnHit({ K, R, tau, zipf }) {
  if (!(K > 0) || !(tau > 0)) return 0;
  const Rp = R / CDN_POPS;
  if (!(Rp > 0)) return 0;
  if (zipf) { const H = Math.log(K) + EULER; return clamp(1 - Math.log(1 + K * H / (Rp * tau)) / H, 0, MAX_CDN_HIT); }
  return clamp(1 - 1 / (1 + Rp * tau / K), 0, MAX_CDN_HIT);
}
