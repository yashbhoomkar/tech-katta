// Figures for the Concepts articles (the API types article's own figures are in apitypes.jsx). Same
// conventions as components.jsx: 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated
// when `still`, and a `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark,Mk,Bx,Ar,Caps,Cap,Life,Msg,INK,GREY,RED,BLUE}from"./parts.jsx";

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

// id → {C, ar (width/height of the viewBox), title(example name)}; gathered into FIGS in figs/index.js.
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

// Modelling data, FIG 1: one order stored two ways. As four tables each fact is stored once and the order
// screen joins them; as one document a single read returns the whole screen. When the restaurant renames
// itself, the table changes in one row, and the copy inside old order documents keeps the old name.
function ModelShapesFig({still,uid=""}){const M=`ms${uid}`,D="14s";
const caps=[["1 · the order screen needs the order, its dishes, the customer and the restaurant",INK],["2 · as tables, each fact is stored once, and the screen joins four tables to show it",BLUE],["3 · as one document, everything the screen shows comes back in a single read",BLUE],["4 · the restaurant renames itself: one row changes, but copies in old orders don't",RED]];
const tb=(x,y,w,t,rows)=><g><rect x={x} y={y} width={w} height={24+rows.length*16} fill="#fff" stroke={GREY}/><rect x={x} y={y} width={w} height="20" fill="#eef1f5" stroke={GREY}/><text x={x+8} y={y+14} className="fb">{t}</text>{rows.map((r,i)=><text key={i} x={x+8} y={y+35+i*16} className="fl">{r}</text>)}</g>;
const doc=['{ order: 9051,','  customer: { id: 77, name: "Asha" },','  restaurant: { id: 42,','    name: "Udupi Corner" },','  items: [','    { dish: "masala dosa", qty: 2 },','    { dish: "filter coffee", qty: 1 } ],','  total: 255 }'];
const line=(l,i,c)=><text key={i} x={362+(l.length-l.trimStart().length)*6} y={78+i*17} className="fl" style={c?{fill:c}:undefined}>{l.trim()}</text>;
const base=<g><text x="10" y="46" className="fk">AS FOUR TABLES</text><text x="350" y="46" className="fk">AS ONE DOCUMENT</text>
{tb(10,56,145,"orders",["id 9051","customer_id 77","restaurant_id 42","total 255"])}{tb(175,56,155,"order_items",["9051 · masala dosa ×2","9051 · filter coffee ×1"])}
{tb(10,180,145,"customers",["id 77 · Asha"])}{tb(175,180,155,"restaurants",["id 42 · Udupi Corner"])}
<Ar x1={60} y1={144} x2={60} y2={177} m={M}/><Ar x1={120} y1={144} x2={228} y2={177} m={M}/><Ar x1={175} y1={84} x2={158} y2={84} m={M}/>
<rect x="350" y="56" width="280" height="154" fill="#fff" stroke={GREY}/>{doc.map((l,i)=>line(l,i))}</g>;
const s2=<text x="10" y="246" className="fl" style={{fill:BLUE}}>one query, three joins</text>;
const s3=<g><rect x="350" y="56" width="280" height="154" fill="none" stroke={BLUE} strokeWidth="2"/><text x="350" y="246" className="fl" style={{fill:BLUE}}>one read</text></g>;
const s4=<g><rect x="177" y="204" width="151" height="15" fill="#fff"/><text x="183" y="215" className="fl" style={{fill:BLUE}}>id 42 · Udupi Café</text><text x="10" y="266" className="fl" style={{fill:BLUE}}>renamed in one place</text>
<rect x="384" y="118" width="200" height="15" fill="#fff"/>{line(doc[3],3,RED)}<text x="350" y="266" className="fl" style={{fill:RED}}>old orders keep the old name</text></g>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`mst${uid}`}><title id={`mst${uid}`}>One food order stored two ways. As four tables: orders, order items, customers and restaurants, each fact stored once and linked by IDs, so the order screen needs one query that joins all four. As one document: the order holds a copy of the customer's name, the restaurant's name and the dishes, so the screen needs a single read. When the restaurant renames itself from Udupi Corner to Udupi Café, the tables change in one row, while old order documents keep the old name in their copy.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Dot x1={60} x2={60} y={144} y2={176} t0={.28} t1={.36} dur={D}/><Dot x1={120} x2={226} y={144} y2={176} t0={.36} t1={.44} dur={D}/><Dot x1={175} x2={160} y={84} t0={.44} t1={.5} dur={D}/>
<Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Modelling data, FIG 2: pay when reading or when writing. The restaurant page shows an average rating and
// is opened 2,000 times a minute. Working it out on each view reads 48,000 reviews every time; keeping the
// rating on the restaurant's row means one row per view, and one extra update, in the same transaction, per review.
function ModelCopyFig({still,uid=""}){const M=`mc${uid}`,D="14s";
const caps=[["1 · the restaurant page shows its average rating; 2,000 people open it a minute",INK],["2 · working it out on each view reads all 48,000 reviews, every single time",RED],["3 · keep the rating on the restaurant's row instead: each view reads one row",BLUE],["4 · each new review updates that row in the same transaction: a bit more work per write",BLUE]];
const top=<g><text x="10" y="50" className="fk">WORK IT OUT ON EVERY VIEW</text><Bx x={10} y={62} w={150} h={40} t="Restaurant page" s="2,000 views a minute"/><Ar x1={162} y1={82} x2={296} y2={82} m={M}/><Bx x={300} y={62} w={180} h={40} t="reviews" s="48,000 rows for this place"/></g>;
const s2=<g><text x="229" y="74" textAnchor="middle" className="fl" style={{fill:RED}}>average, every time</text><text x="496" y="78" className="fl" style={{fill:RED}}>≈ 9.6 crore rows</text><text x="496" y="94" className="fl" style={{fill:RED}}>read a minute</text></g>;
const s3=<g><text x="10" y="150" className="fk">KEEP THE ANSWER ON THE RESTAURANT ROW</text><Bx x={10} y={162} w={150} h={40} t="Restaurant page" s="2,000 views a minute"/><Ar x1={162} y1={182} x2={296} y2={182} m={M}/><text x="229" y="174" textAnchor="middle" className="fl" style={{fill:BLUE}}>read 1 row</text>
<Bx x={300} y={162} w={180} h={40} t="restaurants · id 42" s="rating 4.3 · 48,000 reviews" c={BLUE} fill="#f8faff"/><text x="496" y="178" className="fl" style={{fill:BLUE}}>2,000 rows read</text><text x="496" y="194" className="fl" style={{fill:BLUE}}>a minute</text></g>;
const s4=<g><Bx x={10} y={222} w={150} h={40} t="Review API" s="a new review"/><Ar x1={162} y1={236} x2={330} y2={205} m={M}/><text x="172" y="262" className="fl">adds the review and updates the rating, together</text><text x="496" y="238" className="fl" style={{fill:BLUE}}>+1 update</text><text x="496" y="254" className="fl" style={{fill:BLUE}}>per review</text></g>;
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`mct${uid}`}><title id={`mct${uid}`}>Two ways to show a restaurant's average rating on a page opened 2,000 times a minute. Working it out on every view averages all 48,000 reviews each time, about 9.6 crore rows read a minute. Keeping the rating on the restaurant's own row means each view reads one row, 2,000 rows a minute. The price is paid on writes: each new review is added and the restaurant's rating updated in the same transaction.</title><Mk m={M}/>
{top}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show>{[0,1,2].map(i=><Dot key={i} x1={164} x2={294} y={82} t0={.27+i*.07} t1={.33+i*.07} dur={D}/>)}
<Show t0={.5} t1={1} dur={D}>{s3}</Show><Dot x1={164} x2={294} y={182} t0={.53} t1={.6} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show><Dot x1={164} x2={326} y={236} y2={206} t0={.78} t1={.86} dur={D}/></g>}</svg>}

// Indexes, FIG 1: a B-tree lookup. Finding Priya Nair among 6.4 crore customers: the root page sends N–S down
// one branch, that page sends Pm–Pz to one leaf, and the leaf holds the name with the address of its row.
// With about 400 keys a page, three levels cover 1 → 400 → 1,60,000 pages: 6.4 crore names.
function BtreeFig({still,uid=""}){const M=`bt${uid}`,D="14s";
const caps=[["1 · find Priya Nair among 6.4 crore customers: start at the root page",INK],["2 · the root sends N to S down one branch, and that page narrows it to Pm–Pz",BLUE],["3 · the leaf page holds the names in order, each with the address of its row",BLUE],["4 · one more read fetches the row: 4 page reads instead of 6.4 crore rows",BLUE]];
const node=(x,y,w,ts,hi,cls="fb")=><g>{ts.map((t,i)=><g key={i}><rect x={x+i*w} y={y} width={w} height="28" fill={i===hi?"#dfe6fb":"#fff"} stroke={i===hi?BLUE:GREY}/><text x={x+i*w+w/2} y={y+18} textAnchor="middle" className={cls} style={i===hi?{fill:BLUE}:undefined}>{t}</text></g>)}</g>;
const stub=(x,y)=><line key={x} x1={x} y1={y} x2={x} y2={y+12} stroke={GREY}/>;
const root=<g>{node(10,50,80,["A – F","G – M","N – S","T – Z"],2)}{[0,1,3].map(i=>stub(50+80*i,78))}</g>;
const l2=<g><Ar x1={210} y1={78} x2={200} y2={106} m={M}/>{node(40,108,64,["N","O","Pa – Pl","Pm – Pz","Q – S"],3)}{[0,1,2,4].map(i=>stub(72+64*i,136))}</g>;
const leaf=<g><Ar x1={264} y1={136} x2={222} y2={166} m={M}/>{node(10,168,80,["Priya Menon","Priya Naik","Priya Nair","Priya Negi"],2,"fl")}</g>;
const row=<g><Ar x1={210} y1={196} x2={210} y2={228} m={M}/><rect x="110" y="230" width="220" height="28" fill="#f8faff" stroke={BLUE}/><text x="220" y="248" textAnchor="middle" className="fl" style={{fill:BLUE}}>Priya Nair · Pune · since 2023</text><text x="10" y="248" className="fl">the table's row</text></g>;
const side=<g><text x="400" y="62" className="fb">One box is one 8 KB page</text><text x="400" y="78" className="fl">about 400 keys in each</text>
{[["level 1","1 page"],["level 2","400 pages"],["level 3","1,60,000 pages"]].map(([a,b],i)=><g key={a}><text x="400" y={106+i*18} className="fl">{a}</text><text x="630" y={106+i*18} textAnchor="end" className="fl">{b}</text></g>)}
<text x="400" y="168" className="fb" style={{fill:BLUE}}>6.4 crore names in 3 levels</text><text x="400" y="198" className="fl">the top two levels stay in memory,</text><text x="400" y="214" className="fl">so a lookup reads 1–2 pages from disk</text>
<text x="400" y="248" className="fl" style={{fill:RED}}>without it: read all 6.4 crore rows</text></g>;
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`btt${uid}`}><title id={`btt${uid}`}>A B-tree index on customer names, used to find Priya Nair among 6.4 crore customers. The root page splits names into A to F, G to M, N to S and T to Z, and points N to S at the next page. That page splits further and points Pm to Pz at one leaf page. The leaf holds Priya Menon, Priya Naik, Priya Nair and Priya Negi in order, each with the address of its row, and one more read fetches the row: four page reads in all. Each page is 8 kilobytes and holds about 400 keys, so three levels, 1, then 400, then 1,60,000 pages, cover 6.4 crore names. Without the index the database would read every row.</title><Mk m={M}/>
{root}{side}{still?<g>{l2}{leaf}{row}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Glow x={170} y={50} w={80} h={28} t0={.04} t1={.25} dur={D}/>
<Show t0={.25} t1={1} dur={D}>{l2}</Show><Dot x1={210} x2={201} y={80} y2={104} t0={.26} t1={.33} dur={D}/><Show t0={.5} t1={1} dur={D}>{leaf}</Show><Dot x1={264} x2={224} y={138} y2={164} t0={.51} t1={.58} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{row}</Show><Dot x1={210} x2={210} y={198} y2={226} t0={.76} t1={.83} dur={D}/></g>}</svg>}

