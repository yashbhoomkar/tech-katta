// "Back to top" (the reviewer: after scrolling all the way down, nobody should have to scroll back up by hand).
// Appears once the page has scrolled well past the first screen; a smooth scroll to the top (instant under reduced
// motion), then focus moves to the top of the page so keyboard and screen-reader users land there too.
import React,{useEffect,useState}from"react";import"./totop.css";
export function ToTop({label="Back to top"}){const[on,setOn]=useState(false);
useEffect(()=>{let raf=0;const f=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>setOn(scrollY>Math.max(600,innerHeight*1.2)))};f();addEventListener("scroll",f,{passive:true});addEventListener("resize",f);return()=>{cancelAnimationFrame(raf);removeEventListener("scroll",f);removeEventListener("resize",f)}},[]);
const go=()=>{const still=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;scrollTo({top:0,behavior:still?"auto":"smooth"});const t=document.querySelector("main,#root");if(t){if(!t.hasAttribute("tabindex"))t.setAttribute("tabindex","-1");t.focus({preventScroll:true})}};
return <button type="button" className={"to-top"+(on?" on":"")} onClick={go} aria-label={label} title={label} tabIndex={on?0:-1} aria-hidden={!on}>
<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
