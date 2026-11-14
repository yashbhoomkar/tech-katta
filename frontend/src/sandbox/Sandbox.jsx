// The sandbox canvas (context 36, §5.12; owner, 2026-11-14: "Should be built. It should be paid."): the problem canvas
// with the problem switched off. The visitor chooses the traffic and what goes wrong, runs it, reads a report (no pass
// or fail: there is no requirement to meet), replays it on the canvas and can break it further. Behind sign-in like
// every page that isn't a list, and marked paid for when subscriptions start. The design is kept like a problem's
// ("q-sandbox", synced to the account); the traffic settings stay in this browser.
import React,{Suspense,useEffect,useMemo,useRef,useState}from"react";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";import{track}from"../analytics.js";
import{judge}from"../judge/judge.js";import{evalCatalogue}from"../eval/design.js";
import{fieldsOf,replayAt,ReplayBar,Findings,eventWords}from"../solve/v2.jsx";import{Bill}from"../solve/console.jsx";import{fmt,pct}from"../solve/format.js";
import{sandboxPractice,cleanSettings,DEFAULTS,TEMPLATES,PATTERNS,hoursOf,tickOf}from"./practice.js";
import"../solve.css";import"./sandbox.css";

const KEY="tk-sandbox-v1";
const readSettings=()=>{try{return cleanSettings(JSON.parse(localStorage.getItem(KEY)||"null")||DEFAULTS)}catch{return cleanSettings(DEFAULTS)}};
const FAULTS=[["crash","A part crashes"],["zoneDown","A zone goes dark"],["spike","Traffic jumps"],["cacheFlush","The cache empties"]];

