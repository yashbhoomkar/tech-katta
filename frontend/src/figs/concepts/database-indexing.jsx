// Concepts › Database indexing: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "indexing").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import{BG,FB,GRID,SURFACE,SURFACE_2}from"../../theme/palette.js";import React from"react";import{Bx,Ar,INK,GREY,RED,BLUE,LB,LR,T,Fig,Mk,Cap,Caps,Glow,Show,Dot,pace}from"../parts.jsx";

const Pg=({x,y,w,h,c=GREY,fill=BG,t})=><g><rect x={x} y={y} width={w} height={h} fill={fill} stroke={c}/>{t&&<text x={x+w/2} y={y+h/2+4} textAnchor="middle" className="fl" style={{fill:c===GREY?INK:c}}>{t}</text>}</g>;

// Index step, FIG 1: scanning every page versus following an index.
function ScanFig({still,uid=""}){const M=`is${uid}`;
const L=(c,fill)=>Array.from({length:24},(_,i)=><Pg key={i+c} x={10+(i%6)*46} y={64+Math.floor(i/6)*32} w={40} h={26} c={c} fill={fill}/>);
const Rg=(hit)=>Array.from({length:24},(_,i)=><Pg key={i+String(hit)} x={440+(i%6)*32} y={64+Math.floor(i/6)*32} w={28} h={26} c={hit&&i===15?BLUE:GREY} fill={hit&&i===15?LB:BG}/>);
const base=<g><T x={10} y={52} t="without an index: the table's pages" b/><T x={320} y={52} t="with an index" b/>{L(GREY,BG)}{Rg(false)}</g>;
const s1=<g><T x={10} y={210} t="phone = 98200 00001: which page? any of them" c={INK}/></g>;
const s2=<g>{L(RED,LR)}<T x={10} y={228} t="reads all 24 pages to find one row" c={RED}/></g>;
const s3=<g>{["root","internal","leaf"].map((t,i)=><g key={t}><Pg x={320} y={64+i*42} w={90} h={26} c={BLUE} fill={LB} t={t}/>{i<2&&<Ar x1={365} y1={92+i*42} x2={365} y2={104+i*42} m={M} c={BLUE}/>}</g>)}<Ar x1={412} y1={161} x2={534} y2={142} m={M} c={BLUE}/>{Rg(true)}</g>;
const s4=<g><T x={320} y={228} t="3 index pages + 1 table page" c={BLUE}/></g>;
const caps=[["1 · rows sit in pages in arrival order; the page with this phone could be any",INK],["2 · without an index, every page is read until the row turns up",RED],["3 · an index leads from its root to a leaf that names the right page",BLUE],["4 · four page reads instead of the whole table",BLUE]];
return <Fig still={still} h={238} id={`ist${uid}`} M={M} caps={caps} title="Finding one phone number. The table's rows sit in pages in arrival order, so the row could be on any page. Without an index, the database reads all 24 pages to find it. With an index, it reads the root, an internal and a leaf page of the index, which name the one table page holding the row: four page reads instead of the whole table."
base={base} g={[s1,s2,s3,s4]} last={<g>{s2}{s3}{s4}</g>}/>}

