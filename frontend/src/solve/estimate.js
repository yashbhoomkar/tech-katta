// The estimate helper (context 36, step 12): the arithmetic of back-of-envelope numbers, with the lakh and crore the site
// uses. Pure functions; solve/answer.jsx draws the calculator.

const WORDS = { k: 1e3, thousand: 1e3, lakh: 1e5, lakhs: 1e5, l: 1e5, m: 1e6, million: 1e6, mn: 1e6, cr: 1e7, crore: 1e7, crores: 1e7, b: 1e9, bn: 1e9, billion: 1e9 };
// "5 crore", "2.5 lakh", "10k", "3M", "1e6", "1,00,000" -> a number, or NaN.
export function parseAmount(s) {
  const t = String(s ?? '').trim().toLowerCase().replace(/,/g, '');
  const m = t.match(/^(\d*\.?\d+(?:e\d+)?)\s*([a-z]*)$/);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  if (!m[2]) return n;
  return WORDS[m[2]] ? n * WORDS[m[2]] : NaN;
}

export const PER = { second: 1, minute: 60, hour: 3600, day: 86400, month: 86400 * 30, year: 86400 * 365 };
// `n` events per `per` -> per second, and a peak at `peak` times the average.
export function rate(n, per = 'day', peak = 2) {
  const s = n / (PER[per] || PER.day);
  return { perSecond: s, peak: s * peak, perDay: s * PER.day };
}

const BYTES = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
// `count` items a day, each `size` `unit`, kept for `years` (with `copies` replicas) -> bytes a day and in all.
export function storage(count, size, unit = 'KB', years = 5, copies = 1) {
  const day = count * size * (BYTES[unit] || 1);
  return { perDay: day, total: day * 365 * years * copies };
}

// 1234 -> "1,234"; 2.5e5 -> "2.5 lakh"; 3e7 -> "3 crore"; small numbers keep up to 2 decimals.
export function fmtCount(n) {
  if (!Number.isFinite(n)) return '–';
  if (n >= 1e7) return `${+(n / 1e7).toFixed(1)} crore`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(1)} lakh`;
  if (n >= 100) return Math.round(n).toLocaleString('en-IN');
  return String(+n.toFixed(2));
}
// Bytes in the largest unit that keeps the number at 1 or more.
export function fmtBytes(b) {
  if (!Number.isFinite(b)) return '–';
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
  return `${+b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`;
}
