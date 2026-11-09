// Concepts › Sharding: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "sharding").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Bx,Ar,Life,Msg,INK,GREY,RED,BLUE,LB,LR,T,Fig,X,Show,Mark,Box,Line,SBox,Dot,Glow}from"../parts.jsx";

// Sharding in an interview: scale up hits a ceiling, scale out keeps growing.
function CeilingFig({still,uid=""}){
const up=(i,h,t,c=GREY,fill="#fff")=><g key={i+c}><rect x={30+i*80} y={220-h} width={60} height={h} fill={fill} stroke={c}/><T x={60+i*80} y={236} t={t} a="middle"/></g>;
const base=<g><T x={10} y={52} t="scale up: a bigger machine" b/><T x={350} y={52} t="scale out: more machines" b/><line x1={330} y1={44} x2={330} y2={240} stroke="#e3e7ec"/></g>;
const s1=up(0,50,"8 cores");
const s2=<g>{up(1,100,"32 cores")}{up(2,140,"128 cores",RED,LR)}<line x1={10} y1={80} x2={310} y2={80} stroke={RED} strokeDasharray="5 4" strokeWidth="2"/><T x={10} y={74} t="one machine's ceiling" c={RED}/></g>;
const sh=n=>Array.from({length:n},(_,i)=><rect key={i} x={350+i*35} y={140} width={29} height={80} fill={LB} stroke={BLUE}/>);
const s3=<g>{sh(2)}<T x={350} y={236} t="2 shards" c={BLUE}/></g>;
const s4=<g>{sh(8)}<rect x={348} y={234-12} width={120} height={16} fill="#fff"/><T x={350} y={236} t="8 shards, and room for more" c={BLUE}/><T x={350} y={126} t="storage and throughput grow with each shard" c={BLUE}/></g>;
const caps=[["1 · a growing product first moves its database to a bigger machine",INK],["2 · that works for a while, but one machine has a ceiling",RED],["3 · splitting the data across machines shares the work",BLUE],["4 · capacity then grows with the number of machines",BLUE]];
return <Fig still={still} h={246} id={`sct${uid}`} caps={caps} title="Scaling up versus scaling out. A growing database first moves to bigger machines, from 8 cores to 32 to 128, but one machine has a ceiling. Splitting the data across machines, first two shards and then eight, lets storage and throughput grow with each shard added."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Partitioning and sharding: monthly partitions inside one database.
function PartitionFig({still,uid=""}){
const P=["2022","2023","2024","Jan–Sep","October","November"];
const chip=(i,c=GREY,fill="#fff",s="partition")=><Bx key={i+c+s} x={310+(i%3)*106} y={84+Math.floor(i/3)*58} w={98} h={44} t={P[i]} s={s} c={c} fill={fill}/>;
const s1=<g><Bx x={10} y={60} w={240} h={140} t="orders" s="50 crore rows · 2 TB" c={RED} fill={LR}/><T x={10} y={222} t="October's orders: searches all 2 TB" c={RED}/></g>;
const s2=<g><rect x={300} y={56} width={330} height={150} fill="none" stroke={GREY}/><T x={310} y={74} t="the same database: orders, partitioned by month" b/>{P.map((_,i)=>chip(i))}</g>;
const s3=<g>{chip(4,BLUE,LB,"read")}<T x={310} y={222} t="October's orders: one partition" c={BLUE}/></g>;
const s4=<g>{chip(0,RED,LR,"dropped")}<X x={326} y={98}/></g>;
const caps=[["1 · one huge table: a query for one month searches all of it",RED],["2 · partitioned by month, it is many smaller tables inside the same database",INK],["3 · October's query now reads only October's partition",BLUE],["4 · and old data goes in one cheap step: drop the 2022 partition",BLUE]];
return <Fig still={still} h={232} id={`spt${uid}`} caps={caps} title="Partitioning inside one database. One orders table of 50 crore rows and 2 terabytes makes a query for October's orders search all of it. Partitioned by month, the same database holds smaller partitions for 2022, 2023, 2024, January to September, October and November. October's query reads only the October partition, and the 2022 data is dropped in one cheap step."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Partitioning and sharding: vertical partitioning by columns.
function VerticalFig({still,uid=""}){
const C=[["id",60],["status",80],["total",70],["placed_at",90],["instructions",140],["receipt_text",160]];
const row=(y,cols,x0,c=GREY,fill="#fff")=>{let x=x0;return cols.map(([t,w],i)=>{const e=<Bx key={t+y+c} x={x} y={y} w={w} h={30} t={t} c={c} fill={fill}/>;x+=w;return e;});};
const s1=<g><T x={20} y={54} t="orders: one wide table" b/>{row(62,C,20)}</g>;
const s2=<g><T x={20} y={124} t="orders: small, read on every screen" c={BLUE}/>{row(132,C.slice(0,4),20,BLUE,LB)}</g>;
const s3=<g><T x={340} y={124} t="order_details: large, rarely read"/>{row(132,[["id",60],["instructions",110],["receipt_text",120]],340)}</g>;
const s4=<g><T x={20} y={190} t="the hot table is a fraction of the size, so it stays in memory;" c={BLUE}/><T x={20} y={206} t="the order screen reads only it, and joins on id when it needs the rest" c={BLUE}/></g>;
const caps=[["1 · one wide table mixes small, busy columns with large, rarely read ones",INK],["2 · the columns read on every screen move into a small table",BLUE],["3 · the large ones go to a second table with the same ids",INK],["4 · the small table fits in memory, so the common reads get faster",BLUE]];
return <Fig still={still} h={216} id={`svt${uid}`} caps={caps} title="Vertical partitioning. A wide orders table mixes small, busy columns (id, status, total, placed at) with large, rarely read ones (instructions, receipt text). The busy columns move to a small table read on every screen, and the large ones go to a second table with the same ids. The small table fits in memory, so the common reads get faster, and the rest is joined on id when needed."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Partitioning and sharding: rows split over three machines.
function ShardsFig({still,uid=""}){const M=`ss${uid}`;
const R=["ids 1 – 10 crore","10 – 20 crore","20 – 30 crore"];
const sh=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={440} y={44+i*60} w={190} h={48} t={`shard ${i+1}`} s={R[i]} c={c} fill={fill}/>;
const s1=<g><Bx x={440} y={104} w={190} h={48} t="one database" s="all 30 crore orders" c={RED} fill={LR}/></g>;
const s2=<g>{[0,1,2].map(i=>sh(i))}</g>;
const s3=<g>{[0,1,2].map(i=>sh(i))}<Bx x={10} y={104} w={160} h={48} t="app" s="GET order 15,20,00,000"/><Ar x1={172} y1={128} x2={436} y2={128} m={M} c={BLUE} w={2}/>{sh(1,BLUE,LB)}<T x={300} y={120} t="routed by id" a="middle" c={BLUE}/></g>;
const s4=<g>{[0,1,2].map(i=>sh(i,BLUE,LB))}<T x={10} y={220} t="each shard: its own CPU, memory, disk and connections; none holds everything" c={BLUE}/></g>;
const caps=[["1 · one database holds every order and takes every request",RED],["2 · sharded, the rows are split across three independent databases",INK],["3 · each query is routed to the shard that holds its rows",BLUE],["4 · no machine holds all the data or takes all the traffic",BLUE]];
return <Fig still={still} h={230} id={`sst${uid}`} M={M} caps={caps} only={[0]} title="Sharding across machines. One database first holds all 30 crore orders. Sharded, the rows are split across three independent databases by order id: ids up to 10 crore, 10 to 20 crore, and 20 to 30 crore. A request for order 15,20,00,000 is routed to shard 2. Each shard has its own CPU, memory, disk and connections, and none holds everything."
base={null} g={[s1,s2,s3,s4]} last={<g>{s3}{s4}</g>}/>}

// Shard keys and strategies: range sharding.
function RangeFig({still,uid=""}){const M=`sr${uid}`;
const R=["1 – 10 lakh","10 – 20 lakh","20 – 30 lakh","30 – 40 lakh"];
const sh=(i,c=GREY,fill="#fff",s=R[i])=><Bx key={i+c+s} x={10+i*157} y={66} w={150} h={46} t={`shard ${i+1}`} s={s} c={c} fill={fill}/>;
const s1=<g><T x={10} y={56} t="customers sharded by id range" b/>{[0,1,2,3].map(i=>sh(i))}</g>;
const s2=<g><rect x={66} y={116} width={22} height={6} fill={BLUE}/><T x={10} y={140} t="customers 5–6 lakh: one shard" c={BLUE}/></g>;
const s3=<g>{sh(3,RED,LR,"every new sign-up")}<Ar x1={556} y1={168} x2={556} y2={116} m={M} c={RED} w={2}/><T x={556} y={182} t="new customers" a="middle" c={RED}/><T x={300} y={140} t="the newest range takes all new writes" c={RED}/></g>;
const s4=<g><T x={10} y={204} t="multi-tenant: chain A owns ids 1–10 lakh, chain B 10–20 lakh, …" c={BLUE}/><T x={10} y={220} t="each chain's staff only touch their own range, so the load spreads" c={BLUE}/></g>;
const caps=[["1 · range sharding gives each shard a continuous band of ids",INK],["2 · a range query stays on one shard",BLUE],["3 · but new ids all land in the last range, so one shard takes every new write",RED],["4 · it suits tenants who each own a range and only use their own",BLUE]];
return <Fig still={still} h={228} id={`srt${uid}`} M={M} caps={caps} title="Range sharding. Customers are split into four shards by id range: 1 to 10 lakh, 10 to 20 lakh, 20 to 30 lakh and 30 to 40 lakh. A query for customers 5 to 6 lakh stays on one shard. But every new sign-up gets the next id, so the last shard takes all new writes. Ranges suit multi-tenant data, where each restaurant chain owns a range and its staff only touch their own."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Shard keys and strategies: hash % N versus a ring or buckets when a fifth shard arrives.
function HashModFig({still,uid=""}){
const H=[17,42,9,30,55,23,61,8,34,47,12,26],m4=H.map(h=>h%4),m5=H.map(h=>h%5),ring=m4.map((s,i)=>i===4||i===9?4:s);
const X0=i=>96+i*44;
const cell=(i,y,v,c=GREY,fill="#fff")=><Bx key={`${i}${y}${c}`} x={X0(i)} y={y} w={40} h={26} t={`s${v}`} c={c} fill={fill}/>;
const base=<g>{H.map((h,i)=><T key={i} x={X0(i)+20} y={60} t={`c${i+1}`} a="middle"/>)}</g>;
const s1=<g><T x={10} y={88} t="hash % 4" b/>{m4.map((v,i)=>cell(i,70,v))}</g>;
const s2=<g><T x={10} y={128} t="hash % 5" b/>{m5.map((v,i)=>cell(i,110,v))}</g>;
const s3=<g>{m5.map((v,i)=>v!==m4[i]&&cell(i,110,v,RED,LR))}<T x={96} y={154} t="9 of 12 customers changed shard: most of the data moves" c={RED}/></g>;
const s4=<g><T x={10} y={188} t="ring or" b/><T x={10} y={202} t="buckets" b/>{ring.map((v,i)=>cell(i,176,v,v===4?BLUE:GREY,v===4?LB:"#fff"))}<T x={96} y={220} t="only 2 of 12 move, both to the new shard s4" c={BLUE}/></g>;
const caps=[["1 · twelve customers spread over four shards with hash % 4",INK],["2 · a fifth shard is added, so the rule becomes hash % 5",INK],["3 · almost every customer now maps to a different shard",RED],["4 · with a ring or fixed buckets, only the share the new shard takes moves",BLUE]];
return <Fig still={still} h={228} id={`smt${uid}`} caps={caps} title="Adding a fifth shard. Twelve customers are spread over four shards with hash modulo 4. When the rule becomes hash modulo 5, nine of the twelve customers map to a different shard, so most of the data has to move. With consistent hashing or fixed buckets, only the customers the new shard takes over move: two of twelve, both to the new shard."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Shard keys and strategies: directory sharding.
function DirectoryFig({still,uid=""}){const M=`sd${uid}`;
const sh=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={470} y={44+i*42} w={160} h={34} t={`shard ${i+1}`} c={c} fill={fill}/>;
const base=<g><Bx x={10} y={80} w={120} h={44} t="app"/><rect x={210} y={60} width={200} height={90} fill="#fff" stroke={GREY}/><T x={220} y={78} t="directory" b/><T x={220} y={98} t="customer 15  → shard 1"/><T x={220} y={134} t="customer 204 → shard 2"/>{[0,1,2,3].map(i=>sh(i))}</g>;
const r87=(t,c)=><g key={t}><rect x={214} y={104} width={192} height={16} fill="#fff"/><T x={220} y={116} t={t} c={c}/></g>;
const s1=<g>{r87("customer 87  → shard 4",BLUE)}<Ar x1={132} y1={102} x2={206} y2={102} m={M} c={BLUE}/><T x={170} y={96} t="87?" a="middle" c={BLUE}/></g>;
const s2=<g><Ar x1={412} y1={112} x2={466} y2={170} m={M} c={BLUE} w={2}/>{sh(3,BLUE,LB)}</g>;
const s3=<g>{r87("customer 87  → shard 2",BLUE)}{sh(1,BLUE,LB)}<T x={210} y={170} t="moving a customer: change one row" c={BLUE}/></g>;
const s4=<g><rect x={210} y={60} width={200} height={90} fill="none" stroke={RED} strokeWidth="2"/><X x={392} y={76} r={8}/><T x={210} y={194} t="directory down: every request fails," c={RED}/><T x={210} y={210} t="though all four shards are healthy" c={RED}/></g>;
const caps=[["1 · before any query, the app asks the directory where customer 87 lives",BLUE],["2 · then it queries that shard",BLUE],["3 · moving a customer means changing one row in the directory",BLUE],["4 · but every request needs the lookup, and if the directory fails, nothing works",RED]];
return <Fig still={still} h={218} id={`sdt${uid}`} M={M} caps={caps} title="Directory sharding. Before any query, the app asks a directory where customer 87 lives; the directory says shard 4, and the app queries shard 4. Moving customer 87 to shard 2 means changing one row in the directory. But every request needs the lookup, and if the directory goes down, every request fails even though all four shards are healthy."
base={base} g={[s1,s2,s3,s4]} last={<g>{s3}{s4}</g>}/>}

// Sharding problems: scatter-gather across shards, and a cache.
function ScatterFig({still,uid=""}){const M=`sg${uid}`;
const sh=(i,c=GREY,fill="#fff",s)=><Bx key={i+c} x={440+(i%2)*100} y={44+Math.floor(i/2)*44} w={90} h={34} t={`shard ${i+1}`} s={s} c={c} fill={fill}/>;
const base=<g><Bx x={10} y={100} w={120} h={44} t="app" s="top 10 dishes"/>{Array.from({length:8},(_,i)=>sh(i))}<T x={440} y={232} t="… and 56 more shards"/></g>;
const fan=c=>Array.from({length:8},(_,i)=><Ar key={i+c} x1={132} y1={122} x2={436} y2={61+Math.floor(i/2)*44+(i%2?0:-6)} m={M} c={c}/>);
const g1=<g>{fan(INK)}</g>;
const slow=<g>{sh(5,RED,LR,"180 ms")}<T x={10} y={186} t="the answer waits for the slowest shard" c={RED}/></g>;
const g2=<g>{fan(INK)}{slow}</g>;
const g3=<g>{fan(INK)}{slow}<T x={10} y={204} t="then merge 64 lists and keep 10" c={INK}/></g>;
const g4=<g><Bx x={220} y={100} w={150} h={44} t="cache" s="top 10, for 5 minutes" c={BLUE} fill={LB}/><Ar x1={132} y1={122} x2={216} y2={122} m={M} c={BLUE} w={2}/><T x={10} y={186} t="cached: the next thousand requests" c={BLUE}/><T x={10} y={202} t="touch no shard at all" c={BLUE}/></g>;
const caps=[["1 · a query without the shard key goes to every shard",INK],["2 · the answer is only as fast as the slowest of the 64",RED],["3 · then the app merges 64 lists to keep the top 10",INK],["4 · cache the result for five minutes, and most requests skip the shards",BLUE]];
return <Fig still={still} h={244} id={`sgt${uid}`} M={M} caps={caps} only={[0,1,2]} title="A query across shards. Asking for the top 10 dishes in the city has no shard key, so the app sends it to all 64 shards and waits for every answer; one slow shard taking 180 milliseconds sets the time. The app then merges 64 lists to keep the top 10. Cached for five minutes, the next thousand requests touch no shard at all."
base={base} g={[g1,g2,g3,g4]} last={g4}/>}

// Sharding problems: a saga across two shards.
function TransferFig({still,uid=""}){const M=`st${uid}`;
const base=<g><Life x={80} t="transfer service" y1={228}/><Life x={320} t="shard 1" s="wallet A" y1={228}/><Life x={560} t="shard 2" s="wallet B" y1={228}/></g>;
const s1=<g><Msg x1={80} x2={320} y={94} t="debit A ₹500" m={M}/><Msg x1={320} x2={80} y={112} t="committed" m={M} c={BLUE}/></g>;
const s2=<g><Msg x1={80} x2={560} y={140} t="credit B ₹500" tx={440} m={M}/><Msg x1={560} x2={80} y={158} t="failed" tx={440} m={M} c={RED}/></g>;
const s3=<g><Msg x1={80} x2={320} y={186} t="refund A ₹500" m={M} c={BLUE}/><T x={332} y={190} t="compensating step" c={BLUE}/></g>;
const s4=<g><T x={332} y={220} t="no lock spans both shards" c={BLUE}/></g>;
const caps=[["1 · step 1 commits on shard 1: wallet A is debited ₹500",INK],["2 · step 2 on shard 2 fails: wallet B can't be credited",RED],["3 · a compensating step refunds wallet A on shard 1",BLUE],["4 · each step is an ordinary local transaction; no lock spans both shards",BLUE]];
return <Fig still={still} h={234} id={`stt${uid}`} M={M} caps={caps} title="A transfer between two shards as a saga. Step 1 debits wallet A by 500 rupees on shard 1 and commits. Step 2 tries to credit wallet B on shard 2 and fails. A compensating step then refunds wallet A on shard 1. Each step is an ordinary local transaction, and no lock spans both shards."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}


// Moved here from the general Components articles (removed 2026-11-09), drawn the same way.
// Sharding, FIG: orders sharded by restaurant_id. At 7 pm the four shards are even. On IND vs PAK night
// one biryani chain takes 30% of all orders, all of them on shard 3, which goes past its capacity
// while the others idle. Splitting the chain's key over eight sub-keys spreads it out again.
function HotShardFig({still,uid=""}){const D="12s",B=250,U=1.2;// 100% load = 120 px
const phases=[[40,45,42,38],[52,48,150,50],[70,66,74,68]],X=[90,220,350,480];
const kt="0;.3;.33;.63;.66;1",h=(i)=>phases.map(p=>p[i]*U);
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`hst${uid}`}><title id={`hst${uid}`}>Four shards of Zotato's orders, split by restaurant ID. At 7 pm each carries about 40% of its capacity. On IND vs PAK night one biryani chain takes 30% of all orders; they all land on shard 3, which runs at 150% of capacity and slows down while the other shards sit near half load. After the chain's orders are spread over eight sub-keys, all four shards run at about 70%.</title>
<line x1="60" y1={B-100*U} x2="600" y2={B-100*U} stroke={RED} strokeDasharray="4 3"/><text x="600" y={B-100*U-6} textAnchor="end" className="fl" style={{fill:RED}}>capacity</text>
<line x1="60" y1={B} x2="600" y2={B} stroke={GREY}/>
{X.map((x,i)=>{const H=h(i),v=[H[0],H[0],H[1],H[1],H[2],H[2]];const shown=still?H[1]:H[0];const hot=i===2;
return <g key={i}><rect x={x} y={B-shown} width="90" height={shown} rx="2" fill={hot&&still?RED:"#9db3ef"}>{!still&&<><animate attributeName="height" values={v.join(";")} keyTimes={kt} dur={D} repeatCount="indefinite"/><animate attributeName="y" values={v.map(q=>B-q).join(";")} keyTimes={kt} dur={D} repeatCount="indefinite"/>{hot&&<animate attributeName="fill" values="#9db3ef;#9db3ef;#c8372d;#c8372d;#9db3ef;#9db3ef" keyTimes={kt} dur={D} repeatCount="indefinite"/>}</>}</rect>
<text x={x+45} y={B+18} textAnchor="middle" className="fb">Shard {i+1}</text>
{(still?[1]:[0,1,2]).map(k=>{const t=<text key={k} x={x+45} y={B-phases[k][i]*U-6} textAnchor="middle" className="fl" style={k===1&&hot?{fill:RED}:undefined}>{phases[k][i]}%</text>;return still?t:<Show key={k} t0={[0,.33,.66][k]} t1={[.3,.63,1][k]} dur={D}>{t}</Show>})}</g>})}
{(still?[1]:[0,1,2]).map(k=>{const t=[["7 pm · orders spread evenly",""],["8 pm, IND vs PAK · one biryani chain = 30% of orders","every one of them on shard 3, which slows down"],["Fix · split the chain over 8 sub-keys","restaurant_id + (order_id % 8)"]][k];const g=<g key={k}><text x="10" y="24" className="fb" style={k===1?{fill:RED}:undefined}>{t[0]}</text><text x="10" y="42" className="fl">{t[1]}</text></g>;return still?g:<Show key={k} t0={[0,.33,.66][k]} t1={[.3,.63,1][k]} dur={D}>{g}</Show>})}</svg>}
// Sharding, FIG: orders split over four shards by hash(customer_id). "My orders" for one customer
// goes to one shard; "a restaurant's orders today" has no customer in it, so every shard is asked
// and the router merges the answers.
function ShardKeyFig({still,uid=""}){const M=`shk${uid}`,D="12s",YS=[60,120,180,240];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`shkt${uid}`}><title id={`shkt${uid}`}>Zotato's orders are split over four database shards by a hash of the customer ID. A request for one customer's orders includes the shard key, so the router sends it to one shard. A request for one restaurant's orders today has no customer ID, so the router asks all four shards and merges the results.</title><Mark m={M}/>
<Box x={0} y={150} w={110} t="Order API"/><Line x1={112} y1={150} x2={166} y2={150} m={M}/>
<Box x={170} y={150} w={150} t="Router" blue/><text x="245" y="186" textAnchor="middle" className="fl">hash(customer_id) % 4</text>
{YS.map((y,i)=><g key={i}><Line x1={322} y1={150} x2={426} y2={y} m={M} c={GREY}/><SBox x={430} y={y} w={200} t={`Shard ${i+1} · hash % 4 = ${i}`}/></g>)}
{still?<text x="10" y="30" className="fl">one key → one shard · no key → every shard</text>:<g aria-hidden="true">
<Show t0={0} t1={.44} dur={D}><text x="10" y="30" className="fb">"My orders" · customer 77</text><text x="10" y="48" className="fl">the key is in the query</text></Show>
<Dot x1={112} x2={166} y={150} t0={.03} t1={.09} dur={D}/><Glow x={170} y={133} w={150} h={34} t0={.09} t1={.15} dur={D}/>
<Dot x1={322} x2={426} y={150} y2={180} t0={.15} t1={.24} dur={D}/><Glow x={430} y={168} w={200} h={24} t0={.24} t1={.36} dur={D}/>
<Show t0={.26} t1={.44} dur={D}><text x="245" y="230" textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>1 shard asked · fast</text></Show>
<Show t0={.5} t1={.96} dur={D}><text x="10" y="30" className="fb">Restaurant 12 · today's orders</text><text x="10" y="48" className="fl">no customer_id in the query</text></Show>
<Dot x1={112} x2={166} y={150} t0={.52} t1={.58} dur={D}/><Glow x={170} y={133} w={150} h={34} t0={.58} t1={.64} dur={D}/>
{YS.map((y,i)=><g key={i}><Dot x1={322} x2={426} y={150} y2={y} t0={.64} t1={.73} dur={D}/><Glow x={430} y={y-12} w={200} h={24} t0={.73} t1={.85} dur={D}/></g>)}
<Show t0={.75} t1={.96} dur={D}><text x="245" y="230" textAnchor="middle" className="fl" style={{fill:RED}}>all 4 asked, answers merged</text></Show></g>}</svg>}

export const FIGS={
"sh-ceiling":{C:CeilingFig,ar:640/246,title:()=>"A BIGGER MACHINE, OR MORE MACHINES"},
"sh-partition":{C:PartitionFig,ar:640/232,title:()=>"ONE TABLE, MONTHLY PARTITIONS"},
"sh-vertical":{C:VerticalFig,ar:640/216,title:()=>"SPLITTING A TABLE BY COLUMNS"},
"sh-shards":{C:ShardsFig,ar:640/230,title:()=>"ONE DATASET, THREE DATABASES"},
"sh-range":{C:RangeFig,ar:640/228,title:()=>"RANGE SHARDING: BANDS OF IDS"},
"sh-hash-mod":{C:HashModFig,ar:640/228,title:()=>"A FIFTH SHARD: WHO MOVES"},
"sh-directory":{C:DirectoryFig,ar:640/218,title:()=>"ASK THE DIRECTORY FIRST"},
"sh-scatter":{C:ScatterFig,ar:640/244,title:()=>"64 SHARDS FOR ONE ANSWER"},
"sh-transfer":{C:TransferFig,ar:640/234,title:()=>"A TRANSFER ACROSS TWO SHARDS"},
"hot-shard":{C:HotShardFig,ar:640/300,title:()=>"ONE HOT KEY ON MATCH NIGHT"},
"shard-key":{C:ShardKeyFig,ar:640/300,title:n=>`${n}'S ORDERS, SPLIT BY CUSTOMER`},
};
