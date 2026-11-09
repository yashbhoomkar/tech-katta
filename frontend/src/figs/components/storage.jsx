// Components › Storage: the figures this sub-tab's articles draw (site.json dashboard.groups.components, "storage").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Box,Arr,Glow,Show,Mark,Line,SBox,INK,GREY,RED}from"../parts.jsx";

// Cache, FIG: cache-aside for one menu. Hit: Redis answers in about 1 ms. Miss: Redis has nothing,
// the Order API reads the database and stores the result with a TTL for the next request.
function CacheAsideFig({still,uid=""}){const M=`cas${uid}`,D="12s",AX=150,RX=468;
const lanes=[[60,"GET menu:r42",false,"→"],[84,"the menu (hit) · nothing (miss)",true,"←"],[108,"SET menu:r42 EX 300",false,"→"],[204,"SELECT … FROM menu_items",false,"→"],[228,"rows",true,"←"]];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`cast${uid}`}><title id={`cast${uid}`}>Cache-aside for one restaurant menu. The Order API first asks Redis for menu:r42. On a hit, Redis returns the menu in about a millisecond and the database is never asked. On a miss, Redis returns nothing, the Order API reads the menu from the database in about 5 milliseconds, and stores it in Redis with a 5 minute expiry for the next request. When the restaurant changes its menu, the API updates the database and deletes the key.</title><Mark m={M}/>
<rect x="20" y="40" width={AX-20} height="210" fill="#fff" stroke={GREY}/><text x={(20+AX)/2} y="140" textAnchor="middle" className="fb">Order API</text><text x={(20+AX)/2} y="156" textAnchor="middle" className="fl">your code</text>
<rect x={RX} y="44" width="152" height="80" fill="#f8faff" stroke="#2855d9"/><text x={RX+76} y="80" textAnchor="middle" className="fb">Redis</text><text x={RX+76} y="96" textAnchor="middle" className="fl">about 1 ms</text>
<rect x={RX} y="188" width="152" height="56" fill="#fff" stroke={GREY}/><text x={RX+76} y="212" textAnchor="middle" className="fb">Database</text><text x={RX+76} y="228" textAnchor="middle" className="fl">about 5 ms</text>
{lanes.map(([y,t,back])=><Arr key={y} m={M} x1={back?RX-2:AX+2} x2={back?AX+4:RX-4} y={y} t={t} dash={back}/>)}
<text x="0" y="284" className="fl">On a menu change: UPDATE the database, then DEL menu:r42. The next read misses and loads the new menu.</text>
{!still&&<g aria-hidden="true">
<Dot x1={AX+4} x2={RX-8} y={60} t0={.02} t1={.1} dur={D}/><Glow x={RX} y={44} w={152} h={80} t0={.1} t1={.14} dur={D}/><Dot x1={RX-6} x2={AX+8} y={84} t0={.14} t1={.22} dur={D}/><Show t0={.14} t1={.3} dur={D}><text x={RX+76} y="138" textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>HIT</text></Show>
<Dot x1={AX+4} x2={RX-8} y={60} t0={.36} t1={.44} dur={D}/><Show t0={.44} t1={.62} dur={D}><text x={RX+76} y="138" textAnchor="middle" className="fl" style={{fill:RED}}>MISS</text></Show><Dot x1={RX-6} x2={AX+8} y={84} t0={.46} t1={.52} dur={D}/>
<Dot x1={AX+4} x2={RX-8} y={204} t0={.54} t1={.62} dur={D}/><Glow x={RX} y={188} w={152} h={56} t0={.62} t1={.66} dur={D}/><Dot x1={RX-6} x2={AX+8} y={228} t0={.66} t1={.74} dur={D}/><Dot x1={AX+4} x2={RX-8} y={108} t0={.76} t1={.84} dur={D}/><Glow x={RX} y={44} w={152} h={80} t0={.84} t1={.9} dur={D}/></g>}</svg>}

