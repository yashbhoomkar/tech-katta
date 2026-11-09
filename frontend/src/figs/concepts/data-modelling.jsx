// Concepts › Data modelling: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "data-modelling").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Bx,Ar,Life,Msg,INK,GREY,RED,BLUE,LB,LR,T,Fig,X,OK}from"../parts.jsx";

const HEAD="#f3f5f8";

// A table: a name bar and one mono line per column. Row i is centred near y+30+14i.
const Tbl=({x,y,w,name,cols,c=GREY,fill="#fff"})=><g><rect x={x} y={y} width={w} height={26+cols.length*14} fill={fill} stroke={c}/><rect x={x} y={y} width={w} height={20} fill={HEAD} stroke={c}/><T x={x+8} y={y+14} t={name} b/>{cols.map((k,i)=><T key={i} x={x+8} y={y+33+i*14} t={k}/>)}</g>;

const Tag=({x,y,i,t})=><T x={x} y={y+33+i*14} t={t} a="end" c={BLUE}/>;

// Data modelling in an interview, FIG 1: the finished whiteboard.
function WhiteboardFig({still,uid=""}){const M=`dw${uid}`;
const tables=<g><Tbl x={10} y={44} w={130} name="users" cols={["id","name","phone"]}/><Tbl x={200} y={44} w={180} name="orders" cols={["id","user_id","restaurant_id","status","created_at"]}/><Tbl x={450} y={44} w={180} name="restaurants" cols={["id","owner_id","name","city"]}/><Tbl x={200} y={170} w={180} name="order_items" cols={["order_id","dish_id","qty","price_paise"]}/><Tbl x={450} y={170} w={180} name="dishes" cols={["id","restaurant_id","name","price_paise"]}/></g>;
const keys=<g><Tag x={132} y={44} i={0} t="PK"/><Tag x={132} y={44} i={2} t="UNIQUE"/>{[["PK",0],["FK",1],["FK",2]].map(([t,i])=><Tag key={i} x={372} y={44} i={i} t={t}/>)}{[["PK",0],["FK",1]].map(([t,i])=><Tag key={i} x={622} y={44} i={i} t={t}/>)}{[["PK, FK",0],["PK, FK",1]].map(([t,i])=><Tag key={i} x={372} y={170} i={i} t={t}/>)}{[["PK",0],["FK",1]].map(([t,i])=><Tag key={i} x={622} y={170} i={i} t={t}/>)}
<Ar x1={198} y1={88} x2={142} y2={88} m={M} c={BLUE}/><Ar x1={382} y1={102} x2={448} y2={102} m={M} c={BLUE}/><Ar x1={230} y1={170} x2={230} y2={142} m={M} c={BLUE}/><Ar x1={382} y1={214} x2={448} y2={214} m={M} c={BLUE}/><Ar x1={600} y1={170} x2={600} y2={128} m={M} c={BLUE}/></g>;
const idx=<g><T x={10} y={282} t="indexes" b/><T x={80} y={282} t="orders(user_id, created_at) · orders(restaurant_id, status) · dishes(restaurant_id)"/></g>;
const shard=<g><T x={10} y={304} t="shard" b/><T x={80} y={304} t="orders by city, only if one machine can't keep up" c={BLUE}/></g>;
const caps=[["1 · the core entities become tables, with the columns their screens need",INK],["2 · primary keys name each row; foreign keys link the tables",BLUE],["3 · indexes for the main screens: a user's orders, a restaurant's live orders, a menu",INK],["4 · and one line on how it would be split if it outgrows one machine",BLUE]];
return <Fig still={still} h={316} id={`dwt${uid}`} M={M} caps={caps} title="The data model on the whiteboard at the end of an interview. Five tables: users (id, name, phone), orders (id, user_id, restaurant_id, status, created_at), restaurants (id, owner_id, name, city), order_items (order_id, dish_id, qty, price_paise) and dishes (id, restaurant_id, name, price_paise). Primary keys name each row, phone is unique, and foreign keys link orders to users and restaurants, order_items to orders and dishes, and dishes to restaurants. Indexes: orders by user and time, orders by restaurant and status, dishes by restaurant. And one line on sharding: orders by city, only if one machine can't keep up."
base={null} g={[tables,keys,idx,shard]} last={<g>{tables}{keys}{idx}{shard}</g>}/>}

