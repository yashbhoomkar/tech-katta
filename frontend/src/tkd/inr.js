// Indian number formatting (spec 24.8): 1,00,000 grouping, rupees, lakh and crore. Engine results stay plain numbers;
// this is for text shown to people. Written by hand (no Intl) so every browser and Node print the same characters.
export function group(n) {
  if (!Number.isFinite(n)) return String(n);
  const neg = n < 0, [int, frac] = String(Math.abs(n)).split('.');
  let head = int.slice(0, -3), out = int.slice(-3);
  while (head.length > 2) { out = `${head.slice(-2)},${out}`; head = head.slice(0, -2); }
  if (head) out = `${head},${out}`;
  return (neg ? '-' : '') + out + (frac ? `.${frac}` : '');
}
const short = (x) => String(Math.round(x * 10) / 10);
export const inr = (n) => (Math.abs(n) >= 1e7 ? `₹${short(n / 1e7)} crore` : Math.abs(n) >= 1e5 ? `₹${short(n / 1e5)} lakh` : `₹${group(Math.round(n))}`);
export const inrExact = (n) => `₹${group(Math.round(n))}`;
export const count = (n) => (Math.abs(n) >= 1e7 ? `${short(n / 1e7)} crore` : Math.abs(n) >= 1e5 ? `${short(n / 1e5)} lakh` : group(Math.round(n)));
export const rate = (n) => `${group(Math.round(n))} a second`;