// Indexes, FIG 2: column order. An index on (restaurant, status, time) is a sorted list, like a phone book.
// "Restaurant 42, preparing" is one short range; "restaurant 42, newest first" is one range in status order,
// so it still needs a sort; "everything preparing" is scattered over the whole list, so the index can't help.
function IndexOrderFig({still,uid=""}){const D="14s",Y=i=>78+i*21;
const E=[[41,"delivered","18:52"],[41,"preparing","19:08"],[42,"delivered","18:40"],[42,"delivered","18:58"],[42,"preparing","19:05"],[42,"preparing","19:11"],[42,"ready","19:02"],[43,"delivered","18:47"],[43,"preparing","19:09"],[44,"preparing","19:03"]];
const caps=[["1 · an index on (restaurant, status, time) keeps its entries sorted, like a phone book",INK],["2 · restaurant 42, preparing: the matches sit together, so it reads one short range",BLUE],["3 · restaurant 42, newest first: one range, but in status order, so it still sorts",INK],["4 · everything preparing: the matches are scattered, so the index can't narrow it",RED]];
const Q3=[1,4,5,8,9];
const hl=(rows,fill)=><g>{rows.map(i=><rect key={i} x="30" y={Y(i)-14} width="220" height="19" fill={fill}/>)}</g>;
const rects=<g><text x="30" y="56" className="fk">INDEX ON (RESTAURANT, STATUS, TIME)</text>{E.map((e,i)=><rect key={i} x="30" y={Y(i)-14} width="220" height="19" fill="#fff" stroke={GREY}/>)}</g>;
const texts=<g>{E.map(([r,s,t],i)=><g key={i}><text x="40" y={Y(i)} className="fl">{r}</text><text x="80" y={Y(i)} className="fl">{s}</text><text x="240" y={Y(i)} textAnchor="end" className="fl">{t}</text></g>)}</g>;
const br=(x,a,b,n,c)=><g><path d={`M${x} ${Y(a)-14}h6v${Y(b)-Y(a)+19}h-6`} fill="none" stroke={c} strokeWidth="1.5"/><text x={x+11} y={(Y(a)+Y(b))/2+1} className="fb" style={{fill:c}}>{n}</text></g>;
const q=(y,n,t,s,c)=><g><text x="320" y={y} className="fb">{n} · {t}</text><text x="320" y={y+16} className="fl" style={c!==INK?{fill:c}:undefined}>{s}</text></g>;
const s2=<g>{br(256,4,5,"1",BLUE)}{q(96,1,"restaurant 42, preparing","side by side: one short range",BLUE)}</g>;
const s3=<g>{br(280,2,6,"2",INK)}{q(160,2,"restaurant 42, newest first","one range, in status order: then a sort",INK)}</g>;
const s4=<g>{Q3.map(i=><circle key={i} cx="20" cy={Y(i)-4.5} r="3.5" fill={RED}/>)}{q(224,3,"everything preparing","scattered: the index can't narrow it",RED)}<text x="320" y="278" className="fl" style={{fill:BLUE}}>an index helps from its first column onward</text></g>;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`iot${uid}`}><title id={`iot${uid}`}>An index on restaurant, status and order time, shown as a sorted list of ten entries, sorted first by restaurant, then by status, then by time. Query one, restaurant 42 with status preparing, finds its two matches side by side: one short range. Query two, restaurant 42 newest first, finds one range of five entries, but they are in status order, not time order, so the database still sorts them. Query three, every order that is preparing at any restaurant, finds matches scattered through the whole list, so the index can't narrow the search. An index helps from its first column onward.</title>
{rects}{still?<g>{texts}{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<g><g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={.5} dur={D}>{hl([4,5],"#dfe6fb")}</Show><Show t0={.5} t1={.75} dur={D}>{hl([2,3,4,5,6],"#eef1f5")}</Show><Show t0={.75} t1={1} dur={D}>{hl(Q3,"#fff5f4")}</Show></g>{texts}
<g aria-hidden="true"><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g></g>}</svg>}

// Hash rings, FIG 1: going from 4 servers to 5. With hash % N, 16 of 20 carts change server; on a ring with
// servers at 10, 35, 60 and 85, a fifth server at 72 takes only the hashes from 61 to 72 from D: 4 of 20.
function HashMoveFig({still,uid=""}){const D="14s",K=[2,4,9,10,11,13,28,36,42,44,50,53,56,63,65,69,70,76,77,83],L="ABCDE",x=i=>20+i*30;
const ring=k=>k<=10||k>85?"A":k<=35?"B":k<=60?"C":"D",ring5=k=>k>60&&k<=72?"E":ring(k);
const caps=[["1 · 20 carts hashed to 0–99; with 4 servers, each cart lives on server hash % 4",INK],["2 · a fifth server, so hash % 5: 16 of the 20 carts now belong somewhere else",RED],["3 · on a ring, each server owns the hashes up to its point: 10, 35, 60 and 85",INK],["4 · E joins at 72 and takes only 61–72 from D: 4 carts move, the other 16 stay",BLUE]];
const cells=(y,f,cls="fb")=><g>{K.map((k,i)=>{const[t,c]=f(k);return <g key={i}><rect x={x(i)} y={y} width="26" height="24" fill={c===RED?"#fff5f4":c===BLUE?"#f8faff":"#fff"} stroke={c||GREY} strokeWidth={c?1.5:1}/><text x={x(i)+13} y={y+16} textAnchor="middle" className={cls} style={c?{fill:c}:undefined}>{t}</text></g>})}</g>;
const lab=(y,t,r,c)=><g><text x="20" y={y} className="fl">{t}</text>{r&&<text x="616" y={y} textAnchor="end" className="fl" style={{fill:c}}>{r}</text>}</g>;
const r01=<g>{lab(50,"20 carts, each hashed to a number from 0 to 99")}{cells(58,k=>[k],"fl")}{lab(104,"4 servers · hash % 4")}{cells(112,k=>[L[k%4]])}</g>;
const r2=<g>{lab(158,"5 servers · hash % 5","16 of 20 move",RED)}{cells(166,k=>[L[k%5],k%5!==k%4?RED:null])}</g>;
const r3a=<g>{lab(212,"on a ring · A owns up to 10, B to 35, C to 60, D to 85")}{cells(220,k=>[ring(k)])}</g>;
const r3b=<g>{lab(212,"on a ring · A owns up to 10, B to 35, C to 60, D to 85","E joins at 72 · 4 of 20 move",BLUE)}{cells(220,k=>[ring5(k),ring5(k)!==ring(k)?BLUE:null])}</g>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`hmt${uid}`}><title id={`hmt${uid}`}>Twenty shopping carts, each hashed to a number from 0 to 99, spread over servers. With 4 servers, a cart lives on server hash modulo 4. Adding a fifth server and switching to hash modulo 5 sends 16 of the 20 carts to a different server. On a ring, servers sit at points 10, 35, 60 and 85, and each owns the hashes up to its point. A fifth server, E, joining at 72 takes only the hashes from 61 to 72 from server D: 4 carts move and the other 16 stay where they are.</title>
{r01}{still?<g>{r2}{r3b}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{r2}</Show><Show t0={.5} t1={.75} dur={D}>{r3a}</Show><Show t0={.75} t1={1} dur={D}>{r3b}</Show></g>}</svg>}