// Choosing a database model, FIG 2: a key-value cache in front of the relational database.
function KvCacheFig({still,uid=""}){const M=`dk${uid}`;
const base=<g><Life x={80} t="app server" y1={288}/><Life x={320} t="cache" s="key-value, in memory" y1={288}/><Life x={560} t="database" s="source of truth" y1={288}/></g>;
const s1=<g><Msg x1={80} x2={320} y={92} t="GET menu:42" m={M}/><Msg x1={320} x2={80} y={112} t="hit: from memory" m={M} c={BLUE}/></g>;
const s2=<g><Msg x1={80} x2={320} y={138} t="GET menu:77" m={M}/><Msg x1={320} x2={80} y={156} t="miss" m={M} c={RED}/><Msg x1={80} x2={560} y={176} t="SELECT … restaurant 77" tx={440} m={M}/><Msg x1={560} x2={80} y={194} t="rows" tx={440} m={M}/><Msg x1={80} x2={320} y={212} t="SET menu:77" m={M} c={BLUE}/></g>;
const s3=<g><Msg x1={80} x2={560} y={238} t="UPDATE dish 9 price" tx={440} m={M}/><Msg x1={80} x2={320} y={256} t="DELETE menu:42" m={M} c={RED}/></g>;
const s4=<g><Msg x1={80} x2={320} y={280} t="GET menu:42" m={M}/><T x={332} y={284} t="miss: read again, with the new price" c={BLUE}/></g>;
const caps=[["1 · hot reads are answered from memory by key, without touching the database",BLUE],["2 · on a miss, read the database once and keep the answer in the cache",INK],["3 · a write goes to the database, and the cached copy is deleted",RED],["4 · the next read misses and picks up the new value",BLUE]];
return <Fig still={still} h={296} id={`dkt${uid}`} M={M} caps={caps} title="A key-value cache in front of a relational database. The app asks the cache for menu:42 and gets it from memory. For menu:77 the cache misses, so the app reads the database and stores the answer in the cache. When a dish price changes, the app updates the database and deletes menu:42 from the cache. The next read of menu:42 misses and is read again from the database, with the new price."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Choosing a database model, FIG 3: a wide-column partition of rider locations.
function WideFig({still,uid=""}){const M=`dc${uid}`;
const cell=(i,y,t,s,c,fill)=><Bx key={`${i}${y}${c}`} x={100+i*88} y={y} w={84} h={40} t={t} s={s} c={c} fill={fill}/>;
const r12=["9:50","9:55","10:00","10:05"],r9=["9:52","9:56","10:00","10:04","10:08"];
const s1=<g><T x={10} y={50} t="partition"/><Bx x={10} y={64} w={80} h={40} t="rider 12" c={BLUE} fill={LB}/>{r12.map((t,i)=>cell(i,64,t,"18.52, 73.85"))}<Bx x={10} y={134} w={80} h={40} t="rider 9" c={BLUE} fill={LB}/>{r9.map((t,i)=>cell(i,134,t,"19.07, 72.87"))}</g>;
const s2=<g><T x={100} y={46} t="clustering key: time, oldest → newest" c={BLUE}/><Ar x1={340} y1={42} x2={620} y2={42} m={M} c={BLUE}/></g>;
const s3=<g>{cell(5,134,"10:12","19.08, 72.88",BLUE,LB)}<T x={10} y={198} t="new ping at 10:12: written at the" c={BLUE}/><T x={10} y={212} t="end of rider 9's partition" c={BLUE}/></g>;
const s4=<g><rect x={360} y={129} width={270} height={50} fill="none" stroke={BLUE} strokeWidth="2"/><T x={364} y={198} t="WHERE rider_id = 9 AND time > 10:02" c={BLUE}/><T x={364} y={212} t="one ordered slice, read in one go" c={BLUE}/></g>;
const caps=[["1 · rows are grouped by a partition key: each rider's pings sit together",BLUE],["2 · inside a partition they are kept in order by a clustering key, here time",BLUE],["3 · a new ping is a cheap append at the end",BLUE],["4 · 'rider 9, last ten minutes' is one ordered slice of one partition",BLUE]];
return <Fig still={still} h={222} id={`dct${uid}`} M={M} caps={caps} title="Rider locations in a wide-column database. Rows are grouped by the partition key, rider_id, so rider 12's pings and rider 9's pings each sit together. Within a partition they are sorted by the clustering key, time, oldest to newest. A new ping at 10:12 is appended to the end of rider 9's partition. The query for rider 9's last ten minutes, time after 10:02, reads one ordered slice: 10:04, 10:08 and 10:12."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Choosing a database model, FIG 4: a graph, and the same edges as a table.
function GraphFig({still,uid=""}){const M=`dg${uid}`;
const N={P:[60,90,"Priya"],A:[230,80,"Arjun"],Mm:[80,206,"Meera"],K:[240,200,"Kabir"]};
const node=(k,c=GREY,fill="#fff")=>{const[x,y,t]=N[k];return <g key={k+c}><circle cx={x} cy={y} r={24} fill={fill} stroke={c}/><T x={x} y={y+4} t={t} a="middle" b/></g>};
const edge=(a,b,c=INK)=>{const[x1,y1]=N[a],[x2,y2]=N[b],d=Math.hypot(x2-x1,y2-y1),ux=(x2-x1)/d,uy=(y2-y1)/d;return <Ar key={a+b+c} x1={x1+ux*25} y1={y1+uy*25} x2={x2-ux*27} y2={y2-uy*27} m={M} c={c} w={c===INK?undefined:2}/>};
const R=[["Priya","Arjun"],["Priya","Meera"],["Arjun","Kabir"],["Meera","Kabir"]];
const row=(i,c=GREY,fill="#fff")=><g key={i+c}><rect x={330} y={80+i*24} width={150} height={24} fill={fill} stroke={c}/><rect x={480} y={80+i*24} width={150} height={24} fill={fill} stroke={c}/><T x={340} y={96+i*24} t={R[i][0]}/><T x={490} y={96+i*24} t={R[i][1]}/></g>;
const s1=<g>{edge("P","A")}{edge("P","Mm")}{edge("A","K")}{edge("Mm","K")}{["P","A","Mm","K"].map(k=>node(k))}<T x={145} y={76} t="follows" a="middle"/></g>;
const s2=<g><T x={330} y={50} t="follows" b/><rect x={330} y={56} width={150} height={24} fill={HEAD} stroke={GREY}/><rect x={480} y={56} width={150} height={24} fill={HEAD} stroke={GREY}/><T x={340} y={72} t="follower_id"/><T x={490} y={72} t="followee_id"/>{[0,1,2,3].map(i=>row(i))}</g>;
const s3=<g>{edge("P","A",BLUE)}{edge("P","Mm",BLUE)}{node("P",BLUE,LB)}{row(0,BLUE,LB)}{row(1,BLUE,LB)}<T x={330} y={198} t="index on follower_id: one lookup per hop" c={BLUE}/></g>;
const s4=<g>{edge("A","K",BLUE)}{edge("Mm","K",BLUE)}{node("K",BLUE,LB)}{row(2,BLUE,LB)}{row(3,BLUE,LB)}<T x={330} y={218} t="two hops: two lookups, still easy" c={BLUE}/><T x={330} y={234} t="many hops deep: a graph database helps" c={INK}/></g>;
const caps=[["1 · people and who follows whom, as a graph",INK],["2 · the same edges as an ordinary table",INK],["3 · 'who does Priya follow?' is one index lookup",BLUE],["4 · friends of friends is two; only deep walks need a graph database",BLUE]];
return <Fig still={still} h={244} id={`dgt${uid}`} M={M} caps={caps} title="A follow graph and the same data as a table of edges. Priya follows Arjun and Meera; Arjun and Meera both follow Kabir. As a table, follows has columns follower_id and followee_id, one row per edge. With an index on follower_id, who Priya follows is one lookup, and friends of friends, which reaches Kabir, is two. Only walks many hops deep need a graph database."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Keys and relationships, FIG 1: one-to-many, many-to-many through a table, one-to-one.
function RelationsFig({still,uid=""}){const M=`dr${uid}`;
const s1=<g><T x={10} y={74} t="one-to-many" b/><Bx x={130} y={50} w={130} h={40} t="restaurant 42" s="restaurants"/><Bx x={330} y={50} w={140} h={40} t="dish 9" s="restaurant_id = 42" c={BLUE} fill={LB}/><Bx x={490} y={50} w={140} h={40} t="dish 10" s="restaurant_id = 42" c={BLUE} fill={LB}/><Ar x1={328} y1={70} x2={262} y2={70} m={M} c={BLUE}/><path d="M560 50V42H220V48" fill="none" stroke={BLUE} markerEnd={`url(#${M})`}/></g>;
const s2=<g><T x={10} y={150} t="many-to-many" b/><Bx x={130} y={116} w={120} h={34} t="order 9101"/><Bx x={130} y={174} w={120} h={26} t="order 9102"/><Bx x={530} y={116} w={100} h={26} t="dish 9"/><Bx x={530} y={148} w={100} h={26} t="dish 10"/></g>;
const it=(y,t)=><Bx x={290} y={y} w={200} h={26} t={t} c={BLUE} fill={LB}/>;
const s3=<g><T x={390} y={110} t="order_items" a="middle" c={BLUE}/>{it(116,"9101 · dish 9 · qty 2")}{it(146,"9101 · dish 10 · qty 1")}{it(176,"9102 · dish 9 · qty 1")}
<Ar x1={288} y1={129} x2={252} y2={129} m={M} c={BLUE}/><Ar x1={288} y1={153} x2={252} y2={140} m={M} c={BLUE}/><Ar x1={288} y1={189} x2={252} y2={187} m={M} c={BLUE}/><Ar x1={492} y1={129} x2={528} y2={129} m={M} c={BLUE}/><Ar x1={492} y1={159} x2={528} y2={161} m={M} c={BLUE}/><Ar x1={492} y1={186} x2={528} y2={138} m={M} c={BLUE}/></g>;
const s4=<g><T x={10} y={244} t="one-to-one" b/><Bx x={130} y={222} w={120} h={34} t="order 9101"/><Bx x={330} y={222} w={200} h={34} t="delivery" s="order_id = 9101, also its key"/><Ar x1={328} y1={239} x2={252} y2={239} m={M}/><T x={330} y={276} t="worth asking: why not columns of orders?"/></g>;
const caps=[["1 · one-to-many: each dish holds its restaurant's id",BLUE],["2 · many-to-many: an order has many dishes, and a dish is in many orders",INK],["3 · that needs a table of its own: one order_items row per order and dish",BLUE],["4 · one-to-one is rare: ask whether it should just be columns of one table",INK]];
return <Fig still={still} h={284} id={`drt${uid}`} M={M} caps={caps} title="Three kinds of relationship. One-to-many: dishes 9 and 10 each hold restaurant_id 42, so the key sits on the many side. Many-to-many: order 9101 has dishes 9 and 10, and dish 9 is also in order 9102, so a table of its own, order_items, holds one row per order and dish with the quantity. One-to-one: a delivery keyed by order_id 9101; it is rare, and worth asking whether it should simply be columns of orders."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Keys and relationships, FIG 2: constraints refuse bad writes.
function ConstraintsFig({still,uid=""}){const M=`dn${uid}`;
const row=(y,w,from,r,why,ok)=><g><Bx x={10} y={y} w={330} h={40} t={w} s={from}/><Ar x1={342} y1={y+20} x2={396} y2={y+20} m={M} c={ok?BLUE:RED}/><Bx x={400} y={y} w={230} h={40} t={r} s={why} c={ok?BLUE:RED} fill={ok?LB:LR}/>{ok?<OK x={414} y={y+16}/>:<X x={414} y={y+14}/>}</g>;
const s1=row(44,"INSERT order, restaurant_id = 999","from the orders service","rejected: foreign key","no restaurant 999 exists");
const s2=row(94,"INSERT user, phone = 98200 00000","the sign-up form, sent twice","rejected: UNIQUE","that phone already has an account");
const s3=row(144,"UPDATE dish 9, price_paise = -5000","an admin tool with a bug","rejected: CHECK > 0","a price can't be below zero");
const s4=row(194,"INSERT order, restaurant_id = 42","from the orders service","accepted","every rule holds",1);
const caps=[["1 · foreign key: no order for a restaurant that doesn't exist",RED],["2 · UNIQUE: one account per phone, even when two requests race",RED],["3 · CHECK: a price below zero is refused, whichever service sent it",RED],["4 · a write that keeps every rule goes through as normal",BLUE]];
return <Fig still={still} h={244} id={`dnt${uid}`} M={M} caps={caps} title="Constraints reject bad writes at the database. An order for restaurant 999, which doesn't exist, fails the foreign key. A second sign-up with a phone that already has an account fails the unique constraint. An admin tool setting a dish price to minus 5000 paise fails the check that prices are above zero. An order for restaurant 42, which keeps every rule, is accepted."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Indexes and normalisation, FIG 1: each endpoint's query names its index.
function EndpointIndexFig({still,uid=""}){const M=`de${uid}`;
const row=(y,e,q,ix,on)=><g><T x={10} y={y+14} t={e} b/><T x={10} y={y+31} t={q}/><Ar x1={330} y1={y+19} x2={436} y2={y+19} m={M} c={BLUE}/><Bx x={440} y={y} w={190} h={38} t={ix} s={on} c={BLUE} fill={LB}/></g>;
const s1=row(46,"GET /users/77/orders","WHERE user_id = 77 ORDER BY created_at DESC","(user_id, created_at)","on orders");
const s2=row(96,"GET /restaurants/42/live-orders","WHERE restaurant_id = 42 AND status = 'live'","(restaurant_id, status)","on orders");
const s3=row(146,"GET /restaurants/42/menu","WHERE restaurant_id = 42","(restaurant_id)","on dishes");
const K=[["76","07 Nov"],["77","08 Nov"],["77","05 Nov"],["77","03 Nov"],["78","08 Nov"],["79","01 Nov"]];
const s4=<g><T x={10} y={210} t="inside (user_id, created_at):" b/>{K.map(([u,d],i)=>{const on=u==="77";return <Bx key={i} x={10+i*103} y={218} w={99} h={30} t={`${u} · ${d}`} c={on?BLUE:GREY} fill={on?LB:"#fff"}/>})}<T x={113} y={264} t="user 77's orders: one range, already newest first" c={BLUE}/></g>;
const caps=[["1 · order history filters by user and sorts by time: one composite index does both",BLUE],["2 · a restaurant's live orders: filter by restaurant, then by status",BLUE],["3 · the menu page: dishes by restaurant",BLUE],["4 · inside the index, user 77's orders sit together, already in time order",BLUE]];
return <Fig still={still} h={272} id={`det${uid}`} M={M} caps={caps} title="From each endpoint to the index it needs. GET /users/77/orders filters by user_id and sorts by created_at, so it needs an index on orders over user_id then created_at. A restaurant's live orders filter by restaurant_id and status, so an index on orders over restaurant_id then status. The menu reads dishes by restaurant_id. Inside the composite index, user 77's orders sit next to each other, already newest first, so the query reads one range."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Indexes and normalisation, FIG 2: a rename, normalised and denormalised.
function AnomalyFig({still,uid=""}){
const L=(y,t,c=GREY,fill="#fff")=><Bx x={10} y={y} w={290} h={y===66?30:24} t={t} c={c} fill={fill}/>;
const Rr=(i,t,c=GREY,fill="#fff")=><Bx key={i+c} x={340} y={66+i*30} w={290} h={24} t={t} c={c} fill={fill}/>;
const ids=["9101","9102","9103","9104"];
const base=<g><T x={10} y={54} t="normalised: the name is stored once" b/><T x={340} y={54} t="denormalised: copied into every order" b/>{L(66,"restaurant 42 · Spice Route")}{["9101","9102","9103"].map((o,i)=><g key={o}>{L(106+i*28,`order ${o} → restaurant 42`)}</g>)}{ids.map((o,i)=>Rr(i,`order ${o} · Spice Route`))}</g>;
const s1=<g>{L(66,"restaurant 42 · Masala House",BLUE,LB)}<T x={10} y={210} t="one row updated; every order shows it" c={BLUE}/></g>;
const s2=<g>{[0,1,2].map(i=>Rr(i,`order ${ids[i]} · Masala House`,BLUE,LB))}<T x={340} y={196} t="every copy must change: 4 rows here," c={INK}/><T x={340} y={210} t="tens of thousands in real life" c={INK}/></g>;
const s3=<g>{Rr(3,"order 9104 · Spice Route",RED,LR)}<T x={340} y={228} t="one missed: two names for one restaurant" c={RED}/></g>;
const s4=<g><rect x={7} y={63} width={296} height={36} fill="none" stroke={BLUE} strokeWidth="2"/><T x={10} y={228} t="one fact, one place: nothing to miss" c={BLUE}/></g>;
const caps=[["1 · normalised: the restaurant renames itself, and one row changes",BLUE],["2 · denormalised: every order carrying the old name has to change too",INK],["3 · miss one, and the same restaurant now has two names",RED],["4 · so store each fact once, and copy it only where a read really needs it",BLUE]];
return <Fig still={still} h={240} id={`dat${uid}`} caps={caps} title="A rename, normalised and denormalised. Normalised, restaurant 42's name is stored once in restaurants, and orders refer to it by id; renaming Spice Route to Masala House changes one row and every order shows the new name. Denormalised, the name is copied into every order, so every copy must change; three are updated but order 9104 is missed and still says Spice Route, so the same restaurant now has two names. Store each fact once, and copy it only where a read really needs it."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Sharding the model, FIG 2: a query with the shard key, and one without.
function CrossShardFig({still,uid=""}){const M=`ds${uid}`;
const S=[["shard 1 · Mumbai",44,["9101 · rest 42 · user 77","9107 · rest 42 · user 12"]],["shard 2 · Pune",122,["8810 · rest 61 · user 77","8815 · rest 63 · user 30"]],["shard 3 · Delhi",200,["7702 · rest 90 · user 77","7710 · rest 91 · user 5"]]];
const shard=([t,y,r],c=GREY,fill="#fff")=><g key={t+c}><rect x={440} y={y} width={190} height={64} fill={fill} stroke={c}/><T x={450} y={y+17} t={t} b/>{r.map((l,i)=><T key={i} x={450} y={y+35+i*16} t={l}/>)}</g>;
const mark=(y,c)=><rect key={y+c} x={447} y={y+25} width={176} height={14} fill="none" stroke={c} strokeWidth="1.5"/>;
const s1=<g><Bx x={10} y={110} w={130} h={44} t="app server"/>{S.map(s=>shard(s))}</g>;
const s2=<g><T x={10} y={98} t="restaurant 42's live orders" c={BLUE}/><Ar x1={142} y1={122} x2={436} y2={76} m={M} c={BLUE} w={2}/><rect x={443} y={66} width={184} height={36} fill="none" stroke={BLUE} strokeWidth="2"/></g>;
const s3=<g><T x={10} y={174} t="user 77's history, all cities" c={RED}/>{S.map(([,y])=><Ar key={y} x1={142} y1={140} x2={436} y2={y+32} m={M} c={RED}/>)}{S.map(([,y])=>mark(y,RED))}</g>;
const s4=<g><T x={10} y={228} t="every shard answers, the app merges:" c={INK}/><T x={10} y={244} t="fine if rare; if not, keep a copy keyed by user" c={BLUE}/></g>;
const caps=[["1 · orders are sharded by city: each city's orders live on one shard",INK],["2 · a restaurant's live orders are all in one city: one shard answers",BLUE],["3 · a user's history spans cities: every shard has to be asked",RED],["4 · fine if it's rare; if it isn't, keep a second copy keyed by user",BLUE]];
return <Fig still={still} h={272} id={`dst${uid}`} M={M} caps={caps} title="Orders sharded by city across three shards: Mumbai, Pune and Delhi. A restaurant's live orders, for restaurant 42 in Mumbai, include the shard key, so one shard answers. User 77's history has orders in all three cities, so every shard has to be asked and the app merges the answers. That is fine if it's rare; if not, keep a second copy of orders keyed by user."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

export const FIGS={
"dm-whiteboard":{C:WhiteboardFig,ar:640/316,title:()=>"THE DATA MODEL ON THE WHITEBOARD"},
"dm-kv-cache":{C:KvCacheFig,ar:640/296,title:()=>"A KEY-VALUE CACHE IN FRONT OF THE DATABASE"},
"dm-wide":{C:WideFig,ar:640/222,title:()=>"ONE RIDER'S PINGS, IN ONE SORTED PARTITION"},
"dm-graph":{C:GraphFig,ar:640/244,title:()=>"A GRAPH, OR A TABLE OF EDGES"},
"dm-relations":{C:RelationsFig,ar:640/284,title:()=>"ONE-TO-MANY, MANY-TO-MANY, ONE-TO-ONE"},
"dm-constraints":{C:ConstraintsFig,ar:640/244,title:()=>"BAD WRITES, STOPPED AT THE DATABASE"},
"dm-endpoint-index":{C:EndpointIndexFig,ar:640/272,title:()=>"FROM ENDPOINT TO INDEX"},
"dm-anomaly":{C:AnomalyFig,ar:640/240,title:()=>"ONE RENAME: ONE ROW, OR MANY"},
"dm-cross-shard":{C:CrossShardFig,ar:640/272,title:()=>"ONE SHARD, OR ALL OF THEM"},
};
