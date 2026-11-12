// The one rounding helper (spec 22.8): results of Math.exp and Math.pow to 6 decimals, rho to 4, hop latency to 2,
// money to whole rupees, so Run in any browser and Submit on the server agree to the last digit shown.
export const round = (x, d) => { const f = 10 ** d; return Math.round(x * f) / f; };
