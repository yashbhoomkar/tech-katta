// Problems: every Interview Question and challenge in one list, with what this visitor has done
import{planOf,dailyOf,readMarks}from"./plan/plan.js";import{skillRecord,nextFor}from"./plan/skills.js";import{read as readKey,SUBS}from"./practice.js";
// (a question practised against the clock or designed on the canvas, stars earned in a challenge).
// Copy in site.json "problems"; progress from progress.js, kept up to date by its "tk-progress" event;
// challenges from GET /v1/lab. The question list is a LeetCode-style table (QuestionTable), also used by
// the Interview Questions tab (Questions). With site.json problems.solve every question opens in the
// workspace (solve.jsx): #problems/<slug> on its description, #interview-questions/<slug> on its answer.
import React,{useEffect,useState}from"react";import{getJSON}from"./api.js";import{readProgress}from"./progress.js";import{readStore,STORE_KEY}from"./lab/store.js";import{bestScore,readSubs}from"./practice.js";import"./problems.css";

const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??"");
const Stars=({n,max,label})=><span className="pb-stars" role="img" aria-label={label}>{Array.from({length:max},(_,i)=>i).map(i=><i key={i} className={i<n?"on":""} aria-hidden="true">★</i>)}</span>;
const qno=a=>a.no.replace(/^QUESTION\s*\/\/\s*/,"");

// Progress, the Lab catalogue and which questions have a design of their own (q-<slug> with more than
// the Clients on it), kept up to date while the page is open.
function useProblemData(){
const[prog,setProg]=useState(readProgress),[lab,setLab]=useState(null),[err,setErr]=useState(false),[tick,setTick]=useState(0);
useEffect(()=>{const f=()=>{setProg(readProgress());setTick(t=>t+1)};addEventListener("tk-progress",f);addEventListener("storage",f);return()=>{removeEventListener("tk-progress",f);removeEventListener("storage",f)}},[]);
useEffect(()=>{getJSON("/v1/lab").then(setLab,()=>setErr(true))},[]);
const[stats,setStats]=useState({});useEffect(()=>{getJSON("/v1/problems/stats").then(r=>setStats(r?.problems||{}),()=>{})},[]);
const designed=new Set();if(lab){let raw=null;try{raw=localStorage.getItem(STORE_KEY)}catch{}for(const d of Object.values(readStore(raw,lab).designs))if(d.problem&&d.nodes.length>1)designed.add(d.problem)}
return{prog,lab,err,designed,tick,stats}}

// The question list: status, number, title, difficulty, its related challenge's stars; filters by difficulty.
export function QuestionTable({p,qs,groups,base,data,todo,only}){
const s=p.solve||{cols:["","#","","","",""],designed:"",solved:""},[level,setLevel]=useState("all");
// a problem solved for the first time in this visit (set by solve.jsx): its tick is marked once, then forgotten
const[fresh]=useState(()=>{try{const v=sessionStorage.getItem("tk-just-solved");sessionStorage.removeItem("tk-just-solved");return v}catch{return null}});const{prog,lab,designed,stats}=data;
const levels=(groups||[]).filter(g=>qs.some(a=>a.group===g[0]));
const rows=qs.map(a=>({a,done:!!prog.steps["solved:"+a.slug],tried:!!prog.steps["practice:"+a.slug]||designed.has(a.slug)||readSubs(a.slug).length>0,best:bestScore(a.slug),ch:a.lab&&lab?.challenges.find(x=>x.id===a.lab)}))
.filter(r=>(level==="all"||r.a.group===level)&&(!todo||!r.done)&&(!only||only.has(r.a.slug)));
const head=[s.cols[0],s.cols[1],s.cols[2],s.cols[3],s.cols[6]||"",s.cols[5],s.cols[4]],cls=["c0","c1","c2","c3","c6","c5","c4"];
return <div className="qt">
{levels.length>1&&<div className="qt-levels" role="group" aria-label={s.cols[3]}>{[["all",p.all],...levels.map(g=>[g[0],g[1]])].map(([id,t])=><button key={id} type="button" aria-pressed={level===id} className={(level===id?"on ":"")+id} onClick={()=>setLevel(id)}>{t}</button>)}</div>}
{rows.length?<table className="qt-table"><thead><tr>{head.map((c,i)=><th key={i} scope="col" className={cls[i]}>{c}</th>)}</tr></thead><tbody>
{rows.map(({a,done,tried,best,ch})=><tr key={a.slug}>
<td className="c0">{done?<span className={"qt-st done"+(fresh===a.slug?" fresh":"")} title={s.solved}>✓<span className="sr">{s.solved}</span></span>:tried?<span className="qt-st tried" title={s.designed}>◐<span className="sr">{s.designed}</span></span>:<span className="qt-st" aria-hidden="true"></span>}</td>
<td className="c1">{qno(a)}</td>
<td className="c2"><a href={`#${base}/${a.slug}`}>{a.title}</a></td>
<td className="c3"><em className={"pb-tag "+a.group}>{a.tag}</em></td>
<td className="c6">{stats[a.slug]?.submissions?<span className="qt-acc" title={`${stats[a.slug].accepted} of ${stats[a.slug].submissions} submissions accepted`}>{Math.round(100*stats[a.slug].accepted/stats[a.slug].submissions)}%</span>:<span className="qt-none">—</span>}</td>
<td className="c5">{best!=null?<b className="qt-score">{best}</b>:<span className="qt-none">—</span>}</td>
<td className="c4">{ch?<a href={`#problems/challenge/${ch.id}`} title={ch.title}><Stars n={prog.stars[ch.id]||0} max={ch.stars.length} label={fill(p.starsLabel,{n:prog.stars[ch.id]||0,max:ch.stars.length})}/></a>:""}</td></tr>)}
</tbody></table>:<p className="pb-none">{p.allDone}</p>}</div>}

