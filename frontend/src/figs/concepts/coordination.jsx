// Concepts › Agreeing: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "coordination").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Glow,Show,Mark,Line,SBox,GREY,RED,BLUE}from"../parts.jsx";

// Consensus, FIG: a network split. Five machines, three in Mumbai and two in Hyderabad. The link between
// the cities breaks: the three still make a majority and keep accepting writes; the two can't, so they wait.
function QuorumSplitFig({still,uid=""}){const D="10s";const X=[10,130,250,400,520];
const city=(i)=>i<3?"Mumbai":"Hyderabad";
const after=<g><line x1={370} y1={40} x2={370} y2={190} stroke={RED} strokeWidth="2" strokeDasharray="6 4"/><text x={370} y={30} textAnchor="middle" className="fl" style={{fill:RED}}>link down</text>
<text x={130} y={170} textAnchor="middle" className="fb" style={{fill:BLUE}}>3 of 5: a majority</text><text x={130} y={188} textAnchor="middle" className="fl">elects a leader, keeps taking writes</text>
<text x={505} y={170} textAnchor="middle" className="fb" style={{fill:RED}}>2 of 5: no majority</text><text x={505} y={188} textAnchor="middle" className="fl">refuses writes and waits</text></g>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`qst${uid}`}><title id={`qst${uid}`}>Five machines that must agree: three in Mumbai and two in Hyderabad. The link between the cities breaks. The three in Mumbai are still a majority of five, so they elect a leader and keep accepting writes. The two in Hyderabad are not a majority, so they refuse writes and wait. The two sides can never both decide.</title>
{X.map((x,i)=><g key={x}><SBox x={x} y={100} w={110} t={`Machine ${i+1}`} blue={i<3}/><text x={x+55} y={130} textAnchor="middle" className="fl">{city(i)}</text></g>)}
{still?after:<Show t0={.25} t1={.98} dur={D}>{after}</Show>}
{!still&&<g aria-hidden="true"><Glow x={10} y={88} w={350} h={24} t0={.4} t1={.98} dur={D}/></g>}</svg>}

// Consensus, FIG: an election. A leads in term 4 and sends heartbeats. A stops. B's random wait runs out
// first: it starts term 5, votes for itself and asks C, who hasn't voted in term 5 yet and says yes. Two of
// three is a majority, so B leads term 5.
function ElectionFig({still,uid=""}){const M=`el${uid}`,D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`elt${uid}`}><title id={`elt${uid}`}>An election among three machines. A is the leader in term 4 and sends heartbeats. A stops. B's random wait runs out first, so B starts term 5, votes for itself and asks C for its vote. C has not voted in term 5 yet, so it says yes. Two votes out of three is a majority, and B leads term 5. If A comes back, it sees term 5 and steps down.</title><Mark m={M}/>
<text x={0} y={60} className="fb">A</text><text x={0} y={130} className="fb">B</text><text x={0} y={200} className="fb">C</text>
<SBox x={30} y={56} w={160} t="leader · term 4"/>{step(.15,<text x={210} y={60} className="fb" style={{fill:RED}}>✕ stops</text>)}
<SBox x={30} y={126} w={160} t="follower"/><SBox x={30} y={196} w={160} t="follower"/>
{step(.3,<text x={210} y={118} className="fl">no heartbeat for 210 ms</text>)}{step(.3,<text x={30} y={228} className="fl">waiting 280 ms…</text>)}
{step(.45,<SBox x={210} y={138} w={190} t="term 5: I vote me. You?" blue/>)}
{step(.55,<Line x1={305} y1={152} x2={305} y2={190} m={M}/>)}{step(.62,<text x={315} y={200} className="fl">C: yes, my first vote in term 5</text>)}
{step(.75,<SBox x={450} y={126} w={180} t="leader · term 5" blue/>)}{step(.85,<text x={450} y={60} className="fl">if A comes back: sees term 5,</text>)}{step(.85,<text x={450} y={76} className="fl">steps down</text>)}
{!still&&<g aria-hidden="true"><Dot x1={190} x2={190} y={70} y2={112} t0={.02} t1={.1} dur={D}/><Glow x={450} y={114} w={180} h={24} t0={.78} t1={.98} dur={D}/></g>}</svg>}

