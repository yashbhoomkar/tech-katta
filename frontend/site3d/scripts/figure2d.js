// A still picture of a 3D system, for Text mode: the same parts in the same pastels, seen from above, as plain SVG (no WebGL, no motion).
import { KIND_PASTEL } from './palette.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TONE = { ok: '#2FA36B', warn: '#F5A524', alert: '#F23B3B' };
/** system: { parts: {id: {kind, x, z, name}}, paths: {id: [from, to]} }; state: { parts: {id: 'ok'|'warn'|'alert'} } */
export function svgFigure(system, state = {}) {
  const parts = Object.entries(system?.parts || {});
  if (!parts.length) return '';
  const xs = parts.map(([, p]) => p.x), zs = parts.map(([, p]) => p.z), u = 52, pad = 1.7;
  const x0 = Math.min(...xs) - pad, z0 = Math.min(...zs) - pad, w = (Math.max(...xs) - Math.min(...xs) + 2 * pad) * u, h = (Math.max(...zs) - Math.min(...zs) + 2 * pad) * u;
  const at = (p) => [(p.x - x0) * u, (p.z - z0) * u];
  const lines = Object.values(system.paths || {}).map(([a, b]) => { const A = system.parts[a], B = system.parts[b]; if (!A || !B) return ''; const [ax, ay] = at(A), [bx, by] = at(B); return `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="var(--ink-3, #888)" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`; }).join('');
  const boxes = parts.map(([id, p]) => {
    const [cx, cy] = at(p), c = `var(--${KIND_PASTEL[p.kind] || 'lilac'})`, e = `var(--${KIND_PASTEL[p.kind] || 'lilac'}-edge)`, tone = state.parts?.[id];
    return `<rect x="${(cx - 26).toFixed(1)}" y="${(cy - 18).toFixed(1)}" width="52" height="36" rx="9" fill="${c}" stroke="${tone && TONE[tone] ? TONE[tone] : e}" stroke-width="${tone && TONE[tone] ? 3 : 1.5}"/>`
      + `<text x="${cx.toFixed(1)}" y="${(cy + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--ink-2, currentColor)">${esc(p.name || p.kind)}</text>`;
  }).join('');
  const names = [...new Set(parts.map(([, p]) => p.name || p.kind))].join(', ');
  return `<svg viewBox="0 0 ${w.toFixed(0)} ${(h + 14).toFixed(0)}" role="img" aria-label="Diagram of the system: ${esc(names)}" xmlns="http://www.w3.org/2000/svg">${lines}${boxes}</svg>`;
}