// Hash rings, FIG 2: virtual nodes. With one point per server the arcs are uneven (C holds 39%), and when B
// fails all of its keys land on C (50%). With six points per server, mixed around the ring, every share is
// near 25%, and B's six small arcs go to A, C and D, which end up with about a third each.
function VnodesFig({still,uid=""}){const D="14s",R=62,CY=160;
const at=(cx,a,r=R)=>[cx+r*Math.sin(a*Math.PI/180),CY-r*Math.cos(a*Math.PI/180)];
const arc=(cx,a1,a2,c)=>{const[x1,y1]=at(cx,a1),[x2,y2]=at(cx,a2);return <path d={`M${x1} ${y1}A${R} ${R} 0 ${a2-a1>180?1:0} 1 ${x2} ${y2}`} fill="none" stroke={c} strokeWidth="6" strokeOpacity=".45"/>};
const P1=[[20,"A"],[60,"B"],[200,"C"],[290,"D"]];
const P2=[[0,"C"],[12,"A"],[30,"B"],[42,"C"],[63,"A"],[75,"C"],[90,"D"],[105,"B"],[117,"A"],[132,"C"],[147,"B"],[165,"A"],[177,"B"],[192,"D"],[207,"C"],[222,"D"],[240,"A"],[255,"D"],[267,"A"],[288,"D"],[300,"B"],[318,"C"],[333,"B"],[348,"D"]];
const big=(cx,[a,n],down)=>{const[x,y]=at(cx,a);return <g key={a}><circle cx={x} cy={y} r="11" fill={down?"#fff5f4":"#fff"} stroke={down?RED:INK} strokeDasharray={down?"3 2":undefined}/><text x={x} y={y+4} textAnchor="middle" className="fb" style={down?{fill:RED}:undefined}>{n}</text></g>};
const small=(cx,[a,n],down)=>{const[x,y]=at(cx,a),[lx,ly]=at(cx,a,R+13);return <g key={a}><circle cx={x} cy={y} r="3.5" fill={down?"#fff":INK} stroke={down?RED:INK}/><text x={lx} y={ly+3.5} textAnchor="middle" className="fl" style={down?{fill:RED}:undefined}>{n}</text></g>};
const table=(x0,S)=><g><text x={x0+174} y="96" className="fl">share</text>{"ABCD".split("").map((n,i)=><g key={n}><text x={x0+160} y={120+i*22} className="fb">{n}</text><rect x={x0+174} y={111+i*22} width={S[i]} height="10" fill="#eef1f5" stroke={GREY}/><text x={x0+230} y={120+i*22} className="fl">{S[i]}%</text></g>)}</g>;
const after=(x0,Sb,c)=><g><text x={x0+262} y="96" className="fl" style={{fill:c}}>B down</text>{Sb.map((v,i)=><text key={i} x={x0+262} y={120+i*22} className="fl" style={{fill:v==null?RED:c}}>{v==null?"—":v+"%"}</text>)}</g>;
const left=<g><text x="10" y="52" className="fb">One point per server</text><text x="10" y="68" className="fl">each owns the arc up to its point</text><circle cx="75" cy={CY} r={R} fill="none" stroke={GREY}/>{arc(75,60,200,BLUE)}{P1.map(p=>big(75,p))}{table(0,[25,11,39,25])}</g>;
const right=<g><text x="340" y="52" className="fb">Six points per server</text><text x="340" y="68" className="fl">the same four servers, mixed</text><circle cx="405" cy={CY} r={R} fill="none" stroke={GREY}/>{P2.map(p=>small(405,p))}{table(330,[26,24,23,27])}</g>;
const s2=<g>{arc(75,20,60,RED)}{big(75,P1[1],true)}{after(0,[25,null,50,25],RED)}<text x="10" y="258" className="fl" style={{fill:RED}}>all of B's keys land on C</text></g>;
const s4=<g>{P2.filter(p=>p[1]==="B").map(p=>small(405,p,true))}{after(330,[34,null,32,34],BLUE)}<text x="340" y="258" className="fl" style={{fill:BLUE}}>B's keys spread over A, C and D</text></g>;
const caps=[["1 · one point per server: the arcs come out uneven, and C holds 39% of the keys",INK],["2 · B fails: all it held passes to the next point clockwise, C, now at 50%",RED],["3 · six points per server, mixed around the ring: every share lands near 25%",BLUE],["4 · B fails: its six small arcs go to A, C and D, which take about a third each",BLUE]];
return <svg viewBox="0 0 640 272" role="img" aria-labelledby={`vnt${uid}`}><title id={`vnt${uid}`}>Two hash rings with the same four servers, A to D. On the left each server has one point on the ring and owns the arc up to it; the arcs are uneven: A 25 percent, B 11, C 39 and D 25. When B fails, everything it held passes to the next point clockwise, C, which rises to 50 percent. On the right each server has six points, mixed around the ring, and the shares are close: A 26, B 24, C 23 and D 27 percent. When B fails, its six small arcs go to A, C and D, which end up with 34, 32 and 34 percent.</title>
{left}{still?<g>{right}{s2}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{right}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Live updates, FIG 1: one event to the one connection server holding the customer's phone. The order service
// publishes "order 9051 ready"; the registry says customer 77 is connected to C2; only C2 gets it and writes it
// down the open connection.
function LiveFanoutFig({still,uid=""}){const M=`lf${uid}`,D="14s";
const caps=[["1 · the kitchen marks order 9051 ready; the order service publishes one event",INK],["2 · the registry says customer 77's phone is connected to server C2",BLUE],["3 · only C2 gets the event, and writes it down the phone's open connection",BLUE],["4 · Asha sees \"ready\" within a second; C1 and C3 never handled it",BLUE]];
const base=<g><Bx x={10} y={110} w={120} h={44} t="Order service" s="9051: ready"/><Ar x1={132} y1={132} x2={176} y2={132} m={M}/>
<Bx x={180} y={110} w={110} h={44} t="Event bus" s="order.updated"/><Bx x={180} y={196} w={110} h={44} t="Registry" s="user → server"/>
{[["C1",56],["C2",116],["C3",176]].map(([n,y])=><Bx key={n} x={340} y={y} w={130} h={40} t={`Connection ${n}`} s="40,000 phones"/>)}
<Bx x={510} y={116} w={120} h={40} t="Asha's phone" s="customer 77"/>
<text x="10" y="266" className="fl">Servers add users to the registry when they connect, and remove them when they leave.</text></g>;
const s2=<g><Ar x1={235} y1={156} x2={235} y2={194} m={M} c={BLUE}/><text x="243" y="180" className="fl" style={{fill:BLUE}}>who holds 77?</text><Bx x={180} y={196} w={110} h={44} t="Registry" s="77 → C2" c={BLUE} fill="#f8faff"/></g>;
const s3=<g><Ar x1={292} y1={130} x2={338} y2={136} m={M} c={BLUE}/><Bx x={340} y={116} w={130} h={40} t="Connection C2" s="40,000 phones" c={BLUE} fill="#f8faff"/></g>;
const s4=<g><Ar x1={472} y1={136} x2={508} y2={136} m={M} c={BLUE}/><Bx x={510} y={116} w={120} h={40} t="Asha's phone" s="order ready" c={BLUE} fill="#f8faff"/></g>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`lft${uid}`}><title id={`lft${uid}`}>Delivering one live update. The kitchen marks order 9051 ready and the order service publishes one event to the event bus. A registry records which connection server holds each user's open connection, and says customer 77 is on server C2. Only C2 receives the event, and it writes it down the phone's open connection, so Asha sees that her order is ready within a second. Servers C1 and C3, each holding about 40,000 other phones, never handle it.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Dot x1={134} x2={174} y={132} t0={.04} t1={.14} dur={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Dot x1={235} x2={235} y={158} y2={192} t0={.28} t1={.38} dur={D}/><Show t0={.5} t1={1} dur={D}>{s3}</Show><Dot x1={294} x2={334} y={130} y2={135} t0={.53} t1={.63} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show><Dot x1={474} x2={504} y={136} t0={.78} t1={.86} dur={D}/></g>}</svg>}

// Live updates, FIG 2: resuming after a dropped connection. Updates carry numbers; the phone has seen 42 when
// it enters a tunnel; 43 and 44 reach no one; it reconnects with "last seen 42" and the server replays 43 and
// 44 from a short log before carrying on live.
function LiveResumeFig({still,uid=""}){const M=`lr${uid}`,D="14s",P=90,S=320,L=540;
const caps=[["1 · every update carries a number; the phone has seen up to 42",INK],["2 · the phone goes into a tunnel, so 43 and 44 reach no one",RED],["3 · it reconnects, waiting longer after each failed try, and says: last seen 42",INK],["4 · the server replays 43 and 44 from the log, then carries on live",BLUE]];
const lanes=<g><Life x={P} t="Phone" y1={292}/><Life x={S} t="Connection server" y1={292}/><Life x={L} t="Update log" s="kept for an hour" y1={292}/></g>;
const m=[<g key={1}><Msg x1={S} x2={P} y={98} t="#41 rider picked up" m={M}/><Msg x1={S} x2={P} y={122} t="#42 rider 2 km away" m={M}/><text x="10" y="146" className="fl" style={{fill:BLUE}}>seen: 42</text></g>,
<g key={2}><Msg x1={L} x2={S} y={164} t="#43, #44" m={M}/><Msg x1={S} x2={P+16} y={186} t="sent to no one" m={M} c={RED} dash/><path d={`M${P-6} 180l12 12m0-12l-12 12`} stroke={RED} strokeWidth="2"/><text x="10" y="190" className="fl" style={{fill:RED}}>tunnel</text></g>,
<g key={3}><text x="98" y="210" className="fl">tries after 1 s, 2 s, 4 s</text><Msg x1={P} x2={S} y={230} t="reconnect · last seen 42" m={M}/></g>,
<g key={4}><Msg x1={S} x2={L} y={250} t="after 42?" m={M}/><Msg x1={L} x2={S} y={268} t="#43, #44" m={M}/><Msg x1={S} x2={P} y={284} t="#43, #44, then live" m={M} c={BLUE}/></g>];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`lrt${uid}`}><title id={`lrt${uid}`}>A phone resuming live updates after losing its connection. Every update carries a number, and the phone has seen up to number 42: the rider picked up the order, then is 2 kilometres away. The phone enters a tunnel and loses its connection, so updates 43 and 44 reach no one. It reconnects, waiting 1, 2 and 4 seconds between tries, and says the last number it saw was 42. The connection server reads everything after 42 from an update log kept for an hour, sends 43 and 44, and then carries on live.</title><Mk m={M}/>
{lanes}{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}
<Dot x1={S} x2={P+4} y={122} t0={.08} t1={.18} dur={D}/><Dot x1={S} x2={P+20} y={186} t0={.33} t1={.43} dur={D}/><Dot x1={P} x2={S-4} y={230} t0={.58} t1={.68} dur={D}/><Dot x1={S} x2={P+4} y={284} t0={.86} t1={.95} dur={D}/></g>}</svg>}

