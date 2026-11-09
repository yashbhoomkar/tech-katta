// Research Papers › Must know: the figures this sub-tab's articles draw (site.json dashboard.groups.papers, "must-know").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Show,Mark,Mk,Bx,Ar,Caps,Cap,Life,Msg,INK,GREY,RED,BLUE}from"../parts.jsx";

// Lamport clocks, FIG 1: the counting rule. Menu server B (clock 300 ms fast) marks paneer tikka sold
// out at count 7 and tells order server A; A takes max(3, 7) + 1 = 8, refuses an order at 9 and tells
// support log C, which takes max(1, 9) + 1 = 10. By count the cause comes first; by wall clock the
// refusal (12:00:00.260) looks earlier than the sold-out (12:00:00.500).
function LamportClocksFig({still,uid=""}){const M=`lc${uid}`,D="12s",Y={B:90,A:160,C:230};
const lane=(y,name,sub,subc)=><g><text x="10" y={y-4} className="fb">{name}</text><text x="10" y={y+12} className="fl" style={subc?{fill:subc}:undefined}>{sub}</text><line x1="150" y1={y} x2="630" y2={y} stroke={GREY}/></g>;
// an event: its count above the dot, its label below (left of the dot when an arrow leaves to the right)
const ev=(x,y,n,label,left,c=BLUE)=><g><circle cx={x} cy={y} r="5" fill={c}/><text x={x} y={y-12} textAnchor="middle" className="fb" style={{fill:c}}>{n}</text><text x={left?x-8:x} y={y+20} textAnchor={left?"end":"middle"} className="fl">{label}</text></g>;
const wall=(x,y,t)=><text x={x-8} y={y+36} textAnchor="end" className="fl" style={{fill:RED}}>wall clock {t}</text>;
const start=(y,n)=><text x="160" y={y-8} className="fl">count {n}</text>;
const msg=(x1,y1,x2,y2,n)=><g><line x1={x1} y1={y1} x2={x2} y2={y2-6} stroke={INK} markerEnd={`url(#${M})`}/><text x={(x1+x2)/2+14} y={(y1+y2)/2} className="fl">carries {n}</text></g>;
const caps=[["1 · each machine counts its own events: B is at 6, A at 3, C at 1",INK],["2 · B marks paneer tikka sold out: count 7, sent to A with the 7",BLUE],["3 · A takes max(3, 7) + 1 = 8, refuses an order at 9, tells C",BLUE],["4 · C takes max(1, 9) + 1 = 10: the cause always has the smaller number",BLUE]];
const s1=<g>{start(Y.B,6)}{start(Y.A,3)}{start(Y.C,1)}</g>;
const s2=<g>{ev(220,Y.B,7,"sold out",1)}{wall(220,Y.B,"12:00:00.500")}</g>;
const s3=<g>{msg(220,Y.B,300,Y.A,7)}{ev(300,Y.A,8,"got it")}{ev(440,Y.A,9,"refused an order",1)}{wall(440,Y.A,"12:00:00.260")}</g>;
const s4=<g>{msg(440,Y.A,560,Y.C,9)}{ev(560,Y.C,10,"logged")}<text x="10" y="284" className="fl"><tspan style={{fill:BLUE}}>by count: sold out 7 → refused 9 → logged 10</tspan><tspan dx="12" style={{fill:RED}}>by wall clock: refused (.260) before sold out (.500)</tspan></text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`lct${uid}`}><title id={`lct${uid}`}>Three machines count their own events. Menu server B, whose clock runs 300 milliseconds fast, marks paneer tikka sold out at count 7 and sends the update to order server A with the number 7. A was at 3; it takes the bigger of 3 and 7 and adds one, so receiving is event 8, and refusing a customer's order is event 9. A tells support log C, which was at 1 and becomes 10. Sorted by count, the sold-out comes before the refusal. Sorted by the machines' wall clocks, the refusal at 12:00:00.260 looks earlier than the sold-out at 12:00:00.500.</title><Mark m={M}/>
{lane(Y.B,"Menu server B","clock 300 ms fast",RED)}{lane(Y.A,"Order server A","clock right")}{lane(Y.C,"Support log C","clock right")}
{still?<g>{s1}{s2}{s3}{s4}<text x="10" y="30" className="fb" style={{fill:BLUE}}>{caps[3][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Show t0={0} t1={1} dur={D}>{s1}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show>
<Dot x1={220} x2={300} y={Y.B} y2={Y.A} t0={.3} t1={.45} dur={D}/>
<Show t0={.5} t1={1} dur={D}>{s3}</Show>
<Dot x1={440} x2={560} y={Y.A} y2={Y.C} t0={.6} t1={.72} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Lamport clocks, FIG 2: one order for everyone. The same three requests reach machines A, B and C in
// different orders. Each sorts by (count, machine name): 5·A, 5·C, 6·B. The two holds on seat 14 both
// have count 5, so the tie goes to machine A on every copy, and every copy gives seat 14 to A's customer.
function LamportOrderFig({still,uid=""}){const D="10s";
const R={a:"5 · A  hold seat 14",c:"5 · C  hold seat 14",b:"6 · B  cancel seat 9"};
const cols=[["Machine A",["a","b","c"]],["Machine B",["b","c","a"]],["Machine C",["c","a","b"]]],X=[10,225,440];
const caps=[["1 · the same three requests reach each machine in a different order",INK],["2 · each sorts by count, then by machine name: 5·A, 5·C, 6·B",BLUE],["3 · one order everywhere, so every copy gives seat 14 to A's customer",BLUE]];
const arrived=<g>{cols.map(([name,order],i)=><g key={name}><text x={X[i]} y="70" className="fb">{name}</text><text x={X[i]} y="90" className="fl">arrived</text>
{order.map((k,j)=><text key={k} x={X[i]} y={112+j*20} className="fq">{R[k]}</text>)}</g>)}</g>;
const sorted=<g>{cols.map(([name],i)=><g key={name}><text x={X[i]} y="186" className="fl" style={{fill:BLUE}}>sorted by (count, machine)</text>
{["a","c","b"].map((k,j)=><text key={k} x={X[i]} y={208+j*20} className="fq" style={{fill:BLUE}}>{R[k]}</text>)}</g>)}</g>;
const win=<g>{X.map(x=><rect key={x} x={x-4} y="194" width="190" height="20" fill="none" stroke={BLUE} strokeWidth="2"/>)}<text x="10" y="276" className="fl" style={{fill:BLUE}}>A and C both said 5: the tie goes to the earlier machine name, A, on every copy</text></g>;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`lot${uid}`}><title id={`lot${uid}`}>Three requests are stamped with Lamport counts: 5 from machine A to hold seat 14, 5 from machine C to hold seat 14, and 6 from machine B to cancel seat 9. They reach machines A, B and C in three different orders. Each machine sorts them by count and breaks the tie by machine name, so every machine gets the same list: A's hold, C's hold, B's cancel. Every copy therefore gives seat 14 to the customer on machine A.</title>
{arrived}
{still?<g>{sorted}{win}<text x="10" y="30" className="fb" style={{fill:BLUE}}>{caps[2][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/3} t1={(i+1)/3} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Show t0={1/3} t1={1} dur={D}>{sorted}</Show><Show t0={2/3} t1={1} dur={D}>{win}</Show></g>}</svg>}

// GFS, FIG 1: a read. The report job asks the master where chunk 3 of a log file is; the master answers
// from memory (chunk c7, on servers 1, 2 and 3); the job reads the 64 MB straight from the nearest copy.
// The data never passes through the master.
function GfsReadFig({still,uid=""}){const M=`gr${uid}`,D="12s",X={c:80,m:255,s1:400,s2:490,s3:580};
const caps=[["1 · the report job asks the master where chunk 3 of the file is",INK],["2 · the master answers from memory: chunk c7, on servers 1, 2 and 3",BLUE],["3 · the job asks the nearest copy, server 2, for the chunk",BLUE],["4 · 64 MB comes straight back; the master never touched the data",BLUE]];
const m=[<Msg key={1} x1={X.c} x2={X.m} y={112} t="where is chunk 3?" m={M}/>,<Msg key={2} x1={X.m} x2={X.c} y={152} t="c7 · servers 1, 2, 3" m={M} c={BLUE}/>,<Msg key={3} x1={X.c} x2={X.s2} y={192} t="read c7" tx={150} m={M}/>,<g key={4}><Msg x1={X.s2} x2={X.c} y={232} t="64 MB of order data" tx={150} m={M} c={BLUE} w={4}/><text x={X.m} y="272" textAnchor="middle" className="fl" style={{fill:BLUE}}>the master only answers small questions</text></g>];
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`grt${uid}`}><title id={`grt${uid}`}>A sequence diagram of a read in the Google File System. The report job asks the master which servers hold chunk 3 of a log file. The master, which keeps all file metadata in memory, answers: chunk c7, stored on servers 1, 2 and 3. The job then asks the nearest of them, server 2, and 64 MB of data comes back directly. The data never passes through the master.</title><Mk m={M}/>
<Life x={X.c} t="Report job" s="the client" y1={280}/><Life x={X.m} t="Master" s="metadata in memory" y1={256}/><Life x={X.s1} t="Server 1" s="copy of c7" y1={280}/><Life x={X.s2} t="Server 2" s="copy of c7" y1={280}/><Life x={X.s3} t="Server 3" s="copy of c7" y1={280}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.c} x2={X.m} y={112} t0={.04} t1={.18} dur={D}/><Dot x1={X.m} x2={X.c} y={152} t0={.29} t1={.43} dur={D}/><Dot x1={X.c} x2={X.s2} y={192} t0={.54} t1={.68} dur={D}/>
{[0,1,2].map(k=><Dot key={k} x1={X.s2} x2={X.c} y={232} t0={.78+k*.04} t1={.9+k*.04} dur={D}/>)}</g>}</svg>}

