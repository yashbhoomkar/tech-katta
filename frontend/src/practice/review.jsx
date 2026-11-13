// "Ask the interviewer" (tech-katta-context/22-EVALUATOR-V3.md §14.3): under a Submit's result, one button that shows
// what it costs and what is left; then the review card. The card is the same whether the interviewer wrote it or
// the report did (the floor, §12.5); a line says which, and why when it is the report's.
import React, { useEffect, useState } from "react";
import * as api from "./client.js";
import { S } from "./strings.js";
import "./review.css";

const KIND = { problem: "pv-problem", risk: "pv-risk", strength: "pv-strength", note: "pv-note" };

export function ReviewCard({ data }) {
  const { review: r, source, reason, preview } = data;
  return <section className="pv-card" aria-label={S.reviewTitle}>
    <p className="pv-from">{source === "interviewer" ? S.fromInterviewer : S.fromReport}{preview && <span className="pv-tag" title={S.previewWhy}>{S.preview}</span>}</p>
    {source === "report" && reason && S.whyReport[reason] && <p className="pv-why">{S.whyReport[reason]}</p>}
    <p className="pv-head">{r.headline}</p>
    <ol className="pv-items">{r.items.map((it, i) => <li key={i} className={KIND[it.kind] || "pv-note"}>
      <small>{S.reviewKind[it.kind] || it.kind}</small>
      <p>{it.text}</p>
      {it.ask && <p className="pv-ask">{S.askLabel} {it.ask}</p>}
    </li>)}</ol>
    {r.next?.text && <p className="pv-next"><b>{S.nextStep}</b> {r.next.text}</p>}
  </section>;
}

// submissionId: a Practice Submit to review; or request: a function that asks for the review (the canvas, which sends
// its design; solve.jsx), with resetKey changing for each new result. The credit line comes from GET /me/credits and
// is refreshed by each review.
export function AskInterviewer({ submissionId, request, resetKey }) {
  const [credits, setCredits] = useState(null), [state, setState] = useState("idle"), [data, setData] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { let live = true; api.aiCredits().then((c) => { if (live) setCredits(c); }, () => {}); return () => { live = false; }; }, []);
  useEffect(() => { setState("idle"); setData(null); setErr(null); }, [submissionId, resetKey]);
  const ask = async () => {
    setState("busy"); setErr(null);
    try {
      const d = request ? await request() : await api.reviewSubmission(submissionId);
      setData(d); setState("done");
      if (d.credits) setCredits((c) => ({ ...(c || {}), ...d.credits }));
    } catch (e) { setErr(e.status === 429 ? (e.message || S.tooMany) : S.reviewFailed); setState("idle"); }
  };
  const left = credits?.month?.left, on = credits?.enabled !== false;
  if (state === "done" && data) return <ReviewCard data={data}/>;
  return <div className="pv-ask-box">
    <button type="button" className="pv-btn" disabled={state === "busy" || !(submissionId || request)} onClick={ask}>
      {state === "busy" ? S.reviewing : on ? S.askInterviewer : S.askReport}
    </button>
    {on && Number.isFinite(left) && <span className="pv-credits">{S.reviewsLeft(left, credits.month.total)}{credits.preview ? ` · ${S.preview}` : ""}</span>}
    {state === "busy" && <p className="pv-credits" role="status">{S.reviewingLong}</p>}
    {err && <p className="pv-err" role="alert">{err}</p>}
  </div>;
}
