// "Share as image" after Accepted (tech-katta-context 24, G6): a 1200 x 630 picture of the result, made in the browser
// on a canvas. No name, no account, nothing about the learner: the problem, the verdict, the numbers and the design's
// diagram. Always the light paper look (TOKENS from palette.js), whatever the page's theme. The diagram is drawn
// here from the same layout() and arrow rules as diagram.jsx (one arrow per hop; reads ink, writes ochre, both one
// band). Shared through the device's share sheet when it can share files, otherwise saved as a PNG.
import { TOKENS as T } from "../theme/palette.js";
import { layout, facts } from "./diagram.jsx";
const W = 1200, H = 630, BOX_W = 132, BOX_H = 48;
const MONO = '"Geist Mono Variable", ui-monospace, monospace', SANS = '"Geist Variable", Arial, sans-serif', SERIF = SANS; // one typeface (spec 32)

function wrap(g, text, maxW, max) { const out = []; let line = ""; for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out.slice(0, max); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// the design, scaled into the box (bx, by, bw, bh)
function drawDesign(g, design, bx, by, bw, bh) {
  const { pos, width, height, order } = layout(design), s = Math.min(bw / width, bh / height, 1.4);
  g.save(); g.translate(bx + (bw - width * s) / 2, by + (bh - height * s) / 2); g.scale(s, s);
  const edges = new Map();
  for (const r of Object.values(design.routes)) { let prev = "client"; for (const h of r.hops) { const k = `${prev}>${h.part}`, e = edges.get(k) || { from: prev, to: h.part, modes: new Set(), later: false }; e.modes.add(r.mode); if (h.op === "~>") e.later = true; edges.set(k, e); prev = h.part; } }
  for (const e of edges.values()) {
    const A = pos[e.from], B = pos[e.to], ax = A.x + (e.from === "client" ? 70 : BOX_W), ay = A.y + BOX_H / 2, bx2 = B.x, by2 = B.y + BOX_H / 2, both = e.modes.size > 1;
    const line = (c, w) => { g.beginPath(); g.setLineDash(e.later ? [5, 4] : []); g.lineWidth = w; g.strokeStyle = c;
      if (bx2 > ax) { const mx = (ax + bx2) / 2; g.moveTo(ax, ay); g.bezierCurveTo(mx, ay, mx, by2, bx2, by2); } else { const top = Math.min(A.y, B.y) - 8; g.moveTo(A.x + BOX_W / 2, A.y); g.bezierCurveTo(A.x + BOX_W / 2, top - 20, B.x + BOX_W / 2, top - 20, B.x + BOX_W / 2, B.y); }
      g.stroke(); };
    if (both) { line(T.ink, 3.2); line(T.accent, 1.2); } else line(e.modes.has("write") ? T.accent : T["ink-3"], 1.6);
    if (bx2 > ax) { g.setLineDash([]); g.beginPath(); g.moveTo(bx2 - 9, by2 - 5); g.lineTo(bx2, by2); g.lineTo(bx2 - 9, by2 + 5); g.lineWidth = 1.5; g.strokeStyle = T.muted; g.stroke(); }
  }
  g.setLineDash([]);
  const box = (x, y, w, fill, stroke) => { rr(g, x, y, w, BOX_H, 6); g.fillStyle = fill; g.fill(); g.lineWidth = 1.2; g.strokeStyle = stroke; g.stroke(); };
  box(pos.client.x, pos.client.y, 70, T.surface, T["line-strong"]); g.fillStyle = T.muted; g.font = `600 11px ${MONO}`; g.textAlign = "center"; g.fillText("client", pos.client.x + 35, pos.client.y + BOX_H / 2 + 4);
  g.textAlign = "left";
  for (const n of order) { const at = pos[n], p = design.parts[n]; box(at.x, at.y, BOX_W, T.bg, T["line-strong"]); g.fillStyle = T.ink; g.font = `600 12px ${MONO}`; g.fillText(n, at.x + 10, at.y + 19);
    if (n !== p.kind) { const w = g.measureText(n + " ").width; g.fillStyle = T.accent; g.font = `500 11px ${MONO}`; g.fillText(p.kind, at.x + 10 + w, at.y + 19); }
    g.fillStyle = T.muted; const f = facts(p); let fs = 11; do { g.font = `500 ${fs}px ${MONO}`; } while (g.measureText(f).width > BOX_W - 18 && --fs > 8); g.fillText(f, at.x + 10, at.y + 36); }
  g.restore();
}

export async function makeCard({ problem, design, result }) {
  try { await document.fonts?.ready; } catch { /* draw with fallbacks */ }
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = T.page; g.fillRect(0, 0, W, H);
  // brand: the marigold square and the name
  g.fillStyle = T.brand; rr(g, 60, 52, 34, 34, 7); g.fill(); g.fillStyle = T["on-brand"]; g.font = `700 13px ${MONO}`; g.textAlign = "center"; g.fillText("TK", 77, 74); g.textAlign = "left";
  g.fillStyle = T.ink; g.font = `600 22px ${SANS}`; g.fillText("Tech Katta", 106, 76);
  g.fillStyle = T.muted; g.font = `600 13px ${MONO}`; g.fillText("PRACTICE · SYSTEM DESIGN", 60, 124);
  // the problem
  g.fillStyle = T.ink; g.font = `600 46px ${SERIF}`; const lines = wrap(g, problem.title, 1080, 2); lines.forEach((l, i) => g.fillText(l, 60, 180 + i * 54));
  // the verdict, with the marker under its lower half, and the numbers beside it
  const vy = 180 + lines.length * 54 + 26; g.font = `600 38px ${SERIF}`; const vw = g.measureText("Accepted").width;
  g.fillStyle = T.mark; g.fillRect(56, vy - 15, vw + 10, 19); g.fillStyle = T.ink; g.fillText("Accepted", 60, vy);
  const bits = [`${result.passed}/${result.total} tests`, Number.isFinite(result.cost_inr) ? `₹${Math.round(result.cost_inr).toLocaleString("en-IN")}/month` : null, Number.isFinite(result.rank_p99_ms) ? `p99 ${result.rank_p99_ms} ms` : null].filter(Boolean);
  g.fillStyle = T["ink-2"]; g.font = `500 20px ${MONO}`; g.fillText(bits.join("  ·  "), 60 + vw + 36, vy - 4);
  // the design, in a white card across the width
  const cx = 60, cy = vy + 30, cw = 1080, ch = H - 92 - cy; rr(g, cx, cy, cw, ch, 14); g.fillStyle = T.bg; g.fill(); g.strokeStyle = T.line; g.lineWidth = 1; g.stroke();
  g.fillStyle = T.muted; g.font = `600 12px ${MONO}`; g.fillText("THE DESIGN", cx + 20, cy + 28);
  if (design) drawDesign(g, design, cx + 20, cy + 40, cw - 40, ch - 52);
  g.fillStyle = T.muted; g.font = `500 16px ${MONO}`; g.fillText(`tech.katta.cc/dashboard/practice/${problem.slug}/`, 60, H - 40);
  return await new Promise((res) => c.toBlob(res, "image/png"));
}

// Share through the device's share sheet when it takes files, otherwise save the PNG. Returns "shared", "saved" or null.
export async function shareCard(args) {
  const blob = await makeCard(args); if (!blob) return null;
  const file = new File([blob], `tech-katta-${args.problem.slug}-accepted.png`, { type: "image/png" });
  const url = `https://tech.katta.cc/dashboard/practice/${args.problem.slug}/`;
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: `Accepted: ${args.problem.title}`, text: url }); return "shared"; } catch (e) { if (e?.name === "AbortError") return null; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return "saved";
}
