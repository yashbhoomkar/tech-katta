// Concepts › Specialised data: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "specialised").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import{ACCENT_LINE,BG,FB,GRID,LB,LR}from"../../theme/palette.js";import React from"react";import{Show,Mk,Bx,Ar,Caps,Cap,INK,GREY,RED,BLUE}from"../parts.jsx";

// ---- Specialised data: shared bits for the figures below.
const LBq=LB,LRq=LR,FBq=FB;

const Tq=({x,y,t,c,a,b})=><text x={x} y={y} textAnchor={a} className={b?"fb":"fl"} style={c?{fill:c}:undefined}>{t}</text>;

const Stq=({caps,g,D="14s",only=[]})=><g aria-hidden="true"><Caps caps={caps} D={D}/>{g.map((x,i)=>x&&<Show key={i} t0={i/4} t1={only.includes(i)?(i+1)/4:1} dur={D}>{x}</Show>)}</g>;

// Proximity, FIG 1: geohash precision. Pune's centre (18.5204, 73.8567) is tek92es…; each extra character
// cuts a cell into 32. Sizes at the equator: 4 chars ≈ 39 × 20 km, 5 ≈ 4.9 km, 6 ≈ 1.2 × 0.6 km, 7 ≈ 153 m.
function ProxSizesFig({still,uid=""}){
const R=[["tek9","39 km × 20 km","a metro region",44],["tek92","4.9 km × 4.9 km","restaurants that deliver here",34],["tek92e","1.2 km × 0.6 km","riders near a restaurant",24],["tek92es","153 m × 153 m","the rider at the door",14]];
const caps=[["1 · a geohash names a cell of the map: Pune's centre is in cell tek9, about 39 by 20 km",INK],["2 · each extra character cuts the cell into 32: tek92 is about 5 km across",BLUE],["3 · six characters is about 1.2 km by 0.6 km; seven is a square of about 150 m",BLUE],["4 · pick the length from the radius: about 5 km for delivery, a few hundred metres for riders",BLUE]];
const row=(i,hi)=>{const[g,s,u,w]=R[i],y=56+i*46;return <g key={i}><rect x={50-w/2} y={y+18-w/2} width={w} height={w} fill={hi?FBq:GRID} stroke={hi?BLUE:GREY}/>
<text x={110} y={y+23} className="fb"><tspan>{g.slice(0,-1)}</tspan><tspan style={{fill:BLUE}}>{g.slice(-1)}</tspan></text><Tq x={210} y={y+23} t={s}/><Tq x={380} y={y+23} t={u} c={hi?BLUE:undefined}/></g>};
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`pzt${uid}`}><title id={`pzt${uid}`}>Geohash cells for the centre of Pune. Four characters, tek9, is a cell about 39 by 20 kilometres. Each extra character cuts the cell into 32: tek92 is about 4.9 kilometres across, tek92e about 1.2 by 0.6 kilometres, and tek92es a square of about 153 metres. Choose the length from the search radius: about 5 kilometres for restaurants that deliver, a few hundred metres for riders.</title>
<Tq x={110} y={44} t="GEOHASH" b/><Tq x={210} y={44} t="CELL SIZE" b/><Tq x={380} y={44} t="GOOD FOR" b/>{still?<g>{[0,1,2,3].map(i=>row(i,1))}<Cap t={caps[3][0]}/></g>:<g>{row(0,1)}<Stq caps={caps} g={[null,row(1,1),row(2,1),row(3,1)]}/></g>}</svg>}

// Proximity, FIG 2: an adaptive quadtree over 36 restaurants: split any square holding more than 4, at most
// 4 levels deep. The dense centre gets small cells, the outskirts big ones; a query reads its leaf and neighbours.
const QPTS=[[.353,.545],[.619,.438],[.341,.492],[.557,.632],[.354,.345],[.585,.557],[.684,.618],[.488,.467],[.808,.465],[.406,.363],[.511,.517],[.459,.493],[.533,.583],[.632,.525],[.285,.584],[.33,.479],[.323,.5],[.407,.526],[.896,.494],[.601,.341],[.465,.579],[.489,.544],[.512,.379],[.568,.403],[.725,.439],[.582,.5],[.91,.47],[.98,.397],[.073,.629],[.779,.27],[.087,.333],[.964,.758],[.118,.246],[.101,.06],[.797,.178],[.559,.447]];

