// Components › Tools by name: the figures this sub-tab's articles draw (site.json dashboard.groups.components, "tools").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
// The tools: Redis, Elasticsearch, Kafka, Temporal, gateways, Cassandra, DynamoDB, PostgreSQL, Flink, ZooKeeper.
import{BG,GRID,LINE,LINE_SOFT,SURFACE}from"../../theme/palette.js";import React from"react";import{Glow,Show,Mk,Bx,Ar,Cap,Life,Msg,INK,GREY,RED,BLUE,LB,LR,FB,T,Steps,Mark,Line,Box,Dot,SBox,pace}from"../parts.jsx";

// Redis, FIG 1: five data types, each with one command and the Zotato job it does.
function RedisTypesFig({still,uid=""}){
const R=[["String","SET menu:42 '{…}' EX 300","a restaurant's menu, gone after 5 minutes"],["Hash","HINCRBY cart:77 dish:9 1","a cart, one field per dish"],["Sorted set","ZINCRBY top:pune 1 r42","restaurants ranked by today's orders"],["Stream","XADD rider:9 * lat 18.52 lng 73.85","a rider's recent locations, many readers"],["Counter","INCR otp:98201; EXPIRE otp:98201 3600","OTP requests per phone in the last hour"]];
const caps=[["1 · strings and hashes: a cached menu with an expiry, and a cart kept field by field",INK],["2 · a sorted set keeps a live ranking: add to a score, read the top 10 in order",BLUE],["3 · a stream is an append-only log that several consumers can read",BLUE],["4 · a counter with an expiry is a rate limit in two commands",BLUE]];
const row=(i,hi)=>{const y=48+i*42;return <g key={i}><Bx x={10} y={y} w={110} h={30} t={R[i][0]} c={hi?BLUE:GREY} fill={hi?LB:BG}/><T x={135} y={y+19} t={R[i][1]} c={hi?BLUE:undefined}/><T x={392} y={y+19} t={R[i][2]}/></g>};
const base=<g>{R.map((r,i)=>row(i))}</g>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`rtt${uid}`}><title id={`rtt${uid}`}>Five Redis data types and one job each at Zotato. A string holds a restaurant's menu with a 5-minute expiry. A hash holds a cart, one field per dish. A sorted set ranks restaurants by today's orders. A stream keeps a rider's recent locations for several services to read. A counter with an expiry limits OTP requests per phone per hour.</title>
{base}{still?<g>{[0,1,2,3,4].map(i=>row(i,true))}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[0,1,2,3]} g={[<g>{row(0,1)}{row(1,1)}</g>,row(2,1),row(3,1),row(4,1)]}/>}</svg>}

// Redis, FIG 2: Redis Cluster. Keys map to 16,384 slots (CRC16 mod 16384); three primaries own a third each,
// each with a replica; B fails and its replica is promoted; a slot moves and the client gets MOVED.
function RedisSlotsFig({still,uid=""}){const M=`rs${uid}`;
const N=[["A","0–5,460",54],["B","5,461–10,922",124],["C","10,923–16,383",194]];
const caps=[["1 · every key belongs to one of 16,384 slots: CRC16 of the key, mod 16,384",INK],["2 · each primary owns a range of slots; the client keeps the map and goes straight to B",BLUE],["3 · B fails: after the node timeout its replica is promoted and serves B's slots",RED],["4 · when a slot moves to a new node, the old owner answers MOVED and the client updates its map",BLUE]];
const base=<g><Bx x={10} y={110} w={130} h={44} t="Order API" s="key cart:77"/><T x={10} y={186} t="slot = CRC16(key) mod 16384"/><T x={10} y={202} t="cart:77 → say slot 9,201" c={BLUE}/>
{N.map(([n,s,y])=><g key={n}><Bx x={300} y={y} w={150} h={44} t={`Primary ${n}`} s={`slots ${s}`}/><Bx x={490} y={y} w={140} h={44} t={`Replica of ${n}`} s="copies everything"/><line x1={452} y1={y+22} x2={488} y2={y+22} stroke={GREY} strokeDasharray="3 3"/></g>)}</g>;
const s2=<g><Ar x1={142} y1={132} x2={296} y2={146} m={M} c={BLUE}/><Bx x={300} y={124} w={150} h={44} t="Primary B" s="slots 5,461–10,922" c={BLUE} fill={LB}/></g>;
const s3=<g><Bx x={300} y={124} w={150} h={44} t="B: down" s="no answer" c={RED} fill={LR}/><Bx x={490} y={124} w={140} h={44} t="Now primary" s="serves B's slots" c={BLUE} fill={LB}/></g>;
const s4=<g><Ar x1={298} y1={160} x2={144} y2={146} m={M} dash/><T x={160} y={236} t="MOVED 9201 → new node" c={BLUE}/></g>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`rst${uid}`}><title id={`rst${uid}`}>Redis Cluster. Every key belongs to one of 16,384 slots, computed as CRC16 of the key modulo 16,384. Three primaries own the slots in thirds, 0 to 5,460, 5,461 to 10,922 and 10,923 to 16,383, and each has a replica. The client keeps the slot map and sends cart:77, say slot 9,201, straight to primary B. When B fails, after the node timeout its replica is promoted and serves B's slots. When a slot moves to a new node, the old owner answers MOVED and the client updates its map.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[1,2]} g={[null,s2,s3,s4]}/>}</svg>}

// Elasticsearch, FIG 1: an inverted index over four dish names; "paneer tikka" reads two short lists;
// two-word matches score highest, and among one-word matches the shorter name scores a little higher.
function EsInvertedFig({still,uid=""}){
const Dd=[["d1","Paneer tikka masala"],["d2","Chicken tikka"],["d3","Paneer butter masala"],["d4","Masala dosa"]];
const I=[["paneer","d1, d3"],["tikka","d1, d2"],["masala","d1, d3, d4"],["butter","d3"],["chicken","d2"],["dosa","d4"]];
const caps=[["1 · each dish name is split into lowercase words, called tokens, when it is indexed",INK],["2 · the index maps every word to the dishes that contain it, like the index of a book",INK],["3 · \"paneer tikka\" reads two short lists instead of every dish",BLUE],["4 · both words beat one; among one-word matches, the shorter name scores a little higher",BLUE]];
const base=<g><T x={10} y={46} t="DISHES" b/>{Dd.map(([d,n],i)=><g key={d}><T x={10} y={74+i*30} t={d}/><T x={40} y={74+i*30} t={n} b/></g>)}</g>;
const idx=hi=><g><T x={230} y={46} t="INDEX" b/>{I.map(([w,l],i)=><g key={w}><rect x={230} y={58+i*28} width={180} height={22} fill={hi&&i<2?FB:BG} stroke={hi&&i<2?BLUE:GREY}/><T x={240} y={73+i*28} t={w} c={hi&&i<2?BLUE:undefined}/><T x={320} y={73+i*28} t={l}/></g>)}</g>;
const res=<g><T x={440} y={46} t="paneer tikka" b c={BLUE}/>{["1  Paneer tikka masala","2  Chicken tikka","3  Paneer butter masala"].map((t,i)=><T key={t} x={440} y={80+i*24} t={t} c={i?undefined:BLUE}/>)}<T x={440} y={170} t="d1 has both words;"/><T x={440} y={184} t="d2 is the shorter of"/><T x={440} y={198} t="the one-word matches"/></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`eit${uid}`}><title id={`eit${uid}`}>An inverted index over four dish names: paneer tikka masala, chicken tikka, paneer butter masala and masala dosa. Each name is split into lowercase words, and the index maps each word to the dishes that contain it: paneer to d1 and d3, tikka to d1 and d2, masala to d1, d3 and d4, and so on. A search for paneer tikka reads just two lists. Paneer tikka masala, with both words, ranks first; chicken tikka ranks above paneer butter masala because it is shorter.</title>
{base}{still?<g>{idx(1)}{res}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[1]} g={[null,idx(0),idx(1),res]}/>}</svg>}

