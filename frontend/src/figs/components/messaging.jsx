// Components › Messaging: the figures this sub-tab's articles draw (site.json dashboard.groups.components, "messaging").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Box,Glow,Show,Mark,Line,SBox,INK,GREY,RED}from"../parts.jsx";

// Messaging, FIG: the same order events through a queue and through a stream. The queue gives each
// message to one worker, which deletes it when done. The stream keeps every event in order; three
// services read all of it, each at its own position (offset).
function QueueStreamFig({still,uid=""}){const M=`qs${uid}`,D="10s",Q=78,S=228;
const cell=(x,y,t,on)=><g key={x}><rect x={x} y={y-12} width="26" height="24" fill={on?"#f8faff":"#fff"} stroke={on?"#2855d9":GREY}/><text x={x+13} y={y+4} textAnchor="middle" className="fl">{t}</text></g>;
return <svg viewBox="0 0 640 320" role="img" aria-labelledby={`qst${uid}`}><title id={`qst${uid}`}>Top: the Order API puts jobs on a queue. Each job goes to one of two workers, which deletes it once done. Bottom: the Order API appends order events to a stream, a log that keeps them in order for seven days. Notifications, analytics and the restaurant tablet service each read every event, each from its own position, so analytics can lag behind or replay old events without affecting the others.</title><Mark m={M}/>
<text x="0" y="22" className="fb">Queue · SQS, RabbitMQ</text><text x="0" y="38" className="fl">each job to one worker, then deleted</text>
<Box x={0} y={Q} w={100} t="Order API"/><Line x1={102} y1={Q} x2={176} y2={Q} m={M}/>
<rect x="180" y={Q-17} width="130" height="34" fill="#f8faff" stroke="#2855d9"/>{[0,1,2].map(i=><rect key={i} x={190+i*38} y={Q-9} width="30" height="18" fill="#fff" stroke={GREY}/>)}<text x="245" y={Q+32} textAnchor="middle" className="fl">jobs waiting</text>
<Line x1={312} y1={Q-6} x2={426} y2={Q-30} m={M} c={GREY}/><Line x1={312} y1={Q+6} x2={426} y2={Q+30} m={M} c={GREY}/>
<Box x={430} y={Q-34} w={130} t="Worker A"/><Box x={430} y={Q+34} w={130} t="Worker B"/><text x="572" y={Q+4} className="fl">done →</text><text x="572" y={Q+18} className="fl">deleted</text>
<line x1="0" y1="150" x2="640" y2="150" stroke="#e6eaf0"/>
<text x="0" y="172" className="fb">Stream · Kafka, Kinesis</text><text x="0" y="188" className="fl">kept for 7 days; every reader gets every event</text>
<Box x={0} y={S} w={100} t="Order API"/><Line x1={102} y1={S} x2={176} y2={S} m={M}/>
{[0,1,2,3,4,5].map(i=>cell(180+i*26,S,i,i===5))}<text x="258" y={S+28} textAnchor="middle" className="fl">offsets 0–5, never deleted early</text>
<Line x1={338} y1={S-4} x2={426} y2={S-50} m={M} c={GREY}/><Line x1={338} y1={S} x2={426} y2={S} m={M} c={GREY}/><Line x1={338} y1={S+4} x2={426} y2={S+50} m={M} c={GREY}/>
<SBox x={430} y={S-50} w={150} t="Notifications · at 5"/><SBox x={430} y={S} w={150} t="Analytics · at 3"/><SBox x={430} y={S+50} w={150} t="Restaurant tablet · at 5"/>
{!still&&<g aria-hidden="true">
<Dot x1={102} x2={186} y={Q} t0={.02} t1={.1} dur={D}/><Dot x1={312} x2={424} y={Q-6} y2={Q-30} t0={.12} t1={.22} dur={D}/><Glow x={430} y={Q-51} w={130} h={34} t0={.22} t1={.3} dur={D}/>
<Dot x1={102} x2={186} y={Q} t0={.28} t1={.36} dur={D}/><Dot x1={312} x2={424} y={Q+6} y2={Q+30} t0={.38} t1={.48} dur={D}/><Glow x={430} y={Q+17} w={130} h={34} t0={.48} t1={.56} dur={D}/>
<Dot x1={102} x2={332} y={S} t0={.55} t1={.66} dur={D}/>
<Dot x1={338} x2={424} y={S-4} y2={S-50} t0={.68} t1={.78} dur={D}/><Dot x1={338} x2={424} y={S} t0={.68} t1={.78} dur={D}/><Dot x1={338} x2={424} y={S+4} y2={S+50} t0={.68} t1={.78} dur={D}/>
<Show t0={.78} t1={.98} dur={D}><text x="258" y={S-22} textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>one event, three readers</text></Show></g>}</svg>}

// Messaging, FIG: match night. Orders produce 2,000 events a second from 8 pm; three consumers handle
// 1,200, so the backlog grows by 800 a second. At 8:10 the group grows to six consumers (2,400 a
// second, one per partition) and the backlog drains by 8:30.
function LagFig({still,uid=""}){const D="12s",B=230,T=["8:00","8:05","8:10","8:15","8:20","8:25","8:30"],V=[0,2.4,4.8,3.6,2.4,1.2,0],K=28;// px per lakh
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`lgt${uid}`}><title id={`lgt${uid}`}>From 8 pm, orders produce 2,000 events a second. Three consumers handle 1,200 a second, so by 8:10 there are 4.8 lakh events waiting: a new order's notification waits about seven minutes. At 8:10 the consumer group grows to six, one per partition, handling 2,400 a second, and the backlog drains to zero by 8:30 while orders keep coming at the same rate.</title>
<text x="10" y="22" className="fb">Events waiting (lakh) · 2,000 a second coming in</text>
<line x1="60" y1={B} x2="620" y2={B} stroke={GREY}/>
{T.map((t,i)=>{const x=70+i*78,h=V[i]*K,bar=<g><rect x={x} y={B-h} width="50" height={h} rx="2" fill={i<=2?RED:"#2855d9"} opacity={i<=2?.85:.7}/>{V[i]>0&&<text x={x+25} y={B-h-6} textAnchor="middle" className="fl">{V[i]}</text>}</g>;
return <g key={t}><text x={x+25} y={B+18} textAnchor="middle" className="fl">{t}</text>{still?bar:<Show t0={.05+i*.11} t1={.98} dur={D}>{bar}</Show>}</g>})}
<line x1={70+2*78+64} y1="40" x2={70+2*78+64} y2={B} stroke={INK} strokeDasharray="4 3"/>
<text x="70" y="52" className="fl" style={{fill:RED}}>3 consumers · 1,200 a second</text><text x={70+2*78+72} y="52" className="fl" style={{fill:"#2855d9"}}>6 consumers · 2,400 a second</text>
<text x={70+2*78+72} y="68" className="fl">6 partitions → at most 6 in the group</text>
<text x="10" y="278" className="fl">at 8:10 a new order's notification waits about 7 minutes; by 8:30 it's back to real time</text></svg>}

export const FIGS={
"queue-vs-stream":{C:QueueStreamFig,ar:640/320,title:()=>"A QUEUE AND A STREAM, SAME EVENTS"},
"consumer-lag":{C:LagFig,ar:640/290,title:()=>"WHEN READERS FALL BEHIND ON MATCH NIGHT"},
};