const qsplit=(x,y,s,d,P)=>{const In=P.filter(([a,b])=>a>=x&&a<x+s&&b>=y&&b<y+s);if(In.length>4&&d<4){const h=s/2;return [[0,0],[h,0],[0,h],[h,h]].flatMap(([dx,dy])=>qsplit(x+dx,y+dy,h,d+1,In))}return [[x,y,s,d,In.length]]};

function ProxQuadFig({still,uid=""}){const S=220,X0=20,Y0=36,L=qsplit(0,0,1,0,QPTS),Q=[.47,.52];
const caps=[["1 · start with one square for the whole city: 36 restaurants in it",INK],["2 · split any square holding more than 4 restaurants into four",BLUE],["3 · keep splitting: the busy centre ends in small cells, the outskirts in big ones",BLUE],["4 · a search walks down to the customer's cell and reads it and its neighbours",BLUE]];
const rect=([x,y,s,d],k,c=GREY,fill="none")=><rect key={k} x={X0+x*S} y={Y0+y*S} width={s*S} height={s*S} fill={fill} stroke={c}/>;
const leaf=L.find(([x,y,s])=>Q[0]>=x&&Q[0]<x+s&&Q[1]>=y&&Q[1]<y+s);
const near=L.filter(([x,y,s])=>{const[lx,ly,ls]=leaf;return x<=lx+ls+1e-9&&x+s>=lx-1e-9&&y<=ly+ls+1e-9&&y+s>=ly-1e-9});
const pts=<g>{QPTS.map(([a,b],i)=><circle key={i} cx={X0+a*S} cy={Y0+b*S} r="2.6" fill={INK}/>)}</g>;
const base=<g><rect x={X0} y={Y0} width={S} height={S} fill={BG} stroke={GREY}/>{pts}</g>;
const lvl1=<g>{qsplit(0,0,1,0,QPTS).filter(l=>l[3]<=1).map((l,k)=>rect(l,k))}{[[0,0,.5],[.5,0,.5],[0,.5,.5],[.5,.5,.5]].map((l,k)=>rect([...l,1],"q"+k))}</g>;
const all=<g>{L.map((l,k)=>rect(l,k))}</g>;
const q=<g>{near.map((l,k)=>rect(l,"n"+k,BLUE,FBq))}{rect(leaf,"leaf",BLUE,ACCENT_LINE)}{pts}<circle cx={X0+Q[0]*S} cy={Y0+Q[1]*S} r="5" fill={RED}/></g>;
const side=<g><Tq x={280} y={70} t={`${QPTS.length} restaurants, at most 4 per cell`}/><Tq x={280} y={92} t={`${L.length} cells after splitting`}/><Tq x={280} y={114} t="the smallest are 1/8 of the city's width"/><Tq x={280} y={150} t="busy areas get small cells, quiet ones big cells," c={BLUE}/><Tq x={280} y={166} t="so every cell holds about the same number" c={BLUE}/><Tq x={280} y={210} t="red dot: the customer; blue: cells read" c={RED}/></g>;
return <svg viewBox="0 0 640 266" role="img" aria-labelledby={`pqt${uid}`}><title id={`pqt${uid}`}>An adaptive quadtree over 36 restaurants in a city. It starts as one square, and any square holding more than 4 restaurants is split into four, up to four levels. The busy centre ends up in small cells and the quiet outskirts in big ones, so every cell holds about the same number. To find restaurants near a customer, the search walks down to the customer's cell and reads it and its neighbours.</title>
{base}{side}{still?<g>{all}{q}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[1,2]} g={[null,lvl1,all,<g>{all}{q}</g>]}/>}</svg>}

