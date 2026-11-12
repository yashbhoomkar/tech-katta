// The Builder's logic, without React (spec section 20): every change is current text → lenient parse → change the
// parsed statements → format() → new text. The page holds one string; this file only ever returns new statements.
import { parseLenient } from "../tkd/parse.js";
import { format } from "../tkd/format.js";
import { ARGS, CAP, STORES, MANAGED } from "../tkd/catalogue.js";
import { KINDS } from "../tkd/kinds/index.js";
import { group, count, inrExact } from "../tkd/inr.js";

const clone = (x) => JSON.parse(JSON.stringify(x));
export const read = (text) => parseLenient(text || "");
export const write = (parsed, problem) => format(parsed, problem);
export const parts = (parsed) => parsed.statements.filter((s) => s.type === "part");
export const tables = (parsed) => parsed.statements.filter((s) => s.type === "table");
export const routeOf = (parsed, name) => parsed.statements.find((s) => s.type === "route" && s.request === name) || null;
export const kindOf = (parsed, name) => (name === "client" ? "client" : parts(parsed).find((p) => p.name === name)?.kind || null);
export const argOf = (st, name) => { const a = st.args.find((x) => x.name === name); return a ? a.value : ARGS[st.kind]?.[name]?.default; };
// The settings of a part statement as the engine sees them (defaults filled in).
export const settings = (st) => Object.fromEntries(Object.keys(ARGS[st.kind] || {}).map((n) => [n, argOf(st, n)]));