// Contention, FIG 1: two buyers, one plate left. Read-then-write lets both read 1 and both write 0: two sold.
// One conditional update (stock - 1 where stock > 0) lets exactly one win.
function RaceFig({still,uid=""}){const M=`rc${uid}`,D="14s";
const caps=[["1 · one plate of biryani is left, and two customers press Buy at the same moment",INK],["2 · both requests read the stock first, and both see 1 left",INK],["3 · both write 0 and both are confirmed: two plates sold, one in the kitchen",RED],["4 · one conditional update instead: the database lets exactly one of them win",BLUE]];
const lanes=(o,t)=><g><text x={o} y="48" className="fk">{t}</text><Life x={o+40} t="Buyer A" y0={72} y1={236}/><Life x={o+150} t="items · id 7" s="stock 1" y0={72} y1={236}/><Life x={o+260} t="Buyer B" y0={72} y1={236}/></g>;
const s2=<g><Msg x1={50} x2={160} y={118} t="read" m={M}/><Msg x1={160} x2={50} y={138} t="1 left" m={M}/><Msg x1={270} x2={160} y={118} t="read" m={M}/><Msg x1={160} x2={270} y={138} t="1 left" m={M}/></g>;
const s3=<g><Msg x1={50} x2={160} y={168} t="set 0" m={M}/><Msg x1={160} x2={50} y={188} t="sold" m={M} c={RED}/><Msg x1={270} x2={160} y={168} t="set 0" m={M}/><Msg x1={160} x2={270} y={188} t="sold" m={M} c={RED}/><rect x="104" y="212" width="112" height="20" fill="#fff5f4" stroke={RED}/><text x="160" y="226" textAnchor="middle" className="fb" style={{fill:RED}}>2 sold, 1 plate</text></g>;
const s4=<g><Msg x1={370} x2={480} y={118} t="−1 if stock > 0" m={M}/><Msg x1={590} x2={480} y={118} t="−1 if stock > 0" m={M}/><Msg x1={480} x2={370} y={150} t="1 row: sold" m={M} c={BLUE}/><Msg x1={480} x2={590} y={150} t="0 rows: sold out" m={M} c={RED}/>
<text x="340" y="268" className="fl">UPDATE items SET stock = stock - 1</text><text x="340" y="284" className="fl">WHERE id = 7 AND stock &gt; 0</text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rct${uid}`}><title id={`rct${uid}`}>Two customers buy the last plate of biryani at the same moment. On the left, each request reads the stock first and sees one left, then each writes zero and is told the plate is sold: two plates sold with one in the kitchen. On the right, each request sends one conditional update, subtract one only if the stock is above zero. The database runs them one at a time, so the first changes one row and is sold the plate, and the second changes no rows and is told it is sold out.</title><Mk m={M}/>
{lanes(10,"READ, THEN WRITE")}{lanes(330,"ONE CONDITIONAL UPDATE")}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show>
<Dot x1={52} x2={156} y={118} t0={.27} t1={.35} dur={D}/><Dot x1={268} x2={164} y={118} t0={.27} t1={.35} dur={D}/><Dot x1={52} x2={156} y={168} t0={.52} t1={.6} dur={D}/><Dot x1={268} x2={164} y={168} t0={.52} t1={.6} dur={D}/><Dot x1={372} x2={476} y={118} t0={.77} t1={.85} dur={D}/><Dot x1={588} x2={484} y={118} t0={.77} t1={.85} dur={D}/></g>}</svg>}

// Contention, FIG 2: a seat held for 10 minutes. Asha holds 14C at 10:00; Ravi is refused at 10:03; Asha
// never pays and the hold expires at 10:10; Ravi holds it at 10:11 and pays at 10:13.
function SeatHoldFig({still,uid=""}){const D="14s",x=m=>60+m*36;
const caps=[["1 · Asha picks seat 14C: it is held for her for 10 minutes, not sold yet",BLUE],["2 · Ravi tries 14C at 10:03 and is told it's taken, so he can pick another",RED],["3 · Asha never pays: at 10:10 the hold runs out and the seat is free again",INK],["4 · Ravi holds it at 10:11 and pays at 10:13: sold once, to one person",BLUE]];
const seg=(a,b,t,fill,c)=><g><rect x={x(a)} y="104" width={x(b)-x(a)} height="30" fill={fill} stroke={c}/>{t&&<text x={(x(a)+x(b))/2} y="123" textAnchor="middle" className="fl" style={{fill:c}}>{t}</text>}</g>;
const mk=(m,up,t,c=INK,a="middle")=><g><line x1={x(m)} y1={up?92:134} x2={x(m)} y2={up?104:148} stroke={c} strokeDasharray="2 2"/><text x={x(m)} y={up?88:160} textAnchor={a} className="fl" style={{fill:c}}>{t}</text></g>;
const base=<g><text x="10" y="123" className="fb">14C</text><rect x={x(0)} y="104" width={x(15)-x(0)} height="30" fill="#fff" stroke={GREY}/>{[0,5,10,15].map(m=><text key={m} x={x(m)} y="186" textAnchor="middle" className="fl">10:{String(m).padStart(2,"0")}</text>)}
<text x="10" y="222" className="fl">UPDATE seats SET held_by = 'ravi', hold_until = now() + interval '10 min'</text><text x="10" y="238" className="fl">WHERE id = '14C' AND (held_by IS NULL OR hold_until &lt; now())</text></g>;
const s1=<g>{seg(0,10,"held for Asha until 10:10","#f8faff",BLUE)}{mk(0,1,"Asha holds 14C",BLUE,"start")}</g>;
const s2=mk(3,0,"10:03 Ravi: it's taken",RED),s3=<g>{seg(10,11,"","#fff",GREY)}{mk(10,1,"hold expires")}</g>;
const s4=<g>{seg(11,13,"Ravi","#f8faff",BLUE)}{seg(13,15,"sold","#dfe6fb",BLUE)}{mk(11,0,"Ravi holds",BLUE)}{mk(13,1,"Ravi pays",BLUE)}</g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`sht${uid}`}><title id={`sht${uid}`}>Seat 14C between 10:00 and 10:15. At 10:00 Asha picks it and it is held for her until 10:10, not sold. At 10:03 Ravi tries the same seat and is told it is taken. Asha never pays, so at 10:10 the hold expires and the seat is free again. At 10:11 Ravi holds it and at 10:13 he pays, so it is sold once, to one person. One update statement takes the hold only if the seat has no holder or the old hold has run out.</title>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{[s1,s2,s3,s4].map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

// Multi-step processes, FIG 1: an order as a state machine. Placed → accepted → preparing → picked up →
// delivered; with no answer in 5 minutes a timer cancels it and a refund follows; a late "accept" is refused.
function OrderStatesFig({still,uid=""}){const M=`os${uid}`,D="14s",X=[10,138,266,394,522],N=["Placed","Accepted","Preparing","Picked up","Delivered"];
const caps=[["1 · an order is always in exactly one state, and only the listed moves are allowed",INK],["2 · the restaurant accepts within 5 minutes, and the order moves on to preparing",BLUE],["3 · if nobody accepts in 5 minutes, a timer cancels it and starts the refund",BLUE],["4 · a late accept for a cancelled order is refused: that move isn't in the table",RED]];
const st=(x,y,t,c=GREY,fill="#fff")=><Bx key={t} x={x} y={y} w={108} h={36} t={t} c={c} fill={fill}/>;
const base=<g>{N.map((n,i)=>st(X[i],70,n))}{X.slice(0,4).map(x=><Ar key={x} x1={x+110} y1={88} x2={x+125} y2={88} m={M}/>)}{st(10,170,"Cancelled")}{st(138,170,"Refunded")}
<Ar x1={64} y1={108} x2={64} y2={167} m={M}/><text x="72" y="136" className="fl">rejected, or no</text><text x="72" y="149" className="fl">answer in 5 min</text><Ar x1={120} y1={188} x2={135} y2={188} m={M}/>
<text x="400" y="150" className="fb">The allowed moves</text>{["placed → accepted, cancelled","accepted → preparing","preparing → picked up","picked up → delivered","cancelled → refunded"].map((t,i)=><text key={t} x="400" y={170+i*16} className="fl">{t}</text>)}</g>;
const s2=<g>{[0,1,2].map(i=>st(X[i],70,N[i],BLUE,"#f8faff"))}</g>,s3=<g>{st(10,70,"Placed",BLUE,"#f8faff")}{st(10,170,"Cancelled",BLUE,"#f8faff")}{st(138,170,"Refunded",BLUE,"#f8faff")}</g>;
const s4=<g>{st(10,170,"Cancelled",BLUE,"#f8faff")}{st(138,70,"Accepted",RED,"#fff5f4")}<text x="10" y="236" className="fl" style={{fill:RED}}>"accept" for a cancelled order: refused</text></g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`ost${uid}`}><title id={`ost${uid}`}>A food order as a state machine. It moves from placed to accepted, preparing, picked up and delivered. From placed it can also go to cancelled, when the restaurant rejects it or doesn't answer within 5 minutes, and from cancelled to refunded. A table lists the allowed moves. When the restaurant accepts in time, the order moves on to preparing. When nobody accepts, a timer cancels it and starts the refund. An accept that arrives after the order was cancelled is refused, because that move isn't in the table.</title><Mk m={M}/>
{base}{still?<g>{s4}<Cap t={caps[3][0]} c={RED}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={.5} dur={D}>{s2}</Show><Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show>
<Dot x1={64} x2={64} y={110} y2={166} t0={.53} t1={.62} dur={D}/></g>}</svg>}

// Multi-step processes, FIG 2: a durable workflow survives a crash. Worker A does steps 1 and 2, saving each
// result, then dies; worker B replays the history, skips the finished steps and runs 3 and 4.
function WorkflowResumeFig({still,uid=""}){const D="14s",Y=[96,128,160,192],S=["1 · charge the card","2 · tell the restaurant","3 · find a rider","4 · tell the customer"],H=["card charged, ref c-81","restaurant told","rider Ravi assigned","customer told"];
const caps=[["1 · a workflow runs its steps in order and saves each result in its history",INK],["2 · worker A charges the card and tells the restaurant, then its machine dies",RED],["3 · worker B takes over and replays the history: steps 1 and 2 are already done",INK],["4 · it runs steps 3 and 4 only, so the card is never charged twice",BLUE]];
const base=<g><text x="20" y="62" className="fk">STEPS</text><text x="230" y="62" className="fk">WORKER A</text><text x="330" y="62" className="fk">WORKER B</text><text x="440" y="62" className="fk">HISTORY, SAVED</text>
<rect x="440" y="74" width="190" height="136" fill="#fff" stroke={GREY}/>{S.map((s,i)=><text key={s} x="20" y={Y[i]} className="fb">{s}</text>)}
<text x="20" y="242" className="fl">On replay, finished steps return their saved results instead of running again.</text></g>;
const mark=(x,i,t,c)=><text x={x} y={Y[i]} className="fl" style={{fill:c}}>{t}</text>,hist=i=><text key={i} x="452" y={Y[i]} className="fl">{i+1} · {H[i]}</text>;
const s2=<g>{mark(230,0,"done",BLUE)}{mark(230,1,"done",BLUE)}{mark(230,2,"crashed",RED)}{hist(0)}{hist(1)}</g>;
const s3=<g>{mark(330,0,"from history",GREY)}{mark(330,1,"from history",GREY)}</g>,s4=<g>{mark(330,2,"done",BLUE)}{mark(330,3,"done",BLUE)}{hist(2)}{hist(3)}</g>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`wrt${uid}`}><title id={`wrt${uid}`}>A durable workflow with four steps: charge the card, tell the restaurant, find a rider and tell the customer. Each finished step's result is saved in the workflow's history. Worker A charges the card and tells the restaurant, then its machine dies during step 3. Worker B takes over and replays the history: steps 1 and 2 return their saved results without running again. It then runs steps 3 and 4, so the card is charged only once.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Scaling reads, FIG 1: where 1 lakh reads a second end up. The CDN answers 60,000; the cache 36,000 of the
// 40,000 left; replicas 3,600 of 4,000; 400 that must be fresh reach the primary. Bar width = reads arriving.
function ReadLayersFig({still,uid=""}){const D="14s",X0=120,W=v=>Math.max(2,v/250);
const caps=[["1 · 1 lakh reads a second at dinner; one database handles thousands, not lakhs",INK],["2 · the CDN answers images and menus from a nearby city: 60,000 never reach us",BLUE],["3 · the cache answers 9 in 10 of the rest, so only 4,000 a second reach a database",BLUE],["4 · replicas take most of those; only reads that must be fresh go to the primary",BLUE]];
const R=[["Phones",100000,0,"1,00,000 reads a second at dinner"],["CDN",100000,60000,"answers 60,000: images and menus · passes on 40,000"],["Cache",40000,36000,"answers 36,000 · passes on 4,000"],["Replicas",4000,3600,"answer 3,600 · pass on 400"],["Primary",400,400,"400 reads a second that must be fresh: easy for one machine"]];
const row=([n,a,s,t],i)=>{const y=52+i*42;return <g key={n}><text x="10" y={y+11} className="fb">{n}</text><rect x={X0} y={y} width={W(a)} height="14" fill="#eef1f5" stroke={GREY}/>{s>0&&<rect x={X0} y={y} width={W(s)} height="14" fill="#dfe6fb" stroke={BLUE}/>}<text x={X0} y={y+30} className="fl">{t}</text></g>};
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`rlt${uid}`}><title id={`rlt${uid}`}>Where 1 lakh reads a second go at dinner time, with each bar as wide as the reads arriving at that layer. The CDN answers 60,000, images and menus, from a city near the user, and passes on 40,000. The cache answers 36,000 of those and passes on 4,000. Read replicas answer 3,600 and pass on 400 reads that must see the latest data, which the primary database handles easily.</title>
{row(R[0],0)}{still?<g>{R.slice(1).map((r,i)=>row(r,i+1))}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{row(R[1],1)}</Show><Show t0={.5} t1={1} dur={D}>{row(R[2],2)}</Show><Show t0={.75} t1={1} dur={D}>{row(R[3],3)}{row(R[4],4)}</Show></g>}</svg>}

// Scaling reads, FIG 2: a hot key. 1,000 requests for restaurant 42's menu arrive as its cache entry expires.
// Without coalescing all of them query the database; with it, one fetches and the rest share the answer.
function HotKeyFig({still,uid=""}){const M=`hk${uid}`,D="14s",Y=[70,92,114,136,158,180,202,224];
const caps=[["1 · during the match, 1,000 requests a second ask for restaurant 42's menu",INK],["2 · its cache entry expires, and all of them go to the database in the same moment",RED],["3 · coalesce: the first request fetches it, and the others wait for that answer",BLUE],["4 · each server also keeps the menu in memory for 5 seconds, so the key cools down",BLUE]];
const reqs=x=><g>{Y.map(y=><g key={y}><rect x={x} y={y-8} width="52" height="16" fill="#fff" stroke={GREY}/><text x={x+26} y={y+4} textAnchor="middle" className="fl">menu 42</text></g>)}</g>;
const base=<g><text x="10" y="50" className="fk">WITHOUT COALESCING</text><text x="340" y="50" className="fk">WITH COALESCING</text>{reqs(10)}{reqs(340)}<Bx x={200} y={127} w={100} h={40} t="Database"/><Bx x={440} y={124} w={86} h={46} t="one fetch" s="others wait"/><Bx x={550} y={127} w={80} h={40} t="Database"/></g>;
const s2=<g>{Y.map(y=><line key={y} x1={64} y1={y} x2={198} y2={147} stroke={RED}/>)}<text x="10" y="252" className="fl" style={{fill:RED}}>1,000 database queries at once</text></g>;
const s3=<g>{Y.map(y=><line key={y} x1={394} y1={y} x2={438} y2={147} stroke={GREY}/>)}<Ar x1={528} y1={147} x2={548} y2={147} m={M} c={BLUE}/><text x="340" y="252" className="fl" style={{fill:BLUE}}>1 database query; the rest share it</text></g>;
const s4=<text x="340" y="268" className="fl" style={{fill:BLUE}}>then a copy in each server's memory for 5 s</text>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`hkt${uid}`}><title id={`hkt${uid}`}>A hot key. During a match, 1,000 requests a second ask for restaurant 42's menu. When its cache entry expires, without coalescing every one of those requests queries the database at the same moment. With coalescing, the first request fetches the menu and the others wait for that one answer, so the database sees one query. Each server also keeps the menu in its own memory for 5 seconds, so the single cache entry is no longer hammered.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Scaling writes, FIG 1: a spike through a queue. Analytics events: 3,000 a second, then 20,000 a second for
// 10 minutes from 8:00; the database writes at most 8,000. The queue peaks at 72 lakh (12,000 × 600 s) and
// drains at 5,000 a second, empty 24 minutes later at 8:34.
function WriteBufferFig({still,uid=""}){const D="14s",x=m=>60+m*13.5,y=v=>230-v*0.008;
const caps=[["1 · app events for analytics: 3,000 writes a second, until the 8 pm flash sale",INK],["2 · for 10 minutes 20,000 a second arrive, but the database writes 8,000 at most",RED],["3 · the queue holds the difference: about 72 lakh events at the peak",BLUE],["4 · then the database keeps writing 8,000 a second, and the queue is empty by 8:34",BLUE]];
const inc=`M${x(0)} ${y(3000)}H${x(5)}V${y(20000)}H${x(15)}V${y(3000)}H${x(40)}`,db=`M${x(0)} ${y(3000)}H${x(5)}V${y(8000)}H${x(39)}V${y(3000)}H${x(40)}`;
const axes=<g><line x1="60" y1="60" x2="60" y2="230" stroke={GREY}/><line x1="60" y1="230" x2="604" y2="230" stroke={GREY}/>{[[20000,"20,000/s"],[8000,"8,000/s"],[0,"0"]].map(([v,t])=><text key={v} x="54" y={y(v)+4} textAnchor="end" className="fl">{t}</text>)}
{[[5,"8:00"],[15,"8:10"],[25,"8:20"],[35,"8:30"]].map(([m,t])=><text key={m} x={x(m)} y="246" textAnchor="middle" className="fl">{t}</text>)}<line x1="60" y1={y(8000)} x2="600" y2={y(8000)} stroke={RED} strokeDasharray="4 3"/><text x="66" y={y(8000)-6} className="fl" style={{fill:RED}}>limit</text></g>;
const inL=<g><path d={inc} fill="none" stroke={INK} strokeWidth="1.5"/><text x={x(10)} y="62" textAnchor="middle" className="fl">arriving</text></g>,dbL=<g><path d={db} fill="none" stroke={BLUE} strokeWidth="2.5"/><text x="470" y={y(8000)-6} className="fl" style={{fill:BLUE}}>written: 8,000/s</text></g>;
const area=<g><path d={`M${x(5)} 230L${x(15)} 110L${x(39)} 230Z`} fill="#dfe6fb" opacity=".7"/><text x={x(15)+8} y="104" className="fl" style={{fill:BLUE}}>queue: 72 lakh</text></g>,end=<text x={x(39)} y="222" textAnchor="end" className="fl" style={{fill:BLUE}}>empty at 8:34</text>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`wbt${uid}`}><title id={`wbt${uid}`}>A chart of writes a second between 7:55 and 8:35. Analytics events arrive at 3,000 a second, then at 20,000 a second for ten minutes from 8:00, during a flash sale. The database can write at most 8,000 a second, so a queue in front of it takes the difference and grows to about 72 lakh events by 8:10. After the rush the database keeps writing 8,000 a second while 3,000 arrive, and the queue is empty by 8:34.</title>
{axes}{still?<g>{area}{inL}{dbL}{end}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.5} t1={1} dur={D}>{area}</Show>{inL}<Show t0={.25} t1={1} dur={D}>{dbL}</Show><Show t0={.75} t1={1} dur={D}>{end}</Show></g>}</svg>}

// Scaling writes, FIG 2: a hot counter split ten ways. All likes for one dish go to one key on one shard; at
// 10,000 a second that shard is overloaded. Ten parts on five shards take 1,000 a second each; a read adds them.
function SplitCounterFig({still,uid=""}){const M=`sc${uid}`,D="14s",px=i=>i<5?460:550,py=i=>58+(i%5)*38;
const caps=[["1 · a dish's like count is one key, so every like lands on the same shard",INK],["2 · a video of the dish goes viral: 10,000 likes a second, too many for one shard",RED],["3 · split the key into 10 parts on different shards; each like adds to a random one",BLUE],["4 · reading the count adds up the 10 parts: one bigger read, and no hot shard",BLUE]];
const left=<g><text x="10" y="44" className="fk">ONE KEY</text><Bx x={10} y={116} w={80} h={36} t="like +1"/><Ar x1={92} y1={134} x2={136} y2={134} m={M}/><Bx x={140} y={110} w={150} h={48} t="likes:dish-9" s="shard 3"/></g>;
const hot=<g><Bx x={140} y={110} w={150} h={48} t="likes:dish-9" s="shard 3" c={RED} fill="#fff5f4"/><text x="10" y="200" className="fl" style={{fill:RED}}>10,000 writes a second,</text><text x="10" y="216" className="fl" style={{fill:RED}}>all on one shard</text></g>;
const right=<g><text x="340" y="44" className="fk">TEN PARTS</text><Bx x={330} y={116} w={70} h={36} t="like +1"/><Ar x1={402} y1={134} x2={446} y2={134} m={M}/><text x="424" y="126" textAnchor="middle" className="fl">any one</text><rect x="450" y="50" width="184" height="192" fill="none" stroke={GREY} strokeDasharray="4 3"/>{[...Array(10).keys()].map(i=><g key={i}><rect x={px(i)} y={py(i)} width="80" height="26" fill="#f8faff" stroke={BLUE}/><text x={px(i)+40} y={py(i)+17} textAnchor="middle" className="fl">#{i} · shard {i%5+1}</text></g>)}<text x="330" y="200" className="fl" style={{fill:BLUE}}>1,000/s each</text></g>;
const read=<text x="340" y="252" className="fl" style={{fill:BLUE}}>count = #0 + #1 + … + #9</text>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`sct${uid}`}><title id={`sct${uid}`}>A like counter for one dish. Stored as one key, every like goes to the same shard, and when a video of the dish goes viral, 10,000 likes a second overload that shard. Split into ten parts spread over five shards, each like adds one to a randomly chosen part, so each part takes about 1,000 writes a second. Reading the count adds up the ten parts.</title><Mk m={M}/>
{left}{still?<g>{hot}{right}{read}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{hot}</Show><Show t0={.5} t1={1} dur={D}>{right}</Show><Show t0={.75} t1={1} dur={D}>{read}</Show></g>}</svg>}

// Large files, FIG 1: a multipart upload. A 1.6 GB video in 16 parts of 100 MB, three in flight at a time;
// part 11 fails on a network switch and only it is sent again; one "complete" call joins the parts.
function MultipartFig({still,uid=""}){const M=`mp${uid}`,D="14s",px=i=>20+(i%8)*76,py=i=>60+Math.floor(i/8)*44;
const caps=[["1 · a 1.6 GB video is cut into 16 parts of 100 MB, each with its own signed URL",INK],["2 · the phone sends three parts at a time; each part is checked when it arrives",BLUE],["3 · part 11 fails when the phone switches networks: only part 11 is sent again",RED],["4 · when all 16 are in, one \"complete\" call joins them into a single file",BLUE]];
const part=(i,c=GREY,fill="#fff",t="100 MB")=><g key={i}><rect x={px(i)} y={py(i)} width="66" height="34" fill={fill} stroke={c} strokeWidth={c===GREY?1:1.5}/><text x={px(i)+33} y={py(i)+15} textAnchor="middle" className="fb" style={c!==GREY?{fill:c}:undefined}>{i+1}</text><text x={px(i)+33} y={py(i)+28} textAnchor="middle" className="fl">{t}</text></g>;
const P=[...Array(16).keys()],done=i=>part(i,BLUE,"#dfe6fb","in");
const s2=<g>{P.slice(0,10).map(done)}{[10,11,12].map(i=>part(i,BLUE,"#f8faff","sending"))}</g>;
const s3=<g>{P.filter(i=>i!==10).map(done)}{part(10,RED,"#fff5f4","again")}</g>;
const s4=<g>{P.map(done)}<Ar x1={320} y1={150} x2={320} y2={180} m={M}/><text x="330" y="170" className="fl">complete: the list of 16 parts</text><rect x="20" y="184" width="600" height="30" fill="#dfe6fb" stroke={BLUE}/><text x="320" y="203" textAnchor="middle" className="fb" style={{fill:BLUE}}>kitchen-tour.mp4 · 1.6 GB · one object</text></g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`mpt${uid}`}><title id={`mpt${uid}`}>A multipart upload of a 1.6 gigabyte video, cut into 16 parts of 100 megabytes, each with its own signed upload URL. The phone sends three parts at a time and storage checks each part as it arrives. Part 11 fails when the phone switches from Wi-Fi to mobile data, and only part 11 is sent again. When all 16 parts are in, one complete call with the list of parts joins them into a single object.</title><Mk m={M}/>
{P.map(i=>part(i))}<text x="20" y="242" className="fl">Parts can go in any order; storage keeps them until the complete call, or a cleanup rule.</text>
{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={.5} dur={D}>{s2}</Show><Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Large files, FIG 2: an upload's states in the database. pending (row written, URLs handed out) → uploaded
// (storage event) → processing (checks, resizing) → ready; bad files go to failed; nothing after 24 h → swept.
function FileStatesFig({still,uid=""}){const M=`fs${uid}`,D="14s",X=[10,170,330,490];
const S=[["pending","row written, URLs out"],["uploaded","bytes in storage"],["processing","scan, resize, convert"],["ready","shown to customers"]];
const caps=[["1 · before any bytes move, the API writes the row: video 88, pending",BLUE],["2 · storage reports the finished upload, and a worker checks and converts it",BLUE],["3 · only then is it ready; customers never see a half-processed file",BLUE],["4 · uploads nobody finishes are swept after a day: the row and any stored parts",INK]];
const st=(i,c=GREY,fill="#fff")=><Bx key={i} x={X[i]} y={74} w={140} h={44} t={S[i][0]} s={S[i][1]} c={c} fill={fill}/>;
const base=<g>{S.map((s,i)=>st(i))}{[0,1,2].map(i=><g key={i}><Ar x1={X[i]+142} y1={96} x2={X[i]+158} y2={96} m={M}/><text x={X[i]+150} y="64" textAnchor="middle" className="fl">{["storage event","worker takes it","checks pass"][i]}</text></g>)}
<Ar x1={400} y1={120} x2={400} y2={166} m={M}/><text x="408" y="148" className="fl">bad file</text><Bx x={330} y={168} w={140} h={44} t="failed" s="uploader told why"/>
<Ar x1={80} y1={120} x2={80} y2={166} m={M}/><text x="88" y="148" className="fl">nothing after 24 h</text><Bx x={10} y={168} w={140} h={44} t="swept" s="row and parts removed"/>
<text x="490" y="186" className="fl">the CDN serves</text><text x="490" y="200" className="fl">ready files only</text></g>;
const s1=st(0,BLUE,"#f8faff"),s2=<g>{st(1,BLUE,"#f8faff")}{st(2,BLUE,"#f8faff")}</g>,s3=st(3,BLUE,"#f8faff"),s4=<Bx x={10} y={168} w={140} h={44} t="swept" s="row and parts removed" c={BLUE} fill="#f8faff"/>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`fst${uid}`}><title id={`fst${uid}`}>The states of an uploaded video in the database. Before any bytes move, the API writes a row for video 88 with status pending and hands out upload URLs. When storage reports the finished upload it becomes uploaded, and a worker takes it to processing: a virus scan, resizing and conversion. When the checks pass it becomes ready, and only ready files are served through the CDN. A bad file goes to failed and the uploader is told why. An upload with nothing after 24 hours is swept: the row and any stored parts are removed.</title><Mk m={M}/>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{[s1,s2,s3,s4].map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

// Long-running jobs, FIG 1: a lease. Worker A takes job 512 with a 60 s lease and renews it every 20 s; it
// crashes at 50 s, the lease (last renewed at 40 s) runs out at 100 s, and worker B takes the job and finishes.
function JobLeaseFig({still,uid=""}){const D="14s",x=s=>130+s*2.4,A=84,L=134,B=184;
const caps=[["1 · worker A takes job 512 and gets a 60-second lease on it",INK],["2 · while it works, it renews the lease every 20 seconds",BLUE],["3 · worker A crashes at 50 s; with no renewals, the lease runs out at 100 s",RED],["4 · job 512 is free again: worker B takes it and finishes at 190 s",BLUE]];
const base=<g>{[["Worker A",A],["Lease, job 512",L],["Worker B",B]].map(([t,y])=><text key={t} x="10" y={y+4} className="fb">{t}</text>)}<line x1={x(0)} y1="214" x2={x(200)} y2="214" stroke={GREY}/>{[0,50,100,150,200].map(s=><text key={s} x={x(s)} y="230" textAnchor="middle" className="fl">{s} s</text>)}
<rect x={x(0)} y={A-10} width={x(50)-x(0)} height="20" fill="#dfe6fb" stroke={BLUE}/><text x={(x(0)+x(50))/2} y={A+4} textAnchor="middle" className="fl">working</text></g>;
const lease=(to,c=GREY,fill="#eef1f5")=><rect x={x(0)} y={L-8} width={x(to)-x(0)} height="16" fill={fill} stroke={c}/>;
const s1=<g>{lease(60)}<text x={x(60)+6} y={L+4} className="fl">until 60 s</text></g>;
const s2=<g>{lease(100,BLUE,"#f8faff")}{[20,40].map(s=><g key={s}><line x1={x(s)} y1={A+10} x2={x(s)} y2={L-8} stroke={BLUE} strokeDasharray="2 2"/><text x={x(s)} y={A-16} textAnchor="middle" className="fl" style={{fill:BLUE}}>renew</text></g>)}<text x={x(100)+6} y={L+4} className="fl" style={{fill:BLUE}}>until 100 s</text></g>;
const s3=<g><path d={`M${x(50)-6} ${A-6}l12 12m0-12l-12 12`} stroke={RED} strokeWidth="2"/><text x={x(50)+10} y={A+4} className="fl" style={{fill:RED}}>crash at 50 s</text><rect x={x(100)-1} y={L-12} width="3" height="24" fill={RED}/><rect x={x(100)+4} y={L-8} width="90" height="16" fill="#fff"/><text x={x(100)+6} y={L+4} className="fl" style={{fill:RED}}>runs out: 100 s</text></g>;
const s4=<g><rect x={x(100)} y={B-10} width={x(190)-x(100)} height="20" fill="#dfe6fb" stroke={BLUE}/><text x={(x(100)+x(190))/2} y={B+4} textAnchor="middle" className="fl">job 512, from the start</text><text x={x(190)+6} y={B+4} className="fl" style={{fill:BLUE}}>done</text></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`jlt${uid}`}><title id={`jlt${uid}`}>A job lease over 200 seconds. Worker A takes job 512 with a 60-second lease and renews it at 20 and 40 seconds, so the lease runs until 100 seconds. Worker A crashes at 50 seconds and stops renewing, so the lease runs out at 100 seconds. Job 512 becomes free again, and worker B takes it, runs it from the start and finishes at 190 seconds.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={0} t1={.25} dur={D}>{s1}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Long-running jobs, FIG 2: retries, then a dead-letter queue. A payout fails at 0 s, 32 s and 155 s (waits of
// about 30 s and 2 min, with jitter), then moves to a dead-letter queue with an alert; other jobs keep flowing.
function JobRetryFig({still,uid=""}){const M=`jr${uid}`,D="14s",x=s=>120+s*2.5,T=[0,32,155];
const caps=[["1 · paying restaurant 77 fails: the bank's API doesn't answer in time",RED],["2 · it is tried again after about 30 seconds, then after about 2 minutes",INK],["3 · the third failure moves it to a dead-letter queue and alerts a person",RED],["4 · the other jobs never waited: the queue kept moving the whole time",BLUE]];
const att=i=><g key={i}><rect x={x(T[i])} y="80" width="10" height="24" fill="#fff5f4" stroke={RED}/><text x={x(T[i])+5} y="72" textAnchor="middle" className="fl" style={{fill:RED}}>try {i+1}</text><text x={x(T[i])+5} y="120" textAnchor="middle" className="fl">{T[i]} s</text></g>;
const base=<g><text x="10" y="96" className="fb">Payout 77</text><text x="10" y="236" className="fb">Other jobs</text>{[...Array(62).keys()].map(i=><rect key={i} x={120+i*8} y="226" width="4" height="12" fill="#dfe6fb" stroke={BLUE} strokeWidth=".5"/>)}{att(0)}</g>;
const s2=<g>{att(1)}{att(2)}<text x={(x(0)+x(32))/2+5} y="140" textAnchor="middle" className="fl">wait ~30 s</text><text x={(x(32)+x(155))/2+5} y="140" textAnchor="middle" className="fl">wait ~2 min</text></g>;
const s3=<g><Ar x1={x(155)+5} y1={126} x2={x(155)+5} y2={156} m={M}/><Bx x={440} y={158} w={180} h={40} t="Dead-letter queue" s="payout 77 · alert sent" c={RED} fill="#fff5f4"/></g>;
const s4=<text x="120" y="216" className="fl" style={{fill:BLUE}}>never waited</text>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`jrt${uid}`}><title id={`jrt${uid}`}>Retrying a failing job. A payout to restaurant 77 fails because the bank's API doesn't answer in time. It is tried again after about 30 seconds, at 32 seconds, and again after about 2 minutes, at 155 seconds, and fails both times. After the third failure it moves to a dead-letter queue and a person is alerted. Meanwhile other jobs kept flowing through the queue the whole time.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// ---- Specialised data: shared bits for the figures below.
const LBq="#f8faff",LRq="#fff5f4",FBq="#dfe6fb";
const Tq=({x,y,t,c,a,b})=><text x={x} y={y} textAnchor={a} className={b?"fb":"fl"} style={c?{fill:c}:undefined}>{t}</text>;
const Stq=({caps,g,D="14s",only=[]})=><g aria-hidden="true"><Caps caps={caps} D={D}/>{g.map((x,i)=>x&&<Show key={i} t0={i/4} t1={only.includes(i)?(i+1)/4:1} dur={D}>{x}</Show>)}</g>;

// Proximity, FIG 1: geohash precision. Pune's centre (18.5204, 73.8567) is tek92es…; each extra character
// cuts a cell into 32. Sizes at the equator: 4 chars ≈ 39 × 20 km, 5 ≈ 4.9 km, 6 ≈ 1.2 × 0.6 km, 7 ≈ 153 m.
function ProxSizesFig({still,uid=""}){
const R=[["tek9","39 km × 20 km","a metro region",44],["tek92","4.9 km × 4.9 km","restaurants that deliver here",34],["tek92e","1.2 km × 0.6 km","riders near a restaurant",24],["tek92es","153 m × 153 m","the rider at the door",14]];
const caps=[["1 · a geohash names a cell of the map: Pune's centre is in cell tek9, about 39 by 20 km",INK],["2 · each extra character cuts the cell into 32: tek92 is about 5 km across",BLUE],["3 · six characters is about 1.2 km by 0.6 km; seven is a square of about 150 m",BLUE],["4 · pick the length from the radius: about 5 km for delivery, a few hundred metres for riders",BLUE]];
const row=(i,hi)=>{const[g,s,u,w]=R[i],y=56+i*46;return <g key={i}><rect x={50-w/2} y={y+18-w/2} width={w} height={w} fill={hi?FBq:"#eef1f5"} stroke={hi?BLUE:GREY}/>
<text x={110} y={y+23} className="fb"><tspan>{g.slice(0,-1)}</tspan><tspan style={{fill:BLUE}}>{g.slice(-1)}</tspan></text><Tq x={210} y={y+23} t={s}/><Tq x={380} y={y+23} t={u} c={hi?BLUE:undefined}/></g>};
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`pzt${uid}`}><title id={`pzt${uid}`}>Geohash cells for the centre of Pune. Four characters, tek9, is a cell about 39 by 20 kilometres. Each extra character cuts the cell into 32: tek92 is about 4.9 kilometres across, tek92e about 1.2 by 0.6 kilometres, and tek92es a square of about 153 metres. Choose the length from the search radius: about 5 kilometres for restaurants that deliver, a few hundred metres for riders.</title>
<Tq x={110} y={44} t="GEOHASH" b/><Tq x={210} y={44} t="CELL SIZE" b/><Tq x={380} y={44} t="GOOD FOR" b/>{still?<g>{[0,1,2,3].map(i=>row(i,1))}<Cap t={caps[3][0]}/></g>:<g>{row(0,1)}<Stq caps={caps} g={[null,row(1,1),row(2,1),row(3,1)]}/></g>}</svg>}

// Proximity, FIG 2: an adaptive quadtree over 36 restaurants: split any square holding more than 4, at most
// 4 levels deep. The dense centre gets small cells, the outskirts big ones; a query reads its leaf and neighbours.
const QPTS=[[.353,.545],[.619,.438],[.341,.492],[.557,.632],[.354,.345],[.585,.557],[.684,.618],[.488,.467],[.808,.465],[.406,.363],[.511,.517],[.459,.493],[.533,.583],[.632,.525],[.285,.584],[.33,.479],[.323,.5],[.407,.526],[.896,.494],[.601,.341],[.465,.579],[.489,.544],[.512,.379],[.568,.403],[.725,.439],[.582,.5],[.91,.47],[.98,.397],[.073,.629],[.779,.27],[.087,.333],[.964,.758],[.118,.246],[.101,.06],[.797,.178],[.559,.447]];
const qsplit=(x,y,s,d,P)=>{const In=P.filter(([a,b])=>a>=x&&a<x+s&&b>=y&&b<y+s);if(In.length>4&&d<4){const h=s/2;return [[0,0],[h,0],[0,h],[h,h]].flatMap(([dx,dy])=>qsplit(x+dx,y+dy,h,d+1,In))}return [[x,y,s,d,In.length]]};
function ProxQuadFig({still,uid=""}){const S=220,X0=20,Y0=36,L=qsplit(0,0,1,0,QPTS),Q=[.47,.52];
const caps=[["1 · start with one square for the whole city: 36 restaurants in it",INK],["2 · split any square holding more than 4 restaurants into four",BLUE],["3 · keep splitting: the busy centre ends in small cells, the outskirts in big ones",BLUE],["4 · a search walks down to the customer's cell and reads it and its neighbours",BLUE]];
const rect=([x,y,s,d],k,c=GREY,fill="none")=><rect key={k} x={X0+x*S} y={Y0+y*S} width={s*S} height={s*S} fill={fill} stroke={c}/>;
const leaf=L.find(([x,y,s])=>Q[0]>=x&&Q[0]<x+s&&Q[1]>=y&&Q[1]<y+s);
const near=L.filter(([x,y,s])=>{const[lx,ly,ls]=leaf;return x<=lx+ls+1e-9&&x+s>=lx-1e-9&&y<=ly+ls+1e-9&&y+s>=ly-1e-9});
const pts=<g>{QPTS.map(([a,b],i)=><circle key={i} cx={X0+a*S} cy={Y0+b*S} r="2.6" fill={INK}/>)}</g>;
const base=<g><rect x={X0} y={Y0} width={S} height={S} fill="#fff" stroke={GREY}/>{pts}</g>;
const lvl1=<g>{qsplit(0,0,1,0,QPTS).filter(l=>l[3]<=1).map((l,k)=>rect(l,k))}{[[0,0,.5],[.5,0,.5],[0,.5,.5],[.5,.5,.5]].map((l,k)=>rect([...l,1],"q"+k))}</g>;
const all=<g>{L.map((l,k)=>rect(l,k))}</g>;
const q=<g>{near.map((l,k)=>rect(l,"n"+k,BLUE,FBq))}{rect(leaf,"leaf",BLUE,"#b9c8f5")}{pts}<circle cx={X0+Q[0]*S} cy={Y0+Q[1]*S} r="5" fill={RED}/></g>;
const side=<g><Tq x={280} y={70} t={`${QPTS.length} restaurants, at most 4 per cell`}/><Tq x={280} y={92} t={`${L.length} cells after splitting`}/><Tq x={280} y={114} t="the smallest are 1/8 of the city's width"/><Tq x={280} y={150} t="busy areas get small cells, quiet ones big cells," c={BLUE}/><Tq x={280} y={166} t="so every cell holds about the same number" c={BLUE}/><Tq x={280} y={210} t="red dot: the customer; blue: cells read" c={RED}/></g>;
return <svg viewBox="0 0 640 266" role="img" aria-labelledby={`pqt${uid}`}><title id={`pqt${uid}`}>An adaptive quadtree over 36 restaurants in a city. It starts as one square, and any square holding more than 4 restaurants is split into four, up to four levels. The busy centre ends up in small cells and the quiet outskirts in big ones, so every cell holds about the same number. To find restaurants near a customer, the search walks down to the customer's cell and reads it and its neighbours.</title>
{base}{side}{still?<g>{all}{q}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[1,2]} g={[null,lvl1,all,<g>{all}{q}</g>]}/>}</svg>}

// Vector search, FIG 1: embeddings drawn in two dimensions. Dishes with similar meaning land close together; the
// query "spicy cottage cheese starter" lands among the paneer dishes although it never says "paneer".
function VecEmbedFig({still,uid=""}){
const P=[["Paneer tikka",96,84],["Kadai paneer",150,104],["Chilli paneer",84,124],["Masala dosa",300,82],["Rava dosa",338,104],["Idli sambar",296,128],["Gulab jamun",306,206],["Rasmalai",346,226],["Chicken biryani",80,206],["Veg biryani",128,230]],Q=[118,112];
const caps=[["1 · a model turns each dish's description into a vector: hundreds of numbers",INK],["2 · drawn in two dimensions, dishes with similar meaning land close together",BLUE],["3 · the search text goes through the same model and lands among the paneer dishes",BLUE],["4 · the nearest vectors are the results, though the query never says 'paneer'",BLUE]];
const dots=hi=><g>{P.map(([t,x,y],i)=><g key={t}><circle cx={x} cy={y} r="4" fill={hi&&i<3?BLUE:INK}/><Tq x={x+8} y={y+4} t={t} c={hi&&i<3?BLUE:undefined}/></g>)}</g>;
const vec=<g><Tq x={440} y={60} t="Kadai paneer →" b/><Tq x={440} y={78} t="[0.12, -0.53, 0.88, 0.04,"/><Tq x={440} y={94} t=" … 768 numbers in all ]"/></g>;
const groups=<g><ellipse cx={118} cy={106} rx={78} ry={40} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={330} cy={106} rx={72} ry={40} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={330} cy={216} rx={62} ry={26} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={120} cy={218} rx={78} ry={28} fill="none" stroke={GREY} strokeDasharray="3 3"/></g>;
const qy=<g><circle cx={Q[0]} cy={Q[1]} r="6" fill={RED}/><line x1={Q[0]} y1={Q[1]} x2={150} y2={166} stroke={RED}/><Tq x={154} y={170} t="query: 'spicy cottage cheese starter'" c={RED}/></g>;
const res=<g><circle cx={Q[0]} cy={Q[1]} r="44" fill="none" stroke={BLUE}/><Tq x={440} y={140} t="Nearest by cosine similarity:" b/>{["1  Chilli paneer","2  Kadai paneer","3  Paneer tikka"].map((t,i)=><Tq key={t} x={440} y={162+i*18} t={t} c={BLUE}/>)}<Tq x={440} y={226} t="(a 2-D picture of the idea;"/><Tq x={440} y={240} t=" real vectors have hundreds" /><Tq x={440} y={254} t=" of dimensions)"/></g>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`vet${uid}`}><title id={`vet${uid}`}>Dish descriptions turned into vectors by an embedding model and drawn in two dimensions. Similar dishes land close together: paneer dishes in one group, dosas and idli in another, sweets in a third, biryanis in a fourth. The search 'spicy cottage cheese starter' is turned into a vector by the same model and lands among the paneer dishes, so the nearest results are chilli paneer, kadai paneer and paneer tikka, although the query never says paneer. Real vectors have hundreds of dimensions.</title>
{dots(0)}{still?<g>{vec}{groups}{qy}{res}{dots(1)}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[vec,groups,qy,<g>{res}{dots(1)}</g>]}/>}</svg>}

// Vector search, FIG 2: HNSW. Three layers: 3 nodes on top, 7 in the middle, 20 at the bottom. The search starts
// at the top, hops to the neighbour closest to the query, drops a layer, and repeats; it touches a handful of nodes.
function VecHnswFig({still,uid=""}){const Y=[74,144,214],xs=[...Array(20).keys()].map(i=>40+i*29),mid=[1,4,7,10,13,15,18],top=[2,10,16],qx=xs[15]+12;
const caps=[["1 · comparing the query with every vector is exact, but it reads all of them",INK],["2 · HNSW links each vector to its near neighbours, in layers: a few on top, all at the bottom",INK],["3 · the search starts at the top, hops to whichever neighbour is closer, then drops a layer",BLUE],["4 · at the bottom it checks a small neighbourhood: fast, and usually the true nearest",BLUE]];
const layer=(ids,y,k)=><g key={k}>{ids.slice(1).map((id,i)=><line key={i} x1={xs[ids[i]]} y1={y} x2={xs[id]} y2={y} stroke={GREY}/>)}{ids.map(id=><circle key={id} cx={xs[id]} cy={y} r="6" fill="#fff" stroke={INK}/>)}</g>;
const base=<g>{[["top",top],["middle",mid],["bottom: all",[...Array(20).keys()]]].map(([t,ids],i)=><g key={t}>{layer(ids,Y[i],t)}<Tq x={10} y={Y[i]-14} t={t}/></g>)}{mid.map(id=><line key={id} x1={xs[id]} y1={Y[0]+6} x2={xs[id]} y2={Y[2]-6} stroke={GREY} strokeDasharray="2 4"/>)}
<path d={`M${qx} ${Y[2]+26}l6 6-6 6-6-6z`} fill={RED}/><Tq x={qx} y={Y[2]+48} t="query" a="middle" c={RED}/></g>;
const hop=(a,b,y)=><line x1={xs[a]} y1={y} x2={xs[b]} y2={y} stroke={BLUE} strokeWidth="3"/>,node=(id,y)=><circle cx={xs[id]} cy={y} r="6" fill={BLUE}/>;
const all=<g>{[...Array(20).keys()].map(i=><line key={i} x1={xs[i]} y1={Y[2]+10} x2={qx} y2={Y[2]+24} stroke={RED} strokeOpacity=".35"/>)}<Tq x={10} y={262} t="20 comparisons here; crores in real life" c={RED}/></g>;
const s3=<g>{node(2,Y[0])}{hop(2,10,Y[0])}{hop(10,16,Y[0])}{node(16,Y[0])}<line x1={xs[16]} y1={Y[0]} x2={xs[15]} y2={Y[1]} stroke={BLUE} strokeWidth="2" strokeDasharray="3 2"/>{node(15,Y[1])}</g>;
const s4=<g>{s3}<line x1={xs[15]} y1={Y[1]} x2={xs[15]} y2={Y[2]} stroke={BLUE} strokeWidth="2" strokeDasharray="3 2"/>{hop(14,16,Y[2])}{node(14,Y[2])}{node(15,Y[2])}{node(16,Y[2])}<Tq x={10} y={262} t="about 8 nodes touched, not 20" c={BLUE}/></g>;
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`vht${uid}`}><title id={`vht${uid}`}>How an HNSW index finds near vectors. Comparing the query with every vector is exact but reads them all. HNSW stores the vectors in layers, a few on top, more in the middle and all of them at the bottom, each linked to its near neighbours. A search starts at the top, hops to whichever neighbour is closer to the query, drops down a layer and repeats, and at the bottom checks a small neighbourhood. It touches a handful of vectors and usually, though not always, finds the true nearest ones.</title>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[0,2]} g={[all,null,s3,s4]}/>}</svg>}

// Time series, FIG 1: blocks and compression. Rider 9's speed every 10 s; points grouped per series in 2-hour
// blocks; timestamps as delta-of-delta (usually 0), values XOR'd with the previous; ~16 bytes → under 2.
function TsBlocksFig({still,uid=""}){
const caps=[["1 · each point is a series, a time and a value: rider 9's speed every 10 seconds",INK],["2 · points are kept per series in blocks of about two hours, in time order",BLUE],["3 · times are stored as the change in the gap (usually 0), values as what changed",BLUE],["4 · a point drops from 16 bytes to under 2: a block of 720 points fits in about 1 KB",BLUE]];
const rows=[["20:00:00","21.4"],["20:00:10","22.0"],["20:00:20","22.0"],["20:00:30","21.9"],["…","…"]];
const base=<g><Tq x={20} y={46} t="rider:9:speed" b/>{rows.map(([t,v],i)=><g key={i}><Tq x={20} y={70+i*18} t={t}/><Tq x={100} y={70+i*18} t={v}/></g>)}</g>;
const block=<g><rect x={180} y={52} width={440} height={34} fill={LBq} stroke={BLUE}/><Tq x={190} y={73} t="block 20:00–22:00 · rider:9:speed · 720 points, in time order" c={BLUE}/><Tq x={180} y={104} t="the next block starts at 22:00; old blocks are merged and expired whole"/></g>;
const enc=<g><Tq x={180} y={134} t="time: gap 10 s, then the gap changes 0, 0, 0 … → about 1 bit each"/><Tq x={180} y={152} t="value: XOR with the previous: same → 1 bit; small change → a few"/></g>;
const bars=<g><rect x={180} y={176} width={360} height={18} fill="#eef1f5" stroke={GREY}/><Tq x={546} y={190} t="11.5 KB raw"/><rect x={180} y={202} width={32} height={18} fill={FBq} stroke={BLUE}/><Tq x={218} y={216} t="about 1 KB compressed (≈1.4 bytes a point)" c={BLUE}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`tbt${uid}`}><title id={`tbt${uid}`}>How a time-series database stores rider 9's speed, sampled every 10 seconds. Points are kept per series in blocks of about two hours, in time order. Timestamps are stored as the change in the gap between points, usually zero, which takes about a bit; values are stored as the difference from the previous value using XOR, so an unchanged value takes one bit. A point drops from 16 bytes to under 2, so a two-hour block of 720 points takes about 1 kilobyte instead of 11.5.</title>
{base}{still?<g>{block}{enc}{bars}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,block,enc,bars]}/>}</svg>}

// Time series, FIG 2: retention with rollups. Raw 10 s points kept 7 days (60,480 per series), 1-minute summaries
// for 90 days (1,29,600), hourly for 2 years (17,520). A year's chart reads 8,760 hourly points, not 31.5 lakh raw.
function TsRollupFig({still,uid=""}){const W=v=>v/129600*240;
const R=[["every 10 s, kept 7 days",60480,"60,480 points"],["1-minute summaries, kept 90 days",129600,"1,29,600 points"],["1-hour summaries, kept 2 years",17520,"17,520 points"]];
const caps=[["1 · raw points every 10 seconds, kept for a week",INK],["2 · older data kept as 1-minute summaries (min, max, average, count) for 90 days",BLUE],["3 · then hourly summaries for two years",BLUE],["4 · a chart reads the coarsest level that fits: a year is 8,760 hourly points, not 31.5 lakh raw ones",BLUE]];
const row=(i)=>{const[t,v,s]=R[i],y=56+i*44;return <g key={i}><Tq x={20} y={y+14} t={t} b/><rect x={250} y={y} width={W(v)} height={18} fill={i?FBq:"#eef1f5"} stroke={i?BLUE:GREY}/><Tq x={256+W(v)} y={y+14} t={s}/></g>};
const note=<g><Tq x={20} y={200} t="per series; with 10 lakh riders, multiply by 10 lakh" /><Tq x={20} y={222} t="year chart: 8,760 hourly points instead of 31,53,600 raw ones" c={BLUE}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`trt${uid}`}><title id={`trt${uid}`}>Keeping time-series data at three levels of detail, per series. Raw points every 10 seconds are kept for 7 days, 60,480 points. One-minute summaries, the minimum, maximum, average and count, are kept for 90 days, 1,29,600 points. Hourly summaries are kept for two years, 17,520 points. A chart reads the coarsest level that covers its range: a year is 8,760 hourly points instead of about 31.5 lakh raw ones.</title>
{row(0)}{still?<g>{row(1)}{row(2)}{note}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,row(1),row(2),note]}/>}</svg>}

// Sketches, FIG 1: HyperLogLog. Hash each ID; a long run of leading zeros is rare, so it hints at many IDs. 16,384
// registers keep the longest run seen per bucket (12 KB); estimate within about 0.8%; merge by max per register.
function HllFig({still,uid=""}){
const H=[["u77","0001 0110 1…","3 zeros"],["u12","1011 0001 0…","0 zeros"],["u903","0000 0110 …","5 zeros"]],REG=[3,1,5,2,0,4,2,6,1,3,2,4,3,2,1,5];
const caps=[["1 · counting distinct customers exactly means keeping every ID: 1 crore IDs is about 80 MB",INK],["2 · HyperLogLog hashes each ID; a hash starting with many zeros is rare, so it hints at many IDs",BLUE],["3 · it keeps 16,384 small registers, the longest run seen in each bucket: 12 KB in all",BLUE],["4 · the estimate is within about 0.8%, and two sketches merge by taking the larger value per register",BLUE]];
const exact=<g><rect x={20} y={50} width={250} height={30} fill="#eef1f5" stroke={GREY}/><Tq x={30} y={70} t="exact set: 1 crore IDs × 8 bytes ≈ 80 MB"/></g>;
const hashes=<g>{H.map(([u,h,z],i)=><g key={u}><Tq x={20} y={114+i*22} t={u}/><Tq x={70} y={114+i*22} t={`→ ${h}`}/><Tq x={230} y={114+i*22} t={z} c={i===2?BLUE:undefined}/></g>)}</g>;
const regs=<g><Tq x={320} y={100} t="registers (16 of 16,384 shown)" b/>{REG.map((v,i)=><g key={i}><rect x={320+i*19} y={110} width={17} height={24} fill={LBq} stroke={BLUE}/><Tq x={328+i*19} y={127} t={v} a="middle" c={BLUE}/></g>)}<Tq x={320} y={154} t="16,384 × 6 bits ≈ 12 KB, however many customers"/></g>;
const est=<g><Tq x={320} y={190} t="estimate: ~1.02 crore distinct (±0.8%)" b c={BLUE}/><Tq x={320} y={210} t="today = merge(hour 1 … hour 24): max per register"/><Tq x={20} y={210} t="Redis: PFADD, PFCOUNT, PFMERGE"/></g>;
return <svg viewBox="0 0 640 228" role="img" aria-labelledby={`hlt${uid}`}><title id={`hlt${uid}`}>HyperLogLog counts distinct customers. Keeping every ID exactly takes about 80 megabytes for 1 crore IDs. HyperLogLog hashes each ID and looks at how many zeros the hash starts with; a long run of zeros is rare, so seeing one suggests many distinct IDs. It keeps 16,384 small registers, each holding the longest run seen in its bucket, about 12 kilobytes in all however many customers there are. The estimate is within about 0.8 percent, and sketches for different hours merge into one for the day by taking the larger value in each register.</title>
{exact}{still?<g>{hashes}{regs}{est}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,hashes,regs,est]}/>}</svg>}

// Sketches, FIG 2: Count-Min sketch. 4 rows of counters (2,000 each in practice, 12 shown). Each event adds 1 at
// one hashed position per row; the estimate is the smallest of its 4 counters; collisions only add.
function CmsFig({still,uid=""}){const cx=j=>150+j*36,ry=r=>60+r*30;
const A=[3,7,1,10],B=[5,7,9,2];// columns hit by dish 9 and by dish 4 in each row (they collide in row 2)
const caps=[["1 · counting orders per dish exactly needs a counter per dish, and there are lakhs of dishes",INK],["2 · a Count-Min sketch keeps 4 rows of counters; each order adds 1 at one hashed spot per row",BLUE],["3 · dish 4 lands on the same spot in row 2, so that counter is too high",RED],["4 · the estimate is the smallest of a dish's 4 counters: it can overcount, never undercount",BLUE]];
const grid=<g>{[0,1,2,3].map(r=><g key={r}><Tq x={20} y={ry(r)+16} t={`row ${r+1} · hash ${r+1}`}/>{[...Array(12).keys()].map(j=><rect key={j} x={cx(j)} y={ry(r)} width={32} height={24} fill="#fff" stroke={GREY}/>)}</g>)}</g>;
const fill=(cols,c,val)=><g>{cols.map((j,r)=><g key={r}><rect x={cx(j)} y={ry(r)} width={32} height={24} fill={c===RED?LRq:FBq} stroke={c}/><Tq x={cx(j)+16} y={ry(r)+16} t={val(r)} a="middle" c={c}/></g>)}</g>;
const s2=<g>{fill(A,BLUE,()=>"412")}<Tq x={150} y={196} t="dish 9: 412 orders, added at one spot per row" c={BLUE}/></g>;
const s3=<g>{fill(A,BLUE,()=>"412")}{fill(B,GREY,()=>"88")}<rect x={cx(7)} y={ry(1)} width={32} height={24} fill={LRq} stroke={RED}/><Tq x={cx(7)+16} y={ry(1)+16} t="500" a="middle" c={RED}/><Tq x={150} y={196} t="dish 4 (88 orders) collides with dish 9 in row 2: 412 + 88 = 500" c={RED}/></g>;
const s4=<g>{s3}<Tq x={150} y={216} t="estimate for dish 9 = min(412, 500, 412, 412) = 412" b c={BLUE}/></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`cmt${uid}`}><title id={`cmt${uid}`}>A Count-Min sketch counting orders per dish. Instead of a counter for every one of lakhs of dishes, it keeps 4 rows of counters, about 2,000 in each row in practice. Each order adds one at a single hashed position in every row. Dish 9 has 412 orders. Dish 4, with 88, lands on the same position as dish 9 in row 2, so that counter reads 500. The estimate for a dish is the smallest of its four counters, 412, so the sketch can overcount but never undercount.</title>
{grid}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[1]} g={[null,s2,s3,s4]}/>}</svg>}

// Change data capture, FIG 1: the database's own log becomes a stream. The connector reads the write-ahead log and
// publishes one event per changed row (before, after, operation) to a topic per table; consumers read independently.
function CdcFlowFig({still,uid=""}){const M=`cf${uid}`;
const caps=[["1 · every committed change is already written to the database's log, in order",INK],["2 · a CDC connector reads that log: no triggers, and no change to the Order API",BLUE],["3 · each changed row becomes an event, with the row before and after, on a topic per table",BLUE],["4 · search, cache invalidation and the warehouse each read the stream at their own pace",BLUE]];
const base=<g><Bx x={10} y={60} w={110} h={44} t="Order API"/><Ar x1={122} y1={82} x2={146} y2={82} m={M}/><Bx x={150} y={60} w={130} h={44} t="PostgreSQL" s="orders table"/>
<rect x={150} y={112} width={130} height={22} fill="#eef1f5" stroke={GREY}/>{[0,1,2,3,4,5].map(i=><line key={i} x1={160+i*20} y1={112} x2={160+i*20} y2={134} stroke={GREY}/>)}<Tq x={152} y={150} t="write-ahead log"/></g>;
const s2=<g><Ar x1={282} y1={122} x2={316} y2={98} m={M} c={BLUE}/><Bx x={320} y={60} w={120} h={44} t="CDC connector" s="e.g. Debezium" c={BLUE} fill={LBq}/></g>;
const s3=<g><Ar x1={442} y1={82} x2={466} y2={82} m={M}/><Bx x={470} y={60} w={160} h={44} t="Kafka topic" s="db.public.orders"/><Tq x={20} y={214} t="one event:" b/><text x="20" y="232" className="fl">{'{"op":"u", "before":{"status":"new"}, "after":{"status":"accepted"}, "lsn":81920}'}</text></g>;
const s4=<g>{[["Search index",330],["Cache",432],["Warehouse",534]].map(([t,x])=><g key={t}><Ar x1={550} y1={106} x2={x+48} y2={156} m={M} c={BLUE}/><Bx x={x} y={158} w={96} h={30} t={t} c={BLUE} fill={LBq}/></g>)}</g>;
return <svg viewBox="0 0 640 262" role="img" aria-labelledby={`cft${uid}`}><title id={`cft${uid}`}>Change data capture. Every committed change to the orders table is already written to PostgreSQL's write-ahead log, in order. A CDC connector such as Debezium reads that log, with no triggers and no change to the Order API, and publishes one event per changed row, carrying the row before and after the change, to a Kafka topic for the table. The search index, a cache invalidator and the warehouse each read that stream at their own pace.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// Change data capture, FIG 2: snapshot, then stream. The connector notes log position 1,200, reads a consistent
// snapshot while writes continue, then streams from 1,200, so nothing is missed. A stopped connector holds the log.
function CdcSnapFig({still,uid=""}){const x=p=>60+(p-1180)*5.2;
const caps=[["1 · a new consumer needs every existing row, and then every change after that",INK],["2 · the connector notes the log position, 1,200, and reads a consistent snapshot of the table",BLUE],["3 · then it streams changes from 1,200 on, so nothing written during the snapshot is missed",BLUE],["4 · the database keeps its log until the connector reads it: one left stopped for days can fill the disk",RED]];
const base=<g><line x1={x(1180)} y1={150} x2={x(1290)} y2={150} stroke={GREY} strokeWidth="2"/>{[1180,1200,1220,1240,1260,1280].map(p=><g key={p}><line x1={x(p)} y1={144} x2={x(p)} y2={156} stroke={GREY}/><Tq x={x(p)} y={172} t={p.toLocaleString("en-IN")} a="middle"/></g>)}<Tq x={10} y={154} t="log"/></g>;
const s2=<g><line x1={x(1200)} y1={60} x2={x(1200)} y2={150} stroke={BLUE} strokeDasharray="4 3"/><Tq x={x(1200)} y={54} t="position noted" a="middle" c={BLUE}/><rect x={x(1200)+8} y={70} width={x(1255)-x(1200)} height={40} fill={LBq} stroke={BLUE}/><Tq x={x(1200)+16} y={94} t="snapshot: all 2.4 lakh order rows, as of 1,200" c={BLUE}/><Tq x={x(1200)+16} y={128} t="writes keep arriving: 1,201 … 1,255"/></g>;
const s3=<g><line x1={x(1200)} y1={150} x2={x(1290)} y2={150} stroke={BLUE} strokeWidth="4"/><Tq x={x(1200)} y={196} t="then stream from 1,200: no gap; a row changed twice is just upserted twice" c={BLUE}/></g>;
const s4=<g><rect x={x(1260)} y={140} width={x(1290)-x(1260)} height={20} fill={LRq} stroke={RED}/><Tq x={10} y={214} t="if the connector stops, the database keeps every log segment since its position" c={RED}/><Tq x={10} y={230} t="(in PostgreSQL, a replication slot): watch its lag and cap what it may keep" c={RED}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`cst${uid}`}><title id={`cst${uid}`}>How a change data capture connector starts. A new consumer needs every existing row and then every later change. The connector notes the current log position, 1,200, and reads a consistent snapshot of the table as of that position, while new writes keep arriving. Then it streams changes from position 1,200, so nothing written during the snapshot is missed; a row changed twice is simply written twice. The database keeps its log until the connector has read it, so a connector left stopped for days can fill the disk.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<Stq caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

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
"model-shapes":{C:ModelShapesFig,ar:640/280,title:()=>"ONE ORDER, TWO SHAPES"},
"model-copy":{C:ModelCopyFig,ar:640/270,title:()=>"WORK IT OUT, OR KEEP THE ANSWER"},
"btree-path":{C:BtreeFig,ar:640/270,title:()=>"FOUR READS TO ONE CUSTOMER"},
"index-order":{C:IndexOrderFig,ar:640/290,title:()=>"COLUMN ORDER DECIDES"},
"hash-move":{C:HashMoveFig,ar:640/256,title:()=>"A FIFTH SERVER: WHO MOVES"},
"hash-vnodes":{C:VnodesFig,ar:640/272,title:()=>"ONE POINT PER SERVER, OR SIX"},
"live-fanout":{C:LiveFanoutFig,ar:640/280,title:()=>"ONE EVENT, THE RIGHT PHONE"},
"live-resume":{C:LiveResumeFig,ar:640/300,title:()=>"PICKING UP WHERE IT LEFT OFF"},
"race-oversell":{C:RaceFig,ar:640/300,title:()=>"TWO BUYERS, ONE PLATE LEFT"},
"seat-hold":{C:SeatHoldFig,ar:640/250,title:()=>"HOLD, PAY, OR LET GO"},
"order-states":{C:OrderStatesFig,ar:640/250,title:()=>"AN ORDER AS A STATE MACHINE"},
"workflow-resume":{C:WorkflowResumeFig,ar:640/256,title:()=>"A CRASH HALFWAY THROUGH"},
"read-layers":{C:ReadLayersFig,ar:640/264,title:()=>"WHERE 1 LAKH READS A SECOND END UP"},
"hot-key-merge":{C:HotKeyFig,ar:640/280,title:()=>"ONE KEY EVERYONE WANTS"},
"write-buffer":{C:WriteBufferFig,ar:640/256,title:()=>"A SPIKE, ABSORBED BY A QUEUE"},
"split-counter":{C:SplitCounterFig,ar:640/264,title:()=>"ONE HOT COUNTER, SPLIT TEN WAYS"},
"multipart":{C:MultipartFig,ar:640/250,title:()=>"A BIG VIDEO, SIXTEEN PARTS"},
"file-states":{C:FileStatesFig,ar:640/230,title:()=>"AN UPLOAD'S LIFE IN THE DATABASE"},
"job-lease":{C:JobLeaseFig,ar:640/240,title:()=>"A WORKER DIES MID-JOB"},
"job-retries":{C:JobRetryFig,ar:640/250,title:()=>"TRY, WAIT, TRY AGAIN, THEN SET ASIDE"},
"prox-sizes":{C:ProxSizesFig,ar:640/250,title:()=>"ONE MORE LETTER, A SMALLER CELL"},
"prox-quadtree":{C:ProxQuadFig,ar:640/266,title:()=>"SMALL CELLS WHERE IT'S BUSY"},
"vec-embed":{C:VecEmbedFig,ar:640/264,title:()=>"DISHES AS POINTS IN SPACE"},
"vec-hnsw":{C:VecHnswFig,ar:640/270,title:()=>"HOPPING TOWARDS THE NEAREST"},
"ts-blocks":{C:TsBlocksFig,ar:640/236,title:()=>"16 BYTES DOWN TO UNDER 2"},
"ts-rollup":{C:TsRollupFig,ar:640/236,title:()=>"LESS DETAIL AS DATA GETS OLDER"},
"sketch-hll":{C:HllFig,ar:640/228,title:()=>"COUNTING CROWDS IN 12 KB"},
"sketch-cms":{C:CmsFig,ar:640/230,title:()=>"COUNTS THAT ONLY ERR UPWARDS"},
"cdc-flow":{C:CdcFlowFig,ar:640/262,title:()=>"THE DATABASE'S LOG AS A STREAM"},
"cdc-snapshot":{C:CdcSnapFig,ar:640/236,title:()=>"A SNAPSHOT, THEN EVERY CHANGE"},
};
