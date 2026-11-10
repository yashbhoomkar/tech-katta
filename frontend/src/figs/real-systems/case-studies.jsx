// Real systems › Case studies: the figures this sub-tab's articles draw (site.json dashboard.groups["real-systems"], "case-studies").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Bx,Ar,T,Fig,X,INK,GREY,RED,BLUE,LB,LR,FB}from"../parts.jsx";

// Shopify, FIG 1: one row per unit, handed out with SKIP LOCKED. Checkout 1 locks units 1–3, checkout 2
// passes over them and takes 4–5, and the stock ledger refills the pool when it runs low.
function SkipLockedFig({still,uid=""}){const M=`sk${uid}`;
const at=i=>({x:220+(i%2)*120,y:62+Math.floor(i/2)*36});
const unit=(i,by)=>{const{x,y}=at(i);return <Bx key={i} x={x} y={y} w={110} h={28} t={by?`unit ${i+1} · ${by}`:`unit ${i+1}`} c={by?BLUE:GREY} fill={by?LB:"#fff"}/>};
const base=<g><text x="220" y="50" className="fk">UNIT ROWS · ONE ITEM, ONE LOCATION</text>{[0,1,2,3,4,5,6,7,8,9].map(i=>unit(i))}
<Bx x={10} y={70} w={150} h={44} t="Checkout 1" s="wants 3 units"/><Bx x={10} y={170} w={150} h={44} t="Checkout 2" s="wants 2 units"/>
<Bx x={490} y={150} w={140} h={44} t="Stock ledger" s="the source of truth"/><T x={220} y={258} t="Pool: at most 1,000 rows per item and location"/></g>;
const s1=<g><T x={470} y={78} t="one row per unit," c={BLUE}/><T x={470} y={92} t="not one per item" c={BLUE}/></g>;
const s2=<g>{[0,1,2].map(i=>unit(i,"C1"))}<Ar x1={162} y1={92} x2={216} y2={92} m={M} c={BLUE}/></g>;
const s3=<g>{[3,4].map(i=>unit(i,"C2"))}<Ar x1={162} y1={192} x2={216} y2={150} m={M} c={BLUE}/><T x={10} y={232} t="skips rows 1–3, takes 4 and 5" c={BLUE}/></g>;
const s4=<g><Ar x1={488} y1={172} x2={454} y2={172} m={M} c={BLUE} dash/><T x={490} y={212} t="refills the pool" c={BLUE}/><T x={490} y={226} t="when it runs low" c={BLUE}/></g>;
const caps=[["1 · each unit for sale is one row: this item has 10 rows in its pool",INK],["2 · checkout 1 locks 3 rows with SELECT … FOR UPDATE SKIP LOCKED",BLUE],["3 · checkout 2 passes over the locked rows and takes 2 free ones; nobody waits",BLUE],["4 · when the pool runs low, a refill adds rows from the stock ledger",BLUE]];
return <Fig still={still} h={270} id={`skt${uid}`} M={M} caps={caps} title="Reserving stock with one row per unit. An item at one location has a pool of 10 unit rows; the pool holds at most 1,000. Checkout 1 wants 3 units and locks rows 1 to 3 with SELECT FOR UPDATE SKIP LOCKED. Checkout 2 wants 2 units; it passes over the locked rows and takes rows 4 and 5, so neither checkout waits for the other. When the pool runs low, a refill adds rows from the stock ledger, the source of truth."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Discord, FIG 1: an @everyone ping. Seven reads of channel 42 all route to data service B, which sends one
// query to ScyllaDB and shares the one answer.
function CoalesceFig({still,uid=""}){const M=`dc${uid}`,Y=[52,82,112,142,172,202,232];
const req=y=><g key={y}><rect x="10" y={y} width="128" height="22" fill="#fff" stroke={GREY}/><text x="74" y={y+15} textAnchor="middle" className="fl">read channel 42</text></g>;
const base=<g><Bx x={230} y={60} w={150} h={44} t="Data service A" s="other channels"/><Bx x={230} y={128} w={150} h={44} t="Data service B" s="channels incl. 42"/><Bx x={230} y={196} w={150} h={44} t="Data service C" s="other channels"/>
<Bx x={490} y={122} w={140} h={56} t="ScyllaDB" s="channel 42's partition"/></g>;
const s1=<g>{Y.map(req)}</g>;
const s2=<g>{Y.map(y=><line key={y} x1={138} y1={y+11} x2={228} y2={150} stroke={BLUE}/>)}<Bx x={230} y={128} w={150} h={44} t="Data service B" s="channels incl. 42" c={BLUE} fill={LB}/></g>;
const s3=<g><Ar x1={382} y1={142} x2={486} y2={142} m={M} c={BLUE}/><T x={434} y={134} t="1 query" a="middle" c={BLUE}/></g>;
const s4=<g><Ar x1={488} y1={160} x2={384} y2={160} m={M} c={BLUE} dash/><T x={434} y={176} t="1 answer" a="middle" c={BLUE}/><T x={230} y={268} t="shared by all 7 waiting reads: 1 query, not 7" c={BLUE}/></g>;
const caps=[["1 · an @everyone ping: thousands of people open the same channel at once",INK],["2 · routing by channel ID sends every one of those reads to data service B",BLUE],["3 · the first read starts one database query; the others wait for it",BLUE],["4 · one answer comes back and is shared by every waiting read",BLUE]];
return <Fig still={still} h={276} id={`dct${uid}`} M={M} caps={caps} title="Request coalescing at Discord. After an @everyone ping, seven readers at once ask for the latest messages in channel 42. Routing by channel ID sends all seven to data service B rather than A or C. The first request starts one query to ScyllaDB and the others wait for it. One answer comes back and is shared by all seven, so the database sees one query instead of seven."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Slack, FIG 1: Kafka in front of Redis. When workers slow down, the backlog builds in Kafka on disk, and
// JQRelay's rate limit keeps Redis well within its memory.
function KafkaBufferFig({still,uid=""}){const M=`sq${uid}`,X0=[8,114,220,326,432,538];
const B=[["Web app","PHP / Hack"],["Kafkagate","HTTP → Kafka"],["Kafka","on disk"],["JQRelay","rate limit"],["Redis","in memory"],["Workers","run the jobs"]];
const box=(i,c,fill,s)=><Bx key={i} x={X0[i]} y={96} w={86} h={48} t={B[i][0]} s={s||B[i][1]} c={c} fill={fill}/>;
const gauge=(x,f,c)=><g><rect x={x} y={160} width="86" height="12" fill="#fff" stroke={GREY}/>{f>0&&<rect x={x+1} y={161} width={84*f} height="10" fill={c}/>}</g>;
const base=<g>{B.map((_,i)=>box(i))}{gauge(220,0)}{gauge(432,0)}<T x={220} y={188} t="backlog"/><T x={432} y={188} t="memory"/></g>;
const s1=<g>{[0,1,2,3,4].map(i=><Ar key={i} x1={X0[i]+88} y1={120} x2={X0[i+1]-3} y2={120} m={M} c={BLUE}/>)}<T x={8} y={222} t="a normal day: up to 33,000 jobs a second flow straight through"/></g>;
const s2=<g>{box(5,RED,LR,"slowed down")}<T x={8} y={238} t="the database is struggling, so jobs finish slower than they arrive" c={RED}/></g>;
const s3=<g>{gauge(220,.85,FB)}<T x={220} y={202} t="millions of jobs, kept on disk" c={BLUE}/></g>;
const s4=<g>{box(3,BLUE,LB,"rate limit ↓")}{gauge(432,.3,FB)}<T x={432} y={202} t="well under the limit" c={BLUE}/></g>;
const caps=[["1 · every job: web app → Kafkagate → Kafka → JQRelay → Redis → workers",INK],["2 · workers slow down; before Kafka, this is where Redis filled up and jammed",RED],["3 · now the backlog waits in Kafka, on disk, and the web app keeps enqueueing",BLUE],["4 · JQRelay's rate limit matches the workers, so Redis never runs out of memory",BLUE]];
return <Fig still={still} h={250} id={`sqt${uid}`} M={M} caps={caps} title="Slack's job queue with Kafka in front of Redis. Every job goes from the web app to Kafkagate, into Kafka, through JQRelay into Redis, and on to the workers; on a normal day up to 33,000 jobs a second flow straight through. When the database struggles and workers slow down, jobs finish slower than they arrive. Before Kafka, this is where Redis filled its memory and the queue jammed. Now the backlog, millions of jobs, waits in Kafka on disk while the web app keeps enqueueing, and JQRelay's rate limit is turned down to match the workers, so Redis stays well under its memory limit."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Figma, FIG 1: last write wins per property. Different properties never conflict; for the same property
// the server's order decides, and a client ignores incoming values while its own change is unconfirmed.
function LwwFig({still,uid=""}){const M=`fg${uid}`;
const val=(y,t,c=INK)=><g><rect x="324" y={y-12} width="60" height="16" fill="#fff"/><text x="330" y={y} className="fl" style={{fill:c}}>{t}</text></g>;
const screen=(x,who,s,c=GREY,fill="#fff")=><Bx x={x} y={96} w={120} h={60} t={`${who}'s screen`} s={s} c={c} fill={fill}/>;
const base=<g><rect x="250" y="50" width="140" height="160" fill="#fff" stroke={GREY}/><text x="320" y="70" textAnchor="middle" className="fb">Server</text><text x="320" y="84" textAnchor="middle" className="fl">button 51</text>
{[["colour",116],["width",146],["text",176]].map(([p,y])=><text key={p} x="262" y={y} className="fl">{p}</text>)}{val(116,"grey")}{val(146,"100")}{val(176,"Menu")}
{screen(10,"Asha","button 51")}{screen(510,"Ben","button 51")}</g>;
const s1=<g><Ar x1={132} y1={108} x2={246} y2={108} m={M} c={BLUE}/><T x={190} y={100} t="colour = blue" a="middle" c={BLUE}/><Ar x1={508} y1={108} x2={394} y2={108} m={M} c={BLUE}/><T x={450} y={100} t="width = 120" a="middle" c={BLUE}/>{val(116,"blue",BLUE)}{val(146,"120",BLUE)}</g>;
const s2=<g><Ar x1={132} y1={146} x2={246} y2={146} m={M}/><T x={190} y={138} t="text = Buy" a="middle"/><Ar x1={508} y1={146} x2={394} y2={146} m={M}/><T x={450} y={138} t="text = Order" a="middle"/>{screen(10,"Asha","text: Buy")}{screen(510,"Ben","text: Order")}</g>;
const s3=<g>{val(176,"Buy")}<Ar x1={392} y1={190} x2={500} y2={190} m={M} c={GREY} dash/><T x={450} y={206} t="text = Buy" a="middle"/><X x={500} y={176}/>{screen(510,"Ben","Order (kept)",BLUE,LB)}<T x={420} y={250} t="his own change isn't confirmed yet" c={BLUE}/></g>;
const s4=<g>{val(176,"Order",BLUE)}<Ar x1={248} y1={190} x2={140} y2={190} m={M} c={BLUE} dash/><T x={190} y={206} t="text = Order" a="middle" c={BLUE}/>{screen(10,"Asha","text: Order",BLUE,LB)}<T x={10} y={250} t="last to reach the server wins" c={BLUE}/></g>;
const caps=[["1 · Asha changes the colour and Ben the width: different properties, no conflict",BLUE],["2 · then both change the text, the same property, at nearly the same moment",INK],["3 · Asha's 'Buy' arrives first; Ben ignores it, his own change is unconfirmed",BLUE],["4 · Ben's 'Order' arrives last, so it wins and goes to everyone: no flicker",BLUE]];
return <Fig still={still} h={264} id={`fgt${uid}`} M={M} caps={caps} title="Last write wins for each property, as in Figma. The server holds button 51's colour, width and text. Asha changes the colour to blue while Ben changes the width to 120: different properties, so both are kept. Then both change the text at nearly the same moment, Asha to Buy and Ben to Order. Asha's Buy reaches the server first and is sent on to Ben, who ignores it because his own change is not yet confirmed, so his screen keeps showing Order. Ben's Order reaches the server last, so it wins and is sent to Asha. Both end on Order, and neither screen flickers."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Spotify, FIG 1: a chain of dependent reads per file, or one index lookup and parallel ranged reads (RAP).
function RapFig({still,uid=""}){const M=`rp${uid}`,CX=[10,166,322,478];
const C=[["Footer","where things are"],["Row-group metadata","which row groups"],["Key column","which rows"],["Pages","the data itself"]];
const link=i=><g key={i}><Bx x={CX[i]} y={60} w={140} h={40} t={C[i][0]} s={C[i][1]} c={RED} fill={LR}/><T x={CX[i]+70} y={116} t={`round trip ${i+1}`} a="middle" c={RED}/>{i>0&&<Ar x1={CX[i]-15} y1={80} x2={CX[i]-2} y2={80} m={M} c={RED}/>}</g>;
const base=<g><text x="10" y="50" className="fk">WITHOUT AN INDEX · EVERY FILE</text><text x="10" y="166" className="fk">WITH RAP</text></g>;
const s1=link(0);
const s2=<g>{[1,2,3].map(link)}<T x={10} y={138} t="4 round trips in a row, each waiting for the last, per file and column" c={RED}/></g>;
const s3=<g><Bx x={10} y={180} w={150} h={44} t="External index" s="user 77 → files, rows" c={BLUE} fill={LB}/><Ar x1={162} y1={202} x2={186} y2={202} m={M} c={BLUE}/><Bx x={190} y={180} w={150} h={44} t="Cached metadata" s="rows → byte ranges" c={BLUE} fill={LB}/></g>;
const s4=<g>{["file 3","file 9","file 12"].map((f,i)=><g key={f}><Ar x1={342} y1={202} x2={396} y2={185+i*32} m={M} c={BLUE}/><Bx x={400} y={172+i*32} w={230} h={26} t={`${f} · one ranged read`} c={BLUE} fill={LB}/></g>)}<T x={10} y={282} t="1 round trip: the ranged reads all go out together" c={BLUE}/></g>;
const caps=[["1 · without an index, a file is opened by reading its footer to learn its layout",INK],["2 · then metadata, the key column, the pages: each read waits for the last",RED],["3 · with RAP, one lookup in the external index gives the files and rows",BLUE],["4 · cached metadata turns rows into byte ranges; the ranged reads go out at once",BLUE]];
return <Fig still={still} h={290} id={`rpt${uid}`} M={M} caps={caps} title="Reading one user's data from Parquet files. Without an index, every file needs four reads in a row: the footer, to learn where things are; the row-group metadata; the key column, to find the user's rows; and finally the pages holding the data. Each read waits for the one before, for every file and column. With Random Access Parquet, one lookup in an external index returns the files and row numbers for user 77, cached metadata turns those rows into byte ranges, and one ranged read per file, here files 3, 9 and 12, goes out at the same time: a single round trip."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Meta, FIG 1: direct access is a mesh whose fan-in grows with every client; through ZGateway, clients reach
// a few regional gateways and database hosts see only the gateway fleet.
function ZGatewayFig({still,uid=""}){const M=`zg${uid}`,Y=[62,98,134,170,206],G=[90,170];
const cl=(x,i,c,fill)=><Bx key={i} x={x} y={Y[i]} w={74} h={22} t={`client ${i+1}`} c={c} fill={fill}/>;
const host=(x,i,w)=><Bx key={i} x={x} y={Y[i]} w={w} h={22} t={`DB host ${i+1}`}/>;
const base=<g><text x="10" y="50" className="fk">DIRECT ACCESS</text><text x="340" y="50" className="fk">THROUGH ZGATEWAY</text>
{[0,1,2,3].map(i=>cl(10,i))}{Y.map((_,i)=>host(206,i,90))}{Y.map((_,i)=>cl(340,i))}{G.map(y=><Bx key={y} x={452} y={y} w={74} h={30} t="ZGateway"/>)}{Y.map((_,i)=>host(556,i,74))}</g>;
const mesh=(i,c)=>Y.map((y,j)=><line key={`${i}-${j}`} x1={84} y1={Y[i]+11} x2={206} y2={y+11} stroke={c}/>);
const s1=<g>{[0,1,2,3].map(i=>mesh(i,GREY))}</g>;
const s2=<g>{cl(10,4,RED,LR)}{mesh(4,RED)}<T x={10} y={250} t="+1 connection on every host, per new client" c={RED}/></g>;
const s3=<g>{Y.map((y,i)=>G.map(g=><line key={`${i}-${g}`} x1={414} y1={y+11} x2={452} y2={g+15} stroke={BLUE}/>))}{G.map(y=><Bx key={y} x={452} y={y} w={74} h={30} t="ZGateway" c={BLUE} fill={LB}/>)}</g>;
const s4=<g>{G.map(g=>Y.map((y,i)=><line key={`${g}-${i}`} x1={526} y1={g+15} x2={556} y2={y+11} stroke={BLUE}/>))}<T x={340} y={250} t="hosts see only the gateways: ~97% fewer" c={BLUE}/></g>;
const caps=[["1 · direct access: every client connects to every database host it uses",INK],["2 · each new client adds a connection to every host, so the load keeps growing",RED],["3 · with ZGateway, clients connect only to their regional gateways",BLUE],["4 · database hosts see only the gateway fleet: about 97% fewer connections each",BLUE]];
return <Fig still={still} h={264} id={`zgt${uid}`} M={M} caps={caps} title="Connections with and without a proxy. With direct access, each of four clients connects to all five database hosts it uses, a mesh of 20 connections; a fifth client adds one more connection to every host, so each host's connections grow with the number of clients. Through ZGateway, the five clients connect only to two regional gateways, and the database hosts see connections only from the gateways, a fleet whose size Meta controls. Meta estimates about 97% fewer connections per host."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

export const FIGS={
"shopify-skip-locked":{C:SkipLockedFig,ar:640/270,title:()=>"TWO CHECKOUTS, DIFFERENT ROWS"},
"discord-coalesce":{C:CoalesceFig,ar:640/276,title:()=>"MANY READS, ONE QUERY"},
"slack-kafka-buffer":{C:KafkaBufferFig,ar:640/250,title:()=>"KAFKA TAKES THE BACKLOG, REDIS STAYS SAFE"},
"figma-lww":{C:LwwFig,ar:640/264,title:()=>"WHO WINS WHEN TWO PEOPLE EDIT"},
"spotify-rap":{C:RapFig,ar:640/290,title:()=>"A CHAIN OF READS, OR ONE LOOKUP"},
"meta-zgateway":{C:ZGatewayFig,ar:640/264,title:()=>"FROM A MESH TO TWO BOUNDED HOPS"},
};
