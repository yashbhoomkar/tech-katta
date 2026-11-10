// Latency maths of the v2 evaluator (evaluator.md §8.8). Pure functions, no state.
//
// A hop's time is a fixed part (its base time b) plus a waiting part that grows with load. The waiting part is
// treated as exponential: mean w, variance w². Times along a path add up (means and variances); a hop that is
// only sometimes called mixes in. Percentiles come from a gamma distribution with the same mean and variance,
// using the Wilson–Hilferty approximation, which is exact enough here (an exponential's p99 comes out 461.01
// against an exact 460.52).

// Standard normal quantiles for the percentiles the evaluator reports.
export const Z = { 0.5: 0, 0.9: 1.2816, 0.95: 1.6449, 0.99: 2.3263, 0.999: 3.0902 };
// The busiest a node counts as for waiting time below saturation, and the multiple of b it waits once past it.
export const RHO_CAP = 0.95;
export const SATURATED_WAIT = 19;

// Standard normal CDF (Abramowitz–Stegun 26.2.17; error below 7.5e-8).
export function phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const q = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - q : q;
}

// Quantile p (one of the keys of Z) of a gamma with mean M and variance V.
export function gammaQ(M, V, p) {
  if (!(M > 0)) return 0;
  if (!(V > 0)) return M;
  const z = Z[p];
  if (z === undefined) throw new Error(`gammaQ: no quantile for ${p}`);
  const k = M * M / V, c = 1 - 1 / (9 * k) + z / (3 * Math.sqrt(k));
  return Math.max(0, M * c * c * c);
}

// Share of a gamma(mean M, variance V) above x.
export function gammaTail(M, V, x) {
  if (x <= 0) return 1;
  if (!(M > 0)) return 0;
  if (!(V > 0)) return x >= M ? 0 : 1;
  const k = M * M / V, z = (Math.cbrt(x / M) - (1 - 1 / (9 * k))) * 3 * Math.sqrt(k);
  return 1 - phi(z);
}

// One hop: base time b (ms) at utilisation rho → { fixed, wait, v } (v = variance of the wait).
export function hopTime(b, rho) {
  const r = Math.min(Math.max(rho, 0), RHO_CAP);
  const wait = rho >= 1 ? b * SATURATED_WAIT : b * r / (1 - r);
  return { fixed: b, wait, v: wait * wait };
}

// Harmonic numbers, for waiting on the slowest of s shards: mean × H_s, variance × Σ 1/i².
export const harmonic = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 1 / i; return s; };
export const harmonic2 = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 1 / (i * i); return s; };

// Summary of a time distribution with a fixed part F and a variable part of mean M and variance V.
export function summarise({ F, M, V }) {
  return { mean: F + M, p50: F + gammaQ(M, V, 0.5), p99: F + gammaQ(M, V, 0.99) };
}

// Share of calls slower than limit ms.
export const slowShare = ({ F, M, V }, limit) => gammaTail(M, V, limit - F);

// Combine a split group (one call goes to one of several targets, with weights): the mixture's moments.
// parts: [{ w, F, M, V }]. → { F, M, V } with F = the smallest fixed part.
export function mix(parts) {
  const total = parts.reduce((a, p) => a + p.w, 0) || 1;
  let E = 0, E2 = 0, F = Infinity;
  for (const p of parts) { const w = p.w / total, Ei = p.F + p.M; E += w * Ei; E2 += w * (p.V + Ei * Ei); F = Math.min(F, p.F); }
  if (F === Infinity) F = 0;
  return { F, M: Math.max(0, E - F), V: Math.max(0, E2 - E * E) };
}