// Elasticsearch, FIG 2: the index is a copy. Changes flow from the database through a change stream and an
// indexer; searchable after the ~1 s refresh. A new mapping is built as dishes_v3, then the alias moves.
function EsSyncFig({still,uid=""}){const M=`es${uid}`;
const caps=[["1 · the database stays the source of truth; every change is published as an event",INK],["2 · an indexer writes the change; it becomes searchable after the refresh, about a second",BLUE],["3 · to change the mapping, build dishes_v3 from the database next to the live index",INK],["4 · then move the alias: searches switch at once, and v2 can be deleted",BLUE]];
const base=<g><Bx x={10} y={80} w={110} h={44} t="Menu DB" s="source of truth"/><Ar x1={122} y1={102} x2={146} y2={102} m={M}/><Bx x={150} y={80} w={110} h={44} t="Change stream" s="Kafka topic"/><Ar x1={262} y1={102} x2={286} y2={102} m={M}/><Bx x={290} y={80} w={100} h={44} t="Indexer"/>
<Ar x1={392} y1={102} x2={426} y2={86} m={M}/><Bx x={430} y={60} w={110} h={44} t="dishes_v2" s="live index"/><Bx x={560} y={60} w={70} h={44} t="Search"/></g>;
const alias=(y,c)=><g><Ar x1={558} y1={82} x2={544} y2={y+22} m={M} c={c}/><T x={548} y={y<100?124:212} t="alias" c={c}/></g>;
const s1=<T x={10} y={66} t="price of dish 9 changed: one event"/>,s2=<g><T x={290} y={150} t="refresh: ~1 s later, findable" c={BLUE}/>{alias(60,INK)}</g>;
const s3=<g><Ar x1={65} y1={126} x2={428} y2={186} m={M} dash/><T x={150} y={214} t="bulk build from the database"/><Bx x={430} y={168} w={110} h={44} t="dishes_v3" s="new mapping"/></g>;
const s4=<g><Bx x={430} y={168} w={110} h={44} t="dishes_v3" s="now live" c={BLUE} fill={LB}/><Ar x1={590} y1={106} x2={544} y2={180} m={M} c={BLUE}/><T x={578} y={150} t="alias" c={BLUE}/></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`est${uid}`}><title id={`est${uid}`}>Keeping a search index in step with the database. The menu database is the source of truth, and each change is published to a change stream. An indexer writes it into the live index, dishes_v2, where it becomes searchable after the refresh, about a second later. To change the mapping, a new index, dishes_v3, is built in bulk from the database alongside the live one. Then the search alias is moved to v3, so searches switch at once, and v2 can be deleted.</title><Mk m={M}/>
{base}{still?<g>{s1}{s3}{s4}<T x={290} y={150} t="refresh: ~1 s later, findable" c={BLUE}/><Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[0,1]} g={[s1,s2,s3,<g>{s3}{s4}</g>]}/>}</svg>}

// Kafka, FIG 1: a consumer group over six partitions: two consumers (3 each), a third joins (2 each),
// one dies (back to 3 each after its session times out).
function KafkaGroupFig({still,uid=""}){
const P=[0,1,2,3,4,5],py=i=>50+i*32,C=["C1","C2","C3"],cy=[70,134,198];
const caps=[["1 · the orders topic has 6 partitions; in a group, each is read by exactly one consumer",INK],["2 · two consumers: three partitions each, and every event is read once by the group",BLUE],["3 · a third consumer joins: the group rebalances to two partitions each",BLUE],["4 · C2 dies: once its session times out, its partitions move to C1 and C3",RED]];
const parts=<g>{P.map(i=><g key={i}><rect x={20} y={py(i)} width={120} height={24} fill={BG} stroke={GREY}/><T x={30} y={py(i)+16} t={`orders · P${i}`}/></g>)}</g>;
const cons=(on,dead)=><g>{C.map((c,i)=>on.includes(i)&&<Bx key={c} x={450} y={cy[i]-20} w={120} h={40} t={c} s={dead===i?"gone":"consumer"} c={dead===i?RED:BLUE} fill={dead===i?LR:LB}/>)}</g>;
const links=a=><g>{a.map((c,i)=><line key={i} x1={142} y1={py(i)+12} x2={448} y2={cy[c]} stroke={BLUE}/>)}</g>;
const st=[[[0,0,0,1,1,1],[0,1]],[[0,0,1,1,2,2],[0,1,2]],[[0,0,0,2,2,2],[0,2]]];
const s=(k,dead)=><g>{links(st[k][0])}{cons(st[k][1].concat(dead!==undefined?[dead]:[]),dead)}</g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`kgt${uid}`}><title id={`kgt${uid}`}>A Kafka consumer group reading the six partitions of the orders topic. With two consumers, each reads three partitions, so every event is read once by the group. When a third consumer joins, the group rebalances to two partitions each. When consumer C2 dies, once its session times out its partitions move to C1 and C3, which read three each again.</title>
{parts}{still?<g>{s(2,1)}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} only={[0,1,2,3]} g={[s(0),s(0),s(1),s(2,1)]}/>}</svg>}

// Kafka, FIG 2: acks=all with min.insync.replicas=2. Partition 3 on brokers 1 (leader), 2 and 3. Broker 3 lags
// and leaves the in-sync set: writes go on with two copies. If broker 2 drops too, writes are refused.
function KafkaIsrFig({still,uid=""}){const M=`ki${uid}`,X={p:60,b1:240,b2:400,b3:560};
const caps=[["1 · partition 3 is copied on three brokers; broker 1 leads and takes every write",INK],["2 · with acks=all, the producer hears OK only once every in-sync copy has the write",BLUE],["3 · broker 3 falls behind and leaves the in-sync set: writes go on with two copies",INK],["4 · if broker 2 drops out too, one copy is below min.insync.replicas = 2: writes are refused",RED]];
const lanes=<g><Life x={X.p} t="Producer" s="acks=all" y1={240}/><Life x={X.b1} t="Broker 1" s="leader" y1={240}/><Life x={X.b2} t="Broker 2" s="in sync" y1={240}/><Life x={X.b3} t="Broker 3" s="in sync" y1={240}/></g>;
const m=[<Msg key={1} x1={X.p} x2={X.b1} y={96} t="order 9051" m={M}/>,
<g key={2}><Msg x1={X.b1} x2={X.b2} y={116} t="copy" m={M}/><Msg x1={X.b2} x2={X.b3} y={116} t="" m={M}/><Msg x1={X.b1} x2={X.p} y={136} t="OK: 3 copies" m={M} c={BLUE}/></g>,
<g key={3}><rect x={X.b3-50} y={56} width={100} height={20} fill={LR}/><T x={X.b3} y={70} t="lagging: out" c={RED} a="middle"/><Msg x1={X.p} x2={X.b1} y={166} t="order 9052" m={M}/><Msg x1={X.b1} x2={X.b2} y={182} t="copy" m={M}/><Msg x1={X.b1} x2={X.p} y={198} t="OK: 2 in sync" m={M} c={BLUE}/></g>,
<g key={4}><rect x={X.b2-50} y={56} width={100} height={20} fill={LR}/><T x={X.b2} y={70} t="down" c={RED} a="middle"/><Msg x1={X.p} x2={X.b1} y={218} t="order 9053" m={M}/><Msg x1={X.b1} x2={X.p} y={234} t="refused: not enough replicas" m={M} c={RED}/></g>];
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`kit${uid}`}><title id={`kit${uid}`}>Kafka replication for one partition, copied on three brokers with broker 1 as leader. The producer uses acks=all, so it hears OK only once every in-sync copy has the write. When broker 3 falls behind it leaves the in-sync set, and writes carry on with two copies. With min.insync.replicas set to 2, if broker 2 also drops out, the leader refuses writes rather than keep them on one disk.</title><Mk m={M}/>
{lanes}{still?<g>{m}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={m}/>}</svg>}

