// Concepts › Consistent hashing: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "consistent-hashing").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
// Ring positions run 0–100 clockwise from the top, like the articles' 100-position ring.
import{BG,CAT_AMBER,CAT_GREEN,CAT_PINK,CAT_TEAL,CAT_VIOLET,GRID,LINE,ON_ACCENT,SURFACE}from"../../theme/palette.js";import React from"react";import{Bx,Ar,INK,GREY,RED,BLUE,LB,LR,T,Fig,Cap,Caps,Show,pace}from"../parts.jsx";

const X=({x,y,c=RED,r=6})=><g stroke={c} strokeWidth="2.5"><line x1={x-r} y1={y-r} x2={x+r} y2={y+r}/><line x1={x-r} y1={y+r} x2={x+r} y2={y-r}/></g>;

// Ring helpers. pos 0..100 clockwise from the top.
const pt=(cx,cy,r,p)=>{const a=p/100*2*Math.PI-Math.PI/2;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};

const Ring=({cx,cy,r})=><circle cx={cx} cy={cy} r={r} fill="none" stroke={GREY} strokeWidth="1.5"/>;

const Arc=({cx,cy,r,p1,p2,c=BLUE,w=6})=>{let q=p2<=p1?p2+100:p2;const[x1,y1]=pt(cx,cy,r,p1),[x2,y2]=pt(cx,cy,r,q);return <path d={`M${x1} ${y1}A${r} ${r} 0 ${q-p1>50?1:0} 1 ${x2} ${y2}`} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" opacity="0.85"/>;};

const Node=({cx,cy,r,p,t,c=INK,fill=BG,nr=15})=>{const[x,y]=pt(cx,cy,r,p);return <g><circle cx={x} cy={y} r={nr} fill={fill} stroke={c} strokeWidth="1.5"/><text x={x} y={y+4} textAnchor="middle" className="fb" style={{fill:c,fontSize:nr<13?10:11}}>{t}</text></g>;};

const Key=({cx,cy,r,p,c=BLUE,t})=>{const[x,y]=pt(cx,cy,r,p);const[lx,ly]=pt(cx,cy,r-22,p);return <g><circle cx={x} cy={y} r={5} fill={c}/>{t&&<text x={lx} y={ly+3} textAnchor="middle" className="fl" style={{fill:c}}>{t}</text>}</g>;};

const Lab=({cx,cy,r,p,t})=>{const[x,y]=pt(cx,cy,r+26,p);return <text x={x} y={y+3} textAnchor="middle" className="fl">{t}</text>;};

const C={cx:150,cy:150,r:88};

const DB4=[[0,"DB1"],[25,"DB2"],[50,"DB3"],[75,"DB4"]];

const nodes4=(skip)=><g>{DB4.map(([p,t])=>p!==skip&&<g key={t}><Lab {...C} p={p} t={String(p)}/><Node {...C} p={p} t={t}/></g>)}</g>;

// The hash ring, FIG 1: from one database to several.
function ShardEventsFig({still,uid=""}){const M=`ce${uid}`;
const db=(i,c=GREY,fill=BG)=><Bx key={i+c} x={440} y={44+i*62} w={190} h={46} t={`database ${i}`} s="a third of the matches" c={c} fill={fill}/>;
const base=<Bx x={10} y={102} w={130} h={46} t="app servers" s="match pages, bookings"/>;
const s1=<g><Ar x1={142} y1={125} x2={436} y2={125} m={M}/><Bx x={440} y={102} w={190} h={46} t="one database" s="every match, every seat" c={RED} fill={LR}/><T x={290} y={118} t="fine at first; too busy later" a="middle" c={RED}/></g>;
const s2=<g>{[0,1,2].map(i=>db(i))}</g>;
const s3=<g>{[0,1,2].map(i=><Ar key={i} x1={142} y1={125} x2={436} y2={67+i*62} m={M} c={GREY} dash/>)}<T x={150} y={172} t="match 1234: which one?"/></g>;
const s4=<g><T x={10} y={210} t="every request needs a rule: match id → database, and the rule must survive" c={BLUE}/><T x={10} y={226} t="databases being added and lost" c={BLUE}/></g>;
const caps=[["1 · one database holds every match: fine at first",INK],["2 · too much load, so the matches are split across three databases",INK],["3 · now every request must first find which database holds its match",INK],["4 · that needs a rule from match id to database",BLUE]];
return <Fig still={still} h={236} id={`cet${uid}`} M={M} caps={caps} only={[0]} title="From one database to several. At first one database holds every match and every seat, which is fine until it is too busy. The matches are then split across three databases, and every request must first find which database holds its match, for example match 1234. That needs a rule from match id to database, one that survives databases being added and lost."
base={base} g={[s1,s2,s3,s4]} last={<g>{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 2: modulo hashing.
function ModuloFig({still,uid=""}){const M=`cm${uid}`;
const db=(i,c=GREY,fill=BG)=><Bx key={i+c} x={520} y={50+i*48} w={110} h={38} t={`database ${i}`} c={c} fill={fill}/>;
const base=<g>{[0,1,2].map(i=>db(i))}</g>;
const s1=<g><Bx x={10} y={88} w={100} h={40} t="match 1234"/><Ar x1={112} y1={108} x2={136} y2={108} m={M}/><Bx x={140} y={88} w={80} h={40} t="hash()"/></g>;
const s2=<g><Ar x1={222} y1={108} x2={246} y2={108} m={M}/><Bx x={250} y={88} w={110} h={40} t="8,671,204"/></g>;
const s3=<g><Ar x1={362} y1={108} x2={386} y2={108} m={M}/><Bx x={390} y={88} w={90} h={40} t="% 3 = 1" c={BLUE} fill={LB}/></g>;
const s4=<g><Ar x1={482} y1={108} x2={516} y2={117} m={M} c={BLUE} w={2}/>{db(1,BLUE,LB)}<T x={10} y={196} t="it spreads matches evenly and needs no table, but the 3 is baked into every key's home" c={INK}/></g>;
const caps=[["1 · the match id goes through a hash function",INK],["2 · which turns it into a large number",INK],["3 · the number modulo the count of databases, 3, gives 1",BLUE],["4 · so match 1234 lives on database 1",BLUE]];
return <Fig still={still} h={208} id={`cmt${uid}`} M={M} caps={caps} title="Modulo hashing. Match 1234 goes through a hash function, which turns it into a large number, 8,671,204. That number modulo 3, the number of databases, is 1, so match 1234 lives on database 1. It spreads matches evenly and needs no table, but the number of databases is baked into every key's home."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 3: changing N moves most keys.
function ModChangeFig({still,uid=""}){
const H=[12,25,31,46,52,69],m3=H.map(h=>h%3),m4=H.map(h=>h%4),m2=H.map(h=>h%2);
const X0=i=>130+i*84;
const cell=(i,y,v,c=GREY,fill=BG)=><Bx key={`${i}${y}${c}`} x={X0(i)} y={y} w={76} h={28} t={`db${v}`} c={c} fill={fill}/>;
const base=<g>{H.map((h,i)=><T key={i} x={X0(i)+38} y={56} t={`match ${i+1}`} a="middle"/>)}</g>;
const s1=<g><T x={10} y={82} t="% 3" b/><T x={10} y={96} t="three databases"/>{m3.map((v,i)=>cell(i,66,v))}</g>;
const s2=<g><T x={10} y={132} t="% 4" b/><T x={10} y={146} t="one added"/>{m4.map((v,i)=>cell(i,116,v,v!==m3[i]?RED:GREY,v!==m3[i]?LR:BG))}<T x={130} y={162} t="4 of 6 matches move, not just the ones the new database should take" c={RED}/></g>;
const s3=<g><T x={10} y={196} t="% 2" b/><T x={10} y={210} t="db2 lost"/>{m2.map((v,i)=>cell(i,180,v,v!==m3[i]?RED:GREY,v!==m3[i]?LR:BG))}<T x={130} y={226} t="none of these lived on db2, yet 3 of 6 move" c={RED}/></g>;
const s4=<g><T x={130} y={246} t="only the keys of the database that changed should have to move" c={BLUE}/></g>;
const caps=[["1 · six matches spread over three databases with hash % 3",INK],["2 · add a fourth database, and most matches change home",RED],["3 · lose a database, and the same happens again",RED],["4 · what we want: only the affected keys move",BLUE]];
return <Fig still={still} h={256} id={`cht${uid}`} caps={caps} title="Changing the number of databases with modulo hashing. Six matches are spread over three databases with hash modulo 3. Adding a fourth database, so modulo 4, moves four of the six matches, not just the ones the new database should take. Losing database 2, so modulo 2, moves three of the six, although none of them lived on database 2. What we want is that only the keys of the database that changed have to move."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 4: keys walk clockwise.
function RingFig({still,uid=""}){
const base=<Ring {...C}/>;
const s1=<g><T x={300} y={70} t="ring positions 0–99 (real rings: 0 to 2³² − 1)"/><T x={300} y={88} t="four databases at 0, 25, 50 and 75"/></g>;
const s2=<g><Arc {...C} p1={30} p2={47}/><Key {...C} p={30} t="A"/><T x={300} y={124} t="match A hashes to 30, walks clockwise," c={BLUE}/><T x={300} y={140} t="and stops at DB3, at 50" c={BLUE}/></g>;
const s3=<g><Arc {...C} p1={80} p2={97}/><Key {...C} p={80} t="B"/><T x={300} y={170} t="match B hashes to 80, passes 99," c={BLUE}/><T x={300} y={186} t="and wraps round to DB1, at 0" c={BLUE}/></g>;
const s4=<g><T x={300} y={222} t="each database owns the arc just before it:" c={INK}/><T x={300} y={238} t="DB3 owns 26–50, DB1 owns 76–99 and 0" c={INK}/></g>;
const caps=[["1 · databases sit at points on a ring of hash values",INK],["2 · a key walks clockwise from its hash to the first database",BLUE],["3 · past the top, it wraps round",BLUE],["4 · so each database owns the arc of the ring just before it",INK]];
return <Fig still={still} h={258} id={`crt${uid}`} caps={caps} top={nodes4()} title="A hash ring with positions 0 to 99 and four databases at 0, 25, 50 and 75. Match A hashes to 30 and walks clockwise to DB3 at 50. Match B hashes to 80, passes 99 and wraps round to DB1 at 0. Each database owns the arc of the ring just before it. Real rings use positions from 0 to 2 to the 32 minus 1."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 5: adding DB5 at 90.
function RingAddFig({still,uid=""}){
const base=<Ring {...C}/>;
const s1=<g><Arc {...C} p1={75} p2={100} c={GREY}/><T x={300} y={70} t="DB1, at 0, owns 76–99: 25 positions"/></g>;
const s2=<g><Lab {...C} p={90} t="90"/><Node {...C} p={90} t="DB5" c={BLUE} fill={LB}/><T x={300} y={104} t="a fifth database joins at 90" c={BLUE}/></g>;
const s3=<g><Arc {...C} p1={75} p2={86}/><T x={300} y={138} t="76–90 now stop at DB5: 15 positions," c={BLUE}/><T x={300} y={154} t="60% of DB1's keys, 15% of all keys" c={BLUE}/></g>;
const s4=<g><T x={300} y={190} t="every other key stays where it was" c={BLUE}/><T x={300} y={206} t="(with % 5, about 80% of keys would move)"/></g>;
const caps=[["1 · four databases; DB1 owns the arc from 76 to 99",INK],["2 · a fifth database joins the ring at 90",BLUE],["3 · only the keys between 75 and 90 move, from DB1 to DB5",BLUE],["4 · nothing else moves: about 15% of keys, instead of 80% with % N",BLUE]];
return <Fig still={still} h={250} id={`cat${uid}`} caps={caps} top={nodes4()} title="Adding a database to the ring. Four databases sit at 0, 25, 50 and 75, and DB1 at 0 owns positions 76 to 99. A fifth database joins at 90. Only keys between 75 and 90 move, from DB1 to DB5: 15 positions, 60% of DB1's keys and 15% of all keys. Every other key stays where it was, where modulo 5 would have moved about 80%."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 6: removing DB2 at 25.
function RingRemoveFig({still,uid=""}){
const base=<Ring {...C}/>;
const db2=(c,fill)=><g><Lab {...C} p={25} t="25"/><Node {...C} p={25} t="DB2" c={c} fill={fill}/></g>;
const s1=<g>{db2(INK,BG)}<Arc {...C} p1={0} p2={25} c={GREY}/><T x={300} y={70} t="DB2, at 25, owns 1–25"/></g>;
const s2=<g>{db2(RED,LR)}{(()=>{const[x,y]=pt(C.cx,C.cy,C.r,25);return <X x={x+18} y={y-16}/>;})()}<T x={300} y={104} t="DB2 fails" c={RED}/></g>;
const s3=<g><Arc {...C} p1={0} p2={47} c={RED}/>{db2(RED,LR)}<T x={300} y={138} t="its keys walk on to DB3, at 50;" c={RED}/><T x={300} y={154} t="nobody else's keys move" c={INK}/></g>;
const s4=<g><T x={300} y={190} t="but DB3 now owns 1–50:" c={RED}/><T x={300} y={206} t="twice the keys of DB1 or DB4" c={RED}/></g>;
const caps=[["1 · four databases; DB2 at 25 owns the arc from 1 to 25",INK],["2 · DB2 fails",RED],["3 · only its keys move, all to the next database clockwise, DB3",INK],["4 · so DB3 now carries twice the load of the others",RED]];
return <Fig still={still} h={250} id={`cxt${uid}`} caps={caps} top={nodes4(25)} title="Removing a database from the ring. Four databases sit at 0, 25, 50 and 75, and DB2 at 25 owns positions 1 to 25. When DB2 fails, only its keys move, all of them clockwise to DB3 at 50, and nobody else's keys move. But DB3 now owns positions 1 to 50, twice the keys of DB1 or DB4."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// The hash ring, FIG 7: with virtual nodes, a failure spreads.
function VnodesFailFig({still,uid=""}){
const ORDER=[1,2,3,4,2,4,1,3,4,1,3,2],P=ORDER.map((_,i)=>4+i*8.33);
const base=<g><Ring {...C}/>{ORDER.map((d,i)=>d===2&&<Node key={i} {...C} p={P[i]} t="2" nr={11}/>)}</g>;
const top=<g>{ORDER.map((d,i)=>d!==2&&<Node key={i} {...C} p={P[i]} t={String(d)} nr={11}/>)}</g>;
const red2=<g>{ORDER.map((d,i)=>d===2&&<Node key={i} {...C} p={P[i]} t="2" nr={11} c={RED} fill={LR}/>)}</g>;
const s1=<g><T x={300} y={70} t="four databases, three points each:"/><T x={300} y={86} t="DB1's points are '1', DB2's are '2', and so on"/></g>;
const s2=<g>{red2}<T x={300} y={120} t="DB2 fails: all three of its points go" c={RED}/></g>;
const tgt=[[1,2],[4,5],[11,0]];
const s3=<g>{tgt.map(([a,b])=><Arc key={a} {...C} p1={P[a]-8.33+1} p2={P[b]-1.5} c={BLUE}/>)}{red2}<T x={300} y={154} t="its three arcs pass to the next points:" c={BLUE}/><T x={300} y={170} t="DB3, DB4 and DB1, one each" c={BLUE}/></g>;
const s4=<g><T x={300} y={206} t="each survivor takes about a third;" c={BLUE}/><T x={300} y={222} t="none of them doubles" c={BLUE}/></g>;
const caps=[["1 · each database gets several points, mixed around the ring",INK],["2 · DB2 fails, and all three of its points disappear",RED],["3 · each of its arcs passes to a different database",BLUE],["4 · the failed database's load is shared, not dumped on one neighbour",BLUE]];
return <Fig still={still} h={254} id={`cvt${uid}`} caps={caps} top={top} title="Virtual nodes spread a failure. Four databases each have three points mixed around the ring. When DB2 fails, all three of its points disappear, and each of its three arcs passes to the next point clockwise, which belong to DB3, DB4 and DB1. Each survivor takes about a third of DB2's keys, and none of them doubles its load."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Rings in practice, FIG 1: a hot key, salted.
function SaltFig({still,uid=""}){
const L={cx:150,cy:142,r:70},Rr={cx:470,cy:142,r:70},S=[0,17,33,50,67,83];
const srv=(c,hot,cool)=>S.map((p,i)=><Node key={i+String(hot)+String(cool)} {...c} p={p} t={`S${i+1}`} nr={13} c={hot===i?RED:cool&&cool.includes(i)?BLUE:INK} fill={hot===i?LR:cool&&cool.includes(i)?LB:BG}/>);
const base=<g><T x={10} y={52} t="one hot key" b/><T x={330} y={52} t="salted into ten keys" b/><Ring {...L}/><Ring {...Rr}/>{srv(L)}{srv(Rr)}</g>;
const s1=<g><Key {...L} p={22} c={RED}/>{srv(L,2)}<T x={10} y={238} t="final-tickets → S3: 4 lakh reads/s" c={RED}/></g>;
const s2=<g><T x={10} y={254} t="the ring spread the keys, not the traffic" c={INK}/></g>;
const salt=[5,12,22,38,45,58,62,74,88,95];
const s3=<g>{salt.map((p,i)=><Key key={i} {...Rr} p={p}/>)}<T x={330} y={238} t="final-tickets-0 … -9 hash all round" c={BLUE}/></g>;
const s4=<g>{srv(Rr,null,[0,1,2,3,4,5])}<T x={330} y={254} t="reads shared by all six servers" c={BLUE}/></g>;
const caps=[["1 · every read of the final's tickets goes to the one server that owns the key",RED],["2 · consistent hashing balanced keys, not traffic",INK],["3 · salting turns one key into ten, each hashing to a different place",BLUE],["4 · so the reads are shared across the servers",BLUE]];
return <Fig still={still} h={262} id={`cst${uid}`} caps={caps} title="Salting a hot key. On a ring of six servers, every read of the final's tickets goes to S3, the one server that owns the key, at 4 lakh reads a second: the ring balanced keys, not traffic. Salting turns the key into ten keys, final-tickets-0 to final-tickets-9, which hash to different places around the ring, so the reads are shared by all six servers."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Rings in practice, FIG 2: replicas on the ring.
function ReplicasFig({still,uid=""}){
const S=[0,17,33,50,67,83];
const srv=(st)=>S.map((p,i)=><Node key={i+JSON.stringify(st)} {...C} p={p} t={`S${i+1}`} nr={14} c={st[i]==="x"?RED:st[i]?BLUE:INK} fill={st[i]==="x"?LR:st[i]?LB:BG}/>);
const base=<g><Ring {...C}/>{srv({})}</g>;
const s1=<g><Key {...C} p={9} t="K"/><Arc {...C} p1={9} p2={15}/>{srv({1:1})}<T x={300} y={70} t="key K hashes to 9: its owner is S2" c={BLUE}/></g>;
const s2=<g><Arc {...C} p1={17} p2={48}/>{srv({1:1,2:1,3:1})}<T x={300} y={104} t="copies on the next two servers: S3, S4" c={BLUE}/><T x={300} y={120} t="(replication factor 3)"/></g>;
const s3=<g>{srv({1:"x",2:1,3:1})}{(()=>{const[x,y]=pt(C.cx,C.cy,C.r,17);return <X x={x+18} y={y-14}/>;})()}<T x={300} y={154} t="S2 fails" c={RED}/></g>;
const s4=<g><T x={300} y={188} t="S3 already has K and answers at once:" c={BLUE}/><T x={300} y={204} t="nothing is copied before service goes on" c={BLUE}/></g>;
const caps=[["1 · a key belongs to the first server clockwise from its hash",BLUE],["2 · and is also stored on the next servers round the ring",BLUE],["3 · when the owner fails",RED],["4 · a replica answers straight away: no data has to move first",BLUE]];
return <Fig still={still} h={250} id={`cpt${uid}`} caps={caps} title="Replication on the ring. Key K hashes to position 9, so its owner is S2, the first server clockwise. With a replication factor of 3, copies are also kept on the next two servers, S3 and S4. When S2 fails, S3 already has K and answers straight away, so nothing has to be copied before service goes on."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Consistent hashing, interactive: a ring you can change. Not a captioned loop like the others; it has state.
const fnv=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;};

const PAL=[INK,BLUE,RED,CAT_GREEN,CAT_AMBER,CAT_VIOLET,CAT_TEAL,CAT_PINK];

const NK=40,KEYS=Array.from({length:NK},(_,i)=>{const h=fnv(`match-${i}`);return{h,p:(h%10000)/100};});

const place=(servers,v)=>{const pts=[];servers.forEach(s=>{for(let k=0;k<(v?6:1);k++){const h=fnv(`1700:S${s}#${k}`);pts.push({s,p:(h%10000)/100});}});pts.sort((a,b)=>a.p-b.p);
return{pts,own:KEYS.map(k=>(pts.find(x=>x.p>=k.p)||pts[0]).s)};};

const START={servers:[1,2,3,4],v:false,prev:null,msg:"Four servers, one point each. Change something.",mod:null};

const Btn=({x,y,w,t,on,off,act})=>{const go=e=>{if(off)return;if(e.type==="click"||e.key==="Enter"||e.key===" "){e.preventDefault();on();}};
return <g role="button" tabIndex={off?-1:0} aria-disabled={off||undefined} aria-pressed={act===undefined?undefined:act} onClick={go} onKeyDown={go} style={{cursor:off?"default":"pointer"}}>
<rect x={x} y={y} width={w} height={26} rx={3} fill={off?SURFACE:act?BLUE:LB} stroke={off?LINE:BLUE}/><text x={x+w/2} y={y+17} textAnchor="middle" className="fb" style={{fill:off?GREY:act?ON_ACCENT:BLUE}}>{t}</text></g>;};

function PlaygroundFig({uid=""}){const[st,set]=React.useState(START);const cur=place(st.servers,st.v);const R={cx:150,cy:162,r:104};
const change=(servers,v,what)=>{const nx=place(servers,v);const moved=nx.own.reduce((n,o,i)=>n+(o!==cur.own[i]?1:0),0);
const mod=v===st.v&&servers.length!==st.servers.length?KEYS.reduce((n,k)=>n+(st.servers[k.h%st.servers.length]!==servers[k.h%servers.length]?1:0),0):null;
set({servers,v,prev:cur.own,msg:`${what}: ${moved} of ${NK} keys moved (${Math.round(moved*100/NK)}%)`,mod});};
const next=[1,2,3,4,5,6,7,8].find(n=>!st.servers.includes(n));
const add=()=>change([...st.servers,next],st.v,`S${next} added`),drop=()=>{const s=st.servers[st.servers.length-1];change(st.servers.slice(0,-1),st.v,`S${s} removed`);},
fail=()=>change(st.servers.filter(n=>n!==2),st.v,"S2 failed"),vn=()=>change(st.servers,!st.v,st.v?"virtual nodes off":"virtual nodes on");
const count=s=>cur.own.filter(o=>o===s).length;
return <svg viewBox="0 0 640 300" role="group" aria-labelledby={`cpg${uid}`}><title id={`cpg${uid}`}>An interactive hash ring with forty keys. Add or remove servers, make server 2 fail, or switch virtual nodes on, and see how many keys move compared with hash modulo N.</title>
<text x="10" y="26" className="fb" style={{fill:BLUE}}>Try it: change the servers and watch which keys move</text>
<Ring {...R}/>
{KEYS.map((k,i)=>{const[x,y]=pt(R.cx,R.cy,R.r-14,k.p);const mv=st.prev&&st.prev[i]!==cur.own[i];return <g key={i}>{mv&&<circle cx={x} cy={y} r={7.5} fill="none" stroke={RED} strokeWidth="2"/>}<circle cx={x} cy={y} r={4} fill={PAL[cur.own[i]-1]}/></g>;})}
{cur.pts.map((q,i)=>{const[x,y]=pt(R.cx,R.cy,R.r+4,q.p);return <g key={i}><circle cx={x} cy={y} r={st.v?7:10} fill={PAL[q.s-1]}/><text x={x} y={y+(st.v?3:4)} textAnchor="middle" className="fb" style={{fill:ON_ACCENT,fontSize:st.v?8:10}}>{q.s}</text></g>;})}
<Btn x={310} y={48} w={100} t="+ add server" on={add} off={!next}/><Btn x={416} y={48} w={100} t="− remove last" on={drop} off={st.servers.length<=2}/><Btn x={522} y={48} w={108} t="S2 fails" on={fail} off={!st.servers.includes(2)||st.servers.length<=2}/>
<Btn x={310} y={82} w={170} t={st.v?"virtual nodes: on (6 each)":"virtual nodes: off"} on={vn} act={st.v}/><Btn x={486} y={82} w={80} t="reset" on={()=>set(START)}/>
<g aria-live="polite"><text x="310" y="134" className="fb">{st.msg}</text>
<text x="310" y="152" className="fl" style={{fill:st.mod!==null?RED:GREY}}>{st.mod!==null?`hash % N would have moved ${st.mod} of ${NK} (${Math.round(st.mod*100/NK)}%)`:"red rings mark the keys that moved"}</text></g>
<text x="310" y="174" className="fl">{`${st.servers.length} servers · ${st.v?"6 points":"1 point"} each · keys per server:`}</text>
{st.servers.map((s,i)=><g key={s}><text x="310" y={196+i*13} className="fl">{`S${s}`}</text><rect x={336} y={188+i*13} width={Math.max(1,count(s)*7)} height={9} fill={PAL[s-1]}/><text x={342+count(s)*7} y={196+i*13} className="fl">{count(s)}</text></g>)}
</svg>;}


// Moved here from the older Concepts groups (removed 2026-11-09), drawn the same way.
// Hash rings, FIG 1: going from 4 servers to 5. With hash % N, 16 of 20 carts change server; on a ring with
// servers at 10, 35, 60 and 85, a fifth server at 72 takes only the hashes from 61 to 72 from D: 4 of 20.
function HashMoveFig({still,uid=""}){const D=pace(14),K=[2,4,9,10,11,13,28,36,42,44,50,53,56,63,65,69,70,76,77,83],L="ABCDE",x=i=>20+i*30;
const ring=k=>k<=10||k>85?"A":k<=35?"B":k<=60?"C":"D",ring5=k=>k>60&&k<=72?"E":ring(k);
const caps=[["1 · 20 carts hashed to 0–99; with 4 servers, each cart lives on server hash % 4",INK],["2 · a fifth server, so hash % 5: 16 of the 20 carts now belong somewhere else",RED],["3 · on a ring, each server owns the hashes up to its point: 10, 35, 60 and 85",INK],["4 · E joins at 72 and takes only 61–72 from D: 4 carts move, the other 16 stay",BLUE]];
const cells=(y,f,cls="fb")=><g>{K.map((k,i)=>{const[t,c]=f(k);return <g key={i}><rect x={x(i)} y={y} width="26" height="24" fill={c===RED?LR:c===BLUE?LB:BG} stroke={c||GREY} strokeWidth={c?1.5:1}/><text x={x(i)+13} y={y+16} textAnchor="middle" className={cls} style={c?{fill:c}:undefined}>{t}</text></g>})}</g>;
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
function VnodesFig({still,uid=""}){const D=pace(14),R=62,CY=160;
const at=(cx,a,r=R)=>[cx+r*Math.sin(a*Math.PI/180),CY-r*Math.cos(a*Math.PI/180)];
const arc=(cx,a1,a2,c)=>{const[x1,y1]=at(cx,a1),[x2,y2]=at(cx,a2);return <path d={`M${x1} ${y1}A${R} ${R} 0 ${a2-a1>180?1:0} 1 ${x2} ${y2}`} fill="none" stroke={c} strokeWidth="6" strokeOpacity=".45"/>};
const P1=[[20,"A"],[60,"B"],[200,"C"],[290,"D"]];
const P2=[[0,"C"],[12,"A"],[30,"B"],[42,"C"],[63,"A"],[75,"C"],[90,"D"],[105,"B"],[117,"A"],[132,"C"],[147,"B"],[165,"A"],[177,"B"],[192,"D"],[207,"C"],[222,"D"],[240,"A"],[255,"D"],[267,"A"],[288,"D"],[300,"B"],[318,"C"],[333,"B"],[348,"D"]];
const big=(cx,[a,n],down)=>{const[x,y]=at(cx,a);return <g key={a}><circle cx={x} cy={y} r="11" fill={down?LR:BG} stroke={down?RED:INK} strokeDasharray={down?"3 2":undefined}/><text x={x} y={y+4} textAnchor="middle" className="fb" style={down?{fill:RED}:undefined}>{n}</text></g>};
const small=(cx,[a,n],down)=>{const[x,y]=at(cx,a),[lx,ly]=at(cx,a,R+13);return <g key={a}><circle cx={x} cy={y} r="3.5" fill={down?BG:INK} stroke={down?RED:INK}/><text x={lx} y={ly+3.5} textAnchor="middle" className="fl" style={down?{fill:RED}:undefined}>{n}</text></g>};
const table=(x0,S)=><g><text x={x0+174} y="96" className="fl">share</text>{"ABCD".split("").map((n,i)=><g key={n}><text x={x0+160} y={120+i*22} className="fb">{n}</text><rect x={x0+174} y={111+i*22} width={S[i]} height="10" fill={GRID} stroke={GREY}/><text x={x0+230} y={120+i*22} className="fl">{S[i]}%</text></g>)}</g>;
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
"ch-shard-events":{C:ShardEventsFig,ar:640/236,title:()=>"WHICH DATABASE HOLDS THIS MATCH?"},
"ch-modulo":{C:ModuloFig,ar:640/208,title:()=>"HASH, THEN MODULO"},
"ch-mod-change":{C:ModChangeFig,ar:640/256,title:()=>"ONE DATABASE MORE OR LESS, MOST KEYS MOVE"},
"ch-ring":{C:RingFig,ar:640/258,title:()=>"WALK CLOCKWISE TO THE NEXT DATABASE"},
"ch-ring-add":{C:RingAddFig,ar:640/250,title:()=>"A FIFTH DATABASE TAKES ONE SLICE"},
"ch-ring-remove":{C:RingRemoveFig,ar:640/250,title:()=>"A FAILED DATABASE'S KEYS GO NEXT DOOR"},
"ch-vnodes-fail":{C:VnodesFailFig,ar:640/254,title:()=>"WITH VIRTUAL NODES, A FAILURE IS SHARED"},
"ch-salt":{C:SaltFig,ar:640/262,title:()=>"ONE HOT KEY, SALTED INTO TEN"},
"ch-replicas":{C:ReplicasFig,ar:640/250,title:()=>"COPIES ROUND THE RING"},
"ch-playground":{C:PlaygroundFig,ar:640/300,title:()=>"TRY IT: A RING YOU CAN CHANGE"},
"hash-move":{C:HashMoveFig,ar:640/256,title:()=>"A FIFTH SERVER: WHO MOVES"},
"hash-vnodes":{C:VnodesFig,ar:640/272,title:()=>"ONE POINT PER SERVER, OR SIX"},
};
