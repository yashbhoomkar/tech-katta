// Small shared pieces: the traffic chart of an incident, escaping.
import { traffic } from './sim.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** the incident's evening as an area chart, with its failures marked; ticks (optional) colour the run so far */
export function sparkline(inc, { w = 320, h = 90, ticks = null, cls = '' } = {}) {
  const max = Math.max(...inc.curve.map((c) => c[1])) * 1.1, n = inc.length - 1;
  const X = (t) => (t / n) * w, Y = (r) => h - 6 - (r / max) * (h - 16);
  const pts = Array.from({ length: inc.length }, (_, t) => `${X(t).toFixed(1)},${Y(traffic(inc, t)).toFixed(1)}`);
  const area = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  const ev = inc.events.map((e) => `<g class="ev"><line x1="${X(e.at)}" x2="${X(e.at)}" y1="4" y2="${h}"/><text x="${X(e.at) + 5}" y="13">${e.label}</text></g>`).join('');
  const bad = ticks ? ticks.map((k) => (k.errRate > 0.01 ? `<rect x="${X(k.t) - w / n / 2}" y="0" width="${w / n}" height="${h}" class="bad"/>` : '')).join('') : '';
  return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${bad}<path class="area" d="${area}"/><polyline class="line" points="${pts.join(' ')}"/>${ev}<line class="head" x1="0" x2="0" y1="0" y2="${h}" style="display:none"/></svg>`;
}