// Temporal, FIG 1: who does what. The Order API starts workflow order-9051; the service stores the history
// and task queues; workers poll and run workflow code and activities; results go back into the history.
function TemporalArchFig({still,uid=""}){const M=`ta${uid}`;
const caps=[["1 · the Order API starts workflow order-9051; the service records it and answers at once",INK],["2 · workers poll a task queue; one of them picks the workflow up and runs its code",BLUE],["3 · each activity, such as charging the card, is a task too, and its result is saved",BLUE],["4 · the service holds the state and the timers; workers hold none, so any worker can carry on",BLUE]];
const base=<g><Bx x={10} y={60} w={120} h={44} t="Order API" s="client"/><rect x={210} y={40} width={210} height={190} fill="none" stroke={GREY} strokeDasharray="4 3"/><T x={218} y={56} t="TEMPORAL SERVICE"/>
<Bx x={225} y={66} w={180} h={40} t="Workflow history" s="every event, in a database"/><Bx x={225} y={124} w={180} h={40} t="Task queue: orders" s="work waiting for a worker"/><Bx x={225} y={182} w={180} h={40} t="Timers" s="durable, in the service"/>
<Bx x={490} y={90} w={140} h={44} t="Worker 1"/><Bx x={490} y={150} w={140} h={44} t="Worker 2"/></g>;
const s1=<g><Ar x1={132} y1={82} x2={222} y2={86} m={M}/><T x={136} y={74} t="start"/></g>,s2=<g><Ar x1={488} y1={112} x2={408} y2={140} m={M} c={BLUE}/><T x={420} y={112} t="poll" c={BLUE}/><Bx x={490} y={90} w={140} h={44} t="Worker 1" s="runs the code" c={BLUE} fill={LB}/></g>;
const s3=<g><Bx x={490} y={90} w={140} h={44} t="Worker 1" s="activity: charge card" c={BLUE} fill={LB}/><Ar x1={488} y1={100} x2={408} y2={86} m={M} c={BLUE}/><T x={430} y={78} t="result" c={BLUE}/></g>;
const s4=<Bx x={490} y={150} w={140} h={44} t="Worker 2" s="could take over" c={BLUE} fill={LB}/>;
return <svg viewBox="0 0 640 262" role="img" aria-labelledby={`tat${uid}`}><title id={`tat${uid}`}>The parts of a Temporal setup. The Order API starts workflow order-9051, and the Temporal service records it and answers at once. The service keeps each workflow's history in a database, task queues of work waiting for workers, and durable timers. Workers poll a task queue; one picks up the workflow and runs its code. Each activity, such as charging the card through Payments, is a task too, and its result is saved in the history. Because workers hold no state, any worker can carry on.</title><Mk m={M}/>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} g={[s1,s2,s3,s4]}/>}</svg>}

// Temporal, FIG 2: waiting for a person with a deadline. A refund over ₹2,000 waits up to 24 h for approval;
// a reminder goes at 4 h; approval at 6 h wakes the workflow; with no answer it would escalate at 24 h.
function TemporalSignalFig({still,uid=""}){const x=h=>40+h*23;
const caps=[["1 · a refund over ₹2,000 waits for a manager: the workflow waits for a signal, up to 24 hours",INK],["2 · waiting uses no worker; after 4 hours a timer sends a reminder",INK],["3 · the manager approves at 6 hours: the signal wakes the workflow, which pays the refund",BLUE],["4 · had nobody answered by 24 hours, the timeout path would have escalated instead",RED]];
const base=<g><line x1={x(0)} y1={110} x2={x(24)} y2={110} stroke={GREY} strokeWidth="6"/>{[0,4,6,12,24].map(h=><T key={h} x={x(h)} y={140} t={`${h} h`} a="middle"/>)}<T x={x(0)} y={66} t="refund 312 waits for approval" a="start"/>
<text x="40" y="186" className="fl">const ok = await condition(() =&gt; approved, '24 hours');</text><text x="40" y="202" className="fl">if (ok) await refund(312); else await escalate(312);</text></g>;
const mk=(h,t,c,up=1,a="middle")=><g><line x1={x(h)} y1={up?96:116} x2={x(h)} y2={up?104:124} stroke={c}/><T x={x(h)} y={up?88:162} t={t} c={c} a={a}/></g>;
const s2=mk(4,"reminder",INK,0),s3=<g><line x1={x(0)} y1={110} x2={x(6)} y2={110} stroke={BLUE} strokeWidth="6"/>{mk(6,"approved: refund paid",BLUE)}</g>,s4=mk(24,"timeout: escalate",RED,0,"end");
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`tst${uid}`}><title id={`tst${uid}`}>A Temporal workflow waiting for a person. A refund over 2,000 rupees waits up to 24 hours for a manager's approval signal, using no worker while it waits. After 4 hours a timer sends a reminder. The manager approves at 6 hours, the signal wakes the workflow and it pays the refund. Had nobody answered by 24 hours, the timeout path would have escalated instead. Two lines of code: wait for the condition with a 24-hour limit, then refund or escalate.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// Gateways, FIG 1: a canary release by weight. 100/0, then 5% to v2; error rates match, 50/50; then all on
// v2 with v1 kept running for a quick rollback.
function GwCanaryFig({still,uid=""}){const M=`gc${uid}`;
const W=[[100,0],[95,5],[50,50],[0,100]];
const caps=[["1 · all of /orders goes to orders-v1; v2 is deployed but gets no traffic",INK],["2 · the gateway sends 5% of requests to v2, and both error rates are watched",BLUE],["3 · v2's errors and latency match v1's, so the split moves to 50/50",BLUE],["4 · then all of it goes to v2; v1 stays up for an hour, so rolling back is one setting",BLUE]];
const base=<g><Bx x={10} y={100} w={100} h={44} t="Clients"/><Ar x1={112} y1={122} x2={176} y2={122} m={M}/><Bx x={180} y={100} w={120} h={44} t="Gateway" s="route /orders"/><Bx x={480} y={50} w={150} h={44} t="orders-v1"/><Bx x={480} y={150} w={150} h={44} t="orders-v2"/></g>;
const st=([a,b],k)=><g key={k}><line x1={302} y1={116} x2={478} y2={72} stroke={a?INK:GREY} strokeWidth={a?1+a/25:1} strokeDasharray={a?undefined:"3 3"}/><line x1={302} y1={128} x2={478} y2={172} stroke={b?BLUE:GREY} strokeWidth={b?1+b/25:1} strokeDasharray={b?undefined:"3 3"}/><T x={390} y={82} t={`${a}%`} b/><T x={390} y={178} t={`${b}%`} b c={BLUE}/>
{k>0&&k<3&&<T x={480} y={220} t="errors: v1 0.2% · v2 0.2%"/>}{k===3&&<T x={480} y={112} t="idle, ready to roll back"/>}</g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`gct${uid}`}><title id={`gct${uid}`}>A canary release through the gateway. At first all requests to /orders go to orders-v1 and v2 gets none. Then the gateway sends 5 percent to v2 while both error rates are watched. They match, at 0.2 percent each, so the split moves to 50/50. Then all traffic goes to v2, and v1 stays up for an hour so rolling back is one setting.</title><Mk m={M}/>
{base}{still?<g>{st(W[3],3)}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[0,1,2,3]} g={W.map(st)}/>}</svg>}

// Gateways, FIG 2: what each costs a month at 10, 100 and 1,000 requests a second. Managed (per request,
// tiered, about $3.50 per million at first) against two or three self-hosted instances plus a load balancer.
function GwCostFig({still,uid=""}){const W=v=>Math.max(3,v/20);
const L=[["10 requests/s",90,180],["100 requests/s",900,180],["1,000 requests/s",6800,250]];
const caps=[["1 · a managed gateway bills per request; a self-hosted one bills per server",INK],["2 · at 10 requests a second, managed costs about $90 a month: less than two servers",BLUE],["3 · at 100 a second it is about $900, and at 1,000 about $6,800; the servers stay near $250",INK],["4 · the server bars leave out people: someone has to patch, scale and watch them",RED]];
const row=([n,m,s],i)=>{const y=56+i*58;return <g key={n}><T x={10} y={y+18} t={n} b/><rect x={150} y={y} width={W(m)} height={16} fill={FB} stroke={BLUE}/><T x={156+W(m)} y={y+12} t={`managed ~$${m.toLocaleString("en-IN")}`} c={BLUE}/><rect x={150} y={y+22} width={W(s)} height={16} fill={GRID} stroke={GREY}/><T x={156+W(s)} y={y+34} t={`self-hosted ~$${s}`}/></g>};
const note=<g><T x={10} y={238} t="+ the time to patch, scale and watch your own gateway" c={RED}/><T x={10} y={254} t="Rough monthly list prices in Mumbai; check current ones." /></g>;
return <svg viewBox="0 0 640 262" role="img" aria-labelledby={`gkt${uid}`}><title id={`gkt${uid}`}>Rough monthly cost of a gateway at three traffic levels. A managed gateway that bills per request costs about 90 dollars at 10 requests a second, about 900 at 100 a second and about 6,800 at 1,000 a second. Self-hosted gateway servers with a load balancer cost about 180 dollars at the lower two levels and about 250 at 1,000 a second. The server cost leaves out the people needed to patch, scale and watch them.</title>
{row(L[0],0)}{still?<g>{row(L[1],1)}{row(L[2],2)}{note}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={[null,null,<g>{row(L[1],1)}{row(L[2],2)}</g>,note]}/>}</svg>}

