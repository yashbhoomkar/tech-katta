// Building blocks shared by every article figure: 640-wide viewBox, SMIL animation on a loop,
// nothing animated when the figure is `still` (reduced motion).
//   Dot  a packet travelling x1→x2 (and y→y2) between fractions t0 and t1 of the loop
//   Box  a labelled component box centred vertically on y · Arr a labelled arrow (marker id m)
//   Glow outlines a box during [t0,t1] · Show shows its children during [t0,t1] · Mark the arrowhead
// How things move (one grammar for every figure, spec §4.8 "the request"): a step fades in instead of blinking on; a request dot eases along its path with a short trail; a line on the path that works (BLUE) carries a
// glint travelling in its direction. Under reduced motion none of this is drawn (figures draw their still version).
import React from"react";import{BG,BLUE,ACCENT_MID as GLOW,FB,GREY,INK,LB,LR,RED}from"../theme/palette.js";
import{LOOP,pace}from"../theme/motion.js";export{LOOP,pace};
const calm=()=>typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// keyTimes for "off, fade in, on, fade out, off" between t0 and t1 (fractions of a loop of `dur`); each fade takes
// 0.22 s whatever the loop's length, quick enough that a box's new state drawn over its old one reads as one change
const win=(t0,t1,dur=LOOP)=>{const e=Math.min(.22/(parseFloat(dur)||8),(t1-t0)/4),k=[0,t0,t0+e,Math.max(t0+e,t1-e),t1],v=[0,0,1,1,0];if(t1<1){k.push(1);v.push(0)}return{keyTimes:k.map(x=>+x.toFixed(4)).join(";"),values:v.join(";")}};
// a glint along a line: a short bright dash that travels from (x1,y1) to (x2,y2) every 1.6 s, fading in and out at the ends
const Glint=({x1,y1,x2,y2,w=1})=>{if(calm())return null;const L=Math.hypot(x2-x1,y2-y1);if(L<24)return null;
return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GLOW} strokeWidth={(+w||1)+2.5} strokeLinecap="round" strokeDasharray={`10 ${Math.round(L+40)}`} pointerEvents="none"><animate attributeName="stroke-dashoffset" values={`0;${-Math.round(L-10)}`} dur="1.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.12;.62;.8;1" dur="1.6s" repeatCount="indefinite"/></line>};
const Bead=({x1,x2,y,y2,t0,t1,dur,r,o,fill})=>{const kt=`0;${t0};${t1};1`,sp="0 0 1 1;.45 0 .2 1;0 0 1 1",f=win(t0,t1,dur);return <circle cx={x1} cy={y} r={r} fill={fill} opacity="0"><animate attributeName="cx" values={`${x1};${x1};${x2};${x2}`} keyTimes={kt} calcMode="spline" keySplines={sp} dur={dur} repeatCount="indefinite"/>{y2!==y&&<animate attributeName="cy" values={`${y};${y};${y2};${y2}`} keyTimes={kt} calcMode="spline" keySplines={sp} dur={dur} repeatCount="indefinite"/>}<animate attributeName="opacity" values={f.values.split(";").map(v=>v*o).join(";")} keyTimes={f.keyTimes} dur={dur} repeatCount="indefinite"/></circle>};
export const Dot=({x1,x2,y,y2=y,t0,t1,dur=LOOP})=>{const d=Math.min(.02,(t1-t0)/6),p={x1,x2,y,y2,dur};return <g pointerEvents="none">
<Bead {...p} t0={t0} t1={t1} r={9} o={.22} fill={GLOW}/>{t1+2*d<=1&&<><Bead {...p} t0={t0+2*d} t1={t1+2*d} r={2} o={.35} fill={BLUE}/><Bead {...p} t0={t0+d} t1={t1+d} r={3} o={.6} fill={BLUE}/></>}
<Bead {...p} t0={t0} t1={t1} r={4.5} o={1} fill={BLUE}/></g>};
export const Box=({x,y,w=124,t,blue})=><g><rect x={x} y={y-17} width={w} height="34" rx="7" fill={blue?LB:BG} stroke={blue?BLUE:GREY} strokeWidth={blue?1.5:1}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
export const Arr=({x1,x2,y,t,dash,ty,m="ah"})=><g><line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeDasharray={dash?"4 3":undefined} markerEnd={`url(#${m})`}/>{t&&<text x={(x1+x2)/2} y={ty??y-6} textAnchor="middle" className="fl">{t}</text>}</g>;
export const Glow=({x,y,w,h,t0,t1,dur})=>{const f=win(t0,t1,dur);return <g pointerEvents="none"><rect x={x-5} y={y-5} width={w+10} height={h+10} rx="10" fill={GLOW} opacity="0"><animate attributeName="opacity" values={f.values.split(";").map(v=>v*.22).join(";")} keyTimes={f.keyTimes} dur={dur} repeatCount="indefinite"/></rect><rect x={x-3} y={y-3} width={w+6} height={h+6} rx="9" fill="none" stroke={BLUE} strokeWidth="2" opacity="0"><animate attributeName="opacity" {...f} dur={dur} repeatCount="indefinite"/></rect></g>};
// (fade only, no movement: a step often draws a box's new state exactly over its old one, so they must stay aligned)
export const Show=({t0,t1,dur,children})=><g opacity="0"><animate attributeName="opacity" {...win(t0,t1,dur)} dur={dur} repeatCount="indefinite"/>{children}</g>;
export const Mark=({m})=><defs><marker id={m} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill={INK}/></marker></defs>;

