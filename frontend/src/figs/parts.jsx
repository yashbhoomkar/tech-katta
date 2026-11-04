// Building blocks shared by every article figure: 640-wide viewBox, SMIL animation on a loop,
// nothing animated when the figure is `still` (reduced motion).
//   Dot  a packet travelling x1→x2 (and y→y2) between fractions t0 and t1 of the loop
//   Box  a labelled component box centred vertically on y · Arr a labelled arrow (marker id m)
//   Glow outlines a box during [t0,t1] · Show shows its children during [t0,t1] · Mark the arrowhead
import React from"react";
export const LOOP="8s";
export const Dot=({x1,x2,y,y2=y,t0,t1,dur=LOOP})=><circle cx={x1} cy={y} r="4" fill="#2855d9" opacity="0"><animate attributeName="cx" values={`${x1};${x1};${x2};${x2}`} keyTimes={`0;${t0};${t1};1`} dur={dur} repeatCount="indefinite"/>{y2!==y&&<animate attributeName="cy" values={`${y};${y};${y2};${y2}`} keyTimes={`0;${t0};${t1};1`} dur={dur} repeatCount="indefinite"/>}<animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/></circle>;
export const Box=({x,y,w=124,t,blue})=><g><rect x={x} y={y-17} width={w} height="34" fill={blue?"#f8faff":"#fff"} stroke={blue?"#2855d9":"#9aa5b4"}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
export const Arr=({x1,x2,y,t,dash,ty,m="ah"})=><g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd={`url(#${m})`}/>{t&&<text x={(x1+x2)/2} y={ty??y-6} textAnchor="middle" className="fl">{t}</text>}</g>;
export const Glow=({x,y,w,h,t0,t1,dur})=><rect x={x-3} y={y-3} width={w+6} height={h+6} fill="none" stroke="#2855d9" strokeWidth="2" opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/></rect>;
export const Show=({t0,t1,dur,children})=><g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/>{children}</g>;
export const Mark=({m})=><defs><marker id={m} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>;
