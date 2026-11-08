// Figures for the Research Papers articles. Same conventions as concepts.jsx: 640-wide viewBox, Swiss
// colours, SMIL on a loop, nothing animated when `still`, and a `uid` so the full-screen copy gets its
// own marker ids.
import React from"react";import{Dot,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";

// Lamport clocks, FIG 1: the counting rule. Menu server B (clock 300 ms fast) marks paneer tikka sold
// out at count 7 and tells order server A; A takes max(3, 7) + 1 = 8, refuses an order at 9 and tells
// support log C, which takes max(1, 9) + 1 = 10. By count the cause comes first; by wall clock the
// refusal (12:00:00.260) looks earlier than the sold-out (12:00:00.500).
function LamportClocksFig({still,uid=""}){const M=`lc${uid}`,D="12s",Y={B:90,A:160,C:230};
const lane=(y,name,sub,subc)=><g><text x="10" y={y-4} className="fb">{name}</text><text x="10" y={y+12} className="fl" style={subc?{fill:subc}:undefined}>{sub}</text><line x1="150" y1={y} x2="630" y2={y} stroke={GREY}/></g>;
// an event: its count above the dot, its label below (left of the dot when an arrow leaves to the right)
const ev=(x,y,n,label,left,c=BLUE)=><g><circle cx={x} cy={y} r="5" fill={c}/><text x={x} y={y-12} textAnchor="middle" className="fb" style={{fill:c}}>{n}</text><text x={left?x-8:x} y={y+20} textAnchor={left?"end":"middle"} className="fl">{label}</text></g>;
const wall=(x,y,t)=><text x={x-8} y={y+36} textAnchor="end" className="fl" style={{fill:RED}}>wall clock {t}</text>;
const start=(y,n)=><text x="160" y={y-8} className="fl">count {n}</text>;
const msg=(x1,y1,x2,y2,n)=><g><line x1={x1} y1={y1} x2={x2} y2={y2-6} stroke={INK} markerEnd={`url(#${M})`}/><text x={(x1+x2)/2+14} y={(y1+y2)/2} className="fl">carries {n}</text></g>;
const caps=[["1 · each machine counts its own events: B is at 6, A at 3, C at 1",INK],["2 · B marks paneer tikka sold out: count 7, sent to A with the 7",BLUE],["3 · A takes max(3, 7) + 1 = 8, refuses an order at 9, tells C",BLUE],["4 · C takes max(1, 9) + 1 = 10: the cause always has the smaller number",BLUE]];
const s1=<g>{start(Y.B,6)}{start(Y.A,3)}{start(Y.C,1)}</g>;
const s2=<g>{ev(220,Y.B,7,"sold out",1)}{wall(220,Y.B,"12:00:00.500")}</g>;
const s3=<g>{msg(220,Y.B,300,Y.A,7)}{ev(300,Y.A,8,"got it")}{ev(440,Y.A,9,"refused an order",1)}{wall(440,Y.A,"12:00:00.260")}</g>;
const s4=<g>{msg(440,Y.A,560,Y.C,9)}{ev(560,Y.C,10,"logged")}<text x="10" y="284" className="fl"><tspan style={{fill:BLUE}}>by count: sold out 7 → refused 9 → logged 10</tspan><tspan dx="12" style={{fill:RED}}>by wall clock: refused (.260) before sold out (.500)</tspan></text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`lct${uid}`}><title id={`lct${uid}`}>Three machines count their own events. Menu server B, whose clock runs 300 milliseconds fast, marks paneer tikka sold out at count 7 and sends the update to order server A with the number 7. A was at 3; it takes the bigger of 3 and 7 and adds one, so receiving is event 8, and refusing a customer's order is event 9. A tells support log C, which was at 1 and becomes 10. Sorted by count, the sold-out comes before the refusal. Sorted by the machines' wall clocks, the refusal at 12:00:00.260 looks earlier than the sold-out at 12:00:00.500.</title><Mark m={M}/>
{lane(Y.B,"Menu server B","clock 300 ms fast",RED)}{lane(Y.A,"Order server A","clock right")}{lane(Y.C,"Support log C","clock right")}
{still?<g>{s1}{s2}{s3}{s4}<text x="10" y="30" className="fb" style={{fill:BLUE}}>{caps[3][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Show t0={0} t1={1} dur={D}>{s1}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show>
<Dot x1={220} x2={300} y={Y.B} y2={Y.A} t0={.3} t1={.45} dur={D}/>
<Show t0={.5} t1={1} dur={D}>{s3}</Show>
<Dot x1={440} x2={560} y={Y.A} y2={Y.C} t0={.6} t1={.72} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Lamport clocks, FIG 2: one order for everyone. The same three requests reach machines A, B and C in
// different orders. Each sorts by (count, machine name): 5·A, 5·C, 6·B. The two holds on seat 14 both
// have count 5, so the tie goes to machine A on every copy, and every copy gives seat 14 to A's customer.
function LamportOrderFig({still,uid=""}){const D="10s";
const R={a:"5 · A  hold seat 14",c:"5 · C  hold seat 14",b:"6 · B  cancel seat 9"};
const cols=[["Machine A",["a","b","c"]],["Machine B",["b","c","a"]],["Machine C",["c","a","b"]]],X=[10,225,440];
const caps=[["1 · the same three requests reach each machine in a different order",INK],["2 · each sorts by count, then by machine name: 5·A, 5·C, 6·B",BLUE],["3 · one order everywhere, so every copy gives seat 14 to A's customer",BLUE]];
const arrived=<g>{cols.map(([name,order],i)=><g key={name}><text x={X[i]} y="70" className="fb">{name}</text><text x={X[i]} y="90" className="fl">arrived</text>
{order.map((k,j)=><text key={k} x={X[i]} y={112+j*20} className="fq">{R[k]}</text>)}</g>)}</g>;
const sorted=<g>{cols.map(([name],i)=><g key={name}><text x={X[i]} y="186" className="fl" style={{fill:BLUE}}>sorted by (count, machine)</text>
{["a","c","b"].map((k,j)=><text key={k} x={X[i]} y={208+j*20} className="fq" style={{fill:BLUE}}>{R[k]}</text>)}</g>)}</g>;
const win=<g>{X.map(x=><rect key={x} x={x-4} y="194" width="190" height="20" fill="none" stroke={BLUE} strokeWidth="2"/>)}<text x="10" y="276" className="fl" style={{fill:BLUE}}>A and C both said 5: the tie goes to the earlier machine name, A, on every copy</text></g>;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`lot${uid}`}><title id={`lot${uid}`}>Three requests are stamped with Lamport counts: 5 from machine A to hold seat 14, 5 from machine C to hold seat 14, and 6 from machine B to cancel seat 9. They reach machines A, B and C in three different orders. Each machine sorts them by count and breaks the tie by machine name, so every machine gets the same list: A's hold, C's hold, B's cancel. Every copy therefore gives seat 14 to the customer on machine A.</title>
{arrived}
{still?<g>{sorted}{win}<text x="10" y="30" className="fb" style={{fill:BLUE}}>{caps[2][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/3} t1={(i+1)/3} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Show t0={1/3} t1={1} dur={D}>{sorted}</Show><Show t0={2/3} t1={1} dur={D}>{win}</Show></g>}</svg>}

export const PAPER_FIGS={
"lamport-clocks":{C:LamportClocksFig,ar:640/300,title:()=>"COUNTING INSTEAD OF TIMING"},
"lamport-order":{C:LamportOrderFig,ar:640/290,title:()=>"ONE ORDER FOR EVERY MACHINE"},
};