// Generated names (20.4): lb, cdn, api, worker, cache, db, kv, queue, files, ids; then 2, 3, …
export const BASE_NAME = { lb: "lb", cdn: "cdn", server: "api", worker: "worker", cache: "cache", sql: "db", nosql: "kv", queue: "queue", objectstore: "files", idgen: "ids" };
export function newName(parsed, kind) {
  const taken = new Set(parts(parsed).map((p) => p.name)), base = BASE_NAME[kind] || kind;
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

export function addPart(parsed, kind) {
  const p = clone(parsed), name = newName(p, kind);
  const at = p.statements.reduce((last, s, i) => (s.type === "part" ? i : last), -1);
  p.statements.splice(at + 1, 0, { type: "part", name, kind, args: [], line: 0 });
  return { parsed: p, name };
}
export function duplicatePart(parsed, name) {
  const p = clone(parsed), st = parts(p).find((x) => x.name === name);
  if (!st) return { parsed: p, name: null };
  const copy = { ...clone(st), name: newName(p, st.kind) };
  p.statements.splice(p.statements.indexOf(st) + 1, 0, copy);
  return { parsed: p, name: copy.name };
}
export function setArg(parsed, name, arg, value) {
  const p = clone(parsed), st = parts(p).find((x) => x.name === name);
  if (!st) return p;
  const a = st.args.find((x) => x.name === arg);
  if (a) { a.value = value; a.raw = String(value); } else st.args.push({ name: arg, value, raw: String(value) });
  return p;
}
// Requests whose route uses a part (as a hop, or after "then").
export const usesOf = (parsed, name) => parsed.statements.filter((s) => s.type === "route" && (s.hops.some((h) => h.part === name) || s.after?.part === name)).map((s) => s.request);

// Rename everywhere: the part, every hop, every "then", every table.
export function renamePart(parsed, from, to) {
  const p = clone(parsed);
  for (const s of p.statements) {
    if (s.type === "part" && s.name === from) s.name = to;
    if (s.type === "table" && s.part === from) s.part = to;
    if (s.type === "route") { for (const h of s.hops) if (h.part === from) h.part = to; if (s.after?.part === from) s.after.part = to; }
  }
  return p;
}
// Delete a part: removed from every route (its neighbours joined with ">"), "then … it" dropped, its tables too.
export function deletePart(parsed, name) {
  const p = clone(parsed);
  p.statements = p.statements.filter((s) => !(s.type === "part" && s.name === name) && !(s.type === "table" && s.part === name));
  for (const s of p.statements) if (s.type === "route") {
    const i = s.hops.findIndex((h) => h.part === name);
    if (i >= 0) { s.hops.splice(i, 1); join(p, s.hops, i); }
    if (s.after?.part === name) s.after = null;
  }
  return p;
}
const kindIsCache = (p, name) => ["cache", "cdn"].includes(kindOf(p, name));
// after removing hop i, the hop now at i joins its new neighbour: "~>" stays, "|" stays only after a cache, else ">"
function join(p, hops, i) { const h = hops[i]; if (!h) return; h.op = i === 0 ? ">" : h.op === "~>" ? "~>" : h.op === "|" && kindIsCache(p, hops[i - 1]?.part) ? "|" : ">"; }

// ---- routes ------------------------------------------------------------------------------------------------------
function ensureRoute(p, req) {
  let r = routeOf(p, req.name);
  if (!r) { r = { type: "route", mode: req.mode, request: req.name, hops: [], after: null, open: false, line: 0 }; p.statements.push(r); }
  r.open = false;
  return r;
}
export function addHop(parsed, req, hop) {
  const p = clone(parsed), r = ensureRoute(p, req);
  r.hops.push({ op: r.hops.length ? hop.op : ">", part: hop.part, replica: !!hop.replica });
  return p;
}
export function changeHop(parsed, req, i, change) {
  const p = clone(parsed), r = ensureRoute(p, req);
  if (r.hops[i]) Object.assign(r.hops[i], change);
  if (i === 0 && r.hops[0]) r.hops[0].op = ">";
  return p;
}
export function removeHop(parsed, req, i, after = false) {
  const p = clone(parsed), r = ensureRoute(p, req);
  if (after) r.hops.splice(i); else { r.hops.splice(i, 1); join(p, r.hops, i); }
  return p;
}
// action: "invalidate" | "update" | null
export function setAfter(parsed, req, action, part) {
  const p = clone(parsed), r = ensureRoute(p, req);
  r.after = action ? { action, part } : null;
  return p;
}

// ---- "What happens next?" (20.6): only parts the rules of section 3.4 allow after the current last hop ---------------
const OP_LABEL = { ">": (n) => `Call ${n}`, "|": (n) => `On a miss, ask ${n}`, "~>": (n) => `Hand over to ${n} — don't wait` };
export function candidates(parsed, problem, req, upto) {
  const r = routeOf(parsed, req.name), hops = r ? r.hops.slice(0, upto ?? r.hops.length) : [];
  const last = hops.length ? hops[hops.length - 1] : null, lastKind = last ? kindOf(parsed, last.part) : "client";
  const inRoute = new Set(hops.map((h) => h.part)), out = [];
  if (STORES.has(lastKind)) return { list: [], why: `Nothing can come after ${last.part}: it is where the data lives.` };
  for (const st of parts(parsed)) {
    const k = st.kind;
    if (inRoute.has(st.name)) continue;
    const rows = [];
    if (lastKind === "queue") { if (k === "worker") rows.push({ op: ">", label: "Worker picks it up" }); }
    else if (k === "worker") continue; // workers take work from a queue
    else if (k === "queue") { if (req.mode === "write" && hops.length) rows.push({ op: "~>", label: OP_LABEL["~>"](st.name) }); }
    else if (k === "idgen") { if (req.mode === "write" && (lastKind === "server" || lastKind === "worker") && !hops.some((h) => kindOf(parsed, h.part) === "idgen")) rows.push({ op: ">", label: OP_LABEL[">"](st.name) }); }
    else if (k === "cdn" && !req.cdn_ok) continue;
    else if ((lastKind === "cache" || lastKind === "cdn") && (STORES.has(k) || k === "server" || k === "cache")) rows.push({ op: "|", label: OP_LABEL["|"](st.name), usual: true }, { op: ">", label: `Then always call ${st.name}` });
    else rows.push({ op: ">", label: OP_LABEL[">"](st.name) });
    if (!rows.length) continue;
    const replicaOk = k === "sql" && req.mode === "read" && argOf(st, "replicas") >= 1;
    out.push({ part: st.name, kind: k, rows, replicaOk });
  }
  const why = out.length ? "" : !parts(parsed).some((s) => STORES.has(s.kind)) ? "There is no place to store data yet." : "Every part that can come next is already in this request.";
  return { list: out, why, needsStore: !parts(parsed).some((s) => STORES.has(s.kind)) };
}

// ---- tables -----------------------------------------------------------------------------------------------------
export function addTable(parsed, part, name, columns, pk) {
  const p = clone(parsed);
  const at = p.statements.reduce((last, s, i) => (s.type === "part" || s.type === "table" ? i : last), -1);
  p.statements.splice(at + 1, 0, { type: "table", part, name, columns: columns.map((c) => ({ name: c, pk: c === pk })), index: [], line: 0 });
  return p;
}
export function updateTable(parsed, key, fn) {
  const p = clone(parsed), t = tables(p).find((x) => `${x.part}.${x.name}` === key);
  if (t) fn(t);
  return p;
}
export function deleteTable(parsed, key) { const p = clone(parsed); p.statements = p.statements.filter((s) => !(s.type === "table" && `${s.part}.${s.name}` === key)); return p; }
// Hinted tables not yet on any store, with the first store that could hold them.
export function tableSuggestions(parsed, problem) {
  const store = parts(parsed).find((s) => s.kind === "sql" || s.kind === "nosql");
  if (!store) return [];
  const have = new Set(tables(parsed).map((t) => t.name));
  return (problem.tables_hint || []).filter((h) => !have.has(h.name)).map((h) => ({ ...h, part: store.name }));
}
// "GET_LINK looks up by "code" — primary key, fast" for each request that uses a table
export function lookupLines(parsed, problem, t) {
  return (problem.requests || []).filter((r) => r.table === t.name && r.key).map((r) => {
    const col = t.columns.find((c) => c.name === r.key), indexed = t.index.some((i) => i.name === r.key);
    if (col?.pk) return { ok: true, text: `${r.name} looks up by "${r.key}" — primary key, fast` };
    if (indexed) return { ok: true, text: `${r.name} looks up by "${r.key}" — indexed, fast` };
    return { ok: false, text: `${r.name} looks up by "${r.key}" — not indexed: the database reads every row` };
  });
}

// ---- words ------------------------------------------------------------------------------------------------------
export const TTL_PRESETS = [[10, "10 s"], [60, "1 min"], [300, "5 min"], [3600, "1 hour"], [86400, "1 day"]];
export const ttlWords = (s) => TTL_PRESETS.find((x) => x[0] === s)?.[1] || (s % 86400 === 0 ? `${s / 86400} days` : s % 3600 === 0 ? `${s / 3600} hours` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);
export const priceOf = (st) => { try { return KINDS[st.kind]?.cost(settings(st)) ?? 0; } catch { return 0; } };
export const managed = (kind) => MANAGED.has(kind);
// One grey line under a part's settings, in the judge's own numbers (20.4).
export function consequence(st, problem) {
  const s = settings(st), k = st.kind, price = inrExact(priceOf(st));
  if (k === "server" || k === "worker") { const u = CAP.server[s.size]; return `${s.count} × ${group(u)} = ${group(u * s.count)} requests a second · ${price}`; }
  if (k === "cache") {
    const r = (problem.requests || []).find((x) => x.mode === "read" && x.item_bytes), bytes = r?.item_bytes || 1000, noun = r?.table || "items";
    return `Holds about ${count(Math.floor((s.nodes * s.memory_gb * 1e9) / bytes))} ${noun} of ${group(bytes)} bytes · ${price}`;
  }
  if (k === "sql") { const c = CAP.sql[s.size]; return `1 primary + ${s.replicas} replica${s.replicas === 1 ? "" : "s"} · reads ${group(c.read)}/s each · writes ${group(c.write)}/s · ${price}`; }
  if (k === "nosql") return `${s.nodes} × ${group(CAP.nosql)} = ${group(CAP.nosql * s.nodes)} calls a second · each item on ${s.rf} nodes · ${price}`;
  if (k === "idgen") return { counter: "Never repeats; needs one coordinator", snowflake: "Time + machine + sequence", random: "Can repeat if too few bits", hash: "Same input, same id; can collide" }[s.kind];
  return `${group(CAP[k])} calls a second · ${price}`;
}
// The small chips of a request's limits (20.6).
export function limits(req) {
  const out = [];
  if (Number.isFinite(req.max_stale_s)) out.push(`may be ${ttlWords(req.max_stale_s)} old`);
  if (req.read_your_writes) out.push("must show own writes");
  if (req.unique_id) out.push("ids must be unique");
  if (req.durable) out.push("must not be lost");
  return out;
}
