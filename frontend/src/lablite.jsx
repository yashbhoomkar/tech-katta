// The IND vs PAK challenge for phones (landing page below 900 px): the same challenge, scorer and
// stars as the full Lab, but driven by three controls instead of a canvas, which can't be used with
// a thumb (QA H5, H6). The design it builds: Viewers → (CDN) → Load Balancer → Servers.
import React,{useEffect,useMemo,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";
import{runChallenge}from"./lab/challenges.js";import{readProgress,recordStars}from"./progress.js";import"./lablite.css";
const N=(id,type,config={})=>({id,type,x:0,y:0,config});
export function liteDesign({cdn,servers,prewarm}){const ns=[N("viewers","client"),...(cdn?[N("cdn","cdn")]:[]),N("lb","lb"),N("origin","server",{size:"c5.2xlarge",count:prewarm?servers:Math.min(5,servers),maxCount:servers,autoscale:!prewarm,queriesPerRequest:1})];
return{nodes:ns,edges:ns.slice(1).map((n,i)=>({from:ns[i].id,to:n.id}))}}
const val=c=>c.kind==="availability"?`${c.value.toFixed(2)}%`:"";
export default function LabLite({l}){const t=l.lite;const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(lab=>set({lab}),()=>set({err:1}))};useEffect(go,[]);
const[cdn,setCdn]=useState(false),[servers,setServers]=useState(10),[prewarm,setPrewarm]=useState(true),[res,setRes]=useState(null);
const ch=st.lab?.challenges?.find(c=>c.id===l.challenge);const design=useMemo(()=>liteDesign({cdn,servers,prewarm}),[cdn,servers,prewarm]);
useEffect(()=>setRes(null),[cdn,servers,prewarm]);
if(st.err)return <LoadError what="the challenge" retry={go}/>;if(!st.lab)return <Loading label={l.loading}/>;if(!ch)return null;
const score=()=>{const r=runChallenge(design,st.lab,ch);if(!r.error)recordStars(ch.id,r.stars,r.checks.map(c=>c.ok));setRes(r)};const best=readProgress().stars[ch.id]||0;
const box=(k,label,sub,on=true)=><div className={"ll-box"+(on?"":" off")} key={k}><b>{label}</b><small>{sub}</small></div>;
return <div className="ll">
<div className="ll-flow" aria-label={t.diagram}>{box("v",t.viewers,t.viewersSub)}<i aria-hidden="true">↓</i>
{cdn&&<>{box("c",t.cdnBox,t.cdnSub)}<i aria-hidden="true">↓</i></>}
{box("l",t.lbBox,cdn?t.lbSubCdn:t.lbSub)}<i aria-hidden="true">↓</i>{box("s",`${t.serversBox} × ${servers}`,prewarm?t.prewarmShort:t.autoShort)}</div>
<div className="ll-ctl">
<label className="ll-check"><input type="checkbox" checked={cdn} onChange={e=>setCdn(e.target.checked)}/><span><b>{t.cdn}</b><small>{t.cdnHelp}</small></span></label>
<div className="ll-step"><span><b>{t.servers}</b><small>{t.serversHelp}</small></span><div><button type="button" aria-label={t.fewer} onClick={()=>setServers(v=>Math.max(5,v-5))} disabled={servers<=5}>−</button><output aria-live="polite">{servers}</output><button type="button" aria-label={t.more} onClick={()=>setServers(v=>Math.min(50,v+5))} disabled={servers>=50}>+</button></div></div>
<fieldset className="ll-radio"><legend>{t.scaling}</legend>{[[true,t.prewarm],[false,t.auto]].map(([v,label])=><label key={label}><input type="radio" name="ll-scale" checked={prewarm===v} onChange={()=>setPrewarm(v)}/>{label}</label>)}</fieldset>
<button type="button" className="ll-score" onClick={score}>{t.score} ★</button></div>
{res&&<div className="ll-res" role="status"><div className="ll-stars" aria-label={`${res.stars} of ${res.max} stars`}>{"★".repeat(res.stars)}<i>{"★".repeat(res.max-res.stars)}</i></div>
{res.missing?<p className="bad">{t.needCdn}</p>:null}
<ul>{res.checks.map((c,i)=><li key={i} className={c.ok?"ok":"no"}><b>{c.ok?"✓":"✕"}</b><span>{c.label}</span><small>{val(c)}</small></li>)}</ul>
<p>{res.stars===res.max?t.allStars:res.stars?t.someStars:t.noStars}</p></div>}
<p className="ll-more">{best?`${t.best}: ${"★".repeat(best)} · `:""}<a href={l.openHref}>{t.full} →</a></p></div>}