// Cassandra, FIG 1: one table per question. messages_by_chat, partitioned by chat_id and clustered by sent_at
// DESC. "Last 50 of chat 512" reads one partition in order; "every message from Asha" scans every node.
function CassModelFig({still,uid=""}){const M=`cm${uid}`,NX=[20,175,330,485];
const caps=[["1 · the partition key, chat_id, decides which nodes hold a chat's rows",INK],["2 · inside the partition, rows are stored sorted by sent_at, newest first",INK],["3 · \"last 50 messages of chat 512\" reads one partition, already in order",BLUE],["4 · \"every message from Asha\" names no partition: every node would have to be scanned",RED]];
const code=["CREATE TABLE messages_by_chat (","  chat_id bigint, sent_at timeuuid, sender text, body text,","  PRIMARY KEY ((chat_id), sent_at)",") WITH CLUSTERING ORDER BY (sent_at DESC);"];
const base=<g>{code.map((l,i)=><T key={i} x={20+(l.startsWith("  ")?12:0)} y={52+i*15} t={l.trim()}/>)}{NX.map((x,i)=><g key={i}><rect x={x} y={130} width={135} height={90} fill={BG} stroke={GREY}/><T x={x+8} y={146} t={`node ${i+1}`}/></g>)}</g>;
const part=hi=><g><rect x={185} y={154} width={115} height={58} fill={hi?LB:SURFACE} stroke={hi?BLUE:GREY}/><T x={192} y={168} t="chat 512" c={hi?BLUE:undefined}/>{["20:41 Asha","20:40 Ravi","20:38 Asha"].map((t,i)=><T key={t} x={192} y={182+i*12} t={t}/>)}</g>;
const s3=<g>{part(1)}<T x={20} y={246} t="WHERE chat_id = 512 LIMIT 50 → one partition, in order" c={BLUE}/></g>;
const s4=<g>{NX.map((x,i)=><rect key={i} x={x} y={130} width={135} height={90} fill="none" stroke={RED} strokeDasharray="4 3"/>)}<T x={20} y={262} t="WHERE sender = 'asha' → rejected, or ALLOW FILTERING: every node" c={RED}/></g>;
return <svg viewBox="0 0 640 272" role="img" aria-labelledby={`cmt${uid}`}><title id={`cmt${uid}`}>A Cassandra table designed for one question: messages by chat, with chat ID as the partition key and send time as the clustering column, newest first. The partition key decides which nodes hold a chat's rows, and inside the partition the rows are sorted by time. Asking for the last 50 messages of chat 512 reads one partition, already in order. Asking for every message from Asha names no partition, so Cassandra rejects it unless you allow filtering, which scans every node.</title><Mk m={M}/>
{base}{still?<g>{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={[part(0),<g><Glow x={185} y={154} w={115} h={58} t0={.25} t1={.5} dur={pace(14)}/></g>,s3,s4]}/>}</svg>}

// Cassandra, FIG 2: tombstones. A delete writes a marker; a queue-like table with 990 of 1,000 rows deleted
// makes a read step over 990 tombstones; warn at 1,000, fail at 1 lakh; dropped after gc_grace (10 days).
function CassTombFig({still,uid=""}){const n=40,cx=i=>20+i*15;
const caps=[["1 · a delete in Cassandra writes a marker, a tombstone, instead of removing the row",INK],["2 · a table used as a queue deletes 990 of 1,000 rows: a read steps over 990 tombstones",RED],["3 · reads slow down; past 1,000 tombstones Cassandra warns, past 1 lakh it fails the read",RED],["4 · after gc_grace_seconds, 10 days by default, compaction finally drops them",BLUE]];
const cells=dead=><g>{[...Array(n).keys()].map(i=>{const d=dead&&i<n-1;return <g key={i}><rect x={cx(i)} y={80} width={12} height={30} fill={d?GRID:LB} stroke={d?GREY:BLUE}/>{d&&<path d={`M${cx(i)+2} 84l8 22m0-22l-8 22`} stroke={GREY}/>}</g>})}</g>;
const base=<g><T x={20} y={64} t="partition: jobs for restaurant 42 (each box is 25 rows)"/>{cells(0)}</g>;
const s2=<g>{cells(1)}<T x={20} y={134} t="990 tombstones, 10 live rows" c={RED}/></g>,s3=<g><line x1={20} y1={122} x2={cx(n-1)+12} y2={122} stroke={RED} strokeWidth="2"/><T x={20} y={160} t="a read for the next job scans all of it" c={RED}/><T x={20} y={180} t="tombstone_warn_threshold 1,000 · tombstone_failure_threshold 1,00,000"/></g>;
const s4=<g><T x={20} y={214} t="after 10 days, compaction removes them; until then, design so reads don't cross them" c={BLUE}/></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`ctt${uid}`}><title id={`ctt${uid}`}>Tombstones in Cassandra. A delete writes a marker called a tombstone instead of removing the row. A table used as a queue deletes 990 of its 1,000 rows, so reading the next job means stepping over 990 tombstones. Reads slow down: past 1,000 tombstones Cassandra logs a warning and past 100,000 it fails the read. Only after gc_grace_seconds, 10 days by default, does compaction drop them.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// DynamoDB, FIG 1: base table keyed by customer_id + placed_at, and a global secondary index keyed by
// restaurant_id + placed_at, filled asynchronously.
function DdbKeysFig({still,uid=""}){const M=`dk${uid}`;
const Rw=[["c77","19:02","r42"],["c77","20:15","r9"],["c81","20:11","r42"],["c90","20:14","r42"]];
const caps=[["1 · the table's key is customer_id plus placed_at: a customer's orders sit together, in time order",INK],["2 · Query customer c77, newest first: one partition, one request",BLUE],["3 · a global secondary index keeps a copy of each order under restaurant_id plus placed_at",INK],["4 · the copy is written asynchronously: a new order can take a moment to appear there",RED]];
const tbl=(x,t,h,rows,hi)=><g><T x={x} y={50} t={t} b/><T x={x} y={70} t={h}/>{rows.map((r,i)=><g key={i}><rect x={x} y={78+i*26} width={260} height={22} fill={hi(i)?LB:BG} stroke={hi(i)?BLUE:GREY}/><T x={x+8} y={93+i*26} t={r}/></g>)}</g>;
const base=tbl(10,"orders (table)","customer_id · placed_at · restaurant",Rw.map(r=>`${r[0]} · ${r[1]} · ${r[2]}`),()=>0);
const s2=tbl(10,"orders (table)","customer_id · placed_at · restaurant",Rw.map(r=>`${r[0]} · ${r[1]} · ${r[2]}`),i=>i<2);
const gsiRows=[["r42","19:02","c77"],["r42","20:11","c81"],["r42","20:14","c90"],["r9","20:15","c77"]];
const s3=<g><Ar x1={272} y1={130} x2={366} y2={130} m={M} dash/><T x={282} y={120} t="copied"/>{tbl(370,"by_restaurant (index)","restaurant_id · placed_at · customer",gsiRows.map(r=>`${r[0]} · ${r[1]} · ${r[2]}`),i=>i<3)}</g>;
const s4=<g><T x={370} y={200} t="new order c95 · 20:16 · r42:" c={RED}/><T x={370} y={214} t="in the table now, in the index a moment later" c={RED}/></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`dkt${uid}`}><title id={`dkt${uid}`}>A DynamoDB orders table keyed by customer ID and order time, so a customer's orders sit together in time order and one query returns customer c77's orders, newest first. A global secondary index keeps a copy of each order keyed by restaurant ID and time, which answers a restaurant's orders. The copy is written asynchronously, so a new order is in the table at once and in the index a moment later.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// DynamoDB, FIG 2: a hot partition. Each partition takes up to 1,000 writes a second; votes keyed by one
// match send 2,000 a second to one partition and half are throttled; ten suffixed keys spread them.
function DdbHotFig({still,uid=""}){const y=v=>200-v*0.06,X=[60,190,320,450];
const caps=[["1 · DynamoDB splits a table into partitions; each takes at most 1,000 writes a second",INK],["2 · votes keyed by match:ind-pak all land on one partition: 2,000 a second",RED],["3 · half of them are throttled, though the table as a whole has room to spare",RED],["4 · add a suffix, match:ind-pak#0 to #9, and the votes spread over the partitions",BLUE]];
const bars=(v,c)=><g>{X.map((x,i)=><g key={i}><rect x={x} y={y(Math.min(v[i],3200))} width={90} height={200-y(Math.min(v[i],3200))} fill={c[i]===RED?LR:c[i]===BLUE?FB:GRID} stroke={c[i]||GREY}/><T x={x+45} y={194} t={`${v[i].toLocaleString("en-IN")}/s`} a="middle" c={c[i]}/></g>)}</g>;
const base=<g><line x1={40} y1={200} x2={600} y2={200} stroke={GREY}/><line x1={40} y1={y(1000)} x2={600} y2={y(1000)} stroke={RED} strokeDasharray="4 3"/><T x={600} y={y(1000)-6} t="1,000 writes/s per partition" a="end" c={RED}/>{X.map((x,i)=><T key={i} x={x+45} y={216} t={`partition ${i+1}`} a="middle"/>)}</g>;
const s1=bars([300,250,280,260],[]),s2=bars([300,2000,280,260],[undefined,RED]),s3=<g>{s2}<T x={190} y={236} t="1,000/s throttled" c={RED}/></g>,s4=bars([800,750,780,760],[BLUE,BLUE,BLUE,BLUE]);
return <svg viewBox="0 0 640 248" role="img" aria-labelledby={`dht${uid}`}><title id={`dht${uid}`}>A hot partition in DynamoDB. Each partition takes at most 1,000 writes a second. Votes keyed by one match all land on one partition at 2,000 a second, so half of them are throttled even though the table as a whole has spare capacity. Adding a suffix from 0 to 9 to the key spreads the votes over all the partitions, each well under the limit.</title>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[0,1,2,3]} g={[s1,s2,s3,s4]}/>}</svg>}

