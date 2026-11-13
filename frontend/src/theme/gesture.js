// Swipes (tech-katta-context 24 §1.3, "paper follows the finger"): the thing under the finger moves 1:1 while it is
// dragged; on release it goes if it travelled past 35 % of its size or was flicked faster than 0.5 px/ms that way,
// otherwise it returns. Touch and pen only (mouse users have the buttons). A drag never starts within 24 px of a
// screen edge (the phone's own Back), on a form field, on the canvas, or on a sideways scroller that can still scroll
// that way. Nothing moves for the first 10 px; then the drag is ours only if it is mostly along our axis
// (|along| > |across| × 1.25), otherwise it is a scroll and we let go of this touch.
import{useEffect,useRef}from"react";
export const SLOP=10,LOCK=1.25,EDGE=24,SHARE=.35,FLICK=.5;
// ±1 when a release at distance d (px, signed) and velocity v (px/ms, signed) should go that way, else 0
export function decide(d,v,size){if(!d)return 0;const s=Math.sign(d);if(Math.abs(d)>SHARE*size)return s;if(Math.sign(v)===s&&Math.abs(v)>FLICK)return s;return 0}
// the answer on release: decide(), except that past a limit there is nowhere to go
export function release(d,v,size,min,max){return band(d,min,max)!==d?0:decide(d,v,size)}
// past a limit the paper gives a little: a third of the finger's travel, at most 32 px
export function band(d,min=-Infinity,max=Infinity){if(d>max)return max+Math.min(32,(d-max)/3);if(d<min)return min-Math.min(32,(min-d)/3);return d}
// whether a touch that moved (dx,dy) is ours along `axis`: undefined while under the slop, then true or false for good
export function lock(dx,dy,axis="x"){const a=axis==="x"?dx:dy,c=axis==="x"?dy:dx;if(Math.hypot(dx,dy)<SLOP)return undefined;return Math.abs(a)>Math.abs(c)*LOCK}
// how long the settle takes: the share of the size still to travel, between 0.14 and 0.28 s
export const settleMs=(left,size)=>Math.round(Math.max(140,Math.min(280,Math.abs(left)/Math.max(1,size)*280)));
const FIELD="input,select,textarea,[contenteditable],.react-flow";
function scrollsAway(el,stop,dx){for(let n=el;n&&n!==stop.parentElement;n=n.parentElement){if(n.nodeType!==1)continue;const o=getComputedStyle(n).overflowX;
if((o==="auto"||o==="scroll")&&n.scrollWidth>n.clientWidth+1){if(dx<0&&n.scrollLeft+n.clientWidth<n.scrollWidth-1)return true;if(dx>0&&n.scrollLeft>1)return true}}return false}
// useDrag(ref,{axis,on,size,min,max,edge,ignore,onStart,onMove,onEnd}): `ignore` is a selector where a drag may not start; onMove(d) with the band applied; onEnd(go,d) where go is
// decide()'s answer (0 when the browser took the touch over). The caller moves and settles its own element.
export function useDrag(ref,o){const opt=useRef(o);opt.current=o;
useEffect(()=>{const el=ref.current;if(!el||o.on===false)return;let s=null;
const down=e=>{if(e.pointerType==="mouse"||!e.isPrimary)return;const p=opt.current,ax=p.axis||"x";
if(e.target.closest?.(FIELD)||p.ignore&&e.target.closest?.(p.ignore))return;if(ax==="x"&&p.edge!==false&&(e.clientX<EDGE||e.clientX>innerWidth-EDGE))return;
s={id:e.pointerId,x:e.clientX,y:e.clientY,ax,mine:undefined,d:0,t:e.timeStamp,v:0,target:e.target}};
const move=e=>{if(!s||e.pointerId!==s.id)return;const dx=e.clientX-s.x,dy=e.clientY-s.y,p=opt.current;
if(s.mine===undefined){const m=lock(dx,dy,s.ax);if(m===undefined)return;if(m&&s.ax==="x"&&scrollsAway(s.target,el,dx)){s=null;return}
s.mine=m;if(!m){s=null;return}try{el.setPointerCapture(s.id)}catch{}p.onStart?.()}
const d=s.ax==="x"?dx:dy,dt=e.timeStamp-s.t;if(dt>0)s.v=s.v*.2+.8*((d-s.d)/dt);s.d=d;s.t=e.timeStamp;p.onMove?.(band(d,p.min,p.max))};
const up=e=>{if(!s||e.pointerId!==s.id)return;const p=opt.current,was=s;s=null;if(!was.mine)return;
const stale=e.timeStamp-was.t>100;p.onEnd?.(release(was.d,stale?0:was.v,p.size?p.size():el.getBoundingClientRect()[was.ax==="x"?"width":"height"],p.min,p.max),was.d)};
const cancel=e=>{if(!s||e.pointerId!==s.id)return;const was=s;s=null;if(was.mine)opt.current.onEnd?.(0,was.d)};
el.addEventListener("pointerdown",down);el.addEventListener("pointermove",move);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",cancel);
return()=>{el.removeEventListener("pointerdown",down);el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",cancel)}},[o.on]);}// eslint-disable-line
