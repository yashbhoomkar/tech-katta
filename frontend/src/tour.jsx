// A short guided tour: highlights one part of the page at a time with a card that explains it.
// Steps come from content (site.json `tour`): {target (CSS selector), title, text}. Steps whose target
// is missing or hidden (e.g. on a phone) are skipped. Esc or Skip closes it; Back/Next move; focus
// stays on the card. Starts on a first visit (the caller decides) and from the Tour button.
import React,{useEffect,useLayoutEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import"./tour.css";
const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=="hidden"};
export default function Tour({steps,labels,onClose}){
const live=steps.filter(s=>visible(document.querySelector(s.target)));const[i,setI]=useState(0);const[box,setBox]=useState(null);const card=useRef(null);
const step=live[i];
useLayoutEffect(()=>{if(!step)return;const el=document.querySelector(step.target);if(!el)return;el.scrollIntoView({block:"nearest",inline:"nearest"});
const place=()=>{const r=el.getBoundingClientRect();setBox({x:r.left,y:r.top,w:r.width,h:r.height})};place();addEventListener("resize",place);addEventListener("scroll",place,true);return()=>{removeEventListener("resize",place);removeEventListener("scroll",place,true)}},[step]);// eslint-disable-line
useEffect(()=>{card.current?.focus();const k=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowRight")setI(v=>Math.min(v+1,live.length-1));if(e.key==="ArrowLeft")setI(v=>Math.max(v-1,0))};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[i]);// eslint-disable-line
useEffect(()=>{if(!live.length)onClose()},[]);// eslint-disable-line
if(!step||!box)return null;
// Card below the target if there is room, else above; on narrow screens a sheet at the bottom.
const narrow=innerWidth<640,W=Math.min(340,innerWidth-24),pad=8;const below=box.y+box.h+pad+190<innerHeight;
const style=narrow?{left:12,right:12,bottom:12}:{left:Math.max(12,Math.min(box.x,innerWidth-W-12)),width:W,...(below?{top:box.y+box.h+pad+6}:{top:Math.max(12,box.y-pad-6-190)})};
const last=i===live.length-1;
return createPortal(<div className="tour" role="presentation"><div className="tour-hole" style={{left:box.x-pad,top:box.y-pad,width:box.w+pad*2,height:box.h+pad*2}}/>
<div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" tabIndex="-1" ref={card} style={style}><small>{i+1} / {live.length}</small><b id="tour-t">{step.title}</b><p>{step.text}</p>
<div className="tour-act"><button type="button" className="tour-skip" onClick={onClose}>{labels.skip}</button>{i>0&&<button type="button" onClick={()=>setI(i-1)}>{labels.back}</button>}<button type="button" className="tour-next" onClick={()=>last?onClose():setI(i+1)}>{last?labels.done:labels.next}</button></div></div></div>,document.body)}