// GFS, FIG 2: a write. The master names server 1 primary for chunk c7 (it holds a 60-second lease). The
// data flows along a chain, client to server 1 to 2 to 3, each passing it on as it arrives. Then the client
// says "write it"; the primary numbers the write #12 and tells the others; they reply ok; the primary says done.
function GfsWriteFig({still,uid=""}){const M=`gw${uid}`,D="14s",X={c:60,m:180,s1:320,s2:450,s3:580};
const caps=[["1 · the master names a primary for chunk c7: server 1 holds a 60-second lease",INK],["2 · the data flows down a chain, each server passing it on as it arrives",BLUE],["3 · 'write it': server 1 numbers the write #12 and tells the others",BLUE],["4 · all three wrote #12 in the same place: server 1 says done",BLUE]];
const m=[<Msg key={1} x1={X.m} x2={X.c} y={108} t="primary: server 1" m={M} dash/>,
<g key={2}><Msg x1={X.c} x2={X.s1} y={140} t="data" m={M} c={BLUE} w={3}/><Msg x1={X.s1} x2={X.s2} y={155} m={M} c={BLUE} w={3}/><Msg x1={X.s2} x2={X.s3} y={170} m={M} c={BLUE} w={3}/></g>,
<g key={3}><Msg x1={X.c} x2={X.s1} y={208} t="write it" m={M}/><Msg x1={X.s1} x2={X.s2} y={232} t="write as #12" m={M}/><Msg x1={X.s1} x2={X.s3} y={252} m={M}/></g>,
<g key={4}><Msg x1={X.s2} x2={X.s1} y={274} t="ok" m={M} dash/><Msg x1={X.s3} x2={X.s1} y={288} m={M} dash/><Msg x1={X.s1} x2={X.c} y={302} t="done" m={M} c={BLUE}/></g>];
return <svg viewBox="0 0 640 320" role="img" aria-labelledby={`gwt${uid}`}><title id={`gwt${uid}`}>A sequence diagram of a write in the Google File System. The master tells the writer that server 1 is the primary for chunk c7, because it holds a 60-second lease. The writer pushes the data to server 1, which passes it to server 2 as it arrives, which passes it to server 3. Then the writer tells server 1 to write it. Server 1 gives the write a serial number, 12, and tells servers 2 and 3 to apply it as write 12. Both reply ok, and server 1 tells the writer it is done, so all three copies hold the same bytes in the same order.</title><Mk m={M}/>
<Life x={X.c} t="Log writer" s="the client" y1={312}/><Life x={X.m} t="Master" y1={312}/><Life x={X.s1} t="Server 1" s="primary, has the lease" y1={312}/><Life x={X.s2} t="Server 2" y1={312}/><Life x={X.s3} t="Server 3" y1={312}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.m} x2={X.c} y={108} t0={.04} t1={.16} dur={D}/><Dot x1={X.c} x2={X.s1} y={140} t0={.28} t1={.36} dur={D}/><Dot x1={X.s1} x2={X.s2} y={155} t0={.33} t1={.41} dur={D}/><Dot x1={X.s2} x2={X.s3} y={170} t0={.38} t1={.46} dur={D}/>
<Dot x1={X.c} x2={X.s1} y={208} t0={.53} t1={.6} dur={D}/><Dot x1={X.s1} x2={X.s2} y={232} t0={.61} t1={.68} dur={D}/><Dot x1={X.s1} x2={X.s3} y={252} t0={.63} t1={.71} dur={D}/><Dot x1={X.s1} x2={X.c} y={302} t0={.84} t1={.94} dur={D}/></g>}</svg>}