// Interview Questions tab: the method page ("Start here") as a card, then every question in the table.
export function Questions({p,articles,label,desc,eyebrow,groups}){
const data=useProblemData();const all=articles.filter(a=>a.section==="interview-questions");const start=all.filter(a=>a.group==="start"),qs=all.filter(a=>a.group!=="start");
return <section className="d-panel pb" aria-labelledby="d-title"><label>{eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{desc}</p>
{start.map(a=><a key={a.slug} className="qt-start" href={`#interview-questions/${a.slug}`}><small>{(groups||[]).find(g=>g[0]==="start")?.[1]||a.no}</small><b>{a.title}</b><span>{a.dek}</span></a>)}
<section className="pb-group" aria-label={p.questions}><QuestionTable p={p} qs={qs} groups={groups} base="interview-questions" data={data}/></section></section>}

export default function Problems({p,articles,groups}){
const data=useProblemData();const{prog,lab,err}=data;const[todo,setTodo]=useState(false);const[marked,setMarked]=useState(false);const[marks,setMarks]=useState(readMarks);
useEffect(()=>{const on=()=>setMarks(readMarks());addEventListener("tk-marks",on);addEventListener("storage",on);return()=>{removeEventListener("tk-marks",on);removeEventListener("storage",on)}},[]);
const qs=articles.filter(a=>a.section==="interview-questions"&&a.group!=="start");
const chs=(lab?.challenges||[]).map(ch=>({ch,n:prog.stars[ch.id]||0,max:ch.stars.length}));
const levels=Object.fromEntries((lab?.levels||[]).map(l=>[l.id,l.label]));
const sum=fill(p.summary,{q:qs.filter(a=>prog.steps["solved:"+a.slug]).length,qt:qs.length,s:chs.reduce((t,x)=>t+x.n,0),st:chs.reduce((t,x)=>t+x.max,0)});
const showC=chs.filter(x=>!todo||x.n<x.max);
return <section className="d-panel pb" aria-labelledby="d-title"><label>{p.eyebrow}</label><h1 id="d-title">{p.title}</h1><p className="d-desc">{p.desc}</p>
<div className="pb-bar"><p className="pb-sum" aria-live="polite">{lab||err?sum:"…"}</p>
<div className="pb-filter" role="group" aria-label={p.filterLabel}>{[[false,p.all],[true,p.todo]].map(([v,t])=><button key={t} type="button" aria-pressed={!marked&&todo===v} className={!marked&&todo===v?"on":""} onClick={()=>{setTodo(v);setMarked(false)}}>{t}</button>)}<button type="button" aria-pressed={marked} className={marked?"on":""} onClick={()=>setMarked(m=>!m)}>★ Bookmarked{Object.keys(marks.bookmarks).length?` (${Object.keys(marks.bookmarks).length})`:""}</button>
<button type="button" className="pb-pick" onClick={()=>{const left=qs.filter(a=>!prog.steps["solved:"+a.slug]),from=left.length?left:qs;const a=from[Math.floor(Math.random()*from.length)];if(a)location.hash=`#problems/${a.slug}`}}>⚄ Pick one</button></div></div>
<Plan qs={qs} prog={prog}/>
<Skills qs={qs} prog={prog}/>
<section className="pb-group" aria-labelledby="pb-q"><h2 id="pb-q">{p.questions}</h2><p>{p.questionsDesc}</p>
{marked&&!Object.keys(marks.bookmarks).length&&<p className="pb-none">No bookmarks yet: press ☆ in a problem's workspace to keep it here.</p>}<QuestionTable p={p} qs={qs} groups={groups} base="problems" data={data} todo={todo} only={marked?new Set(Object.keys(marks.bookmarks)):null}/></section>
{/* The sandbox canvas (context 36, step 7): the canvas with no problem; paid. */}
<section className="pb-group" aria-labelledby="pb-s"><h2 id="pb-s">Sandbox</h2><p>The canvas with no problem: choose the traffic and what goes wrong, and see how any design holds up and what it costs.</p>
<ol><li><a href="#problems/sandbox"><span className="pb-meta"><small>PAID · OPEN CANVAS</small></span><b>Design anything</b><span aria-hidden="true">→</span></a></li></ol></section>
<section className="pb-group" aria-labelledby="pb-c"><h2 id="pb-c">{p.challenges}</h2><p>{p.challengesDesc}</p>
{err?<p className="pb-none">{p.labError}</p>:!lab?<p className="pb-none">…</p>:showC.length?<ol>{showC.map(({ch,n,max})=><li key={ch.id}><a href={`#problems/challenge/${ch.id}`}><span className="pb-meta"><small>{levels[ch.level]||ch.level}</small></span><b>{ch.title}</b><Stars n={n} max={max} label={fill(p.starsLabel,{n,max})}/></a></li>)}</ol>:<p className="pb-none">{p.allDone}</p>}</section>
</section>}

// Coming back (context 36, step 10): the problem of the day and the study plan from the Questions guide, with ticks.
function Plan({qs,prog}){const solved=slug=>!!prog.steps["solved:"+slug],title=Object.fromEntries(qs.map(q=>[q.slug,q.title.replace(/^Design (a |an )?/,"")]));
const weeks=planOf(qs),all=weeks.flatMap(w=>w.slugs),done=all.filter(solved).length,next=all.find(s=>!solved(s)),day=dailyOf(qs,solved);
return <section className="pb-group pb-plan" aria-labelledby="pb-p"><h2 id="pb-p">Your plan</h2>
<div className="pb-plan-top">{day&&<a className="pb-day" href={`#problems/${day.slug}`}><small>PROBLEM OF THE DAY</small><b>{day.title}</b></a>}{next&&<a className="pb-day" href={`#problems/${next}`}><small>NEXT IN YOUR PLAN · {done} OF {all.length} DONE</small><b>{qs.find(q=>q.slug===next)?.title}</b></a>}</div>
<details open={done<all.length}><summary>The order to take them in</summary><ol className="pb-weeks">{weeks.map(w=>{const d=w.slugs.filter(solved).length;return <li key={w.name}><div><b>{w.name}</b> <small>{d} of {w.slugs.length} · {w.why}</small></div><ul>{w.slugs.map(s=><li key={s} className={solved(s)?"ok":""}><a href={`#problems/${s}`}>{solved(s)?"✓ ":""}{title[s]||s}</a></li>)}</ul></li>})}</ol></details></section>}

// Your skills (context 36, step 20): what your own latest submission on each problem passed, by kind of test, and the
// next problem for the weakest kind. Only from this browser; shown once there is a submission.
function Skills({qs,prog}){const rec=skillRecord(readKey(SUBS));if(!rec.problems)return null;
const solved=slug=>!!prog.steps["solved:"+slug],next=rec.weakest?nextFor(rec.weakest,planOf(qs).flatMap(w=>w.slugs),solved):null,title=s=>qs.find(q=>q.slug===s)?.title||s,weak=rec.skills.find(s=>s.id===rec.weakest);
return <section className="pb-group pb-skills" aria-labelledby="pb-s"><h2 id="pb-s">Your skills</h2><p>From your latest submission on each of {rec.problems} problem{rec.problems===1?"":"s"} (copied solutions don't count).</p>
<ul className="pb-skill">{rec.skills.filter(s=>s.total).map(s=>{const r=s.passed/s.total;return <li key={s.id} className={s.id===rec.weakest?"weak":""}><div><b>{s.label}</b><small>{s.about}</small></div><span className="pb-bar" aria-hidden="true"><i style={{"--w":`${Math.round(100*r)}%`}}/></span><span className="pb-n">{s.passed} of {s.total} test{s.total===1?"":"s"}</span></li>})}</ul>
{weak&&<p className="pb-next">Weakest: <b>{weak.label}</b>.{next?<> Next, try <a href={`#problems/${next}`}>{title(next)}</a>: it leans on that.</>:" Redo a problem where it failed."}</p>}</section>}
