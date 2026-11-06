// The problem workspace, LeetCode-style, for every Interview Question (not the "Start here" page).
// Left: tabs Description (the article's "1. Requirements" and "2. The numbers that matter") and Worked
// answer (the whole article). Right: the Lab canvas with every component, opened on this question's own
// design (Lab `problem`, id q-<slug>). The tabs are routes, so links, Back and the top tabs agree:
//   #problems/<slug>             Description          #interview-questions/<slug>   Worked answer
// The divider drags (or arrow keys) and the width is remembered. Below 900 px one pane shows at a time,
// with a third tab, Canvas. Copy: site.json problems.solve.
import React,{Suspense,useEffect,useRef,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import{readArticle}from"./analytics.js";import"./solve.css";

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
useEffect(()=>{const f=()=>setW(v=>Math.min(v,maxW()));f();addEventListener("resize",f);return()=>removeEventListener("resize",f)},[]);
const[narrow,setNarrow]=useState(()=>typeof matchMedia!=="undefined"&&matchMedia(narrowQ).matches);const pane=useRef(null);
useEffect(()=>{if(typeof matchMedia==="undefined")return;const m=matchMedia(narrowQ),f=()=>setNarrow(m.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);
const load=()=>{set({});getJSON(`/v1/articles/${slug}`).then(a=>set({a:prep(a)}),e=>set({err:e.status===404?"missing":"failed"}))};useEffect(load,[slug]);
useEffect(()=>{if(tab==="a")return readArticle("interview-questions",slug)},[tab,slug]);
useEffect(()=>{setCanvas(false);if(pane.current)pane.current.scrollTop=0},[tab,slug]);
useEffect(()=>{try{localStorage.setItem(W_KEY,String(w))}catch{}},[w]);
const qs=articles.filter(x=>x.section==="interview-questions"&&x.group!=="start"),i=qs.findIndex(x=>x.slug===slug),next=qs[i+1];
// dragging the divider
const drag=e=>{e.preventDefault();const x0=e.clientX,w0=w;const mv=ev=>setW(Math.min(maxW(),Math.max(MIN,w0+ev.clientX-x0)));const up=()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up)};addEventListener("pointermove",mv);addEventListener("pointerup",up)};
const key=e=>{const d=e.key==="ArrowLeft"?-24:e.key==="ArrowRight"?24:0;if(d){e.preventDefault();setW(v=>Math.min(maxW(),Math.max(MIN,v+d)))}};
if(st.err)return <section className="d-panel">{st.err==="missing"?<p className="d-desc">{s.missing} <a href="#problems">{s.back}</a></p>:<LoadError what="this problem" retry={load}/>}</section>;
if(!st.a)return <section className="d-panel"><Loading label={qs[i]?.title}/></section>;
const a=st.a,body=statement(a.body),ch=a.body.find(b=>b.t==="lab"&&/^lab\/./.test(b.to));const showLab=!narrow||canvas;
const tabs=[["q",s.tabQ,`#problems/${slug}`],["a",s.tabA,`#interview-questions/${slug}`]];
return <div className={"solve"+(hide&&!narrow?" hide":"")+(narrow&&canvas?" v-canvas":"")} style={{"--qw":w+"px"}}>
<div className="sv-tabs" role="tablist" aria-label={a.title}>{tabs.map(([id,t,href])=><a key={id} role="tab" href={href} aria-selected={!canvas&&tab===id} className={!canvas&&tab===id?"on":""} onClick={()=>setCanvas(false)}>{t}</a>)}
{narrow&&<button type="button" role="tab" aria-selected={canvas} className={canvas?"on":""} onClick={()=>setCanvas(true)}>{s.tabCanvas}</button>}</div>
<section ref={pane} className="sv-q" aria-label={tab==="a"?s.tabA:s.tabQ} hidden={(hide&&!narrow)||(narrow&&canvas)}>
{tab==="a"?<Article a={a} pane/>:<>
<nav className="crumbs" aria-label="Breadcrumb"><a href="#problems">{s.back}</a><span aria-hidden="true">/</span><span>{a.no.replace(/^QUESTION\s*\/\/\s*/,"Q")}</span></nav>
<label>{s.eyebrow} · {a.tag}</label><h1 id="sv-title">{a.title}</h1><p className="sv-dek">{a.dek}</p>
<p className="sv-how">{s.how}</p>
<div className="sv-body">{body.map((b,k)=><Block key={k} b={b} i={k}/>)}</div>
<div className="sv-links"><a className="sv-answer" href={`#interview-questions/${slug}`}>{s.answer} →</a>
{ch&&<a href={`#${ch.to}`}>{s.scored} →</a>}
{next&&<a href={`#problems/${next.slug}`}><small>{s.next}</small> {next.title} →</a>}</div></>}
</section>
{!narrow&&!hide&&<div className="sv-split" role="separator" aria-orientation="vertical" aria-label={s.resize} aria-valuemin={MIN} aria-valuemax={maxW()} aria-valuenow={w} tabIndex={0} onPointerDown={drag} onKeyDown={key}/>}
<div className="sv-lab">{!narrow&&<button type="button" className="sv-toggle" aria-expanded={!hide} onClick={()=>setHide(h=>!h)}>{hide?s.show:s.hide}</button>}
{showLab&&<Suspense fallback={<Loading label="Loading the Lab"/>}><Lab key={slug} problem={{id:slug,name:a.title}}/></Suspense>}</div>
</div>}