// MapReduce, FIG 1: counting orders per dish. Three pieces of a day's order logs go to three map workers;
// map turns each order into (dish, 1) and buckets it by dish; each reducer fetches its bucket from every
// map worker (the shuffle) and adds up the 1s: biryani 3, dosa 2, paneer 2, thali 1.
function MrFlowFig({still,uid=""}){const M=`mf${uid}`,D="12s",R=[80,140,200],RR=[100,190];
const caps=[["1 · a day of order logs is cut into pieces; each piece goes to a map worker",INK],["2 · map turns each order into (dish, 1) and buckets it by dish on its own disk",BLUE],["3 · the shuffle: each reducer fetches its bucket from every map worker",BLUE],["4 · reduce adds up the 1s: biryani 3, dosa 2, paneer 2, thali 1",BLUE]];
const logs=[["logs part 1","biryani, dosa, paneer"],["logs part 2","biryani, thali, dosa"],["logs part 3","paneer, biryani"]];
const fixed=<g>{["INPUT","MAP","REDUCE","OUTPUT"].map((h,i)=><text key={h} x={[10,180,350,510][i]} y="50" className="fl">{h}</text>)}
{logs.map(([t,s],i)=><Bx key={t} x={10} y={R[i]-20} w={140} h={40} t={t} s={s}/>)}{R.map(y=><g key={y}><Ar x1={150} y1={y} x2={177} y2={y} m={M}/><Bx x={180} y={y-20} w={110} h={40} t="map" s="dish → 1" c={BLUE}/></g>)}
{R.map(y=>RR.map(z=><Ar key={y+"-"+z} x1={290} y1={y} x2={347} y2={z} m={M} c={GREY}/>))}
<Bx x={350} y={RR[0]-25} w={140} h={50} t="reduce a–m" s="adds up the 1s" c={BLUE}/><Bx x={350} y={RR[1]-25} w={140} h={50} t="reduce n–z" s="adds up the 1s" c={BLUE}/></g>;
const pairs=<text x="180" y="246" className="fl" style={{fill:BLUE}}>(biryani, 1) (dosa, 1) (paneer, 1) …</text>;
const out=<g>{RR.map((y,i)=><g key={y}><Ar x1={490} y1={y} x2={507} y2={y} m={M}/><Bx x={510} y={y-25} w={120} h={50} t={i?"paneer 2":"biryani 3"} s={i?"thali 1":"dosa 2"} c={BLUE} fill="#f8faff"/></g>)}</g>;
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`mft${uid}`}><title id={`mft${uid}`}>MapReduce counting orders per dish. A day of order logs is split into three pieces, each given to a map worker. Map turns every order into the pair dish and 1, and writes the pairs to its own disk in buckets by dish. In the shuffle, the reducer for dishes a to m fetches its bucket from all three map workers, and so does the reducer for n to z. Each reducer adds up the ones: biryani 3 and dosa 2, paneer 2 and thali 1.</title><Mk m={M}/>
{fixed}{still?<g>{pairs}{out}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
{R.map((y,i)=><Dot key={y} x1={60} x2={235} y={y} t0={.04+i*.03} t1={.18+i*.03} dur={D}/>)}<Show t0={.25} t1={1} dur={D}>{pairs}</Show>
{R.map((y,i)=>RR.map((z,j)=><Dot key={y+"-"+z} x1={290} x2={350} y={y} y2={z} t0={.52+i*.03+j*.02} t1={.64+i*.03+j*.02} dur={D}/>))}
{RR.map(y=><Dot key={y} x1={420} x2={570} y={y} t0={.78} t1={.9} dur={D}/>)}<Show t0={.75} t1={1} dur={D}>{out}</Show></g>}</svg>}

// MapReduce, FIG 2: failures and stragglers, on a timeline. Worker 3 dies after finishing map 3; its output
// was on its own disk, so map 3 runs again on worker 1. Near the end, worker 4 is crawling through reduce 2,
// so the master starts a backup copy on worker 2; the backup finishes first and the job ends.
function MrStragglerFig({still,uid=""}){const D="12s",Y=[80,122,164,206],bar=(x1,x2,y,t,c=GREY,fill="#fff",dash)=><g><rect x={x1} y={y-12} width={x2-x1} height="24" fill={fill} stroke={c} strokeDasharray={dash?"4 3":undefined}/><text x={x1+6} y={y+4} className="fl" style={c!==GREY?{fill:c}:undefined}>{t}</text></g>;
const caps=[["1 · four workers run the map and reduce tasks; the master pings each one",INK],["2 · worker 3 dies; its map output was on its own disk, so map 3 runs again",RED],["3 · near the end worker 4 is crawling, so the master starts a backup of reduce 2",BLUE],["4 · the backup finishes first and wins: the job doesn't wait for worker 4",BLUE]];
const base=<g>{Y.map((y,i)=><text key={y} x="10" y={y+4} className="fb">worker {i+1}</text>)}<line x1="100" y1="232" x2="630" y2="232" stroke={GREY}/><text x="100" y="250" className="fl">time →</text>
{bar(100,220,Y[0],"map 1")}{bar(100,230,Y[1],"map 2")}{bar(250,420,Y[1],"reduce 1")}{bar(100,240,Y[2],"map 3")}{bar(250,600,Y[3],"reduce 2")}</g>;
const s2=<g><text x="296" y={Y[2]+5} className="fb" style={{fill:RED}}>✕ dies</text><rect x="100" y={Y[2]-12} width="140" height="24" fill="#fff5f4" opacity=".7" stroke={RED} strokeDasharray="4 3"/>{bar(330,450,Y[0],"map 3, again",BLUE,"#f8faff")}</g>;
const s3=<g>{bar(440,550,Y[1],"reduce 2 backup",BLUE,"#f8faff")}<text x="604" y={Y[3]+4} className="fl" style={{fill:RED}}>slow</text></g>;
const s4=<g><line x1="550" y1="56" x2="550" y2="232" stroke={BLUE} strokeWidth="2"/><text x="546" y="252" textAnchor="end" className="fl" style={{fill:BLUE}}>job done</text><rect x="550" y={Y[3]-12} width="50" height="24" fill="#fff" stroke={GREY} strokeDasharray="4 3"/><text x="556" y={Y[3]+4} className="fl">stopped</text></g>;
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`mst${uid}`}><title id={`mst${uid}`}>A timeline of four MapReduce workers. Worker 3 finishes map 3 and then dies; because its output was stored on its own disk, the master runs map 3 again on worker 1. Near the end of the job, worker 4 is still slowly running reduce 2, so the master starts a backup copy of reduce 2 on worker 2. The backup finishes first, the job is marked done at that moment, and the slow copy on worker 4 is stopped.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Dynamo, FIG 1: the ring. A cart's key is hashed to a point on the ring and kept on the next three nodes
// clockwise (B, C, D). C is down, so E takes the write too, with a hint that it belongs to C; when C is back,
// E hands the copy over (hinted handoff). Left: N = 3, W = 2, R = 2.
function DynamoRingFig({still,uid=""}){const D="14s",cx=440,cy=160,r=100,at=d=>[cx+r*Math.cos(d*Math.PI/180),cy+r*Math.sin(d*Math.PI/180)];
const N=[["A",-90],["B",-30],["C",30],["D",90],["E",150],["F",210]].map(([n,d])=>[n,...at(d)]),P=Object.fromEntries(N.map(([n,x,y])=>[n,[x,y]])),K=at(-60);
const caps=[["1 · the cart's key is hashed to a point on the ring",INK],["2 · it is kept on the next three nodes clockwise: B, C and D",BLUE],["3 · C is down: E takes the write too, with a note that it belongs to C",RED],["4 · C is back: E hands the copy over and deletes its own",BLUE]];
const node=(n,c=GREY,fill="#fff",dash)=><g key={n}><circle cx={P[n][0]} cy={P[n][1]} r="16" fill={fill} stroke={c} strokeWidth={c===GREY?1:2} strokeDasharray={dash?"4 3":undefined}/><text x={P[n][0]} y={P[n][1]+4} textAnchor="middle" className="fb">{n}</text></g>;
const base=<g><circle cx={cx} cy={cy} r={r} fill="none" stroke={GREY}/>{N.map(([n])=>node(n))}<path d={`M${K[0]} ${K[1]-6}l6 6-6 6-6-6z`} fill={INK}/><text x={K[0]+10} y={K[1]-12} className="fl">hash(cart:u42)</text>
{["N = 3: kept on the next 3 nodes","W = 2: a write waits for 2 of them","R = 2: a read asks 2 of them","2 + 2 > 3, so every read reaches","at least one copy of the latest write"].map((t,i)=><text key={t} x="10" y={70+i*18} className="fl">{t}</text>)}</g>;
const s2=<g>{["B","C","D"].map(n=>node(n,BLUE,"#f8faff"))}</g>,s3=<g>{node("C",RED,"#fff5f4",1)}{node("E",BLUE,"#f8faff")}<text x={P.E[0]-22} y={P.E[1]+4} textAnchor="end" className="fl" style={{fill:BLUE}}>hint: for C</text></g>;
const s4=<g>{node("C",BLUE,"#f8faff")}<text x={cx} y={cy+4} textAnchor="middle" className="fl" style={{fill:BLUE}}>handed back to C</text></g>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`drt${uid}`}><title id={`drt${uid}`}>Dynamo's consistent-hashing ring with six nodes, A to F. The key of a shopping cart is hashed to a point between A and B, so the cart is stored on the next three nodes clockwise: B, C and D. With three copies, a write waits for two of them and a read asks two of them, so every read reaches at least one copy of the latest write. When C is down, node E accepts the write instead, with a hint saying it belongs to C. When C comes back, E hands the copy over and deletes its own: hinted handoff.</title>
{base}{still?<g>{s2}{node("E",BLUE,"#f8faff")}<text x={P.E[0]-22} y={P.E[1]+4} textAnchor="end" className="fl" style={{fill:BLUE}}>hint: for C</text>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={.5} dur={D}>{s2}</Show>{["B","C","D"].map((n,i)=><Dot key={n} x1={K[0]} x2={P[n][0]} y={K[1]} y2={P[n][1]} t0={.27+i*.04} t1={.37+i*.04} dur={D}/>)}
<Show t0={.5} t1={.75} dur={D}>{node("B",BLUE,"#f8faff")}{node("D",BLUE,"#f8faff")}{s3}</Show><Dot x1={K[0]} x2={P.E[0]} y={K[1]} y2={P.E[1]} t0={.52} t1={.64} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{node("B",BLUE,"#f8faff")}{node("D",BLUE,"#f8faff")}{s4}</Show><Dot x1={P.E[0]} x2={P.C[0]} y={P.E[1]} y2={P.C[1]} t0={.78} t1={.9} dur={D}/></g>}</svg>}

