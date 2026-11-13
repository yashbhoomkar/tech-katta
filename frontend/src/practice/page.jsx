// The problem page (spec section 11): one screen, a loop under a minute. Left: Description, Editorial, Solutions,
// Submissions. Right: the design (Builder or Text, over the same text), the diagram drawn from it, the console.
// Phones (< 900 px): three tabs at the bottom, Problem · Design · Result.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { compile } from "../tkd/compile.js";
import { judgeAll } from "../tkd/judge.js";
import { costOf } from "../tkd/verdict.js";
import { inrExact, group } from "../tkd/inr.js";
import { lsGet, lsSet } from "../dashboard/storage.js";
import { useAccount, SignInBox } from "../accountui.jsx";
import { track } from "../analytics.js";
import { Loading } from "../status.jsx";
import { S, DIFF } from "./strings.js";
import { Md } from "./md.jsx";
import * as api from "./client.js";
import TextEditor from "./editor.jsx";
import Builder, { Sheet } from "./form.jsx";
import { useDrag, settleMs } from "../theme/gesture.js";
import Scene from "../theme/Scene.jsx";
import { shareCard } from "./card.js";
import Diagram from "./diagram.jsx";
import { Testcase, Result } from "./console.jsx";
import * as B from "./builder.js";

const narrowQ = () => typeof window !== "undefined" && window.matchMedia?.("(max-width:899px)");
function useNarrow() { const [n, set] = useState(() => !!narrowQ()?.matches); useEffect(() => { const q = narrowQ(); if (!q) return; const on = (e) => set(e.matches); q.addEventListener?.("change", on); return () => q.removeEventListener?.("change", on); }, []); return n; }
const minutes = (s) => (s % 60 === 0 ? `${s / 60} minute${s === 60 ? "" : "s"}` : `${s} seconds`);
const EVENT_WORDS = { server: "a server dies", sql: "the database primary dies", nosql: "a NoSQL node dies", worker: "a worker dies", cache: "a cache node dies" };
function phaseWords(ph, problem) {
  const rates = problem.requests.filter((r) => ph.rates[r.name]).map((r) => `${group(ph.rates[r.name])} ${r.name}`).join(" and ");
  const ev = (ph.events || []).map((e) => (e.flush_role ? "the cache restarts" : EVENT_WORDS[e.kill_role])).filter(Boolean);
  return `${ev.length ? `${[...new Set(ev)].join(", ")}; ` : ""}${rates || "no traffic"} a second for ${minutes(ph.seconds)}`;
}
function promiseWords(p) {
  const out = [];
  for (const [r, v] of Object.entries(p.p99_ms || {})) out.push(`${r} p99 ≤ ${v} ms`);
  for (const [r, v] of Object.entries(p.p50_ms || {})) out.push(`${r} p50 ≤ ${v} ms`);
  for (const [r, v] of Object.entries(p.availability || {})) out.push(`${r} available ${Math.round(v * 10000) / 100}% of the time`);
  for (const [r, v] of Object.entries(p.done_within_s || {})) out.push(`${r} done within ${v} s`);
  if (p.no_data_loss) out.push("no acknowledged write lost");
  if (p.budget_inr) out.push(`budget ${inrExact(p.budget_inr)} a month`);
  return out;
}
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ---- left pane --------------------------------------------------------------------------------------------------
function Description({ problem }) {
  const visible = problem.tests.filter((t) => !t.hidden);
  return <div className="pr-desc">
    <h1 className="pr-title">{problem.id}. {problem.title}</h1>
    <p className="pr-pills"><span className={`pr-diff pr-${problem.difficulty}`}>{DIFF[problem.difficulty]}</span>{problem.topics.map((t) => <span key={t} className="pr-topic">{t}</span>)}</p>
    <Md text={problem.statement}/>
    <h3>{S.requests}</h3>
    <div className="pr-table-w"><table className="pr-table"><tbody>{problem.requests.map((r) => <tr key={r.name}><td><code>{r.name}</code></td><td>{r.mode}</td><td>{r.says}{B.limits(r).length > 0 && <small> {B.limits(r).join(" · ")}</small>}</td></tr>)}</tbody></table></div>
    {visible.map((t, i) => <div key={t.id} className="pr-example"><h4>{S.example(i + 1, t.title)}</h4>{t.explain && <p>{t.explain}</p>}<ul>{t.phases.map((ph, j) => <li key={j}>{phaseWords(ph, problem)}</li>)}</ul><p className="pr-promise">Promises: {promiseWords(t.promises).join(" · ")}</p></div>)}
    {problem.tests.some((t) => t.hidden) && <p className="pr-hidden">Hidden tests on Submit: {problem.tests.filter((t) => t.hidden).map((t) => t.title).join(" · ")}</p>}
    <h3>{S.constraints}</h3><ul className="pr-cons">{problem.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
    {problem.hints.map((h, i) => <details key={i} className="pr-hint"><summary>{S.hint(i + 1)}</summary><p>{h}</p></details>)}
  </div>;
}
function Editorial({ problem, signedIn, onCopy }) {
  const [d, setD] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { if (signedIn) api.editorial(problem.slug).then(setD, setErr); }, [signedIn, problem.slug]);
  if (!signedIn) return <p className="pr-locked">{S.editorialLocked}</p>;
  if (err) return <div className="pr-state"><Scene kind="offline"/><p className="pr-locked">{S.noReach}</p></div>;
  if (!d) return <Loading/>;
  return <div className="pr-ed"><Md text={d.editorial}/><pre className="pr-code">{d.reference}</pre><button type="button" className="pb-btn" onClick={() => onCopy(d.reference)}>{S.copyReference}</button></div>;
}
function Solutions({ problem, signedIn, onCopy }) {
  const [sort, setSort] = useState("cost"), [d, setD] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { if (!signedIn) return; setD(null); setErr(null); api.solutions(problem.slug, sort).then(setD, setErr); }, [signedIn, problem.slug, sort]);
  if (!signedIn) return <p className="pr-locked">{S.signInFirst}</p>;
  if (err) return err.status === 403 ? <p className="pr-locked">{S.solveFirst}</p> : <div className="pr-state"><Scene kind="offline"/><p className="pr-locked">{S.noReach}</p></div>;
  if (!d) return <Loading/>;
  return <div><p className="pc-row"><button type="button" className={"pb-chip" + (sort === "cost" ? " on" : "")} onClick={() => setSort("cost")}>{S.sortCost}</button><button type="button" className={"pb-chip" + (sort === "speed" ? " on" : "")} onClick={() => setSort("speed")}>{S.sortSpeed}</button></p>
    {d.solutions.length ? d.solutions.map((s, i) => <div key={i} className="pr-sol"><p><b>{inrExact(s.cost_inr)}/month</b>{Number.isFinite(s.p99_ms) ? ` · p99 ${s.p99_ms} ms` : ""}{s.count > 1 ? ` · ${S.usedBy(s.count)}` : ""}</p>{s.note && <p className="pr-note">{s.note}</p>}<pre className="pr-code">{s.source}</pre><button type="button" className="pb-link" onClick={() => onCopy(s.source)}>{S.copyReference}</button></div>) : <p className="pr-locked">{S.noSubmissions}</p>}</div>;
}
function Submissions({ problem, signedIn, refresh, onRestore }) {
  const [d, setD] = useState(null), [open, setOpen] = useState(null);
  useEffect(() => { if (signedIn) api.mySubmissions(problem.slug).then(setD, () => setD({ submissions: [] })); }, [signedIn, problem.slug, refresh]);
  if (!signedIn) return <p className="pr-locked">{S.signInFirst}</p>;
  if (!d) return <Loading/>;
  if (!d.submissions.length) return <div className="pr-state"><Scene kind="empty"/><p className="pr-locked">{S.noSubmissions}</p></div>;
  return <div>{open && <div className="pr-sub-open"><pre className="pr-code">{open.source}</pre>{open.judge_version !== problem.judge_version && <p className="pc-muted">{S.older}</p>}<button type="button" className="pb-btn" onClick={() => onRestore(open.source)}>{S.restore}</button> <button type="button" className="pb-link" onClick={() => setOpen(null)}>{S.cancel}</button></div>}
    <div className="pr-table-w"><table className="pr-table pr-subs"><thead><tr><th>{S.time}</th><th>{S.verdict}</th><th>{S.tests}</th><th>Cost</th><th>{S.p99}</th></tr></thead>
      <tbody>{d.submissions.map((s) => <tr key={s.id} tabIndex={0} onClick={() => api.oneSubmission(s.id).then(setOpen, () => {})} onKeyDown={(e) => { if (e.key === "Enter") api.oneSubmission(s.id).then(setOpen, () => {}); }}>
        <td>{new Date(s.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td className={s.verdict === "Accepted" ? "pc-v-ok" : "pc-v-bad"}>{s.verdict}</td><td>{s.passed}/{s.total}</td><td>{Number.isFinite(s.cost_inr) ? inrExact(s.cost_inr) : "—"}</td><td>{Number.isFinite(s.p99_ms) ? `${s.p99_ms} ms` : "—"}</td></tr>)}</tbody></table></div></div>;
}

// a draggable divider: drag changes a fraction (0–1) of the parent's size; double-click resets it
function Divider({ dir, onDrag, onReset, label }) {
  const start = (e) => { const el = e.currentTarget.parentElement, box = el.getBoundingClientRect(); const move = (ev) => onDrag(dir === "x" ? (ev.clientX - box.left) / box.width : (ev.clientY - box.top) / box.height, box); const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); }; addEventListener("pointermove", move); addEventListener("pointerup", up); e.preventDefault(); };
  return <div className={`pr-div pr-div-${dir}`} role="separator" aria-orientation={dir === "x" ? "vertical" : "horizontal"} aria-label={label} tabIndex={0} onPointerDown={start} onDoubleClick={onReset}
    onKeyDown={(e) => { const d = { ArrowLeft: -0.02, ArrowUp: -0.02, ArrowRight: 0.02, ArrowDown: 0.02 }[e.key]; if (d) { e.preventDefault(); onDrag(null, null, d); } }}/>;
}
const LAYOUT = { left: 0.42, editor: 0.45, diagram: 0.25 };

