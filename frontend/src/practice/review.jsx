// "Ask the interviewer" (tech-katta-context/22-EVALUATOR-V3.md §14.3): a button next to Run and Submit; then the
// review card. The card is the same whether the interviewer wrote it or
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

// The interviewer's button sits with Run and Submit (practice/page.jsx, solve.jsx); its review shows in the result area.
// review: null | {busy} | {data} | {err}. The credit line comes from GET /me/credits, refreshed by each review.
export function useCredits(review) {
  const [credits, setCredits] = useState(null);
  useEffect(() => { let live = true; api.aiCredits().then((c) => { if (live) setCredits(c); }, () => {}); return () => { live = false; }; }, []);
  useEffect(() => { if (review?.data?.credits) setCredits((c) => ({ ...(c || {}), ...review.data.credits })); }, [review]);
  return credits;
}
export function AskButton({ className, busy, disabled, onClick, credits }) {
  const on = credits?.enabled !== false, left = credits?.month?.left;
  return <button type="button" className={className} disabled={disabled || busy} onClick={onClick}
    title={Number.isFinite(left) ? S.reviewsLeft(left, credits.month.total) : S.askInterviewer}>
    {busy ? S.reviewing : on ? S.askInterviewer : S.askReport}</button>;
}
// An error text for a failed review request.
export const reviewError = (e) => e?.status === 401 ? S.signInToAsk : e?.status === 429 ? (e.message || S.tooMany) : S.reviewFailed;
export function ReviewPanel({ review, credits }) {
  if (!review) return null;
  const left = credits?.month?.left;
  return <div className="pv-ask-box">
    {review.busy ? <p className="pv-credits" role="status">{S.reviewingLong}</p>
      : review.err ? <p className="pv-err" role="alert">{review.err}</p>
      : <ReviewCard data={review.data}/>}
    {credits?.enabled !== false && Number.isFinite(left) && <span className="pv-credits">{S.reviewsLeft(left, credits.month.total)}{credits.preview ? ` · ${S.preview}` : ""}</span>}
  </div>;
}