// PostgreSQL, FIG 1: MVCC. An update writes a new row version; an older snapshot still sees the old one;
// VACUUM frees the old version once no snapshot needs it.
function PgMvccFig({still,uid=""}){
const caps=[["1 · the dish's row: price ₹250, written by transaction 100",INK],["2 · transaction 205 updates the price: the old version is marked ended, a new one is written",BLUE],["3 · a report that began earlier still sees ₹250; new reads see ₹280, and nobody waited",BLUE],["4 · once no transaction can still see the old version, VACUUM frees its space",INK]];
const ver=(y,t,s,c=GREY,fill=BG)=><g><rect x={20} y={y} width={300} height={40} fill={fill} stroke={c} strokeDasharray={c===RED?"4 3":undefined}/><T x={32} y={y+17} t={t} b/><T x={32} y={y+32} t={s}/></g>;
const base=ver(60,"dish 9 · price ₹250","created by txn 100");
const s2=<g>{ver(60,"dish 9 · price ₹250","created by txn 100 · ended by txn 205",GREY,SURFACE)}{ver(110,"dish 9 · price ₹280","created by txn 205",BLUE,LB)}</g>;
const s3=<g><Bx x={420} y={58} w={210} h={44} t="Report, snapshot at 20:00" s="sees ₹250"/><line x1={418} y1={80} x2={322} y2={80} stroke={GREY} strokeDasharray="3 3"/><Bx x={420} y={110} w={210} h={44} t="New read, 20:05" s="sees ₹280" c={BLUE} fill={LB}/><line x1={418} y1={132} x2={322} y2={130} stroke={BLUE} strokeDasharray="3 3"/></g>;
const s4=<g>{ver(60,"dead version","freed by VACUUM",RED,LR)}<T x={20} y={190} t="Long-running transactions keep old versions alive, so tables bloat until they finish."/></g>;
return <svg viewBox="0 0 640 206" role="img" aria-labelledby={`pmt${uid}`}><title id={`pmt${uid}`}>How PostgreSQL updates a row. Dish 9's price, 250 rupees, was written by transaction 100. Transaction 205 changes it to 280 by marking the old version as ended and writing a new version. A report whose snapshot began earlier still sees 250, while new reads see 280, and neither waited for the other. Once no transaction can see the old version, VACUUM frees its space. A long-running transaction keeps old versions alive, so tables bloat until it finishes.</title>
{base}{still?<g>{s2}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// PostgreSQL, FIG 2: a pooler. 40 app servers × 50 connections = 2,000 client connections; PgBouncer in
// transaction mode lends one of 50 server connections per transaction.
function PgPoolFig({still,uid=""}){const M=`pp${uid}`;
const caps=[["1 · 40 app servers with 50 connections each would open 2,000 connections",INK],["2 · every PostgreSQL connection is its own process, with its own memory",RED],["3 · PgBouncer in transaction mode lends one of 50 server connections per transaction",BLUE],["4 · the price: session settings and session locks don't carry over between transactions",INK]];
const base=<g>{[0,1,2,3].map(i=><Bx key={i} x={10} y={50+i*44} w={130} h={34} t={i<3?`App server ${i+1}`:"… 40 servers"} s={i<3?"50 connections":undefined}/>)}<Bx x={470} y={80} w={160} h={90} t="PostgreSQL" s=""/></g>;
const s1=<g>{[0,1,2,3].map(i=><line key={i} x1={142} y1={67+i*44} x2={468} y2={125} stroke={RED} strokeWidth="2.5"/>)}<T x={250} y={226} t="2,000 connections" c={RED}/></g>;
const s2=<g><Bx x={470} y={80} w={160} h={90} t="PostgreSQL" s="2,000 processes" c={RED} fill={LR}/></g>;
const s3=<g>{[0,1,2,3].map(i=><line key={i} x1={142} y1={67+i*44} x2={254} y2={125} stroke={GREY}/>)}<Bx x={258} y={100} w={130} h={50} t="PgBouncer" s="transaction mode" c={BLUE} fill={LB}/><Ar x1={390} y1={125} x2={466} y2={125} m={M} c={BLUE} w={3}/><T x={398} y={116} t="50" c={BLUE}/><Bx x={470} y={80} w={160} h={90} t="PostgreSQL" s="50 processes" c={BLUE} fill={LB}/></g>;
const s4=<T x={258} y={226} t="SET, advisory locks and LISTEN need session mode"/>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`ppt${uid}`}><title id={`ppt${uid}`}>Connection pooling for PostgreSQL. Forty app servers with 50 connections each would open 2,000 connections, and each PostgreSQL connection is a separate process with its own memory. PgBouncer in transaction mode sits between them and lends one of 50 server connections for each transaction. The price is that session settings, advisory locks and LISTEN don't carry over between transactions and need session mode.</title><Mk m={M}/>
{base}{still?<g>{s3}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[0,1]} g={[s1,<g>{s1}{s2}</g>,s3,<g>{s3}{s4}</g>]}/>}</svg>}

