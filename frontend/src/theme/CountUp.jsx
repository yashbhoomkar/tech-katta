// A number that counts up from 0 to n over 0.8 s, easing out, once `go` is true (tech-katta-context 24, A7). Under
// reduced motion it shows n at once. Screen readers get n from the start (the moving digits are hidden from them).
import React,{useEffect,useState}from"react";import{useStill}from"./motion.js";
export default function CountUp({n,go=true}){const still=useStill();const[v,setV]=useState(still?n:0);
useEffect(()=>{if(still){setV(n);return}if(!go)return;let raf,t0;const step=t=>{t0??=t;const k=Math.min(1,(t-t0)/800);setV(Math.round(n*(1-(1-k)**3)));if(k<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[n,go,still]);
return <span className="tk-count"><span aria-hidden="true">{v}</span><span className="sr-only">{n}</span></span>}
