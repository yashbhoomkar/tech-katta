// Concepts › Staying up: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "reliability").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Glow,Show,Mark,Line,SBox,INK,RED,BLUE}from"../parts.jsx";

// Timeouts, FIG: requests in flight = arrival rate × time each takes. Zotato's order service has 2,000
// workers (10 servers × 200). Normally 2,000 orders/s × 0.2 s = 400 in flight. A 30 s payment call needs
// 60,000: far past the limit. A 0.5 s timeout caps it at 1,000.
function SlowCallFig({still,uid=""}){const D="9s",X=170,K=300/2000,cap=X+2000*K;
const rows=[["Normal, 0.2 s",400,BLUE,"400"],["0.5 s timeout",1000,BLUE,"1,000"],["Slow, 30 s",60000,RED,"60,000 needed"]];
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`slct${uid}`}><title id={`slct${uid}`}>Requests in flight equal the arrival rate times the time each takes. Zotato's order service has 2,000 workers. At 2,000 orders a second taking 0.2 seconds each, 400 are in flight. If the payment call takes 30 seconds, 60,000 would be needed, far past the 2,000 workers, so every worker is stuck. With a 0.5 second timeout, at most 1,000 are in flight.</title>
<text x="0" y="24" className="fb">Requests in flight at 2,000 orders a second</text>
{rows.map(([n,v,c,t],i)=>{const y=70+i*55,w=Math.min(v*K,640-X),bar=<g><rect x={X} y={y-14} width={w} height="28" fill={c} opacity={c===RED?.85:1}/><text x={v*K>110?X+8:X+w+8} y={y+5} className="fl" style={{fill:v*K>110?"#fff":INK}}>{t}</text></g>;
return <g key={n}><text x="0" y={y+5} className="fl">{n}</text>{c===RED&&!still?<Show t0={.3} t1={.98} dur={D}>{bar}</Show>:bar}</g>})}
<line x1={cap} y1="44" x2={cap} y2="216" stroke={INK} strokeDasharray="4 3"/><text x={cap-6} y="236" textAnchor="end" className="fl">2,000 workers (10 servers × 200)</text></svg>}

// Circuit breakers, FIG: three states. Closed (calls go through, failures counted) → open when half of
// the last 20 calls failed (fail at once) → half-open after 30 s (a few test calls) → closed if they
// pass, open again if one fails.
function BreakerFig({still,uid=""}){const M=`brk${uid}`,D="12s";
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`brkt${uid}`}><title id={`brkt${uid}`}>A circuit breaker has three states. Closed: calls go through and failures are counted. When half of the last 20 calls have failed, it opens: calls fail at once without waiting. After 30 seconds it becomes half-open and lets a few test calls through. If they pass, it closes again; if one fails, it opens again.</title><Mark m={M}/>
<SBox x={0} y={130} w={190} t="Closed: calls go through" blue/><SBox x={400} y={60} w={230} t="Open: fail at once"/><SBox x={400} y={200} w={230} t="Half-open: a few test calls"/>
<Line x1={192} y1={124} x2={396} y2={66} m={M}/><text x="250" y="78" textAnchor="end" className="fl">half of the last 20 failed</text>
<Line x1={480} y1={74} x2={480} y2={186} m={M}/><text x="474" y="134" textAnchor="end" className="fl">after 30 s</text>
<Line x1={545} y1={186} x2={545} y2={74} m={M} c={RED} dash/><text x="551" y="134" className="fl" style={{fill:RED}}>a test fails</text>
<Line x1={396} y1={196} x2={194} y2={138} m={M}/><text x="280" y="196" textAnchor="middle" className="fl">tests pass</text>
{!still&&<g aria-hidden="true"><Glow x={0} y={118} w={190} h={24} t0={0} t1={.25} dur={D}/><Dot x1={194} x2={394} y={123} y2={67} t0={.25} t1={.33} dur={D}/>
<Glow x={400} y={48} w={230} h={24} t0={.33} t1={.55} dur={D}/><Dot x1={480} x2={480} y={76} y2={184} t0={.55} t1={.63} dur={D}/>
<Glow x={400} y={188} w={230} h={24} t0={.63} t1={.8} dur={D}/><Dot x1={394} x2={196} y={197} y2={139} t0={.8} t1={.9} dur={D}/><Glow x={0} y={118} w={190} h={24} t0={.9} t1={.99} dur={D}/></g>}</svg>}

export const FIGS={
"slow-call":{C:SlowCallFig,ar:640/250,title:()=>"ONE SLOW CALL, EVERY WORKER STUCK"},
"breaker":{C:BreakerFig,ar:640/250,title:()=>"A CIRCUIT BREAKER'S THREE STATES"},
};