// Flink, FIG 1: clicks counted in 1-minute windows by event time. Clicks arrive out of order; the watermark
// closes the 20:00 window when it passes 20:01; a click later than the allowed lateness goes to a side output.
function FlinkWindowFig({still,uid=""}){const x=s=>60+s*3.6;// seconds after 20:00
const C=[[8,1],[22,2],[51,3],[15,4],[40,5],[70,6],[95,7],[58,8]];// [event second, arrival order]
const caps=[["1 · each click carries the time it happened, and clicks arrive out of order",INK],["2 · Flink puts each click in a 1-minute window by that time, not by when it arrived",BLUE],["3 · when the watermark passes 20:01, the 20:00 window is complete: 5 clicks for ad 7",BLUE],["4 · a click from 20:00:58 that arrives after the window closed goes to a side output",RED]];
const base=<g><line x1={x(0)} y1={150} x2={x(150)} y2={150} stroke={GREY}/>{[0,60,120].map(s=><g key={s}><line x1={x(s)} y1={144} x2={x(s)} y2={156} stroke={GREY}/><T x={x(s)} y={172} t={`20:0${s/60}`} a="middle"/></g>)}<T x={10} y={46} t="event time of each click (number = arrival order)"/></g>;
const dots=(late)=><g>{C.filter(c=>late||c[1]<8).map(([s,o])=><g key={o}><circle cx={x(s)} cy={120} r="9" fill={o===8?LR:LB} stroke={o===8?RED:BLUE}/><T x={x(s)} y={124} t={o} a="middle" c={o===8?RED:BLUE}/></g>)}</g>;
const wins=<g><rect x={x(0)} y={96} width={x(60)-x(0)} height={48} fill="none" stroke={BLUE}/><rect x={x(60)} y={96} width={x(120)-x(60)} height={48} fill="none" stroke={GREY} strokeDasharray="4 3"/><T x={x(30)} y={90} t="window 20:00–20:01" a="middle" c={BLUE}/><T x={x(90)} y={90} t="window 20:01–20:02" a="middle"/></g>;
const wm=<g><line x1={x(62)} y1={60} x2={x(62)} y2={180} stroke={INK} strokeDasharray="5 3" strokeWidth="1.5"/><T x={x(62)+6} y={66} t="watermark"/><T x={x(0)} y={204} t="ad 7, 20:00–20:01: 5 clicks → emitted" c={BLUE}/></g>;
const late=<g>{dots(1)}<T x={x(58)} y={232} t="#8 arrived after the window closed → side output, not lost" a="middle" c={RED}/></g>;
return <svg viewBox="0 0 640 244" role="img" aria-labelledby={`fwt${uid}`}><title id={`fwt${uid}`}>Counting clicks for one ad in 1-minute windows by event time. Clicks carry the time they happened and arrive out of order. Flink places each in the window for its event time. When the watermark, Flink's estimate that nothing older is still coming, passes 20:01, the 20:00 window is complete and its count, 5 clicks, is emitted. A click from 20:00:58 that arrives after the window closed goes to a side output instead of being lost.</title>
{base}{still?<g>{wins}{wm}{late}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={[dots(0),wins,wm,late]}/>}</svg>}

// Flink, FIG 2: checkpoints. A barrier flows through source, count and sink; each saves its state, with the
// Kafka offsets, as checkpoint 42 in object storage. After a crash the job restores 42 and rewinds Kafka.
function FlinkCkptFig({still,uid=""}){const M=`fc${uid}`,D=pace(14);
const caps=[["1 · every few seconds, Flink sends a checkpoint barrier through the stream",INK],["2 · as it passes, each operator saves its state; with the Kafka offsets, that is checkpoint 42",BLUE],["3 · a machine dies; the job restarts from checkpoint 42: counts restored, Kafka rewound",RED],["4 · events after the checkpoint are read again, so each event is counted exactly once",BLUE]];
const base=<g><Bx x={10} y={80} w={110} h={44} t="Kafka" s="ad-clicks"/><Ar x1={122} y1={102} x2={176} y2={102} m={M}/><Bx x={180} y={80} w={120} h={44} t="Source" s="offset 8,812"/><Ar x1={302} y1={102} x2={356} y2={102} m={M}/><Bx x={360} y={80} w={120} h={44} t="Count per ad" s="ad 7: 1,204"/><Ar x1={482} y1={102} x2={516} y2={102} m={M}/><Bx x={520} y={80} w={110} h={44} t="Sink" s="dashboard"/>
<Bx x={180} y={180} w={300} h={40} t="Object storage" s="checkpoints"/></g>;
const s2=<g><line x1={240} y1={126} x2={300} y2={178} stroke={BLUE} strokeDasharray="3 3"/><line x1={420} y1={126} x2={360} y2={178} stroke={BLUE} strokeDasharray="3 3"/><T x={490} y={192} t="checkpoint 42:" c={BLUE}/><T x={490} y={206} t="offset 8,812" c={BLUE}/><T x={490} y={220} t="ad 7 = 1,204" c={BLUE}/></g>;
const s3=<g><Bx x={360} y={80} w={120} h={44} t="crashed" s="restarting" c={RED} fill={LR}/><T x={360} y={146} t="restore from 42" c={RED}/></g>;
const s4=<g><Bx x={180} y={80} w={120} h={44} t="Source" s="rewound to 8,812" c={BLUE} fill={LB}/><Bx x={360} y={80} w={120} h={44} t="Count per ad" s="back to 1,204" c={BLUE} fill={LB}/></g>;
return <svg viewBox="0 0 640 234" role="img" aria-labelledby={`fct${uid}`}><title id={`fct${uid}`}>How Flink recovers. Every few seconds it sends a checkpoint barrier through the job. As the barrier passes, the source saves its Kafka offset and the counting operator saves its counts to object storage, together forming checkpoint 42. When a machine dies, the job restarts from checkpoint 42: the counts are restored and Kafka is rewound to the saved offset. Events after the checkpoint are read again, so each event is counted exactly once in the job's state.</title><Mk m={M}/>
{base}{still?<g>{s2}{s4}<Cap t={caps[3][0]}/></g>:<g><Steps caps={caps} only={[2]} g={[null,s2,s3,s4]}/><g aria-hidden="true"><Show t0={0} t1={.25} dur={D}><g><rect x="150" y="70" width="4" height="64" fill={BLUE}><animate attributeName="x" values="150;150;500;500" keyTimes="0;.02;.25;1" dur={D} repeatCount="indefinite"/></rect><T x={142} y={64} t="barrier 42" c={BLUE}/></g></Show></g></g>}</svg>}

// ZooKeeper, FIG 1: leader election with ephemeral sequential znodes. The lowest number leads; each other
// candidate watches the one just before it. A's session ends, its znode goes; only B is told, and B leads.
function ZkElectFig({still,uid=""}){
const caps=[["1 · each candidate creates an ephemeral, sequential znode under /election",INK],["2 · the lowest number leads; each other candidate watches only the znode just before it",BLUE],["3 · A's session expires, and its ephemeral znode disappears with it",RED],["4 · only B is told; it now has the lowest number and leads, while C sleeps on",BLUE]];
const Z=[["A","n_0000000017",70],["B","n_0000000018",130],["C","n_0000000019",190]];
const zn=(i,c=GREY,fill=BG,s)=><g key={i}><Bx x={230} y={Z[i][2]-18} w={170} h={36} t={Z[i][1]} c={c} fill={fill}/><Bx x={470} y={Z[i][2]-18} w={160} h={36} t={`Payout worker ${Z[i][0]}`} s={s} c={c} fill={fill}/></g>;
const base=<g><Bx x={10} y={112} w={140} h={36} t="/election"/><line x1={152} y1={130} x2={228} y2={70} stroke={GREY}/><line x1={152} y1={130} x2={228} y2={130} stroke={GREY}/><line x1={152} y1={130} x2={228} y2={190} stroke={GREY}/>{[0,1,2].map(i=>zn(i))}</g>;
const watch=(a,b)=><path d={`M405 ${Z[b][2]}C440 ${Z[b][2]} 440 ${Z[a][2]} 405 ${Z[a][2]}`} fill="none" stroke={BLUE} strokeDasharray="3 3"/>;
const s2=<g>{zn(0,BLUE,LB,"leader")}{watch(0,1)}{watch(1,2)}<T x={410} y={234} t="each watches the one before it" c={BLUE}/></g>;
const s3=<g>{zn(0,RED,LR,"session expired")}<T x={10} y={234} t="ephemeral: gone with the session" c={RED}/></g>;
const s4=<g>{zn(1,BLUE,LB,"leader now")}{watch(1,2)}</g>;
return <svg viewBox="0 0 640 244" role="img" aria-labelledby={`zet${uid}`}><title id={`zet${uid}`}>Leader election in ZooKeeper. Three payout workers each create an ephemeral, sequential znode under /election, numbered 17, 18 and 19. The lowest number, worker A, leads. Each other worker watches only the znode just before its own: B watches A's, C watches B's. When A's session expires, its ephemeral znode disappears. Only B is notified; it now has the lowest number and becomes leader, while C is not woken.</title>
{base}{still?<g>{s3}{s4}<Cap t={caps[3][0]}/></g>:<Steps caps={caps} only={[1]} g={[null,s2,s3,s4]}/>}</svg>}

