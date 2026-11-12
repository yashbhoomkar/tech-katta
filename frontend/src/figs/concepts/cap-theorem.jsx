// Concepts › CAP theorem: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "cap").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import{BG,FB,LINE_SOFT,SURFACE,SURFACE_2}from"../../theme/palette.js";import React from"react";import{Bx,Ar,INK,GREY,RED,BLUE,LB,LR,T,Fig,SBox,Line,Mark,Dot,Glow,Show}from"../parts.jsx";

const X=({x,y,c=RED,r=8})=><g stroke={c} strokeWidth="2.5"><line x1={x-r} y1={y-r} x2={x+r} y2={y+r}/><line x1={x-r} y1={y+r} x2={x+r} y2={y-r}/></g>;

const srv=(x,t,s,c=GREY,fill=BG)=><Bx key={t+s+c} x={x} y={92} w={170} h={50} t={t} s={s} c={c} fill={fill}/>;

// CAP in an interview, FIG 1: normal replication.
function ReplicateFig({still,uid=""}){const M=`pr${uid}`;
const base=<g>{srv(10,"Mumbai","name: Spice Route")}{srv(460,"Singapore","name: Spice Route")}<line x1={182} y1={117} x2={458} y2={117} stroke={GREY}/></g>;
const s1=<g><T x={10} y={60} t="restaurant owner" b/><Ar x1={60} y1={66} x2={60} y2={88} m={M}/><T x={70} y={80} t="rename: Masala House"/>{srv(10,"Mumbai","name: Masala House",BLUE,LB)}</g>;
const s2=<g><Ar x1={184} y1={117} x2={456} y2={117} m={M} c={BLUE} w={2}/><T x={320} y={110} t="copied, in a fraction of a second" a="middle" c={BLUE}/></g>;
const s3=srv(460,"Singapore","name: Masala House",BLUE,LB);
const s4=<g><Ar x1={545} y1={144} x2={545} y2={176} m={M} c={BLUE}/><T x={545} y={194} t="a user in Singapore" a="middle" b/><T x={545} y={210} t="sees Masala House" a="middle" c={BLUE}/></g>;
const caps=[["1 · a restaurant owner renames the restaurant on the Mumbai server",INK],["2 · the change is copied to the Singapore server",BLUE],["3 · now both copies hold the same name",BLUE],["4 · a reader in Singapore sees the new name: copies agree",BLUE]];
return <Fig still={still} h={222} id={`prt${uid}`} M={M} caps={caps} title="Normal replication between two servers. A restaurant owner renames the restaurant from Spice Route to Masala House on the Mumbai server. The change is copied to the Singapore server in a fraction of a second, so both copies hold the same name, and a user in Singapore sees Masala House."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// CAP in an interview, FIG 2: the partition and the choice.
function PartitionFig({still,uid=""}){const M=`pp${uid}`;
const base=<g>{srv(10,"Mumbai","name: Masala House")}{srv(460,"Singapore","name: Spice Route")}<T x={545} y={60} t="a user in Singapore" a="middle" b/><Ar x1={545} y1={66} x2={545} y2={88} m={M}/></g>;
const s1=<g><line x1={182} y1={117} x2={300} y2={117} stroke={RED} strokeDasharray="4 4"/><line x1={340} y1={117} x2={458} y2={117} stroke={RED} strokeDasharray="4 4"/><X x={320} y={117}/><T x={320} y={100} t="the link is down" a="middle" c={RED}/></g>;
const s2=<g><T x={320} y={150} t="Singapore can't tell whether the name changed" a="middle"/></g>;
const s3=<g><Bx x={250} y={176} w={180} h={44} t="option A: an error" s="stays consistent" c={RED} fill={LR}/></g>;
const s4=<g><Bx x={450} y={176} w={180} h={44} t="option B: Spice Route" s="stays available, maybe stale" c={BLUE} fill={LB}/><T x={630} y={238} t="chosen: an old name beats an error" a="end" c={BLUE}/></g>;
const caps=[["1 · the network between Mumbai and Singapore fails: a partition",RED],["2 · Singapore can't know whether its copy is still current",INK],["3 · it can refuse with an error, choosing consistency",RED],["4 · or show the name it has, choosing availability: the right call here",BLUE]];
return <Fig still={still} h={248} id={`ppt${uid}`} M={M} caps={caps} title="A network partition. The link between the Mumbai and Singapore servers fails after the restaurant was renamed in Mumbai, so Singapore still holds the old name and can't tell whether it changed. Asked for the restaurant, Singapore can refuse with an error, choosing consistency, or show the name it has, Spice Route, choosing availability. For a restaurant's name, the old name beats an error."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// CAP in an interview, FIG 3: one question per feature.
function ChooseFig({still,uid=""}){const M=`pc${uid}`;
const s1=<g><Bx x={150} y={46} w={340} h={40} t="would briefly stale data be a disaster?"/></g>;
const s2=<g><Ar x1={250} y1={88} x2={160} y2={122} m={M}/><T x={190} y={104} t="yes" a="end" b/><Bx x={20} y={126} w={280} h={40} t="consistency" s="refuse or wait during a split" c={INK} fill={SURFACE_2}/>{["seat booking","the last plate in stock","wallets and payments"].map((t,i)=><T key={i} x={30} y={188+i*16} t={`· ${t}`}/>)}</g>;
const s3=<g><Ar x1={390} y1={88} x2={480} y2={122} m={M} c={BLUE}/><T x={450} y={104} t="no" b c={BLUE}/><Bx x={340} y={126} w={280} h={40} t="availability" s="answer with what you have" c={BLUE} fill={LB}/>{["profiles and photos","menus and descriptions","opening hours and reviews"].map((t,i)=><T key={i} x={350} y={188+i*16} t={`· ${t}`} c={BLUE}/>)}</g>;
const s4=<g><T x={350} y={250} t="most features land here" c={BLUE} b/><T x={30} y={250} t="decide feature by feature"/></g>;
const caps=[["1 · for each feature, ask one question",INK],["2 · if stale data would be a disaster, choose consistency",INK],["3 · if not, choose availability and let copies catch up",BLUE],["4 · most features are the second kind; decide each one separately",BLUE]];
return <Fig still={still} h={262} id={`pct${uid}`} M={M} caps={caps} title="Choosing per feature with one question: would briefly stale data be a disaster? If yes, choose consistency and refuse or wait during a split: seat booking, the last plate in stock, wallets and payments. If not, choose availability and answer with what you have: profiles and photos, menus and descriptions, opening hours and reviews. Most features are the second kind."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Designing for consistency or availability: the two shapes.
function DesignsFig({still,uid=""}){const M=`pd${uid}`;
const s1=<g><T x={10} y={52} t="consistency first" b/><Bx x={10} y={62} w={130} h={40} t="app"/><Ar x1={50} y1={104} x2={50} y2={146} m={M}/><T x={58} y={130} t="writes"/><Ar x1={110} y1={146} x2={110} y2={104} m={M}/><T x={118} y={130} t="exact reads"/><Bx x={10} y={150} w={270} h={44} t="primary database" s="the one source of truth" c={INK} fill={SURFACE_2}/></g>;
const s2=<g><T x={10} y={214} t="during a split: waits or refuses" c={RED}/><T x={10} y={230} t="every write: waits for agreement" c={INK}/></g>;
const s3=<g><T x={340} y={52} t="availability first" b/><Bx x={340} y={62} w={110} h={40} t="app"/><Ar x1={395} y1={104} x2={395} y2={124} m={M}/><Bx x={340} y={126} w={110} h={36} t="primary" c={BLUE} fill={LB}/><Ar x1={452} y1={144} x2={476} y2={144} m={M} c={BLUE}/><Bx x={480} y={126} w={150} h={36} t="change stream" s="CDC" c={BLUE} fill={LB}/>{["replica","cache","search"].map((t,i)=><g key={t}><Ar x1={555} y1={164} x2={385+i*100} y2={186} m={M} c={BLUE}/><Bx x={340+i*100} y={188} w={90} h={30} t={t} c={BLUE} fill={LB}/></g>)}<T x={462} y={84} t="reads: nearest copy" c={BLUE}/></g>;
const s4=<g><T x={340} y={238} t="during a split: still answers, a little behind" c={BLUE}/></g>;
const caps=[["1 · consistency first: every write and exact read goes through one source of truth",INK],["2 · it pays in waiting, and in refusing requests during a split",RED],["3 · availability first: replicas, caches and search fed by a change stream",BLUE],["4 · each copy keeps answering on its own, a little behind",BLUE]];
return <Fig still={still} h={248} id={`pdt${uid}`} M={M} caps={caps} title="Two shapes of design. Consistency first: the app sends every write and every exact read to one primary database, the single source of truth; it pays in waiting for agreement and in refusing requests during a split. Availability first: writes go to a primary, and a change stream updates a replica, a cache and a search index; reads go to the nearest copy, which keeps answering during a split, a little behind."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Consistency per feature: one app, two choices.
function PerFeatureFig({still,uid=""}){const M=`pf${uid}`;
const s1=<g><Bx x={10} y={60} w={170} h={44} t="book seat 14, block C"/><Ar x1={182} y1={82} x2={226} y2={82} m={M}/><Bx x={230} y={60} w={180} h={44} t="bookings database" s="one primary" c={INK} fill={SURFACE_2}/><T x={320} y={120} t="consistency" a="middle" b/></g>;
const s2=<g><Bx x={10} y={150} w={170} h={44} t="browse the match page"/><Ar x1={182} y1={172} x2={226} y2={172} m={M} c={BLUE}/><Bx x={230} y={150} w={180} h={44} t="replicas and cache" s="near the user" c={BLUE} fill={LB}/><T x={320} y={210} t="availability" a="middle" b c={BLUE}/></g>;
const s3=<g><T x={450} y={52} t="when the network splits:" c={RED} b/><Bx x={450} y={60} w={180} h={44} t="refuses: try again" s="no seat sold twice" c={RED} fill={LR}/><Ar x1={412} y1={82} x2={446} y2={82} m={M} c={RED}/></g>;
const s4=<g><Bx x={450} y={150} w={180} h={44} t="still answers" s="preview a minute old" c={BLUE} fill={LB}/><Ar x1={412} y1={172} x2={446} y2={172} m={M} c={BLUE}/></g>;
const caps=[["1 · booking a seat goes to one consistent store",INK],["2 · browsing the match page is served by replicas and a cache",BLUE],["3 · during a split, booking refuses rather than risk selling a seat twice",RED],["4 · while browsing keeps working with slightly old data",BLUE]];
return <Fig still={still} h={248} id={`pft${uid}`} M={M} caps={caps} title="One ticketing app, two choices. Booking seat 14 in block C goes to one bookings database with a single primary: consistency. Browsing the match page is served by replicas and a cache near the user: availability. During a network split, booking refuses and asks the user to try again, so no seat is sold twice, while browsing keeps working with a preview a minute old."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}


// Moved here from the older Concepts groups (removed 2026-11-09), drawn the same way.
// Consistency, FIG: a restaurant changes a biryani's price from ₹250 to ₹280 at 100 ms. What four
// readers see over the next half-second: a strong read always shows the newest value; the restaurant
// owner, reading their own write, sees it at once; a customer on a replica 250 ms behind sees it late;
// a customer bounced between two replicas sees ₹280, then ₹250 again, then ₹280.
function ConsistencyTimelineFig({still,uid=""}){const D="10s",X0=200,X1=620,T=500,x=(t)=>X0+(t/T)*(X1-X0);
const rows=[["Leader (the truth)",[[0,100,0],[100,500,1]],"price changed at 100 ms"],["Strong read",[[0,100,0],[100,500,1]],"always the newest"],["The owner, reading own write",[[0,100,0],[100,500,1]],"reads go to the leader"],["Replica 250 ms behind",[[0,350,0],[350,500,1]],"eventual: late, then right"],["Two replicas, no stickiness",[[0,100,0],[100,180,1],[180,300,0],[300,500,1]],"₹280, then ₹250 again"]];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`ctt${uid}`}><title id={`ctt${uid}`}>A restaurant changes a biryani from 250 to 280 rupees at 100 milliseconds. The leader and any strongly consistent read show 280 from that moment. The owner, whose own reads go to the leader after a change, also sees 280 at once. A customer reading from a replica 250 milliseconds behind sees 250 until 350 milliseconds, then 280: eventually consistent. A customer whose reads land on two different replicas sees 280, then 250 again, then 280, as if time went backwards.</title>
{rows.map(([n,segs,note],i)=>{const y=60+i*44;return <g key={n}><text x="0" y={y+4} className="fb">{n}</text><text x="0" y={y+18} className="fl">{note}</text>
{segs.map(([a,b,v],j)=><g key={j}><rect x={x(a)} y={y-10} width={x(b)-x(a)-1} height="20" fill={v?FB:SURFACE} stroke={v?BLUE:GREY}/>{x(b)-x(a)>40&&<text x={(x(a)+x(b))/2} y={y+4} textAnchor="middle" className="fl" style={v?{fill:BLUE}:undefined}>₹{v?280:250}</text>}</g>)}</g>})}
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
<line x1="0" y1="150" x2="640" y2="150" stroke={LINE_SOFT}/>
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
<rect x="20" y="70" width="220" height="150" fill={BG} stroke={GREY}/><text x="130" y="92" textAnchor="middle" className="fb">Mumbai</text><SBox x={60} y={140} w={140} t="Copy of the data" blue/>
<rect x="400" y="70" width="220" height="150" fill={BG} stroke={GREY}/><text x="510" y="92" textAnchor="middle" className="fb">Hyderabad</text><SBox x={440} y={140} w={140} t="Copy of the data" blue/>
<Line x1={202} y1={136} x2={436} y2={136} m={M} c={GREY}/><Line x1={436} y1={146} x2={204} y2={146} m={M} c={GREY}/>
<text x="10" y="252" className="fl">wallet, payments, rider assignment → refuse during a split</text><text x="10" y="270" className="fl">menus, carts, reviews → accept, merge afterwards</text>
{still?<g><text x="10" y="30" className="fb" style={{fill:RED}}>The link is down: each side decides on its own</text><text x="320" y="132" textAnchor="middle" className="fb" style={{fill:RED}}>✕</text><text x="320" y="170" textAnchor="middle" className="fl" style={{fill:RED}}>link down</text><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>top-up: "try again soon"</text><text x="510" y="212" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu edit: saved, synced later</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Dot x1={204} x2={434} y={136} t0={.03} t1={.12} dur={D}/><Dot x1={434} x2={206} y={146} t0={.12} t1={.21} dur={D}/>
<Show t0={.25} t1={1} dur={D}><text x="320" y="132" textAnchor="middle" className="fb" style={{fill:RED}}>✕</text><text x="320" y="170" textAnchor="middle" className="fl" style={{fill:RED}}>link down</text></Show>
<Show t0={.5} t1={.75} dur={D}><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>top-up: "try again soon"</text><Glow x={440} y={128} w={140} h={24} t0={0} t1={1} dur={D}/></Show>
<Show t0={.75} t1={1} dur={D}><text x="510" y="196" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu edit: saved here</text><text x="130" y="196" textAnchor="middle" className="fl">still shows the old menu</text></Show></g>}</svg>}
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

export const FIGS={
"cp-replicate":{C:ReplicateFig,ar:640/222,title:()=>"ONE RENAME, TWO COPIES"},
"cp-partition":{C:PartitionFig,ar:640/248,title:()=>"THE LINK IS DOWN: ERROR OR OLD NAME?"},
"cp-choose":{C:ChooseFig,ar:640/262,title:()=>"ONE QUESTION PER FEATURE"},
"cp-designs":{C:DesignsFig,ar:640/248,title:()=>"BUILT FOR CONSISTENCY, OR FOR AVAILABILITY"},
"cp-per-feature":{C:PerFeatureFig,ar:640/248,title:()=>"ONE APP, TWO CHOICES"},
"consistency-timeline":{C:ConsistencyTimelineFig,ar:640/300,title:()=>"ONE PRICE CHANGE, FOUR READERS"},
"double-accept":{C:DoubleAcceptFig,ar:640/300,title:()=>"TWO RIDERS, ONE ORDER"},
"cap-split":{C:CapSplitFig,ar:640/300,title:()=>"WHEN MUMBAI AND HYDERABAD CAN'T TALK"},
"quorum-split":{C:QuorumSplitFig,ar:640/220,title:()=>"THREE OF FIVE KEEP GOING"},
};