// Vector search, FIG 1: embeddings drawn in two dimensions. Dishes with similar meaning land close together; the
// query "spicy cottage cheese starter" lands among the paneer dishes although it never says "paneer".
function VecEmbedFig({still,uid=""}){
const P=[["Paneer tikka",96,84],["Kadai paneer",150,104],["Chilli paneer",84,124],["Masala dosa",300,82],["Rava dosa",338,104],["Idli sambar",296,128],["Gulab jamun",306,206],["Rasmalai",346,226],["Chicken biryani",80,206],["Veg biryani",128,230]],Q=[118,112];
const caps=[["1 · a model turns each dish's description into a vector: hundreds of numbers",INK],["2 · drawn in two dimensions, dishes with similar meaning land close together",BLUE],["3 · the search text goes through the same model and lands among the paneer dishes",BLUE],["4 · the nearest vectors are the results, though the query never says 'paneer'",BLUE]];
const dots=hi=><g>{P.map(([t,x,y],i)=><g key={t}><circle cx={x} cy={y} r="4" fill={hi&&i<3?BLUE:INK}/><Tq x={x+8} y={y+4} t={t} c={hi&&i<3?BLUE:undefined}/></g>)}</g>;
const vec=<g><Tq x={440} y={60} t="Kadai paneer →" b/><Tq x={440} y={78} t="[0.12, -0.53, 0.88, 0.04,"/><Tq x={440} y={94} t=" … 768 numbers in all ]"/></g>;
const groups=<g><ellipse cx={118} cy={106} rx={78} ry={40} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={330} cy={106} rx={72} ry={40} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={330} cy={216} rx={62} ry={26} fill="none" stroke={GREY} strokeDasharray="3 3"/><ellipse cx={120} cy={218} rx={78} ry={28} fill="none" stroke={GREY} strokeDasharray="3 3"/></g>;
const qy=<g><circle cx={Q[0]} cy={Q[1]} r="6" fill={RED}/><line x1={Q[0]} y1={Q[1]} x2={150} y2={166} stroke={RED}/><Tq x={154} y={170} t="query: 'spicy cottage cheese starter'" c={RED}/></g>;
const res=<g><circle cx={Q[0]} cy={Q[1]} r="44" fill="none" stroke={BLUE}/><Tq x={440} y={140} t="Nearest by cosine similarity:" b/>{["1  Chilli paneer","2  Kadai paneer","3  Paneer tikka"].map((t,i)=><Tq key={t} x={440} y={162+i*18} t={t} c={BLUE}/>)}<Tq x={440} y={226} t="(a 2-D picture of the idea;"/><Tq x={440} y={240} t=" real vectors have hundreds" /><Tq x={440} y={254} t=" of dimensions)"/></g>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`vet${uid}`}><title id={`vet${uid}`}>Dish descriptions turned into vectors by an embedding model and drawn in two dimensions. Similar dishes land close together: paneer dishes in one group, dosas and idli in another, sweets in a third, biryanis in a fourth. The search 'spicy cottage cheese starter' is turned into a vector by the same model and lands among the paneer dishes, so the nearest results are chilli paneer, kadai paneer and paneer tikka, although the query never says paneer. Real vectors have hundreds of dimensions.</title>
{dots(0)}{still?<g>{vec}{groups}{qy}{res}{dots(1)}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[vec,groups,qy,<g>{res}{dots(1)}</g>]}/>}</svg>}