// ZooKeeper, FIG 2: an ensemble of five. A write goes to the leader, which proposes it; committed once three
// (a majority, leader included) have logged it. Reads come from the server the client is connected to.
function ZkQuorumFig({still,uid=""}){const M=`zq${uid}`,X=[50,170,290,400,510,610];
const caps=[["1 · an ensemble of five servers: one leader and four followers",INK],["2 · a write goes to the leader, which proposes it to every follower",INK],["3 · once three of the five, leader included, have logged it, the write is committed",BLUE],["4 · reads are answered locally and can lag behind; call sync() first when it matters",RED]];
const lanes=<g><Life x={X[0]} t="Client" y1={236}/><Life x={X[1]} t="Leader" y1={236}/>{[1,2,3,4].map(i=><Life key={i} x={X[i+1]} t={`F${i}`} y1={236}/>)}</g>;
const m=[null,<g key={2}><Msg x1={X[0]} x2={X[1]} y={92} t="set /config" m={M}/>{[2,3,4,5].map(i=><Msg key={i} x1={X[1]} x2={X[i]} y={108+i*4} t="" m={M} c={GREY}/>)}<T x={345} y={104} t="propose" a="middle"/></g>,
<g key={3}>{[2,3].map(i=><Msg key={i} x1={X[i]} x2={X[1]} y={150+i*6} t="" m={M} c={BLUE}/>)}<T x={230} y={150} t="2 acks + leader = 3" a="middle" c={BLUE}/><Msg x1={X[1]} x2={X[0]} y={184} t="committed" m={M} c={BLUE}/></g>,
<g key={4}><Msg x1={X[0]} x2={X[5]} y={214} t="read /config from F4: may still be the old value" m={M} c={RED} dash/></g>];
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`zqt${uid}`}><title id={`zqt${uid}`}>A ZooKeeper ensemble of five servers: a leader and four followers. A client's write goes to the leader, which proposes it to every follower. Once two followers have acknowledged it, three of the five including the leader, it is committed and the client is told. Reads are answered by whichever server the client is connected to, so a read from a follower that hasn't caught up can return the old value; calling sync first makes the read see the latest committed write.</title><Mk m={M}/>
{lanes}{still?<g>{m}<Cap t={caps[3][0]} c={RED}/></g>:<Steps caps={caps} g={m}/>}</svg>}


