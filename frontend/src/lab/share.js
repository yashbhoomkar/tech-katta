// Sharing a design (context 36, step 11). A share link carries the whole design in the address's fragment
// (#problems/shared/<data>), which browsers never send to a server: the design is compressed (deflate) and written in
// base64url. Nothing is stored anywhere. Also: a PNG of the SVG drawing, and a design as a JSON file to keep or import.

const MAX_BYTES = 200000; // a decoded design larger than this is refused

const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'), b = atob(t + '==='.slice((t.length + 3) % 4)); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
async function pipe(bytes, stream) { const r = new Blob([bytes]).stream().pipeThrough(stream); return new Uint8Array(await new Response(r).arrayBuffer()); }

// What a link holds: the design's name, the problem it was drawn for (if any), its parts and arrows.
export const sharePayload = (name, design, problem) => ({ v: 1, name: String(name || 'Shared design').slice(0, 120), ...(problem ? { problem } : {}), design: { nodes: design.nodes || [], edges: design.edges || [], ...(design.v === 2 ? { v: 2 } : {}) } });

export async function encodeShare(payload) {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  return b64u(await pipe(raw, new CompressionStream('deflate-raw')));
}
// The payload, or null when the link is broken, too large or not a design.
export async function decodeShare(s) {
  try {
    if (typeof s !== 'string' || !/^[A-Za-z0-9_-]{8,}$/.test(s)) return null;
    const bytes = await pipe(unb64u(s), new DecompressionStream('deflate-raw'));
    if (bytes.length > MAX_BYTES) return null;
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (!p || typeof p !== 'object' || !p.design || !Array.isArray(p.design.nodes) || !Array.isArray(p.design.edges)) return null;
    return { name: typeof p.name === 'string' ? p.name.slice(0, 120) : 'Shared design', problem: typeof p.problem === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(p.problem) ? p.problem : null, design: p.design };
  } catch { return null; }
}
// Where share links point. The current app's default; the new frontend (frontend/next) sets its own base, so links made
// there open there (setShareBase), and its /dashboard route still maps this default form.
let SHARE_BASE = "/dashboard/problems/shared/#problems/shared/";
export function setShareBase(base) { SHARE_BASE = base; }
export const shareUrl = (data, origin = location.origin) => `${origin}${SHARE_BASE}${data}`;

// An SVG string as a PNG file, drawn at `scale`.
export function svgToPng(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/), w = m ? +m[3] : 1200, h = m ? +m[4] : 600;
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'); } catch (e) { reject(e); } };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('the drawing could not be turned into an image')); };
    img.src = url;
  });
}
export function downloadBlob(name, blob) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