// Vector search, FIG 2: HNSW. Three layers: 3 nodes on top, 7 in the middle, 20 at the bottom. The search starts
// at the top, hops to the neighbour closest to the query, drops a layer, and repeats; it touches a handful of nodes.
function VecHnswFig({still,uid=""}){const Y=[74,144,214],xs=[...Array(20).keys()].map(i=>40+i*29),mid=[1,4,7,10,13,15,18],top=[2,10,16],qx=xs[15]+12;
const caps=[["1 · comparing the query with every vector is exact, but it reads all of them",INK],["2 · HNSW links each vector to its near neighbours, in layers: a few on top, all at the bottom",INK],["3 · the search starts at the top, hops to whichever neighbour is closer, then drops a layer",BLUE],["4 · at the bottom it checks a small neighbourhood: fast, and usually the true nearest",BLUE]];
const layer=(ids,y,k)=><g key={k}>{ids.slice(1).map((id,i)=><line key={i} x1={xs[ids[i]]} y1={y} x2={xs[id]} y2={y} stroke={GREY}/>)}{ids.map(id=><circle key={id} cx={xs[id]} cy={y} r="6" fill={BG} stroke={INK}/>)}</g>;
const base=<g>{[["top",top],["middle",mid],["bottom: all",[...Array(20).keys()]]].map(([t,ids],i)=><g key={t}>{layer(ids,Y[i],t)}<Tq x={10} y={Y[i]-14} t={t}/></g>)}{mid.map(id=><line key={id} x1={xs[id]} y1={Y[0]+6} x2={xs[id]} y2={Y[2]-6} stroke={GREY} strokeDasharray="2 4"/>)}
<path d={`M${qx} ${Y[2]+26}l6 6-6 6-6-6z`} fill={RED}/><Tq x={qx} y={Y[2]+48} t="query" a="middle" c={RED}/></g>;
const hop=(a,b,y)=><line x1={xs[a]} y1={y} x2={xs[b]} y2={y} stroke={BLUE} strokeWidth="3"/>,node=(id,y)=><circle cx={xs[id]} cy={y} r="6" fill={BLUE}/>;
const all=<g>{[...Array(20).keys()].map(i=><line key={i} x1={xs[i]} y1={Y[2]+10} x2={qx} y2={Y[2]+24} stroke={RED} strokeOpacity=".35"/>)}<Tq x={10} y={262} t="20 comparisons here; crores in real life" c={RED}/></g>;
const s3=<g>{node(2,Y[0])}{hop(2,10,Y[0])}{hop(10,16,Y[0])}{node(16,Y[0])}<line x1={xs[16]} y1={Y[0]} x2={xs[15]} y2={Y[1]} stroke={BLUE} strokeWidth="2" strokeDasharray="3 2"/>{node(15,Y[1])}</g>;
const s4=<g>{s3}<line x1={xs[15]} y1={Y[1]} x2={xs[15]} y2={Y[2]} stroke={BLUE} strokeWidth="2" strokeDasharray="3 2"/>{hop(14,16,Y[2])}{node(14,Y[2])}{node(15,Y[2])}{node(16,Y[2])}<Tq x={10} y={262} t="about 8 nodes touched, not 20" c={BLUE}/></g>;
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`vht${uid}`}><title id={`vht${uid}`}>How an HNSW index finds near vectors. Comparing the query with every vector is exact but reads them all. HNSW stores the vectors in layers, a few on top, more in the middle and all of them at the bottom, each linked to its near neighbours. A search starts at the top, hops to whichever neighbour is closer to the query, drops down a layer and repeats, and at the bottom checks a small neighbourhood. It touches a handful of vectors and usually, though not always, finds the true nearest ones.</title>
{base}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[0,2]} g={[all,null,s3,s4]}/>}</svg>}

