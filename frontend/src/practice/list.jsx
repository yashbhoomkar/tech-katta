// The problem list (/dashboard/practice/, spec section 12): progress, filters, a daily problem, the table.
import React, { useMemo, useState } from "react";
import { S, DIFF } from "./strings.js";

// one problem a day, the same for everyone: (days since 2026-01-01 in India) mod n
export const dailyIndex = (n, now = Date.now()) => { const ist = now + 5.5 * 3600_000, day = Math.floor((ist - Date.UTC(2026, 0, 1)) / 86_400_000); return ((day % n) + n) % n; };

export default function ProblemList({ list, streak, error, retry }) {
  const [status, setStatus] = useState("all"), [diff, setDiff] = useState("all"), [topics, setTopics] = useState([]), [q, setQ] = useState(""), [sort, setSort] = useState("id");
  const all = list || [];
  const shown = useMemo(() => all.filter((p) => (status === "all" || (status === "solved" ? p.status === "solved" : p.status !== "solved")) && (diff === "all" || p.difficulty === diff) && topics.every((t) => p.topics.includes(t)) && (!q || p.title.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort === "difficulty" ? ["easy", "medium", "hard"].indexOf(a.difficulty) - ["easy", "medium", "hard"].indexOf(b.difficulty) : sort === "acceptance" ? (b.acceptance ?? -1) - (a.acceptance ?? -1) : 0) || a.id - b.id), [all, status, diff, topics, q, sort]);
  if (error) return <section className="d-panel"><p>{S.noReach}</p><button type="button" className="pb-btn" onClick={retry}>Try again</button></section>;
  if (!list) return null;
  const solved = all.filter((p) => p.status === "solved").length, daily = all.length ? all[dailyIndex(all.length)] : null;
  const allTopics = [...new Set(all.flatMap((p) => p.topics))].sort();
  const pick = () => { const open = shown.filter((p) => p.status !== "solved"); const p = open[Math.floor(Math.random() * open.length)]; if (p) location.hash = `practice/${p.slug}`; };
  const bar = (d) => { const of = all.filter((p) => p.difficulty === d); return <span key={d} className={`pl-bar pr-${d}`} title={`${DIFF[d]}: ${of.filter((p) => p.status === "solved").length} of ${of.length}`}><i style={{ width: `${of.length ? (100 * of.filter((p) => p.status === "solved").length) / of.length : 0}%` }}/></span>; };
  const pill = (v, cur, set, label) => <button key={v} type="button" className={"pb-chip" + (cur === v ? " on" : "")} aria-pressed={cur === v} onClick={() => set(v)}>{label}</button>;
  return <section className="pl" aria-labelledby="pl-t">
    <h1 id="pl-t" className="pl-title">{S.listTitle}</h1><p className="pl-desc">{S.listDesc}</p>
    <p className="pl-progress">{S.solvedOf(solved, all.length)} {["easy", "medium", "hard"].map(bar)}{streak !== null && <span className="pl-streak">{S.streak(streak)}</span>}</p>
    {daily && <a className="pl-daily" href={`#practice/${daily.slug}`}><small>{S.daily}</small><b>{daily.id}. {daily.title}</b><span className={`pr-diff pr-${daily.difficulty}`}>{DIFF[daily.difficulty]}</span></a>}
    <div className="pl-filters">
      <span>{pill("all", status, setStatus, S.all)}{pill("open", status, setStatus, S.notDone)}{pill("solved", status, setStatus, S.solvedF)}</span>
      <span>{pill("all", diff, setDiff, S.all)}{["easy", "medium", "hard"].map((d) => pill(d, diff, setDiff, DIFF[d]))}</span>
      <span>{allTopics.map((t) => <button key={t} type="button" className={"pb-chip" + (topics.includes(t) ? " on" : "")} aria-pressed={topics.includes(t)} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</button>)}</span>
      <input type="search" className="pl-search" placeholder={S.search} aria-label={S.search} value={q} onChange={(e) => setQ(e.target.value)}/>
      <button type="button" className="pr-primary" onClick={pick}>{S.pick}</button>
    </div>
    <table className="pl-table"><thead><tr><th>{S.status}</th><th><button type="button" className="pb-link" onClick={() => setSort("id")}>#</button></th><th>{S.title}</th><th><button type="button" className="pb-link" onClick={() => setSort("difficulty")}>{S.difficulty}</button></th><th><button type="button" className="pb-link" onClick={() => setSort("acceptance")}>{S.acceptance}</button></th><th>{S.topics}</th></tr></thead>
      <tbody>{shown.map((p) => <tr key={p.id}>
        <td aria-label={p.status || "not tried"}>{p.status === "solved" ? "✓" : p.status === "tried" ? "•" : ""}</td><td>{p.id}</td>
        <td><a href={`#practice/${p.slug}`}>{p.title}</a>{!p.free && <span className="pl-lock" aria-label="Plus">🔒</span>}</td>
        <td><span className={`pr-diff pr-${p.difficulty}`}>{DIFF[p.difficulty]}</span></td><td>{p.acceptance === null ? "—" : `${p.acceptance} %`}</td><td className="pl-topics">{p.topics.join(" · ")}</td></tr>)}</tbody></table>
  </section>;
}
