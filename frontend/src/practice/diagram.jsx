// The diagram, drawn from the compiled design (spec 11.3): output, never input. client on the left, parts in columns by
// their earliest position in any route, stores on the right; one arrow per hop (solid ">", dashed "~>", "miss" on "|");
// read routes ink, write routes ochre; after a failed Run or Submit the blamed part gets a red border and its load.
// Motion (tech-katta-context 24, A3; practice.css): a new part fades in and a new arrow is drawn once; the blamed
// part shudders once; after Accepted a request dot runs along every solid arrow three times, then stops. None of it
// under reduced motion.
import React from "react";
import { STORES } from "../tkd/catalogue.js";
import { useStill } from "../theme/motion.js";

const W = 132, H = 48, GX = 46, GY = 18, PAD = 14;
const facts = (p) => {
  if (p.kind === "server" || p.kind === "worker") return `×${p.count} ${p.size}`;
  if (p.kind === "cache") return `${p.nodes} × ${p.memory_gb} GB`;
  if (p.kind === "sql") return `1 + ${p.replicas} replica${p.replicas === 1 ? "" : "s"}${p.sync ? " · sync" : ""}`;
  if (p.kind === "nosql") return `${p.nodes} nodes · rf ${p.rf}`;
  if (p.kind === "idgen") return p.id_kind;
  if (p.kind === "cdn") return `ttl ${p.ttl_s} s`;
  return p.kind;
};

export function layout(design) {
  const col = { client: 0 }, order = [];
  for (const r of Object.values(design.routes)) r.hops.forEach((h, i) => { if (col[h.part] === undefined || i + 1 < col[h.part]) col[h.part] = i + 1; if (!order.includes(h.part)) order.push(h.part); });
  for (const r of Object.values(design.routes)) for (const p of [r.invalidate, r.update]) if (p && !order.includes(p)) order.push(p);
  for (const n of Object.keys(design.parts)) if (!order.includes(n)) order.push(n);
  // stores sit in their own column, right of every other part
  const isStore = (n) => STORES.has(design.parts[n].kind);
  const maxCol = Math.max(1, ...order.filter((n) => !isStore(n) && col[n] !== undefined).map((n) => col[n]));
  for (const n of order) {
    if (isStore(n)) col[n] = maxCol + 1;
    else if (col[n] === undefined) col[n] = maxCol; // a cache only cleared, or an unused part
  }
  const rows = {}, pos = { client: { x: PAD, y: PAD } };
  for (const n of order) { const c = col[n]; rows[c] = (rows[c] || 0) + 1; pos[n] = { x: PAD + c * (W + GX), y: PAD + (rows[c] - 1) * (H + GY) }; }
  const cols = Math.max(...Object.values(col)) + 1, maxRows = Math.max(1, ...Object.values(rows));
  pos.client.y = PAD + ((maxRows - 1) * (H + GY)) / 2;
  return { pos, width: PAD * 2 + cols * W + (cols - 1) * GX, height: PAD * 2 + maxRows * H + (maxRows - 1) * GY, order };
}