// Transactions across services, FIG: a saga that backs out. The order is placed, ₹480 is held on the
// card, the restaurant says no. Each finished step is undone by a new step: the hold is released and the
// customer is told. Nothing is left half done.
function SagaFig({still,uid=""}){const M=`sg${uid}`,D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`sgt${uid}`}><title id={`sgt${uid}`}>A saga for one order. Step 1: the order is placed. Step 2: 480 rupees are held on the customer's card. Step 3: the restaurant says no. Each finished step is then undone by a new step: the hold on the 480 rupees is released, then the order is cancelled and the customer is told. Nothing is left half done.</title><Mark m={M}/>
<text x={0} y={30} className="fb">Forward</text>
<SBox x={0} y={70} w={150} t="1 · order placed" blue/>{step(.15,<SBox x={210} y={70} w={170} t="2 · ₹480 held on card" blue/>)}{step(.3,<SBox x={440} y={70} w={196} t="3 · restaurant: no" down/>)}
{step(.15,<Line x1={152} y1={70} x2={206} y2={70} m={M}/>)}{step(.3,<Line x1={382} y1={70} x2={436} y2={70} m={M}/>)}
{step(.45,<text x={0} y={140} className="fb" style={{fill:RED}}>Undo, newest first</text>)}
{step(.5,<Line x1={540} y1={84} x2={390} y2={168} m={M} dash c={RED}/>)}{step(.55,<SBox x={210} y={180} w={170} t="release the ₹480"/>)}
{step(.7,<Line x1={208} y1={180} x2={174} y2={180} m={M} dash c={RED}/>)}{step(.72,<SBox x={0} y={180} w={170} t="cancel, tell customer"/>)}
{step(.85,<text x={0} y={220} className="fl">each undo is a new step, saved like any other; nothing is left half done</text>)}</svg>}

// Transactions across services, FIG: the outbox. The order service writes the order and a "payment
// requested" message in one local transaction. A relay reads new outbox rows and puts them on the queue;
// the payment service skips any message id it has already handled.
function OutboxFig({still,uid=""}){const M=`ob${uid}`,D="12s";
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`obt${uid}`}><title id={`obt${uid}`}>The outbox. The order service saves the order and a message saying "payment requested for order 91" in one local transaction, so both are saved or neither is. A relay reads new messages from the outbox and puts them on a queue. The payment service handles each message and skips any message id it has already handled, so a message sent twice charges once.</title><Mark m={M}/>
<rect x={0} y={20} width={250} height={150} fill="#fff" stroke={GREY}/><text x={12} y={42} className="fb">Order service's database</text>
<rect x={12} y={56} width={226} height={40} fill="#f8faff" stroke={BLUE}/><text x={22} y={73} className="fl">orders</text><text x={22} y={88} className="fl">#91 · placed</text>
<rect x={12} y={106} width={226} height={40} fill="#f8faff" stroke={BLUE}/><text x={22} y={123} className="fl">outbox</text><text x={22} y={138} className="fl">m_5 · payment requested · #91</text>
<text x={12} y={162} className="fl" style={{fill:BLUE}}>one local transaction: both or neither</text>
<SBox x={300} y={126} w={90} t="Relay"/><SBox x={430} y={126} w={80} t="Queue"/><SBox x={540} y={126} w={96} t="Payment"/>
<Line x1={240} y1={126} x2={296} y2={126} m={M}/><Line x1={392} y1={126} x2={426} y2={126} m={M}/><Line x1={512} y1={126} x2={536} y2={126} m={M}/>
<text x={590} y={160} textAnchor="middle" className="fl">m_5 again?</text><text x={590} y={176} textAnchor="middle" className="fl">skip it</text>
<text x={0} y={210} className="fl">without it: save, then crash before sending, and the payment is never asked for</text>
{!still&&<g aria-hidden="true"><Glow x={12} y={56} w={226} h={90} t0={.05} t1={.25} dur={D}/><Dot x1={242} x2={294} y={126} t0={.3} t1={.4} dur={D}/><Dot x1={394} x2={424} y={126} t0={.45} t1={.52} dur={D}/><Dot x1={514} x2={534} y={126} t0={.56} t1={.62} dur={D}/><Glow x={540} y={114} w={96} h={24} t0={.62} t1={.8} dur={D}/></g>}</svg>}

export const FIGS={
"quorum-split":{C:QuorumSplitFig,ar:640/220,title:()=>"THREE OF FIVE KEEP GOING"},
"election":{C:ElectionFig,ar:640/240,title:()=>"A NEW LEADER IN 300 MS"},
"saga":{C:SagaFig,ar:640/230,title:()=>"BACKING OUT, STEP BY STEP"},
"outbox":{C:OutboxFig,ar:640/240,title:()=>"SAVE AND SEND, TOGETHER"},
};