// Time series, FIG 1: blocks and compression. Rider 9's speed every 10 s; points grouped per series in 2-hour
// blocks; timestamps as delta-of-delta (usually 0), values XOR'd with the previous; ~16 bytes → under 2.
function TsBlocksFig({still,uid=""}){
const caps=[["1 · each point is a series, a time and a value: rider 9's speed every 10 seconds",INK],["2 · points are kept per series in blocks of about two hours, in time order",BLUE],["3 · times are stored as the change in the gap (usually 0), values as what changed",BLUE],["4 · a point drops from 16 bytes to under 2: a block of 720 points fits in about 1 KB",BLUE]];
const rows=[["20:00:00","21.4"],["20:00:10","22.0"],["20:00:20","22.0"],["20:00:30","21.9"],["…","…"]];
const base=<g><Tq x={20} y={46} t="rider:9:speed" b/>{rows.map(([t,v],i)=><g key={i}><Tq x={20} y={70+i*18} t={t}/><Tq x={100} y={70+i*18} t={v}/></g>)}</g>;
const block=<g><rect x={180} y={52} width={440} height={34} fill={LBq} stroke={BLUE}/><Tq x={190} y={73} t="block 20:00–22:00 · rider:9:speed · 720 points, in time order" c={BLUE}/><Tq x={180} y={104} t="the next block starts at 22:00; old blocks are merged and expired whole"/></g>;
const enc=<g><Tq x={180} y={134} t="time: gap 10 s, then the gap changes 0, 0, 0 … → about 1 bit each"/><Tq x={180} y={152} t="value: XOR with the previous: same → 1 bit; small change → a few"/></g>;
const bars=<g><rect x={180} y={176} width={360} height={18} fill={GRID} stroke={GREY}/><Tq x={546} y={190} t="11.5 KB raw"/><rect x={180} y={202} width={32} height={18} fill={FBq} stroke={BLUE}/><Tq x={218} y={216} t="about 1 KB compressed (≈1.4 bytes a point)" c={BLUE}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`tbt${uid}`}><title id={`tbt${uid}`}>How a time-series database stores rider 9's speed, sampled every 10 seconds. Points are kept per series in blocks of about two hours, in time order. Timestamps are stored as the change in the gap between points, usually zero, which takes about a bit; values are stored as the difference from the previous value using XOR, so an unchanged value takes one bit. A point drops from 16 bytes to under 2, so a two-hour block of 720 points takes about 1 kilobyte instead of 11.5.</title>
{base}{still?<g>{block}{enc}{bars}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,block,enc,bars]}/>}</svg>}

// Time series, FIG 2: retention with rollups. Raw 10 s points kept 7 days (60,480 per series), 1-minute summaries
// for 90 days (1,29,600), hourly for 2 years (17,520). A year's chart reads 8,760 hourly points, not 31.5 lakh raw.
function TsRollupFig({still,uid=""}){const W=v=>v/129600*240;
const R=[["every 10 s, kept 7 days",60480,"60,480 points"],["1-minute summaries, kept 90 days",129600,"1,29,600 points"],["1-hour summaries, kept 2 years",17520,"17,520 points"]];
const caps=[["1 · raw points every 10 seconds, kept for a week",INK],["2 · older data kept as 1-minute summaries (min, max, average, count) for 90 days",BLUE],["3 · then hourly summaries for two years",BLUE],["4 · a chart reads the coarsest level that fits: a year is 8,760 hourly points, not 31.5 lakh raw ones",BLUE]];
const row=(i)=>{const[t,v,s]=R[i],y=56+i*44;return <g key={i}><Tq x={20} y={y+14} t={t} b/><rect x={250} y={y} width={W(v)} height={18} fill={i?FBq:GRID} stroke={i?BLUE:GREY}/><Tq x={256+W(v)} y={y+14} t={s}/></g>};
const note=<g><Tq x={20} y={200} t="per series; with 10 lakh riders, multiply by 10 lakh" /><Tq x={20} y={222} t="year chart: 8,760 hourly points instead of 31,53,600 raw ones" c={BLUE}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`trt${uid}`}><title id={`trt${uid}`}>Keeping time-series data at three levels of detail, per series. Raw points every 10 seconds are kept for 7 days, 60,480 points. One-minute summaries, the minimum, maximum, average and count, are kept for 90 days, 1,29,600 points. Hourly summaries are kept for two years, 17,520 points. A chart reads the coarsest level that covers its range: a year is 8,760 hourly points instead of about 31.5 lakh raw ones.</title>
{row(0)}{still?<g>{row(1)}{row(2)}{note}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,row(1),row(2),note]}/>}</svg>}

