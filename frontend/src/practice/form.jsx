// The Builder ("Form view", spec section 20): taps, steppers and pick-lists over the same text the Text editor edits.
// Every change: text → lenient parse → change → format() → text (builder.js). Nothing here keeps its own copy.
import React, { useEffect, useRef, useState } from "react";
import * as B from "./builder.js";
import { S } from "./strings.js";
import { ARGS, CAP, SIZES, STORES } from "../tkd/catalogue.js";
import { NAME } from "../tkd/parse.js";
import { msg } from "../tkd/messages.js";
import { group, inrExact } from "../tkd/inr.js";

// ---- small parts --------------------------------------------------------------------------------------------------
export function Sheet({ title, onClose, children }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement, el = box.current;
    el?.querySelector("button,input,select,[tabindex]")?.focus();
    const key = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && el) { const f = [...el.querySelectorAll("button,input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    };
    el?.addEventListener("keydown", key);
    return () => { el?.removeEventListener("keydown", key); prev?.focus?.(); };
  }, []); // eslint-disable-line
  return <div className="pb-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="pb-sheet" role="dialog" aria-modal="true" aria-label={title} ref={box}>
    <div className="pb-sheet-head"><b>{title}</b><button type="button" className="pb-x" aria-label="Close" onClick={onClose}>✕</button></div>
    <div className="pb-sheet-body">{children}</div></div></div>;
}
function Stepper({ value, min, max, onChange, label }) {
  const t = useRef(0), iv = useRef(0), v = useRef(value), [edit, setEdit] = useState(false);
  v.current = value;
  const step = (d) => { const n = Math.min(max, Math.max(min, v.current + d)); if (n !== v.current) { v.current = n; onChange(n); } };
  const hold = (d) => { step(d); t.current = setTimeout(() => { iv.current = setInterval(() => step(d), 80); }, 400); };
  const stop = () => { clearTimeout(t.current); clearInterval(iv.current); };
  useEffect(() => stop, []);
  const btn = (d, sym) => <button type="button" className="pb-step-b" aria-label={`${d < 0 ? "Less" : "More"} ${label}`} disabled={d < 0 ? value <= min : value >= max}
    onPointerDown={(e) => { e.preventDefault(); hold(d); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(d); } }}>{sym}</button>;
  return <span className="pb-step">{btn(-1, "−")}{edit
    ? <input className="pb-step-in" type="number" inputMode="numeric" min={min} max={max} defaultValue={value} autoFocus aria-label={label} onBlur={(e) => { setEdit(false); const n = Math.round(Number(e.target.value)); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n))); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEdit(false); }}/>
    : <span className="pb-step-v" role="spinbutton" tabIndex={0} aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} onClick={() => setEdit(true)} onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); step(1); } if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); } if (e.key === "Enter") setEdit(true); }}>{value}</span>}{btn(1, "+")}</span>;
}
const Chips = ({ options, value, onChange, label }) => <span className="pb-chips" role="radiogroup" aria-label={label}>{options.map(([v, t]) => <button key={String(v)} type="button" role="radio" aria-checked={v === value} className={"pb-chip" + (v === value ? " on" : "")} onClick={() => onChange(v)}>{t}</button>)}</span>;

function TtlControl({ value, onChange }) {
  const preset = B.TTL_PRESETS.some(([v]) => v === value), [custom, setCustom] = useState(!preset), [unit, setUnit] = useState(value % 3600 === 0 ? 3600 : value % 60 === 0 ? 60 : 1);
  return <span className="pb-ttl"><Chips label="TTL" value={custom ? "c" : value} onChange={(v) => { if (v === "c") setCustom(true); else { setCustom(false); onChange(v); } }} options={[...B.TTL_PRESETS, ["c", S.custom]]}/>
    {custom && <span className="pb-ttl-c"><input type="number" min={1} aria-label="TTL" defaultValue={Math.max(1, Math.round(value / unit))} onBlur={(e) => onChange(Math.min(86400, Math.max(1, Math.round(Number(e.target.value) * unit) || 1)))}/><select aria-label="Unit" value={unit} onChange={(e) => { const u = Number(e.target.value); setUnit(u); }}><option value={1}>s</option><option value={60}>min</option><option value={3600}>hours</option><option value={86400}>days</option></select></span>}</span>;
}

