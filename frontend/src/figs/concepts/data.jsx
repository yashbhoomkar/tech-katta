// Concepts › Data across machines: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "data").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Glow,Show,Mark,Mk,Bx,Ar,Caps,Cap,Line,SBox,INK,GREY,RED,BLUE}from"../parts.jsx";

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

export const FIGS={
"repl-sync":{C:ReplSyncFig,ar:640/300,title:()=>"ONE PAYMENT, COPIED TWO WAYS"},
"repl-failover":{C:ReplFailoverFig,ar:640/290,title:()=>"WHEN THE LEADER DIES"},
"consistency-timeline":{C:ConsistencyTimelineFig,ar:640/300,title:()=>"ONE PRICE CHANGE, FOUR READERS"},
"double-accept":{C:DoubleAcceptFig,ar:640/300,title:()=>"TWO RIDERS, ONE ORDER"},
"cap-split":{C:CapSplitFig,ar:640/300,title:()=>"WHEN MUMBAI AND HYDERABAD CAN'T TALK"},
"pacelc":{C:PacelcFig,ar:640/290,title:()=>"THE PRICE OF EACH COPY YOU WAIT FOR"},
"model-shapes":{C:ModelShapesFig,ar:640/280,title:()=>"ONE ORDER, TWO SHAPES"},
"model-copy":{C:ModelCopyFig,ar:640/270,title:()=>"WORK IT OUT, OR KEEP THE ANSWER"},
"btree-path":{C:BtreeFig,ar:640/270,title:()=>"FOUR READS TO ONE CUSTOMER"},
"index-order":{C:IndexOrderFig,ar:640/290,title:()=>"COLUMN ORDER DECIDES"},
"hash-move":{C:HashMoveFig,ar:640/256,title:()=>"A FIFTH SERVER: WHO MOVES"},
"hash-vnodes":{C:VnodesFig,ar:640/272,title:()=>"ONE POINT PER SERVER, OR SIX"},
};