// Sketches, FIG 1: HyperLogLog. Hash each ID; a long run of leading zeros is rare, so it hints at many IDs. 16,384
// registers keep the longest run seen per bucket (12 KB); estimate within about 0.8%; merge by max per register.
function HllFig({still,uid=""}){
const H=[["u77","0001 0110 1…","3 zeros"],["u12","1011 0001 0…","0 zeros"],["u903","0000 0110 …","5 zeros"]],REG=[3,1,5,2,0,4,2,6,1,3,2,4,3,2,1,5];
const caps=[["1 · counting distinct customers exactly means keeping every ID: 1 crore IDs is about 80 MB",INK],["2 · HyperLogLog hashes each ID; a hash starting with many zeros is rare, so it hints at many IDs",BLUE],["3 · it keeps 16,384 small registers, the longest run seen in each bucket: 12 KB in all",BLUE],["4 · the estimate is within about 0.8%, and two sketches merge by taking the larger value per register",BLUE]];
const exact=<g><rect x={20} y={50} width={250} height={30} fill={GRID} stroke={GREY}/><Tq x={30} y={70} t="exact set: 1 crore IDs × 8 bytes ≈ 80 MB"/></g>;
const hashes=<g>{H.map(([u,h,z],i)=><g key={u}><Tq x={20} y={114+i*22} t={u}/><Tq x={70} y={114+i*22} t={`→ ${h}`}/><Tq x={230} y={114+i*22} t={z} c={i===2?BLUE:undefined}/></g>)}</g>;
const regs=<g><Tq x={320} y={100} t="registers (16 of 16,384 shown)" b/>{REG.map((v,i)=><g key={i}><rect x={320+i*19} y={110} width={17} height={24} fill={LBq} stroke={BLUE}/><Tq x={328+i*19} y={127} t={v} a="middle" c={BLUE}/></g>)}<Tq x={320} y={154} t="16,384 × 6 bits ≈ 12 KB, however many customers"/></g>;
const est=<g><Tq x={320} y={190} t="estimate: ~1.02 crore distinct (±0.8%)" b c={BLUE}/><Tq x={320} y={210} t="today = merge(hour 1 … hour 24): max per register"/><Tq x={20} y={210} t="Redis: PFADD, PFCOUNT, PFMERGE"/></g>;
return <svg viewBox="0 0 640 228" role="img" aria-labelledby={`hlt${uid}`}><title id={`hlt${uid}`}>HyperLogLog counts distinct customers. Keeping every ID exactly takes about 80 megabytes for 1 crore IDs. HyperLogLog hashes each ID and looks at how many zeros the hash starts with; a long run of zeros is rare, so seeing one suggests many distinct IDs. It keeps 16,384 small registers, each holding the longest run seen in its bucket, about 12 kilobytes in all however many customers there are. The estimate is within about 0.8 percent, and sketches for different hours merge into one for the day by taking the larger value in each register.</title>
{exact}{still?<g>{hashes}{regs}{est}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,hashes,regs,est]}/>}</svg>}

// Sketches, FIG 2: Count-Min sketch. 4 rows of counters (2,000 each in practice, 12 shown). Each event adds 1 at
// one hashed position per row; the estimate is the smallest of its 4 counters; collisions only add.
function CmsFig({still,uid=""}){const cx=j=>150+j*36,ry=r=>60+r*30;
const A=[3,7,1,10],B=[5,7,9,2];// columns hit by dish 9 and by dish 4 in each row (they collide in row 2)
const caps=[["1 · counting orders per dish exactly needs a counter per dish, and there are lakhs of dishes",INK],["2 · a Count-Min sketch keeps 4 rows of counters; each order adds 1 at one hashed spot per row",BLUE],["3 · dish 4 lands on the same spot in row 2, so that counter is too high",RED],["4 · the estimate is the smallest of a dish's 4 counters: it can overcount, never undercount",BLUE]];
const grid=<g>{[0,1,2,3].map(r=><g key={r}><Tq x={20} y={ry(r)+16} t={`row ${r+1} · hash ${r+1}`}/>{[...Array(12).keys()].map(j=><rect key={j} x={cx(j)} y={ry(r)} width={32} height={24} fill={BG} stroke={GREY}/>)}</g>)}</g>;
const fill=(cols,c,val)=><g>{cols.map((j,r)=><g key={r}><rect x={cx(j)} y={ry(r)} width={32} height={24} fill={c===RED?LRq:FBq} stroke={c}/><Tq x={cx(j)+16} y={ry(r)+16} t={val(r)} a="middle" c={c}/></g>)}</g>;
const s2=<g>{fill(A,BLUE,()=>"412")}<Tq x={150} y={196} t="dish 9: 412 orders, added at one spot per row" c={BLUE}/></g>;
const s3=<g>{fill(A,BLUE,()=>"412")}{fill(B,GREY,()=>"88")}<rect x={cx(7)} y={ry(1)} width={32} height={24} fill={LRq} stroke={RED}/><Tq x={cx(7)+16} y={ry(1)+16} t="500" a="middle" c={RED}/><Tq x={150} y={196} t="dish 4 (88 orders) collides with dish 9 in row 2: 412 + 88 = 500" c={RED}/></g>;
const s4=<g>{s3}<Tq x={150} y={216} t="estimate for dish 9 = min(412, 500, 412, 412) = 412" b c={BLUE}/></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`cmt${uid}`}><title id={`cmt${uid}`}>A Count-Min sketch counting orders per dish. Instead of a counter for every one of lakhs of dishes, it keeps 4 rows of counters, about 2,000 in each row in practice. Each order adds one at a single hashed position in every row. Dish 9 has 412 orders. Dish 4, with 88, lands on the same position as dish 9 in row 2, so that counter reads 500. The estimate for a dish is the smallest of its four counters, 412, so the sketch can overcount but never undercount.</title>
{grid}{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} only={[1]} g={[null,s2,s3,s4]}/>}</svg>}

