// Figures for the Interview Questions articles. Same conventions as components.jsx and concepts.jsx:
// 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated when `still`, and a `uid` so the
// full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
const SBox=({x,y,w=110,t,blue})=><g><rect x={x} y={y-12} width={w} height="24" fill={blue?"#f8faff":"#fff"} stroke={blue?BLUE:GREY}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

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

// URL shortener, FIG: the two paths. Creating: the marketing tool posts a long URL, the API turns its next
// ID into a short code, stores it and returns zot.to/2Bi. Opening: a customer taps the link in an SMS,
// the redirect service finds the code in Redis and answers 302 to the long URL, and logs the click.
function ShortenerFig({still,uid=""}){const M=`sh${uid}`,D="14s";
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`sht${uid}`}><title id={`sht${uid}`}>Creating a short link: Zotato's marketing tool sends the long URL to the links API, which takes the next number from its block of IDs, turns it into the code 2Bi, stores code and URL in the database, and returns zot.to/2Bi. Opening it: a customer taps the link in an SMS; the redirect service looks the code up in Redis, falls back to the database on a miss, answers 302 with the long URL, and sends a click event to a stream for analytics.</title><Mark m={M}/>
<text x="0" y="20" className="fb">Create</text>
<SBox x={0} y={50} w={120} t="Marketing tool"/><Line x1={122} y1={50} x2={216} y2={50} m={M}/><text x="168" y="42" textAnchor="middle" className="fl">POST /links</text>
<SBox x={220} y={50} w={120} t="Links API" blue/><text x="280" y="80" textAnchor="middle" className="fl">ID 10,000 → "2Bi"</text>
<Line x1={342} y1={50} x2={476} y2={50} m={M}/><SBox x={480} y={50} w={150} t="Database (code → URL)"/>
<line x1="0" y1="110" x2="640" y2="110" stroke="#e6eaf0"/>
<text x="0" y="132" className="fb">Open (100 times more often)</text>
<SBox x={0} y={170} w={120} t="Customer's phone"/><Line x1={122} y1={170} x2={216} y2={170} m={M}/><text x="168" y="162" textAnchor="middle" className="fl">GET /2Bi</text>
<SBox x={220} y={170} w={120} t="Redirect service" blue/><Line x1={216} y1={182} x2={124} y2={182} m={M} dash/><text x="168" y="198" textAnchor="middle" className="fl">302 → long URL</text>
<Line x1={342} y1={164} x2={476} y2={150} m={M}/><SBox x={480} y={150} w={150} t="Redis (hot codes)"/>
<Line x1={342} y1={176} x2={476} y2={200} m={M} c={GREY}/><SBox x={480} y={200} w={150} t="Database, on a miss"/>
<Line x1={280} y1={184} x2={280} y2={246} m={M} c={GREY}/><SBox x={220} y={258} w={120} t="Click stream"/><text x="348" y="262" className="fl">→ analytics, later</text>
{!still&&<g aria-hidden="true">
<Dot x1={124} x2={214} y={50} t0={.02} t1={.1} dur={D}/><Glow x={220} y={38} w={120} h={24} t0={.1} t1={.2} dur={D}/><Dot x1={344} x2={474} y={50} t0={.2} t1={.3} dur={D}/><Glow x={480} y={38} w={150} h={24} t0={.3} t1={.38} dur={D}/>
<Show t0={.3} t1={.45} dur={D}><text x="168" y="80" textAnchor="middle" className="fl" style={{fill:BLUE}}>zot.to/2Bi</text></Show>
<Dot x1={124} x2={214} y={170} t0={.5} t1={.58} dur={D}/><Dot x1={344} x2={474} y={164} y2={150} t0={.6} t1={.68} dur={D}/><Glow x={480} y={138} w={150} h={24} t0={.68} t1={.76} dur={D}/>
<Dot x1={214} x2={126} y={182} t0={.76} t1={.84} dur={D}/><Dot x1={280} x2={280} y={186} y2={244} t0={.8} t1={.9} dur={D}/>
<Show t0={.84} t1={.98} dur={D}><text x="60" y="204" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu opens</text></Show></g>}</svg>}

// URL shortener, FIG: making codes without collisions. A counter hands each API server a block of
// 1,000 IDs; each server turns its next ID into base 62 (0-9, a-z, A-Z). No two servers can make the
// same code, and the counter is asked once per 1,000 links.
function ShortCodesFig({still,uid=""}){const M=`sc${uid}`,D="12s";
const rows=[["Server A","10,000–10,999","10,000","2Bi"],["Server B","11,000–11,999","11,157","2TX"]];
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`sct${uid}`}><title id={`sct${uid}`}>A counter in the database hands each links server a block of 1,000 IDs: server A gets 10,000 to 10,999, server B gets 11,000 to 11,999. Each server turns its next ID into base 62 using the characters 0 to 9, a to z and A to Z: 10,000 becomes 2Bi and 11,157 becomes 2TX. No two servers can make the same code, and the counter is touched once per thousand links. Seven characters allow about 3.5 trillion codes.</title><Mark m={M}/>
<SBox x={0} y={130} w={130} t="Counter" blue/><text x="65" y="160" textAnchor="middle" className="fl">next block: 12,000</text>
{rows.map(([n,blk,id,code],i)=>{const y=80+i*100;return <g key={n}><Line x1={132} y1={130} x2={226} y2={y} m={M} c={GREY}/><text x="150" y={y+(i?20:-8)} className="fl">{blk}</text>
<SBox x={230} y={y} w={110} t={n}/><Line x1={342} y1={y} x2={406} y2={y} m={M}/><text x="374" y={y-8} textAnchor="middle" className="fl">ID {id}</text>
<rect x="410" y={y-14} width="90" height="28" fill="#f8faff" stroke={BLUE}/><text x="455" y={y+5} textAnchor="middle" className="fb" style={{fill:BLUE}}>{code}</text><text x="512" y={y+5} className="fl">zot.to/{code}</text></g>})}
<text x="0" y="30" className="fb">Base 62: 0–9, a–z, A–Z</text><text x="0" y="48" className="fl">7 characters ≈ 3.5 lakh crore codes · 6 run out in about 18 months at 10 crore a day</text>
{!still&&<g aria-hidden="true"><Dot x1={132} x2={224} y={130} y2={80} t0={.05} t1={.15} dur={D}/><Glow x={230} y={68} w={110} h={24} t0={.15} t1={.3} dur={D}/><Dot x1={342} x2={404} y={80} t0={.25} t1={.33} dur={D}/>
<Dot x1={132} x2={224} y={130} y2={180} t0={.5} t1={.6} dur={D}/><Glow x={230} y={168} w={110} h={24} t0={.6} t1={.75} dur={D}/><Dot x1={342} x2={404} y={180} t0={.7} t1={.78} dur={D}/></g>}</svg>}

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const QUESTION_FIGS={
"interview-clock":{C:ClockFig,ar:640/240,title:()=>"WHERE THE 45 MINUTES GO"},
"shortener-flow":{C:ShortenerFig,ar:640/300,title:()=>"CREATE A LINK, OPEN A LINK"},
"short-codes":{C:ShortCodesFig,ar:640/260,title:()=>"SHORT CODES THAT NEVER CLASH"},
};
