// Practice mode: answer an Interview Question yourself against the 45-minute clock before reading ours.
// Full screen over the article, so the worked answer stays hidden; the six steps from "How to answer"
// with their minutes and a short checklist each (copy in site.json "practice"). At the end: time used per
// step against its budget, a "practised" flag in progress (steps["practice:<slug>"]), back to the article.
import React,{useEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import{markStep}from"./progress.js";import"./practice.css";

const mmss=s=>{const n=Math.round(Math.abs(s));return`${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`};

export default function Practice({p,a,onClose}){const steps=p.steps,total=steps.reduce((t,s)=>t+s.minutes*60,0);
const[i,setI]=useState(0),[run,setRun]=useState(true),[spent,setSpent]=useState(()=>steps.map(()=>0)),[done,setDone]=useState(false),[ticked,setTicked]=useState({});
const box=useRef(null),first=useRef(null),used=spent.reduce((x,y)=>x+y,0);
useEffect(()=>{if(!run||done)return;const id=setInterval(()=>setSpent(sp=>sp.map((v,k)=>k===i?v+1:v)),1000);return()=>clearInterval(id)},[run,done,i]);
useEffect(()=>{const page=document.getElementById("root"),prev=document.activeElement;document.body.style.overflow="hidden";if(page)page.inert=true;first.current?.focus();
const k=e=>{if(e.key==="Escape")onClose()};document.addEventListener("keydown",k);
return()=>{document.body.style.overflow="";if(page)page.inert=false;document.removeEventListener("keydown",k);prev?.focus?.()}},[]);// eslint-disable-line
const trap=e=>{if(e.key!=="Tab")return;const f=[...box.current.querySelectorAll("button:not(:disabled),input")];if(!f.length)return;const at=f.indexOf(document.activeElement);if(e.shiftKey&&at<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&at===f.length-1){e.preventDefault();f[0].focus()}};
const finish=()=>{setDone(true);setRun(false);markStep("practice:"+a.slug)};
const s=steps[i],left=s.minutes*60-spent[i];
return createPortal(<div className="pr" role="dialog" aria-modal="true" aria-labelledby="pr-t" ref={box} onKeyDown={trap}>
<div className="pr-head"><div><span className="pr-eyebrow">{p.title}</span><b id="pr-t">{a.title}</b></div><button ref={first} type="button" className="r-btn" onClick={onClose}>{p.close} ✕</button></div>
{done?<div className="pr-body"><h2>{p.doneTitle}</h2><p className="pr-text">{p.doneText}</p>
<table className="pr-sum"><thead><tr><th scope="col">{p.step}</th><th scope="col">{p.planned}</th><th scope="col">{p.used}</th></tr></thead>
<tbody>{steps.map((x,k)=><tr key={x.name} className={spent[k]>x.minutes*60?"over":""}><td>{x.name}</td><td>{x.minutes} min</td><td>{mmss(spent[k])}</td></tr>)}</tbody></table>
{(()=>{const left=steps.map((x,k)=>({name:x.name,items:x.checks.filter((_,j)=>!ticked[k+"-"+j])})).filter(x=>x.items.length);
return left.length?<div className="pr-missed"><h3>{p.missed}</h3>{left.map(x=><div key={x.name}><b>{x.name}</b><ul>{x.items.map(c=><li key={c}>{c}</li>)}</ul></div>)}</div>:<p className="pr-text">{p.allTicked}</p>})()}
<button type="button" className="pr-go" onClick={onClose}>{p.compare} →</button></div>
:<div className="pr-body">
<p className="pr-prompt">{a.dek}</p>
<div className="pr-clock"><span className={used>total?"over":""}>{used>total?"+"+mmss(used-total):mmss(total-used)}</span><small>{used>total?p.overAll:p.left}</small>{!run&&<em>{p.paused}</em>}</div>
<ol className="pr-steps" aria-label={p.stepsLabel}>{steps.map((x,k)=><li key={x.name} className={k<i?"done":k===i?"now":""} style={{flexGrow:x.minutes}} aria-current={k===i?"step":undefined}><b>{k+1}</b><span>{x.name}</span></li>)}</ol>
<h2>{i+1}. {s.name}<small>{s.minutes} min · <span className={left<0?"over":""}>{left<0?`${mmss(left)} ${p.over}`:`${mmss(left)} ${p.stepLeft}`}</span></small></h2>
<ul className="pr-checks">{s.checks.map((c,k)=>{const id=i+"-"+k;return <li key={id}><label><input type="checkbox" checked={!!ticked[id]} onChange={e=>setTicked(m=>({...m,[id]:e.target.checked}))}/><span>{c}</span></label></li>})}</ul>
<div className="pr-act"><button type="button" className="pr-ghost" onClick={()=>setRun(r=>!r)}>{run?p.pause:p.resume}</button>{i<steps.length-1?<button type="button" className="pr-go" onClick={()=>setI(i+1)}>{p.next} →</button>:<button type="button" className="pr-go" onClick={finish}>{p.finish}</button>}</div>
</div>}</div>,document.body)}