// Change data capture, FIG 1: the database's own log becomes a stream. The connector reads the write-ahead log and
// publishes one event per changed row (before, after, operation) to a topic per table; consumers read independently.
function CdcFlowFig({still,uid=""}){const M=`cf${uid}`;
const caps=[["1 · every committed change is already written to the database's log, in order",INK],["2 · a CDC connector reads that log: no triggers, and no change to the Order API",BLUE],["3 · each changed row becomes an event, with the row before and after, on a topic per table",BLUE],["4 · search, cache invalidation and the warehouse each read the stream at their own pace",BLUE]];
const base=<g><Bx x={10} y={60} w={110} h={44} t="Order API"/><Ar x1={122} y1={82} x2={146} y2={82} m={M}/><Bx x={150} y={60} w={130} h={44} t="PostgreSQL" s="orders table"/>
<rect x={150} y={112} width={130} height={22} fill={GRID} stroke={GREY}/>{[0,1,2,3,4,5].map(i=><line key={i} x1={160+i*20} y1={112} x2={160+i*20} y2={134} stroke={GREY}/>)}<Tq x={152} y={150} t="write-ahead log"/></g>;
const s2=<g><Ar x1={282} y1={122} x2={316} y2={98} m={M} c={BLUE}/><Bx x={320} y={60} w={120} h={44} t="CDC connector" s="e.g. Debezium" c={BLUE} fill={LBq}/></g>;
const s3=<g><Ar x1={442} y1={82} x2={466} y2={82} m={M}/><Bx x={470} y={60} w={160} h={44} t="Kafka topic" s="db.public.orders"/><Tq x={20} y={214} t="one event:" b/><text x="20" y="232" className="fl">{'{"op":"u", "before":{"status":"new"}, "after":{"status":"accepted"}, "lsn":81920}'}</text></g>;
const s4=<g>{[["Search index",330],["Cache",432],["Warehouse",534]].map(([t,x])=><g key={t}><Ar x1={550} y1={106} x2={x+48} y2={156} m={M} c={BLUE}/><Bx x={x} y={158} w={96} h={30} t={t} c={BLUE} fill={LBq}/></g>)}</g>;
return <svg viewBox="0 0 640 262" role="img" aria-labelledby={`cft${uid}`}><title id={`cft${uid}`}>Change data capture. Every committed change to the orders table is already written to PostgreSQL's write-ahead log, in order. A CDC connector such as Debezium reads that log, with no triggers and no change to the Order API, and publishes one event per changed row, carrying the row before and after the change, to a Kafka topic for the table. The search index, a cache invalidator and the warehouse each read that stream at their own pace.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<Stq caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

// Change data capture, FIG 2: snapshot, then stream. The connector notes log position 1,200, reads a consistent
// snapshot while writes continue, then streams from 1,200, so nothing is missed. A stopped connector holds the log.
function CdcSnapFig({still,uid=""}){const x=p=>60+(p-1180)*5.2;
const caps=[["1 · a new consumer needs every existing row, and then every change after that",INK],["2 · the connector notes the log position, 1,200, and reads a consistent snapshot of the table",BLUE],["3 · then it streams changes from 1,200 on, so nothing written during the snapshot is missed",BLUE],["4 · the database keeps its log until the connector reads it: one left stopped for days can fill the disk",RED]];
const base=<g><line x1={x(1180)} y1={150} x2={x(1290)} y2={150} stroke={GREY} strokeWidth="2"/>{[1180,1200,1220,1240,1260,1280].map(p=><g key={p}><line x1={x(p)} y1={144} x2={x(p)} y2={156} stroke={GREY}/><Tq x={x(p)} y={172} t={p.toLocaleString("en-IN")} a="middle"/></g>)}<Tq x={10} y={154} t="log"/></g>;
const s2=<g><line x1={x(1200)} y1={60} x2={x(1200)} y2={150} stroke={BLUE} strokeDasharray="4 3"/><Tq x={x(1200)} y={54} t="position noted" a="middle" c={BLUE}/><rect x={x(1200)+8} y={70} width={x(1255)-x(1200)} height={40} fill={LBq} stroke={BLUE}/><Tq x={x(1200)+16} y={94} t="snapshot: all 2.4 lakh order rows, as of 1,200" c={BLUE}/><Tq x={x(1200)+16} y={128} t="writes keep arriving: 1,201 … 1,255"/></g>;
const s3=<g><line x1={x(1200)} y1={150} x2={x(1290)} y2={150} stroke={BLUE} strokeWidth="4"/><Tq x={x(1200)} y={196} t="then stream from 1,200: no gap; a row changed twice is just upserted twice" c={BLUE}/></g>;
const s4=<g><rect x={x(1260)} y={140} width={x(1290)-x(1260)} height={20} fill={LRq} stroke={RED}/><Tq x={10} y={214} t="if the connector stops, the database keeps every log segment since its position" c={RED}/><Tq x={10} y={230} t="(in PostgreSQL, a replication slot): watch its lag and cap what it may keep" c={RED}/></g>;
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`cst${uid}`}><title id={`cst${uid}`}>How a change data capture connector starts. A new consumer needs every existing row and then every later change. The connector notes the current log position, 1,200, and reads a consistent snapshot of the table as of that position, while new writes keep arriving. Then it streams changes from position 1,200, so nothing written during the snapshot is missed; a row changed twice is simply written twice. The database keeps its log until the connector has read it, so a connector left stopped for days can fill the disk.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]} c={RED}/></g>:<Stq caps={caps} g={[null,s2,s3,s4]}/>}</svg>}

