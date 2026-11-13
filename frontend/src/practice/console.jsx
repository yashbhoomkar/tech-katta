// The console under the editor (spec 11.3): Testcase (edit a visible example and Run it) and Result (the verdict, why,
// expected against yours, the trace with a load bar per hop, every test ✓/✕, and on Accepted the cost and rank).
import React, { useState } from "react";
import { S } from "./strings.js";
import Scene from "../theme/Scene.jsx";
import { inrExact } from "../tkd/inr.js";
import { AskInterviewer } from "./review.jsx";

const EVENTS = { none: undefined, server: [{ kill_role: "server" }], sql: [{ kill_role: "sql" }, { kill_role: "nosql" }], cache: [{ flush_role: "cache" }] };
const eventOf = (ev) => (!ev?.length ? "none" : ev.some((e) => e.kill_role === "sql") ? "sql" : ev.some((e) => e.flush_role) ? "cache" : "server");
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

export function Testcase({ problem, test, setTest, pick, setPick }) {
  const visible = problem.tests.filter((t) => !t.hidden), names = problem.requests.map((r) => r.name);
  const ph = (i, fn) => setTest({ ...test, phases: test.phases.map((p, j) => (j === i ? fn({ ...p, rates: { ...p.rates } }) : p)) });
  const pr = (key, req, v) => setTest({ ...test, promises: { ...test.promises, [key]: { ...(test.promises[key] || {}), [req]: v } } });
  return <div className="pc-case">
    <label className="pc-pick">{S.testcase} <select value={pick} onChange={(e) => setPick(e.target.value)}>{visible.map((t, i) => <option key={t.id} value={t.id}>{S.example(i + 1, t.title)}</option>)}</select></label>
    <div className="pc-table-w"><table className="pc-table"><thead><tr><th>#</th><th>{S.seconds}</th>{names.map((n) => <th key={n}>{n} /s</th>)}<th>{S.event}</th><th/></tr></thead>
      <tbody>{test.phases.map((p, i) => <tr key={i}><td>{i + 1}</td>
        <td><input type="number" min={1} aria-label={`Phase ${i + 1} seconds`} value={p.seconds} onChange={(e) => ph(i, (x) => ({ ...x, seconds: Math.max(1, num(e.target.value)) }))}/></td>
        {names.map((n) => <td key={n}><input type="number" min={0} aria-label={`Phase ${i + 1} ${n} a second`} value={p.rates[n] ?? 0} onChange={(e) => ph(i, (x) => { x.rates[n] = num(e.target.value); return x; })}/></td>)}
        <td><select aria-label={`Phase ${i + 1} event`} value={eventOf(p.events)} onChange={(e) => ph(i, (x) => { const ev = EVENTS[e.target.value]; const { events, ...rest } = x; return ev ? { ...rest, events: ev } : rest; })}>{Object.entries(S.events).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></td>
        <td>{test.phases.length > 1 && <button type="button" className="pb-link" aria-label={`Remove phase ${i + 1}`} onClick={() => setTest({ ...test, phases: test.phases.filter((_, j) => j !== i) })}>✕</button>}</td></tr>)}</tbody></table></div>
    <div className="pc-row"><button type="button" className="pb-btn" disabled={test.phases.length >= 20} onClick={() => setTest({ ...test, phases: [...test.phases, { ...test.phases[test.phases.length - 1], events: undefined }] })}>{S.addPhase}</button>
      <button type="button" className="pb-link" onClick={() => setPick(pick, true)}>{S.resetExample}</button></div>
    <h4 className="pc-h">{S.promises}</h4>
    <div className="pc-prom">{names.map((n) => <React.Fragment key={n}>
      {["p99_ms", "p50_ms"].map((k) => test.promises[k]?.[n] !== undefined && <label key={k}>{n} {k.replace("_ms", "")} ≤ <input type="number" min={1} value={test.promises[k][n]} onChange={(e) => pr(k, n, Math.max(1, num(e.target.value)))}/> ms</label>)}
      {test.promises.availability?.[n] !== undefined && <label>{n} available ≥ <input type="number" step="0.001" min={0} max={1} value={test.promises.availability[n]} onChange={(e) => pr("availability", n, Math.min(1, num(e.target.value)))}/></label>}
    </React.Fragment>)}
      {test.promises.budget_inr !== undefined && <label>Budget ≤ ₹ <input type="number" min={1} value={test.promises.budget_inr} onChange={(e) => setTest({ ...test, promises: { ...test.promises, budget_inr: Math.max(1, num(e.target.value)) } })}/></label>}</div>
  </div>;
}

const BAD = new Set(["Wrong Answer", "Data Lost", "Unavailable", "Overloaded"]);
const verdictClass = (v) => (v === "Accepted" ? "pc-v-ok" : BAD.has(v) ? "pc-v-bad" : "pc-v-warn");

// "Share as image" (card.js): the share sheet where the device takes files, otherwise a saved PNG
function CardButton({ onCard }) { const [st, setSt] = useState(""); return <button type="button" className="pb-btn" disabled={st === "busy"} onClick={async () => { setSt("busy"); const r = await onCard().catch(() => null); setSt(r === "saved" ? "saved" : ""); if (r === "saved") setTimeout(() => setSt(""), 2500); }}>{st === "saved" ? S.cardSaved : S.cardShare}</button>; }
export function Result({ result, busy, showTip, onNext, onShare, canShare, howHref, onCard }) {
  const [note, setNote] = useState(""), [shared, setShared] = useState(false), [sharing, setSharing] = useState(false);
  if (busy) return <p className="pc-empty" role="status">{S.judging}</p>;
  if (!result) return <p className="pc-empty">{S.runFirst}</p>;
  const r = result, f = r.failed;
  return <div className="pc-res" aria-live="polite">
    <p className={"pc-verdict " + verdictClass(r.verdict)}><span className={r.verdict === "Accepted" ? "tk-mark" : ""}>{r.verdict}</span></p>
    {r.verdict !== "Invalid Design" && r.verdict !== "Judge Error" && <p className="pc-count">{S.passed(r.passed, r.total)}{r.kind === "submit" ? "" : " · Run"}</p>}
    {r.verdict === "Judge Error" && <div className="pr-state"><Scene kind={r.busy ? "busy" : "offline"}/><p className="pc-msg">{r.message}</p></div>}
    {r.verdict === "Invalid Design" && <ul className="pc-errs">{r.errors.map((e, i) => <li key={i}><b>Line {e.line}</b> {e.message}</li>)}</ul>}
    {f && <>
      {f.message && <p className="pc-msg">{f.message}</p>}
      {r.close && <p className="pc-close">{r.close.text}</p>}
      {showTip && r.tip && <p className="pc-tip">{r.tip}</p>}
      <p className="pc-test">{f.hidden ? `${S.hiddenTest}: ` : ""}{f.title}{f.phase ? ` · phase ${f.phase}` : ""}</p>
      {(f.expected || f.actual) && <div className="pc-ea"><div><small>{S.expected}</small><b>{f.expected}</b></div><div><small>{S.yours}</small><b>{f.actual}</b></div></div>}
      {f.trace?.length > 0 && <ol className="pc-trace">{f.trace.map((t, i) => <li key={i} className={(f.blame?.part === t.part ? "blamed " : "") + (t.bg ? "bg" : "")}>
        <b>{t.part}</b><span>{t.down ? "down" : t.skipped ? "skipped" : `${t.ms} ms`}</span>
        <i className="pc-bar" aria-label={Number.isFinite(t.rho) ? `${Math.round(t.rho * 100)} % load` : "no load"}><i style={{ width: `${Math.min(100, Math.round((t.rho || 0) * 100))}%` }}/></i>
        {t.hit !== undefined && <small>hit {Math.round(t.hit * 1000) / 10} %</small>}</li>)}</ol>}
      {r.also?.length > 0 && <details className="pc-also"><summary>{S.otherThings}</summary><ul>{r.also.map((a, i) => <li key={i}>{a.message}</li>)}</ul></details>}
    </>}
    {r.tests && <ul className="pc-tests">{r.tests.map((t) => <li key={t.id} className={t.verdict === "Passed" ? "ok" : t.verdict ? "bad" : "skip"}>{t.verdict === "Passed" ? "✓" : t.verdict ? "✕" : "·"} {t.title}</li>)}</ul>}
    {r.verdict === "Accepted" && <div className="pc-acc">
      <p>{inrExact(r.cost_inr)}/month{Number.isFinite(r.rank_p99_ms) ? ` · p99 ${r.rank_p99_ms} ms` : ""}</p>
      {r.kind === "submit" && (r.rank ? <><p className="pc-rank"><span>{S.cheaper(inrExact(r.cost_inr), r.rank.cheaper_than)}</span><i className="pc-bar"><i style={{ width: `${r.rank.cheaper_than}%` }}/></i></p>{r.rank.faster_than !== null && <p className="pc-rank"><span>{S.faster(r.rank_p99_ms, r.rank.faster_than)}</span><i className="pc-bar"><i style={{ width: `${r.rank.faster_than}%` }}/></i></p>}</> : <p className="pc-muted">{S.notEnough}</p>)}
      {r.tightest && <p className="pc-muted">{r.tightest.text}</p>}
      <div className="pc-row">{onNext && <button type="button" className="pr-primary" onClick={onNext}>{S.nextProblem}</button>}
        {onCard && <CardButton onCard={onCard}/>}
        {canShare && !shared && (sharing ? <span className="pc-share"><input value={note} maxLength={280} placeholder={S.sharePrompt} aria-label={S.sharePrompt} onChange={(e) => setNote(e.target.value)}/><button type="button" className="pb-btn" onClick={async () => { if (await onShare(note)) setShared(true); }}>{S.share}</button></span> : <button type="button" className="pb-btn" onClick={() => setSharing(true)}>{S.share}</button>)}
        {shared && <span className="pc-muted">{S.shared}</span>}</div>
    </div>}
    {r.kind === "submit" && r.submission_id && r.verdict !== "Judge Error" && <AskInterviewer submissionId={r.submission_id}/>}
    {howHref && <p className="pc-how"><a href={howHref}>{S.howJudged}</a></p>}
  </div>;
}
