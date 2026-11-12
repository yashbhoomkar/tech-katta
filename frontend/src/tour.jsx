// A short guided tour: highlights one part of the page at a time with a card that explains it.
// Steps come from content (site.json `tour`): {target (CSS selector), title, text, click?, cta?}.
//   click: a selector clicked first, to open what the step shows (e.g. select a component so its
//          settings appear); the step waits up to 2 s for its target.
//   cta:   {label, href} on the last step: a link that closes the tour and goes there.
// A step whose target is missing or hidden (e.g. on a phone) is skipped, forwards or backwards. Esc
// or Skip closes it; Back/Next and ←/→ move; focus stays on the card. Opens only from the Tour button.
import React,{useEffect,useLayoutEffect,useRef,useState}from"react";import{createPortal}from"react-dom";import"./tour.css";
const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=="hidden"};
const find=sel=>{try{return[...document.querySelectorAll(sel)].find(visible)||null}catch{return null}};
const wait=(sel,ms)=>new Promise(res=>{const t0=Date.now();const go=()=>{const el=find(sel);if(el||Date.now()-t0>ms)res(el);else setTimeout(go,80)};go()});
export default function Tour({steps,fallback,labels,onClose}){
// steps that can't be shown here at all (no target and nothing to click open) are left out of the count; when fewer
// than three are left (a page behind the sign-in card shows almost none of its own), the general tour is used instead
const[list]=useState(()=>{const can=x=>(x||[]).filter(s=>s.click?find(s.click):find(s.target)),own=can(steps);return own.length>=3||!fallback?own:can(fallback)});
const[i,setI]=useState(0),[dir,setDir]=useState(1),[el,setEl]=useState(null),[box,setBox]=useState(null),[ch,setCh]=useState(0);const card=useRef(null);
const step=list[i],last=i===list.length-1;
const move=d=>{setDir(d);setEl(null);setBox(null);setI(v=>Math.max(0,Math.min(list.length-1,v+d)))};
// open what the step needs, wait for its target; a step that can't be shown is skipped the way we were going
useEffect(()=>{if(!step)return;let on=true;(async()=>{if(step.click){const c=find(step.click);try{for(const t of["mousedown","mouseup"])c?.dispatchEvent(new MouseEvent(t,{bubbles:true,view:window}));c?.click()}catch{}}
const t=await wait(step.target,step.click?2000:400);if(!on)return;if(t){setEl(t);return}
const n=i+dir;if(n>=0&&n<list.length)setI(n);else if(dir<0&&i<list.length-1){setDir(1);setI(i+1)}else onClose()})();return()=>{on=false}},[i]);// eslint-disable-line
// On a phone the card is a sheet at the bottom, so the target is scrolled to just under the header, where the
// sheet can't cover it; elsewhere it is scrolled only as far as needed.
useLayoutEffect(()=>{if(!el)return;el.scrollIntoView({block:"nearest",inline:"center"});
if(innerWidth<640){const head=document.querySelector(".d-head")?.getBoundingClientRect().bottom||0,r=el.getBoundingClientRect();if(r.top<head+8||r.bottom>innerHeight*.5)scrollBy({top:r.top-head-12,behavior:"instant"})}
const place=()=>{const r=el.getBoundingClientRect();setBox({x:r.left,y:r.top,w:r.width,h:r.height})};place();addEventListener("resize",place);addEventListener("scroll",place,true);
const t=setInterval(place,300);return()=>{removeEventListener("resize",place);removeEventListener("scroll",place,true);clearInterval(t)}},[el]);
useLayoutEffect(()=>{if(card.current)setCh(card.current.offsetHeight)},[box,i]);
// Focus moves to the card once it is placed, and Tab stays inside it (QA M9).
useEffect(()=>{if(box)card.current?.focus()},[i,!!box]);// eslint-disable-line
useEffect(()=>{const k=e=>{if(e.key==="Tab"&&card.current){const f=[...card.current.querySelectorAll("button,a")],at=f.indexOf(document.activeElement);if(e.shiftKey&&at<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&(at===-1||at===f.length-1)){e.preventDefault();f[0].focus()}return}
if(e.key==="Escape")onClose();if(e.key==="ArrowRight"&&!last)move(1);if(e.key==="ArrowLeft"&&i>0)move(-1)};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[i,last]);// eslint-disable-line
useEffect(()=>{if(!list.length)onClose()},[]);// eslint-disable-line
if(!step||!box)return null;
// Card below the target if it fits, else above, else beside it; on narrow screens a sheet at the bottom.
const narrow=innerWidth<640,W=Math.min(360,innerWidth-24),pad=8,H=ch||200;
const below=box.y+box.h+pad+6+H<innerHeight-12,above=box.y-pad-6-H>12;
const top=below?box.y+box.h+pad+6:above?box.y-pad-6-H:Math.max(12,Math.min(innerHeight-H-12,box.y));
const left=!below&&!above?(box.x+box.w+pad+12+W<innerWidth?box.x+box.w+pad+12:Math.max(12,box.x-pad-12-W)):Math.max(12,Math.min(box.x,innerWidth-W-12));
// on a phone the card is a sheet at the bottom, or at the top when the target starts low on the screen (e.g. the fixed
// Run/Submit bar); a target taller than the screen keeps its top, the part that says what it is, clear of the card
const style=narrow?(box.y>innerHeight*.45?{left:12,right:12,top:12}:{left:12,right:12,bottom:12}):{left,top,width:W};
// a target taller than the window (a whole pane): outline only what's on screen
const hy=Math.max(box.y-pad,4),hb=Math.min(box.y+box.h+pad,innerHeight-4);
return createPortal(<div className="tour" role="presentation"><div className="tour-hole" style={{left:box.x-pad,top:hy,width:box.w+pad*2,height:Math.max(0,hb-hy)}}/>
<div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x" tabIndex="-1" ref={card} style={style}>
<div className="tour-prog" aria-hidden="true"><i style={{width:`${100*(i+1)/list.length}%`}}/></div>
<small>{i+1} / {list.length}</small><b id="tour-t">{step.title}</b><p id="tour-x">{step.text}</p>
<div className="tour-act"><button type="button" className="tour-skip" onClick={onClose}>{last?labels.close||labels.skip:labels.skip}</button>{i>0&&<button type="button" onClick={()=>move(-1)}>{labels.back}</button>}
{last&&step.cta?<a className="tour-next" href={step.cta.href} onClick={onClose}>{step.cta.label}</a>:<button type="button" className="tour-next" onClick={()=>last?onClose():move(1)}>{last?labels.done:labels.next}</button>}</div></div></div>,document.body)}
