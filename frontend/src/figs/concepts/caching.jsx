// Concepts › Caching: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "caching").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Bx,Ar,Life,Msg,INK,GREY,RED,BLUE,LB,LR,T,Fig,X}from"../parts.jsx";

// Caching in an interview, FIG 1: the same reads with and without a cache.
function WhyFig({still,uid=""}){const M=`cw${uid}`;
const s1=<g><T x={10} y={56} t="without a cache" b/><Bx x={10} y={66} w={120} h={40} t="app servers" s="12,000 reads/s"/><Ar x1={132} y1={86} x2={426} y2={86} m={M} c={RED} w={2}/><T x={280} y={80} t="every read" a="middle" c={RED}/><Bx x={430} y={66} w={200} h={40} t="database" s="30 ms a read · CPU 80%" c={RED} fill={LR}/></g>;
const s2=<g><T x={10} y={146} t="with a cache" b/><Bx x={10} y={156} w={120} h={40} t="app servers" s="12,000 reads/s"/><Ar x1={132} y1={176} x2={216} y2={176} m={M}/><Bx x={220} y={156} w={160} h={40} t="Redis" s="shared, in memory"/></g>;
const s3=<g><Bx x={220} y={156} w={160} h={40} t="Redis" s="90% hits, about 1 ms" c={BLUE} fill={LB}/><T x={300} y={214} t="10,800 a second answered here" a="middle" c={BLUE}/></g>;
const s4=<g><Ar x1={382} y1={176} x2={426} y2={176} m={M} c={BLUE}/><T x={404} y={170} t="10%" a="middle" c={BLUE}/><Bx x={430} y={156} w={200} h={40} t="database" s="1,200 a second · CPU 15%" c={BLUE} fill={LB}/><T x={10} y={240} t="the same traffic: a tenth reaches the database, and most reads wait 1 ms instead of 30" c={BLUE}/></g>;
const caps=[["1 · without a cache, every read goes to the database: 30 ms each, CPU at 80%",RED],["2 · put a shared cache in front of it, and read the cache first",INK],["3 · 9 reads in 10 are answered from memory in about a millisecond",BLUE],["4 · the database sees 1,200 reads a second instead of 12,000",BLUE]];
return <Fig still={still} h={250} id={`cwt${uid}`} M={M} caps={caps} title="The same 12,000 menu reads a second with and without a cache. Without one, every read goes to the database, 30 milliseconds each, with its CPU at 80%. With Redis in front, 90% of reads are answered from memory in about a millisecond, 10,800 a second, and only the 10% that miss, 1,200 a second, reach the database, whose CPU drops to about 15%."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Where to cache, FIG 1: one menu view, layer by layer.
function LayersFig({still,uid=""}){const M=`cy${uid}`;
const L=[["phone","app's own copy","city list, photos","no network"],["CDN edge","in Mumbai","dish photos","20–40 ms"],["app server","in-process","flags, banner","microseconds"],["Redis","shared cache","menus, profiles","about 1 ms"],["database","source of truth","what all missed","5–50 ms"]];
const X0=i=>10+i*128;
const box=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={X0(i)} y={60} w={108} h={46} t={L[i][0]} s={L[i][1]} c={c} fill={fill}/>;
const note=i=><g key={`n${i}`}><T x={X0(i)+54} y={128} t={L[i][2]} a="middle" c={BLUE}/><T x={X0(i)+54} y={144} t={L[i][3]} a="middle" c={BLUE}/></g>;
const base=<g>{L.map((_,i)=>box(i))}{[0,1,2,3].map(i=><Ar key={i} x1={X0(i)+110} y1={83} x2={X0(i)+126} y2={83} m={M}/>)}</g>;
const s1=<g>{box(0,BLUE,LB)}{note(0)}</g>,s2=<g>{box(1,BLUE,LB)}{note(1)}</g>,s3=<g>{box(2,BLUE,LB)}{box(3,BLUE,LB)}{note(2)}{note(3)}</g>;
const s4=<g>{box(4,BLUE,LB)}{note(4)}<Ar x1={300} y1={176} x2={14} y2={176} m={M} c={GREY}/><Ar x1={340} y1={176} x2={626} y2={176} m={M} c={GREY}/><T x={10} y={196} t="closer to the user: faster, harder to change"/><T x={630} y={196} t="closer to the data: easier to keep correct" a="end"/></g>;
const caps=[["1 · the phone answers what it already has, with no network at all",BLUE],["2 · a CDN edge nearby answers for dish photos",BLUE],["3 · on the server: its own memory for a few hot values, then Redis",BLUE],["4 · only what every cache missed reaches the database",BLUE]];
return <Fig still={still} h={206} id={`cyt${uid}`} M={M} caps={caps} title="One menu view, layer by layer. The phone answers from its own copy, such as the city list and photos it already has, with no network. A CDN edge in Mumbai answers for dish photos in 20 to 40 milliseconds. On the server, its own memory holds flags and the banner, in microseconds, and Redis holds menus and profiles, in about a millisecond. Only what every cache missed reaches the database, in 5 to 50 milliseconds. Closer to the user is faster but harder to change; closer to the data is easier to keep correct."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Where to cache, FIG 2: a shared external cache.
function ExternalFig({still,uid=""}){const M=`ce${uid}`;
const sv=(i,s,c=GREY,fill="#fff")=><Bx key={i+c} x={10} y={50+i*60} w={170} h={40} t={`app server ${i+1}`} s={s} c={c} fill={fill}/>;
const ar=i=><Ar key={`a${i}`} x1={182} y1={70+i*60} x2={286} y2={116+i*14} m={M} c={BLUE}/>;
const base=<g>{[0,1,2].map(i=>sv(i,"")) }<Bx x={290} y={100} w={150} h={60} t="Redis" s="shared cache"/><Ar x1={442} y1={130} x2={496} y2={130} m={M}/><T x={469} y={124} t="misses" a="middle"/><Bx x={500} y={105} w={130} h={50} t="database"/></g>;
const s1=<g>{sv(0,"miss: DB, then SET menu:42",BLUE,LB)}{ar(0)}</g>;
const s2=<g>{sv(1,"GET menu:42: a hit",BLUE,LB)}{ar(1)}</g>;
const s3=<g>{sv(2,"a hit as well",BLUE,LB)}{ar(2)}</g>;
const s4=<g><Bx x={290} y={100} w={150} h={60} t="Redis" s="menu:42, for everyone" c={BLUE} fill={LB}/><T x={365} y={186} t="one copy for every server;" a="middle" c={BLUE}/><T x={365} y={200} t="LRU and a TTL keep it bounded" a="middle" c={BLUE}/></g>;
const caps=[["1 · server 1 misses, reads the database once and stores menu:42 in Redis",BLUE],["2 · server 2 asks for the same menu: a hit, with no database query",BLUE],["3 · so does server 3: every app server shares the one cache",BLUE],["4 · eviction and a TTL keep the cache's memory in bounds",BLUE]];
return <Fig still={still} h={228} id={`cet${uid}`} M={M} caps={caps} title="A shared external cache. Three app servers talk to one Redis, which sits in front of the database. Server 1 misses on menu 42, reads the database once and stores the menu in Redis. Server 2 then asks for the same menu and gets a hit, with no database query, and so does server 3. One copy serves every server, and LRU eviction and a TTL keep the cache's memory in bounds."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Where to cache, FIG 3: caches on the device and in a client library.
function ClientFig({still,uid=""}){const M=`cc${uid}`;
const item=(y,t,c=GREY,fill="#fff")=><Bx key={y+c} x={30} y={y} w={110} h={22} t={t} c={c} fill={fill}/>;
const nd=(i,s,c=GREY,fill="#fff")=><Bx key={i+c+s} x={500} y={50+i*60} w={130} h={40} t={`node ${"ABC"[i]}`} s={s} c={c} fill={fill}/>;
const base=<g><rect x={20} y={48} width={130} height={170} rx={14} fill="#fff" stroke={GREY}/><T x={85} y={68} t="the phone" a="middle" b/>{item(80,"dish photos")}{item(108,"city list")}{item(136,"yesterday's order")}
<rect x={230} y={50} width={200} height={160} fill="#fff" stroke={GREY}/><T x={240} y={68} t="app server · Redis client" b/>{[0,1,2].map(i=>nd(i,["slots 0–5460","5461–10922","10923–16383"][i]))}</g>;
const s1=<g>{item(80,"dish photos",BLUE,LB)}{item(108,"city list",BLUE,LB)}<T x={20} y={236} t="opening the menu again: no download" c={BLUE}/></g>;
const s2=<g><T x={20} y={252} t="but the server can't change these copies" c={RED}/></g>;
const s3=<g>{["slots 0–5460 → node A","5461–10922 → node B","10923–16383 → node C"].map((t,i)=><T key={i} x={240} y={92+i*16} t={t}/>)}<T x={240} y={152} t="GET menu:42 → slot 7138" b c={BLUE}/><Ar x1={432} y1={140} x2={496} y2={130} m={M} c={BLUE}/></g>;
const s4=<g>{nd(1,"MOVED: now on C",RED,LR)}<T x={240} y={176} t="refresh the map, retry on C" c={BLUE}/><Ar x1={432} y1={172} x2={496} y2={190} m={M} c={BLUE}/></g>;
const caps=[["1 · the app keeps dish photos and the city list on the phone: no download next time",BLUE],["2 · but the server can't reach in and change those copies",RED],["3 · a Redis client keeps the slot map, so each command goes straight to its node",BLUE],["4 · if slots move, the node answers MOVED and the client refreshes its map",BLUE]];
return <Fig still={still} h={262} id={`cct${uid}`} M={M} caps={caps} title="Two client-side caches. On the phone, the app keeps dish photos and the city list, so opening the menu again needs no download, but the server can't change those copies. In the app server, the Redis Cluster client keeps a map of which node owns which slots, so GET menu:42 goes straight to the node that owns slot 7138. If that slot has moved, the node answers MOVED, and the client refreshes its map and retries on the new node."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Where to cache, FIG 4: in-process caches, one per server.
function InProcessFig({still,uid=""}){
const sx=i=>10+i*210;
const banner=(i,t,c=GREY,fill="#fff")=><Bx key={i+t+c} x={sx(i)+20} y={130} w={160} h={22} t={t} c={c} fill={fill}/>;
const base=<g>{[0,1,2].map(i=><g key={i}><rect x={sx(i)} y={48} width={200} height={124} fill="#fff" stroke={GREY}/><T x={sx(i)+10} y={66} t={`app server ${i+1}`} b/><rect x={sx(i)+12} y={76} width={176} height={86} fill="#fbfcfd" stroke={GREY} strokeDasharray="3 3"/><T x={sx(i)+20} y={94} t="in its own memory:"/><T x={sx(i)+20} y={114} t="flags · cities · fees"/>{banner(i,"banner: v1")}</g>)}</g>;
const s1=<g>{[0,1,2].map(i=><rect key={i} x={sx(i)+12} y={76} width={176} height={86} fill="none" stroke={BLUE}/>)}<T x={10} y={196} t="reads: microseconds, no network" c={BLUE}/></g>;
const s2=<g>{banner(0,"banner: v2",BLUE,LB)}<T x={10} y={214} t="server 1 picks up the new banner" c={BLUE}/></g>;
const s3=<g>{banner(1,"banner: v1 (old)",RED,LR)}{banner(2,"banner: v1 (old)",RED,LR)}<T x={330} y={214} t="servers 2 and 3 don't know" c={RED}/></g>;
const s4=<g>{banner(1,"banner: v2",BLUE,LB)}{banner(2,"banner: v2",BLUE,LB)}<T x={10} y={232} t="a 30-second TTL: within half a minute, every server has v2" c={BLUE}/></g>;
const caps=[["1 · each server keeps small, hot values in its own memory: reads need no network",BLUE],["2 · the banner changes, and server 1 picks up the new version",BLUE],["3 · servers 2 and 3 still serve the old one: nothing is shared between them",RED],["4 · a short TTL bounds the gap: within 30 seconds every server has v2",BLUE]];
return <Fig still={still} h={242} id={`cit${uid}`} caps={caps} title="In-process caches. Each of three app servers keeps small, hot values, such as flags, the city list, delivery fees and the home banner, in its own memory, so reads need no network. When the banner changes to version 2, server 1 picks it up, but servers 2 and 3 keep serving version 1, because nothing is shared between them. A 30-second TTL bounds the gap: within half a minute every server has version 2."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache patterns: write-through.
function WriteThroughFig({still,uid=""}){const M=`ct${uid}`;
const base=<g><Life x={80} t="app server" y1={226}/><Life x={320} t="cache" s="write-through" y1={226}/><Life x={560} t="database" y1={226}/></g>;
const s1=<Msg x1={80} x2={320} y={94} t="SET restaurant 42: closed" m={M}/>;
const s2=<g><Msg x1={320} x2={560} y={118} t="UPDATE restaurants …" m={M}/><Msg x1={560} x2={320} y={138} t="ok" m={M}/></g>;
const s3=<g><Msg x1={320} x2={80} y={162} t="done" m={M} c={BLUE}/><T x={332} y={166} t="the write waited for both"/></g>;
const s4=<g><Msg x1={80} x2={320} y={192} t="GET restaurant 42" m={M}/><Msg x1={320} x2={80} y={212} t="closed: always current" m={M} c={BLUE}/></g>;
const caps=[["1 · the app writes to the cache: restaurant 42 is now closed",INK],["2 · the cache writes the database before it answers",INK],["3 · only then is the write done: slower, because it waits for both",BLUE],["4 · every read from the cache sees the latest value",BLUE]];
return <Fig still={still} h={232} id={`ctt${uid}`} M={M} caps={caps} title="Write-through caching. The app server writes to the cache that restaurant 42 is now closed. The cache writes the change to the database and waits for its answer before replying, so the write is done only when both hold it, which makes writes slower. Every read from the cache then sees the latest value."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache patterns: write-behind.
function WriteBehindFig({still,uid=""}){const M=`cb${uid}`;
const base=<g><Life x={80} t="app server" y1={226}/><Life x={320} t="cache" s="write-behind" y1={226}/><Life x={560} t="database" y1={226}/></g>;
const s1=<g>{[0,1,2].map(i=><Msg key={i} x1={80} x2={320} y={90+i*16} t={i===0?"dish 9 viewed, +1":undefined} m={M} c={BLUE}/>)}</g>;
const s2=<g><T x={332} y={110} t="holding: views +3" c={INK}/></g>;
const s3=<g><Msg x1={320} x2={560} y={152} t="UPDATE views +3, one batch" tx={440} m={M} c={BLUE}/></g>;
const s4=<g><Msg x1={80} x2={320} y={180} t="dish 9 viewed, +1" m={M}/><Msg x1={80} x2={320} y={196} m={M}/><X x={320} y={212}/><T x={332} y={216} t="crash before the flush: 2 views lost" c={RED}/></g>;
const caps=[["1 · each write lands in the cache and is answered at once",BLUE],["2 · the cache holds the writes for a moment",INK],["3 · then writes them to the database in one batch",BLUE],["4 · if the cache crashes before the next flush, the writes it held are lost",RED]];
return <Fig still={still} h={232} id={`cbt${uid}`} M={M} caps={caps} title="Write-behind caching. Three views of dish 9 are written to the cache and each is answered at once. The cache holds them, then writes one batch, views plus three, to the database. Two more views arrive, and the cache crashes before its next flush, so those two writes are lost."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache patterns: read-through.
function ReadThroughFig({still,uid=""}){const M=`cr${uid}`;
const base=<g><Life x={80} t="app" y1={222}/><Life x={320} t="cache" s="e.g. a CDN edge" y1={222}/><Life x={560} t="database" s="or the origin" y1={222}/></g>;
const s1=<Msg x1={80} x2={320} y={94} t="GET dish-9.jpg" m={M}/>;
const s2=<g><Msg x1={320} x2={560} y={118} t="miss: the cache fetches it" tx={440} m={M}/><Msg x1={560} x2={320} y={138} t="dish-9.jpg" tx={440} m={M}/></g>;
const s3=<g><T x={332} y={156} t="keeps a copy" c={BLUE}/><Msg x1={320} x2={80} y={164} t="dish-9.jpg" m={M}/></g>;
const s4=<g><Msg x1={80} x2={320} y={190} t="GET dish-9.jpg" m={M}/><Msg x1={320} x2={80} y={208} t="hit" m={M} c={BLUE}/></g>;
const caps=[["1 · the app asks only the cache, never the database",INK],["2 · on a miss, the cache loads from the database or origin itself",INK],["3 · it keeps a copy and answers",BLUE],["4 · the next read is a hit: a CDN works exactly this way",BLUE]];
return <Fig still={still} h={228} id={`crt${uid}`} M={M} caps={caps} title="Read-through caching. The app asks only the cache, for example a CDN edge, for dish-9.jpg. On a miss, the cache itself fetches the file from the origin or database, keeps a copy and answers. The next request is a hit. The app never calls the database or origin for these reads."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Eviction, FIG 1: which menu each policy removes.
function EvictFig({still,uid=""}){
const R=[["menu A","19:00","50","20:10"],["menu B","19:20","20","19:40"],["menu C","19:30","2","20:09"],["menu D","19:50","9","20:05"]];
const CX=[10,110,190,260],CW=[100,80,70,80];
const cell=(r,k,c=GREY,fill="#fff")=><Bx key={`${r}${k}${c}`} x={CX[k]} y={70+r*26} w={CW[k]} h={26} t={R[r][k]} c={c} fill={fill}/>;
const base=<g>{["in the cache","stored","reads","last read"].map((t,k)=><T key={k} x={CX[k]+6} y={62} t={t}/>)}{R.map((_,r)=>[0,1,2,3].map(k=>cell(r,k)))}</g>;
const res=(y,t,s)=><Bx x={380} y={y} w={250} h={40} t={t} s={s} c={RED} fill={LR}/>;
const s1=<g><Bx x={10} y={188} w={160} h={30} t="menu E arrives" c={BLUE} fill={LB}/><T x={180} y={207} t="the cache is full: one has to go"/></g>;
const s2=<g>{cell(1,3,RED,LR)}{cell(1,0,RED,LR)}{res(60,"LRU removes menu B","unused since 19:40")}</g>;
const s3=<g>{cell(2,2,RED,LR)}{cell(2,0,RED,LR)}{res(110,"LFU removes menu C","read only twice")}</g>;
const s4=<g>{cell(0,1,RED,LR)}{cell(0,0,RED,LR)}{res(160,"FIFO removes menu A","stored first, though the busiest")}</g>;
const caps=[["1 · four menus fill the cache, and menu E arrives: one has to go",INK],["2 · LRU removes the one unused for longest: menu B, last read at 19:40",RED],["3 · LFU removes the one read least: menu C, read only twice",RED],["4 · FIFO removes the one stored first: menu A, the busiest of all",RED]];
return <Fig still={still} h={228} id={`cvt${uid}`} caps={caps} title="Which entry each eviction policy removes. A cache holds four menus: A, stored at 19:00, read 50 times, last at 20:10; B, stored 19:20, read 20 times, last at 19:40; C, stored 19:30, read twice, last at 20:09; D, stored 19:50, read 9 times, last at 20:05. Menu E arrives and the cache is full. LRU removes menu B, unused for longest. LFU removes menu C, read least. FIFO removes menu A, stored first, even though it is the busiest."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Eviction, FIG 2: expiry and eviction do different jobs.
function TtlFig({still,uid=""}){
const x=m=>120+m*16;
const base=<g><line x1={x(0)} y1={186} x2={x(30)} y2={186} stroke={GREY}/>{[0,5,10,15,20,25,30].map(m=><g key={m}><line x1={x(m)} y1={182} x2={x(m)} y2={190} stroke={GREY}/><T x={x(m)} y={204} t={`20:${String(m).padStart(2,"0")}`} a="middle"/></g>)}</g>;
const s1=<g><T x={10} y={80} t="menu:42" b/><T x={10} y={94} t="TTL 10 min"/><Bx x={x(0)} y={64} w={160} h={30} t="cached: ₹240"/></g>;
const s2=<g><line x1={x(10)} y1={56} x2={x(10)} y2={100} stroke={BLUE} strokeWidth="2"/><Bx x={x(10)} y={64} w={160} h={30} t="re-read: ₹260" c={BLUE} fill={LB}/><T x={x(10)+6} y={112} t="expired at 20:10, however busy" c={BLUE}/></g>;
const s3=<g><T x={10} y={146} t="memory" b/><T x={10} y={160} t="(LRU)"/><Bx x={x(0)} y={130} w={x(17)-x(0)} h={30} t="filling with menus"/><line x1={x(17)} y1={124} x2={x(17)} y2={166} stroke={RED} strokeWidth="2"/><T x={x(17)} y={178} t="full at 20:17" a="middle" c={RED}/></g>;
const s4=<g><Bx x={x(17)+6} y={130} w={x(30)-x(17)-6} h={30} t="menu:7 evicted" s="unused since 20:02" c={RED} fill={LR}/></g>;
const caps=[["1 · menu:42 is cached at 20:00 with a 10-minute TTL",INK],["2 · at 20:10 it expires however busy it is, and the next read fetches the new price",BLUE],["3 · meanwhile the cache fills up; at 20:17 there is no room left",RED],["4 · LRU makes room by removing the key unused for longest, whatever its TTL",RED]];
return <Fig still={still} h={212} id={`cxt${uid}`} caps={caps} title="Expiry and eviction do different jobs. Menu 42 is cached at 20:00 with a 10-minute TTL, showing a price of 240 rupees. At 20:10 it expires however busy it is, and the next read fetches the new price, 260 rupees. Meanwhile the cache fills with menus, and at 20:17 there is no room left, so LRU removes menu 7, unused since 20:02, whatever its TTL."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache problems, FIG 1: a stampede, and request coalescing.
function StampedeFig({still,uid=""}){const M=`cs${uid}`;
const base=<g><T x={10} y={50} t="without coalescing" b/><T x={350} y={50} t="with coalescing" b/></g>;
const s1=<g><Bx x={120} y={60} w={160} h={40} t="popular:kothrud" s="expired at 20:01:00" c={RED} fill={LR}/><Bx x={10} y={122} w={90} h={40} t="800 requests" s="that second"/><Ar x1={102} y1={130} x2={150} y2={102} m={M}/><T x={10} y={116} t="miss"/></g>;
const s2=<g>{[0,1,2,3,4,5].map(i=><Ar key={i} x1={102} y1={150} x2={132+i*26} y2={182} m={M} c={RED}/>)}<Bx x={120} y={184} w={160} h={40} t="database" s="800 × the 200 ms query" c={RED} fill={LR}/></g>;
const s3=<g><Bx x={460} y={60} w={170} h={40} t="popular:kothrud" s="lock held: rebuilding"/><Bx x={350} y={122} w={90} h={40} t="800 requests" s="that second"/><Ar x1={442} y1={152} x2={500} y2={182} m={M} c={BLUE} w={2}/><T x={350} y={180} t="1 rebuilds" c={BLUE}/><Bx x={460} y={184} w={170} h={40} t="database" s="1 query" c={BLUE} fill={LB}/></g>;
const s4=<g><Bx x={460} y={60} w={170} h={40} t="popular:kothrud" s="rebuilt: 799 read it" c={BLUE} fill={LB}/><Ar x1={442} y1={132} x2={500} y2={102} m={M} c={BLUE} dash/><T x={350} y={102} t="799 wait, then hit" c={BLUE}/></g>;
const caps=[["1 · at 20:01:00 the list for a busy area expires, at the dinner peak",INK],["2 · every request that second misses and runs the same 200 ms query",RED],["3 · with coalescing, the first request takes a lock and rebuilds the list",BLUE],["4 · the others wait a moment and read the rebuilt copy: one query, not 800",BLUE]];
return <Fig still={still} h={232} id={`cst${uid}`} M={M} caps={caps} title="A cache stampede and request coalescing. At 20:01:00, at the dinner peak, the popular-near-you list for Kothrud expires. Without coalescing, all 800 requests that second miss and each runs the same 200 millisecond query against the database. With coalescing, the first request takes a lock and rebuilds the list with one query, while the other 799 wait a moment and then read the rebuilt copy."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache problems, FIG 2: a stale read after a price change.
function StaleFig({still,uid=""}){const M=`cl${uid}`;
const base=<g><Life x={80} t="app servers" y1={212}/><Life x={320} t="Redis" s="menu:42" y1={212}/><Life x={560} t="database" y1={212}/></g>;
const s1=<Msg x1={80} x2={560} y={94} t="UPDATE biryani price = ₹260" tx={440} m={M}/>;
const s2=<g><Msg x1={80} x2={320} y={120} t="GET menu:42" m={M}/><Msg x1={320} x2={80} y={138} t="biryani ₹240 (stale)" m={M} c={RED}/></g>;
const s3=<Msg x1={80} x2={320} y={164} t="DELETE menu:42" m={M} c={BLUE}/>;
const s4=<g><Msg x1={80} x2={320} y={190} t="GET menu:42: miss" m={M}/><T x={332} y={194} t="refilled from the database: ₹260" c={BLUE}/></g>;
const caps=[["1 · the owner raises the biryani from ₹240 to ₹260: the database changes first",INK],["2 · the cache still holds ₹240, and readers see the old price",RED],["3 · deleting menu:42 right after the write closes that window",BLUE],["4 · the next read misses and refills the cache with ₹260",BLUE]];
return <Fig still={still} h={218} id={`clt${uid}`} M={M} caps={caps} title="A stale read after a price change. The owner raises the biryani from 240 to 260 rupees, and the database is updated first. Redis still holds the menu with 240 rupees, so readers see the old price. Deleting menu 42 right after the write closes that window: the next read misses and refills the cache from the database with 260 rupees."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Cache problems, FIG 3: a hot key, replicated and copied locally.
function HotKeyFig({still,uid=""}){const M=`ch${uid}`;
const sv=(i,s,c=GREY,fill="#fff")=><Bx key={i+c+s} x={10} y={50+i*60} w={170} h={44} t={`app server ${i+1}`} s={s} c={c} fill={fill}/>;
const nd=(i,s,c=GREY,fill="#fff")=><Bx key={i+c+s} x={440} y={50+i*60} w={190} h={44} t={`Redis node ${i+1}`} s={s} c={c} fill={fill}/>;
const base=<g>{[0,1,2].map(i=>sv(i,""))}{[0,1,2].map(i=>nd(i,""))}</g>;
const hot=<g>{[0,1,2].map(i=><Ar key={i} x1={182} y1={72+i*60} x2={436} y2={132} m={M} c={RED} w={3}/>)}{nd(1,"promo:final-night · 4 lakh/s",RED,LR)}</g>;
const s2=<g>{hot}{nd(0,"other keys · 2,000/s")}{nd(2,"other keys · 2,000/s")}</g>;
const s3=<g>{[0,1,2].map(i=><g key={i}><Ar x1={182} y1={72+i*60} x2={436} y2={72+i*60} m={M} c={BLUE} w={2}/>{nd(i,`copy ${i+1} of 3 · 1.3 lakh/s`,BLUE,LB)}</g>)}</g>;
const s4=<g>{[0,1,2].map(i=>sv(i,"local copy, kept 5 s",BLUE,LB))}<T x={10} y={248} t="most reads stop inside the server; Redis sees a few a second for this key" c={BLUE}/></g>;
const caps=[["1 · every server reads promo:final-night, and the key lives on one node",RED],["2 · that node takes 4 lakh reads a second while the others sit almost idle",RED],["3 · copies of the key on every node spread the reads three ways",BLUE],["4 · a 5-second copy in each server's memory keeps most reads off Redis",BLUE]];
return <Fig still={still} h={258} id={`cht${uid}`} M={M} caps={caps} only={[0,1]} title="A hot key. During a cricket final every app server reads promo:final-night, and the key lives on one Redis node, which takes 4 lakh reads a second while the other nodes handle about 2,000. Copying the key to all three nodes spreads the reads to about 1.3 lakh a second each. Keeping a 5-second copy in each app server's own memory stops most reads inside the server, so Redis sees only a few reads a second for the key."
base={base} g={[hot,s2,s3,s4]} last={<g>{s3}{s4}</g>}/>}

export const FIGS={
"ca-why":{C:WhyFig,ar:640/250,title:()=>"THE SAME READS, WITH AND WITHOUT A CACHE"},
"ca-layers":{C:LayersFig,ar:640/206,title:()=>"ONE MENU VIEW, LAYER BY LAYER"},
"ca-external":{C:ExternalFig,ar:640/228,title:()=>"ONE CACHE FOR EVERY SERVER"},
"ca-client":{C:ClientFig,ar:640/262,title:()=>"CACHES ON THE PHONE AND IN THE CLIENT"},
"ca-in-process":{C:InProcessFig,ar:640/242,title:()=>"A CACHE INSIDE EACH SERVER"},
"ca-write-through":{C:WriteThroughFig,ar:640/232,title:()=>"WRITE-THROUGH: BOTH, BEFORE IT ANSWERS"},
"ca-write-behind":{C:WriteBehindFig,ar:640/232,title:()=>"WRITE-BEHIND: FAST, UNTIL IT CRASHES"},
"ca-read-through":{C:ReadThroughFig,ar:640/228,title:()=>"READ-THROUGH: THE CACHE FETCHES FOR YOU"},
"ca-evict":{C:EvictFig,ar:640/228,title:()=>"WHICH MENU GOES? LRU, LFU, FIFO"},
"ca-ttl":{C:TtlFig,ar:640/212,title:()=>"EXPIRY AND EVICTION, SIDE BY SIDE"},
"ca-stampede":{C:StampedeFig,ar:640/232,title:()=>"800 MISSES, OR ONE"},
"ca-stale":{C:StaleFig,ar:640/218,title:()=>"THE OLD PRICE, STILL IN THE CACHE"},
"ca-hot-key":{C:HotKeyFig,ar:640/258,title:()=>"ONE KEY, ONE NODE, LAKHS OF READS"},
};