// Index step, FIG 2: one insert, several writes.
function CostFig({still,uid=""}){const M=`ic${uid}`;
const tgt=(i,t,s,c=BLUE)=><g key={i}><Ar x1={182} y1={118} x2={346} y2={62+i*44} m={M} c={c}/><Bx x={350} y={44+i*44} w={280} h={36} t={t} s={s} c={c} fill={LB}/></g>;
const base=<Bx x={10} y={96} w={170} h={44} t="INSERT order 9105" s="one new row"/>;
const s1=tgt(0,"orders table","the row itself");
const s2=tgt(1,"primary key index","(id)");
const s3=<g>{tgt(2,"index","(customer_id, placed_at)")}{tgt(3,"index","(restaurant_id, status)")}</g>;
const s4=<g><T x={10} y={204} t="4 writes for 1 insert" b c={RED}/><T x={10} y={222} t="a log table nobody searches can skip them"/></g>;
const caps=[["1 · an insert writes the row into the table",INK],["2 · and into the primary key's index",BLUE],["3 · and into every other index on the table",BLUE],["4 · each index makes every write a little slower and takes space",RED]];
return <Fig still={still} h={232} id={`ict${uid}`} M={M} caps={caps} title="The cost of indexes. Inserting order 9105 writes the row into the orders table, then into the primary key index, then into each other index, on customer and time and on restaurant and status: four writes for one insert. A log table that nobody searches can skip them."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// B-trees, FIG 1: three page reads to id 350.
function FindFig({still,uid=""}){const M=`ib${uid}`;
const N=(x,y,w,t,c=GREY,fill=BG)=><Bx key={t+c} x={x} y={y} w={w} h={30} t={t} c={c} fill={fill}/>;
const base=<g>{N(245,48,150,"300 · 600")}{N(30,110,160,"100 · 200")}{N(240,110,160,"340 · 360")}{N(450,110,160,"700 · 850")}{N(150,172,150,"301 … 339")}{N(320,172,170,"345 · 350 · 355")}
{[[110],[320],[530]].map(([x],i)=><line key={i} x1={320} y1={78} x2={x} y2={110} stroke={GREY}/>)}<line x1={300} y1={140} x2={225} y2={172} stroke={GREY}/><line x1={340} y1={140} x2={405} y2={172} stroke={GREY}/></g>;
const s1=<g>{N(245,48,150,"300 · 600",BLUE,LB)}<T x={10} y={212} t="1: between 300 and 600" c={BLUE}/></g>;
const s2=<g>{N(240,110,160,"340 · 360",BLUE,LB)}<T x={200} y={212} t="2: between 340 and 360" c={BLUE}/></g>;
const s3=<g>{N(320,172,170,"345 · 350 · 355",BLUE,LB)}<Ar x1={492} y1={187} x2={520} y2={187} m={M} c={BLUE}/><T x={524} y={191} t="row 350" c={BLUE}/></g>;
const s4=<g><T x={10} y={230} t="three page reads: root, internal, leaf; one more for the row itself" c={BLUE}/></g>;
const caps=[["1 · the root page says which child covers 350",BLUE],["2 · the internal page narrows it further",BLUE],["3 · the leaf page holds 350 and where its row lives",BLUE],["4 · each node is one page, so a lookup is a few page reads",BLUE]];
return <Fig still={still} h={238} id={`ibt${uid}`} M={M} caps={caps} title="Looking up id 350 in a B-tree. The root page, with keys 300 and 600, sends the search to the middle child. That internal page, with keys 340 and 360, sends it to the leaf holding 345, 350 and 355. The leaf holds 350 and points to its row. Three page reads, plus one for the row."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// B-trees, FIG 2: a leaf splits.
function SplitFig({still,uid=""}){const M=`ip${uid}`;
const base=<g><Bx x={230} y={48} w={180} h={30} t="200 · 400" /><line x1={320} y1={78} x2={320} y2={128} stroke={GREY}/></g>;
const s1=<g><Bx x={180} y={128} w={280} h={30} t="210 · 220 · 230 · 240" s=""/><T x={470} y={148} t="full: 4 of 4"/></g>;
const s2=<g><Bx x={500} y={70} w={120} h={30} t="insert 235" c={RED} fill={LR}/><Ar x1={520} y1={102} x2={460} y2={128} m={M} c={RED}/></g>;
const s3=<g><rect x={175} y={80} width={400} height={84} fill={BG}/><Bx x={110} y={128} w={180} h={30} t="210 · 220" c={BLUE} fill={LB}/><Bx x={330} y={128} w={200} h={30} t="230 · 235 · 240" c={BLUE} fill={LB}/><rect x={500} y={66} width={125} height={40} fill={BG}/><line x1={300} y1={78} x2={200} y2={128} stroke={GREY}/><line x1={340} y1={78} x2={430} y2={128} stroke={GREY}/></g>;
const s4=<g><Bx x={230} y={48} w={180} h={30} t="200 · 230 · 400" c={BLUE} fill={LB}/><T x={10} y={204} t="the parent gains a key for the new leaf; if it fills, it splits too," c={BLUE}/><T x={10} y={220} t="and a split at the root adds a level for every leaf at once" c={BLUE}/></g>;
const caps=[["1 · a leaf holds as many keys as fit in its page: this one is full",INK],["2 · one more key arrives",RED],["3 · the leaf splits into two half-full leaves",BLUE],["4 · the parent gains a key; the tree only ever grows at the top, so it stays balanced",BLUE]];
return <Fig still={still} h={230} id={`ipt${uid}`} M={M} caps={caps} title="A B-tree leaf splits. A leaf under a parent with keys 200 and 400 is full with 210, 220, 230 and 240. When 235 arrives, the leaf splits into two half-full leaves, 210 and 220, and 230, 235 and 240, and the parent gains the key 230. If the parent fills it splits too, and a split at the root adds a level for every leaf at once, so the tree stays balanced."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s3}{s4}</g>}/>}

