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
// On a phone (≤680 px) a figure is drawn at a readable size (600 px wide, labels about 9 to 11 px instead of 5.7) and
// scrolls sideways in its frame. Its step line is shown above the frame, following the steps, so it stays readable
// while the reader pans; a fade on the right edge and a hint say there is more.
const PHONE="(max-width: 680px)";
function usePhone(){const[m,setM]=useState(()=>typeof matchMedia==="function"&&matchMedia(PHONE).matches);
useEffect(()=>{if(typeof matchMedia!=="function")return;const q=matchMedia(PHONE),on=()=>setM(q.matches);q.addEventListener("change",on);return()=>q.removeEventListener("change",on)},[]);return m}
function useStepLine(ref,on,key){const[line,setLine]=useState(null);
useEffect(()=>{if(!on){setLine(null);return}const show=x=>setLine(l=>x?(l?.t===x.textContent?l:{t:x.textContent,c:x.style.fill}):null);
const tick=()=>{const s=ref.current?.querySelector("svg");if(!s)return;const one=s.querySelector(".tk-cap");if(one)return show(one);const g=s.querySelector(".tk-caps");if(!g)return show(null);
if(s.animationsPaused?.())return;const t=g.querySelectorAll("text"),d=+g.dataset.dur||8,now=s.getCurrentTime?.()||0;show(t[Math.min(t.length-1,Math.floor((now%d)/d*t.length))])};
tick();const i=setInterval(tick,200);return()=>clearInterval(i)},[on,key]);// eslint-disable-line
return line}
export function Fig({id,n,cap,still,rd}){const[full,setFull]=useState(false);const theme=useTheme();const body=useRef(null);useLoopInView(body,still,id+theme);
const phone=usePhone(),line=useStepLine(body,phone,id+theme+still),[moved,setMoved]=useState(false),[end,setEnd]=useState(false);
const pan=e=>{const b=e.currentTarget;if(b.scrollLeft>8)setMoved(true);setEnd(b.scrollLeft+b.clientWidth>=b.scrollWidth-4)};const f=figOf(id);if(!f)return null;const C=f.C;const title=`FIG. ${String(n).padStart(2,"0")} — ${f.title(example.name.toUpperCase())}`;
return <figure className={"a-fig"+rd+(phone?" a-fig-pan":"")+(end?" at-end":"")}><div className="a-fig-head">{title}</div>{phone&&line&&<div className="a-fig-step" style={line.c?{color:line.c}:undefined} aria-hidden="true">{line.t}</div>}
<div className="a-fig-body" ref={body} onScroll={phone?pan:undefined}><Part key={id+theme} fallback={FIG_FAILED}><C still={still}/></Part></div>{phone&&!moved&&<p className="a-fig-hint" aria-hidden="true">⇆ Swipe the figure sideways to see all of it</p>}
<button type="button" className="fs-btn" onClick={()=>setFull(true)}>⤢ Tap to view full screen</button><figcaption>{inline(cap)}</figcaption>{full&&<FullFig title={title} ar={f.ar} onClose={()=>setFull(false)}><Part key={id+theme} fallback={FIG_FAILED}><C still={still} uid="fs"/></Part></FullFig>}</figure>}
