import React,{useEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import{Part}from"../status.jsx";import{figOf}from"../figs/index.js";import{useTheme}from"../theme/mode.js";import{example}from"./site.js";import{inline}from"./text.jsx";
// Figures: fit the column (zoomed out on phones) plus a full-screen view. In portrait the
// full-screen figure is turned sideways so it uses the long side of the screen.
function FullFig({title,ar=640/372,children,onClose}){const stage=useRef(null),close=useRef(null);const[box,setBox]=useState(null);
useEffect(()=>{const page=document.getElementById("root"),prev=document.activeElement;const key=e=>e.key==="Escape"&&onClose();document.body.style.overflow="hidden";if(page)page.inert=true;document.addEventListener("keydown",key);close.current?.focus();
const fit=()=>{const r=stage.current?.getBoundingClientRect();if(!r)return;const turn=r.height>r.width*1.15;const w=turn?Math.min(r.height,r.width*ar):Math.min(r.width,r.height*ar);setBox({w,turn})};fit();addEventListener("resize",fit);
return()=>{document.body.style.overflow="";if(page)page.inert=false;document.removeEventListener("keydown",key);removeEventListener("resize",fit);prev?.focus?.()}},[]);
return createPortal(<div className="fs" role="dialog" aria-modal="true" aria-label={title}><div className="fs-head"><div className="fs-title"><b>{title}</b><span className="fs-hint">Turn your phone sideways for a bigger view</span></div><button ref={close} type="button" className="r-btn" onClick={onClose}>Close ✕</button></div><div className="fs-stage" ref={stage}>{box&&<div className="fs-fig" style={{width:box.w,transform:`translate(-50%,-50%)${box.turn?" rotate(90deg)":""}`}}>{children}</div>}</div></div>,document.body)}
// A figure that fails to draw says so in its own box; the article around it is unaffected. The boundary is keyed
// by the figure id: the next article reuses this block, and a working figure there must not inherit the failure.
const FIG_FAILED=<p className="a-fig-err">This figure couldn't be drawn. The rest of the article is fine.</p>;
// A figure's loop starts from its first step when it first comes into view (not when the page loaded, which left
// readers arriving mid-loop), and it pauses while it is off screen.
function useLoopInView(ref,still,key){useEffect(()=>{const b=ref.current;if(!b||still||typeof IntersectionObserver!=="function")return;let seen=false;
const io=new IntersectionObserver(([e])=>{const s=b.querySelector("svg");if(!s?.pauseAnimations)return;try{if(e.isIntersecting){if(!seen){seen=true;s.setCurrentTime(0)}s.unpauseAnimations()}else s.pauseAnimations()}catch{}},{threshold:.3});
io.observe(b);return()=>io.disconnect()},[still,key])}// eslint-disable-line
export function Fig({id,n,cap,still,rd}){const[full,setFull]=useState(false);const theme=useTheme();const body=useRef(null);useLoopInView(body,still,id+theme);const f=figOf(id);if(!f)return null;const C=f.C;const title=`FIG. ${String(n).padStart(2,"0")} — ${f.title(example.name.toUpperCase())}`;
return <figure className={"a-fig"+rd}><div className="a-fig-head">{title}</div><div className="a-fig-body" ref={body}><Part key={id+theme} fallback={FIG_FAILED}><C still={still}/></Part></div>
<button type="button" className="fs-btn" onClick={()=>setFull(true)}>⤢ Tap to view full screen</button><figcaption>{inline(cap)}</figcaption>{full&&<FullFig title={title} ar={f.ar} onClose={()=>setFull(false)}><Part key={id+theme} fallback={FIG_FAILED}><C still={still} uid="fs"/></Part></FullFig>}</figure>}
