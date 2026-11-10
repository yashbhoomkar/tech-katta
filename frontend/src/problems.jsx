// Problems: every Interview Question and challenge in one list, with what this visitor has done
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
export function QuestionTable({p,qs,groups,base,data,todo}){
const s=p.solve||{cols:["","#","","","",""],designed:"",solved:""},[level,setLevel]=useState("all");const{prog,lab,designed,stats}=data;
const levels=(groups||[]).filter(g=>qs.some(a=>a.group===g[0]));
const rows=qs.map(a=>({a,done:!!prog.steps["solved:"+a.slug],tried:!!prog.steps["practice:"+a.slug]||designed.has(a.slug)||readSubs(a.slug).length>0,best:bestScore(a.slug),ch:a.lab&&lab?.challenges.find(x=>x.id===a.lab)}))
.filter(r=>(level==="all"||r.a.group===level)&&(!todo||!r.done));
const head=[s.cols[0],s.cols[1],s.cols[2],s.cols[3],s.cols[6]||"",s.cols[5],s.cols[4]],cls=["c0","c1","c2","c3","c6","c5","c4"];
return <div className="qt">
{levels.length>1&&<div className="qt-levels" role="group" aria-label={s.cols[3]}>{[["all",p.all],...levels.map(g=>[g[0],g[1]])].map(([id,t])=><button key={id} type="button" aria-pressed={level===id} className={(level===id?"on ":"")+id} onClick={()=>setLevel(id)}>{t}</button>)}</div>}
{rows.length?<table className="qt-table"><thead><tr>{head.map((c,i)=><th key={i} scope="col" className={cls[i]}>{c}</th>)}</tr></thead><tbody>
{rows.map(({a,done,tried,best,ch})=><tr key={a.slug}>
<td className="c0">{done?<span className="qt-st done" title={s.solved}>✓<span className="sr">{s.solved}</span></span>:tried?<span className="qt-st tried" title={s.designed}>◐<span className="sr">{s.designed}</span></span>:<span className="qt-st" aria-hidden="true"></span>}</td>
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
const data=useProblemData();const{prog,lab,err}=data;const[todo,setTodo]=useState(false);
const qs=articles.filter(a=>a.section==="interview-questions"&&a.group!=="start");
const chs=(lab?.challenges||[]).map(ch=>({ch,n:prog.stars[ch.id]||0,max:ch.stars.length}));
const levels=Object.fromEntries((lab?.levels||[]).map(l=>[l.id,l.label]));
const sum=fill(p.summary,{q:qs.filter(a=>prog.steps["solved:"+a.slug]).length,qt:qs.length,s:chs.reduce((t,x)=>t+x.n,0),st:chs.reduce((t,x)=>t+x.max,0)});
const showC=chs.filter(x=>!todo||x.n<x.max);
return <section className="d-panel pb" aria-labelledby="d-title"><label>{p.eyebrow}</label><h1 id="d-title">{p.title}</h1><p className="d-desc">{p.desc}</p>
<div className="pb-bar"><p className="pb-sum" aria-live="polite">{lab||err?sum:"…"}</p>
<div className="pb-filter" role="group" aria-label={p.filterLabel}>{[[false,p.all],[true,p.todo]].map(([v,t])=><button key={t} type="button" aria-pressed={todo===v} className={todo===v?"on":""} onClick={()=>setTodo(v)}>{t}</button>)}
<button type="button" className="pb-pick" onClick={()=>{const left=qs.filter(a=>!prog.steps["solved:"+a.slug]),from=left.length?left:qs;const a=from[Math.floor(Math.random()*from.length)];if(a)location.hash=`#problems/${a.slug}`}}>⚄ Pick one</button></div></div>
<section className="pb-group" aria-labelledby="pb-q"><h2 id="pb-q">{p.questions}</h2><p>{p.questionsDesc}</p>
<QuestionTable p={p} qs={qs} groups={groups} base="problems" data={data} todo={todo}/></section>
<section className="pb-group" aria-labelledby="pb-c"><h2 id="pb-c">{p.challenges}</h2><p>{p.challengesDesc}</p>
{err?<p className="pb-none">{p.labError}</p>:!lab?<p className="pb-none">…</p>:showC.length?<ol>{showC.map(({ch,n,max})=><li key={ch.id}><a href={`#problems/challenge/${ch.id}`}><span className="pb-meta"><small>{levels[ch.level]||ch.level}</small></span><b>{ch.title}</b><Stars n={n} max={max} label={fill(p.starsLabel,{n,max})}/></a></li>)}</ol>:<p className="pb-none">{p.allDone}</p>}</section>
</section>}
