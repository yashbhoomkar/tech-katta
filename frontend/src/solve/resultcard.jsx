// After the first Submit on a problem: one compact card with what matters (tests passed, the top reason for failing in plain words, Replay the failure,
// the next problem). It uses only the judge's own output (j.passed, j.total, the first failing test's "why"); nothing here scores or invents.
import React,{useEffect,useState}from"react";import{getJSON}from"../api.js";
/** the problem after this one in the list (interview questions past "Start here"), or null */
function useNext(slug){const[n,setN]=useState(null);useEffect(()=>{let live=true;getJSON("/v1/articles?section=interview-questions").then(d=>{if(!live)return;const l=(d.articles||[]).filter(a=>a.group!=="start"),i=l.findIndex(a=>a.slug===slug);const nx=l[i+1]||l.find(a=>a.slug!==slug);if(nx)setN({slug:nx.slug,title:String(nx.title||"").split(": ")[0]})},()=>{});return()=>{live=false}},[slug]);return n}
/** the top reason, in words: the first failing test's explanation, else its first failed check */
export function topReason(j){const r=j?.first;if(!r||r.ok)return null;return r.why?.[0]||r.checks?.find(c=>!c.ok)?.label||r.test?.name||null}
export function ResultCard({j,slug,watch,replay,troubleAt}){const next=useNext(slug),acc=j.verdict==="accepted",reason=topReason(j),r=j.first&&!j.first.ok?j.first:j.results.find(x=>x.timeline)||null;
return <section className="sv-card" aria-label="Your first result"><p className="sv-card-k">{acc?"First try: accepted":"Your first result"}</p>
<p className="sv-card-n"><b>{j.passed}</b> / {j.total} tests passed</p>
{reason&&<p className="sv-card-why"><span>Top reason it failed</span>{reason}</p>}
<p className="sv-card-go">{r&&(r.timeline?<button type="button" className="sv-watch" onClick={()=>replay(r,acc?0:troubleAt(r))}>▶ {acc?"Replay it":"Replay the failure"}</button>:r.trace?.length>1?<button type="button" className="sv-watch" onClick={()=>watch(r)}>▶ Watch the request travel</button>:null)}{next&&<a className="sv-card-next" href={"/problems/"+next.slug}>Try the next problem: {next.title} →</a>}</p></section>}