// Cache, FIG: the "cache restarts at dinner" challenge. 12,000 queries a second, 90% hits, 10% writes:
// the database (db.m5.large, about 2,500 a second) normally sees about 2,300. The cache is down for
// 10 minutes (every query goes to the database), then comes back empty and warms up over 10 minutes.
function CacheWarmFig({still,uid=""}){const D="10s",x=t=>80+t*11.5,y=q=>232-q*.0145,CAP=2500,BASE=2280,ALL=12000;
const load=[[0,BASE],[15,BASE],[15,ALL],[25,ALL],[35,BASE],[45,BASE]],path=load.map(([t,q],i)=>`${i?"L":"M"}${x(t)} ${y(q)}`).join("");
const over=`M${x(15)} ${y(CAP)}L${x(15)} ${y(ALL)}L${x(25)} ${y(ALL)}L${x(25+10*(ALL-CAP)/(ALL-BASE))} ${y(CAP)}Z`;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`cwt${uid}`}><title id={`cwt${uid}`}>Database queries a second during Zotato's dinner rush. With the cache working, the database sees about 2,300 a second, just under the 2,500 a db.m5.large handles. At 8:15 the cache crashes and every one of the 12,000 queries a second goes to the database for 10 minutes. When the cache returns at 8:25 it is empty, so the load falls back only as the cache warms up, reaching normal at 8:35. For about 20 minutes the database is asked for far more than it can handle.</title>
{[0,5000,10000].map(q=><g key={q}><line x1={x(0)} x2={x(45)} y1={y(q)} y2={y(q)} stroke="#eef1f5"/><text x={x(0)-8} y={y(q)+4} textAnchor="end" className="fl">{q.toLocaleString("en-IN")}</text></g>)}
<text x="0" y="30" className="fl">database queries/s</text>
<path d={over} fill="#fde3e1"/><line x1={x(0)} x2={x(45)} y1={y(CAP)} y2={y(CAP)} stroke={RED} strokeDasharray="4 3"/><text x={x(0)+4} y={y(CAP)-6} className="fl" style={{fill:RED}}>database limit · 2,500</text>
<path d={path} fill="none" stroke={INK} strokeWidth="2"/>
<text x={(x(15)+x(25))/2} y={y(ALL)-10} textAnchor="middle" className="fl">cache down</text><text x={(x(25)+x(35))/2+14} y={y(7600)} className="fl">back, empty:</text><text x={(x(25)+x(35))/2+14} y={y(7600)+14} className="fl">warming up</text>
<text x={x(1)} y={y(BASE)+18} className="fl">cache working: 90% hits</text>
<line x1={x(0)} x2={x(45)} y1={y(0)} y2={y(0)} stroke={GREY}/>{[[0,"8:00 pm"],[15,"8:15"],[25,"8:25"],[35,"8:35"],[45,"8:45"]].map(([t,l])=><g key={t}><line x1={x(t)} x2={x(t)} y1={y(0)-4} y2={y(0)+4} stroke={GREY}/><text x={x(t)} y={y(0)+20} textAnchor="middle" className="fl">{l}</text></g>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(45)} y={y(0)} t0={.03} t1={.93} dur={D}/></g>}</svg>}

