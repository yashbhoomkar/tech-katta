// Figures for the Concepts articles (the APIs article's own figures are in dashboard.jsx). Same
// conventions as components.jsx: 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated
// when `still`, and a `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark,Mk,Bx,Ar,Caps,Cap,Life,Msg}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
const SBox=({x,y,w=110,t,blue,down})=><g><rect x={x} y={y-12} width={w} height="24" fill={down?"#fff5f4":blue?"#f8faff":"#fff"} stroke={down?RED:blue?BLUE:GREY} strokeDasharray={down?"4 3":undefined}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

// Replication, FIG: one payment write, two ways. Synchronous: the leader waits for the follower in
// the other zone before saying OK, so the answer takes a few milliseconds longer and a crash loses
// nothing. Asynchronous: OK at once; the follower gets the write a moment later, and a crash in that
// moment loses it.
function ReplSyncFig({still,uid=""}){const M=`rs${uid}`,D="10s";
const row=(y,label,sub,sync)=><g><text x="0" y={y-40} className="fb">{label}</text><text x="0" y={y-24} className="fl">{sub}</text>
<SBox x={0} y={y} w={90} t="Payments"/><SBox x={200} y={y} w={120} t="Leader · zone A" blue/><SBox x={470} y={y} w={150} t="Follower · zone B"/>
<Line x1={92} y1={y-4} x2={196} y2={y-4} m={M}/><Line x1={196} y1={y+6} x2={94} y2={y+6} m={M} dash/>
<Line x1={322} y1={y-4} x2={466} y2={y-4} m={M} c={sync?INK:GREY}/>{sync&&<Line x1={466} y1={y+6} x2={324} y2={y+6} m={M} dash/>}
<text x="144" y={y-10} textAnchor="middle" className="fl">write</text><text x="144" y={y+22} textAnchor="middle" className="fl">OK</text>
<text x="394" y={y-10} textAnchor="middle" className="fl">{sync?"copy, then wait":"copy later"}</text>{sync&&<text x="394" y={y+22} textAnchor="middle" className="fl">got it</text>}</g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rst${uid}`}><title id={`rst${uid}`}>Synchronous replication: the payments service writes to the leader, the leader copies the write to the follower in another zone and waits for its reply, then answers OK. The answer takes a few milliseconds longer, and if the leader crashes right after, the follower already has the payment. Asynchronous replication: the leader answers OK at once and sends the copy afterwards. The answer is faster, but if the leader crashes before the copy arrives, that payment is lost.</title><Mark m={M}/>
{row(90,"Synchronous","OK after the follower has it · +2 ms · nothing lost",true)}
<line x1="0" y1="150" x2="640" y2="150" stroke="#e6eaf0"/>
{row(230,"Asynchronous","OK at once · the follower is a moment behind",false)}
{still?<text x="394" y="258" textAnchor="middle" className="fl" style={{fill:RED}}>crash before the copy: payment lost</text>:<g aria-hidden="true">
<Dot x1={94} x2={194} y={86} t0={.02} t1={.1} dur={D}/><Dot x1={324} x2={464} y={86} t0={.12} t1={.24} dur={D}/><Glow x={470} y={78} w={150} h={24} t0={.24} t1={.3} dur={D}/><Dot x1={464} x2={326} y={96} t0={.3} t1={.4} dur={D}/><Dot x1={194} x2={96} y={96} t0={.42} t1={.5} dur={D}/>
<Show t0={.5} t1={.98} dur={D}><text x="144" y="134" textAnchor="middle" className="fl" style={{fill:BLUE}}>OK · safe in two zones</text></Show>
<Dot x1={94} x2={194} y={226} t0={.55} t1={.63} dur={D}/><Dot x1={194} x2={96} y={236} t0={.65} t1={.72} dur={D}/>
<Show t0={.72} t1={.98} dur={D}><text x="144" y="274" textAnchor="middle" className="fl" style={{fill:BLUE}}>OK · faster</text></Show>
<Show t0={.76} t1={.98} dur={D}><text x="394" y="258" textAnchor="middle" className="fl" style={{fill:RED}}>crash now: payment lost</text></Show>
<Dot x1={324} x2={464} y={226} t0={.86} t1={.97} dur={D}/></g>}</svg>}

// Replication, FIG: failover with asynchronous followers. The leader (term 1) dies while follower 1 is
// two writes behind. Follower 1 is promoted (term 2) and the two writes are gone. The old leader comes
// back still believing it leads; its writes carry term 1 and are refused, so there are never two leaders.
function ReplFailoverFig({still,uid=""}){const D="14s",LOG=(x,y,n,lost)=><g>{Array.from({length:n},(_,i)=><rect key={i} x={x+i*18} y={y} width="14" height="14" fill={lost&&i>=n-2?"#fff5f4":"#dfe6fb"} stroke={lost&&i>=n-2?RED:BLUE} strokeDasharray={lost&&i>=n-2?"3 2":undefined}/>)}</g>;
const caps=[["1 · leader (term 1) takes writes; followers copy them a moment later",INK],["2 · the leader's machine dies; follower 1 is two writes behind",RED],["3 · follower 1 becomes leader, term 2; those two writes are lost",RED],["4 · the old leader returns, still says term 1; its writes are refused",BLUE]];
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`rft${uid}`}><title id={`rft${uid}`}>The leader, in term 1, accepts writes and two followers copy them asynchronously. The leader's machine fails while follower 1 is two writes behind. Follower 1 is promoted to leader for term 2, and the two writes only the old leader had are lost. When the old leader comes back it still believes it is the leader of term 1, but the database and its clients only accept term 2, so its writes are refused and there are never two leaders at once.</title>
<text x="60" y="88" className="fb">Leader · zone A</text>{LOG(60,98,8,still)}
<text x="250" y="88" className="fb">Follower 1 · zone B</text>{LOG(250,98,6)}
<text x="440" y="88" className="fb">Follower 2 · zone C</text>{LOG(440,98,5)}
<text x="60" y="140" className="fl">8 writes · term 1</text><text x="250" y="140" className="fl">6 writes</text><text x="440" y="140" className="fl">5 writes</text>
{still?<g><rect x="54" y="72" width="160" height="80" fill="none" stroke={RED} strokeDasharray="4 3"/><text x="60" y="176" className="fl" style={{fill:RED}}>failed</text><text x="60" y="192" className="fl" style={{fill:RED}}>writes 7, 8 never copied</text><rect x="244" y="72" width="160" height="80" fill="none" stroke={BLUE} strokeWidth="2"/><text x="250" y="176" className="fl" style={{fill:BLUE}}>new leader · term 2</text>
<text x="10" y="30" className="fb" style={{fill:RED}}>{caps[2][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Dot x1={60} x2={250} y={60} t0={.04} t1={.16} dur={D}/><Dot x1={60} x2={440} y={60} t0={.08} t1={.22} dur={D}/>
<Show t0={.25} t1={.75} dur={D}><rect x="54" y="72" width="160" height="80" fill="#fff5f4" opacity=".6" stroke={RED} strokeDasharray="4 3"/><text x="60" y="176" className="fl" style={{fill:RED}}>failed</text><text x="60" y="192" className="fl" style={{fill:RED}}>writes 7, 8 never copied</text></Show><Show t0={.25} t1={1} dur={D}>{[6,7].map(i=><rect key={i} x={60+i*18} y="98" width="14" height="14" fill="#fff5f4" stroke={RED} strokeDasharray="3 2"/>)}</Show>
<Show t0={.5} t1={1} dur={D}><rect x="244" y="72" width="160" height="80" fill="none" stroke={BLUE} strokeWidth="2"/><text x="250" y="176" className="fl" style={{fill:BLUE}}>new leader · term 2</text><Dot x1={260} x2={440} y={160} t0={.55} t1={.68} dur={D}/></Show>
<Show t0={.75} t1={1} dur={D}><text x="60" y="176" className="fl">back · "I'm leader, term 1"</text><text x="60" y="230" className="fb" style={{fill:BLUE}}>write with term 1 → refused: the current term is 2</text><text x="60" y="250" className="fl">the old leader drops its two extra writes and follows the new leader</text></Show></g>}</svg>}

// Consistency, FIG: a restaurant changes a biryani's price from ₹250 to ₹280 at 100 ms. What four
// readers see over the next half-second: a strong read always shows the newest value; the restaurant
// owner, reading their own write, sees it at once; a customer on a replica 250 ms behind sees it late;
// a customer bounced between two replicas sees ₹280, then ₹250 again, then ₹280.
function ConsistencyTimelineFig({still,uid=""}){const D="10s",X0=200,X1=620,T=500,x=(t)=>X0+(t/T)*(X1-X0);
const rows=[["Leader (the truth)",[[0,100,0],[100,500,1]],"price changed at 100 ms"],["Strong read",[[0,100,0],[100,500,1]],"always the newest"],["The owner, reading own write",[[0,100,0],[100,500,1]],"reads go to the leader"],["Replica 250 ms behind",[[0,350,0],[350,500,1]],"eventual: late, then right"],["Two replicas, no stickiness",[[0,100,0],[100,180,1],[180,300,0],[300,500,1]],"₹280, then ₹250 again"]];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`ctt${uid}`}><title id={`ctt${uid}`}>A restaurant changes a biryani from 250 to 280 rupees at 100 milliseconds. The leader and any strongly consistent read show 280 from that moment. The owner, whose own reads go to the leader after a change, also sees 280 at once. A customer reading from a replica 250 milliseconds behind sees 250 until 350 milliseconds, then 280: eventually consistent. A customer whose reads land on two different replicas sees 280, then 250 again, then 280, as if time went backwards.</title>
{rows.map(([n,segs,note],i)=>{const y=60+i*44;return <g key={n}><text x="0" y={y+4} className="fb">{n}</text><text x="0" y={y+18} className="fl">{note}</text>
{segs.map(([a,b,v],j)=><g key={j}><rect x={x(a)} y={y-10} width={x(b)-x(a)-1} height="20" fill={v?"#dfe6fb":"#f1f3f6"} stroke={v?BLUE:GREY}/>{x(b)-x(a)>40&&<text x={(x(a)+x(b))/2} y={y+4} textAnchor="middle" className="fl" style={v?{fill:BLUE}:undefined}>₹{v?280:250}</text>}</g>)}</g>})}
<line x1={x(100)} y1="40" x2={x(100)} y2="260" stroke={INK} strokeDasharray="4 3"/><text x={x(100)} y="34" textAnchor="middle" className="fl">change at 100 ms</text>
{[0,100,200,300,400,500].map(t=><text key={t} x={x(t)} y="282" textAnchor="middle" className="fl">{t} ms</text>)}
{!still&&<line x1={x(0)} y1="44" x2={x(0)} y2="262" stroke={RED} strokeWidth="1.5" aria-hidden="true"><animate attributeName="x1" values={`${x(0)};${x(500)}`} dur={D} repeatCount="indefinite"/><animate attributeName="x2" values={`${x(0)};${x(500)}`} dur={D} repeatCount="indefinite"/></line>}</svg>}

// Consistency, FIG: two riders tap Accept on order 123 within milliseconds. On an eventually
// consistent store each replica says yes and both ride to the restaurant. With one copy deciding
// (UPDATE … WHERE rider_id IS NULL), the second rider's update changes no row and they're told no.
function DoubleAcceptFig({still,uid=""}){const M=`da${uid}`,D="12s";
const half=(y,title,sub,strong)=><g><text x="0" y={y-38} className="fb" style={!strong?{fill:RED}:{fill:BLUE}}>{title}</text><text x="0" y={y-22} className="fl">{sub}</text>
<SBox x={0} y={y} w={100} t="Rider Asha"/><SBox x={0} y={y+44} w={100} t="Rider Ravi"/>
{strong?<><SBox x={250} y={y+22} w={150} t="Orders · leader" blue/><Line x1={102} y1={y} x2={246} y2={y+16} m={M}/><Line x1={102} y1={y+44} x2={246} y2={y+28} m={M}/>
<text x="420" y={y+4} className="fl" style={{fill:BLUE}}>Asha: 1 row changed → yours</text><text x="420" y={y+44} className="fl" style={{fill:RED}}>Ravi: 0 rows → taken</text></>
:<><SBox x={250} y={y} w={150} t="Replica 1"/><SBox x={250} y={y+44} w={150} t="Replica 2"/><Line x1={102} y1={y} x2={246} y2={y} m={M}/><Line x1={102} y1={y+44} x2={246} y2={y+44} m={M}/>
<text x="420" y={y+4} className="fl">Asha: accepted</text><text x="420" y={y+48} className="fl">Ravi: accepted</text><text x="420" y={y+26} className="fb" style={{fill:RED}}>two riders, one order</text></>}</g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`dat${uid}`}><title id={`dat${uid}`}>Two riders, Asha and Ravi, tap Accept on order 123 within a few milliseconds. In an eventually consistent store their writes reach two different replicas, each of which sees the order as free and says yes, so both riders head to the restaurant. With one copy deciding, the write is UPDATE orders SET rider_id = Asha WHERE id = 123 AND rider_id IS NULL: Asha's changes one row and she gets the order, Ravi's changes none and he is told it's taken.</title><Mark m={M}/>
{half(70,"Eventually consistent: each copy decides","both replicas think the order is free",false)}
<line x1="0" y1="150" x2="640" y2="150" stroke="#e6eaf0"/>
{half(212,"One copy decides","UPDATE orders SET rider_id = ? WHERE id = 123 AND rider_id IS NULL",true)}
{!still&&<g aria-hidden="true"><Dot x1={102} x2={244} y={70} t0={.05} t1={.18} dur={D}/><Dot x1={102} x2={244} y={114} t0={.06} t1={.19} dur={D}/>
<Dot x1={102} x2={244} y={212} y2={228} t0={.52} t1={.64} dur={D}/><Dot x1={102} x2={244} y={256} y2={240} t0={.55} t1={.67} dur={D}/><Glow x={250} y={222} w={150} h={24} t0={.64} t1={.76} dur={D}/></g>}</svg>}

// CAP, FIG: Zotato runs in Mumbai and Hyderabad with a copy of the data in each. The link between them
// breaks. A wallet top-up arriving in Hyderabad is refused (consistency first: Hyderabad can't check
// with Mumbai). A menu edit arriving in Hyderabad is accepted (availability first), so the two copies
// differ until the link is back and the edits are merged.
function CapSplitFig({still,uid=""}){const M=`cap${uid}`,D="14s";
const caps=[["1 · normally every change is copied both ways",INK],["2 · the link between the regions breaks",RED],["3 · wallet top-up in Hyderabad: refused (consistency first)",BLUE],["4 · menu edit in Hyderabad: accepted (availability first); merged later",BLUE]];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`capt${uid}`}><title id={`capt${uid}`}>Zotato keeps a copy of its data in Mumbai and in Hyderabad, and normally every change is copied between them. When the network link between the regions breaks, each side can still serve its own users but can't reach the other. A wallet top-up arriving in Hyderabad is refused, because Hyderabad can't be sure of the balance without Mumbai: consistency first. A restaurant's menu edit arriving in Hyderabad is accepted, so the two copies differ for a while and the edits are merged when the link returns: availability first.</title><Mark m={M}/>
<rect x="20" y="70" width="220" height="150" fill="#fff" stroke={GREY}/><text x="130" y="92" textAnchor="middle" className="fb">Mumbai</text><SBox x={60} y={140} w={140} t="Copy of the data" blue/>
<rect x="400" y="70" width="220" height="150" fill="#fff" stroke={GREY}/><text x="510" y="92" textAnchor="middle" className="fb">Hyderabad</text><SBox x={440} y={140} w={140} t="Copy of the data" blue/>
<Line x1={202} y1={136} x2={436} y2={136} m={M} c={GREY}/><Line x1={436} y1={146} x2={204} y2={146} m={M} c={GREY}/>
<text x="10" y="252" className="fl">wallet, payments, rider assignment → refuse during a split</text><text x="10" y="270" className="fl">menus, carts, reviews → accept, merge afterwards</text>
{still?<g><text x="10" y="30" className="fb" style={{fill:RED}}>The link is down: each side decides on its own</text><text x="320" y="132" textAnchor="middle" className="fb" style={{fill:RED}}>✕</text><text x="320" y="170" textAnchor="middle" className="fl" style={{fill:RED}}>link down</text><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>top-up: "try again soon"</text><text x="510" y="212" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu edit: saved, synced later</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Dot x1={204} x2={434} y={136} t0={.03} t1={.12} dur={D}/><Dot x1={434} x2={206} y={146} t0={.12} t1={.21} dur={D}/>
<Show t0={.25} t1={1} dur={D}><text x="320" y="132" textAnchor="middle" className="fb" style={{fill:RED}}>✕</text><text x="320" y="170" textAnchor="middle" className="fl" style={{fill:RED}}>link down</text></Show>
<Show t0={.5} t1={.75} dur={D}><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>top-up: "try again soon"</text><Glow x={440} y={128} w={140} h={24} t0={0} t1={1} dur={D}/></Show>
<Show t0={.75} t1={1} dur={D}><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu edit: saved here</text><text x="130" y="196" textAnchor="middle" className="fl">still shows the old menu</text></Show></g>}</svg>}

// PACELC, FIG: with no split at all, each copy a write waits for adds time. Rough figures for one
// write from Mumbai: confirmed by the machine itself, by a standby in another Mumbai zone, by a copy in
// Hyderabad, by a copy in Singapore.
function PacelcFig({still,uid=""}){const D="10s",B=230;
const bars=[["This machine","~1 ms","lost if it dies",1],["+ another zone","~3 ms","survives a zone",3],["+ Hyderabad","~25 ms","survives a region",25],["+ Singapore","~65 ms","survives a country",65]];
const k=2.6,X=[90,230,370,510];
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`pct${uid}`}><title id={`pct${uid}`}>With no network split, the trade-off is latency against consistency. A write from Mumbai confirmed by its own machine takes about 1 millisecond but is lost if that machine dies. Waiting for a standby in another Mumbai zone takes about 3 milliseconds and survives a zone failure. Waiting for a copy in Hyderabad takes about 25 milliseconds and survives a region failure. Waiting for a copy in Singapore takes about 65 milliseconds.</title>
<text x="10" y="24" className="fb">One write from Mumbai, confirmed after…</text><text x="10" y="42" className="fl">rough round-trip times; every write pays it, every day</text>
<line x1="60" y1={B} x2="620" y2={B} stroke={GREY}/>
{bars.map(([n,ms,sub,v],i)=>{const h=Math.max(3,v*k),x=X[i];const bar=<g><rect x={x} y={B-h} width="90" height={h} rx="2" fill={i<2?"#9db3ef":BLUE}/><text x={x+45} y={B-h-8} textAnchor="middle" className="fb">{ms}</text></g>;
return <g key={n}>{still?bar:<Show t0={i*.2} t1={.98} dur={D}>{bar}</Show>}<text x={x+45} y={B+18} textAnchor="middle" className="fl">{n}</text><text x={x+45} y={B+34} textAnchor="middle" className="fl" style={{fill:GREY}}>{sub}</text></g>})}</svg>}

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

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
// From tap to server, FIG 1: the first request on a new connection. A phone on 4G in Pune asks DNS for
// api.zotato.in, opens TCP, agrees TLS keys and then sends the HTTP request: four round trips of about 40 ms
// each plus 20 ms on the server, about 180 ms. On a reused connection only the last round trip happens.
function NetFirstFig({still,uid=""}){const M=`nf${uid}`,D="14s",X={p:95,d:290,s:520};
const caps=[["1 · DNS: the phone asks which address api.zotato.in has (1 round trip)",INK],["2 · TCP: SYN, SYN-ACK, and the connection is open (1 round trip)",INK],["3 · TLS 1.3: keys agreed, the server's certificate checked (1 round trip)",INK],["4 · HTTP: the request and the menu (1 round trip + 20 ms of work)",BLUE]];
const T=(y,t)=><text x="10" y={y+4} className="fl">{t}</text>;
const m=[<g key={1}><Msg x1={X.p} x2={X.d} y={100} t="api.zotato.in?" m={M}/><Msg x1={X.d} x2={X.p} y={118} t="13.235.x.x" m={M}/>{T(100,"0 ms")}</g>,
<g key={2}><Msg x1={X.p} x2={X.s} y={150} t="SYN" tx={410} m={M}/><Msg x1={X.s} x2={X.p} y={166} t="SYN-ACK" tx={410} m={M}/>{T(150,"40 ms")}</g>,
<g key={3}><Msg x1={X.p} x2={X.s} y={198} t="TLS hello" tx={410} m={M}/><Msg x1={X.s} x2={X.p} y={214} t="certificate, keys" tx={410} m={M}/>{T(198,"80 ms")}</g>,
<g key={4}><Msg x1={X.p} x2={X.s} y={246} t="GET /restaurants/42/menu" tx={400} m={M}/><Msg x1={X.s} x2={X.p} y={270} t="200 OK · menu" tx={400} m={M} c={BLUE}/>{T(246,"120 ms")}{T(276,"180 ms")}<text x="10" y="316" className="fl" style={{fill:BLUE}}>4 round trips ≈ 180 ms on a new connection; on a reused one only the last: ≈ 60 ms.</text></g>];
return <svg viewBox="0 0 640 326" role="img" aria-labelledby={`nft${uid}`}><title id={`nft${uid}`}>A sequence diagram of the first request a phone makes to the Zotato API. The phone, on 4G in Pune, first asks a DNS resolver for the address of api.zotato.in: one round trip, about 40 milliseconds. It then opens a TCP connection with SYN and SYN-ACK: another round trip. TLS 1.3 agrees encryption keys and checks the server's certificate: a third. Finally the phone sends GET /restaurants/42/menu and the menu comes back: a fourth round trip plus about 20 milliseconds of work on the server, about 180 milliseconds in all. On a connection that is already open, only the last round trip is needed, about 60 milliseconds.</title><Mk m={M}/>
<Life x={X.p} t="Phone" s="4G, Pune" y1={292}/><Life x={X.d} t="DNS resolver" y1={292}/><Life x={X.s} t="Zotato API" s="Mumbai" y1={292}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.p} x2={X.d} y={100} t0={.04} t1={.12} dur={D}/><Dot x1={X.d} x2={X.p} y={118} t0={.13} t1={.21} dur={D}/><Dot x1={X.p} x2={X.s} y={150} t0={.29} t1={.37} dur={D}/><Dot x1={X.s} x2={X.p} y={166} t0={.38} t1={.46} dur={D}/>
<Dot x1={X.p} x2={X.s} y={198} t0={.54} t1={.62} dur={D}/><Dot x1={X.s} x2={X.p} y={214} t0={.63} t1={.71} dur={D}/><Dot x1={X.p} x2={X.s} y={246} t0={.79} t1={.87} dur={D}/><Dot x1={X.s} x2={X.p} y={270} t0={.89} t1={.97} dur={D}/></g>}</svg>}

// From tap to server, FIG 2: four ways to get live updates. The rider moves at 3, 7 and 12 seconds. Polling
// every 2 s: five of eight polls find nothing and news waits for the next poll. Long polling: the server holds
// the request until there is news. Server-sent events: one open response, pushed updates. WebSocket: one
// connection, messages both ways.
function NetLiveFig({still,uid=""}){const D="14s",x=t=>180+t*29,Y=[84,138,192,246],U=[3,7,12];
const caps=[["1 · polling every 2 s: most polls find nothing, and news waits for the next one",RED],["2 · long polling: the server holds each request until there is news",INK],["3 · server-sent events: one response stays open and the server pushes updates",BLUE],["4 · WebSocket: one connection, messages both ways",BLUE]];
const dot=(t,y,c=BLUE)=><circle key={t+"-"+y} cx={x(t)} cy={y} r="5" fill={c}/>,ring=(t,y)=><circle key={"r"+t} cx={x(t)} cy={y} r="5" fill="#fff" stroke={GREY}/>;
const bar=(a,b,y,c=BLUE)=><rect key={a+"-"+y} x={x(a)} y={y-4} width={x(b)-x(a)} height="8" fill={c} opacity=".18" stroke={c} strokeOpacity=".5"/>;
const base=<g>{U.map(t=><g key={t}><line x1={x(t)} y1="56" x2={x(t)} y2="262" stroke={GREY} strokeDasharray="3 3"/><text x={x(t)} y="50" textAnchor="middle" className="fl">rider moved</text></g>)}<line x1={x(0)} y1="272" x2={x(15)} y2="272" stroke={GREY}/>{[0,5,10,15].map(t=><text key={t} x={x(t)} y="286" textAnchor="middle" className="fl">{t} s</text>)}</g>;
const lab=(i,t,s)=><g><text x="10" y={Y[i]} className="fb">{t}</text><text x="10" y={Y[i]+14} className="fl">{s}</text></g>;
const r=[<g key={0}>{lab(0,"Polling, every 2 s","5 of 8 polls empty")}{[0,2,4,6,8,10,12,14].map(t=>[4,8,12].includes(t)?dot(t,Y[0]):ring(t,Y[0]))}</g>,
<g key={1}>{lab(1,"Long polling","held until news")}{bar(0,3,Y[1])}{bar(3,7,Y[1])}{bar(7,12,Y[1])}{bar(12,15,Y[1])}{U.map(t=>dot(t,Y[1]))}</g>,
<g key={2}>{lab(2,"Server-sent events","one-way stream")}{bar(0,15,Y[2])}{U.map(t=>dot(t,Y[2]))}</g>,
<g key={3}>{lab(3,"WebSocket","both ways")}{bar(0,15,Y[3])}{U.map(t=>dot(t,Y[3]))}{[5,10].map(t=><g key={t}><rect x={x(t)-5} y={Y[3]-5} width="10" height="10" fill={INK}/><text x={x(t)} y={Y[3]-10} textAnchor="middle" className="fl">chat</text></g>)}</g>];
return <svg viewBox="0 0 640 296" role="img" aria-labelledby={`nlt${uid}`}><title id={`nlt${uid}`}>Four ways for the customer's app to learn that the rider moved, at 3, 7 and 12 seconds. Polling every 2 seconds: five of the eight polls find nothing, and each update waits for the next poll. Long polling: the server holds each request open until there is news, answers at once, and the app asks again. Server-sent events: one response stays open and the server pushes each update down it. WebSocket: one connection carries messages both ways, the rider's location in and chat messages out.</title>
{base}{still?<g>{r}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{r.map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

// Shaping an API, FIG 1: offset or cursor. Page 1 shows orders 50 to 46; order 51 arrives; ?offset=5 then
// returns 46 to 42, repeating 46; ?before=46 returns 45 to 41, with nothing repeated or missed.
function ApiPagesFig({still,uid=""}){const D="14s",X=[20,240,460],Y=i=>96+i*30;
const caps=[["1 · page 1 of a restaurant's orders, newest first: 50 down to 46",INK],["2 · a new order, 51, arrives before the next page is loaded",INK],["3 · ?offset=5 skips five rows of the new list, so order 46 shows up twice",RED],["4 · ?before=46 asks for orders older than the last one seen: no repeats, no gaps",BLUE]];
const row=(x,i,n,c=GREY,fill="#fff")=><g key={x+"-"+n}><rect x={x} y={Y(i)-14} width="160" height="26" fill={fill} stroke={c}/><text x={x+12} y={Y(i)+4} className="fl">order {n}</text></g>;
const col=(i,t)=><text x={X[i]} y="72" className="fb">{t}</text>;
const p1=<g>{col(0,"page 1")}{[50,49,48,47,46].map((n,i)=>row(X[0],i,n))}</g>;
const s2=<g>{row(X[0],-1,51,BLUE,"#f8faff")}<text x={X[0]+170} y={Y(-1)+4} className="fl" style={{fill:BLUE}}>new</text></g>;
const s3=<g>{col(1,"page 2 · ?offset=5")}{[46,45,44,43,42].map((n,i)=>row(X[1],i,n,n===46?RED:GREY,n===46?"#fff5f4":"#fff"))}<text x={X[1]} y="262" className="fl" style={{fill:RED}}>46 again: the list moved under it</text></g>;
const s4=<g>{col(2,"page 2 · ?before=46")}{[45,44,43,42,41].map((n,i)=>row(X[2],i,n,BLUE,"#f8faff"))}<text x={X[2]} y="262" className="fl" style={{fill:BLUE}}>picks up right after 46</text></g>;
return <svg viewBox="0 0 640 276" role="img" aria-labelledby={`apt${uid}`}><title id={`apt${uid}`}>Offset pagination against cursor pagination on a restaurant's order list, newest first. Page 1 shows orders 50 down to 46. A new order, 51, arrives before the next page is loaded. Asking for page 2 with offset 5 skips five rows of the new list, so it returns orders 46 to 42 and order 46 appears twice. Asking for orders before 46, a cursor, returns 45 to 41: nothing is repeated or missed.</title>
{p1}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Shaping an API, FIG 2: slow work as a job. The partner app asks for October's statement; the API queues a
// job and answers 202 at once; a worker spends about 40 s on it; the app checks the job (running), then
// checks again and gets a link to the file.
function ApiJobFig({still,uid=""}){const M=`aj${uid}`,D="14s",X={a:90,s:320,w:540};
const caps=[["1 · the app asks for October's statement; the API queues a job and answers 202 at once",INK],["2 · a worker builds the statement, which takes about 40 seconds",INK],["3 · meanwhile the app checks on the job: still running",INK],["4 · the job is done, and the next check returns a link to the file",BLUE]];
const m=[<g key={1}><Msg x1={X.a} x2={X.s} y={100} t="POST /statements · month=10" m={M}/><Msg x1={X.s} x2={X.a} y={124} t="202 Accepted · job 77" m={M} c={BLUE}/></g>,
<g key={2}><Msg x1={X.s} x2={X.w} y={150} t="queue: job 77" m={M} dash/><rect x={X.w-5} y="160" width="10" height="84" fill="#dfe6fb" stroke={BLUE}/><text x={X.w+12} y="206" className="fl">~40 s</text></g>,
<g key={3}><Msg x1={X.a} x2={X.s} y={184} t="GET /jobs/77" m={M}/><Msg x1={X.s} x2={X.a} y={204} t="running, 40%" m={M}/></g>,
<g key={4}><Msg x1={X.w} x2={X.s} y={244} t="done: statement.pdf" m={M} dash/><Msg x1={X.a} x2={X.s} y={268} t="GET /jobs/77" m={M}/><Msg x1={X.s} x2={X.a} y={290} t="done · download link" m={M} c={BLUE}/></g>];
return <svg viewBox="0 0 640 306" role="img" aria-labelledby={`ajt${uid}`}><title id={`ajt${uid}`}>A sequence diagram of slow work handled as a job. The restaurant partner app asks the statements API for October's statement. The API puts a job on a queue and answers at once with 202 Accepted and job number 77. A worker takes about 40 seconds to build the statement. Meanwhile the app checks job 77 and hears that it is still running, 40 percent done. When the worker finishes, the next check returns done, with a link to download the file.</title><Mk m={M}/>
<Life x={X.a} t="Partner app" y1={298}/><Life x={X.s} t="Statements API" y1={298}/><Life x={X.w} t="Worker" y1={298}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.a} x2={X.s} y={100} t0={.03} t1={.11} dur={D}/><Dot x1={X.s} x2={X.a} y={124} t0={.13} t1={.21} dur={D}/><Dot x1={X.s} x2={X.w} y={150} t0={.28} t1={.36} dur={D}/><Dot x1={X.a} x2={X.s} y={184} t0={.53} t1={.61} dur={D}/><Dot x1={X.s} x2={X.a} y={204} t0={.63} t1={.71} dur={D}/><Dot x1={X.s} x2={X.a} y={290} t0={.88} t1={.97} dur={D}/></g>}</svg>}

// Back-of-envelope, FIG 1: a 300 ms budget for opening a restaurant page on 4G. The round trip costs 80 ms,
// the gateway 5 ms, three parallel calls as long as the slowest (delivery ETA, 60 ms), building the reply 5 ms,
// downloading 80 KB 64 ms, drawing 40 ms: 254 ms.
function EstBudgetFig({still,uid=""}){const D="14s",x=ms=>20+ms*2,Y=110;
const S=[[0,80,"round trip",GREY],[80,85,"",GREY],[85,145,"calls",BLUE],[145,150,"",GREY],[150,214,"download",GREY],[214,254,"draw",GREY]];
const caps=[["1 · the target: the restaurant page on screen within 300 ms, on 4G",INK],["2 · the round trip to Mumbai alone costs 80 ms, before any work is done",INK],["3 · three calls run in parallel, so the slowest, delivery ETA at 60 ms, sets the pace",BLUE],["4 · downloading and drawing add about 100 ms: 254 ms, inside the budget",BLUE]];
const seg=([a,b,t,c],k)=><g key={k}><rect x={x(a)} y={Y-16} width={x(b)-x(a)} height="32" fill={c===BLUE?"#dfe6fb":"#eef1f5"} stroke={c}/>{t&&<text x={(x(a)+x(b))/2} y={Y+4} textAnchor="middle" className="fl">{t}</text>}</g>;
const base=<g><line x1={x(300)} y1="70" x2={x(300)} y2="150" stroke={RED} strokeDasharray="4 3"/><text x={x(300)} y="64" textAnchor="end" className="fl" style={{fill:RED}}>budget 300 ms</text>{[0,100,200,300].map(t=><text key={t} x={x(t)} y="152" textAnchor="middle" className="fl">{t} ms</text>)}</g>;
const calls=<g>{[["menu, from cache",2],["offers, from the database",15],["delivery ETA service",60]].map(([t,ms],i)=><g key={t}><rect x={x(85)} y={176+i*22} width={Math.max(2,ms*2)} height="14" fill={i===2?"#dfe6fb":"#eef1f5"} stroke={i===2?BLUE:GREY}/><text x={x(85)+ms*2+8} y={187+i*22} className="fl" style={i===2?{fill:BLUE}:undefined}>{t}: {ms} ms</text></g>)}</g>;
const total=<text x={x(254)} y="88" textAnchor="middle" className="fb" style={{fill:BLUE}}>254 ms</text>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`ebt${uid}`}><title id={`ebt${uid}`}>A time budget of 300 milliseconds for opening a restaurant page on a 4G phone. The round trip to the Mumbai servers costs 80 milliseconds before any work starts. The gateway and sign-in check take 5. Three calls run in parallel: the menu from the cache in 2 milliseconds, offers from the database in 15, and the delivery-time service in 60, so the slowest, 60, sets the pace. Building the reply takes 5, downloading 80 kilobytes takes about 64, and drawing the page about 40. The total is 254 milliseconds, inside the budget.</title>
{base}{still?<g>{S.map(seg)}{calls}{total}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{seg(S[0],0)}</Show><Show t0={.5} t1={1} dur={D}>{seg(S[1],1)}{seg(S[2],2)}{calls}</Show><Show t0={.75} t1={1} dur={D}>{seg(S[3],3)}{seg(S[4],4)}{seg(S[5],5)}{total}</Show></g>}</svg>}

// Back-of-envelope, FIG 2: from a requirement to a decision. 1 crore orders a day ÷ 1 lakh seconds ≈ 116 a
// second; × 3 at dinner ≈ 350 writes a second; × 20 reads per order ≈ 7,000 reads a second; × 2 KB ≈ 20 GB a
// day; × 365 ≈ 7.3 TB a year.
function EstFunnelFig({still,uid=""}){const M=`ef${uid}`,D="14s",X=[20,230,440],W=180;
const B=[[0,60,"1 crore orders a day","the requirement"],[1,60,"≈ 116 a second","÷ 1 lakh seconds"],[2,60,"≈ 350 writes a second","× 3 at dinner time"],[0,150,"≈ 7,000 reads a second","× 20 reads per order"],[1,150,"≈ 20 GB a day","× 2 KB per order"],[2,150,"≈ 7.3 TB a year","× 365"]];
const caps=[["1 · start from the requirement: 1 crore orders a day",INK],["2 · per second, then at the peak: about 350 writes a second at dinner",BLUE],["3 · each order is read about 20 times (tracking, history): 7,000 reads a second",BLUE],["4 · and the bytes: about 20 GB a day, 7 TB a year",BLUE]];
const box=([c,y,t,s],k)=><g key={k}><Bx x={X[c]} y={y} w={W} h={50} t={t} s={s} c={k?BLUE:GREY} fill={k?"#f8faff":"#fff"}/>{c>0&&<Ar x1={X[c]-28} y1={y+25} x2={X[c]-3} y2={y+25} m={M}/>}</g>;
const verdict=<g><text x="20" y="232" className="fl" style={{fill:BLUE}}>One primary database takes 350 writes a second; a cache takes the 7,000 reads;</text><text x="20" y="248" className="fl" style={{fill:BLUE}}>7 TB a year means archiving old orders or sharding by the second year.</text></g>;
return <svg viewBox="0 0 640 258" role="img" aria-labelledby={`eft${uid}`}><title id={`eft${uid}`}>A back-of-envelope estimate in six steps. One crore orders a day, divided by about one lakh seconds in a day, is about 116 orders a second. Times three at dinner time is about 350 writes a second. Each order is read about 20 times, for tracking and history, so about 7,000 reads a second. At about 2 kilobytes per order that is about 20 gigabytes a day, or 7.3 terabytes a year. So one primary database can take the writes, a cache takes the reads, and a year's data means archiving old orders or sharding by the second year.</title><Mk m={M}/>
{still?<g>{B.map(box)}{verdict}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{B.map((b,k)=><Show key={k} t0={[0,.25,.25,.5,.75,.75][k]} t1={1} dur={D}>{box(b,k)}</Show>)}<Show t0={.75} t1={1} dur={D}>{verdict}</Show></g>}</svg>}

export const CONCEPT_FIGS={
"repl-sync":{C:ReplSyncFig,ar:640/300,title:()=>"ONE PAYMENT, COPIED TWO WAYS"},
"repl-failover":{C:ReplFailoverFig,ar:640/290,title:()=>"WHEN THE LEADER DIES"},
"consistency-timeline":{C:ConsistencyTimelineFig,ar:640/300,title:()=>"ONE PRICE CHANGE, FOUR READERS"},
"double-accept":{C:DoubleAcceptFig,ar:640/300,title:()=>"TWO RIDERS, ONE ORDER"},
"cap-split":{C:CapSplitFig,ar:640/300,title:()=>"WHEN MUMBAI AND HYDERABAD CAN'T TALK"},
"pacelc":{C:PacelcFig,ar:640/290,title:()=>"THE PRICE OF EACH COPY YOU WAIT FOR"},
"slow-call":{C:SlowCallFig,ar:640/250,title:()=>"ONE SLOW CALL, EVERY WORKER STUCK"},
"breaker":{C:BreakerFig,ar:640/250,title:()=>"A CIRCUIT BREAKER'S THREE STATES"},
"quorum-split":{C:QuorumSplitFig,ar:640/220,title:()=>"THREE OF FIVE KEEP GOING"},
"election":{C:ElectionFig,ar:640/240,title:()=>"A NEW LEADER IN 300 MS"},
"saga":{C:SagaFig,ar:640/230,title:()=>"BACKING OUT, STEP BY STEP"},
"outbox":{C:OutboxFig,ar:640/240,title:()=>"SAVE AND SEND, TOGETHER"},
"net-first":{C:NetFirstFig,ar:640/326,title:()=>"THE FIRST REQUEST ON A NEW CONNECTION"},
"net-live":{C:NetLiveFig,ar:640/296,title:()=>"FOUR WAYS TO GET LIVE UPDATES"},
"api-pages":{C:ApiPagesFig,ar:640/276,title:()=>"OFFSET OR CURSOR"},
"api-job":{C:ApiJobFig,ar:640/306,title:()=>"SLOW WORK AS A JOB"},
"est-budget":{C:EstBudgetFig,ar:640/250,title:()=>"WHERE 300 MILLISECONDS GO"},
"est-funnel":{C:EstFunnelFig,ar:640/258,title:()=>"FROM A REQUIREMENT TO A DECISION"},
};
