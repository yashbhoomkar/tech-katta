// Concepts › API design: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "api-design").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Show,Bx,Ar,Life,Msg,INK,GREY,RED,BLUE,LB,LR,T,Fig,X,OK,Cap,Caps}from"../parts.jsx";

// The API step, FIG 1: three questions pick the style.
function ChooseFig({still,uid=""}){const M=`ac${uid}`;
const Q=(y,t)=><Bx x={10} y={y} w={300} h={40} t={t}/>,A=(y,t,s,c=BLUE,fill=LB)=><Bx x={380} y={y} w={250} h={40} t={t} s={s} c={c} fill={fill}/>;
const yes=y=><g><Ar x1={312} y1={y+20} x2={376} y2={y+20} m={M} c={BLUE}/><T x={344} y={y+14} t="yes" a="middle" c={BLUE}/></g>,no=y=><g><Ar x1={160} y1={y+42} x2={160} y2={y+56} m={M}/><T x={168} y={y+53} t="no"/></g>;
const s1=<g>{Q(44,"Must the server push live updates?")}{yes(44)}{A(44,"SSE or WebSockets","one way, or both ways")}</g>;
const s2=<g>{no(44)}{Q(104,"Only your services call it, and speed matters?")}{yes(104)}{A(104,"RPC (gRPC)","internal calls")}</g>;
const s3=<g>{no(104)}{Q(164,"Clients need very different data?")}{yes(164)}{A(164,"GraphQL","one endpoint, chosen fields")}</g>;
const s4=<g>{no(164)}<Bx x={10} y={224} w={300} h={40} t="REST" s="most interview problems end here" c={BLUE} fill={LB}/></g>;
const caps=[["1 · live updates are a separate choice: SSE one way, WebSockets both ways",BLUE],["2 · busy calls between your own services can use RPC",BLUE],["3 · GraphQL when different clients need very different shapes of data",BLUE],["4 · otherwise, and that's most of the time, REST",BLUE]];
return <Fig still={still} h={272} id={`act${uid}`} M={M} caps={caps} title="Choosing an API style in three questions. Must the server push live updates? If so, use server-sent events for one-way updates or WebSockets for two-way. If not: is it called only by your own services, where speed matters? Then RPC such as gRPC. If not: do clients need very different shapes of data? Then GraphQL. Otherwise, which is most of the time, REST."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// REST endpoints, FIG 1: each method sent twice; which ones change the outcome.
function RetryMethodsFig({still,uid=""}){
const R=[["GET /orders/9101","order 9101 shown","order 9101 shown",0],["PUT /users/77/address","address = Flat 4B","address = Flat 4B",0],["DELETE /cart/items/3","item gone (204)","still gone (404)",0],["PATCH status: cancelled","cancelled","cancelled",0],["PATCH cart: add 1 misal","1 misal","2 misal",1],["POST /orders","order 9101","orders 9101 and 9102",1]];
const head=<g><T x={10} y={52} t="request, sent twice" b/><T x={300} y={52} t="after the first" b/><T x={470} y={52} t="after the second" b/></g>;
const row=i=>{const [r,a,b,bad]=R[i],y=66+i*30;return <g key={i}><T x={10} y={y+15} t={r}/><Bx x={300} y={y} w={150} h={24} t={a}/><Bx x={470} y={y} w={160} h={24} t={b} c={bad?RED:BLUE} fill={bad?LR:LB}/></g>};
const caps=[["1 · reads, full replacements and deletes end in the same state, however often they're sent",BLUE],["2 · a PATCH that sets a value is safe to repeat too",BLUE],["3 · a PATCH that adds to something is not: the cart now has two",RED],["4 · neither is POST: a retried order becomes two orders, which is why it needs a key",RED]];
const g=[<g key="first">{row(0)}{row(1)}{row(2)}</g>,row(3),row(4),row(5)];
return <Fig still={still} h={252} id={`arm${uid}`} caps={caps} title="The same request sent twice, as on a retry. GET of order 9101, PUT of an address, and DELETE of a cart item all end in the same state after the second send; the delete answers 404 the second time but the item is still gone. A PATCH that sets an order's status to cancelled is also safe to repeat. A PATCH that adds one dish to the cart is not: the cart ends with two. And POST /orders creates a second order, 9102, which is why placing an order needs an idempotency key."
base={head} g={g} last={<g>{g}</g>}/>}

// REST endpoints, FIG 2: path, query, body and headers.
function PartsFig({still,uid=""}){
const chip=(x,w,t,c=GREY,fill="#fff")=><Bx x={x} y={52} w={w} h={34} t={t} c={c} fill={fill}/>;
const r1=<g>{chip(20,56,"GET")}{chip(80,210,"/restaurants/42/menu")}{chip(294,200,"?veg=true&lang=hi")}</g>;
const s1=<g>{chip(80,210,"/restaurants/42/menu",BLUE,LB)}<T x={185} y={104} t="path: which resource" a="middle" c={BLUE}/><T x={185} y={118} t="(required)" a="middle" c={BLUE}/></g>;
const s2=<g>{chip(294,200,"?veg=true&lang=hi",INK,"#fbfcfd")}<T x={394} y={104} t="query: filter, sort, page" a="middle"/><T x={394} y={118} t="(optional)" a="middle"/></g>;
const s3=<g><Bx x={20} y={140} w={56} h={34} t="POST"/><Bx x={80} y={140} w={120} h={34} t="/orders"/><rect x={20} y={180} width={300} height={62} fill={LB} stroke={BLUE}/>{['{"restaurant_id": 42,',' "items": [{"dish_id": 9, "qty": 2}],',' "address_id": 3 }'].map((l,i)=><T key={i} x={30} y={198+i*16} t={l}/>)}<T x={330} y={216} t="body: the data being created" c={BLUE}/></g>;
const s4=<g><T x={220} y={152} t="Authorization: Bearer eyJ…"/><T x={220} y={168} t="Idempotency-Key: 7f3c-…"/><T x={430} y={160} t="headers: who is asking," c={BLUE}/><T x={430} y={174} t="and which attempt" c={BLUE}/></g>;
const caps=[["1 · the path picks the resource: restaurant 42's menu",BLUE],["2 · the query narrows and shapes what comes back: vegetarian, in Hindi",INK],["3 · the body carries what is being created or changed",BLUE],["4 · headers carry the rest: who is asking, and a key for this attempt",BLUE]];
return <Fig still={still} h={254} id={`apt${uid}`} caps={caps} title="Where input goes in a REST request. In GET /restaurants/42/menu?veg=true&lang=hi, the path, /restaurants/42/menu, picks the resource and is required; the query, veg=true and lang=hi, narrows and shapes the answer and is optional. In POST /orders, the body carries the data being created: the restaurant, the dishes and quantities, and the address. Headers carry the rest: an Authorization token saying who is asking, and an Idempotency-Key for this attempt."
base={r1} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// GraphQL, FIG 1: the N+1 problem and a batching loader.
function NPlusOneFig({still,uid=""}){
const bar=(x,y,w,t,c=GREY,fill="#fff")=><g key={`${x}${y}`}><rect x={x} y={y} width={w} height={14} fill={fill} stroke={c}/>{t&&<T x={x+6} y={y+11} t={t}/>}</g>;
const top=<g><T x={10} y={52} t="query { orders(first: 50) { id  restaurant { name } } }"/><T x={10} y={82} t="without batching" b/><T x={340} y={82} t="with a loader" b/></g>;
const s1=bar(10,94,290,"SELECT … FROM orders LIMIT 50",INK);
const s2=<g>{Array.from({length:9},(_,i)=>bar(10,112+i*12,290,"",RED,LR))}<T x={16} y={122} t="SELECT … FROM restaurants WHERE id = 42"/><T x={10} y={236} t="1 + 50 = 51 queries" b c={RED}/></g>;
const s3=<g>{bar(340,94,290,"SELECT … FROM orders LIMIT 50",INK)}{bar(340,112,290,"… WHERE id IN (42, 17, 8, …)",BLUE,LB)}</g>;
const s4=<g><T x={340} y={236} t="2 queries, whatever the page size" b c={BLUE}/></g>;
const caps=[["1 · one query asks for 50 orders and each order's restaurant",INK],["2 · resolved one field at a time: one query per order for its restaurant",RED],["3 · a loader waits for the batch and asks for all 50 restaurants at once",BLUE],["4 · 51 queries become 2",BLUE]];
return <Fig still={still} h={246} id={`ant${uid}`} caps={caps} title="The N+1 problem in GraphQL. One query asks for 50 orders and each order's restaurant name. Resolved one field at a time, the server runs one query for the orders and then one query per order for its restaurant: 51 queries. With a batching loader, the restaurant resolvers' requests are collected and sent as one query for all the restaurant ids: 2 queries, whatever the page size."
base={top} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// RPC, FIG 1: a remote call through generated stubs.
function RpcFig({still,uid=""}){const M=`ar${uid}`,D="14s";
const base=<g><Bx x={10} y={96} w={120} h={44} t="Orders" s="your code"/><Bx x={150} y={96} w={100} h={44} t="client stub" s="generated"/><Bx x={390} y={96} w={100} h={44} t="server stub" s="generated"/><Bx x={510} y={96} w={120} h={44} t="Payments" s="your code"/>
<rect x={262} y={92} width={116} height={52} fill="none" stroke={GREY} strokeDasharray="3 3"/><T x={320} y={122} t="HTTP/2" a="middle"/><T x={320} y={84} t="network" a="middle"/></g>;
const s1=<g><rect x={10} y={96} width={120} height={44} fill="none" stroke={BLUE} strokeWidth="2"/><T x={10} y={168} t="charge = payments.ChargeOrder(9101, 34900)" c={BLUE}/><T x={10} y={182} t="looks like a local function call"/></g>;
const s2=<g><Ar x1={132} y1={110} x2={146} y2={110} m={M}/><Ar x1={252} y1={110} x2={386} y2={110} m={M} c={BLUE}/><T x={320} y={204} t="arguments → 18-byte protobuf message" a="middle" c={BLUE}/>{!still&&<Dot x1={252} x2={386} y={110} t0={.3} t1={.42} dur={D}/>}</g>;
const s3=<g><Ar x1={492} y1={110} x2={506} y2={110} m={M}/><T x={630} y={168} t="message → arguments →" a="end"/><T x={630} y={182} t="the real chargeOrder()" a="end" c={BLUE}/></g>;
const s4=<g><Ar x1={386} y1={128} x2={252} y2={128} m={M} c={BLUE}/><T x={320} y={226} t="the result comes back the same way; both stubs come from payments.proto" a="middle"/>{!still&&<Dot x1={386} x2={252} y={128} t0={.8} t1={.92} dur={D}/>}</g>;
const caps=[["1 · Orders calls what looks like a local function",BLUE],["2 · the generated client stub packs the arguments into protobuf and sends them",BLUE],["3 · the server stub unpacks them and calls the real function in Payments",BLUE],["4 · the result returns the same way; both stubs are generated from one .proto file",BLUE]];
return <Fig still={still} h={240} id={`art${uid}`} M={M} caps={caps} title="How a remote procedure call works. The Orders service calls payments.ChargeOrder with order 9101 and 34,900 paise, which looks like a local function call. A generated client stub packs the arguments into an 18-byte protobuf message and sends it over HTTP/2. A generated server stub on the Payments side unpacks the message and calls the real chargeOrder function. The result comes back the same way. Both stubs are generated from the same payments.proto file."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Habits, FIG 1: old app versions and compatible change.
function EvolveFig({still,uid=""}){const M=`ae${uid}`;const V=[["app 3.1","installed 2024",52],["app 4.0","installed 2025",112],["app 5.2","current",172]];
const base=<g>{V.map(([t,s,y])=><Bx key={t} x={10} y={y} w={140} h={40} t={t} s={s}/>)}<Bx x={420} y={52} w={210} h={160} t="" /><T x={430} y={72} t="GET /v1/orders/9101" b/>{V.map(([t,s,y])=><Ar key={t} x1={152} y1={y+20} x2={416} y2={y+20} m={M}/>)}</g>;
const f=(y,t,c)=><T x={430} y={y} t={t} c={c}/>;
const ok=k=><g>{V.map(([t,s,y],i)=>i>=k&&<OK key={t} x={170} y={y+20}/>)}</g>;
const s1=<g>{f(96,"status: \"on the way\"")}{f(112,"eta: \"7:42 pm\"")}{ok(0)}</g>;
const s2=<g>{f(96,"status: \"on the way\"")}{f(112,"eta: \"7:42 pm\"")}{f(128,"eta_range: \"7:38–7:46\"  (new)",BLUE)}{ok(0)}</g>;
const s3=<g>{f(96,"status: \"on the way\"")}{f(112,"arrival: \"7:42 pm\"  (renamed)",RED)}<X x={170} y={72}/><X x={170} y={132}/><OK x={170} y={192}/><T x={290} y={236} t="old apps look for eta and show nothing" a="middle" c={RED}/></g>;
const s4=<g>{f(96,"status: \"on the way\"")}{f(112,"eta: \"7:42 pm\"  (kept)")}{f(128,"arrival: \"7:42 pm\"  (added)",BLUE)}{ok(0)}<T x={290} y={236} t="keep the old field; remove it only in /v2/" a="middle" c={BLUE}/></g>;
const caps=[["1 · three app versions in use, all reading the same order",INK],["2 · adding an optional field is safe: old apps simply ignore it",BLUE],["3 · renaming a field breaks every app that hasn't updated",RED],["4 · add the new name and keep the old one; drop it only in a new version",BLUE]];
return <Fig still={still} h={246} id={`aet${uid}`} M={M} caps={caps} title="Changing an API without breaking old apps. Three app versions are in use, installed in 2024, 2025 and now, all reading order 9101 from /v1/orders. Adding a new optional field, eta_range, is safe: older apps ignore it. Renaming eta to arrival breaks the two older apps, which look for eta and show nothing. The fix is to keep eta and add arrival alongside it, removing the old name only in a new version, /v2/."
base={base} g={[s1,s2,s3,s4]} only={[0,1,2,3]} last={s4}/>}

// Patterns, FIG 1: a stable error code drives the app; the message is free text.
function ErrorsFig({still,uid=""}){const M=`ao${uid}`;
const env=(code,msg,c=INK)=><g><rect x={10} y={44} width={300} height={110} fill="#fbfcfd" stroke={GREY}/><T x={20} y={64} t="HTTP/1.1 409 Conflict" b/><T x={20} y={86} t={'{ "error": {'}/><T x={34} y={104} t={`"code": "${code}",`} c={BLUE}/><T x={34} y={122} t={`"message": "${msg}"`} c={c}/><T x={20} y={140} t="} }"/></g>;
const out=(y,code,screen,hi)=><g key={code}><Bx x={380} y={y} w={250} h={44} t={screen} s={code} c={hi?BLUE:GREY} fill={hi?LB:"#fff"}/></g>;
const s1=env("RESTAURANT_CLOSED","Shree Misal closed at 10:30 pm");
const s2=<g>{s1}<Ar x1={312} y1={100} x2={376} y2={72} m={M} c={BLUE}/>{out(50,"RESTAURANT_CLOSED","Show similar places open now",1)}</g>;
const s3=<g>{env("RESTAURANT_CLOSED","श्री मिसळ रात्री 10:30 ला बंद झाले",INK)}<Ar x1={312} y1={100} x2={376} y2={72} m={M} c={BLUE}/>{out(50,"RESTAURANT_CLOSED","Show similar places open now",1)}<T x={160} y={176} t="message reworded or translated: nothing breaks" a="middle" c={BLUE}/></g>;
const s4=<g>{s3}{out(110,"ADDRESS_OUT_OF_RANGE","Ask for another address",0)}{out(170,"PAYMENT_DECLINED","Offer another payment method",0)}<T x={160} y={212} t="one envelope on every endpoint:" a="middle"/><T x={160} y={226} t="error handling is written once" a="middle"/></g>;
const caps=[["1 · a failed order returns its status and an error with a code and a message",INK],["2 · the app branches on the code to show the right screen",BLUE],["3 · the message can be reworded or translated freely; the code never changes",BLUE],["4 · the same shape on every endpoint, so each code maps to one reaction",BLUE]];
return <Fig still={still} h={240} id={`aot${uid}`} M={M} caps={caps} title="A consistent error response. A failed order returns 409 Conflict and an error object with a stable code, RESTAURANT_CLOSED, and a message for people. The app branches on the code and shows similar restaurants that are open. The message can be reworded or translated, here into Marathi, without breaking anything, because the app never reads it. Every endpoint uses the same envelope, so each code maps to one reaction: ADDRESS_OUT_OF_RANGE asks for another address, PAYMENT_DECLINED offers another payment method."
base={null} g={[s1,s2,s3,s4]} only={[0,1,2,3]} last={s4}/>}

// Security, FIG 1: a signed token issued once, checked everywhere without a lookup.
function JwtFig({still,uid=""}){const M=`aj${uid}`,A=60,U=220,G=400,O=570;
const base=<g><Life x={A} t="Customer app" y0={44} y1={258}/><Life x={U} t="Auth service" y0={44} y1={258}/><Life x={G} t="API gateway" y0={44} y1={258}/><Life x={O} t="Orders" y0={44} y1={258}/></g>;
const s1=<g><Msg x1={A} x2={U} y={84} t="sign in with OTP" m={M}/><Msg x1={U} x2={A} y={102} t="token: user 77, customer" m={M} c={BLUE}/></g>;
const s2=<g><Msg x1={A} x2={G} y={130} t="GET /orders/9101 + token" tx={310} m={M}/><rect x={G-4} y={136} width={8} height={18} fill={BLUE}/><T x={G-10} y={150} t="checks the signature: no lookup" a="end" c={BLUE}/></g>;
const s3=<g><Msg x1={G} x2={O} y={176} t="user 77, customer" m={M} c={BLUE}/><T x={O-8} y={196} t="reads the claims" a="end"/></g>;
const s4=<g><Msg x1={A} x2={U} y={226} t="after 1 h: refresh" m={M}/><Msg x1={U} x2={A} y={244} t="new signed token" m={M} c={BLUE}/></g>;
const caps=[["1 · on sign-in the auth service issues a token with the user's id and role, and signs it",BLUE],["2 · every request carries it; the gateway checks the signature without asking anyone",BLUE],["3 · services behind it trust the gateway and read the user and role from the token",BLUE],["4 · tokens expire quickly; a refresh token gets a new one without signing in again",INK]];
return <Fig still={still} h={266} id={`ajt${uid}`} M={M} caps={caps} title="Signed tokens. When the customer signs in with an OTP, the auth service issues a token saying user 77, role customer, valid for an hour, and signs it. Every request carries the token; the API gateway checks the signature without looking anything up. Services behind the gateway, such as Orders, read the user and role from the token's claims. Tokens expire quickly, and after an hour the app uses a refresh token to get a new one without signing in again."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Security, FIG 2: authentication then authorisation, for the owner and for someone else.
function AuthzFig({still,uid=""}){const M=`az${uid}`;
const row=(y,who,owner,ok2)=><g><Bx x={10} y={y} w={170} h={44} t="cancel order 9101" s={`token: user ${who}`}/><Ar x1={182} y1={y+22} x2={206} y2={y+22} m={M}/><Bx x={210} y={y} w={150} h={44} t="1. who is it?" s={`valid token: user ${who}`} c={BLUE} fill={LB}/><Ar x1={362} y1={y+22} x2={386} y2={y+22} m={M}/><Bx x={390} y={y} w={150} h={44} t="2. may they?" s={`order owner: ${owner}`} c={ok2?BLUE:RED} fill={ok2?LB:LR}/><Ar x1={542} y1={y+22} x2={566} y2={y+22} m={M} c={ok2?BLUE:RED}/><T x={572} y={y+27} t={ok2?"200":"403"} b c={ok2?BLUE:RED}/></g>;
const s1=<g><T x={10} y={56} t="Priya, user 77, cancels her own order" b/>{row(66,77,77,1)}</g>;
const s2=<g><T x={300} y={140} t="authenticated and authorised: cancelled" a="middle" c={BLUE}/></g>;
const s3=<g><T x={10} y={168} t="user 88 changes the id to Priya's order" b/>{row(178,88,77,0)}</g>;
const s4=<g><T x={300} y={252} t="a valid token is not permission: refused" a="middle" c={RED}/></g>;
const caps=[["1 · every request is checked twice: first who is calling",BLUE],["2 · then whether they may do this: Priya owns order 9101, so it is cancelled",BLUE],["3 · user 88 sends the same request for Priya's order, with a valid token of their own",INK],["4 · the token is valid, but the order isn't theirs: 403 Forbidden",RED]];
return <Fig still={still} h={262} id={`azt${uid}`} M={M} caps={caps} title="Authentication then authorisation. Priya, user 77, asks to cancel order 9101. First check: who is it? Her token is valid, so she is user 77. Second check: may she? The order's owner is user 77, so the cancellation goes through with 200. Then user 88 sends the same request for Priya's order with a valid token of their own. The first check passes, but the order's owner is 77, not 88, so the answer is 403 Forbidden: a valid token is not permission."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}


// Moved here from the older Concepts groups (removed 2026-11-09), drawn the same way.
// Shaping an API, FIG 1: offset or cursor. Page 1 shows orders 50 to 46; order 51 arrives; ?offset=5 then
// returns 46 to 42, repeating 46; ?before=46 returns 45 to 41, with nothing repeated or missed.
function ApiPagesFig({still,uid=""}){const D="14s",X=[20,240,460],Y=i=>96+i*30;
const caps=[["1 · page 1 of a restaurant's orders, newest first: 50 down to 46",INK],["2 · a new order, 51, arrives before the next page is loaded",INK],["3 · ?offset=5 skips five rows of the new list, so order 46 shows up twice",RED],["4 · ?before=46 asks for orders older than the last one seen: no repeats, no gaps",BLUE]];
const row=(x,i,n,c=GREY,fill="#fff")=><g key={x+"-"+n}><rect x={x} y={Y(i)-14} width="160" height="26" fill={fill} stroke={c}/><text x={x+12} y={Y(i)+4} className="fl">order {n}</text></g>;
const col=(i,t)=><text x={X[i]} y="72" className="fb">{t}</text>;
const p1=<g>{col(0,"page 1")}{[50,49,48,47,46].map((n,i)=>row(X[0],i,n))}</g>;
const s2=<g>{row(X[0],-1,51,BLUE,"#f8faff")}<text x={X[0]+170} y={Y(-1)+4} className="fl" style={{fill:BLUE}}>new</text></g>;
const s3=<g>{col(1,"page 2 · ?offset=5")}{[46,45,44,43,42].map((n,i)=>row(X[1],i,n,n===46?RED:GREY,n===46?"#fff5f4":"#fff"))}<text x={X[1]} y="262" className="fl" style={{fill:RED}}>46 again: the list moved under it</text></g>;
const s4=<g>{col(2,"page 2 · ?before=46")}{[45,44,43,42,41].map((n,i)=>row(X[2],i,n,BLUE,"#f8faff"))}<text x={X[2]} y="262" className="fl" style={{fill:BLUE}}>picks up right after 46</text></g>;
return <svg viewBox="0 0 640 276" role="img" aria-labelledby={`apt${uid}`}><title id={`apt${uid}`}>Offset pagination against cursor pagination on a restaurant's order list, newest first. Page 1 shows orders 50 down to 46. A new order, 51, arrives before the next page is loaded. Asking for page 2 with offset 5 skips five rows of the new list, so it returns orders 46 to 42 and order 46 appears twice. Asking for orders before 46, a cursor, returns 45 to 41: nothing is repeated or missed.</title>
{p1}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

export const FIGS={
"ad-choose":{C:ChooseFig,ar:640/272,title:()=>"PICKING AN API STYLE IN THREE QUESTIONS"},
"ad-retry-methods":{C:RetryMethodsFig,ar:640/252,title:()=>"THE SAME REQUEST, SENT TWICE"},
"ad-parts":{C:PartsFig,ar:640/254,title:()=>"PATH, QUERY, BODY AND HEADERS"},
"ad-nplus-one":{C:NPlusOneFig,ar:640/246,title:()=>"51 QUERIES, OR 2"},
"ad-rpc":{C:RpcFig,ar:640/240,title:()=>"A REMOTE CALL THAT LOOKS LOCAL"},
"ad-evolve":{C:EvolveFig,ar:640/246,title:()=>"OLD APPS KEEP CALLING"},
"ad-errors":{C:ErrorsFig,ar:640/240,title:()=>"THE APP READS THE CODE, NOT THE MESSAGE"},
"ad-jwt":{C:JwtFig,ar:640/266,title:()=>"A SIGNED TOKEN, CHECKED WITHOUT A LOOKUP"},
"ad-authz":{C:AuthzFig,ar:640/262,title:()=>"WHO ARE YOU, AND MAY YOU?"},
"api-pages":{C:ApiPagesFig,ar:640/276,title:()=>"OFFSET OR CURSOR"},
};