const KEY = { read: "reads", write: "writes", both: "reads and writes" };
export default function Diagram({ design, stale, blame, label, accepted }) {
  const still = useStill();
  if (!design) return <div className="pd-empty">{stale}</div>;
  const { pos, width, height, order } = layout(design);
  const used = new Set(Object.values(design.routes).flatMap((r) => [...r.hops.map((h) => h.part), r.invalidate, r.update].filter(Boolean)));
  const edges = new Map();
  for (const [name, r] of Object.entries(design.routes)) {
    let prev = "client";
    for (const h of r.hops) {
      const key = `${prev}>${h.part}`, e = edges.get(key) || { from: prev, to: h.part, ops: new Set(), modes: new Set(), reqs: [] };
      e.ops.add(h.op); e.modes.add(r.mode); e.reqs.push(name); edges.set(key, e); prev = h.part;
    }
  }
  const path = (a, b, off) => {
    const A = pos[a], B = pos[b], ax = A.x + (a === "client" ? 70 : W), ay = A.y + H / 2 + off, bx = B.x, by = B.y + H / 2 + off;
    if (bx > ax) { const mx = (ax + bx) / 2; return [`M${ax} ${ay}C${mx} ${ay} ${mx} ${by} ${bx} ${by}`, mx, (ay + by) / 2]; }
    const top = Math.min(A.y, B.y) - 8; return [`M${A.x + W / 2} ${A.y}C${A.x + W / 2} ${top - 20} ${B.x + W / 2} ${top - 20} ${B.x + W / 2} ${B.y}`, (A.x + B.x + W) / 2, top - 14];
  };
  let n = 0;
  const kinds = new Set([...edges.values()].map((e) => (e.modes.size > 1 ? "both" : [...e.modes][0])));
  return <div className={"pd" + (stale ? " pd-stale" : "") + (accepted ? " pd-ok" : "")}>
    {stale && <p className="pd-note">{stale}</p>}
    {kinds.size > 1 && <p className="pd-key">{["read", "write", "both"].filter((k) => kinds.has(k)).map((k) => <span key={k}><i className={`pd-${k}`}/>{KEY[k]}</span>)}</p>}
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label || "Diagram of your design"}>
      <defs><marker id="pd-a" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="12" refX="9.5" refY="6" orient="auto"><path d="M1 1L9.5 6L1 11" className="pd-head"/></marker></defs>
      {[...edges.values()].map((e) => { const kind = e.modes.size > 1 ? "both" : [...e.modes][0], [d, lx, ly] = path(e.from, e.to, 0), dashed = e.ops.has("~>");
        // one arrow per hop, coloured by what uses it; after Accepted a dot per kind of request runs along it (a shared
        // hop carries a read dot and, a little later, a write dot)
        const dots = accepted && !still && !dashed ? [...e.modes].map((m, k) => { const t = (n++ * 0.12 + k * 0.5).toFixed(2); return <circle key={m} r="3.5" className={`pd-dot pd-${m}`} opacity="0"><animateMotion path={d} dur="1.2s" begin={`${t}s`} repeatCount="3" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="1.2s" begin={`${t}s`} repeatCount="3"/></circle>; }) : null;
        return <g key={e.from + e.to}><path d={d} pathLength={dashed ? undefined : 1} className={`pd-edge pd-${kind}${dashed ? " pd-later" : ""}`} markerEnd="url(#pd-a)"/>{kind === "both" && <path d={d} pathLength={dashed ? undefined : 1} className={`pd-edge pd-core${dashed ? " pd-later" : ""}`}/>}{dots}{e.ops.has("|") && <text x={lx} y={ly - 5} className="pd-lbl" textAnchor="middle">miss →</text>}{dashed && <text x={lx} y={ly - 5} className="pd-lbl" textAnchor="middle">later</text>}</g>; })}
      <g className="pd-client"><rect x={pos.client.x} y={pos.client.y} width={70} height={H} rx="6"/><text x={pos.client.x + 35} y={pos.client.y + H / 2 + 4} textAnchor="middle">client</text></g>
      {order.map((n) => { const p = design.parts[n], at = pos[n], b = blame?.part === n; return <g key={n} className={"pd-box" + (b ? " pd-blamed" : "") + (used.has(n) ? "" : " pd-unused")}>
        <rect x={at.x} y={at.y} width={W} height={H} rx="6"/>
        <text x={at.x + 10} y={at.y + 19} className="pd-name">{n}{n !== p.kind && <tspan className="pd-kind"> {p.kind}</tspan>}</text>
        <text x={at.x + 10} y={at.y + 36} className="pd-facts">{b && Number.isFinite(blame.rho) ? `${Math.round(blame.rho * 100)} % load` : facts(p)}</text>
      </g>; })}
    </svg>
  </div>;
}