// Dynamo, FIG 2: two versions of one cart. Saved once through node X ([X:1]); during a network split naan
// is added through X ([X:2]) and lassi through Y ([X:1, Y:1]); a read gets both because neither clock is
// newer; the cart keeps every item and saves [X:3, Y:1], which is newer than both.
function DynamoVersionsFig({still,uid=""}){const M=`dv${uid}`,D="12s";
const caps=[["1 · the cart is saved once, through node X: version [X:1]",INK],["2 · the network splits: naan is added through X, lassi through Y",BLUE],["3 · the next read gets both: neither clock is newer, so it can't pick one",RED],["4 · the cart keeps every item and saves [X:3, Y:1], newer than both",BLUE]];
const v1=<Bx x={10} y={107} w={130} h={46} t="biryani" s="[X:1]"/>;
const s2=<g><Ar x1={140} y1={122} x2={178} y2={80} m={M}/><Ar x1={140} y1={138} x2={178} y2={180} m={M}/><Bx x={180} y={50} w={130} h={46} t="biryani, naan" s="[X:2] via X" c={BLUE}/><Bx x={180} y={165} w={130} h={46} t="biryani, lassi" s="[X:1, Y:1] via Y" c={BLUE}/></g>;
const s3=<g><Ar x1={310} y1={80} x2={348} y2={122} m={M}/><Ar x1={310} y1={180} x2={348} y2={138} m={M}/><Bx x={350} y={107} w={130} h={46} t="read: both" s="neither is newer" c={RED} fill="#fff5f4"/></g>;
const s4=<g><Ar x1={480} y1={130} x2={494} y2={130} m={M}/><Bx x={497} y={107} w={137} h={46} t="biryani, naan, lassi" s="[X:3, Y:1]" c={BLUE} fill="#f8faff" sw={2}/><text x="10" y="248" className="fl">A removed item can come back the same way: the price of never refusing a write.</text></g>;
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`dvt${uid}`}><title id={`dvt${uid}`}>Two versions of one shopping cart in Dynamo. The cart holding biryani is saved through node X with the vector clock X 1. The network splits: naan is added through node X, giving clock X 2, and lassi is added through node Y, giving clock X 1, Y 1. The next read gets both versions, because neither clock is newer than the other. The cart merges them by keeping every item, and saves biryani, naan and lassi with clock X 3, Y 1, which is newer than both. A removed item can reappear the same way.</title><Mk m={M}/>
{v1}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Raft, FIG 1: log replication. Five servers; the leader S1 (term 3) adds entry 6 "restaurant 88: closed",
// sends it to the followers, and once S2 and S3 have stored it (3 of 5) it is committed. S4 and S5 were
// behind and catch up on the next heartbeat.
function RaftLogFig({still,uid=""}){const D="12s",Y=[66,106,146,186,226],X=i=>110+i*44,T=[1,1,2,3,3,3],have=[5,5,5,4,3];
const cell=(i,y,c=GREY,fill="#fff")=><g key={i+"-"+y}><rect x={X(i)} y={y-13} width="38" height="26" fill={fill} stroke={c}/><text x={X(i)+19} y={y+4} textAnchor="middle" className="fl">t{T[i]}</text></g>;
const caps=[["1 · the leader adds 'restaurant 88: closed' as entry 6, in term 3",INK],["2 · it sends the entry to the four followers",BLUE],["3 · S2 and S3 store it: 3 of 5 is a majority, so entry 6 is committed",BLUE],["4 · S4 and S5 were behind; the next heartbeat fills in what they miss",BLUE]];
const base=<g>{T.map((_,i)=><text key={i} x={X(i)+19} y="46" textAnchor="middle" className="fl">{i+1}</text>)}{Y.map((y,r)=><g key={y}><text x="10" y={y+4} className="fb" style={r?undefined:{fill:BLUE}}>{r?`S${r+1}`:"S1 leader"}</text>{Array.from({length:have[r]},(_,i)=>cell(i,y))}</g>)}</g>;
const s1=cell(5,Y[0],BLUE,"#f8faff"),s3=<g>{cell(5,Y[1],BLUE,"#f8faff")}{cell(5,Y[2],BLUE,"#f8faff")}<rect x={X(5)-4} y={Y[0]-18} width="46" height={Y[2]-Y[0]+36} fill="none" stroke={BLUE} strokeWidth="2"/><text x="400" y={Y[1]+4} className="fl" style={{fill:BLUE}}>on 3 of 5 servers: committed,</text><text x="400" y={Y[1]+20} className="fl" style={{fill:BLUE}}>applied, the client gets ok</text></g>;
const s4=<g>{cell(4,Y[3])}{cell(5,Y[3],BLUE,"#f8faff")}{cell(3,Y[4])}{cell(4,Y[4])}{cell(5,Y[4],BLUE,"#f8faff")}<text x="400" y={Y[4]-16} className="fl">caught up on the next heartbeat</text></g>;
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`rlt${uid}`}><title id={`rlt${uid}`}>Raft log replication across five servers. The leader, S1, adds entry 6, restaurant 88 closed, in term 3. It sends the entry to the four followers. S2 and S3 store it, so three of five servers have it, a majority, and entry 6 is committed: the leader applies it and tells the client ok. S4 was one entry behind and S5 three entries behind; the next heartbeat fills in the entries they miss.</title>
{base}{still?<g>{s1}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.05} t1={1} dur={D}>{s1}</Show>{Y.slice(1).map((y,i)=><Dot key={y} x1={X(5)+19} x2={X(5)+19} y={Y[0]} y2={y} t0={.28+i*.03} t1={.42+i*.03} dur={D}/>)}
<Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Raft, FIG 2: who may become leader. S1 (the leader) stops. S5's timer fires first, but its log ends at
// entry 3 of term 2, so S2, S3 and S4 refuse. S2's timer fires next; its log is up to date, so S3, S4 and S5
// vote yes and S2 leads term 5, already holding every committed entry.
function RaftVoteFig({still,uid=""}){const D="12s",X=[10,135,260,385,510],W=115,cxo=i=>X[i]+W/2;
const S=[["S1","the leader"],["S2","log ends 6 · t3"],["S3","log ends 6 · t3"],["S4","log ends 5 · t3"],["S5","log ends 3 · t2"]];
const caps=[["1 · the leader S1 stops; the others stop hearing its heartbeats",RED],["2 · S5's timer fires first, but its log is behind, so the others refuse",RED],["3 · S2's timer fires next; its log is up to date, so it gets the votes",BLUE],["4 · S2 leads term 5 and already holds every committed entry",BLUE]];
const base=<g>{S.map(([t,s],i)=><Bx key={t} x={X[i]} y={110} w={W} h={50} t={t} s={s}/>)}</g>;
const s1=<g><rect x={X[0]} y="110" width={W} height="50" fill="#fff5f4" opacity=".7" stroke={RED} strokeDasharray="4 3"/><text x={cxo(0)} y="182" textAnchor="middle" className="fl" style={{fill:RED}}>stopped</text></g>;
const s2=<g><text x={cxo(4)} y="96" textAnchor="middle" className="fl" style={{fill:RED}}>vote for me, term 4?</text>{[1,2,3].map(i=><text key={i} x={cxo(i)} y="182" textAnchor="middle" className="fl" style={{fill:RED}}>no: mine is newer</text>)}</g>;
const s3=<g><text x={cxo(1)} y="96" textAnchor="middle" className="fl" style={{fill:BLUE}}>vote for me, term 5?</text>{[2,3,4].map(i=><text key={i} x={cxo(i)} y="182" textAnchor="middle" className="fl" style={{fill:BLUE}}>yes</text>)}</g>;
const s4=<g><rect x={X[1]} y="110" width={W} height="50" fill="none" stroke={BLUE} strokeWidth="2"/><text x={cxo(1)} y="182" textAnchor="middle" className="fb" style={{fill:BLUE}}>leader, term 5</text><text x="10" y="228" className="fl">A server only votes for a candidate whose log is at least as up to date as its own, so a new</text><text x="10" y="244" className="fl">leader always has every committed entry: nothing that was acknowledged is lost.</text></g>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`rvt${uid}`}><title id={`rvt${uid}`}>A Raft election among five servers. The leader, S1, stops. S5's election timer fires first and it asks for votes in term 4, but its log ends at entry 3 from term 2, so S2, S3 and S4 refuse because their logs are newer. S2's timer fires next and it asks for votes in term 5; its log ends at entry 6 from term 3, as up to date as any, so S3, S4 and S5 vote yes. S2 becomes leader of term 5. Because servers only vote for candidates whose log is at least as up to date as their own, the new leader already holds every committed entry.</title>
{base}{still?<g>{s1}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={1} dur={D}>{s1}</Show><Show t0={.25} t1={.5} dur={D}>{s2}</Show>{[1,2,3].map((i,k)=><Dot key={i} x1={cxo(4)} x2={cxo(i)} y={104} t0={.28+k*.03} t1={.4+k*.03} dur={D}/>)}
<Show t0={.5} t1={.75} dur={D}>{s3}</Show>{[2,3,4].map((i,k)=><Dot key={i} x1={cxo(1)} x2={cxo(i)} y={104} t0={.53+k*.03} t1={.65+k*.03} dur={D}/>)}<Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Bigtable, FIG 1: rows sorted by key, cut into tablets. A restaurant's orders sit next to each other; a
// read finds the tablet through the location table; tablet 1 grows and splits; the master moves half of it.
function BigtableTabletsFig({still,uid=""}){const D="14s",K=["0007/orders/31","0042/orders/88","0042/orders/89","0042/orders/90","0099/orders/12","0412/orders/05","0500/orders/77","0731/orders/40","0950/orders/02"],ry=i=>78+i*20;
const caps=[["1 · rows are kept sorted by key and cut into ranges called tablets",INK],["2 · a read for 0042/orders/89 finds tablet 1's server and goes straight to it",BLUE],["3 · tablet 1 grows past its size limit and splits in two",BLUE],["4 · the master moves the new half, tablet 1b, to a less busy server",BLUE]];
const tab=(i0,i1,t,c=GREY,fill="#fff")=><g><rect x="210" y={ry(i0)-12} width="110" height={(i1-i0)*20+20} fill={fill} stroke={c}/><text x="265" y={(ry(i0)+ry(i1))/2+4} textAnchor="middle" className="fb">{t}</text></g>;
const base=<g><text x="10" y="54" className="fl">row key, sorted</text><rect x="10" y="62" width="180" height="188" fill="#fff" stroke={GREY}/>{K.map((k,i)=><text key={k} x="20" y={ry(i)+4} className="fl" style={i>=1&&i<=3?{fill:BLUE}:undefined}>{k}</text>)}
{tab(5,6,"tablet 2")}{tab(7,8,"tablet 3")}<Bx x={400} y={110} w={230} h={40} t="tablet server 2" s="tablet 2"/></g>;
const s1=<g>{tab(0,4,"tablet 1")}<Bx x={400} y={50} w={230} h={40} t="tablet server 1" s="tablet 1"/><Bx x={400} y={170} w={230} h={40} t="tablet server 3" s="tablet 3"/></g>;
const s2=<g><text x="400" y="236" className="fl" style={{fill:BLUE}}>location table: 0042/… is in</text><text x="400" y="252" className="fl" style={{fill:BLUE}}>tablet 1, on server 1</text><text x="400" y="268" className="fl">(cached by the client)</text></g>;
const s3=<g>{tab(0,2,"tablet 1a",BLUE,"#f8faff")}{tab(3,4,"tablet 1b",BLUE,"#f8faff")}<Bx x={400} y={50} w={230} h={40} t="tablet server 1" s="tablet 1a, tablet 1b"/><Bx x={400} y={170} w={230} h={40} t="tablet server 3" s="tablet 3"/></g>;
const s4=<g>{tab(0,2,"tablet 1a",BLUE,"#f8faff")}{tab(3,4,"tablet 1b",BLUE,"#f8faff")}<Bx x={400} y={50} w={230} h={40} t="tablet server 1" s="tablet 1a"/><Bx x={400} y={170} w={230} h={40} t="tablet server 3" s="tablet 3, tablet 1b" c={BLUE} fill="#f8faff"/><text x="400" y="236" className="fl">The data stays in GFS: moving a</text><text x="400" y="252" className="fl">tablet only changes which server</text><text x="400" y="268" className="fl">answers for it, so it takes moments.</text></g>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`btt${uid}`}><title id={`btt${uid}`}>A Bigtable table whose rows are sorted by key, such as restaurant 0042's orders 88, 89 and 90, which sit next to each other. The sorted rows are cut into ranges called tablets: tablet 1 on tablet server 1, tablet 2 on server 2, tablet 3 on server 3. A read for row 0042/orders/89 looks up the location table, learns that tablet 1 is on server 1, caches that, and goes straight there. Tablet 1 grows past its size limit and splits into tablets 1a and 1b. The master then moves tablet 1b to the less busy server 3. Because the data itself stays in GFS, moving a tablet only changes which server answers for it.</title>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.5} dur={D}>{s1}</Show><Show t0={.25} t1={.5} dur={D}>{s2}</Show><Dot x1={190} x2={400} y={ry(2)} y2={70} t0={.3} t1={.44} dur={D}/>
<Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show><Dot x1={320} x2={400} y={ry(3)+10} y2={190} t0={.78} t1={.9} dur={D}/></g>}</svg>}