// The API gateway page (merged 2026-11-09) and API security use these.
// API gateway, FIG: one front door. The customer app's request passes the four checks and is routed
// to Orders; a restaurant's billing system goes over its limit and gets 429 back.
const GW_STEPS=["1  HTTPS ends here","2  Who is calling?","3  Within their limit?","4  Route by path"];
function GwFrontFig({still,uid=""}){const M=`gwf${uid}`,D=pace(10),GX=200,GW=210,SX=490,SY=[70,150,230],RY=[88,132,176,220];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`gwft${uid}`}><title id={`gwft${uid}`}>Every request to Zotato goes through one API gateway. It ends HTTPS, checks who is calling, checks that they are within their rate limit, and routes by path to the Orders, Menus or Payments service. A customer's order passes all four checks and reaches Orders. A restaurant's billing system that has sent too many requests gets 429 Too Many Requests and never reaches a service.</title><Mark m={M}/>
<Line x1={130} y1={90} x2={GX-2} y2={90} m={M}/><Line x1={130} y1={210} x2={GX-2} y2={210} m={M}/>
{SY.map(y=><Line key={y} x1={GX+GW} y1={220} x2={SX-2} y2={y} m={M} c={GREY}/>)}
<Box x={0} y={90} w={130} t="Customer app"/><Box x={0} y={210} w={130} t="Restaurant billing"/><text x="65" y="241" textAnchor="middle" className="fl">partner, API key</text>
<rect x={GX} y="44" width={GW} height="200" fill={LB} stroke={BLUE}/><text x={GX+GW/2} y="64" textAnchor="middle" className="fk">API GATEWAY</text>
{GW_STEPS.map((t,i)=><g key={t}><rect x={GX+10} y={RY[i]-14} width={GW-20} height="28" fill={BG} stroke={LINE}/><text x={GX+20} y={RY[i]+4} className="fq">{t}</text></g>)}
{[["Orders","/orders"],["Menus","/menus"],["Payments","/payments"]].map(([n,p],i)=><g key={n}><Box x={SX} y={SY[i]} w={150} t={n}/><text x={SX+75} y={SY[i]+31} textAnchor="middle" className="fl">{p}</text></g>)}
{!still&&<g aria-hidden="true">
<Dot x1={132} x2={GX-4} y={90} t0={.02} t1={.08} dur={D}/>{RY.map((y,i)=><Glow key={i} x={GX+10} y={y-14} w={GW-20} h={28} t0={+(.08+i*.06).toFixed(2)} t1={+(.14+i*.06).toFixed(2)} dur={D}/>)}<Dot x1={GX+GW+2} x2={SX-4} y={220} y2={72} t0={.32} t1={.4} dur={D}/><Glow x={SX} y={53} w={150} h={34} t0={.4} t1={.46} dur={D}/>
<Dot x1={132} x2={GX-4} y={210} t0={.52} t1={.58} dur={D}/><Glow x={GX+10} y={RY[0]-14} w={GW-20} h={28} t0={.58} t1={.64} dur={D}/><Glow x={GX+10} y={RY[1]-14} w={GW-20} h={28} t0={.64} t1={.7} dur={D}/>
<Show t0={.7} t1={.92} dur={D}><rect x={GX+10} y={RY[2]-14} width={GW-20} height="28" fill={LR} stroke={RED}/><text x={GX+20} y={RY[2]+4} className="fq">3  Over the limit: stop</text></Show>
<Dot x1={GX-4} x2={132} y={222} t0={.74} t1={.82} dur={D}/><Show t0={.76} t1={.94} dur={D}><text x="165" y="200" textAnchor="middle" className="fl" style={{fill:RED}}>429</text></Show></g>}</svg>}
// Rate limiting, FIG: the same requests through three limiters, each allowing 5 requests a second.
// Decisions are computed, not drawn: a burst just before and just after 1 s shows the fixed window
// letting 10 through in about 0.65 s, the sliding window holding to 5 in any second, the token
// bucket letting most of the bursts through (it starts full) and then about one request every 0.2 s.
const RT=[.62,.68,.74,.8,.86,.92,1.02,1.08,1.14,1.2,1.26,1.6,1.85,2.1,2.35,2.6,2.85];
const fixedW=()=>{const n={};return RT.map(t=>{const w=Math.floor(t);n[w]=(n[w]||0)+1;return n[w]<=5})};
const slideW=()=>{const ok=[];return RT.map(t=>{const c=ok.filter(x=>x>t-1).length;if(c<5){ok.push(t);return true}return false})};
const bucket=()=>{let tok=5,last=0;return RT.map(t=>{tok=Math.min(5,tok+(t-last)*5);last=t;if(tok>=1){tok-=1;return true}return false})};
const LIMITERS=[["FIXED WINDOW","5 per clock second",fixedW()],["SLIDING WINDOW","5 in any 1 second",slideW()],["TOKEN BUCKET","holds 5, refills 5 a second",bucket()]];
function RateFig({still,uid=""}){const D=pace(10),x=t=>150+t*135,RY0=56;
const dot=(t,ok,y)=>ok?<circle cx={x(t)} cy={y} r="4" fill={BLUE}/>:<circle cx={x(t)} cy={y} r="3.5" fill={BG} stroke={RED} strokeWidth="1.5"/>;
const at=t=>+(t/3*.85+.03).toFixed(3);
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rlt${uid}`}><title id={`rlt${uid}`}>The same 17 requests, a burst just before one second, a burst just after it, then one every quarter second, go through three rate limiters that each allow 5 requests a second. The fixed window lets 10 requests through within about two thirds of a second because the count resets at one second. The sliding window never lets more than 5 through in any second. The token bucket starts full and keeps refilling, so it lets most of the bursts through and then about one request every fifth of a second.</title>
<text x="0" y="22" className="fl">filled = let through · open = rejected with 429</text>
<text x="0" y={RY0+4} className="fk">REQUESTS</text>{RT.map((t,i)=>still?<circle key={i} cx={x(t)} cy={RY0} r="4" fill={GREY}/>:<Show key={i} t0={at(t)} t1={.98} dur={D}><circle cx={x(t)} cy={RY0} r="4" fill={GREY}/></Show>)}
{LIMITERS.map(([n,sub,ok],r)=>{const y=RY0+58*(r+1);return <g key={n}><line x1="0" x2="640" y1={y-29} y2={y-29} stroke={LINE}/><text x="0" y={y} className="fk">{n}</text><text x="0" y={y+15} className="fsub">{sub}</text>
{r===0&&[1,2].map(w=><line key={w} x1={x(w)} x2={x(w)} y1={y-20} y2={y+12} stroke={GREY} strokeDasharray="2 3"/>)}
{RT.map((t,i)=>still?<g key={i}>{dot(t,ok[i],y)}</g>:<Show key={i} t0={at(t)} t1={.98} dur={D}>{dot(t,ok[i],y)}</Show>)}
<text x="640" y={y+4} textAnchor="end" className="fl">{ok.filter(Boolean).length} of {RT.length}</text></g>})}
<line x1={x(0)} x2={x(3)} y1="268" y2="268" stroke={GREY}/>{[0,1,2,3].map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="264" y2="272" stroke={GREY}/><text x={x(t)} y="288" textAnchor="middle" className="fl">{t} s</text></g>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(3)} y={268} t0={.03} t1={.88} dur={D}/></g>}</svg>}


// Kafka's opening section uses this (from the general Queues and streams article, removed 2026-11-09).
// Messaging, FIG: the same order events through a queue and through a stream. The queue gives each
// message to one worker, which deletes it when done. The stream keeps every event in order; three
// services read all of it, each at its own position (offset).
function QueueStreamFig({still,uid=""}){const M=`qs${uid}`,D=pace(10),Q=78,S=228;
const cell=(x,y,t,on)=><g key={x}><rect x={x} y={y-12} width="26" height="24" fill={on?LB:BG} stroke={on?BLUE:GREY}/><text x={x+13} y={y+4} textAnchor="middle" className="fl">{t}</text></g>;
return <svg viewBox="0 0 640 320" role="img" aria-labelledby={`qst${uid}`}><title id={`qst${uid}`}>Top: the Order API puts jobs on a queue. Each job goes to one of two workers, which deletes it once done. Bottom: the Order API appends order events to a stream, a log that keeps them in order for seven days. Notifications, analytics and the restaurant tablet service each read every event, each from its own position, so analytics can lag behind or replay old events without affecting the others.</title><Mark m={M}/>
<text x="0" y="22" className="fb">Queue · SQS, RabbitMQ</text><text x="0" y="38" className="fl">each job to one worker, then deleted</text>
<Box x={0} y={Q} w={100} t="Order API"/><Line x1={102} y1={Q} x2={176} y2={Q} m={M}/>
<rect x="180" y={Q-17} width="130" height="34" fill={LB} stroke={BLUE}/>{[0,1,2].map(i=><rect key={i} x={190+i*38} y={Q-9} width="30" height="18" fill={BG} stroke={GREY}/>)}<text x="245" y={Q+32} textAnchor="middle" className="fl">jobs waiting</text>
<Line x1={312} y1={Q-6} x2={426} y2={Q-30} m={M} c={GREY}/><Line x1={312} y1={Q+6} x2={426} y2={Q+30} m={M} c={GREY}/>
<Box x={430} y={Q-34} w={130} t="Worker A"/><Box x={430} y={Q+34} w={130} t="Worker B"/><text x="572" y={Q+4} className="fl">done →</text><text x="572" y={Q+18} className="fl">deleted</text>
<line x1="0" y1="150" x2="640" y2="150" stroke={LINE_SOFT}/>
<text x="0" y="172" className="fb">Stream · Kafka, Kinesis</text><text x="0" y="188" className="fl">kept for 7 days; every reader gets every event</text>
<Box x={0} y={S} w={100} t="Order API"/><Line x1={102} y1={S} x2={176} y2={S} m={M}/>
{[0,1,2,3,4,5].map(i=>cell(180+i*26,S,i,i===5))}<text x="258" y={S+28} textAnchor="middle" className="fl">offsets 0–5, never deleted early</text>
<Line x1={338} y1={S-4} x2={426} y2={S-50} m={M} c={GREY}/><Line x1={338} y1={S} x2={426} y2={S} m={M} c={GREY}/><Line x1={338} y1={S+4} x2={426} y2={S+50} m={M} c={GREY}/>
<SBox x={430} y={S-50} w={150} t="Notifications · at 5"/><SBox x={430} y={S} w={150} t="Analytics · at 3"/><SBox x={430} y={S+50} w={150} t="Restaurant tablet · at 5"/>
{!still&&<g aria-hidden="true">
<Dot x1={102} x2={186} y={Q} t0={.02} t1={.1} dur={D}/><Dot x1={312} x2={424} y={Q-6} y2={Q-30} t0={.12} t1={.22} dur={D}/><Glow x={430} y={Q-51} w={130} h={34} t0={.22} t1={.3} dur={D}/>
<Dot x1={102} x2={186} y={Q} t0={.28} t1={.36} dur={D}/><Dot x1={312} x2={424} y={Q+6} y2={Q+30} t0={.38} t1={.48} dur={D}/><Glow x={430} y={Q+17} w={130} h={34} t0={.48} t1={.56} dur={D}/>
<Dot x1={102} x2={332} y={S} t0={.55} t1={.66} dur={D}/>
<Dot x1={338} x2={424} y={S-4} y2={S-50} t0={.68} t1={.78} dur={D}/><Dot x1={338} x2={424} y={S} t0={.68} t1={.78} dur={D}/><Dot x1={338} x2={424} y={S+4} y2={S+50} t0={.68} t1={.78} dur={D}/>
<Show t0={.78} t1={.98} dur={D}><text x="258" y={S-22} textAnchor="middle" className="fl" style={{fill:BLUE}}>one event, three readers</text></Show></g>}</svg>}

export const FIGS={
"redis-types":{C:RedisTypesFig,ar:640/264,title:()=>"ONE SERVER, FIVE SHAPES OF DATA"},
"redis-slots":{C:RedisSlotsFig,ar:640/256,title:()=>"16,384 SLOTS, THREE PRIMARIES"},
"es-inverted":{C:EsInvertedFig,ar:640/240,title:()=>"FROM DISH NAMES TO AN INVERTED INDEX"},
"es-sync":{C:EsSyncFig,ar:640/240,title:()=>"THE INDEX IS A COPY"},
"kafka-group":{C:KafkaGroupFig,ar:640/250,title:()=>"A GROUP SHARES THE PARTITIONS"},
"kafka-isr":{C:KafkaIsrFig,ar:640/250,title:()=>"ACKS=ALL AND THE IN-SYNC COPIES"},
"temporal-arch":{C:TemporalArchFig,ar:640/262,title:()=>"WHO DOES WHAT IN TEMPORAL"},
"temporal-signal":{C:TemporalSignalFig,ar:640/220,title:()=>"WAITING FOR A PERSON, WITH A DEADLINE"},
"gw-canary":{C:GwCanaryFig,ar:640/236,title:()=>"MOVING TRAFFIC TO A NEW VERSION"},
"gw-cost":{C:GwCostFig,ar:640/262,title:()=>"MANAGED OR SELF-HOSTED, BY THE MONTH"},
"cass-model":{C:CassModelFig,ar:640/272,title:()=>"ONE TABLE PER QUESTION"},
"cass-tombstone":{C:CassTombFig,ar:640/230,title:()=>"DELETES THAT STAY AROUND"},
"ddb-keys":{C:DdbKeysFig,ar:640/230,title:()=>"A TABLE AND ITS SECOND INDEX"},
"ddb-hot":{C:DdbHotFig,ar:640/248,title:()=>"ONE PARTITION, ITS OWN LIMIT"},
"pg-mvcc":{C:PgMvccFig,ar:640/206,title:()=>"AN UPDATE WRITES A NEW VERSION"},
"pg-pool":{C:PgPoolFig,ar:640/240,title:()=>"2,000 CLIENTS, 50 CONNECTIONS"},
"flink-window":{C:FlinkWindowFig,ar:640/244,title:()=>"CLICKS PER MINUTE, BY EVENT TIME"},
"flink-checkpoint":{C:FlinkCkptFig,ar:640/234,title:()=>"A CHECKPOINT, THEN A CRASH"},
"zk-election":{C:ZkElectFig,ar:640/244,title:()=>"ELECTING A LEADER WITH ZNODES"},
"zk-quorum":{C:ZkQuorumFig,ar:640/250,title:()=>"FIVE SERVERS, WRITES NEED THREE"},
"gw-front":{C:GwFrontFig,ar:640/300,title:n=>`ONE FRONT DOOR FOR ${n}`},
"rate-limit":{C:RateFig,ar:640/300,title:()=>"THREE RATE LIMITERS, 5 REQUESTS A SECOND"},
"queue-vs-stream":{C:QueueStreamFig,ar:640/320,title:()=>"A QUEUE AND A STREAM, SAME EVENTS"},
};
