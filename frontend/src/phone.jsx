// The phone workspace's shared parts (tech-katta-context 53 §5): which screens count as a phone, and the bottom sheets.
// One sheet is open at a time; opening another closes the first. Android's and the browser's Back closes the open sheet before it
// leaves the page: a sheet takes one history entry (the site's router ignores an entry that keeps the address) and gives it back
// when it closes by itself.
import"./phone.css";import React,{useEffect,useRef,useState}from"react";import{useDrag}from"./theme/gesture.js";
export const PHONE_Q="(max-width:900px)";
export const isPhone=()=>typeof matchMedia!=="undefined"&&matchMedia(PHONE_Q).matches;
export function usePhone(){const[p,set]=useState(isPhone);useEffect(()=>{if(typeof matchMedia==="undefined")return;const m=matchMedia(PHONE_Q),f=()=>set(m.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);return p}
let active=null,ignore=0,later=null;
// closing a sheet that holds a history entry goes Back, and that arrives later (popstate): a sheet opened in the meantime waits for it before it takes its own entry
const push=name=>{try{history.pushState({...(history.state||{}),tkSheet:name},"")}catch{}};
export const sheets={
open(name,close){if(active&&active.name!==name){const was=active;active={name,close};if(!ignore)try{history.replaceState({...(history.state||{}),tkSheet:name},"")}catch{}else later=name;was.close();return}
if(active){active.close=close;return}active={name,close};if(ignore)later=name;else push(name)},
shut(name){if(!active||active.name!==name)return;active=null;later=null;if(history.state?.tkSheet){ignore++;setTimeout(()=>{if(ignore){ignore=0;later=null}},700);try{history.back()}catch{ignore--}}},
has:()=>!!active};
if(typeof addEventListener!=="undefined")addEventListener("popstate",()=>{if(ignore){ignore--;if(!ignore&&later){const n=later;later=null;if(active&&active.name===n)push(n)}return}if(active){const a=active;if(history.state?.tkSheet===a.name)return;/* the Report popup's own entry was popped: this sheet's is still there */active=null;a.close()}});
/** a bottom sheet: a handle you drag (down closes, up opens it full), a visible ✕, a tap outside closes. height: "half" or "tall" (the parts) */
export function Sheet({name,open,onClose,title,height="half",className="",children}){
const close=useRef(onClose);close.current=onClose;const[dy,setDy]=useState(0),[full,setFull]=useState(false),g=useRef(null);
useEffect(()=>{if(!open){setFull(false);setDy(0);return}sheets.open(name,()=>close.current());return()=>sheets.shut(name)},[open,name]);
useEffect(()=>{if(!open)return;const k=e=>{if(e.key==="Escape")close.current()};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[open]);
if(!open)return null;
const down=e=>{e.currentTarget.setPointerCapture?.(e.pointerId);g.current={y:e.clientY,t:e.timeStamp}};
const move=e=>{if(g.current)setDy(Math.max(-160,e.clientY-g.current.y))};
const up=e=>{const s=g.current;g.current=null;if(!s)return;const d=e.clientY-s.y,v=d/Math.max(1,e.timeStamp-s.t);setDy(0);if(d>90||v>.6)full&&d<200?setFull(false):close.current();else if(d<-50)setFull(true)};
return <div className="ph-back" onPointerDown={e=>{if(e.target===e.currentTarget)close.current()}}><div className={"ph-sheet "+height+(full?" full":"")+(className?" "+className:"")} role="dialog" aria-modal="true" aria-label={title} style={dy?{transform:`translateY(${Math.max(0,dy)}px)`,transition:"none"}:undefined}>
<div className="ph-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{g.current=null;setDy(0)}}><i aria-hidden="true"/></div>
<div className="ph-sh-head"><b>{title}</b><button type="button" className="ph-x" onClick={()=>close.current()} aria-label={"Close "+title.toLowerCase()}>✕</button></div>
<div className="ph-sh-body">{children}</div></div></div>}

/** ← goes Back when pages of this site came before this one (app.js counts them), else to `to` */
export const goBack=to=>{if(window.tkSpa>0)history.back();else if(window.tkGo)window.tkGo(to);else location.assign(to)};
/** The focus screen the challenges and the sandbox share with the problem workspace (solve.jsx has its own copy of the same layout):
 *  a header (back, title, the one primary action, ⋯), the views one at a time with a switch at the bottom, a replay in full screen.
 *  views: the ids from "problem" · "design" · "results"; `problem` and `results` are what those views hold, `children` the canvas. */
export function PhoneFrame({cls="",title,back="/problems",runLabel,onRun,runDisabled,busy,dot,views,view,setView,badge=0,replay,exitReplay,problem,start,results,menu,menuOpen,setMenuOpen,children}){
const head=useRef(null),names={problem:"Problem",design:"Design",results:"Results"};
useDrag(head,{axis:"x",on:true,onEnd:go=>{if(!go)return;const n=views[views.indexOf(view)-go];if(n)setView(n)}});
return <div className={"solve ph "+cls+" pv-"+view+(replay?" pv-replay":"")}>
<div className="ph-head sv-pbar" ref={head}><a className="ph-back-btn" href={back} aria-label="Back" onClick={e=>{e.preventDefault();goBack(back)}}>←</a><b className="sv-ptitle">{title}</b>
{onRun&&<button type="button" className="sv-run ph-run" disabled={runDisabled||busy} onClick={onRun}>{busy?<i className="ph-spin" aria-hidden="true"/>:null}{runLabel}{dot&&!busy?<i className="ph-dot" aria-hidden="true"/>:null}</button>}
<button type="button" className="ph-more" aria-label="More" onClick={()=>setMenuOpen(true)}>⋯</button></div>
{problem&&<div className="ph-prob"><section className="sv-q" aria-label="The problem">{problem}</section>{start}</div>}
<div className="sv-lab">{children}{results&&<div className="ph-resv">{results}</div>}{replay&&<button type="button" className="ph-rx" onClick={exitReplay} aria-label="Close the replay">✕</button>}</div>
<nav className="ph-sw" aria-label="Workspace views">{views.map(id=><button key={id} type="button" aria-pressed={view===id} className={view===id?"on":""} onClick={()=>setView(id)}>{names[id]}{id==="results"&&badge>0&&<span className="ph-badge" aria-label={badge+" to fix"}>{badge}</span>}</button>)}</nav>
<Sheet name="menu" open={menuOpen} onClose={()=>setMenuOpen(false)} title="More" height="half"><div className="ph-menu">{menu}</div></Sheet></div>}