// Bigtable, FIG 2: the write and read path. A write goes to the commit log and the memtable; a full memtable
// becomes an immutable SSTable; a read merges the memtable with the SSTables, Bloom filters skipping files
// that can't hold the row; compaction merges SSTables and drops deleted rows.
function BigtableLsmFig({still,uid=""}){const M=`bl${uid}`,D="14s";
const caps=[["1 · a write is appended to the commit log, then added to the sorted memtable",INK],["2 · the full memtable is frozen and written to GFS as a new SSTable",BLUE],["3 · a read merges the memtable and SSTables; Bloom filters skip files without the row",BLUE],["4 · compaction merges SSTables into one and drops deleted rows",BLUE]];
const base=<g><Bx x={10} y={70} w={130} h={40} t="write" s="order 0042/91"/><Bx x={200} y={50} w={170} h={40} t="commit log" s="appended, on GFS"/><Bx x={200} y={120} w={170} h={40} t="memtable" s="sorted, in memory" c={BLUE}/><Bx x={10} y={190} w={130} h={40} t="read" s="0042/orders/89"/>
<Ar x1={140} y1={84} x2={197} y2={72} m={M}/><Ar x1={140} y1={96} x2={197} y2={136} m={M}/><text x="440" y="44" className="fl">SSTables: in GFS, never changed</text></g>;
const ss=(y,t,s,c=GREY,dash)=><g><rect x="440" y={y} width="190" height="36" fill="#fff" stroke={c} strokeDasharray={dash?"4 3":undefined}/><text x="535" y={y+15} textAnchor="middle" className="fb">{t}</text><text x="535" y={y+29} textAnchor="middle" className="fl">{s}</text></g>;
const olds=<g>{ss(100,"SSTable 2","")}{ss(144,"SSTable 1","")}</g>;
const s2=<g>{ss(56,"SSTable 3","newest",BLUE)}<Ar x1={370} y1={140} x2={437} y2={76} m={M}/></g>;
const s3=<g><Ar x1={140} y1={206} x2={197} y2={152} m={M}/><text x="440" y="208" className="fl" style={{fill:BLUE}}>SSTable 3: has it → read</text><text x="440" y="224" className="fl">SSTables 2, 1: Bloom filter</text><text x="440" y="238" className="fl">says no → never read from disk</text></g>;
const s4=<g>{ss(56,"SSTable 3","",GREY,1)}{ss(100,"SSTable 2","",GREY,1)}{ss(144,"SSTable 1","",GREY,1)}{ss(200,"SSTable 4","all three merged",BLUE)}</g>;
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`blt${uid}`}><title id={`blt${uid}`}>Bigtable's write and read path. A write of a new order is first appended to the commit log on GFS, then added to the memtable, a sorted table in memory. When the memtable is full it is frozen and written to GFS as a new SSTable, a sorted file that is never changed. A read merges the memtable with the SSTables, newest first; a Bloom filter for each SSTable says when a file cannot hold the row, so most files are never read from disk. Compaction later merges several SSTables into one and drops rows that were deleted.</title><Mk m={M}/>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.75} dur={D}>{olds}</Show><Dot x1={140} x2={200} y={84} y2={70} t0={.05} t1={.14} dur={D}/><Dot x1={140} x2={200} y={96} y2={140} t0={.12} t1={.21} dur={D}/>
<Show t0={.25} t1={.75} dur={D}>{s2}</Show><Dot x1={370} x2={440} y={140} y2={74} t0={.3} t1={.42} dur={D}/>
<Show t0={.5} t1={.75} dur={D}>{s3}</Show><Dot x1={140} x2={200} y={206} y2={150} t0={.53} t1={.62} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Kafka, FIG 1: a topic as partitioned logs. Restaurant 42's order goes to partition hash(42) = 1 at offset
// 8; a partition is a log and a message is its offset; in the notifications group each partition has one
// reader; analytics reads the same log at its own pace.
function KafkaLogFig({still,uid=""}){const D="14s",Y=[86,146,206],n=[8,8,7],cx=i=>190+i*30;
const caps=[["1 · restaurant 42's order goes to partition hash(42) = 1, appended at offset 8",INK],["2 · a partition is just a log: a message is known by its offset, nothing more",BLUE],["3 · in the notifications group each partition has one reader, which keeps its offset",BLUE],["4 · analytics reads the same log at its own pace: reading deletes nothing",BLUE]];
const cell=(i,y,c=GREY,fill="#fff")=><g key={i+"-"+y}><rect x={cx(i)} y={y-13} width="26" height="26" fill={fill} stroke={c}/><text x={cx(i)+13} y={y+4} textAnchor="middle" className="fl">{i}</text></g>;
const base=<g><Bx x={10} y={126} w={120} h={40} t="order service" s="producer"/><text x="190" y="54" className="fl">topic "orders"</text>{Y.map((y,p)=><g key={y}><text x="190" y={y-19} className="fl">partition {p}</text>{Array.from({length:n[p]},(_,i)=>cell(i,y))}</g>)}</g>;
const s1=cell(8,Y[1],BLUE,"#f8faff");
const ptr=(i,y,t,c)=><g><path d={`M${cx(i)+13} ${y+16}l-5 8h10z`} fill={c}/><text x={cx(i)+13} y={y+36} textAnchor="middle" className="fl" style={{fill:c}}>{t}</text></g>;
const s3=<g><Bx x={500} y={70} w={130} h={40} t="notify 1" s="reads p0, p1" c={BLUE}/><Bx x={500} y={186} w={130} h={40} t="notify 2" s="reads p2" c={BLUE}/></g>;
const s4=<g><Bx x={500} y={128} w={130} h={40} t="analytics" s="its own offsets"/>{ptr(3,Y[0],"analytics",GREY)}</g>;
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`klt${uid}`}><title id={`klt${uid}`}>A Kafka topic called orders with three partitions, each an append-only log of numbered messages. The order service sends an event for restaurant 42; the hash of 42 picks partition 1, and the event is appended at offset 8. A message is known only by its partition and offset. In the notifications consumer group, consumer 1 reads partitions 0 and 1 and consumer 2 reads partition 2, each keeping track of its own offset. The analytics group reads the same partitions at its own pace, here further behind at offset 3; reading a message does not delete it.</title>
{base}{still?<g>{s1}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Dot x1={130} x2={cx(8)+13} y={146} t0={.05} t1={.18} dur={D}/><Show t0={.15} t1={1} dur={D}>{s1}</Show>
<Show t0={.25} t1={.5} dur={D}><text x="10" y="250" className="fl" style={{fill:BLUE}}>no message IDs and no per-message state: the broker only appends and hands out ranges</text></Show>
<Show t0={.5} t1={1} dur={D}>{s3}</Show>{[[0,Y[0],90],[1,Y[1],90],[2,Y[2],206]].map(([p,y,ty])=><Dot key={p} x1={cx(7)+13} x2={500} y={y} y2={ty} t0={.53+p*.03} t1={.66+p*.03} dur={D}/>)}
<Show t0={.75} t1={1} dur={D}>{s4}</Show><Dot x1={cx(3)+13} x2={500} y={Y[0]} y2={148} t0={.78} t1={.9} dur={D}/></g>}</svg>}

