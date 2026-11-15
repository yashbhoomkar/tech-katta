// An article as topic cards (tech-katta-context 27, the owner, 2026-11-13: "a lot of textual content in every topic …
// when you open an article there should be animation cards for every topic; on tapping the card the pop-up will have
// limited textual content"). One card per section (h2), plus one for the example system when the article opens with it.
// Each card moves: the section's first figure, playing, or a small animation of what the section holds (component types,
// a table, code, a list, or a request travelling between boxes). A tap opens the topic in a sheet: the picture, up to
// three key points (the section's `gist` when content has one, else the first sentence of its first paragraphs and list
// items), and the full section one tap away. Previous and Next, the arrow keys, or a sideways swipe move between topics;
// Esc, the close button, the backdrop or (phones) a downward drag close it. Nothing is lost: "Full text" shows the article
// as before.
import React,{useEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import{Part}from"../status.jsx";
import{figOf}from"../figs/index.js";import{useTheme}from"../theme/mode.js";import{useDrag,settleMs}from"../theme/gesture.js";
import{track}from"../analytics.js";import{example}from"./site.js";import{inline}from"./text.jsx";import{Block}from"./blocks.jsx";import{Fig,useSteps,usePhone}from"./figure.jsx";

// ----- topics and their key points -----
const plain=x=>String(x||"").replace(/\s+/g," ").trim();
// the first sentence, cut to `max` words; a code span cut in half loses its opening backtick
// the first sentence; a long one is cut at its last pause (comma, semicolon, colon, dash) before `max` words, else at
// `max` words with "…"; a code span cut in half loses its opening backtick
export function firstSentence(x,max=24){const t=plain(x),m=t.match(/^(.+?[.!?])(?=\s+["'(`₹A-Z0-9]|\s*$)/);let s=m?m[1]:t;const w=s.split(" ");
if(w.length>max){const head=w.slice(0,max).join(" "),open=i=>(head.slice(0,i).match(/\(/g)||[]).length>(head.slice(0,i).match(/\)/g)||[]).length;
let cut=-1;for(const sep of[", ","; ",": "," — "])for(let i=head.indexOf(sep);i>=0;i=head.indexOf(sep,i+1))if(i>cut&&!open(i))cut=i;
s=cut>40?head.slice(0,cut)+".":head.replace(/[,;:(]$/,"")+"…"}if((s.match(/`/g)||[]).length%2)s=s.replace(/`([^`]*)$/,"$1");return s}
const pointsFrom=bs=>{const out=[];for(const{b}of bs){if(out.length>=3)break;
if(b.t==="p")out.push(firstSentence(b.x));else if(b.t==="list")out.push(...b.items.filter(x=>typeof x==="string").map(x=>firstSentence(x)));
else if(b.t==="type")out.push(`${b.name}: ${firstSentence(b.what,20)}`);else if(b.t==="table"&&b.rows?.length)out.push(`${b.label||b.head[0]}: ${b.rows.slice(0,4).map(r=>r[0]).join(", ")}${b.rows.length>4?"…":""}`);
else if(b.t==="code"&&b.label)out.push(b.label)}return out.slice(0,3)};
// What the card's picture is, from what the section holds.
const kindOf=bs=>{const t=new Set(bs.map(x=>x.b.t));return t.has("fig")?"fig":t.has("example")?"example":t.has("type")?"types":t.has("table")?"table":t.has("code")?"code":t.has("list")?"list":"flow"};
export function topicsOf(a){const out=[];let cur=null;const head=[];
a.body.forEach((b,i)=>{if(b.t==="h2"){cur={title:b.x,at:i,gist:Array.isArray(b.gist)?b.gist:null,blocks:[]};out.push(cur)}else if(cur)cur.blocks.push({b,i});else head.push({b,i})});
return out.filter(t=>t.blocks.some(x=>x.b.t!=="h3")).map(t=>{const fig=t.blocks.find(x=>x.b.t==="fig");const pts=t.gist||pointsFrom(t.blocks);
return{...t,fig,kind:kindOf(t.blocks),points:pts,hook:pts[0]?firstSentence(pts[0],16):""}})}

// ----- the moving pictures -----
// A figure on a card: drawn small, played by the figures' own clock (paused off screen). Phones play one figure at a
// time, which would leave the other cards blank, so there a card shows the finished drawing and the open topic plays.
function CardFig({id,still:s}){const box=useRef(null);const theme=useTheme(),phone=usePhone(),still=s||phone;useSteps(box,still,"c"+id+theme+still,id);const f=figOf(id);if(!f)return null;const C=f.C;
return <span className="tc-fig" ref={box}><Part key={id+theme} fallback={null}><C still={still} uid={"c"+id}/></Part></span>}
// A small animation for a section without a figure, built from what it holds. CSS only; still under reduced motion.
export function Motif({t,big}){const bs=t.blocks.map(x=>x.b),cls="tm tm-"+t.kind+(big?" tm-big":"");
if(t.kind==="types"){const names=bs.filter(b=>b.t==="type").map(b=>b.name).slice(0,big?6:4);return <span className={cls} aria-hidden="true">{names.map((n,k)=><i key={n} style={{"--k":k}}>{n}</i>)}</span>}
if(t.kind==="table"){const tb=bs.find(b=>b.t==="table"),cols=tb.head.slice(0,3),rows=tb.rows.slice(0,big?5:3);
return <span className={cls} aria-hidden="true"><span className="tm-row tm-th">{cols.map(h=><b key={h}>{h}</b>)}</span>{rows.map((r,k)=><span key={k} className="tm-row" style={{"--k":k}}>{cols.map((_,j)=><i key={j}>{big?r[j]:""}</i>)}</span>)}</span>}
if(t.kind==="code"){const cd=bs.find(b=>b.t==="code"),lines=String(cd.x).split("\n").filter(x=>x.trim()).slice(0,big?8:4);
return <span className={cls} aria-hidden="true">{lines.map((l,k)=><code key={k} style={{"--k":k}}>{l.length>40?l.slice(0,39)+"…":l}</code>)}<i className="tm-caret"/></span>}
if(t.kind==="list"){const n=Math.max(3,Math.min(4,bs.find(b=>b.t==="list").items.length));return <span className={cls} aria-hidden="true">{Array.from({length:n},(_,k)=><span key={k} className="tm-li" style={{"--k":k,"--w":`${88-((k*23)%40)}%`}}><b/><i/></span>)}</span>}
if(t.kind==="example"){const parts=(example?.parts||[]).slice(0,3).map(p=>p[0]);return <span className={cls} aria-hidden="true"><b className="tm-hub">{example?.name}</b>{parts.map((p,k)=><i key={p} style={{"--k":k}}>{p}</i>)}</span>}
const n=2+(t.at>0?t.at%3:1);return <span className={cls} aria-hidden="true">{Array.from({length:n},(_,k)=><i key={k} style={{"--k":k}}/>)}<b className="tm-dot" style={{"--n":n}}/></span>}

// ----- the cards -----
export function TopicCards({ts,locked=[],lockText,onLocked,still,onOpen}){const list=useRef(null);
// pictures move only while their card is on screen
useEffect(()=>{const el=list.current;if(!el||typeof IntersectionObserver!=="function")return;const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle("in",e.isIntersecting)),{rootMargin:"60px"});el.querySelectorAll(".tc").forEach(x=>io.observe(x));return()=>io.disconnect()},[ts]);
return <ol className="tc-grid" ref={list}>{ts.map((t,k)=><li key={t.at}><button type="button" className={"tc"+(typeof IntersectionObserver!=="function"?" in":"")} onClick={()=>onOpen(k,"card")} aria-haspopup="dialog">
<span className="tc-pic">{t.fig?<CardFig id={t.fig.b.id} still={still}/>:<Motif t={t}/>}</span>
<span className="tc-t"><small>{String(k+1).padStart(2,"0")}</small><b>{t.title}</b>{t.hook&&<span className="tc-hook">{inline(t.hook)}</span>}<em>Open</em></span></button></li>)}
{locked.map((t,k)=><li key={t.at}><button type="button" className="tc tc-locked in" onClick={onLocked} aria-label={`${t.title}: ${lockText||"Sign in to read"}`}>
<span className="tc-pic"><Motif t={{...t,kind:"flow"}}/><span className="tc-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span></span>
<span className="tc-t"><small>{String(ts.length+k+1).padStart(2,"0")}</small><b>{t.title}</b><em>{lockText||"Sign in to read"}</em></span></button></li>)}</ol>}

// ----- the sheet -----
export function TopicSheet({ts,n,setN,onClose,still,fn,cut=-1,cutText,onLocked}){const t=ts[n];const root=useRef(null),grab=useRef(null),text=useRef(null),scroll=useRef(null),close=useRef(null);const[full,setFull]=useState(false);
const go=(k,via)=>{if(k<0||k>=ts.length)return;setN(k);track("topic_open",{n:k+1,via})};
useEffect(()=>{setFull(false);if(scroll.current)scroll.current.scrollTop=0},[n]);
useEffect(()=>{const page=document.getElementById("root"),prev=document.activeElement;document.body.style.overflow="hidden";if(page)page.inert=true;close.current?.focus();
return()=>{document.body.style.overflow="";if(page)page.inert=false;prev?.focus?.()}},[]);
useEffect(()=>{const key=e=>{if(e.key==="Escape")onClose();else if(e.key==="ArrowRight"&&!e.target.closest?.(".a-fig-ctl"))go(n+1,"key");else if(e.key==="ArrowLeft"&&!e.target.closest?.(".a-fig-ctl"))go(n-1,"key")};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key)},[n]);// eslint-disable-line
// phones: drag the sheet's head down to close it; swipe the text sideways for the next or previous topic
const h=()=>root.current?.clientHeight||innerHeight,put=(el,p,ms)=>{if(!el)return;el.style.transition=ms?`transform ${ms}ms var(--ease)`:"none";el.style.transform=p||""};
useDrag(grab,{axis:"y",min:0,size:h,onMove:d=>put(root.current,`translateY(${Math.max(0,d)}px)`),onEnd:(g,d)=>{if(g===1){const ms=settleMs(h()-d,h());put(root.current,`translateY(${h()}px)`,ms);setTimeout(onClose,ms)}else put(root.current,"",settleMs(d,h()))}});
useDrag(text,{axis:"x",min:n>=ts.length-1?0:-Infinity,max:n<=0?0:Infinity,onMove:d=>put(text.current,`translateX(${d}px)`),onEnd:(g,d)=>{const w=text.current?.clientWidth||320;put(text.current,"",settleMs(d,w));if(g)go(n-g,"swipe")}});
const rest=t.blocks.filter(x=>x!==t.fig&&x.b.t!=="h2");const labs=t.blocks.filter(x=>x.b.t==="lab");
return createPortal(<><div className="ts-scrim" onClick={onClose}/><div className={"ts"+(full?" full":"")} ref={root} role="dialog" aria-modal="true" aria-labelledby="ts-t">
<div className="ts-head" ref={grab}><span className="ts-grab" aria-hidden="true"/><span className="ts-n">{n+1} of {ts.length}</span><button ref={close} type="button" className="ts-x" aria-label="Close" onClick={onClose}>✕</button></div>
<div className="ts-scroll" ref={scroll}><h2 id="ts-t">{t.title}</h2>
<div className="ts-pic">{t.fig?<Fig key={t.fig.i} id={t.fig.b.id} n={fn?.[t.fig.i]??1} cap={t.fig.b.cap} still={still} rd=""/>:<Motif key={n} t={t} big/>}</div>
<div className="ts-text" ref={text}>{t.points.length>0&&<ul className="ts-points">{t.points.map((p,k)=><li key={k} style={{"--k":k}}>{inline(p)}</li>)}</ul>}
{labs.map(({b,i})=><a key={i} className="ts-lab" href={`#${b.to}`} onClick={onClose}>{b.go||"Try it on the canvas"} →</a>)}
{rest.length>0&&<button type="button" className="ts-more" aria-expanded={full} onClick={()=>setFull(v=>!v)}>{full?"Show less":"Read the full section"}</button>}
{full&&<div className="ts-full">{rest.map(({b,i})=><Block key={i} b={b} i={i} still={still} fn={fn}/>)}</div>}{n===cut&&<p className="ts-cut">{cutText||"The rest of this topic is free once you sign in."} <button type="button" onClick={onLocked}>Sign in →</button></p>}</div></div>
<div className="ts-foot"><button type="button" className="ts-prev" disabled={n<=0} onClick={()=>go(n-1,"button")}><small>Previous</small><span>{ts[n-1]?.title||""}</span></button><button type="button" className="ts-next" disabled={n>=ts.length-1} onClick={()=>go(n+1,"button")}><small>Next</small><span>{ts[n+1]?.title||""}</span></button></div>
</div></>,document.body)}
