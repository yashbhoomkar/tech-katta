// The AWS credit (owner: "It was looking cool. Also replenish it for every run/submit/ask the interviewer"): every
// Run, Submit and Ask the interviewer starts with a fresh $200,000 of virtual credit. The tests of a run spend it one
// after another, at the design's real cost (the simulator's per-tick `timeline.spend`, eval/simulate.js), so the
// results count it down to what is left, and ▶ Replay drains it minute by minute from where that test began.
import React,{useEffect,useRef,useState}from"react";
import{CREDIT,money}from"./credit.js";export{CREDIT,ledger,spentBy,money,lasts}from"./credit.js";
const calm=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
// The meter: a number that counts down from the start to the balance (1.4 s; at once under reduced motion), a bar,
// and a line under it. `label` names what spent it.
export function CreditMeter({from=CREDIT,to,label,note,topped,ms=1400}){const[v,setV]=useState(calm()?to:from);const raf=useRef(0);
useEffect(()=>{if(calm()){setV(to);return}const t0=performance.now(),d=ms,e=x=>1-Math.pow(1-x,3);cancelAnimationFrame(raf.current);
const step=now=>{const x=Math.min(1,(now-t0)/d);setV(from+(to-from)*e(x));if(x<1)raf.current=requestAnimationFrame(step)};raf.current=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf.current)},[from,to,ms]);
return <div className={"sv-credit"+(topped?" topped":"")} role="group" aria-label={`AWS credit: ${money(to)} of ${money(CREDIT,false)} left`}>
<div className="sv-credit-top"><span className="sv-credit-k">AWS CREDIT{topped?" · TOPPED UP":""}</span><b className="sv-credit-v">{money(v)}</b><span className="sv-credit-of">of {money(CREDIT,false)}</span></div>
<div className="sv-credit-bar" aria-hidden="true"><i style={{transform:`scaleX(${Math.max(0,v)/CREDIT})`}}/><em style={{left:`${100*Math.max(0,to)/CREDIT}%`,width:`${Math.max(.6,100*(from-to)/CREDIT)}%`}}/></div>
{(label||note)&&<small>{label}{note?<> · {note}</>:null}</small>}</div>}
