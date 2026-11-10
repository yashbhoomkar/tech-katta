// IND vs PAK on phones (landing page below 900 px): the same problem and judge as the full workspace, but driven
// by three controls instead of a canvas, which can't be used with a thumb (QA H5, H6). The design it builds:
// Viewers → (CDN) → Load Balancer → Servers → the problem's own cache and segment store (taken from its starting design, so
// every call can be answered). It runs the problem's example load tests (landingTests). The full problem adds the
// tests of single calls, a zone failure and the bill, an answer and a score.
// The landing page's laptop canvas (landingproblem.jsx) shows its results with LandingResults too.
import React,{useEffect,useMemo,useState}from"react";import{judge}from"./judge/judge.js";import{markStep}from"./progress.js";import"./lablite.css";import{KeepStars}from"./accountui.jsx";import{track}from"./analytics.js";
const N=(id,type,config={})=>({id,type,x:0,y:0,config});
const behind=P=>(P?.start?.nodes||[]).filter(n=>n.type==="cache"||n.type==="database").map(n=>({...n,config:{...n.config}}));
export function liteDesign({cdn,servers,prewarm},P){const ns=[N("viewers","client"),...(cdn?[N("cdn","cdn")]:[]),N("lb","lb"),N("origin","server",{size:"c5.2xlarge",count:prewarm?servers:Math.min(5,servers),maxCount:servers,autoscale:!prewarm}),...behind(P)];
return{nodes:ns,edges:ns.slice(1).map((n,i)=>({from:ns[i].id,to:n.id}))}}
// The example tests the landing page runs: the load tests (not the tests of single calls, v1 `request` or v2 `op`).
export const landingTests=P=>({...P,tests:P.tests.filter(t=>t.sample&&!t.request&&!t.op)});
// Judge a design on them. Analytics keeps counting landing attempts as "score" events (as when IND vs PAK was a
// challenge with stars): stars = tests passed, max = tests run, challenge = the problem's slug.
export function runLanding(design,lab,P,slug,lite){const r=judge(design,lab,landingTests(P),{sample:true});
if(r.verdict!=="error"){markStep(`practice:${slug}`);track("score",{challenge:slug,stars:r.passed,max:r.total,passed:r.results.map(x=>x.ok?1:0).join(""),lite})}return r}
// Each test with ✓ or ✕ and, when it failed, the judge's first reason; then the verdict.
export function LandingResults({r,l}){return <><p className="ll-verdict"><b>{r.passed} of {r.total}</b> example tests pass</p>
<ul>{r.results.map(t=><li key={t.id} className={t.ok?"ok":"no"}><b>{t.ok?"✓":"✕"}</b><span>{t.test.name}: {t.test.desc}</span>{!t.ok&&<small>{t.error||t.why[0]}</small>}</li>)}</ul>
<p>{r.passed===r.total?l.pass:l.fail}</p></>}
export default function LabLite({l,lab,P,account}){const t=l.lite;
const[cdn,setCdn]=useState(false),[servers,setServers]=useState(10),[prewarm,setPrewarm]=useState(true),[res,setRes]=useState(null);
const design=useMemo(()=>liteDesign({cdn,servers,prewarm},P),[cdn,servers,prewarm,P]);
useEffect(()=>setRes(null),[cdn,servers,prewarm]);
const box=(k,label,sub,on=true)=><div className={"ll-box"+(on?"":" off")} key={k}><b>{label}</b><small>{sub}</small></div>;
return <div className="ll">
<div className="ll-flow" aria-label={t.diagram}>{box("v",t.viewers,t.viewersSub)}<i aria-hidden="true">↓</i>
{cdn&&<>{box("c",t.cdnBox,t.cdnSub)}<i aria-hidden="true">↓</i></>}
{box("l",t.lbBox,cdn?t.lbSubCdn:t.lbSub)}<i aria-hidden="true">↓</i>{box("s",`${t.serversBox} × ${servers}`,prewarm?t.prewarmShort:t.autoShort)}</div>
<div className="ll-ctl">
<label className="ll-check"><input type="checkbox" checked={cdn} onChange={e=>setCdn(e.target.checked)}/><span><b>{t.cdn}</b><small>{t.cdnHelp}</small></span></label>
<div className="ll-step"><span><b>{t.servers}</b><small>{t.serversHelp}</small></span><div><button type="button" aria-label={t.fewer} onClick={()=>setServers(v=>Math.max(5,v-5))} disabled={servers<=5}>−</button><output aria-live="polite">{servers}</output><button type="button" aria-label={t.more} onClick={()=>setServers(v=>Math.min(50,v+5))} disabled={servers>=50}>+</button></div></div>
<fieldset className="ll-radio"><legend>{t.scaling}</legend>{[[true,t.prewarm],[false,t.auto]].map(([v,label])=><label key={label}><input type="radio" name="ll-scale" checked={prewarm===v} onChange={()=>setPrewarm(v)}/>{label}</label>)}</fieldset>
<button type="button" className="ll-score" onClick={()=>setRes(runLanding(design,lab,P,l.problem,true))}>{t.run}</button></div>
{res&&<div className="ll-res" role="status"><LandingResults r={res} l={l}/>{!cdn&&res.passed<res.total&&<p className="bad">{t.needCdn}</p>}{res.passed>0&&<KeepStars t={account}/>}</div>}
<p className="ll-more"><a href={l.openHref}>{t.full} →</a></p></div>}