// Database, FIG: "my last 20 orders" without and with an index on (customer_id, created_at).
// Left: a scan reads every row. Right: the index's tree is walked root → branch → leaf.
function DbIndexFig({still,uid=""}){const M=`dbi${uid}`,D="9s",rows=[...Array(14).keys()],hits=new Set([2,8,11]);
const br=[400,495,590],lf=[365,423,481,539,597];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`dbit${uid}`}><title id={`dbit${uid}`}>Finding one customer's latest orders in a table of 5 crore orders. Without an index the database reads every row to find the few that match, which takes seconds. With an index on customer ID and order time, it walks a small tree from the root to one branch to one leaf, three or four page reads, and finds the 20 newest orders in about a millisecond.</title><Mark m={M}/>
<text x="0" y="22" className="fk">WITHOUT AN INDEX</text><text x="0" y="38" className="fsub">Read every row, keep the matches</text>
{rows.map(i=><rect key={i} x="20" y={56+i*13} width="250" height="11" fill={hits.has(i)?"#e7edff":"#f5f7fa"} stroke={hits.has(i)?"#2855d9":"#e3e7ee"}/>)}
<text x="145" y="252" textAnchor="middle" className="fl">orders · 5 crore rows</text><text x="0" y="284" className="fl">every row read: seconds</text>
{!still&&<rect x="16" y="54" width="258" height="15" fill="none" stroke={INK} strokeWidth="1.5"><animate attributeName="y" values="54;54;223;223" keyTimes="0;.05;.9;1" dur={D} repeatCount="indefinite"/></rect>}
<line x1="315" x2="315" y1="10" y2="290" stroke="#d9dee7"/>
<text x="335" y="22" className="fk">WITH AN INDEX</text><text x="335" y="38" className="fsub">on (customer_id, created_at)</text>
<SBox x={470} y={74} w={90} t="root" blue/>
{br.map((c,i)=><g key={c}><Line x1={515} y1={86} x2={c} y2={130} c={i===1?INK:GREY} m={i===1?M:undefined}/><SBox x={c-40} y={142} w={80} t={["1 – 40","41 – 90","91 – …"][i]}/></g>)}
{lf.map((c,i)=><g key={c}><Line x1={495} y1={154} x2={c} y2={198} c={i===2?INK:GREY} m={i===2?M:undefined}/><SBox x={c-25} y={210} w={50} t={i===2?"77":"·"} blue={i===2}/></g>)}
<text x="481" y="240" textAnchor="middle" className="fl">customer 77: newest 20 orders</text><text x="335" y="284" className="fl">3–4 page reads: about a millisecond</text>
{!still&&<g aria-hidden="true"><Glow x={470} y={62} w={90} h={24} t0={.1} t1={.25} dur={D}/><Dot x1={505} x2={497} y={88} y2={128} t0={.25} t1={.38} dur={D}/><Glow x={455} y={130} w={80} h={24} t0={.38} t1={.52} dur={D}/><Dot x1={493} x2={483} y={156} y2={196} t0={.52} t1={.65} dur={D}/><Glow x={456} y={198} w={50} h={24} t0={.65} t1={.95} dur={D}/></g>}</svg>}

// Database, FIG: a primary with a Multi-AZ standby (synchronous) and two read replicas
// (asynchronous). An order is written to the primary; a read sent to a replica a moment later
// does not find it yet.
function DbReplicasFig({still,uid=""}){const M=`dbr${uid}`,D="12s";
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`dbrt${uid}`}><title id={`dbrt${uid}`}>Zotato's Order API writes to the primary database in zone A. Every write is copied to a standby in zone B before the write is confirmed, so the standby can take over if the primary fails; it serves no reads. Two read replicas receive the same writes asynchronously, about 100 milliseconds behind, and serve reads. A customer who places an order and immediately opens My orders from a replica may not see the new order yet.</title><Mark m={M}/>
<Box x={0} y={150} w={120} t="Order API"/>
<Line x1={122} y1={140} x2={218} y2={98} m={M}/><text x="150" y="104" className="fl">writes</text>
<Line x1={122} y1={160} x2={476} y2={126} m={M} dash/><text x="130" y="194" className="fl">reads (may be a bit old)</text>
<Box x={220} y={90} w={140} t="Primary · zone A" blue/>
<Line x1={290} y1={108} x2={290} y2={211} m={M}/><text x="298" y="185" className="fl">sync: copied before OK</text>
<rect x="220" y="213" width="140" height="34" fill="#fff" stroke={GREY} strokeDasharray="4 3"/><text x="290" y="234" textAnchor="middle" className="fb">Standby · zone B</text><text x="290" y="266" textAnchor="middle" className="fl">Multi-AZ: takes over, no reads</text>
<Line x1={362} y1={84} x2={476} y2={56} m={M} c={GREY}/><Line x1={362} y1={96} x2={476} y2={118} m={M} c={GREY}/><text x="398" y="40" textAnchor="middle" className="fl">async: ~100 ms behind</text>
<Box x={480} y={56} w={150} t="Read replica 1"/><Box x={480} y={122} w={150} t="Read replica 2"/>
{!still&&<g aria-hidden="true">
<Dot x1={124} x2={214} y={139} y2={100} t0={.02} t1={.1} dur={D}/><Glow x={220} y={73} w={140} h={34} t0={.1} t1={.16} dur={D}/><Dot x1={290} x2={290} y={110} y2={208} t0={.12} t1={.2} dur={D}/><Glow x={220} y={213} w={140} h={34} t0={.2} t1={.25} dur={D}/>
<Show t0={.25} t1={.42} dur={D}><text x="60" y="122" textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>order placed</text></Show>
<Dot x1={124} x2={472} y={160} y2={127} t0={.3} t1={.4} dur={D}/><Show t0={.4} t1={.6} dur={D}><text x="555" y="156" textAnchor="middle" className="fl" style={{fill:RED}}>not there yet</text></Show>
<Dot x1={364} x2={472} y={96} y2={117} t0={.5} t1={.62} dur={D}/><Dot x1={364} x2={472} y={84} y2={57} t0={.5} t1={.62} dur={D}/><Show t0={.62} t1={.92} dur={D}><text x="555" y="156" textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>now it is</text></Show></g>}</svg>}

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

