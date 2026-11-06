// Solve: one Interview Question as a problem to design, LeetCode-style. The question (its requirements
// and numbers, the article's sections "1." and "2.") sits on the left; the Lab canvas with every
// component sits on the right, opened on this question's own design (Lab `problem`). The worked answer,
// the scored Lab challenge and the next problem are links under the question. Copy: site.json
// problems.solve. Route: #problems/<slug>.
import React,{Suspense,useEffect,useState}from"react";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import"./solve.css";

// The question part of an Interview Question: from its "1. …" heading up to its "3. …" heading.
export const statement=body=>{const h=body.map((b,i)=>b.t==="h2"?[i,b.x]:null).filter(Boolean);const a=h.find(([,x])=>/^1\./.test(x)),z=h.find(([,x])=>/^3\./.test(x));
return a?body.slice(a[0],z&&z[0]>a[0]?z[0]:undefined).filter(b=>b.t!=="fig"&&b.t!=="lab"):[]};

export default function Solve({slug,s,articles,Block,Lab}){
const[st,set]=useState({}),[hide,setHide]=useState(false);
const load=()=>{set({});getJSON(`/v1/articles/${slug}`).then(a=>set({a}),e=>set({err:e.status===404?"missing":"failed"}))};useEffect(load,[slug]);
const qs=articles.filter(x=>x.section==="interview-questions"&&x.group!=="start"),i=qs.findIndex(x=>x.slug===slug),next=qs[i+1];
if(st.err)return <section className="d-panel">{st.err==="missing"?<p className="d-desc">{s.missing} <a href="#problems">{s.back}</a></p>:<LoadError what="this problem" retry={load}/>}</section>;
if(!st.a)return <section className="d-panel"><Loading label={qs[i]?.title}/></section>;
const a=st.a,body=statement(a.body),ch=a.body.find(b=>b.t==="lab"&&/^lab\/./.test(b.to));
return <div className={"solve"+(hide?" hide":"")}>
<section className="sv-q" aria-labelledby="sv-title" hidden={hide}>
<nav className="crumbs" aria-label="Breadcrumb"><a href="#problems">{s.back}</a><span aria-hidden="true">/</span><span>{a.no.replace(/^QUESTION\s*\/\/\s*/,"Q")}</span></nav>
<label>{s.eyebrow} · {a.tag}</label><h1 id="sv-title">{a.title}</h1><p className="sv-dek">{a.dek}</p>
<p className="sv-how">{s.how}</p>
<div className="sv-body">{body.map((b,k)=><Block key={k} b={b} i={k}/>)}</div>
<div className="sv-links"><a className="sv-answer" href={`#interview-questions/${slug}`}>{s.answer} →</a>
{ch&&<a href={`#${ch.to}`}>{s.scored} →</a>}
{next&&<a href={`#problems/${next.slug}`}><small>{s.next}</small> {next.title} →</a>}</div>
</section>
<div className="sv-lab"><button type="button" className="sv-toggle" aria-expanded={!hide} onClick={()=>setHide(h=>!h)}>{hide?s.show:s.hide}</button>
<Suspense fallback={<Loading label="Loading the Lab"/>}><Lab key={slug} problem={{id:slug,name:a.title}}/></Suspense></div>
</div>}