// Kafka, FIG 2: rewinding. The broker keeps a week of order events whether or not they were read. The search
// indexer is at offset 9,120; a bug is fixed and its offset moved back to yesterday's 4,000; it re-reads the day
// and rebuilds the index without anyone sending anything again.
function KafkaRewindFig({still,uid=""}){const D="12s",X=i=>20+i*37,days=["Mon","Tue","Wed","Thu"];
const caps=[["1 · the broker keeps a week of order events, read or not",INK],["2 · the search indexer has read up to offset 9,120",BLUE],["3 · a bug in the indexer is fixed, and its offset is moved back to yesterday: 4,000",RED],["4 · it re-reads the day and rebuilds the index; nothing had to be sent again",BLUE]];
const ptr=(i,t,c)=><g><path d={`M${X(i)+16} 150l-6 10h12z`} fill={c}/><text x={X(i)+16} y="176" textAnchor="middle" className="fl" style={{fill:c}}>{t}</text></g>;
const base=<g>{Array.from({length:16},(_,i)=><rect key={i} x={X(i)} y="100" width="33" height="44" fill={i>=7?"#f8faff":"#fff"} stroke={GREY}/>)}{days.map((d,k)=><text key={d} x={X(k*4)+2} y="90" className="fl">{d}</text>)}<text x="20" y="220" className="fl">one partition of "orders"; old segments are deleted after 7 days, not when they are read</text></g>;
const s2=ptr(15,"offset 9,120",BLUE),s3=<g>{ptr(7,"offset 4,000",RED)}<text x={X(15)+16} y="176" textAnchor="middle" className="fl" style={{fill:GREY}}>was 9,120</text></g>;
const s4=<g>{ptr(15,"caught up again",BLUE)}<text x={X(7)+16} y="176" textAnchor="middle" className="fl" style={{fill:GREY}}>4,000</text></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`krt${uid}`}><title id={`krt${uid}`}>One partition of the orders topic laid out as a row of log segments from Monday to Thursday. The broker keeps a week of events whether or not anyone has read them. The search indexer has read up to offset 9,120. A bug is found in the indexer; after the fix, its offset is moved back to yesterday, offset 4,000. It reads the day's events again and rebuilds the index, catching up to the end. Nothing had to be sent again, because reading never deleted anything.</title>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={.5} dur={D}>{s2}</Show><Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show>
{[0,1,2].map(k=><Dot key={k} x1={X(7)+16} x2={X(15)+16} y={122} t0={.77+k*.04} t1={.92+k*.02} dur={D}/>)}</g>}</svg>}