export const FIGS={
"prox-sizes":{C:ProxSizesFig,ar:640/250,title:()=>"ONE MORE LETTER, A SMALLER CELL"},
"prox-quadtree":{C:ProxQuadFig,ar:640/266,title:()=>"SMALL CELLS WHERE IT'S BUSY"},
"vec-embed":{C:VecEmbedFig,ar:640/264,title:()=>"DISHES AS POINTS IN SPACE"},
"vec-hnsw":{C:VecHnswFig,ar:640/270,title:()=>"HOPPING TOWARDS THE NEAREST"},
"ts-blocks":{C:TsBlocksFig,ar:640/236,title:()=>"16 BYTES DOWN TO UNDER 2"},
"ts-rollup":{C:TsRollupFig,ar:640/236,title:()=>"LESS DETAIL AS DATA GETS OLDER"},
"sketch-hll":{C:HllFig,ar:640/228,title:()=>"COUNTING CROWDS IN 12 KB"},
"sketch-cms":{C:CmsFig,ar:640/230,title:()=>"COUNTS THAT ONLY ERR UPWARDS"},
"cdc-flow":{C:CdcFlowFig,ar:640/262,title:()=>"THE DATABASE'S LOG AS A STREAM"},
"cdc-snapshot":{C:CdcSnapFig,ar:640/236,title:()=>"A SNAPSHOT, THEN EVERY CHANGE"},
};
