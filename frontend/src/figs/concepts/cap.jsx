// Concepts › CAP theorem: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "cap").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Bx,Ar,INK,GREY,RED,BLUE,LB,LR,T,Fig}from"../parts.jsx";

const X=({x,y,c=RED,r=8})=><g stroke={c} strokeWidth="2.5"><line x1={x-r} y1={y-r} x2={x+r} y2={y+r}/><line x1={x-r} y1={y+r} x2={x+r} y2={y-r}/></g>;

const srv=(x,t,s,c=GREY,fill="#fff")=><Bx key={t+s+c} x={x} y={92} w={170} h={50} t={t} s={s} c={c} fill={fill}/>;

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
const s2=<g><Ar x1={250} y1={88} x2={160} y2={122} m={M}/><T x={190} y={104} t="yes" a="end" b/><Bx x={20} y={126} w={280} h={40} t="consistency" s="refuse or wait during a split" c={INK} fill="#fbfcfd"/>{["seat booking","the last plate in stock","wallets and payments"].map((t,i)=><T key={i} x={30} y={188+i*16} t={`· ${t}`}/>)}</g>;
const s3=<g><Ar x1={390} y1={88} x2={480} y2={122} m={M} c={BLUE}/><T x={450} y={104} t="no" b c={BLUE}/><Bx x={340} y={126} w={280} h={40} t="availability" s="answer with what you have" c={BLUE} fill={LB}/>{["profiles and photos","menus and descriptions","opening hours and reviews"].map((t,i)=><T key={i} x={350} y={188+i*16} t={`· ${t}`} c={BLUE}/>)}</g>;
const s4=<g><T x={350} y={250} t="most features land here" c={BLUE} b/><T x={30} y={250} t="decide feature by feature"/></g>;
const caps=[["1 · for each feature, ask one question",INK],["2 · if stale data would be a disaster, choose consistency",INK],["3 · if not, choose availability and let copies catch up",BLUE],["4 · most features are the second kind; decide each one separately",BLUE]];
return <Fig still={still} h={262} id={`pct${uid}`} M={M} caps={caps} title="Choosing per feature with one question: would briefly stale data be a disaster? If yes, choose consistency and refuse or wait during a split: seat booking, the last plate in stock, wallets and payments. If not, choose availability and answer with what you have: profiles and photos, menus and descriptions, opening hours and reviews. Most features are the second kind."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Designing for consistency or availability: the two shapes.
function DesignsFig({still,uid=""}){const M=`pd${uid}`;
const s1=<g><T x={10} y={52} t="consistency first" b/><Bx x={10} y={62} w={130} h={40} t="app"/><Ar x1={50} y1={104} x2={50} y2={146} m={M}/><T x={58} y={130} t="writes"/><Ar x1={110} y1={146} x2={110} y2={104} m={M}/><T x={118} y={130} t="exact reads"/><Bx x={10} y={150} w={270} h={44} t="primary database" s="the one source of truth" c={INK} fill="#fbfcfd"/></g>;
const s2=<g><T x={10} y={214} t="during a split: waits or refuses" c={RED}/><T x={10} y={230} t="every write: waits for agreement" c={INK}/></g>;
const s3=<g><T x={340} y={52} t="availability first" b/><Bx x={340} y={62} w={110} h={40} t="app"/><Ar x1={395} y1={104} x2={395} y2={124} m={M}/><Bx x={340} y={126} w={110} h={36} t="primary" c={BLUE} fill={LB}/><Ar x1={452} y1={144} x2={476} y2={144} m={M} c={BLUE}/><Bx x={480} y={126} w={150} h={36} t="change stream" s="CDC" c={BLUE} fill={LB}/>{["replica","cache","search"].map((t,i)=><g key={t}><Ar x1={555} y1={164} x2={385+i*100} y2={186} m={M} c={BLUE}/><Bx x={340+i*100} y={188} w={90} h={30} t={t} c={BLUE} fill={LB}/></g>)}<T x={462} y={84} t="reads: nearest copy" c={BLUE}/></g>;
const s4=<g><T x={340} y={238} t="during a split: still answers, a little behind" c={BLUE}/></g>;
const caps=[["1 · consistency first: every write and exact read goes through one source of truth",INK],["2 · it pays in waiting, and in refusing requests during a split",RED],["3 · availability first: replicas, caches and search fed by a change stream",BLUE],["4 · each copy keeps answering on its own, a little behind",BLUE]];
return <Fig still={still} h={248} id={`pdt${uid}`} M={M} caps={caps} title="Two shapes of design. Consistency first: the app sends every write and every exact read to one primary database, the single source of truth; it pays in waiting for agreement and in refusing requests during a split. Availability first: writes go to a primary, and a change stream updates a replica, a cache and a search index; reads go to the nearest copy, which keeps answering during a split, a little behind."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Consistency per feature: one app, two choices.
function PerFeatureFig({still,uid=""}){const M=`pf${uid}`;
const s1=<g><Bx x={10} y={60} w={170} h={44} t="book seat 14, block C"/><Ar x1={182} y1={82} x2={226} y2={82} m={M}/><Bx x={230} y={60} w={180} h={44} t="bookings database" s="one primary" c={INK} fill="#fbfcfd"/><T x={320} y={120} t="consistency" a="middle" b/></g>;
const s2=<g><Bx x={10} y={150} w={170} h={44} t="browse the match page"/><Ar x1={182} y1={172} x2={226} y2={172} m={M} c={BLUE}/><Bx x={230} y={150} w={180} h={44} t="replicas and cache" s="near the user" c={BLUE} fill={LB}/><T x={320} y={210} t="availability" a="middle" b c={BLUE}/></g>;
const s3=<g><T x={450} y={52} t="when the network splits:" c={RED} b/><Bx x={450} y={60} w={180} h={44} t="refuses: try again" s="no seat sold twice" c={RED} fill={LR}/><Ar x1={412} y1={82} x2={446} y2={82} m={M} c={RED}/></g>;
const s4=<g><Bx x={450} y={150} w={180} h={44} t="still answers" s="preview a minute old" c={BLUE} fill={LB}/><Ar x1={412} y1={172} x2={446} y2={172} m={M} c={BLUE}/></g>;
const caps=[["1 · booking a seat goes to one consistent store",INK],["2 · browsing the match page is served by replicas and a cache",BLUE],["3 · during a split, booking refuses rather than risk selling a seat twice",RED],["4 · while browsing keeps working with slightly old data",BLUE]];
return <Fig still={still} h={248} id={`pft${uid}`} M={M} caps={caps} title="One ticketing app, two choices. Booking seat 14 in block C goes to one bookings database with a single primary: consistency. Browsing the match page is served by replicas and a cache near the user: availability. During a network split, booking refuses and asks the user to try again, so no seat is sold twice, while browsing keeps working with a preview a minute old."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

export const FIGS={
"cp-replicate":{C:ReplicateFig,ar:640/222,title:()=>"ONE RENAME, TWO COPIES"},
"cp-partition":{C:PartitionFig,ar:640/248,title:()=>"THE LINK IS DOWN: ERROR OR OLD NAME?"},
"cp-choose":{C:ChooseFig,ar:640/262,title:()=>"ONE QUESTION PER FEATURE"},
"cp-designs":{C:DesignsFig,ar:640/248,title:()=>"BUILT FOR CONSISTENCY, OR FOR AVAILABILITY"},
"cp-per-feature":{C:PerFeatureFig,ar:640/248,title:()=>"ONE APP, TWO CHOICES"},
};
