import React,{useEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import{Part}from"../status.jsx";import{figOf}from"../figs/index.js";import{useTheme}from"../theme/mode.js";import{useDrag,settleMs}from"../theme/gesture.js";import{example}from"./site.js";import{inline}from"./text.jsx";import{track}from"../analytics.js";import{PHONE_FIGS}from"../figs/phone.jsx";
// Figures: fit the column (zoomed out on phones) plus a full-screen view. In portrait the
// full-screen figure is turned sideways so it uses the long side of the screen.
// Swiping down on the full-screen view closes it, as in a photo viewer (tech-katta-context 24, S5).
function FullFig({title,ar=640/372,children,onClose}){const root=useRef(null),stage=useRef(null),close=useRef(null);const[box,setBox]=useState(null);
useEffect(()=>{const page=document.getElementById("root"),prev=document.activeElement;const key=e=>e.key==="Escape"&&onClose();document.body.style.overflow="hidden";if(page)page.inert=true;document.addEventListener("keydown",key);close.current?.focus();
const fit=()=>{const r=stage.current?.getBoundingClientRect();if(!r)return;const turn=r.height>r.width*1.15;const w=turn?Math.min(r.height,r.width*ar):Math.min(r.width,r.height*ar);setBox({w,turn})};fit();addEventListener("resize",fit);
return()=>{document.body.style.overflow="";if(page)page.inert=false;document.removeEventListener("keydown",key);removeEventListener("resize",fit);prev?.focus?.()}},[]);
const h=()=>root.current?.clientHeight||innerHeight,put=(d,ms)=>{const el=root.current;if(!el)return;el.style.transition=ms?`transform ${ms}ms var(--ease),opacity ${ms}ms var(--ease)`:"none";el.style.transform=d?`translateY(${d}px)`:"";el.style.opacity=d?String(Math.max(.35,1-d/h())):""};
useDrag(stage,{axis:"y",min:0,size:h,onMove:d=>put(Math.max(0,d)),onEnd:(go,d)=>{if(go===1){put(h(),settleMs(h()-d,h()));setTimeout(onClose,settleMs(h()-d,h()))}else put(0,settleMs(d,h()))}});
return createPortal(<div className="fs" ref={root} role="dialog" aria-modal="true" aria-label={title}><div className="fs-head"><div className="fs-title"><b>{title}</b><span className="fs-hint">Turn your phone sideways for a bigger view</span></div><button ref={close} type="button" className="r-btn" onClick={onClose}>Close ✕</button></div><div className="fs-stage" ref={stage}>{box&&<div className="fs-fig" style={{width:box.w,transform:`translate(-50%,-50%)${box.turn?" rotate(90deg)":""}`}}>{children}</div>}</div></div>,document.body)}
// A figure that fails to draw says so in its own box; the article around it is unaffected. The boundary is keyed
// by the figure id: the next article reuses this block, and a working figure there must not inherit the failure.
const FIG_FAILED=<p className="a-fig-err">This figure couldn't be drawn. The rest of the article is fine.</p>;
// On a phone (≤680 px) a figure is drawn at a readable size (600 px wide, labels about 9 to 11 px instead of 5.7) and
// scrolls sideways in its frame. Its step line is shown above the frame, following the steps, so it stays readable
// while the reader pans; a fade on the right edge and a hint say there is more.
const PHONE="(max-width: 680px)";
function usePhone(){const[m,setM]=useState(()=>typeof matchMedia==="function"&&matchMedia(PHONE).matches);
useEffect(()=>{if(typeof matchMedia!=="function")return;const q=matchMedia(PHONE),on=()=>setM(q.matches);q.addEventListener("change",on);return()=>q.removeEventListener("change",on)},[]);return m}
// The figure's clock (tech-katta-context 24, A1/S2). A figure written with Caps has n equal steps over a loop of d
// seconds (`tk-caps`, data-dur). Its loop starts from step 1 when it first comes into view (not when the page loaded,
// which left readers arriving mid-loop) and pauses while it is off screen. The reader can pause it and step through it:
// go(k) pauses the SVG clock just after step k has faded in (SMIL setCurrentTime), so every Caps figure can be stepped
// with no change to its file. A figure the reader paused stays paused, also after scrolling away and back.
// Returns {n, i, t (the step's caption), c (its colour), held, go, toggle}; n is 0 for figures without steps, and a
// figure with one caption (`tk-cap`) gives n 1 and its text (the phone step line shows it).
// Which figures play: one at least 30 % in view plays; on phones only the one most in view (the higher one on a tie),
// so a cheap phone never runs two SMIL loops and their glints at once (tech-katta-context 24 §4.3).
const FIGS=new Set();
function arbitrate(){const phone=typeof matchMedia==="function"&&matchMedia(PHONE).matches;let best=null;
for(const f of FIGS){f.on=f.r>=.3&&!phone;if(!phone||f.r<.3)continue;if(!best||f.r>best.r+.01||(Math.abs(f.r-best.r)<=.01&&f.el.getBoundingClientRect().top<best.el.getBoundingClientRect().top))best=f}if(best)best.on=true}
function useSteps(ref,still,key,fig){const[st,setSt]=useState({n:0,i:0,t:null,c:null,held:false});const held=useRef(false),sent=useRef(false);
// fig_step: once per figure per page view, how the reader first stepped or paused it (spec 24 §11.5)
const note=via=>{if(sent.current||!via)return;sent.current=true;track("fig_step",{fig,via})};
const svg=()=>ref.current?.querySelector("svg"),read=(s,i)=>{const g=s?.querySelector(".tk-caps");if(!g){const one=s?.querySelector(".tk-cap");return one?{n:1,i:0,t:one.textContent,c:one.style.fill}:{n:0,i:0,t:null,c:null}}
const t=g.querySelectorAll("text"),d=+g.dataset.dur||8,n=t.length;if(i==null)i=Math.min(n-1,Math.floor(((s.getCurrentTime?.()||0)%d)/d*n));return{n,i,t:t[i]?.textContent??null,c:t[i]?.style.fill||null}};
const show=(x,h=held.current)=>setSt(o=>o.n===x.n&&o.i===x.i&&o.t===x.t&&o.held===h?o:{...x,held:h});
useEffect(()=>{held.current=false;sent.current=false;show({n:0,i:0,t:null,c:null},false);const b=ref.current;if(!b)return;let seen=false,io=null;const me={el:b,r:0,on:false};
if(!still){FIGS.add(me);if(typeof IntersectionObserver==="function"){io=new IntersectionObserver(([e])=>{me.r=e.isIntersecting?e.intersectionRatio:0;arbitrate()},{threshold:[0,.3,.5,.7,.9,1]});io.observe(b)}else{me.r=1;arbitrate()}}
// the figure's code loads after the article, so its SVG can appear after the observer's first answer: the clock is
// applied here, every 200 ms: a figure that should play starts (from step 1 the first time) or resumes, unless the
// reader paused it; any other is paused
let known=false;const tick=()=>{const s=svg();if(!s)return;if(still){show(read(s));clearInterval(iv);return}if(!known){known=true;show(read(s))}if(!s.pauseAnimations)return;const paused=s.animationsPaused?.();
try{if(!me.on){if(!paused)s.pauseAnimations();return}if(!seen){seen=true;if(!held.current){s.setCurrentTime(0);s.unpauseAnimations()}}else if(paused&&!held.current)s.unpauseAnimations()}catch{}
if(held.current||s.animationsPaused?.())return;show(read(s))};
const iv=setInterval(tick,200);tick();
return()=>{io?.disconnect();clearInterval(iv);FIGS.delete(me);arbitrate()}},[still,key]);// eslint-disable-line
const go=(k,via)=>{note(via);const s=svg(),g=s?.querySelector(".tk-caps");if(!g||!s.pauseAnimations)return;const n=g.querySelectorAll("text").length,d=+g.dataset.dur||8;k=Math.max(0,Math.min(n-1,k));
try{s.pauseAnimations();s.setCurrentTime(k*d/n+Math.min(.3,d/n/2))}catch{}held.current=true;show(read(s,k),true)};
const toggle=via=>{note(via);const s=svg();if(!s?.pauseAnimations)return;try{if(held.current){held.current=false;s.unpauseAnimations();show(read(s),false)}else{s.pauseAnimations();held.current=true;show(read(s),true)}}catch{}};
return{...st,go,toggle}}
// The step controls under the figure's head: back, pause or play, next, and a dot per step filling left to right.
// On phones the step line above them can also be swiped sideways: left for the next step, right for the one before.
function StepBar({s,phone,still}){const top=useRef(null),line=useRef(null);const many=s.n>1&&!still;
const put=(d,ms)=>{const el=line.current;if(!el)return;el.style.transition=ms?`transform ${ms}ms var(--ease)`:"none";el.style.transform=d?`translateX(${d}px)`:""};
useDrag(top,{on:phone&&many,axis:"x",min:s.i>=s.n-1?0:-Infinity,max:s.i<=0?0:Infinity,onMove:d=>put(d),onEnd:(go,d)=>{const w=top.current?.clientWidth||300;put(0,settleMs(d,w));if(go)s.go(s.i-go,"swipe")}});
const key=e=>{if(e.key==="ArrowLeft"){e.preventDefault();s.go(s.i-1,"key")}else if(e.key==="ArrowRight"){e.preventDefault();s.go(s.i+1,"key")}};
if(!many&&!(phone&&s.t))return null;
return <div className={"a-fig-top"+(many&&phone?" a-fig-swipe":"")} ref={top}>{phone&&s.t&&<div className="a-fig-step" ref={line} style={s.c?{color:s.c}:undefined} aria-hidden="true">{s.t}</div>}
{many&&<div className="a-fig-ctl" role="group" aria-label="Figure steps" onKeyDown={key}><button type="button" className="a-fig-b" aria-label="Previous step" disabled={s.i<=0} onClick={()=>s.go(s.i-1,"button")}>‹</button>
<button type="button" className="a-fig-b" aria-label={s.held?"Play the figure":"Pause the figure"} aria-pressed={s.held} onClick={()=>s.toggle("button")}>{s.held?<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>:<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor"/></svg>}</button>
<button type="button" className="a-fig-b" aria-label="Next step" disabled={s.i>=s.n-1} onClick={()=>s.go(s.i+1,"button")}>›</button>
<span className="a-fig-dots" aria-hidden="true">{Array.from({length:s.n},(_,k)=><i key={k} className={k<s.i?"on":k===s.i?"on cur":undefined}/>)}</span>
<span className="a-fig-n">Step {s.i+1} of {s.n}</span><span className="sr-only" aria-live="polite">{s.held?`Step ${s.i+1} of ${s.n}: ${s.t||""}`:""}</span></div>}</div>}
export function Fig({id,n,cap,still,rd}){const[full,setFull]=useState(false);const theme=useTheme();const body=useRef(null);
const phone=usePhone(),steps=useSteps(body,still,id+theme+still+(phone?"p":""),id),[moved,setMoved]=useState(false),[end,setEnd]=useState(false);
const pan=e=>{const b=e.currentTarget;if(b.scrollLeft>8)setMoved(true);setEnd(b.scrollLeft+b.clientWidth>=b.scrollWidth-4)};const f=figOf(id);if(!f)return null;const P=phone?PHONE_FIGS[id]:null,C=P?P.C:f.C;/* phones: a portrait version where there is one (figs/phone.jsx) */const title=`FIG. ${String(n).padStart(2,"0")} — ${f.title(example.name.toUpperCase())}`;
return <figure className={"a-fig"+rd+(phone?" a-fig-pan":"")+(P?" a-fig-portrait":"")+(end?" at-end":"")}><div className="a-fig-head">{title}</div><StepBar s={steps} phone={phone} still={still}/>
<div className="a-fig-body" ref={body} onScroll={phone?pan:undefined}><Part key={id+theme+(P?"p":"")} fallback={FIG_FAILED}><C still={still}/></Part></div>{phone&&!P&&!moved&&<p className="a-fig-hint" aria-hidden="true">⇆ Swipe the figure sideways to see all of it</p>}
<button type="button" className="fs-btn" onClick={()=>setFull(true)}>⤢ Tap to view full screen</button><figcaption>{inline(cap)}</figcaption>{full&&<FullFig title={title} ar={f.ar} onClose={()=>setFull(false)}><Part key={id+theme} fallback={FIG_FAILED}><C still={still} uid="fs"/></Part></FullFig>}</figure>}
