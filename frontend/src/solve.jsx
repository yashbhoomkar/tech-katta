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
// Its parts: solve/console.jsx (results under the canvas), solve/player.jsx (a request travelling through the design),
// solve/answer.jsx (Your answer), solve/panes.jsx (Hints, Submissions), solve/v2.jsx (calls table, findings, replay).
import React,{Suspense,useEffect,useRef,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import{readArticle,track}from"./analytics.js";import{diffDesigns,compareSubs,testSummary}from"./solve/compare.js";import{markStep,readProgress}from"./progress.js";import{judge,gradeAnswer,score,sameDesign}from"./judge/judge.js";import{read,write,ANSWERS,HINTS,SUBS,SOLUTIONS,readSubs,usedHints}from"./practice.js";import{STORE_KEY,readStore,cleanDesign}from"./lab/store.js";import SolutionDesign from"./SolutionDesign.jsx";import{modelAnswer}from"./judge/model.js";import{expected}from"./eval/trace.js";import{checkLabel}from"./eval/words.js";import{evalCatalogue}from"./eval/design.js";import{submitProblem}from"./account.js";import"./solve.css";import{Answer}from"./solve/answer.jsx";import{Hints,Subs}from"./solve/panes.jsx";import{Ops,fieldsOf,replayAt,ReplayBar}from"./solve/v2.jsx";import{Json,reqOf,Player}from"./solve/player.jsx";import{Console}from"./solve/console.jsx";import{ledger}from"./solve/credit.jsx";import{reviewCanvas}from"./practice/client.js";import{AskButton,useCredits,reviewError}from"./practice/review.jsx";

// The question part of an Interview Question: from its "1. …" heading up to its "3. …" heading.
export const statement=body=>{const h=body.map((b,i)=>b.t==="h2"?[i,b.x]:null).filter(Boolean);const a=h.find(([,x])=>/^1\./.test(x)),z=h.find(([,x])=>/^3\./.test(x));
return a?body.slice(a[0],z&&z[0]>a[0]?z[0]:undefined).filter(b=>b.t!=="fig"&&b.t!=="lab"):[]};


const W_KEY="tk-solve-w",MIN=320;
const savedW=()=>{let w=0;try{w=Number(localStorage.getItem(W_KEY))}catch{}return w>=MIN?w:460};
// the canvas keeps at least 880 px (its toolbar and panels need it) beside the folded sidebar
const maxW=()=>Math.max(MIN,Math.min(Math.round(innerWidth*.6),innerWidth-56-880));
const narrowQ="(max-width:900px)";

export default function Solve({slug,tab,s,articles,Block,Article,prep,Lab}){
const[st,set]=useState({}),[hide,setHide]=useState(false),[w,setW]=useState(savedW),[canvas,setCanvas]=useState(false);
const[view,setView]=useState(tab==="a"?"solution":"description");
const[narrow,setNarrow]=useState(()=>typeof matchMedia!=="undefined"&&matchMedia(narrowQ).matches);const pane=useRef(null);
const[lab,setLab]=useState(null),design=useRef(null),[res,setRes]=useState(null),[busy,setBusy]=useState(false),[flow,setFlow]=useState(0);const credits=useCredits(res?.kind==="review"?res:null);
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
const put=d=>{design.current=null;setRes(null);setWatch(null);setPending({nodes:structuredClone(d.nodes),edges:structuredClone(d.edges)});setGen(g=>g+1)};
// A stopwatch, like an interview's clock: start, pause, carry on.
useEffect(()=>{if(!clock.on)return;const t=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(t)},[clock.on]);
useEffect(()=>{setClock({on:false,acc:0,at:0})},[slug]);
const saveAns=v=>{setAns(v);const all=read(ANSWERS);all[slug]={...v,updated:Date.now()};write(ANSWERS,all)};
const openHint=()=>{const n=hints+1;setHints(n);const all=read(HINTS);all[slug]=n;write(HINTS,all)};
const qs=articles.filter(x=>x.section==="interview-questions"&&x.group!=="start"),i=qs.findIndex(x=>x.slug===slug),next=qs[i+1],prev=i>0?qs[i-1]:null;
const secs=Math.floor((clock.acc+(clock.on?Date.now()-clock.at:0))/1000),mmss=`${String(Math.floor(secs/60)).padStart(2,"0")}:${String(secs%60).padStart(2,"0")}`;
const toggleClock=()=>setClock(c=>c.on?{on:false,acc:c.acc+Date.now()-c.at,at:0}:{...c,on:true,at:Date.now()});
const reset=()=>{if(typeof confirm==="function"&&!confirm("Put the canvas back to the starting design? Your current design is replaced."))return;setUndo(null);put(P.start)};
const mine=()=>{const d=pending||design.current||savedDesign()||P.start;return{nodes:d.nodes,edges:d.edges}};
// Copy the whole solution: the design onto the canvas and the model answer (requirements, numbers, estimates, API,
// key decisions; judge/model.js) into Your answer. Undo puts both back.
const copySolution=()=>{if(!sol)return;setUndo({design:mine(),ans});put(sol);if(P?.rubric){saveAns({...modelAnswer(P.rubric),copied:true});setGraded(null)}const all=read(SOLUTIONS);all[slug]=Date.now();write(SOLUTIONS,all);if(narrow)setCanvas(true)};
const undoCopy=()=>{if(!undo)return;put(undo.design);saveAns(undo.ans||{});setGraded(null);setUndo(null)};
const drag=e=>{e.preventDefault();const x0=e.clientX,w0=w;const mv=ev=>setW(Math.min(maxW(),Math.max(MIN,w0+ev.clientX-x0)));const up=()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up)};addEventListener("pointermove",mv);addEventListener("pointerup",up)};
const key=e=>{const d=e.key==="ArrowLeft"?-24:e.key==="ArrowRight"?24:0;if(d){e.preventDefault();setW(v=>Math.min(maxW(),Math.max(MIN,v+d)))}};
if(st.err)return <section className="d-panel">{st.err==="missing"?<p className="d-desc">{s.missing} <a href="#problems">{s.back}</a></p>:<LoadError what="this problem" retry={st.err==="figs"?()=>location.reload():load}/>}</section>;
if(!st.a)return <section className="d-panel"><Loading label={qs[i]?.title}/></section>;
const a=st.a,P=a.practice,body=statement(a.body),ch=a.body.find(b=>b.t==="lab"&&/^problems\/challenge\/./.test(b.to));const showLab=!narrow||canvas;
// Run: the example tests. Submit: every test, the written steps, a score, a saved submission.
// The design to judge: what the canvas holds now, or (before the canvas has loaded, e.g. on a phone that
// hasn't opened the Canvas tab) the design saved for this problem; only without either, the start.
const savedDesign=()=>{try{const st=readStore(localStorage.getItem(STORE_KEY),lab),x=st.designs["q-"+slug]||Object.values(st.designs).find(v=>v.problem===slug);return x?{nodes:x.nodes,edges:x.edges}:null}catch{return null}};
// The interviewer, next to Run and Submit: the server judges the design on the canvas with every test and reviews it;
// the review shows where the test results do (solve/console.jsx).
const ask=async()=>{if(!P||!lab||busy||res?.kind==="review"&&res.busy)return;if(narrow)setCanvas(true);const d=mine();setRes({kind:"review",busy:true});
try{const data=await reviewCanvas(slug,d);setRes(r=>r?.kind==="review"?{kind:"review",data}:r)}catch(e){setRes(r=>r?.kind==="review"?{kind:"review",err:reviewError(e)}:r)}};
// Break it yourself (context 36, step 4): the replayed test again, on the same design, with one more fault from the minute
// on the scrubber; the replay continues from that minute on the new run. Not scored and not saved.
const breakParts=()=>{const d=pending||design.current||P?.start,cat=lab?evalCatalogue(lab):{};return(d?.nodes||[]).filter(n=>{const c=cat[n.type]||lab?.components?.find(x=>x.type===n.type);return c?.crash&&!c.managed}).map(n=>({id:n.id,type:n.type,name:n.name||(cat[n.type]||lab?.components?.find(x=>x.type===n.type))?.name||n.id}))};
const breakIt=(fault,label)=>{if(!rep||!P||!lab)return;const d=pending||design.current||savedDesign()||P.start,base=rep.base||rep.r.test,faults=[...(rep.faults||base.faults||[]),fault];
let r2=null;try{const j=judge(d,lab,{...P,tests:[{...base,id:base.id+":whatif",sample:true,faults}]},{sample:true});r2=j.results.find(x=>x.timeline)}catch{}if(!r2)return;
track("break_it",{problem:slug,kind:fault.kind});setRep(x=>({...x,r:{...r2,test:{...r2.test,name:base.name}},base,faults,play:true,whatIf:[...(x.whatIf||[]),`${label} at minute ${fault.minute}`]}))};
const go=kind=>{if(!P||!lab||busy)return;if(narrow)setCanvas(true);setBusy(true);setRes(null);
setTimeout(()=>{const d=pending||design.current||savedDesign()||P.start;let out;try{const j=judge(d,lab,P,{sample:kind==="run"});out={kind,j,credit:ledger(j.results)};
if(kind==="submit"){const g=gradeAnswer(ans,P.rubric),sc=score(g,j,hints);out.g=g;out.sc=sc;setGraded(g);
// the solution's design copied and submitted unchanged: kept, but not counted as solved or as a best score
const copied=!!(sol&&read(SOLUTIONS)[slug]&&sameDesign(cleanDesign(d,lab,"mine"),cleanDesign(sol,lab,"solution")));out.copied=copied;
const sub={at:Date.now(),verdict:j.verdict,passed:j.passed,total:j.total,score:sc.total,cost:j.metrics?.avgMonthly??null,p99:j.metrics?.p99??null,hints,...(copied?{copied:true}:{}),tests:testSummary(j.results),design:{nodes:d.nodes,edges:d.edges}};
// against the last submission (context 36, step 5): what changed in the results and on the canvas
{const prevSub=readSubs(slug)[0];const nm=n=>n.name||lab.components?.find(c=>c.type===n.type)?.name||evalCatalogue(lab)[n.type]?.name||n.type;out.cmp=compareSubs(prevSub,sub);if(out.cmp)out.diff=diffDesigns(prevSub.design,sub.design,nm)}
const all=read(SUBS);all[slug]=[sub,...readSubs(slug)].slice(0,30);write(SUBS,all);setSubs(all[slug]);
markStep("practice:"+slug);if(j.verdict==="accepted"&&!copied){
// solved for the first time: the Problems list draws its tick when the reader goes back to it
if(!readProgress().steps["solved:"+slug])try{sessionStorage.setItem("tk-just-solved",slug)}catch{}markStep("solved:"+slug)}
// signed in: the API judges it again and says how it compares with everyone else's
out.server="pending";submitProblem({slug,design:d,answer:ans,hints}).then(v=>setRes(r=>r&&r.j===j?{...r,server:v||"off"}:r))}}
catch(e){out={kind,crash:String(e?.message||e)}}setRes(out);setBusy(false);
// a passing design: requests visibly flow along its arrows for a moment (nodes.jsx Arrow), then stop
if(out.j?.verdict==="accepted"){const n=Date.now();setFlow(n);setTimeout(()=>setFlow(f=>f===n?0:f),2400)}},30)};
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
{P.tests.filter(t=>t.sample).map((t,k)=><div key={t.id} className="sv-test"><b>Example {k+1}: {t.name}</b><p>{t.desc}</p>{t.op?(()=>{const o=P.operations.find(x=>x.id===t.op);return o&&<div className="sv-io"><Json label="Request" v={reqOf(o)}/><Json label="Expected response" v={expected(P,o)}/></div>})():<ul>{t.checks.map((c,ci)=><li key={ci}>{c.label||checkLabel(c,P,lab?evalCatalogue(lab):{})}</li>)}</ul>}</div>)}
<p className="sv-more">{P.tests.filter(t=>!t.sample).length} more tests run when you submit: {P.tests.some(t=>(t.request||t.op)&&!t.sample)?"more API calls, ":""}spikes, failures and the bill.</p></section>}
<div className="sv-links">
{ch&&<a href={`#${ch.to}`}>{s.scored} →</a>}
{next&&<a href={`#problems/${next.slug}`}><small>{s.next}</small> {next.title} →</a>}</div></>}
</section>
{!narrow&&!hide&&<div className="sv-split" role="separator" aria-orientation="vertical" aria-label={s.resize} aria-valuemin={MIN} aria-valuemax={maxW()} aria-valuenow={w} tabIndex={0} onPointerDown={drag} onKeyDown={key}/>}
<div className="sv-lab">
<div className="sv-bar">{!narrow&&<button type="button" className="sv-toggle" aria-expanded={!hide} onClick={()=>setHide(h=>!h)}>{hide?s.show:s.hide}</button>}
<span className="sv-nav">{prev?<a href={`#problems/${prev.slug}`} title={`Previous: ${prev.title}`} aria-label={`Previous problem: ${prev.title}`}>‹</a>:<span aria-hidden="true">‹</span>}{next?<a href={`#problems/${next.slug}`} title={`Next: ${next.title}`} aria-label={`Next problem: ${next.title}`}>›</a>:<span aria-hidden="true">›</span>}</span>
<span className="sv-gap"/><button type="button" className={"sv-clock"+(clock.on?" on":"")} onClick={toggleClock} aria-label={clock.on?"Pause the timer":"Start the timer"} title={clock.on?"Pause":"Start a timer"}>⏱ {secs||clock.on?mmss:"Timer"}</button>{P&&<button type="button" className="sv-reset" onClick={reset}>Reset</button>}{P&&<><button type="button" className="sv-run" disabled={!lab||busy} onClick={()=>go("run")}>▶ Run</button><button type="button" className="sv-submit" disabled={!lab||busy} onClick={()=>go("submit")}>Submit</button><AskButton className="sv-ask" busy={res?.kind==="review"&&!!res.busy} disabled={!lab||busy} onClick={ask} credits={credits}/></>}</div>
{showLab&&<Suspense fallback={<Loading label="Loading the canvas"/>}><Lab key={slug+":"+gen} problem={{id:slug,name:a.title,start:P?.start,fields:P?.v===2?fieldsOf(P):P?.data?.fields,v:P?.v,locked:P?.v===2?P.locked:undefined,ops:P?.v===2?P.operations.map(o=>({id:o.id,name:o.name})):undefined,practice:P?.v===2?P:undefined,load:pending,onLoaded:()=>setPending(null)}} onDesign={d=>{design.current=d}} trace={watch?watch.hops[watch.i]:null} replay={rep?replayAt(rep,P):null} flow={watch||rep?0:flow}/></Suspense>}
{watch?<Player w={watch} set={setWatch}/>:rep?<ReplayBar rep={rep} set={setRep} P={P} parts={breakParts()} onBreak={breakIt} nameOf={id=>{const d=pending||design.current||P?.start;const n=d?.nodes?.find(x=>x.id===id);return n?.name||lab?.components?.find(c=>c.type===n?.type)?.name||id}}/>:(busy||res)&&<Console P={P} nameOf={id=>{const d=pending||design.current||P?.start;const n=d?.nodes?.find(x=>x.id===id);return n?.name||lab?.components?.find(c=>c.type===n?.type)?.name||id}} busy={busy} res={res} close={()=>setRes(null)} replay={(r,at=0)=>{if(narrow)setCanvas(true);setRep({r,i:at,play:false,from:res?.credit?.before?.[r.id]})}} watch={r=>{if(narrow)setCanvas(true);setWatch({r,hops:r.trace,i:0,play:true})}} credits={credits} hint={()=>{setCanvas(false);setHide(false);setView("hints")}} answer={()=>{setCanvas(false);setHide(false);setView("answer")}}/>}
</div>
</div>}