// LSM trees, FIG 1: the write path.
function LsmWriteFig({still,uid=""}){const M=`iw${uid}`;
const sst=(i,t,c=GREY,fill=BG)=><Bx key={t+c} x={230+i*100} y={178} w={90} h={30} t={t} c={c} fill={fill}/>;
const base=<g><T x={10} y={128} t="memory" b/><T x={10} y={70} t="disk" b/><T x={10} y={198} t="disk" b/>{["SST 1","SST 2","SST 3"].map((t,i)=>sst(i,t))}<T x={230} y={166} t="sorted files on disk, oldest first"/></g>;
const s1=<g><Bx x={60} y={86} w={140} h={40} t="write" s="rider 9 at 20:05"/><Ar x1={202} y1={98} x2={226} y2={70} m={M} c={BLUE}/><Bx x={230} y={50} w={200} h={34} t="write-ahead log" s="append only" c={BLUE} fill={LB}/></g>;
const s2=<g><Ar x1={202} y1={114} x2={226} y2={122} m={M} c={BLUE}/><Bx x={230} y={104} w={200} h={34} t="memtable" s="sorted, in memory" c={BLUE} fill={LB}/><T x={440} y={125} t="done: no page rewritten" c={BLUE}/></g>;
const s3=<g><Ar x1={330} y1={140} x2={570} y2={176} m={M} c={BLUE}/>{sst(3,"SST 4",BLUE,LB)}<T x={480} y={146} t="full: flushed in one go" c={BLUE}/></g>;
const s4=<g><rect x={226} y={174} width={198} height={38} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="4 3"/><T x={230} y={232} t="compaction merges SST 1 and 2, keeping each key's newest version" c={BLUE}/></g>;
const caps=[["1 · a write is appended to the log on disk: sequential and fast",BLUE],["2 · and put in the memtable in memory; the write is done",BLUE],["3 · a full memtable is written to disk as one sorted file",BLUE],["4 · in the background, compaction merges files into bigger ones",BLUE]];
return <Fig still={still} h={240} id={`iwt${uid}`} M={M} caps={caps} title="The write path of an LSM tree. A write, a rider's location, is appended to the write-ahead log on disk and inserted into the memtable in memory, and the write is done with no page rewritten. When the memtable is full it is written to disk in one go as a new sorted file, SST 4. In the background, compaction merges older files, here SST 1 and 2, keeping only the newest version of each key."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// LSM trees, FIG 2: the read path with Bloom filters.
function LsmReadFig({still,uid=""}){const M=`ir${uid}`;
const R=["memtable","SST 4 (newest)","SST 3","SST 2","SST 1 (oldest)"];
const row=(i,c=GREY,fill=BG)=><Bx key={i+c} x={200} y={50+i*34} w={170} h={28} t={R[i]} c={c} fill={fill}/>;
const base=<g><Bx x={10} y={90} w={150} h={40} t="get rider 7" s="latest location"/>{R.map((_,i)=>row(i))}</g>;
const s1=<g><T x={386} y={68} t="not in memory" c={INK}/></g>;
const s2=<g>{row(1,GREY,SURFACE)}{row(2,GREY,SURFACE)}<T x={386} y={102} t="Bloom filter: definitely not here" c={INK}/><T x={386} y={136} t="Bloom filter: definitely not here" c={INK}/></g>;
const s3=<g>{row(3,BLUE,LB)}<T x={386} y={170} t="maybe: read the file, found 19.08, 72.88" c={BLUE}/></g>;
const s4=<g><T x={386} y={204} t="never checked" c={GREY}/><T x={10} y={240} t="one file read; the filters ruled the others out in memory" c={BLUE}/></g>;
const caps=[["1 · a read checks the memtable first",INK],["2 · each file's Bloom filter rules it out in memory, without a disk read",INK],["3 · only a file whose filter says 'maybe' is read",BLUE],["4 · the newest version wins, so older files needn't be checked",BLUE]];
return <Fig still={still} h={250} id={`irt${uid}`} M={M} caps={caps} title="The read path of an LSM tree. Reading rider 7's latest location checks the memtable first, which doesn't have it. The Bloom filters of SST 4 and SST 3 say the key is definitely not there, so they are skipped without a disk read. SST 2's filter says maybe, so that file is read and the location found. The newest version wins, so SST 1 is never checked."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// LSM and hash, FIG 3: a hash index.
function HashFig({still,uid=""}){const M=`ih${uid}`;
const bk=(i,c=GREY,fill=BG)=><Pg key={i+c} x={300} y={46+i*20} w={110} h={18} c={c} fill={fill} t={`bucket ${i}`}/>;
const base=<g>{Array.from({length:8},(_,i)=>bk(i))}</g>;
const s1=<g><Bx x={10} y={92} w={130} h={36} t="98200 00001"/><Ar x1={142} y1={110} x2={166} y2={110} m={M}/><Bx x={170} y={92} w={90} h={36} t="hash()"/></g>;
const s2=<g><Ar x1={262} y1={110} x2={296} y2={155} m={M} c={BLUE}/>{bk(5,BLUE,LB)}<Ar x1={412} y1={155} x2={466} y2={155} m={M} c={BLUE}/><Bx x={470} y={136} w={150} h={36} t="user 77's row" c={BLUE} fill={LB}/></g>;
const s3=<g><T x={10} y={214} t="'phones starting 98200': where?" c={RED}/>{[1,3,6].map(i=><circle key={i} cx={420} cy={55+i*20} r={5} fill={RED}/>)}<T x={430} y={78} t="matches scattered" c={RED}/></g>;
const s4=<g><T x={10} y={230} t="hashing scrambles order: no ranges, no sorting, no prefixes" c={RED}/></g>;
const caps=[["1 · the key is hashed",INK],["2 · the hash names a bucket, which points straight at the row: one step",BLUE],["3 · but a range or a prefix has no single bucket",RED],["4 · neighbouring values are scattered, so there is no order to scan",RED]];
return <Fig still={still} h={238} id={`iht${uid}`} M={M} caps={caps} title="A hash index. The phone number 98200 00001 is hashed, the hash names bucket 5, and the bucket points straight at user 77's row: one step. But a query for phones starting with 98200 has no single bucket: matching numbers are scattered across buckets 1, 3 and 6, because hashing scrambles order. Hash indexes can't do ranges, sorting or prefixes."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Special indexes, FIG 1: a latitude band versus nearby cells.
function GeoBandFig({still,uid=""}){
const P=Array.from({length:60},(_,i)=>[((i*37)%97)/97,((i*53)%89)/89]);
const map=(x0,c)=><g><rect x={x0} y={56} width={290} height={170} fill={SURFACE_2} stroke={GREY}/>{P.map(([a,b],i)=><circle key={i} cx={x0+8+a*274} cy={64+b*154} r={2.5} fill={c}/>)}</g>;
const U=[0.48,0.45];const ux=x0=>x0+8+U[0]*274,uy=64+U[1]*154;
const base=<g><T x={10} y={50} t="B-tree on latitude" b/><T x={340} y={50} t="spatial index: cells" b/>{map(10,GREY)}{map(340,GREY)}</g>;
const me=x0=><g><circle cx={ux(x0)} cy={uy} r={6} fill={BLUE}/><circle cx={ux(x0)} cy={uy} r={26} fill="none" stroke={BLUE} strokeDasharray="3 3"/></g>;
const s1=<g>{me(10)}{me(340)}</g>;
const s2=<g><rect x={10} y={uy-26} width={290} height={52} fill={RED} opacity="0.12"/><line x1={10} y1={uy-26} x2={300} y2={uy-26} stroke={RED}/><line x1={10} y1={uy+26} x2={300} y2={uy+26} stroke={RED}/><T x={10} y={242} t="the whole band, coast to coast, is read" c={RED}/></g>;
const cell=58,cx0=ux(340)-cell*1.5,cy0=uy-cell*1.5+13;
const s3=<g>{[0,1,2].map(r=>[0,1,2].map(c=><rect key={`${r}${c}`} x={cx0+c*cell} y={cy0+r*cell/1.6} width={cell} height={cell/1.6} fill={BLUE} opacity="0.12" stroke={BLUE}/>))}</g>;
const s4=<g><T x={340} y={242} t="only the user's cell and its neighbours" c={BLUE}/></g>;
const caps=[["1 · 'restaurants within 3 km' is a question in two dimensions",INK],["2 · an index on latitude finds a band that stretches across the whole map",RED],["3 · a spatial index finds the user's cell and the cells around it",BLUE],["4 · so it reads a few nearby cells instead of a band of the country",BLUE]];
return <Fig still={still} h={250} id={`igt${uid}`} caps={caps} title="Why location needs a spatial index. Finding restaurants within 3 km of a user is a two-dimensional question. A B-tree on latitude narrows it only to a band that stretches across the whole map, which must then be read and filtered. A spatial index finds the user's cell and the eight cells around it, so it reads only nearby places."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Special indexes, FIG 3: a covering index.
function CoveringFig({still,uid=""}){const M=`iv${uid}`;
const E=[["21:10","#9131","delivered","₹420"],["20:05","#9107","delivered","₹260"],["18:40","#9088","cancelled","₹180"],["12:02","#9031","delivered","₹540"]];
const base=<g><T x={10} y={50} t="SELECT id, status, total … WHERE customer_id = 77 ORDER BY placed_at DESC"/><rect x={10} y={62} width={290} height={124} fill={BG} stroke={GREY}/><T x={20} y={80} t="index (customer_id, placed_at)" b/>
<rect x={360} y={62} width={270} height={124} fill={BG} stroke={GREY}/><T x={370} y={80} t="orders table" b/>{Array.from({length:8},(_,i)=><Pg key={i} x={370+(i%4)*64} y={92+Math.floor(i/4)*44} w={56} h={36}/>)}</g>;
const plain=E.map(([t],i)=><T key={i} x={20} y={102+i*20} t={`77 · ${t} → row`}/>);
const s1=<g>{plain}</g>;
const s2=<g>{plain}{E.map((_,i)=><Ar key={i} x1={150} y1={98+i*20} x2={372+((i*3)%4)*64} y2={i<2?110:154} m={M} c={RED}/>)}<T x={360} y={206} t="each order: one more read of the table" c={RED}/></g>;
const s3=<g><rect x={12} y={88} width={286} height={94} fill={LB}/>{E.map(([t,id,st,tot],i)=><T key={i} x={20} y={102+i*20} t={`77 · ${t} · ${id} · ${st} · ${tot}`} c={BLUE}/>)}<T x={10} y={206} t="INCLUDE (id, status, total)" c={BLUE} b/></g>;
const s4=<g><rect x={360} y={62} width={270} height={124} fill={BG} opacity="0.7"/><T x={10} y={224} t="answered from the index alone; the table isn't read" c={BLUE}/></g>;
const caps=[["1 · the index finds customer 77's orders, newest first",INK],["2 · but the list also needs status and total, so each row is fetched from the table",RED],["3 · a covering index includes those columns in its entries",BLUE],["4 · now the query never touches the table: an index-only scan",BLUE]];
return <Fig still={still} h={232} id={`ivt${uid}`} M={M} caps={caps} only={[1]} title="A covering index. The query wants customer 77's orders, newest first, with id, status and total. An index on customer and time finds the orders, but each one then needs another read of the table for its status and total. A covering index includes id, status and total in its entries, so the query is answered from the index alone and the table isn't read."
base={base} g={[s1,s2,s3,s4]} last={<g>{s3}{s4}</g>}/>}


// Moved here from the older Concepts groups (removed 2026-11-09), drawn the same way.
// Indexes, FIG 1: a B-tree lookup. Finding Priya Nair among 6.4 crore customers: the root page sends N–S down
// one branch, that page sends Pm–Pz to one leaf, and the leaf holds the name with the address of its row.
// With about 400 keys a page, three levels cover 1 → 400 → 1,60,000 pages: 6.4 crore names.
function BtreeFig({still,uid=""}){const M=`bt${uid}`,D=pace(14);
const caps=[["1 · find Priya Nair among 6.4 crore customers: start at the root page",INK],["2 · the root sends N to S down one branch, and that page narrows it to Pm–Pz",BLUE],["3 · the leaf page holds the names in order, each with the address of its row",BLUE],["4 · one more read fetches the row: 4 page reads instead of 6.4 crore rows",BLUE]];
const node=(x,y,w,ts,hi,cls="fb")=><g>{ts.map((t,i)=><g key={i}><rect x={x+i*w} y={y} width={w} height="28" fill={i===hi?FB:BG} stroke={i===hi?BLUE:GREY}/><text x={x+i*w+w/2} y={y+18} textAnchor="middle" className={cls} style={i===hi?{fill:BLUE}:undefined}>{t}</text></g>)}</g>;
const stub=(x,y)=><line key={x} x1={x} y1={y} x2={x} y2={y+12} stroke={GREY}/>;
const root=<g>{node(10,50,80,["A – F","G – M","N – S","T – Z"],2)}{[0,1,3].map(i=>stub(50+80*i,78))}</g>;
const l2=<g><Ar x1={210} y1={78} x2={200} y2={106} m={M}/>{node(40,108,64,["N","O","Pa – Pl","Pm – Pz","Q – S"],3)}{[0,1,2,4].map(i=>stub(72+64*i,136))}</g>;
const leaf=<g><Ar x1={264} y1={136} x2={222} y2={166} m={M}/>{node(10,168,80,["Priya Menon","Priya Naik","Priya Nair","Priya Negi"],2,"fl")}</g>;
const row=<g><Ar x1={210} y1={196} x2={210} y2={228} m={M}/><rect x="110" y="230" width="220" height="28" fill={LB} stroke={BLUE}/><text x="220" y="248" textAnchor="middle" className="fl" style={{fill:BLUE}}>Priya Nair · Pune · since 2023</text><text x="10" y="248" className="fl">the table's row</text></g>;
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
function IndexOrderFig({still,uid=""}){const D=pace(14),Y=i=>78+i*21;
const E=[[41,"delivered","18:52"],[41,"preparing","19:08"],[42,"delivered","18:40"],[42,"delivered","18:58"],[42,"preparing","19:05"],[42,"preparing","19:11"],[42,"ready","19:02"],[43,"delivered","18:47"],[43,"preparing","19:09"],[44,"preparing","19:03"]];
const caps=[["1 · an index on (restaurant, status, time) keeps its entries sorted, like a phone book",INK],["2 · restaurant 42, preparing: the matches sit together, so it reads one short range",BLUE],["3 · restaurant 42, newest first: one range, but in status order, so it still sorts",INK],["4 · everything preparing: the matches are scattered, so the index can't narrow it",RED]];
const Q3=[1,4,5,8,9];
const hl=(rows,fill)=><g>{rows.map(i=><rect key={i} x="30" y={Y(i)-14} width="220" height="19" fill={fill}/>)}</g>;
const rects=<g><text x="30" y="56" className="fk">INDEX ON (RESTAURANT, STATUS, TIME)</text>{E.map((e,i)=><rect key={i} x="30" y={Y(i)-14} width="220" height="19" fill={BG} stroke={GREY}/>)}</g>;
const texts=<g>{E.map(([r,s,t],i)=><g key={i}><text x="40" y={Y(i)} className="fl">{r}</text><text x="80" y={Y(i)} className="fl">{s}</text><text x="240" y={Y(i)} textAnchor="end" className="fl">{t}</text></g>)}</g>;
const br=(x,a,b,n,c)=><g><path d={`M${x} ${Y(a)-14}h6v${Y(b)-Y(a)+19}h-6`} fill="none" stroke={c} strokeWidth="1.5"/><text x={x+11} y={(Y(a)+Y(b))/2+1} className="fb" style={{fill:c}}>{n}</text></g>;
const q=(y,n,t,s,c)=><g><text x="320" y={y} className="fb">{n} · {t}</text><text x="320" y={y+16} className="fl" style={c!==INK?{fill:c}:undefined}>{s}</text></g>;
const s2=<g>{br(256,4,5,"1",BLUE)}{q(96,1,"restaurant 42, preparing","side by side: one short range",BLUE)}</g>;
const s3=<g>{br(280,2,6,"2",INK)}{q(160,2,"restaurant 42, newest first","one range, in status order: then a sort",INK)}</g>;
const s4=<g>{Q3.map(i=><circle key={i} cx="20" cy={Y(i)-4.5} r="3.5" fill={RED}/>)}{q(224,3,"everything preparing","scattered: the index can't narrow it",RED)}<text x="320" y="278" className="fl" style={{fill:BLUE}}>an index helps from its first column onward</text></g>;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`iot${uid}`}><title id={`iot${uid}`}>An index on restaurant, status and order time, shown as a sorted list of ten entries, sorted first by restaurant, then by status, then by time. Query one, restaurant 42 with status preparing, finds its two matches side by side: one short range. Query two, restaurant 42 newest first, finds one range of five entries, but they are in status order, not time order, so the database still sorts them. Query three, every order that is preparing at any restaurant, finds matches scattered through the whole list, so the index can't narrow the search. An index helps from its first column onward.</title>
{rects}{still?<g>{texts}{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<g><g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={.5} dur={D}>{hl([4,5],FB)}</Show><Show t0={.5} t1={.75} dur={D}>{hl([2,3,4,5,6],GRID)}</Show><Show t0={.75} t1={1} dur={D}>{hl(Q3,LR)}</Show></g>{texts}
<g aria-hidden="true"><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g></g>}</svg>}

export const FIGS={
"ix-scan":{C:ScanFig,ar:640/238,title:()=>"EVERY PAGE, OR FOUR"},
"ix-cost":{C:CostFig,ar:640/232,title:()=>"ONE INSERT, FOUR WRITES"},
"ix-btree-find":{C:FindFig,ar:640/238,title:()=>"THREE PAGES TO ID 350"},
"ix-btree-split":{C:SplitFig,ar:640/230,title:()=>"A FULL LEAF SPLITS"},
"ix-lsm-write":{C:LsmWriteFig,ar:640/240,title:()=>"HOW AN LSM TREE TAKES A WRITE"},
"ix-lsm-read":{C:LsmReadFig,ar:640/250,title:()=>"HOW AN LSM TREE FINDS A KEY"},
"ix-hash":{C:HashFig,ar:640/238,title:()=>"ONE STEP, BUT ONLY FOR EXACT KEYS"},
"ix-geo-band":{C:GeoBandFig,ar:640/250,title:()=>"A BAND ACROSS THE MAP, OR NINE CELLS"},
"ix-covering":{C:CoveringFig,ar:640/232,title:()=>"ANSWERED FROM THE INDEX ALONE"},
"btree-path":{C:BtreeFig,ar:640/270,title:()=>"FOUR READS TO ONE CUSTOMER"},
"index-order":{C:IndexOrderFig,ar:640/290,title:()=>"COLUMN ORDER DECIDES"},
};