// Object storage, FIG: a restaurant uploads a menu photo. The app asks the API for a pre-signed
// upload URL, sends the photo straight to the bucket (the API never carries the bytes), the bucket's
// event starts a worker that writes resized copies, and customers fetch them through the CDN.
function ObjUploadFig({still,uid=""}){const M=`obu${uid}`,D="12s";
const steps=["1 · app asks the API for an upload URL","2 · photo goes straight to the bucket","3 · the bucket tells a worker; it makes sizes","4 · customers get the photo from the CDN"];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`obut${uid}`}><title id={`obut${uid}`}>A restaurant's phone asks Zotato's API for a pre-signed upload URL and gets one that works for five minutes. The phone uploads the menu photo directly to the S3 bucket, so the API never carries the file. The bucket sends an event to a resize worker, which writes small and large copies back to the bucket. Customers load the photos through the CDN, which fetches them from the bucket once and then serves them from nearby.</title><Mark m={M}/>
<Box x={0} y={150} w={120} t="Restaurant app"/>
<Box x={240} y={70} w={140} t="Order API"/><Line x1={122} y1={140} x2={236} y2={78} m={M}/><Line x1={236} y1={92} x2={124} y2={152} m={M} dash/><text x="246" y="106" className="fl">signed upload URL, 5 min</text>
<Box x={240} y={230} w={140} t="S3 bucket" blue/><Line x1={122} y1={162} x2={236} y2={226} m={M}/><text x="128" y="214" className="fl">PUT photo.jpg</text>
<Box x={480} y={230} w={150} t="Resize worker"/><Line x1={382} y1={224} x2={476} y2={224} m={M}/><text x="429" y="216" textAnchor="middle" className="fl">event</text><Line x1={476} y1={238} x2={384} y2={238} m={M} c={GREY}/><text x="429" y="256" textAnchor="middle" className="fl">small, large</text>
<Box x={480} y={110} w={150} t="CDN"/><Line x1={382} y1={218} x2={476} y2={122} m={M} c={GREY}/><text x="555" y="74" textAnchor="middle" className="fl">customers</text><Line x1={555} y1={92} x2={555} y2={80} m={M}/>
{still?<text x="10" y="24" className="fl">ask → upload direct → resize → serve through the CDN</text>:<g aria-hidden="true">
{steps.map((t,i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="24" className="fb">{t}</text></Show>)}
<Dot x1={124} x2={232} y={140} y2={80} t0={.02} t1={.1} dur={D}/><Glow x={240} y={53} w={140} h={34} t0={.1} t1={.16} dur={D}/><Dot x1={232} x2={128} y={92} y2={150} t0={.15} t1={.23} dur={D}/>
<Dot x1={124} x2={232} y={162} y2={225} t0={.27} t1={.4} dur={D}/><Glow x={240} y={213} w={140} h={34} t0={.4} t1={.47} dur={D}/>
<Dot x1={384} x2={472} y={224} t0={.52} t1={.6} dur={D}/><Glow x={480} y={213} w={150} h={34} t0={.6} t1={.66} dur={D}/><Dot x1={472} x2={388} y={238} t0={.66} t1={.73} dur={D}/>
<Dot x1={384} x2={472} y={218} y2={124} t0={.78} t1={.86} dur={D}/><Glow x={480} y={93} w={150} h={34} t0={.86} t1={.92} dur={D}/><Dot x1={555} x2={555} y={92} y2={80} t0={.92} t1={.97} dur={D}/></g>}</svg>}

