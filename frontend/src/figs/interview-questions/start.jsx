// Interview Questions › Start here: the figures this sub-tab's articles draw (site.json dashboard.groups.interview-questions, "start").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Glow,INK,GREY,RED,BLUE}from"../parts.jsx";

// Method, FIG: a 45-minute interview as a bar. Requirements 5, entities 2, API 5, high-level design 15,
// deep dives 13, questions at the end 5. A marker walks the clock and the current step lights up.
function ClockFig({still,uid=""}){const D="15s",X0=20,W=600,Y=120,T=45;
const steps=[["Requirements",5,""],["Entities",2,""],["API",5,""],["High-level design",15,"a design that works end to end"],["Deep dives",13,"make it hold up"],["Your questions",5,""]];
let at=0;const segs=steps.map(([n,m,sub])=>{const s={n,m,sub,a:at};at+=m;return s});const x=(m)=>X0+(m/T)*W;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`ckt${uid}`}><title id={`ckt${uid}`}>A 45-minute system design interview split into steps: about 5 minutes on requirements, 2 on the core entities, 5 on the API, 15 on a high-level design that works end to end, 13 on deep dives that make it hold up, and the last 5 for your questions.</title>
<text x="20" y="30" className="fb">One 45-minute interview</text><text x="20" y="48" className="fl">rough minutes; the design that works end to end comes first</text>
{segs.map((s,i)=><g key={s.n}><rect x={x(s.a)} y={Y-20} width={x(s.a+s.m)-x(s.a)-2} height="40" rx="2" fill={i===3?BLUE:i===4?"#6f8fe6":i===5?"#e6eaf0":"#b9c9ff"}/>
{s.m>=5&&<text x={(x(s.a)+x(s.a+s.m))/2} y={Y+5} textAnchor="middle" className="fb" style={{fill:i===3||i===4?"#fff":INK}}>{s.m} min</text>}
<text x={x(s.a)+2} y={i%2?Y+62:Y+44} className="fl">{s.n}</text>{s.sub&&<text x={x(s.a)+2} y={i%2?Y+78:Y+60} className="fl" style={{fill:GREY}}>{s.sub}</text>}
{!still&&<Glow x={x(s.a)} y={Y-20} w={x(s.a+s.m)-x(s.a)-2} h={40} t0={s.a/T} t1={(s.a+s.m)/T} dur={D}/>}</g>)}
{!still&&<line x1={x(0)} y1={Y-30} x2={x(0)} y2={Y+28} stroke={RED} strokeWidth="2" aria-hidden="true"><animate attributeName="x1" values={`${x(0)};${x(T)}`} dur={D} repeatCount="indefinite"/><animate attributeName="x2" values={`${x(0)};${x(T)}`} dur={D} repeatCount="indefinite"/></line>}</svg>}

export const FIGS={
"interview-clock":{C:ClockFig,ar:640/240,title:()=>"WHERE THE 45 MINUTES GO"},
};