// ---- a part card ---------------------------------------------------------------------------------------------------
function PartCard({ st, parsed, problem, apply, onDelete, flash }) {
  const s = B.settings(st), uses = B.usesOf(parsed, st.name), [naming, setNaming] = useState(false), [draft, setDraft] = useState(st.name), [menu, setMenu] = useState(false);
  const taken = B.parts(parsed).some((p) => p.name === draft && p !== st);
  const nameErr = draft === st.name ? "" : draft === "client" ? msg("E005") : !NAME.test(draft) ? msg("E004", { name: draft }) : taken ? msg("E003", { name: draft, n: B.parts(parsed).find((p) => p.name === draft)?.line || "" }) : "";
  const save = () => { if (!nameErr && draft !== st.name) apply(B.renamePart(parsed, st.name, draft)); setNaming(false); };
  const set = (arg, v) => apply(B.setArg(parsed, st.name, arg, v));
  const args = ARGS[st.kind] || {};
  const rf = s.rf;
  return <li className={"pb-part" + (flash ? " pb-flash" : "")} id={`pb-part-${st.name}`}>
    <div className="pb-part-head">
      <span className={`pb-icon pb-i-${st.kind}`} aria-hidden="true">{st.kind.slice(0, 2).toUpperCase()}</span>
      {naming ? <span className="pb-rename"><input value={draft} autoFocus aria-label={S.rename} onChange={(e) => setDraft(e.target.value.trim())} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(st.name); setNaming(false); } }}/>{nameErr && <small className="pb-err">{nameErr}</small>}</span>
        : <button type="button" className="pb-name" onClick={() => { setDraft(st.name); setNaming(true); }} aria-label={`${S.rename} ${st.name}`}>{st.name}</button>}
      <span className="pb-kind">{st.kind.toUpperCase()}</span>
      <span className="pb-price">{inrExact(B.priceOf(st))}</span>
      <span className="pb-menu"><button type="button" className="pb-dots" aria-label={`More for ${st.name}`} aria-expanded={menu} onClick={() => setMenu((x) => !x)}>⋯</button>
        {menu && <span className="pb-menu-list"><button type="button" onClick={() => { setMenu(false); apply(B.duplicatePart(parsed, st.name).parsed); }}>{S.duplicate}</button><button type="button" onClick={() => { setMenu(false); onDelete(st.name); }}>{S.del}</button></span>}</span>
    </div>
    {Object.keys(args).length > 0 && <div className="pb-settings">
      {Object.entries(args).map(([arg, spec]) => {
        if (st.kind === "idgen" && arg === "bits" && !["random", "hash"].includes(s.kind)) return null;
        let control;
        if (arg === "size") control = <span className="pb-seg" role="radiogroup" aria-label="size">{SIZES.map((z) => <button key={z} type="button" role="radio" aria-checked={s.size === z} className={"pb-seg-b" + (s.size === z ? " on" : "")} onClick={() => set("size", z)}><b>{z[0].toUpperCase() + z.slice(1)}</b><small>{st.kind === "sql" ? `${group(CAP.sql[z].read)}/s` : `${group(CAP.server[z])}/s`}</small></button>)}</span>;
        else if (arg === "memory_gb") control = <Chips label="memory" value={s.memory_gb} onChange={(v) => set("memory_gb", v)} options={[1, 2, 4, 8, 16, 32, 64, 128, 256].map((v) => [v, `${v} GB`])}/>;
        else if (arg === "ttl_s") control = <TtlControl value={s.ttl_s} onChange={(v) => set("ttl_s", v)}/>;
        else if (arg === "sync") control = <label className="pb-switch"><input type="checkbox" checked={!!s.sync} onChange={(e) => set("sync", e.target.checked)}/><span>{S.waitReplicas}<small>{S.waitNote}</small></span></label>;
        else if (arg === "kind") control = <span className="pb-radios" role="radiogroup" aria-label="id kind">{Object.entries(S.idKinds).map(([k, [t, d]]) => <label key={k} className="pb-radio"><input type="radio" name={`${st.name}-kind`} checked={s.kind === k} onChange={() => set("kind", k)}/><span><b>{t}</b> {d}</span></label>)}</span>;
        else if (arg === "bits") control = <Chips label="bits" value={s.bits} onChange={(v) => set("bits", v)} options={[32, 48, 64, 96, 128].map((v) => [v, String(v)])}/>;
        else if (spec.type === "int") control = <Stepper label={arg} value={s[arg]} min={spec.min} max={spec.max === "rf" ? rf : spec.max} onChange={(v) => set(arg, v)}/>;
        return <div className="pb-set" key={arg}><span className="pb-set-l">{arg.replace("_", " ")}</span>{control}</div>;
      })}
    </div>}
    <p className="pb-conseq">{B.consequence(st, problem)}</p>
    <p className={"pb-uses" + (uses.length ? "" : " pb-unused")}>{uses.length ? S.usedIn(uses.join(", ")) : S.notUsed}</p>
  </li>;
}

