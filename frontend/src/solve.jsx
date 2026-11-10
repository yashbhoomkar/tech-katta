// The problem workspace: LeetCode for system design. Every Interview Question (not "Start here") opens
// here from Problems or Interview Questions.
//   Left pane, tabs: Description (requirements, numbers, the example tests) · Your answer (functional and
//   non-functional requirements, estimates, APIs; graded on Submit) · Hints (one at a time, 3 points
//   each) · Solution (the solution design, with Copy to my canvas, then the article) · Submissions (this
//   browser's history).
//   Right: the Lab canvas on the question's own design (Lab `problem`, id q-<slug>), with Run (the
//   example tests) and Submit (every test, plus the written steps, scored out of 100) above it and the
//   results below. The judge is judge/judge.js; the tests and rubric are the article's `practice`.
// Routes: #problems/<slug> opens on Description, #interview-questions/<slug> on Solution, so links,
// Back and the top tabs agree. The divider drags (width in tk-solve-w). Below 900 px one pane at a time,
// with a Canvas tab. Saved in this browser: tk-answers-v1, tk-hints-v1, tk-subs-v1; "solved:<slug>"
// goes into progress (synced with the account). Copy: site.json problems.solve; workspace chrome here.
import React,{Suspense,useEffect,useRef,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import{readArticle}from"./analytics.js";import{markStep,readProgress}from"./progress.js";import{judge,gradeAnswer,score,sameDesign,WEIGHTS}from"./judge/judge.js";import{expected}from"./judge/requests.js";import{read,write,ANSWERS,HINTS,SUBS,SOLUTIONS,readSubs,usedHints}from"./practice.js";import{STORE_KEY,readStore,cleanDesign}from"./lab/store.js";import SolutionDesign from"./SolutionDesign.jsx";import{expected as expected2}from"./eval/trace.js";import{checkLabel}from"./eval/words.js";import{evalCatalogue}from"./eval/design.js";import{submitProblem}from"./account.js";import"./solve.css";

// The question part of an Interview Question: from its "1. …" heading up to its "3. …" heading.
export const statement=body=>{const h=body.map((b,i)=>b.t==="h2"?[i,b.x]:null).filter(Boolean);const a=h.find(([,x])=>/^1\./.test(x)),z=h.find(([,x])=>/^3\./.test(x));
return a?body.slice(a[0],z&&z[0]>a[0]?z[0]:undefined).filter(b=>b.t!=="fig"&&b.t!=="lab"):[]};


const W_KEY="tk-solve-w",MIN=320;
const savedW=()=>{let w=0;try{w=Number(localStorage.getItem(W_KEY))}catch{}return w>=MIN?w:460};
// the canvas keeps at least 880 px (its toolbar and panels need it) beside the folded sidebar
const maxW=()=>Math.max(MIN,Math.min(Math.round(innerWidth*.6),innerWidth-56-880));
const narrowQ="(max-width:900px)";
const fmt=n=>Math.round(n).toLocaleString("en-US");
const pct=n=>(n>=99.99?n.toFixed(3):n>=99?n.toFixed(2):n.toFixed(1)).replace(/\.?0+$/,"")+"%";
const when=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const STEPS={requirements:"Requirements",estimates:"Estimates",api:"API",design:"Design",deep:"Deep dive"};

export default function Solve({slug,tab,s,articles,Block,Article,prep,Lab}){
const[st,set]=useState({}),[hide,setHide]=useState(false),[w,setW]=useState(savedW),[canvas,setCanvas]=useState(false);
const[view,setView]=useState(tab==="a"?"solution":"description");
const[narrow,setNarrow]=useState(()=>typeof matchMedia!=="undefined"&&matchMedia(narrowQ).matches);const pane=useRef(null);
const[lab,setLab]=useState(null),design=useRef(null),[res,setRes]=useState(null),[busy,setBusy]=useState(false);
const[gen,setGen]=useState(0),[pending,setPending]=useState(null),[sol,setSol]=useState(null),[undo,setUndo]=useState(null),[clock,setClock]=useState({on:false,acc:0,at:0}),[,tick]=useState(0);
const[ans,setAns]=useState(()=>read(ANSWERS)[slug]||{}),[graded,setGraded]=useState(null),[hints,setHints]=useState(()=>usedHints(slug)),[subs,setSubs]=useState(()=>readSubs(slug));
useEffect(()=>{if(typeof matchMedia==="undefined")return;const m=matchMedia(narrowQ),f=()=>setNarrow(m.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);
useEffect(()=>{const f=()=>setW(v=>Math.min(v,maxW()));f();addEventListener("resize",f);return()=>removeEventListener("resize",f)},[]);
// a late answer for a problem the visitor has already left is dropped (cur): its starting design would otherwise open on this one
const cur=useRef(slug);cur.current=slug;const load=()=>{const want=slug;set({});getJSON(`/v1/articles/${want}`).then(prep).then(a=>{if(cur.current===want)set({a})},e=>{if(cur.current===want)set({err:e.status===404?"missing":e.figs?"figs":"failed"})})};useEffect(load,[slug]);
useEffect(()=>{getJSON("/v1/lab").then(setLab,()=>{})},[]);
const[watch,setWatch]=useState(null);useEffect(()=>setWatch(null),[res,slug,gen]);const[rep,setRep]=useState(null);useEffect(()=>setRep(null),[res,slug,gen]);
useEffect(()=>{setAns(read(ANSWERS)[slug]||{});setGraded(null);setRes(null);setHints(usedHints(slug));setSubs(readSubs(slug))},[slug]);
useEffect(()=>{setView(tab==="a"?"solution":"description")},[tab,slug]);
useEffect(()=>{if(view==="solution")return readArticle("interview-questions",slug)},[view,slug]);
// The solution design: fetched when the Solution tab opens, or when it was copied here before (to tell a
// copied design from the visitor's own on Submit).
useEffect(()=>{setSol(null);setUndo(null);setPending(null)},[slug]);
useEffect(()=>{if(sol?.slug===slug||!(view==="solution"||read(SOLUTIONS)[slug]))return;let on=true;getJSON(`/v1/articles/${slug}/solution`).then(v=>{if(on)setSol(v)},()=>{});return()=>{on=false}},[view,slug,sol]);
useEffect(()=>{setCanvas(false);if(pane.current)pane.current.scrollTop=0},[view,slug]);
useEffect(()=>{try{localStorage.setItem(W_KEY,String(w))}catch{}},[w]);
// Reset, Copy to my canvas and Undo put another design on the canvas: a fresh Lab opens and loads it
// into this problem's design (Lab problem.load); until that Lab has opened, Run and Submit judge it.
const put=(d,credit)=>{design.current=null;setRes(null);setWatch(null);setPending({nodes:structuredClone(d.nodes),edges:structuredClone(d.edges),...(credit?{credit}:{})});setGen(g=>g+1)};
// A stopwatch, like an interview's clock: start, pause, carry on.
useEffect(()=>{if(!clock.on)return;const t=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(t)},[clock.on]);
useEffect(()=>{setClock({on:false,acc:0,at:0})},[slug]);
const saveAns=v=>{setAns(v);const all=read(ANSWERS);all[slug]={...v,updated:Date.now()};write(ANSWERS,all)};
const openHint=()=>{const n=hints+1;setHints(n);const all=read(HINTS);all[slug]=n;write(HINTS,all)};
const qs=articles.filter(x=>x.section==="interview-questions"&&x.group!=="start"),i=qs.findIndex(x=>x.slug===slug),next=qs[i+1],prev=i>0?qs[i-1]:null;
const secs=Math.floor((clock.acc+(clock.on?Date.now()-clock.at:0))/1000),mmss=`${String(Math.floor(secs/60)).padStart(2,"0")}:${String(secs%60).padStart(2,"0")}`;
const toggleClock=()=>setClock(c=>c.on?{on:false,acc:c.acc+Date.now()-c.at,at:0}:{...c,on:true,at:Date.now()});
const reset=()=>{if(typeof confirm==="function"&&!confirm("Put the canvas back to the starting design? Your current design is replaced."))return;setUndo(null);put(P.start,{spent:0,hours:0})};
const mine=()=>{const d=pending||design.current||savedDesign()||P.start;return{nodes:d.nodes,edges:d.edges}};
const copySolution=()=>{if(!sol)return;setUndo(mine());put(sol);const all=read(SOLUTIONS);all[slug]=Date.now();write(SOLUTIONS,all);if(narrow)setCanvas(true)};
const undoCopy=()=>{if(!undo)return;put(undo);setUndo(null)};
const drag=e=>{e.preventDefault();const x0=e.clientX,w0=w;const mv=ev=>setW(Math.min(maxW(),Math.max(MIN,w0+ev.clientX-x0)));const up=()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up)};addEventListener("pointermove",mv);addEventListener("pointerup",up)};
const key=e=>{const d=e.key==="ArrowLeft"?-24:e.key==="ArrowRight"?24:0;if(d){e.preventDefault();setW(v=>Math.min(maxW(),Math.max(MIN,v+d)))}};
if(st.err)return <section className="d-panel">{st.err==="missing"?<p className="d-desc">{s.missing} <a href="#problems">{s.back}</a></p>:<LoadError what="this problem" retry={st.err==="figs"?()=>location.reload():load}/>}</section>;
if(!st.a)return <section className="d-panel"><Loading label={qs[i]?.title}/></section>;
const a=st.a,P=a.practice,body=statement(a.body),ch=a.body.find(b=>b.t==="lab"&&/^problems\/challenge\/./.test(b.to));const showLab=!narrow||canvas;
// Run: the example tests. Submit: every test, the written steps, a score, a saved submission.
// The design to judge: what the canvas holds now, or (before the canvas has loaded, e.g. on a phone that
// hasn't opened the Canvas tab) the design saved for this problem; only without either, the start.
const savedDesign=()=>{try{const st=readStore(localStorage.getItem(STORE_KEY),lab),x=st.designs["q-"+slug]||Object.values(st.designs).find(v=>v.problem===slug);return x?{nodes:x.nodes,edges:x.edges}:null}catch{return null}};
const go=kind=>{if(!P||!lab||busy)return;if(narrow)setCanvas(true);setBusy(true);setRes(null);
setTimeout(()=>{const d=pending||design.current||savedDesign()||P.start;let out;try{const j=judge(d,lab,P,{sample:kind==="run"});out={kind,j};
if(kind==="submit"){const g=gradeAnswer(ans,P.rubric),sc=score(g,j,hints);out.g=g;out.sc=sc;setGraded(g);
// the solution's design copied and submitted unchanged: kept, but not counted as solved or as a best score
const copied=!!(sol&&read(SOLUTIONS)[slug]&&sameDesign(cleanDesign(d,lab,"mine"),cleanDesign(sol,lab,"solution")));out.copied=copied;
const sub={at:Date.now(),verdict:j.verdict,passed:j.passed,total:j.total,score:sc.total,cost:j.metrics?.avgMonthly??null,p99:j.metrics?.p99??null,hints,...(copied?{copied:true}:{})};
const all=read(SUBS);all[slug]=[sub,...readSubs(slug)].slice(0,30);write(SUBS,all);setSubs(all[slug]);
markStep("practice:"+slug);if(j.verdict==="accepted"&&!copied)markStep("solved:"+slug);
// signed in: the API judges it again and says how it compares with everyone else's
out.server="pending";submitProblem({slug,design:d,answer:ans,hints}).then(v=>setRes(r=>r&&r.j===j?{...r,server:v||"off"}:r))}}
catch(e){out={kind,crash:String(e?.message||e)}}setRes(out);setBusy(false)},30)};
const tabs=[["description","Description",`#problems/${slug}`],["answer","Your answer"],["hints",`Hints${P?` (${P.hints.length})`:""}`],["solution",s.tabA,`#interview-questions/${slug}`],["subs",`Submissions${subs.length?` (${subs.length})`:""}`]];
return <div className={"solve"+(hide&&!narrow?" hide":"")+(narrow&&canvas?" v-canvas":"")} style={{"--qw":w+"px"}}>
<div className="sv-tabs" role="tablist" aria-label={a.title}>{tabs.map(([id,t,href])=>href?<a key={id} role="tab" href={href} aria-selected={!canvas&&view===id} className={!canvas&&view===id?"on":""} onClick={()=>{setCanvas(false);setView(id)}}>{t}</a>:<button key={id} type="button" role="tab" aria-selected={!canvas&&view===id} className={!canvas&&view===id?"on":""} onClick={()=>{setCanvas(false);setView(id)}}>{t}</button>)}
{narrow&&<button type="button" role="tab" aria-selected={canvas} className={canvas?"on":""} onClick={()=>setCanvas(true)}>{s.tabCanvas}</button>}</div>
<section ref={pane} className="sv-q" aria-label={tabs.find(t=>t[0]===view)?.[1]} hidden={(hide&&!narrow)||(narrow&&canvas)}>
{view==="solution"?<>{P&&<SolutionDesign sol={sol?.slug===slug?sol:null} note={P.referenceNote} lab={lab} copy={copySolution} copied={!!undo} undo={undo?undoCopy:null} busy={busy}/>}<Article a={a} pane/></>
:view==="answer"?<Answer P={P} ans={ans} save={saveAns} g={graded}/>
:view==="hints"?<Hints P={P} used={hints} open={openHint}/>
:view==="subs"?<Subs subs={subs}/>
:<>
<nav className="crumbs" aria-label="Breadcrumb"><a href="#problems">{s.back}</a><span aria-hidden="true">/</span><span>{a.no.replace(/^QUESTION\s*\/\/\s*/,"Q")}</span></nav>
<label>{s.eyebrow} · {a.tag}{readProgress().steps["solved:"+slug]&&<span className="sv-solved"> · ✓ {s.solved||"Solved"}</span>}</label><h1 id="sv-title">{a.title}</h1><p className="sv-dek">{a.dek}</p>
<p className="sv-how">{P?.v===2&&s.howV2?s.howV2:s.how}</p>
<div className="sv-body">{body.map((b,k)=><Block key={k} b={b} i={k}/>)}</div>
{P?.v===2&&<Ops P={P}/>}{P&&<section className="sv-tests" aria-labelledby="sv-ex"><h2 id="sv-ex">Example tests</h2><p className="sv-brief">{P.brief}</p>
{P.tests.filter(t=>t.sample).map((t,k)=><div key={t.id} className="sv-test"><b>Example {k+1}: {t.name}</b><p>{t.desc}</p>{P.v===2&&t.op?(()=>{const o=P.operations.find(x=>x.id===t.op);return o&&<div className="sv-io"><Json label="Request" v={reqOf(o)}/><Json label="Expected response" v={expected2(P,o)}/></div>})():t.request?<div className="sv-io"><Json label="Request" v={reqOf(t)}/><Json label="Expected response" v={expected(P,t)}/></div>:<ul>{t.checks.map((c,ci)=><li key={ci}>{c.label||checkLabel(c,P,lab?evalCatalogue(lab):{})}</li>)}</ul>}</div>)}
<p className="sv-more">{P.tests.filter(t=>!t.sample).length} more tests run when you submit: {P.tests.some(t=>(t.request||t.op)&&!t.sample)?"more API calls, ":""}spikes, failures and the bill.</p></section>}
<div className="sv-links">
{ch&&<a href={`#${ch.to}`}>{s.scored} →</a>}
{next&&<a href={`#problems/${next.slug}`}><small>{s.next}</small> {next.title} →</a>}</div></>}
</section>
{!narrow&&!hide&&<div className="sv-split" role="separator" aria-orientation="vertical" aria-label={s.resize} aria-valuemin={MIN} aria-valuemax={maxW()} aria-valuenow={w} tabIndex={0} onPointerDown={drag} onKeyDown={key}/>}
<div className="sv-lab">
<div className="sv-bar">{!narrow&&<button type="button" className="sv-toggle" aria-expanded={!hide} onClick={()=>setHide(h=>!h)}>{hide?s.show:s.hide}</button>}
<span className="sv-nav">{prev?<a href={`#problems/${prev.slug}`} title={`Previous: ${prev.title}`} aria-label={`Previous problem: ${prev.title}`}>‹</a>:<span aria-hidden="true">‹</span>}{next?<a href={`#problems/${next.slug}`} title={`Next: ${next.title}`} aria-label={`Next problem: ${next.title}`}>›</a>:<span aria-hidden="true">›</span>}</span>
<span className="sv-gap"/><button type="button" className={"sv-clock"+(clock.on?" on":"")} onClick={toggleClock} aria-label={clock.on?"Pause the timer":"Start the timer"} title={clock.on?"Pause":"Start a timer"}>⏱ {secs||clock.on?mmss:"Timer"}</button>{P&&<button type="button" className="sv-reset" onClick={reset}>Reset</button>}{P&&<><button type="button" className="sv-run" disabled={!lab||busy} onClick={()=>go("run")}>▶ Run</button><button type="button" className="sv-submit" disabled={!lab||busy} onClick={()=>go("submit")}>Submit</button></>}</div>
{showLab&&<Suspense fallback={<Loading label="Loading the canvas"/>}><Lab key={slug+":"+gen} problem={{id:slug,name:a.title,start:P?.start,fields:P?.v===2?fieldsOf(P):P?.data?.fields,v:P?.v,locked:P?.v===2?P.locked:undefined,ops:P?.v===2?P.operations.map(o=>({id:o.id,name:o.name})):undefined,load:pending,onLoaded:()=>setPending(null)}} onDesign={d=>{design.current=d}} trace={watch?watch.hops[watch.i]:null} replay={rep?replayAt(rep,P):null}/></Suspense>}
{watch?<Player w={watch} set={setWatch}/>:rep?<ReplayBar rep={rep} set={setRep} P={P} nameOf={id=>{const d=pending||design.current||P?.start;const n=d?.nodes?.find(x=>x.id===id);return n?.name||lab?.components?.find(c=>c.type===n?.type)?.name||id}}/>:(busy||res)&&<Console P={P} nameOf={id=>{const d=pending||design.current||P?.start;const n=d?.nodes?.find(x=>x.id===id);return n?.name||lab?.components?.find(c=>c.type===n?.type)?.name||id}} busy={busy} res={res} close={()=>setRes(null)} replay={r=>{if(narrow)setCanvas(true);setRep({r,i:0,play:false})}} watch={r=>{if(narrow)setCanvas(true);setWatch({r,hops:r.trace,i:0,play:true})}} hint={()=>{setCanvas(false);setHide(false);setView("hints")}} answer={()=>{setCanvas(false);setHide(false);setView("answer")}}/>}
</div>
</div>}

// ---- Request tests: JSON in and out, and the request travelling through the design ----
const reqOf=t=>({method:t.request.method,path:t.request.path,...(t.request.body?{body:t.request.body}:{})});
function Json({label,v,bad}){return <figure className={"sv-json"+(bad?" bad":"")}><figcaption>{label}</figcaption><pre>{typeof v==="string"?v:JSON.stringify(v,null,2)}</pre></figure>}
function Player({w,set}){const{hops,i,play,r}=w,h=hops[i],last=i===hops.length-1;
useEffect(()=>{if(!play)return;if(last){set(x=>({...x,play:false}));return}const t=setTimeout(()=>set(x=>x&&{...x,i:Math.min(x.i+1,x.hops.length-1)}),1300);return()=>clearTimeout(t)},[play,i,last]);// eslint-disable-line
useEffect(()=>{const k=e=>{if(e.key==="Escape")set(null);else if(e.key==="ArrowRight")set(x=>({...x,play:false,i:Math.min(x.i+1,x.hops.length-1)}));else if(e.key==="ArrowLeft")set(x=>({...x,play:false,i:Math.max(x.i-1,0)}))};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[set]);
return <section className="sv-console sv-player" aria-label="The request travelling through your design">
<header className={"sv-v "+(r.ok?"good":"bad")}><div><b>{(r.request||r.test.request).method} {(r.request||r.test.request).path}</b><small>Step {i+1} of {hops.length} · {r.ok?"the design answers as expected":"the design doesn't answer as expected"}</small></div>
<span className="sv-vbtns"><button type="button" onClick={()=>set(x=>({...x,play:false,i:Math.max(0,x.i-1)}))} disabled={i===0} aria-label="Previous step">‹</button><button type="button" onClick={()=>set(x=>({...x,play:!x.play,i:last?0:x.i}))} aria-label={play?"Pause":"Play"}>{play?"❚❚":"▶"}</button><button type="button" onClick={()=>set(x=>({...x,play:false,i:Math.min(x.hops.length-1,x.i+1)}))} disabled={last} aria-label="Next step">›</button><button type="button" onClick={()=>set(null)} aria-label="Close">✕</button></span></header>
<div className="sv-trace"><ol>{hops.map((x,k)=><li key={k} className={k===i?"on":k<i?"done":""}><button type="button" onClick={()=>set(y=>({...y,play:false,i:k}))}>{x.title}</button></li>)}</ol>
<div className="sv-hop" aria-live="polite"><b>{h.title}</b>{h.json!=null?<pre>{typeof h.json==="string"?h.json:JSON.stringify(h.json,null,2)}</pre>:<p className="sv-tdesc">{last?"":"Passing it along…"}</p>}{last&&!r.ok&&r.why?.[0]&&<p className="sv-whyline">{r.why[0]}</p>}</div></div></section>}

// ---- Results under the canvas ----
function Console({busy,res,close,hint,answer,watch,replay,P,nameOf}){const[min,setMin]=useState(false);useEffect(()=>setMin(false),[res?.j]);
if(busy)return <section className="sv-console" aria-live="polite"><p className="sv-running">Running the tests…</p></section>;
const{kind,j,g,sc,crash}=res;
if(crash)return <section className="sv-console" aria-live="polite"><header className="sv-v bad"><b>Something went wrong</b><button type="button" onClick={close} aria-label="Close results">✕</button></header><p className="sv-why">{crash}</p></section>;
const acc=j.verdict==="accepted",err=j.verdict==="error";
return <section className={"sv-console"+(min?" min":"")} aria-live="polite" aria-label="Test results">
<header className={"sv-v "+(acc?"good":"bad")}><div><b>{err?"Can't run the tests":acc?(kind==="run"?"Example tests passed":"Accepted"):"Wrong design"}</b>
<small>{err?j.first?.error:`${j.passed} / ${j.total} ${kind==="run"?"example ":""}tests passed`}{j.metrics&&!err?` · worst availability ${pct(j.metrics.availability)} · p99 ${fmt(j.metrics.p99)} ms · up to $${fmt(j.metrics.avgMonthly)}/month`:""}</small></div>
<span className="sv-vbtns"><button type="button" onClick={()=>setMin(m=>!m)} aria-expanded={!min} aria-label={min?"Show the results":"Make the results smaller"}>{min?"▴":"▾"}</button><button type="button" onClick={close} aria-label="Close results">✕</button></span></header>
{!min&&<>{sc&&<div className="sv-score"><b>{sc.total}<small>/100</small></b><ul>
<li>Requirements <span>{Math.round(sc.parts.fr+sc.parts.nfr)}/{WEIGHTS.fr+WEIGHTS.nfr}</span></li><li>Estimates <span>{Math.round(sc.parts.est)}/{WEIGHTS.est}</span></li>
<li>API <span>{Math.round(sc.parts.api)}/{WEIGHTS.api}</span></li><li>Key decisions <span>{Math.round(sc.parts.dec||0)}/{WEIGHTS.dec}</span></li><li>Design tests <span>{Math.round(sc.parts.design)}/{WEIGHTS.design}</span></li>{sc.penalty>0&&<li>Hints <span>−{sc.penalty}</span></li>}</ul>
{g&&(g.parts.fr<1||g.parts.est<1||g.parts.api<1||g.parts.nfr<1||g.parts.dec<1)&&<button type="button" className="sv-linkbtn" onClick={answer}>See what your answer missed →</button>}</div>}
{res.copied&&<p className="sv-copied">This is the solution's design, copied unchanged, so it isn't counted as solved and doesn't set a best score. Change it, or build your own, and submit again.</p>}
{res.server&&<p className="sv-server">{res.server==="pending"?"Checking on our server…":res.server==="off"?"Sign in to have your submission checked and compared with everyone else's.":<>✓ Checked on our server{res.server.verdict!==j.verdict?` (it says: ${res.server.verdict})`:""} · {res.server.accepted} of {res.server.submissions} submissions accepted ({Math.round(100*res.server.accepted/Math.max(1,res.server.submissions))}%){res.server.cheaperThan!=null&&res.server.verdict==="accepted"?<> · <b>cheaper than {res.server.cheaperThan}% of accepted designs</b></>:""}</>}</p>}
{!err&&<ol className="sv-results">{j.results.map((r,k)=><li key={r.id} className={r.ok?"ok":"no"}><details open={!r.ok&&r===j.first}><summary><i aria-hidden="true">{r.ok?"✓":"✕"}</i><span>Test {k+1}: {r.test.name}</span><small>{r.metrics?`${pct(r.metrics.availability)} · p99 ${fmt(r.metrics.p99)} ms · $${fmt(r.metrics.avgMonthly)}/mo`:(r.request||r.test.request)&&r.output?`${(r.request||r.test.request).method} ${(r.request||r.test.request).path} → ${r.output.status}${r.ok?"":` (expected ${r.expect.status})`}`:r.error}</small></summary>
<p className="sv-tdesc">{r.test.desc}</p>{r.why?.length>0&&<ul className="sv-why">{r.why.map(x=><li key={x}>{x}</li>)}</ul>}
{(r.request||r.test.request)&&<><div className="sv-io"><Json label="Request" v={r.request||reqOf(r.test)}/><Json label="Expected" v={r.expect}/>{r.output&&<Json label="Your design's response" v={r.output} bad={!r.ok}/>}</div>{r.trace?.length>1&&<button type="button" className="sv-watch" onClick={()=>watch(r)}>▶ Watch the request travel</button>}</>}
<ul className="sv-checks">{r.checks.map((c,ci)=><li key={ci} className={c.ok?"ok":"no"}><i aria-hidden="true">{c.ok?"✓":"✕"}</i>{c.label}</li>)}</ul>
{r.ops&&<ul className="sv-opres">{Object.entries(r.ops).map(([id,o])=><li key={id}><b>{P?.operations?.find(x=>x.id===id)?.name||id}</b> {o.planned?<>{pct(o.availability)} · p50 {fmt(o.p50)} ms · p99 {fmt(o.p99Worst)} ms{Object.entries(o.deferred||{}).map(([sid,d])=><span key={sid}> · done later within {fmt(d.worstDelaySec)} s{d.notDone>0?`, ${fmt(d.notDone)} left`:""}</span>)}</>:"can't run"}</li>)}</ul>}
{r.timeline&&<button type="button" className="sv-watch" onClick={()=>replay(r)}>▶ Replay this test</button>}</details></li>)}</ol>}
{!err&&j.findings?.length>0&&<Findings f={j.findings} more={j.allFindings}/>}{!err&&j.plans&&Object.keys(j.plans).length>0&&<HowRead plans={j.plans} P={P} nameOf={nameOf}/>}
{!acc&&!err&&<p className="sv-nudge">Stuck? <button type="button" className="sv-linkbtn" onClick={hint}>Open a hint</button> (3 points each).</p>}</>}
</section>}

// ---- Your answer: the written steps of an interview, graded on Submit ----
const NFR=[["availability","Availability target","%","99.9"],["p99","p99 latency target","ms","200"],["readsPerWrite","Reads for every write","×","100"]];
function Answer({P,ans,save,g}){
if(!P)return <p className="d-desc">This problem has no graded answer yet.</p>;
const r=P.rubric,set=(k,v)=>save({...ans,[k]:v}),setIn=(k,id,v)=>save({...ans,[k]:{...(ans[k]||{}),[id]:v}});
const api=Array.isArray(ans.api)&&ans.api.length?ans.api:[{method:"GET",path:""}];
const setApi=(i,k,v)=>set("api",api.map((x,j)=>j===i?{...x,[k]:v}:x));
const mark=x=>g?<i className={"sv-mk "+(x?"ok":"no")} aria-label={x?"correct":"not yet"}>{x?"✓":"✕"}</i>:null;
const nf=id=>g?.nfr.find(x=>x.id===id);
return <div className="sv-ans">
<p className="sv-brief">Write it the way you would in the interview, then press Submit: the steps below are checked along with your design. {g?"Marks show your last submission.":""}</p>
<section><h2>1. Functional requirements</h2><p className="sv-help">What the system must do, one per line.</p>
<textarea rows={6} value={ans.fr||""} onChange={e=>set("fr",e.target.value)} aria-label="Functional requirements" placeholder={"Users can …\nAnyone who …"}/>
{g&&<ul className="sv-grade">{g.fr.map(x=><li key={x.label} className={x.ok?"ok":"no"}>{mark(x.ok)}{x.label}</li>)}</ul>}</section>
<section><h2>2. Non-functional requirements</h2><div className="sv-grid">
{NFR.filter(([id])=>r.nfr?.[id]!==undefined).map(([id,label,unit,ph])=><label key={id} className="sv-field"><span>{label}</span><span className="sv-in"><input inputMode="decimal" value={ans.nfr?.[id]??""} onChange={e=>setIn("nfr",id,e.target.value)} placeholder={ph}/><em>{unit}</em>{nf(id)&&mark(nf(id).ok)}</span>{g&&nf(id)&&!nf(id).ok&&<small>Aim for {fmt(r.nfr[id][0])}–{fmt(r.nfr[id][1])} {unit}</small>}</label>)}
{r.nfr?.consistency&&<label className="sv-field"><span>Consistency for reads</span><span className="sv-in"><select value={ans.nfr?.consistency||""} onChange={e=>setIn("nfr","consistency",e.target.value)}><option value="">Choose…</option><option value="strong">Strong: always the latest</option><option value="eventual">Eventual: a little stale is fine</option></select>{nf("consistency")&&mark(nf("consistency").ok)}</span>{g&&nf("consistency")&&!nf("consistency").ok&&<small>Think about what a reader can live with here.</small>}</label>}
</div></section>
<section><h2>3. Estimates</h2><p className="sv-help">Rough numbers are fine: within about 3× counts.</p><div className="sv-grid">
{r.est.map(x=>{const e=g?.est.find(y=>y.id===x.id);return <label key={x.id} className="sv-field"><span>{x.label}</span><span className="sv-in"><input inputMode="decimal" value={ans.est?.[x.id]??""} onChange={e2=>setIn("est",x.id,e2.target.value)} placeholder="0"/><em>{x.unit}</em>{e&&mark(e.ok)}</span>{e&&!e.ok&&<small>About {fmt(x.answer)} {x.unit}{x.how?`: ${x.how}`:""}</small>}</label>})}
</div></section>
<section><h2>4. API</h2><p className="sv-help">The calls clients make: method and path.</p>
<div className="sv-api">{api.map((x,i)=><div key={i} className="sv-row"><select value={x.method} onChange={e=>setApi(i,"method",e.target.value)} aria-label={`Method ${i+1}`}>{["GET","POST","PUT","PATCH","DELETE"].map(m=><option key={m}>{m}</option>)}</select><input value={x.path} onChange={e=>setApi(i,"path",e.target.value)} placeholder="/v1/…" aria-label={`Path ${i+1}`}/><button type="button" onClick={()=>set("api",api.filter((_,j)=>j!==i))} aria-label={`Remove call ${i+1}`}>✕</button></div>)}
<button type="button" className="sv-add" onClick={()=>set("api",[...api,{method:"POST",path:""}])}>+ Add a call</button></div>
{g&&<ul className="sv-grade">{g.api.map(x=><li key={x.label} className={x.ok?"ok":"no"}>{mark(x.ok)}{x.label} <code>{x.ok?x.got:x.method}</code></li>)}</ul>}</section>
{r.decisions?.length>0&&<section><h2>5. Key decisions</h2><p className="sv-help">The choices this design turns on. Pick one answer for each; Submit explains the right one.</p>
{r.decisions.map((x,qi)=>{const d=g?.dec?.find(y=>y.id===x.id),pick=ans.decisions?.[x.id];return <fieldset key={x.id} className="sv-dec"><legend>{d&&mark(d.ok)}{qi+1}. {x.q}</legend>
{x.options.map((o,i)=><label key={i} className={d?(i===x.answer?"right":i===d.chosen?"wrong":""):""}><input type="radio" name={"dec-"+x.id} checked={pick===i} onChange={()=>setIn("decisions",x.id,i)}/><span>{o}</span></label>)}
{d&&<p className="sv-why">{d.ok?"Right: ":"The better choice: "+x.options[x.answer]+". "}{x.why}</p>}</fieldset>})}</section>}
<section><h2>{r.decisions?.length?6:5}. Design</h2><p className="sv-help">Build it on the canvas, then Run the example tests. Submit runs every test.{P.v===2?" Give each database the tables the calls need, in its schema.":" Give each part its job under \"What it does\" in its settings."}</p></section>
</div>}

function Hints({P,used,open}){
if(!P)return <p className="d-desc">No hints for this problem yet.</p>;
return <div className="sv-hints"><p className="sv-brief">Each hint you open takes 3 points off your score (at most 15). They go from a nudge to nearly the answer.</p>
<ol>{P.hints.map((h,i)=><li key={i} className={i<used?"open":""}><small>{STEPS[h.step]||h.step}</small>{i<used?<p>{h.x}</p>:i===used?<button type="button" onClick={open}>Show hint {i+1}</button>:<p className="sv-locked">Hint {i+1}</p>}</li>)}</ol></div>}

function Subs({subs}){
if(!subs.length)return <p className="sv-brief">No submissions yet. Build your design, then press Submit.</p>;
return <table className="sv-subs"><thead><tr><th>When</th><th>Result</th><th>Tests</th><th>Score</th></tr></thead><tbody>
{subs.map(x=><tr key={x.at}><td>{when(x.at)}</td><td className={x.verdict==="accepted"?"ok":"no"}>{x.verdict==="accepted"?"Accepted":x.verdict==="error"?"Can't run":"Wrong design"}{x.copied&&<small className="sv-cp"> · copied solution</small>}</td><td>{x.passed}/{x.total}</td><td>{x.score}</td></tr>)}
</tbody></table>}

// ---- v2 problems (tech-katta-context/evaluator.md §12.1): what the system must do, findings, how the design was
// read, and a test replayed on the canvas ----
const fieldsOf=P=>[...new Set(Object.values(P.entities||{}).flatMap(e=>Object.keys(e.fields||{})))];
const clockOf=m=>{const x=((Math.round(m)%1440)+1440)%1440,h=Math.floor(x/60);return `${h%12||12}:${String(x%60).padStart(2,"0")} ${h<12?"am":"pm"}`};
const targetsOf=o=>[o.slo?.availability!==undefined?`${o.slo.availability}%`:null,o.slo?.p99Ms?`p99 ${fmt(o.slo.p99Ms)} ms`:null,o.consistency==="strong"?"always fresh":o.consistency?.maxStalenessSec?`at most ${fmt(o.consistency.maxStalenessSec)} s old`:null,o.durable?"never lost":null,o.effect==="once"?"never twice":null].filter(Boolean).join(" · ")||"—";
function Ops({P}){return <section className="sv-tests" aria-labelledby="sv-ops"><h2 id="sv-ops">What the system must do</h2>
<div className="sv-tablewrap"><table className="sv-subs sv-optable"><thead><tr><th>Call</th><th>Request</th><th>Share</th><th>Targets</th></tr></thead><tbody>
{P.operations.map(o=><tr key={o.id}><td>{o.name}</td><td><code>{o.request.method} {o.request.path}</code></td><td>{!o.source||o.source==="clients"?pct(o.share*100):"—"}</td><td>{targetsOf(o)}</td></tr>)}</tbody></table></div></section>}
function Findings({f,more}){return <section className="sv-findings" aria-label="Findings"><h3>Findings</h3><ol>{f.map((x,k)=><li key={k} className={x.severity}><details><summary><b>{x.severity==="fail"?"Problem":x.severity==="warn"?"Warning":"Note"}</b> {x.title}</summary><p>{x.story}</p>{x.fix&&<p className="sv-fix">Try: {x.fix}</p>}</details></li>)}</ol>{more>f.length&&<p className="sv-tdesc">{more-f.length} more not shown.</p>}</section>}
const HOW={key:"by its key",index:"through an index",scan:"by reading the whole table","key-range":"in key order","index-range":"in index order",geo:"near a point",text:"by words",agg:"adding up rows",zset:"from a sorted set",write:"writes",blob:"a file",transaction:"in one transaction"};
function HowRead({plans,P,nameOf}){return <details className="sv-read"><summary>How your design was read</summary>{Object.entries(plans).map(([id,p])=><div key={id}><b>{P?.operations?.find(o=>o.id===id)?.name||id}</b>{!p.ok?<p className="sv-whyline">{p.error?.message}</p>:<ol className="sv-hops">{p.hops.filter(h=>h.kind!=="source").map((h,k)=>{const st=h.step?p.steps[h.step]:null;return <li key={k} style={{marginLeft:(h.depth-1)*14}}>{h.share==="miss"?"on a miss: ":h.share==="cdnMiss"?"not cached at the edge: ":""}{!h.sync?"after answering: ":""}{nameOf(h.node)}{h.kind==="store"&&st?h.copy?" (keeps a copy)":` · ${HOW[st.how]||st.how} on ${st.table}`:h.kind==="cache"?" (look-aside cache)":h.kind==="invalidate"?" (drops the old copy)":h.kind==="enqueue"?" (holds the message)":""}</li>})}</ol>}</div>)}</details>}
// the canvas's view of a replayed test at tick i
function replayAt(rep,P){const{r,i}=rep,tl=r.timeline,nodes={};for(const[id,n]of Object.entries(tl.nodes))nodes[id]={rho:n.rho[i]??0,up:n.up[i]??1,inst:n.instances[i]??0,backlog:n.backlog[i]??0};
const ops=Object.entries(tl.ops).map(([id,o])=>`${P?.operations?.find(x=>x.id===id)?.name||id} ${fmt(o.rate[i]??0)}/s, ${pct(100*(o.ok[i]??1))} ok`).join(" · ");
return{nodes,status:`${clockOf((r.test.startHour||0)*60+i*tl.tickMinutes)} · ${ops}`}}
function ReplayBar({rep,set,P,nameOf}){const{r,i,play}=rep,tl=r.timeline,n=Object.values(tl.ops)[0]?.rate.length||1,last=i>=n-1;
useEffect(()=>{if(!play)return;if(last){set(x=>x&&{...x,play:false});return}const t=setTimeout(()=>set(x=>x&&{...x,i:Math.min(x.i+1,n-1)}),180);return()=>clearTimeout(t)},[play,i,last]);// eslint-disable-line
useEffect(()=>{const k=e=>{if(e.key==="Escape")set(null)};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[set]);
const t0=i*tl.tickMinutes,ev=(r.events||[]).filter(e=>e.t<=t0&&e.t>t0-tl.tickMinutes*3).slice(-3);
return <section className="sv-console sv-player" aria-label={`Replay of ${r.test.name}`}>
<header className={"sv-v "+(r.ok?"good":"bad")}><div><b>▶ Replay: {r.test.name}</b><small>{clockOf((r.test.startHour||0)*60+t0)} · minute {t0} of {fmt(r.test.hours*60)}</small></div>
<span className="sv-vbtns"><button type="button" onClick={()=>set(x=>({...x,play:!x.play,i:last?0:x.i}))} aria-label={play?"Pause":"Play"}>{play?"❚❚":"▶"}</button><button type="button" onClick={()=>set(null)} aria-label="Close the replay">✕</button></span></header>
<input type="range" className="sv-scrub" min={0} max={n-1} value={i} onChange={e=>set(x=>({...x,play:false,i:+e.target.value}))} aria-label="Minute of the test"/>
<ul className="sv-opres">{Object.entries(tl.ops).map(([id,o])=><li key={id}><b>{P?.operations?.find(x=>x.id===id)?.name||id}</b> {fmt(o.rate[i]??0)} calls/s · {pct(100*(o.ok[i]??1))} succeed · p99 {fmt(o.p99[i]??0)} ms</li>)}</ul>
{ev.length>0&&<ul className="sv-why">{ev.map((e,k)=><li key={k}>{eventWords(e,nameOf)}</li>)}</ul>}</section>}
const EVENT={crashed:"crashed",failover:"failed over to its standby",recovered:"is back",cold:"came back empty: its misses go to the database",warm:"is warm again",scaledOut:"started more instances",scaledIn:"stopped some instances",backlog:"began to fill: messages arrive faster than they are taken",drained:"has caught up",writesLost:"lost writes it had not saved"};
const eventWords=(e,nameOf)=>e.kind==="zoneDown"?"A zone went dark.":e.kind==="zoneBack"?"The zone is back.":`${nameOf?nameOf(e.node):e.node} ${EVENT[e.kind]||e.kind}${e.n&&e.kind!=="cold"?` (${fmt(e.n)})`:""}.`;
