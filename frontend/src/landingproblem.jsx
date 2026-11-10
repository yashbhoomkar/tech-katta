// IND vs PAK on the landing page (site.json landingLab): a problem, judged like every other. It loads the problem
// and the catalogue, then on a laptop shows the real canvas (the Lab in problem mode, embedded: the same design,
// q-<slug>, that the full workspace opens) with a Run button for the example traffic tests; on a phone, the three
// controls (lablite.jsx). Loaded only when the section nears the screen (main.jsx).
import React,{useEffect,useRef,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import Lab from"./lab/Lab.jsx";import LabLite,{runLanding,LandingResults,landingTests}from"./lablite.jsx";
export default function LandingProblem({l,account,narrow}){const[st,set]=useState({});
const go=()=>{set({});Promise.all([getJSON(`/v1/articles/${l.problem}`),getJSON("/v1/lab")]).then(([a,lab])=>set({a,lab}),()=>set({err:1}))};useEffect(go,[]);
const design=useRef(null),[res,setRes]=useState(null),[busy,setBusy]=useState(false);
if(st.err)return <LoadError what="the problem" retry={go}/>;if(!st.a)return <Loading label={l.loading}/>;
const P=st.a.practice;if(!P)return null;
if(narrow&&l.lite)return <LabLite l={l} lab={st.lab} P={P} account={account}/>;
// judged a moment later, so the button shows "Running…" first (a 4-hour scenario takes a few hundred ms)
const run=()=>{setBusy(true);setRes(null);setTimeout(()=>{setRes(runLanding(design.current||P.start,st.lab,P,l.problem,false));setBusy(false)},20)};
return <div className="lp-prob"><div className="lp-run"><button type="button" className="ll-score" onClick={run} disabled={busy}>{busy?l.running:l.run}</button><span>{landingTests(P).tests.map(t=>t.name).join(" · ")}</span></div>
<Lab problem={{id:l.problem,name:st.a.title,start:P.start,fields:P.data?.fields}} embedded={{open:l.open,href:l.openHref}} onDesign={d=>{design.current=d;setRes(null)}}/>
{res&&<div className="ll-res lp-res" role="status"><LandingResults r={res} l={l}/></div>}</div>}