// The palette: ink, grey lines, red for trouble, blue for the path that works, and light fills for blue and red boxes.
// The values live in theme/palette.js (from theme/tokens.css), so a new colour scheme recolours every figure.
export{INK,GREY,RED,BLUE,LB,LR,FB}from"../theme/palette.js";
// Pieces for step-by-step figures (Research Papers, newer Concepts). Mk an arrowhead that keeps its size on thick lines · Bx a box with a title and an optional second line · Ar an arrow · Caps the numbered
// step line at the top, one per quarter (or third) of the loop · Cap the same line for the still figure ·
// Life and Msg draw a sequence diagram: a lifeline with its name, and a message between two lifelines.
export const Mk=({m})=><defs><marker id={m} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8z" fill={INK}/></marker></defs>;
export const Bx=({x,y,w=120,h=34,t,s,c=GREY,fill=BG,sw})=><g><rect x={x} y={y} width={w} height={h} rx="7" fill={fill} stroke={c} strokeWidth={sw??(c===BLUE?1.5:undefined)}/><text x={x+w/2} y={y+(s?h/2-3:h/2+4)} textAnchor="middle" className="fb">{t}</text>{s&&<text x={x+w/2} y={y+h/2+12} textAnchor="middle" className="fl">{s}</text>}</g>;
export const Ar=({x1,y1,x2,y2,m,c=INK,dash,w})=><><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>{c===BLUE&&!dash&&<Glint x1={x1} y1={y1} x2={x2} y2={y2} w={w}/>}</>;
// The step line is tagged (tk-caps with its loop length; tk-cap when still) so a phone can show it above the figure,
// which there scrolls sideways (dashboard/figure.jsx).
export const Caps=({caps,D})=><g className="tk-caps" data-dur={parseFloat(D)}>{caps.map(([t,c],i)=><Show key={i} t0={i/caps.length} t1={(i+1)/caps.length} dur={D}><text x="10" y="26" className="fb" style={{fill:c}}>{t}</text></Show>)}</g>;
export const Cap=({t,c=BLUE})=><text x="10" y="26" className="fb tk-cap" style={{fill:c}}>{t}</text>;
export const Life=({x,t,s,y0=48,y1})=><g><text x={x} y={y0} textAnchor="middle" className="fb">{t}</text>{s&&<text x={x} y={y0+14} textAnchor="middle" className="fl">{s}</text>}<line x1={x} y1={y0+22} x2={x} y2={y1} stroke={GREY} strokeDasharray="3 3"/></g>;
export const Msg=({x1,x2,y,t,m,c=INK,dash,w,tx})=><g><Ar x1={x1} y1={y} x2={x2+(x2>x1?-3:3)} y2={y} m={m} c={c} dash={dash} w={w}/>{t&&<text x={tx??(x1+x2)/2} y={y-6} textAnchor="middle" className="fl" style={c!==INK?{fill:c}:undefined}>{t}</text>}</g>;

// The step-figure frame most figure files share.
//   T     a line of text: `b` bold, `a` its anchor, `c` its colour
//   Steps each element of `g` appears at its step (cumulative unless its index is in `only`); the caption cycles
//   Fig   the 640-wide svg: title, arrowhead `M`, the `base` drawing, then the steps (or, when `still`, the
//         `last` state with the last caption); `top` is drawn above everything else
//   X / OK a cross and a tick
export const T=({x,y,t,c,a,b})=><text x={x} y={y} textAnchor={a} className={b?"fb":"fl"} style={c?{fill:c}:undefined}>{t}</text>;
export const Steps=({caps,g,D=pace(14),only=[]})=><g aria-hidden="true"><Caps caps={caps} D={D}/>{g.map((x,i)=>x&&<Show key={i} t0={i/4} t1={only.includes(i)?(i+1)/4:1} dur={D}>{x}</Show>)}</g>;
export const Fig=({still,h,id,title,M,base,caps,g,only,last,c,top})=><svg viewBox={`0 0 640 ${h}`} role="img" aria-labelledby={id}><title id={id}>{title}</title>{M&&<Mk m={M}/>}{base}
{still?<g>{last}<Cap t={caps[3][0]} c={c??caps[3][1]}/></g>:<Steps caps={caps} g={g} only={only}/>}{top}</svg>;
export const X=({x,y,c=RED,r=5})=><g stroke={c} strokeWidth="2"><line x1={x-r} y1={y-r} x2={x+r} y2={y+r}/><line x1={x-r} y1={y+r} x2={x+r} y2={y-r}/></g>;
export const OK=({x,y,c=BLUE})=><path d={`M${x-5} ${y} l4 4 l7 -9`} fill="none" stroke={c} strokeWidth="2"/>;

// Line a plain or dashed line with an optional arrowhead · SBox a small one-line box (blue, or dashed red when `down`).
export const Line=({x1,y1,x2,y2,m,dash,c=INK})=><><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>{c===BLUE&&!dash&&<Glint x1={x1} y1={y1} x2={x2} y2={y2}/>}</>;
export const SBox=({x,y,w=110,t,blue,down})=><g><rect x={x} y={y-12} width={w} height="24" rx="6" fill={down?LR:blue?LB:BG} stroke={down?RED:blue?BLUE:GREY} strokeWidth={blue?1.5:1} strokeDasharray={down?"4 3":undefined}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