export default function Sandbox({Lab}){
const[lab,setLab]=useState(null),[err,setErr]=useState(false);const load=()=>{setErr(false);getJSON("/v1/lab").then(setLab,()=>setErr(true))};useEffect(load,[]);
const[s,setS]=useState(readSettings);useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}},[s]);
const set=patch=>setS(x=>cleanSettings({...x,...patch}));
const P=useMemo(()=>sandboxPractice(s),[s]);
const design=useRef(null);const[nodes,setNodes]=useState([]);const[gen,setGen]=useState(0),[pending,setPending]=useState(null);
const[res,setRes]=useState(null),[rep,setRep]=useState(null),[busy,setBusy]=useState(false);
useEffect(()=>{track("sandbox_open",{})},[]);
if(err)return <LoadError what="the canvas" retry={load}/>;if(!lab)return <Loading label="Loading the canvas"/>;
const cat=evalCatalogue(lab),comp=t=>cat[t]||lab.components?.find(c=>c.type===t);
const nameOf=id=>{const n=(design.current||P.start).nodes?.find(x=>x.id===id);return n?.name||comp(n?.type)?.name||id};
const parts=nodes.filter(n=>comp(n.type)?.crash&&!comp(n.type)?.managed).map(n=>({id:n.id,type:n.type,name:n.name||comp(n.type)?.name||n.id}));
const hours=hoursOf(s.pattern),tick=tickOf(hours),patterns=(lab.components||[]).find(c=>c.type==="client")?.patterns||[];
const run=()=>{if(busy)return;setBusy(true);setRep(null);setRes(null);setTimeout(()=>{try{const d=design.current||P.start,j=judge(d,lab,P,{sample:true});setRes({j,r:j.results.find(x=>x.timeline)||null});track("sandbox_run",{rps:s.rps,pattern:s.pattern,faults:s.faults.length,parts:d.nodes.length})}catch(e){setRes({crash:String(e?.message||e)})}setBusy(false)},30)};
const pickTemplate=id=>{const t=TEMPLATES.find(x=>x.id===id);if(!t)return;if((design.current?.nodes?.length||0)>1&&!confirm("Replace the design on the canvas with this one? Undo can't bring it back."))return;setPending({nodes:structuredClone(t.nodes),edges:structuredClone(t.edges)});setGen(g=>g+1);setRes(null);setRep(null);track("sandbox_template",{id})};
const breakIt=(fault,label)=>{if(!rep)return;const d=design.current||P.start,base=rep.base||rep.r.test,faults=[...(rep.faults||base.faults||[]),fault];let r2=null;try{const j=judge(d,lab,{...P,tests:[{...base,faults}]},{sample:true});r2=j.results.find(x=>x.timeline)}catch{}if(!r2)return;
setRep(x=>({...x,r:r2,base,faults,play:true,whatIf:[...(x.whatIf||[]),`${label} at minute ${fault.minute}`]}))};
const fault=(k,patch)=>set({faults:s.faults.map((f,i)=>i===k?{...f,...patch}:f)});
const addFault=()=>set({faults:[...s.faults,parts[0]?{kind:"crash",type:parts[0].type,node:parts[0].id,minute:Math.min(10,hours*60-tick)}:{kind:"spike",factor:2,minutes:15,minute:Math.min(10,hours*60-tick)}]});
return <div className="sb">
<aside className="sb-side" aria-label="Traffic and failures">
<p className="sb-eyebrow">SANDBOX · <span className="sb-paid">Paid</span></p><h1>Design anything</h1>
<p className="sb-lead">No problem, no tests: choose the traffic and what goes wrong, then Run. The report says how your design held up and what it costs. Nothing here is scored.</p>
<label className="sb-f"><span>Start from</span><select value="" onChange={e=>{pickTemplate(e.target.value);e.target.value=""}}><option value="">Choose a starting design…</option>{TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
<h2>Traffic</h2>
<label className="sb-f"><span>Requests a second at the busiest moment</span><input type="number" min={1} max={2000000} value={s.rps} onChange={e=>set({rps:e.target.value})}/></label>
<label className="sb-f"><span>Over the day</span><select value={s.pattern} onChange={e=>set({pattern:e.target.value})}>{PATTERNS.map(p=>{const x=patterns.find(q=>q.id===p);return <option key={p} value={p}>{x?.label||p}{p==="steady"?" (one hour at 8 pm)":" (a whole day)"}</option>})}</select></label>
<label className="sb-f"><span>Reads: {Math.round(s.readShare*100)}% · saves: {Math.round((1-s.readShare)*100)}%</span><input type="range" min={0} max={100} value={Math.round(s.readShare*100)} onChange={e=>set({readShare:e.target.value/100})}/></label>
<div className="sb-two"><label className="sb-f"><span>Item size (KB)</span><input type="number" min={0.1} step={0.1} value={s.itemKb} onChange={e=>set({itemKb:e.target.value})}/></label><label className="sb-f"><span>p99 target (ms)</span><input type="number" min={10} value={s.p99Ms} onChange={e=>set({p99Ms:e.target.value})}/></label></div>
<p className="sb-note">Every database needs a table <code>items</code> with <code>id</code> (the key) and <code>data</code>. The starting designs have it.</p>
<h2>What goes wrong</h2>
{s.faults.length===0&&<p className="sb-note">Nothing yet: add a failure to see how the design copes.</p>}
<ol className="sb-faults">{s.faults.map((f,k)=><li key={k}>
<select aria-label="Failure" value={f.kind==="crash"?"crash:"+(f.node||""):f.kind} onChange={e=>{const v=e.target.value;if(v.startsWith("crash:")){const p=parts.find(x=>x.id===v.slice(6));fault(k,{kind:"crash",node:p?.id,type:p?.type||"server"})}else fault(k,{kind:v,factor:v==="spike"?(f.factor||2):undefined,minutes:v==="zoneDown"||v==="spike"?(f.minutes||15):undefined})}}>
{parts.map(p=><option key={p.id} value={"crash:"+p.id}>{p.name} crashes</option>)}{f.kind==="crash"&&!parts.some(p=>p.id===f.node)&&<option value={"crash:"+(f.node||"")}>A part no longer on the canvas</option>}{FAULTS.filter(x=>x[0]!=="crash").map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
<label>at minute <input type="number" min={0} max={hours*60-tick} step={tick} value={f.minute} onChange={e=>fault(k,{minute:e.target.value})}/></label>
{f.kind==="spike"&&<label>× <input type="number" min={1.5} max={10} step={0.5} value={f.factor} onChange={e=>fault(k,{factor:e.target.value})}/></label>}
{(f.kind==="spike"||f.kind==="zoneDown")&&<label>for <input type="number" min={tick} max={120} step={tick} value={f.minutes} onChange={e=>fault(k,{minutes:e.target.value})}/> min</label>}
<button type="button" className="sb-x" onClick={()=>set({faults:s.faults.filter((_,i)=>i!==k)})} aria-label="Remove this failure">✕</button></li>)}</ol>
{s.faults.length<6&&<button type="button" className="sv-linkbtn" onClick={addFault}>+ Add a failure</button>}
<button type="button" className="sv-run sb-run" disabled={busy} onClick={run}>{busy?"Running…":"▶ Run"}</button>
</aside>
<div className="sv-lab sb-lab"><Suspense fallback={<Loading label="Loading the canvas"/>}><Lab key={"sandbox:"+gen} problem={{id:"sandbox",name:"My sandbox design",start:P.start,fields:fieldsOf(P),v:2,ops:P.operations.map(o=>({id:o.id,name:o.name})),practice:P,load:pending,onLoaded:()=>setPending(null)}} onDesign={d=>{design.current=d;setNodes(d.nodes)}} replay={rep?replayAt(rep,P):null} flow={rep?0:undefined}/></Suspense>
{rep?<ReplayBar rep={rep} set={setRep} P={P} nameOf={nameOf} parts={parts} onBreak={breakIt}/>:(busy||res)&&<Report busy={busy} res={res} P={P} nameOf={nameOf} close={()=>setRes(null)} replay={r=>setRep({r,i:0,play:false})}/>}</div>
</div>}

// The report: how the design held up under the visitor's traffic. Words only where something happened.
function Report({busy,res,P,nameOf,close,replay}){
if(busy)return <section className="sv-console" aria-live="polite"><p className="sv-running">Running your traffic…</p></section>;
if(res.crash)return <section className="sv-console"><header className="sv-v bad"><b>Something went wrong</b><button type="button" onClick={close} aria-label="Close the report">✕</button></header><p className="sv-why">{res.crash}</p></section>;
const{j,r}=res;const err=j.verdict==="error"||!r;
const crashes=(r?.events||[]).filter(e=>["crashed","failover","writesLost","cold","backlog","hotPart"].includes(e.kind));
return <section className="sv-console" aria-live="polite" aria-label="Report">
<header className={"sv-v "+(err?"bad":r.ok?"good":"bad")}><div><b>{err?"Can't run this design":r.ok?"It held up":"It struggled"}</b><small>{err?(j.first?.error||j.results.find(x=>x.error)?.error||"Something on the canvas stops it from running: see the line above the canvas."):`worst availability ${pct(r.metrics.availability)} · p99 ${fmt(r.metrics.p99)} ms · $${fmt(r.metrics.avgMonthly)}/month`}</small></div>
<span className="sv-vbtns"><button type="button" onClick={close} aria-label="Close the report">✕</button></span></header>
{!err&&<div className="sb-report">
<ul className="sv-opres">{Object.entries(r.ops||{}).map(([id,o])=><li key={id}><b>{P.operations.find(x=>x.id===id)?.name||id}</b> {o.planned?<>{pct(o.availability)} succeed · p50 {fmt(o.p50)} ms · p99 {fmt(o.p99Worst)} ms</>:"can't run"}</li>)}</ul>
<ul className="sv-checks">{r.checks.map((c,k)=><li key={k} className={c.ok?"ok":"no"}><i aria-hidden="true">{c.ok?"✓":"✕"}</i>{c.label}</li>)}</ul>
{r.why?.length>0&&<ul className="sv-why">{r.why.map(x=><li key={x}>{x}</li>)}</ul>}
{crashes.length>0&&<details className="sb-events"><summary>What happened ({crashes.length})</summary><ul>{crashes.slice(0,20).map((e,k)=><li key={k}>Minute {Math.round(e.t)}: {eventWords(e,nameOf)}</li>)}</ul></details>}
{r.cost&&<Bill cost={r.cost} nameOf={nameOf}/>}
<p className="sv-replays"><button type="button" className="sv-watch" onClick={()=>replay(r)}>▶ Replay it on the canvas</button></p>
{j.findings?.length>0&&<Findings f={j.findings} more={j.allFindings}/>}</div>}
</section>}
