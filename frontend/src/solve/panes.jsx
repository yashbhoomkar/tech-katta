// The Hints and Submissions tabs.
import React from"react";import{STEPS,when}from"./format.js";
export function Hints({P,used,open}){
if(!P)return <p className="d-desc">No hints for this problem yet.</p>;
return <div className="sv-hints"><p className="sv-brief">Each hint you open takes 3 points off your score (at most 15). They go from a nudge to nearly the answer.</p>
<ol>{P.hints.map((h,i)=><li key={i} className={i<used?"open":""}><small>{STEPS[h.step]||h.step}</small>{i<used?<p>{h.x}</p>:i===used?<button type="button" onClick={open}>Show hint {i+1}</button>:<p className="sv-locked">Hint {i+1}</p>}</li>)}</ol></div>}

export function Subs({subs}){
if(!subs.length)return <p className="sv-brief">No submissions yet. Build your design, then press Submit.</p>;
return <table className="sv-subs"><thead><tr><th>When</th><th>Result</th><th>Tests</th><th>Score</th></tr></thead><tbody>
{subs.map(x=><tr key={x.at}><td>{when(x.at)}</td><td className={x.verdict==="accepted"?"ok":"no"}>{x.verdict==="accepted"?"Accepted":x.verdict==="error"?"Can't run":"Wrong design"}{x.copied&&<small className="sv-cp"> · copied solution</small>}</td><td>{x.passed}/{x.total}</td><td>{x.score}</td></tr>)}
</tbody></table>}