// Memcache, FIG 1: leases against a thundering herd. A menu edit deletes menu:0042; a thousand page loads miss
// at once; memcache gives one a lease and tells the rest to wait; one database read refills the cache.
function MemcacheLeaseFig({still,uid=""}){const M=`ml${uid}`,D="14s";
const caps=[["1 · a menu edit updates the database and deletes menu:0042 from the cache",INK],["2 · a thousand page loads miss at the same moment",RED],["3 · memcache gives a lease to the first; the other 999 are told to wait a moment",BLUE],["4 · one database read refills the cache; the 999 retry and hit it",BLUE]];
const base=<g><Bx x={10} y={100} w={150} h={60} t="1,000 page loads" s="restaurant 42's page"/><Bx x={460} y={50} w={170} h={40} t="menu edit"/><Bx x={460} y={170} w={170} h={50} t="database" s="the source of truth"/></g>;
const mc=(s,c=GREY,fill="#fff")=><Bx x={240} y={100} w={150} h={60} t="memcache" s={s} c={c} fill={fill}/>;
const s2=<text x="200" y="92" className="fl" style={{fill:RED}}>miss × 1,000</text>,s3=<g><text x="168" y="186" className="fl" style={{fill:BLUE}}>lease → 1 page load</text><text x="168" y="202" className="fl">wait 10 ms, retry → 999</text></g>;
const s4=<g><text x="10" y="252" className="fl">In the paper, leases cut the database's peak reads for keys like this from 17,000 to 1,300 a second.</text></g>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`mlt${uid}`}><title id={`mlt${uid}`}>A thundering herd stopped by memcache leases. A menu edit updates the database and deletes the cached menu for restaurant 42. A thousand page loads miss in the cache at the same moment. Memcache gives a lease to the first of them and tells the other 999 to wait a few milliseconds and retry. The lease holder reads the database once and fills the cache, and the 999 retries hit the cache. In the paper, leases cut peak database reads for such keys from 17,000 to 1,300 a second.</title><Mk m={M}/>
{base}{still?<g>{mc("menu:0042 · filled",BLUE,"#f8faff")}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.75} dur={D}>{mc("menu:0042 · deleted",RED,"#fff5f4")}</Show><Dot x1={545} x2={545} y={90} y2={170} t0={.04} t1={.12} dur={D}/><Dot x1={460} x2={390} y={70} y2={110} t0={.08} t1={.18} dur={D}/>
<Show t0={.25} t1={.5} dur={D}>{s2}</Show>{[0,1,2,3,4].map(k=><Dot key={k} x1={160} x2={240} y={110+k*10} t0={.27+k*.015} t1={.37+k*.015} dur={D}/>)}
<Show t0={.5} t1={1} dur={D}>{s3}</Show>
<Show t0={.75} t1={1} dur={D}>{mc("menu:0042 · filled",BLUE,"#f8faff")}{s4}</Show><Dot x1={160} x2={460} y={150} y2={195} t0={.76} t1={.84} dur={D}/><Dot x1={460} x2={390} y={185} y2={140} t0={.84} t1={.9} dur={D}/>{[0,1,2].map(k=><Dot key={k} x1={160} x2={240} y={115+k*12} t0={.9+k*.01} t1={.97+k*.01} dur={D}/>)}</g>}</svg>}