// Object storage, FIG: one delivery photo moving through storage classes as it ages, with the price
// per GB per month of each (S3 in Mumbai, rounded): Standard for the first month, Standard-IA until
// 90 days, Glacier Deep Archive until the one-year mark, then deleted by a lifecycle rule.
function ObjTiersFig({still,uid=""}){const D="10s",Y=150,X0=40,X1=600;
const tiers=[["Standard","$0.025",0,30,"#2855d9"],["Infrequent access","$0.014",30,90,"#6f8fe6"],["Deep archive","$0.002",90,365,"#b9c9ff"]];
// three equal steps (time is not to scale): uploaded, day 30, day 90, one year
const x=(d)=>X0+({0:0,30:1,90:2,365:3}[d]/3)*(X1-X0);
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`obtt${uid}`}><title id={`obtt${uid}`}>A delivery-proof photo stays in S3 Standard, at about 2.5 cents per gigabyte per month, for its first 30 days while support may need it. A lifecycle rule moves it to Standard Infrequent Access, about 1.4 cents, until day 90, then to Glacier Deep Archive, about 0.2 cents, and deletes it after one year. Storing the same photos in Standard all year would cost about four times as much.</title>
{tiers.map(([n,pr,a,b,c],i)=><g key={n}><rect x={x(a)} y={Y-22} width={x(b)-x(a)-2} height="44" rx="2" fill={c}/><text x={(x(a)+x(b))/2} y={Y-34} textAnchor="middle" className="fb">{n}</text><text x={(x(a)+x(b))/2} y={Y+5} textAnchor="middle" className="fb" style={{fill:i<2?"#fff":INK}}>{pr} / GB</text></g>)}
<line x1={x(365)} y1={Y-30} x2={x(365)} y2={Y+30} stroke={RED} strokeDasharray="4 3"/><text x={x(365)-4} y={Y+46} textAnchor="end" className="fl" style={{fill:RED}}>deleted at 1 year</text>
{[0,30,90,365].map(d=><text key={d} x={x(d)} y={Y+46} textAnchor={d===0?"start":"middle"} className="fl">{d===0?"uploaded":d===365?"":`day ${d}`}</text>)}
<text x="10" y="232" className="fl">per GB per month, S3 Mumbai, rounded · time not to scale · a lifecycle rule does the moving</text>
<text x="10" y="250" className="fl">a year of photos: about $0.07 per GB instead of $0.30 if all of it stayed in Standard</text>
{!still&&<circle cx={x(0)} cy={Y-60} r="6" fill={INK} aria-hidden="true"><animate attributeName="cx" values={`${x(0)};${x(30)};${x(90)};${x(365)};${x(365)}`} keyTimes="0;.25;.5;.85;1" dur={D} repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;1;1;0" keyTimes="0;.25;.5;.85;1" calcMode="discrete" dur={D} repeatCount="indefinite"/></circle>}
{!still&&<text x={x(0)} y={Y-72} className="fl" aria-hidden="true">photo<animate attributeName="x" values={`${x(0)};${x(30)};${x(90)};${x(365)};${x(365)}`} keyTimes="0;.25;.5;.85;1" dur={D} repeatCount="indefinite"/></text>}</svg>}

export const FIGS={
"db-index":{C:DbIndexFig,ar:640/300,title:()=>"FINDING ONE CUSTOMER'S ORDERS"},
"db-replicas":{C:DbReplicasFig,ar:640/300,title:n=>`${n}'S DATABASE: PRIMARY, STANDBY, REPLICAS`},
"cache-aside":{C:CacheAsideFig,ar:640/300,title:()=>"ONE MENU READ: A HIT AND A MISS"},
"cache-warm":{C:CacheWarmFig,ar:640/290,title:n=>`WHEN ${n}'S CACHE RESTARTS AT DINNER`},
"shard-key":{C:ShardKeyFig,ar:640/300,title:n=>`${n}'S ORDERS, SPLIT BY CUSTOMER`},
"hot-shard":{C:HotShardFig,ar:640/300,title:()=>"ONE HOT KEY ON MATCH NIGHT"},
"obj-upload":{C:ObjUploadFig,ar:640/300,title:n=>`A MENU PHOTO INTO ${n}'S STORAGE`},
"obj-tiers":{C:ObjTiersFig,ar:640/260,title:()=>"ONE PHOTO, CHEAPER AS IT AGES"},
};