function AddPartSheet({ onPick, onClose }) {
  return <Sheet title={S.parts} onClose={onClose}>{S.groups.map(([g, rows]) => <div key={g} className="pb-add-g"><h4>{g}</h4>{rows.map(([k, t, d]) => {
    const tmp = { type: "part", kind: k, name: k, args: [] };
    return <button key={k} type="button" className="pb-add-row" onClick={() => onPick(k)}><span className={`pb-icon pb-i-${k}`} aria-hidden="true">{k.slice(0, 2).toUpperCase()}</span><span><b>{t}</b><small>{d}</small></span><em>{inrExact(B.priceOf(tmp))}</em></button>;
  })}</div>)}</Sheet>;
}

// ---- tables ------------------------------------------------------------------------------------------------------
function TableSheet({ t, parsed, apply, onClose }) {
  const key = `${t.part}.${t.name}`, stores = B.parts(parsed).filter((p) => p.kind === "sql" || p.kind === "nosql");
  const [col, setCol] = useState("");
  const up = (fn) => apply(B.updateTable(parsed, key, fn));
  return <Sheet title={`table ${key}`} onClose={onClose}>
    <label className="pb-field">Store <select value={t.part} onChange={(e) => { const v = e.target.value; apply(B.updateTable(parsed, key, (x) => { x.part = v; })); onClose(); }}>{stores.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></label>
    <ul className="pb-cols">{t.columns.map((c) => <li key={c.name}>
      <label><input type="radio" name="pk" checked={c.pk} onChange={() => up((x) => x.columns.forEach((y) => { y.pk = y.name === c.name; }))}/> {c.name} <small>primary key</small></label>
      {!c.pk && <label><input type="checkbox" checked={t.index.some((i) => i.name === c.name)} onChange={(e) => up((x) => { x.index = e.target.checked ? [...x.index, { name: c.name }] : x.index.filter((i) => i.name !== c.name); })}/> indexed</label>}
      {!c.pk && <button type="button" className="pb-link" onClick={() => up((x) => { x.columns = x.columns.filter((y) => y.name !== c.name); x.index = x.index.filter((i) => i.name !== c.name); })}>{S.del}</button>}
    </li>)}</ul>
    <span className="pb-addcol"><input value={col} placeholder="new column" aria-label="New column" onChange={(e) => setCol(e.target.value.trim())}/><button type="button" className="pb-btn" disabled={!NAME.test(col) || t.columns.some((c) => c.name === col)} onClick={() => { up((x) => { x.columns.push({ name: col, pk: false }); }); setCol(""); }}>+ column</button></span>
    <button type="button" className="pb-link pb-danger" onClick={() => { apply(B.deleteTable(parsed, key)); onClose(); }}>Delete table</button>
  </Sheet>;
}

// ---- a request's chain -------------------------------------------------------------------------------------------
function NextSheet({ parsed, problem, req, upto, onPick, onAddPart, onClose, title }) {
  const c = B.candidates(parsed, problem, req, upto), [replica, setReplica] = useState({});
  return <Sheet title={title || S.whatNext} onClose={onClose}>
    {c.list.length ? <ul className="pb-next">{c.list.map((x) => <li key={x.part}>
      <span className="pb-next-p"><b>{x.part}</b> <small>{x.kind}</small></span>
      {x.rows.map((r) => <button key={r.op} type="button" className="pb-next-row" onClick={() => onPick({ part: x.part, op: r.op, replica: !!replica[x.part] })}>{r.label}{r.usual && <em> usual</em>}</button>)}
      {x.replicaOk && <label className="pb-switch small"><input type="checkbox" checked={!!replica[x.part]} onChange={(e) => setReplica({ ...replica, [x.part]: e.target.checked })}/><span>{S.readReplicas}</span></label>}
    </li>)}</ul> : <p className="pb-why">{c.why}</p>}
    {c.needsStore && <button type="button" className="pb-btn" onClick={() => onAddPart("sql")}>{S.addDb}</button>}
    <button type="button" className="pb-link" onClick={() => onAddPart(null)}>{S.addNew}</button>
  </Sheet>;
}

function RequestCard({ req, parsed, problem, apply, compiled, onAddPart, coach, onCoach }) {
  const r = B.routeOf(parsed, req.name), hops = r?.hops || [], [sheet, setSheet] = useState(null);
  const caches = B.parts(parsed).filter((p) => p.kind === "cache" || p.kind === "cdn");
  const err = compiled && !compiled.ok ? compiled.errors.find((e) => (r && e.line === r.line) || (!r && e.code === "E022" && e.message.includes(req.name))) : null;
  let bg = false;
  const say = (h, i) => `step ${i + 1} of ${hops.length}: ${h.part}${hops[i + 1] ? `, ${hops[i + 1].op === "|" ? "on a miss asks" : hops[i + 1].op === "~>" ? "hands over to" : "calls"} ${hops[i + 1].part}` : ""}`;
  // readers of the same table that go through a cache this write doesn't clear
  const after = r?.after || null, staleCache = req.mode === "write" && !after ? (problem.requests || []).filter((x) => x.mode === "read" && x.table && x.table === req.table).flatMap((x) => (B.routeOf(parsed, x.name)?.hops || []).filter((h) => ["cache", "cdn"].includes(B.kindOf(parsed, h.part)))).map((h) => B.parts(parsed).find((p) => p.name === h.part))[0] : null;
  return <li className="pb-req">
    <div className="pb-req-head"><b>{req.name}</b><span className={`pb-mode pb-${req.mode}`}>{req.mode}</span>{err ? <span className="pb-mark pb-mark-bad" title={err.message}>!</span> : <span className="pb-mark pb-mark-ok" aria-label="complete">✓</span>}</div>
    <p className="pb-says">{req.says}</p>
    {B.limits(req).length > 0 && <p className="pb-limits">{B.limits(req).map((l) => <span key={l}>{l}</span>)}</p>}
    <div className="pb-chain" role="list" aria-label={`${req.name} route`}>
      <span className="pb-hop pb-client" role="listitem">client</span>
      {hops.map((h, i) => { if (h.op === "~>") bg = true; return <React.Fragment key={i}><span className={`pb-conn pb-conn-${h.op === "|" ? "miss" : h.op === "~>" ? "later" : "call"}`} aria-hidden="true">{h.op === "|" ? <small>miss</small> : h.op === "~>" ? <small>later</small> : null}</span>
        <button type="button" role="listitem" className={"pb-hop" + (bg ? " pb-bg" : "")} aria-label={say(h, i)} onClick={() => setSheet({ hop: i })}>{h.part}{h.replica ? " [replica]" : ""}</button></React.Fragment>; })}
      {after && <span className="pb-hop pb-after" title={after.action === "update" ? S.writeInto(after.part) : S.clearCopy(after.part)}>⟲ {after.part}</span>}
      <span className="pb-plus-w">{coach && <span className="pb-coach" role="note">{S.coach[0]} <button type="button" className="pb-link" onClick={onCoach}>{S.coachNext}</button></span>}
        <button type="button" className="pb-plus" aria-label={`${S.whatNext} (${req.name})`} onClick={() => setSheet({ next: true })}>+</button></span>
    </div>
    {hops.some((h) => h.op === "~>") && <p className="pb-bg-note">{S.background}</p>}
    {err && <p className="pb-req-err">{err.message}</p>}
    {req.mode === "write" && caches.length > 0 && <div className="pb-after-row"><label>{S.afterSaving} <select value={after ? `${after.action}:${after.part}` : ""} onChange={(e) => { const [a, p] = e.target.value.split(":"); apply(B.setAfter(parsed, req, a || null, p)); }}>
      <option value="">{S.doNothing}</option>{caches.map((c) => <option key={`i${c.name}`} value={`invalidate:${c.name}`}>{S.clearCopy(c.name)}</option>)}{caches.filter((c) => c.kind === "cache").map((c) => <option key={`u${c.name}`} value={`update:${c.name}`}>{S.writeInto(c.name)}</option>)}</select></label>
      {staleCache && <span className="pb-warn">{S.staleWarn(B.ttlWords(B.argOf(staleCache, "ttl_s")))}</span>}</div>}
    {sheet?.next && <NextSheet parsed={parsed} problem={problem} req={req} onClose={() => setSheet(null)} onAddPart={(k) => { setSheet(null); onAddPart(k); }} onPick={(h) => { apply(B.addHop(parsed, req, h)); setSheet(null); }}/>}
    {sheet && sheet.hop !== undefined && <Sheet title={`${hops[sheet.hop].part}`} onClose={() => setSheet(null)}>
      {sheet.hop > 0 && ["cache", "cdn"].includes(B.kindOf(parsed, hops[sheet.hop - 1].part)) && <Chips label="connector" value={hops[sheet.hop].op} onChange={(op) => { apply(B.changeHop(parsed, req, sheet.hop, { op })); setSheet(null); }} options={[["|", "On a miss"], [">", "Always"]]}/>}
      {B.kindOf(parsed, hops[sheet.hop].part) === "sql" && req.mode === "read" && B.argOf(B.parts(parsed).find((p) => p.name === hops[sheet.hop].part), "replicas") >= 1 && <label className="pb-switch"><input type="checkbox" checked={!!hops[sheet.hop].replica} onChange={(e) => { apply(B.changeHop(parsed, req, sheet.hop, { replica: e.target.checked })); setSheet(null); }}/><span>{S.readReplicas}</span></label>}
      <h4 className="pb-sub">{S.changeTo}</h4>
      <ul className="pb-next">{B.candidates(parsed, problem, req, sheet.hop).list.map((x) => <li key={x.part}><button type="button" className="pb-next-row" onClick={() => { apply(B.changeHop(parsed, req, sheet.hop, { part: x.part, op: sheet.hop ? x.rows[0].op : ">", replica: false })); setSheet(null); }}>{x.part} <small>{x.kind}</small></button></li>)}</ul>
      <button type="button" className="pb-link" onClick={() => { apply(B.removeHop(parsed, req, sheet.hop)); setSheet(null); }}>{S.removeHop}</button>
      <button type="button" className="pb-link pb-danger" onClick={() => { apply(B.removeHop(parsed, req, sheet.hop, true)); setSheet(null); }}>{S.removeAfter}</button>
    </Sheet>}
  </li>;
}

// ---- the Builder -------------------------------------------------------------------------------------------------
export default function Builder({ problem, text, setText, compiled, canUndo, canRedo, undo, redo, cost, onEditAsText, picture, coach, onCoach }) {
  const parsed = B.read(text);
  const [adding, setAdding] = useState(false), [ask, setAsk] = useState(null), [toast, setToast] = useState(null), [flash, setFlash] = useState(null), [tableEdit, setTableEdit] = useState(null), [issuesOpen, setIssuesOpen] = useState(false), [warned, setWarned] = useState(false), [show, setShow] = useState(false);
  const apply = (next) => {
    const t = B.write(next, problem);
    if (!warned && /\n[^\n]*#/.test(text.replace(/^(#[^\n]*\n)+/, ""))) setWarned(true);
    setText(t);
  };
  const addPart = (kind) => { const { parsed: p, name } = B.addPart(parsed, kind); apply(p); setAdding(false); setFlash(name); setTimeout(() => document.getElementById(`pb-part-${name}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50); };
  const del = (name) => { const uses = B.usesOf(parsed, name); if (uses.length) setAsk({ name, n: uses.length }); else doDelete(name); };
  const doDelete = (name) => { const before = text; apply(B.deletePart(parsed, name)); setAsk(null); setToast({ name, before }); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1400); return () => clearTimeout(t); }, [flash]);
  const errs = compiled && !compiled.ok ? compiled.errors : [], warns = compiled?.ok ? compiled.warnings : [];
  const raw = parsed.statements.filter((s) => s.type === "raw");
  const sugg = B.tableSuggestions(parsed, problem);
  const goIssue = (x) => { setIssuesOpen(false); const st = parsed.statements.find((s) => s.line === x.line); const id = st?.type === "part" ? `pb-part-${st.name}` : null; const el = id && document.getElementById(id); if (el) { el.scrollIntoView({ block: "center" }); setFlash(st.name); } else onEditAsText(x.line); };
  return <div className="pb">
    <div className="pb-bar">
      <button type="button" className="pb-ur" aria-label={S.undoLabel} disabled={!canUndo} onClick={undo}>{S.undo}</button>
      <button type="button" className="pb-ur" aria-label={S.redoLabel} disabled={!canRedo} onClick={redo}>{S.redo}</button>
      <span className="pb-cost">{cost || "—"}</span>
      <button type="button" className={"pb-pill " + (errs.length ? "bad" : warns.length ? "warn" : "ok")} aria-expanded={issuesOpen} onClick={() => setIssuesOpen((v) => !v)}>{errs.length ? S.issues(errs.length) : warns.length ? S.notes(warns.length) : S.ready}</button>
    </div>
    {issuesOpen && (errs.length || warns.length) > 0 && <ul className="pb-issues">{[...errs, ...warns].map((x, i) => <li key={i}><button type="button" onClick={() => goIssue(x)}><b>Line {x.line}</b> {x.message}</button></li>)}</ul>}
    {warned && <p className="pb-note">{S.commentsGone}</p>}
    {raw.length > 0 && <section className="pb-sec pb-raw"><h3>{S.cantRead}</h3><ul>{raw.map((x) => <li key={x.line}><code>{x.text}</code><small>{x.error.message}</small><span><button type="button" className="pb-link" onClick={() => onEditAsText(x.line)}>{S.editAsText}</button><button type="button" className="pb-link pb-danger" onClick={() => apply({ ...parsed, statements: parsed.statements.filter((s) => s !== x) })}>{S.deleteLine}</button></span></li>)}</ul></section>}
    <section className="pb-sec"><div className="pb-sec-h"><h3>{S.parts}</h3>{coach === 1 && <span className="pb-coach" role="note">{S.coach[1]} <button type="button" className="pb-link" onClick={onCoach}>{S.coachNext}</button></span>}<button type="button" className="pb-btn" onClick={() => setAdding(true)}>{S.add}</button></div>
      <ul className="pb-parts">{B.parts(parsed).map((st) => <PartCard key={st.name} st={st} parsed={parsed} problem={problem} apply={apply} onDelete={del} flash={flash === st.name}/>)}</ul></section>
    <section className="pb-sec"><div className="pb-sec-h"><h3>{S.tables}</h3></div>
      {sugg.map((h) => <button key={h.name} type="button" className="pb-sugg" onClick={() => apply(B.addTable(parsed, h.part, h.name, h.columns, h.pk))}>{S.addTable(h.name, h.part)}</button>)}
      <ul className="pb-tables">{B.tables(parsed).map((t) => <li key={`${t.part}.${t.name}`}><button type="button" className="pb-table" onClick={() => setTableEdit(`${t.part}.${t.name}`)}><b>{t.part}.{t.name}</b> {t.columns.map((c) => <span key={c.name} className="pb-colchip">{c.name}{c.pk ? " ★" : ""}</span>)}<small>{S.indexes}: {t.index.length ? t.index.map((i) => i.name).join(", ") : "none"}</small></button>
        {B.lookupLines(parsed, problem, t).map((l) => <p key={l.text} className={l.ok ? "pb-ok" : "pb-bad"}>{l.text}</p>)}</li>)}</ul></section>
    <section className="pb-sec"><div className="pb-sec-h"><h3>{S.requests}</h3></div>
      <ul className="pb-reqs">{(problem.requests || []).map((req, i) => <RequestCard key={req.name} req={req} parsed={parsed} problem={problem} apply={apply} compiled={compiled} onAddPart={(k) => (k ? addPart(k) : setAdding(true))} coach={coach === 0 && i === 0} onCoach={onCoach}/>)}</ul></section>
    <section className="pb-sec pb-pic"><button type="button" className="pb-link" aria-expanded={show} onClick={() => setShow((v) => !v)}>{show ? `▾ ${S.hidePicture}` : `▸ ${S.showPicture}`}</button>{show && picture}</section>
    {adding && <AddPartSheet onPick={addPart} onClose={() => setAdding(false)}/>}
    {ask && <Sheet title={S.del} onClose={() => setAsk(null)}><p>{S.deleteAsk(ask.name, ask.n)}</p><div className="pb-row"><button type="button" className="pb-btn pb-danger-b" onClick={() => doDelete(ask.name)}>{S.remove}</button><button type="button" className="pb-btn" onClick={() => setAsk(null)}>{S.cancel}</button></div></Sheet>}
    {tableEdit && (() => { const t = B.tables(parsed).find((x) => `${x.part}.${x.name}` === tableEdit); return t ? <TableSheet t={t} parsed={parsed} apply={apply} onClose={() => setTableEdit(null)}/> : null; })()}
    {toast && <div className="pb-toast" role="status">{S.deleted(toast.name)} <button type="button" className="pb-link" onClick={() => { setText(toast.before); setToast(null); }}>{S.undoDelete}</button></div>}
  </div>;
}
export { STORES };