// Memcache, FIG 2: invalidation. The web server writes the database and deletes the key in its own cluster's
// cache; a daemon reading the database's commit log sends the delete to every cluster; deletes, not updates.
function MemcacheInvalFig({still,uid=""}){const D="12s",X=[10,245,480],W=150;
const caps=[["1 · a web server in cluster A writes the new menu to the database",INK],["2 · it deletes the key from its own cluster's cache, so its user sees the change",BLUE],["3 · a daemon reading the database's commit log sends the delete to every cluster",BLUE],["4 · deletes, not updates: repeating one is harmless, and the next read refills it",BLUE]];
const base=<g><Bx x={X[0]} y={60} w={W} h={44} t="web server" s="cluster A"/><Bx x={X[1]} y={60} w={W} h={44} t="database" s="commit log"/><Bx x={X[2]} y={60} w={W} h={44} t="log reader" s="tails the commit log"/>
{["A","B","C"].map((c,i)=><Bx key={c} x={X[i]} y={180} w={W} h={44} t={`memcache, cluster ${c}`} s="menu:0042"/>)}</g>;
const del=i=><Bx x={X[i]} y={180} w={W} h={44} t={`memcache, cluster ${"ABC"[i]}`} s="menu:0042 deleted" c={BLUE} fill="#f8faff"/>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`mit${uid}`}><title id={`mit${uid}`}>How a write invalidates cached copies. A web server in cluster A writes the new menu to the database, then deletes the menu key from cluster A's memcache, so its own user sees the change at once. A daemon that tails the database's commit log sees the write and sends a delete for the key to the memcache servers in every cluster, A, B and C. The system sends deletes rather than new values, because deleting twice is harmless and the next read refills the cache from the database.</title>
{base}{still?<g>{del(0)}{del(1)}{del(2)}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Dot x1={160} x2={245} y={82} t0={.05} t1={.17} dur={D}/><Show t0={.25} t1={1} dur={D}>{del(0)}</Show><Dot x1={85} x2={85} y={104} y2={180} t0={.28} t1={.4} dur={D}/>
<Dot x1={395} x2={480} y={82} t0={.52} t1={.6} dur={D}/>{[0,1,2].map(i=><Dot key={i} x1={555} x2={X[i]+75} y={104} y2={180} t0={.61+i*.02} t1={.71+i*.02} dur={D}/>)}<Show t0={.72} t1={1} dur={D}>{del(1)}{del(2)}</Show></g>}</svg>}

export const FIGS={
"lamport-clocks":{C:LamportClocksFig,ar:640/300,title:()=>"COUNTING INSTEAD OF TIMING"},
"lamport-order":{C:LamportOrderFig,ar:640/290,title:()=>"ONE ORDER FOR EVERY MACHINE"},
"gfs-read":{C:GfsReadFig,ar:640/290,title:()=>"A READ: ASK THE MASTER, FETCH FROM A SERVER"},
"gfs-write":{C:GfsWriteFig,ar:640/320,title:()=>"A WRITE: DATA DOWN A CHAIN, ORDER FROM THE PRIMARY"},
"mr-flow":{C:MrFlowFig,ar:640/270,title:()=>"COUNTING ORDERS PER DISH"},
"mr-straggler":{C:MrStragglerFig,ar:640/260,title:()=>"DEAD WORKERS AND SLOW ONES"},
"dynamo-ring":{C:DynamoRingFig,ar:640/280,title:()=>"WHERE A CART LIVES ON THE RING"},
"dynamo-versions":{C:DynamoVersionsFig,ar:640/260,title:()=>"TWO VERSIONS OF ONE CART"},
"raft-log":{C:RaftLogFig,ar:640/260,title:()=>"ONE ENTRY, COPIED TO A MAJORITY"},
"raft-vote":{C:RaftVoteFig,ar:640/256,title:()=>"ONLY AN UP-TO-DATE SERVER CAN LEAD"},
"bigtable-tablets":{C:BigtableTabletsFig,ar:640/280,title:()=>"SORTED ROWS, CUT INTO TABLETS"},
"bigtable-lsm":{C:BigtableLsmFig,ar:640/260,title:()=>"MEMTABLE, SSTABLES AND COMPACTION"},
"kafka-log":{C:KafkaLogFig,ar:640/260,title:()=>"A TOPIC IS A SET OF LOGS"},
"kafka-rewind":{C:KafkaRewindFig,ar:640/240,title:()=>"READING AGAIN FROM YESTERDAY"},
"memcache-lease":{C:MemcacheLeaseFig,ar:640/264,title:()=>"ONE MISS, NOT A THOUSAND"},
"memcache-inval":{C:MemcacheInvalFig,ar:640/250,title:()=>"A WRITE, AND EVERY CACHE FORGETTING THE OLD VALUE"},
};
