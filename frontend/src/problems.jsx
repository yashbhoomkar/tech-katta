// Problems: every Interview Question and Lab challenge in one list, with what this visitor has done
// (a question practised against the clock, stars earned in a challenge). Copy in site.json "problems";
// progress from progress.js, kept up to date by its "tk-progress" event; challenges from GET /v1/lab.
import React,{useEffect,useState}from"react";import{getJSON}from"./api.js";import{readProgress}from"./progress.js";import"./problems.css";

const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??"");
const Stars=({n,max,label})=><span className="pb-stars" role="img" aria-label={label}>{Array.from({length:max},(_,i)=>i).map(i=><i key={i} className={i<n?"on":""} aria-hidden="true">★</i>)}</span>;

export default function Problems({p,articles}){
const[prog,setProg]=useState(readProgress),[lab,setLab]=useState(null),[err,setErr]=useState(false),[todo,setTodo]=useState(false);
useEffect(()=>{const f=()=>setProg(readProgress());addEventListener("tk-progress",f);addEventListener("storage",f);return()=>{removeEventListener("tk-progress",f);removeEventListener("storage",f)}},[]);
useEffect(()=>{getJSON("/v1/lab").then(setLab,()=>setErr(true))},[]);
const qs=articles.filter(a=>a.section==="interview-questions"&&a.group!=="start").map(a=>({a,done:!!prog.steps["practice:"+a.slug]}));
const chs=(lab?.challenges||[]).map(ch=>({ch,n:prog.stars[ch.id]||0,max:ch.stars.length}));
const levels=Object.fromEntries((lab?.levels||[]).map(l=>[l.id,l.label]));
const sum=fill(p.summary,{q:qs.filter(x=>x.done).length,qt:qs.length,s:chs.reduce((t,x)=>t+x.n,0),st:chs.reduce((t,x)=>t+x.max,0)});
const showQ=qs.filter(x=>!todo||!x.done),showC=chs.filter(x=>!todo||x.n<x.max);
return <section className="d-panel pb" aria-labelledby="d-title"><label>{p.eyebrow}</label><h1 id="d-title">{p.title}</h1><p className="d-desc">{p.desc}</p>
<div className="pb-bar"><p className="pb-sum" aria-live="polite">{lab||err?sum:"…"}</p>
<div className="pb-filter" role="group" aria-label={p.filterLabel}>{[[false,p.all],[true,p.todo]].map(([v,t])=><button key={t} type="button" aria-pressed={todo===v} className={todo===v?"on":""} onClick={()=>setTodo(v)}>{t}</button>)}</div></div>
<section className="pb-group" aria-labelledby="pb-q"><h2 id="pb-q">{p.questions}</h2><p>{p.questionsDesc}</p>
{showQ.length?<ol>{showQ.map(({a,done})=><li key={a.slug}><a href={`#interview-questions/${a.slug}`}><span className="pb-meta"><small>{a.no.replace(/^QUESTION\s*\/\/\s*/,"Q")}</small><em className={"pb-tag "+a.group}>{a.tag}</em></span><b>{a.title}</b><span className={"pb-state"+(done?" done":"")}>{done?p.practised:p.notYet}</span></a></li>)}</ol>:<p className="pb-none">{p.allDone}</p>}</section>
<section className="pb-group" aria-labelledby="pb-c"><h2 id="pb-c">{p.challenges}</h2><p>{p.challengesDesc}</p>
{err?<p className="pb-none">{p.labError}</p>:!lab?<p className="pb-none">…</p>:showC.length?<ol>{showC.map(({ch,n,max})=><li key={ch.id}><a href={`#lab/${ch.id}`}><span className="pb-meta"><small>{levels[ch.level]||ch.level}</small></span><b>{ch.title}</b><Stars n={n} max={max} label={fill(p.starsLabel,{n,max})}/></a></li>)}</ol>:<p className="pb-none">{p.allDone}</p>}</section>
</section>}