// ---- the page ---------------------------------------------------------------------------------------------------
export default function ProblemPage({ slug, list, t }) {
  const [problem, setProblem] = useState(null), [loadErr, setLoadErr] = useState(null);
  const account = useAccount(), narrow = useNarrow();
  useEffect(() => { setProblem(null); setLoadErr(null); api.getProblem(slug).then(setProblem, setLoadErr); }, [slug]);
  if (loadErr) return <div className="pr-missing"><Scene kind={loadErr.status === 404 ? "missing" : "offline"}/><p>{loadErr.status === 404 ? S.notFound : S.noReach}</p><a href="#practice">{S.backToList}</a></div>;
  if (!problem) return <Loading label={S.loading}/>;
  return <Workspace key={problem.id} problem={problem} list={list} account={account} narrow={narrow} t={t}/>;
}

function Workspace({ problem, list, account, narrow, t }) {
  const key = `tk-practice-src-${problem.id}`;
  const [text, setTextRaw] = useState(() => lsGet(key) ?? problem.template);
  const undo = useRef([]), redo = useRef([]), [, bump] = useState(0), opened = useRef(Date.now()), edited = useRef(false);
  const setText = useCallback((next, { history = true } = {}) => {
    setTextRaw((prev) => { if (prev === next) return prev; if (history) { undo.current = [...undo.current.slice(-49), prev]; redo.current = []; } return next; });
    if (!edited.current) { edited.current = true; track("practice_first_edit", { problem: problem.id, seconds: Math.round((Date.now() - opened.current) / 1000) }); }
  }, [problem.id]);
  useEffect(() => { lsSet(key, text); bump((x) => x + 1); }, [text, key]);
  const doUndo = () => { const prev = undo.current.pop(); if (prev === undefined) return; redo.current.push(text); setTextRaw(prev); };
  const doRedo = () => { const next = redo.current.pop(); if (next === undefined) return; undo.current.push(text); setTextRaw(next); };

  const [mode, setModeRaw] = useState(() => (narrow ? "builder" : lsGet("tk-practice-editor") || "builder"));
  const setMode = (m) => { if (m === mode) return; track("practice_switch_editor", { from: mode, to: m }); setModeRaw(m); if (!narrow) lsSet("tk-practice-editor", m); };
  // compile: at once in the Builder, 250 ms after the last keystroke in the text editor
  const [compiledText, setCompiledText] = useState(text);
  useEffect(() => { if (mode === "builder") { setCompiledText(text); return; } const id = setTimeout(() => setCompiledText(text), 250); return () => clearTimeout(id); }, [text, mode]);
  const compiled = useMemo(() => compile(compiledText, problem), [compiledText, problem]);
  const lastGood = useRef(null); if (compiled.ok) lastGood.current = compiled.design;
  const cost = compiled.ok ? S.cost(inrExact(costOf(compiled.design))) : null;

  const visible = problem.tests.filter((x) => !x.hidden);
  const [pick, setPickRaw] = useState(visible[0]?.id), [caseTest, setCaseTest] = useState(() => JSON.parse(JSON.stringify(visible[0]))), [dirty, setDirty] = useState(false);
  const setPick = (id) => { setPickRaw(id); setCaseTest(JSON.parse(JSON.stringify(visible.find((x) => x.id === id)))); setDirty(false); };
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [ctab, setCtab] = useState("case"), [mtab, setMtab] = useState("design"), [ltab, setLtab] = useState("desc");
  const [diag, setDiag] = useState(false), [signIn, setSignIn] = useState(false), [refresh, setRefresh] = useState(0), [focusLine, setFocusLine] = useState(null), [ask, setAsk] = useState(null);
  const fails = useRef(Number(lsGet(`tk-practice-fails-${problem.id}`)) || 0);
  const [coach, setCoach] = useState(() => (lsGet("tk-practice-coach") ? -1 : 0));
  const nextCoach = () => setCoach((c) => { const n = c + 1; if (n > 2) { lsSet("tk-practice-coach", "1"); return -1; } return n; });
  const showResult = () => { setCtab("result"); if (narrow) setMtab("result"); };
  // Phones: the three panes are pages of a notebook (tech-katta-context 24, S1). Swipe sideways to the next or previous
  // one; the pane follows the finger and the tab line under the tabs slides with it. Each pane keeps its own scroll
  // position. Tapping a tab does the same. A drag never starts on a stepper or the diagram (they have their own).
  const PANES = ["problem", "design", "result"], ix = PANES.indexOf(mtab), [dir, setDir] = useState(0);
  const pbody = useRef(null), ptabs = useRef(null), at = useRef({}), cur = useRef(mtab);
  const goPane = (k, via) => { if (!PANES.includes(k) || k === mtab) return; if (via) track("practice_pane", { problem: problem.id, to: k, via }); setDir(PANES.indexOf(k) > ix ? 1 : -1); setMtab(k); };
  useEffect(() => { if (!narrow) return; const f = () => { at.current[cur.current] = scrollY; }; addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f); }, [narrow]);
  useLayoutEffect(() => { if (!narrow || cur.current === mtab) return; cur.current = mtab; scrollTo(0, at.current[mtab] || 0); }, [mtab, narrow]);
  const follow = (d, ms) => { const b = pbody.current, n = ptabs.current; if (!b) return; b.style.transition = ms ? `transform ${ms}ms var(--ease)` : "none"; b.style.transform = d ? `translateX(${d}px)` : "";
    if (n) { n.style.setProperty("--pt", ms ? "" : "none"); n.style.setProperty("--p", d ? String(-d / b.clientWidth) : "0"); } };
  useDrag(pbody, { on: narrow, axis: "x", min: ix >= PANES.length - 1 ? 0 : -Infinity, max: ix <= 0 ? 0 : Infinity, ignore: ".pb-step,.pr-diagram,.pr-pdiag",
    onMove: (d) => follow(d), onEnd: (go, d) => { if (go) { follow(0); goPane(PANES[ix - go], "swipe"); } else follow(0, settleMs(d, pbody.current?.clientWidth || 360)); } });
  const tabKey = (e) => { const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!k) return; e.preventDefault(); const n = PANES[Math.max(0, Math.min(2, ix + k))]; goPane(n, "key"); requestAnimationFrame(() => ptabs.current?.querySelector(".on")?.focus()); };

  const run = () => {
    const r = judgeAll(text, problem, dirty ? { tests: [caseTest] } : {});
    setResult({ ...r, kind: "run", at: Date.now(), text }); showResult();
    track("practice_run", { problem: problem.id, verdict: r.verdict, seconds: Math.round((Date.now() - opened.current) / 1000), editor: mode });
  };
  const submit = async () => {
    if (busy) return;
    if (!account.user) { setSignIn(true); return; }
    setBusy(true); showResult();
    try {
      const r = await api.submitDesign(problem.slug, text);
      if (r.verdict !== "Accepted" && r.verdict !== "Judge Error") { fails.current += 1; lsSet(`tk-practice-fails-${problem.id}`, String(fails.current)); }
      setResult({ ...r, kind: "submit", at: Date.now(), text }); setRefresh((x) => x + 1);
      track("practice_submit", { problem: problem.id, verdict: r.verdict, attempt: fails.current + (r.verdict === "Accepted" ? 1 : 0) });
    } catch (e) {
      if (e.status === 401) setSignIn(true);
      setResult({ verdict: "Judge Error", message: e.status === 429 ? (e.message || S.tooMany) : S.noReach, busy: e.status === 429, kind: "submit" });
    } finally { setBusy(false); }
  };
  useEffect(() => { track("practice_open", { problem: problem.id, editor: mode }); }, []); // eslint-disable-line
  useEffect(() => {
    const k = (e) => { if (!(e.ctrlKey || e.metaKey)) return; if (e.key === "'") { e.preventDefault(); run(); } if (e.key === "Enter") { e.preventDefault(); submit(); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });
  const [secs, setSecs] = useState(0);
  useEffect(() => { const id = setInterval(() => setSecs(Math.round((Date.now() - opened.current) / 1000)), 1000); return () => clearInterval(id); }, []);
  const [layout, setLayout] = useState(() => { try { return { ...LAYOUT, ...JSON.parse(lsGet("tk-practice-layout") || "{}") }; } catch { return LAYOUT; } });
  useEffect(() => { lsSet("tk-practice-layout", JSON.stringify(layout)); }, [layout]);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const idx = list ? list.findIndex((x) => x.slug === problem.slug) : -1;
  const prev = idx > 0 ? list[idx - 1] : null, next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const pickOne = () => { const open = (list || []).filter((x) => x.status !== "solved" && x.slug !== problem.slug); const p = open.length ? open[Math.floor(Math.random() * open.length)] : null; if (p) location.hash = `practice/${p.slug}`; };
  const replaceWith = (src) => setAsk({ text: S.copyAsk, go: () => { setText(src); setAsk(null); } });
  const editAsText = (line) => { setMode("text"); setFocusLine(line); if (narrow) setMtab("design"); };

  const showTip = result?.kind === "run" || fails.current >= 2;
  const diagram = <Diagram key={result?.at || "d"} design={compiled.ok ? compiled.design : lastGood.current} stale={compiled.ok ? null : lastGood.current ? S.fixErrors : S.fixErrors} blame={result?.failed?.blame} accepted={result?.verdict === "Accepted" && text === result.text}/>;
  const editor = mode === "builder"
    ? <Builder problem={problem} text={text} setText={setText} compiled={compiled} canUndo={undo.current.length > 0} canRedo={redo.current.length > 0} undo={doUndo} redo={doRedo} cost={cost} onEditAsText={editAsText} picture={diagram} coach={coach} onCoach={nextCoach}/>
    : <TextEditor text={text} onChange={setText} compiled={compiled} cost={cost} label={`${S.design}: ${problem.title}`} focusLine={focusLine}/>;
  const toggle = <span className="pr-toggle" role="group" aria-label={S.design}><button type="button" className={mode === "text" ? "on" : ""} aria-pressed={mode === "text"} onClick={() => setMode("text")}>{S.text}</button><button type="button" className={mode === "builder" ? "on" : ""} aria-pressed={mode === "builder"} onClick={() => setMode("builder")}>{S.form}</button></span>;
  const actions = <span className="pr-actions">
    <span className="pr-run-w">{coach === 2 && <span className="pb-coach pb-coach-run" role="note">{S.coach[2]} <button type="button" className="pb-link" onClick={nextCoach}>{S.coachNext}</button></span>}<button type="button" className="pr-run" disabled={busy} onClick={run} title="Ctrl + '">{S.run}</button></span>
    <button type="button" className="pr-primary" disabled={busy} onClick={submit} title="Ctrl + Enter">{busy ? S.judging : S.submit}</button></span>;
  const consoleBox = <div className="pr-console">
    <div className="pr-tabs" role="tablist">{[["case", S.testcase], ["result", S.result]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={ctab === k} className={ctab === k ? "on" : ""} onClick={() => setCtab(k)}>{l}</button>)}</div>
    {ctab === "case" ? <Testcase problem={problem} test={caseTest} setTest={(x) => { setCaseTest(x); setDirty(true); }} pick={pick} setPick={(id) => setPick(id)}/>
      : <Result result={result} busy={busy} showTip={showTip} onCard={result?.verdict === "Accepted" && lastGood.current ? () => shareCard({ problem, design: lastGood.current, result }) : null} onNext={next ? () => { location.hash = `practice/${next.slug}`; } : null} canShare={result?.kind === "submit" && !!result.submission_id} onShare={async (note) => { try { await api.share(result.submission_id, note); return true; } catch { return false; } }}/>}
  </div>;
  const left = <div className="pr-left">
    <div className="pr-tabs" role="tablist">{[["desc", S.description], ["ed", S.editorial], ["sol", S.solutions], ["subs", S.submissions]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={ltab === k} className={ltab === k ? "on" : ""} onClick={() => setLtab(k)}>{l}</button>)}</div>
    <div className="pr-left-body">{ltab === "desc" ? <Description problem={problem}/> : ltab === "ed" ? <Editorial problem={problem} signedIn={!!account.user} onCopy={replaceWith}/> : ltab === "sol" ? <Solutions problem={problem} signedIn={!!account.user} onCopy={replaceWith}/> : <Submissions problem={problem} signedIn={!!account.user} refresh={refresh} onRestore={(src) => setAsk({ text: S.restoreAsk, go: () => { setText(src); setAsk(null); } })}/>}</div>
  </div>;
  const top = <div className="pr-top">
    <a href="#practice" className="pr-back">‹ {S.problems}</a>
    {!narrow && <>{prev ? <a href={`#practice/${prev.slug}`}>{S.prev}</a> : <span className="pr-off">{S.prev}</span>}{next ? <a href={`#practice/${next.slug}`}>{S.next}</a> : <span className="pr-off">{S.next}</span>}<button type="button" className="pb-link" onClick={pickOne}>{S.pick}</button></>}
    {!narrow && actions}
    <span className="pr-clock" aria-label="Time on this problem">⏱ {clock(secs)}</span>
  </div>;
  const dialogs = <>
    {diag && <Sheet title={S.diagram} onClose={() => setDiag(false)}>{diagram}</Sheet>}
    {signIn && <Sheet title={S.submit} onClose={() => setSignIn(false)}><p>{S.submitSignIn}</p>{t && account.enabled ? <SignInBox t={t} base="/dashboard/"/> : null}</Sheet>}
    {ask && <Sheet title={S.design} onClose={() => setAsk(null)}><p>{ask.text}</p><div className="pb-row"><button type="button" className="pb-btn pb-danger-b" onClick={ask.go}>OK</button><button type="button" className="pb-btn" onClick={() => setAsk(null)}>{S.cancel}</button></div></Sheet>}
  </>;
  useEffect(() => { if (signIn && account.user) setSignIn(false); }, [account.user, signIn]);
  const designHead = <div className="pr-dhead"><b>{S.design}</b>{toggle}<button type="button" className="pb-link" onClick={() => setAsk({ text: S.resetAsk, go: () => { setText(problem.template); setAsk(null); } })}>{S.reset}</button></div>;

  if (narrow) return <div className="pr pr-phone">
    {top}
    <div className="pr-phone-body" ref={pbody}><div key={mtab} className={"pr-pane" + (dir > 0 ? " pr-in-r" : dir < 0 ? " pr-in-l" : "")}>{mtab === "problem" ? left : mtab === "design" ? <div className="pr-pdesign">{designHead}<button type="button" className="pb-link pr-seediag" onClick={() => setDiag(true)}>{S.seeDiagram}</button>{editor}</div> : <>{result && <div className="pr-pdiag"><p className="pr-dlabel">{S.diagram}</p>{diagram}</div>}{consoleBox}</>}</div></div>
    {mtab !== "problem" && <div className="pr-phone-act">{actions}</div>}
    <nav className="pr-phone-tabs" ref={ptabs} role="tablist" aria-label="Problem page" onKeyDown={tabKey} style={{ "--i": ix }}><i className="pr-phone-ind" aria-hidden="true"/>{[["problem", "Problem"], ["design", S.design], ["result", S.result]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={mtab === k} tabIndex={mtab === k ? 0 : -1} className={mtab === k ? "on" : ""} onClick={() => goPane(k, "tap")}>{l}</button>)}</nav>
    {dialogs}
  </div>;
  return <div className="pr" style={{ "--pr-left": `${layout.left * 100}%` }}>
    {top}
    <div className="pr-split">
      {left}
      <Divider dir="x" label="Resize the problem pane" onDrag={(f, box, d) => setLayout((l) => ({ ...l, left: clamp(d ? l.left + d : f, 320 / (box?.width || 1400), 1 - 320 / (box?.width || 1400)) }))} onReset={() => setLayout((l) => ({ ...l, left: LAYOUT.left }))}/>
      <div className="pr-right" style={{ gridTemplateRows: `${layout.editor}fr 6px ${layout.diagram}fr 6px ${1 - layout.editor - layout.diagram}fr` }}>
        <div className="pr-editor">{designHead}{editor}</div>
        <Divider dir="y" label="Resize the editor" onDrag={(f, box, d) => setLayout((l) => ({ ...l, editor: clamp(d ? l.editor + d : f, 0.2, 0.9 - l.diagram) }))} onReset={() => setLayout((l) => ({ ...l, editor: LAYOUT.editor, diagram: LAYOUT.diagram }))}/>
        <div className="pr-diagram"><p className="pr-dlabel">{S.diagram}</p>{diagram}</div>
        <Divider dir="y" label="Resize the diagram" onDrag={(f, box, d) => setLayout((l) => ({ ...l, diagram: clamp(d ? l.diagram + d : f - l.editor, 0.08, 0.9 - l.editor) }))} onReset={() => setLayout((l) => ({ ...l, editor: LAYOUT.editor, diagram: LAYOUT.diagram }))}/>
        {consoleBox}
      </div>
    </div>
    {dialogs}
  </div>;
}
