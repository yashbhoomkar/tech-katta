// Concepts › Basics: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "basics").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Box,Arr,Glow,Show,Mark,Mk,Bx,Ar,Caps,Cap,Life,Msg,INK,GREY,RED,BLUE}from"../parts.jsx";

// FIG. 01 of the API article: the four interaction patterns inside Zotato (viewBox 640×372).
// Animated with SMIL on an 8 s loop: a Dot travels x1→x2 between fractions t0 and t1 of the loop
// and is hidden the rest of the time. Reduced motion renders the static diagram.
const ROWS=[["REQUEST / RESPONSE","REST · GraphQL · gRPC"],["OPEN CONNECTION","WebSockets · SSE"],["CALLBACK","Webhooks"],["ASYNCHRONOUS","Queues · event streams"]];

function ApiFig({still,uid=""}){const M=`ah${uid}`;return <svg viewBox="0 0 640 372" role="img" aria-labelledby={`fig1t${uid}`}><title id={`fig1t${uid}`}>Four API interaction patterns in Zotato: the customer app requests an order and waits for the response; the rider app and Dispatch keep a connection open and send messages both ways; the payment provider calls Zotato's webhook; the Order service puts an event on Kafka for the Notification service.</title><defs><marker id={M} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>
{ROWS.map(([a,b],i)=><g key={a}>{i>0&&<line x1="0" x2="640" y1={i*93} y2={i*93} stroke="#d9dee7"/>}<text x="0" y={i*93+42} className="fk">{a}</text><text x="0" y={i*93+58} className="fsub">{b}</text></g>)}
<Box x={190} y={46} t="Customer app"/><Box x={512} y={46} w={120} t="Order API"/><Arr m={M} x1={316} x2={510} y={38} t="GET /orders/123"/><Arr m={M} x1={510} x2={316} y={56} t="200 + the order as JSON" ty={72} dash/>
<Box x={190} y={139} t="Rider app"/><Box x={512} y={139} w={120} t="Dispatch"/><rect x="316" y="131" width="196" height="16" fill="#f5f7fa" stroke="#d9dee7"/><text x="414" y="124" textAnchor="middle" className="fl">one connection stays open</text><Arr m={M} x1={320} x2={505} y={135}/><Arr m={M} x1={505} x2={320} y={143}/><text x="414" y="164" textAnchor="middle" className="fl">location → · ← new jobs</text>
<Box x={190} y={232} t="Payment provider"/><Box x={512} y={232} w={120} t="Zotato webhook" blue/><Arr m={M} x1={316} x2={510} y={224} t="POST payment.captured"/><Arr m={M} x1={510} x2={316} y={242} t="200 once the event is stored" ty={258} dash/>
<Box x={190} y={325} t="Order service"/><Box x={366} y={325} w={92} t="Kafka" blue/><Box x={512} y={325} w={120} t="Notifications"/><Arr m={M} x1={316} x2={364} y={325}/><Arr m={M} x1={460} x2={510} y={325}/><text x="414" y="358" textAnchor="middle" className="fl">order.placed · nobody waits</text>
{!still&&<g aria-hidden="true">
<Dot x1={318} x2={504} y={38} t0={.05} t1={.25}/><Dot x1={504} x2={318} y={56} t0={.32} t1={.52}/>
<Dot x1={324} x2={500} y={135} t0={.05} t1={.2}/><Dot x1={500} x2={324} y={143} t0={.26} t1={.41}/><Dot x1={324} x2={500} y={135} t0={.47} t1={.62}/><Dot x1={324} x2={500} y={135} t0={.8} t1={.95}/>
<Dot x1={318} x2={504} y={224} t0={.12} t1={.32}/><Dot x1={622} x2={622} y={223} t0={.32} t1={.46}/><Dot x1={504} x2={318} y={242} t0={.46} t1={.64}/>
<Dot x1={318} x2={358} y={325} t0={.04} t1={.12}/><Dot x1={448} x2={448} y={316} t0={.12} t1={.48}/><Dot x1={462} x2={504} y={325} t0={.48} t1={.56}/></g>}</svg>}

// More figures for the API article, same conventions as FIG. 01: 640-wide viewBox, SMIL packets
// on a loop, nothing animated when `still`. Glow outlines a box during [t0,t1] of the loop.

// FIG: choosing an API type. Ask from the top, stop at the first yes; the packet walks three Zotato cases.
// Order matters: the ladder stops at the first yes, so "another company reporting an event" comes
// before "can the work happen later" (a payment callback is a webhook even though its follow-up is queued).
const QS=[["Another company reporting an event?","Webhook"],["Can the work happen later?","Queue"],["Server pushes; the client only listens?","SSE"],["Both sides send often?","WebSockets"],["Your own services, and speed matters?","gRPC"],["Screens need different data?","GraphQL"],["Otherwise","REST"]];

const qy=i=>50+i*64;

function ChooseFig({still,uid=""}){const M=`ac${uid}`,D="12s";const down=(from,to,t0,t1)=>Array.from({length:to-from},(_,k)=>{const s=t0+(t1-t0)*k/(to-from),e=t0+(t1-t0)*(k+1)/(to-from);return <Dot key={k} x1={165} x2={165} y={qy(from+k)+20} y2={qy(from+k+1)-20} t0={s} t1={e} dur={D}/>});
return <svg viewBox="0 0 640 470" role="img" aria-labelledby={`fct${uid}`}><title id={`fct${uid}`}>Choosing an API type: ask in order whether another company is reporting an event (webhook), whether the work can happen later (queue), whether the server pushes while the client only listens (SSE), whether both sides send often (WebSockets), whether it is your own services and speed matters (gRPC), whether screens need different data (GraphQL); otherwise REST.</title><Mark m={M}/>
{QS.map(([q,a],i)=>{const y=qy(i),last=i===QS.length-1;return <g key={q}><rect x="0" y={y-18} width="330" height="36" fill="#fff" stroke="#9aa5b4" strokeDasharray={last?"4 3":undefined}/><text x="12" y={y+4} className="fq">{q}</text>
<Arr m={M} x1={332} x2={496} y={y} t={last?"":"yes"}/><Box x={498} y={y} w={136} t={a} blue={last}/>
{!last&&<g><line x1="165" y1={y+18} x2="165" y2={y+44} stroke="#1c2733" markerEnd={`url(#${M})`}/><text x="173" y={y+36} className="fl">no</text></g>}</g>})}
{!still&&<g aria-hidden="true">
<Show t0={.001} t1={.31} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE ORDER SMS</text></Show>
<Show t0={.33} t1={.65} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE TRACKING SCREEN</text></Show>
<Show t0={.67} t1={.999} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE RESTAURANT API</text></Show>
{down(0,1,.03,.08)}<Dot x1={334} x2={492} y={qy(1)} t0={.09} t1={.18} dur={D}/><Glow x={498} y={qy(1)-17} w={136} h={34} t0={.18} t1={.31} dur={D}/>
{down(0,2,.35,.43)}<Dot x1={334} x2={492} y={qy(2)} t0={.44} t1={.52} dur={D}/><Glow x={498} y={qy(2)-17} w={136} h={34} t0={.52} t1={.65} dur={D}/>
{down(0,6,.68,.86)}<Dot x1={334} x2={492} y={qy(6)} t0={.87} t1={.93} dur={D}/><Glow x={498} y={qy(6)-17} w={136} h={34} t0={.93} t1={.999} dur={D}/></g>}</svg>}

// FIG: one Zotato order, end to end, as a sequence diagram (lanes left to right, time downwards).
const LANES=[["Customer","app"],["Order","API"],["Payments","Dispatch"],["Payment","provider"],["Kafka",""],["Notifications","Invoices"],["Rider","app"]];

const lx=i=>44+i*92,sy=i=>84+i*34;

const STEPS=[[0,1,"1 GraphQL · home screen"],[0,1,"2 REST · POST /orders"],[1,2,"3 gRPC · charge, find rider"],[3,1,"4 webhook · payment.captured"],[1,4,"5 order.placed"],[4,5,"6 SMS, ticket, invoice"],[1,0,"7 SSE · rider picked up",1],[2,6,"8 WebSocket · location ⇄ jobs"]];

function OrderFig({still,uid=""}){const M=`ao${uid}`,D="12s";const end=(a,b)=>[lx(a)+(b>a?5:-5),lx(b)+(b>a?-6:6)];
return <svg viewBox="0 0 640 364" role="img" aria-labelledby={`fot${uid}`}><title id={`fot${uid}`}>One Zotato order: 1 the customer app loads the home screen with GraphQL; 2 it places the order with POST /orders; 3 the Order API calls Payments and Dispatch over gRPC; 4 the payment provider calls a webhook with payment.captured; 5 the Order API writes order.placed to Kafka; 6 Kafka feeds the SMS, the restaurant ticket and the invoice; 7 the tracking screen gets updates over server-sent events; 8 the rider app and Dispatch exchange location and jobs over a WebSocket.</title><Mark m={M}/>
{LANES.map(([a,b],i)=><g key={a}><line x1={lx(i)} y1="46" x2={lx(i)} y2="356" stroke="#d9dee7" strokeDasharray="3 3"/><rect x={lx(i)-43} y="6" width="86" height="40" fill={i===4?"#f8faff":"#fff"} stroke={i===4?"#2855d9":i===3||i===0||i===6?"#1c2733":"#9aa5b4"}/><text x={lx(i)} y={b?23:30} textAnchor="middle" className="fh">{a}</text>{b&&<text x={lx(i)} y="37" textAnchor="middle" className="fh">{b}</text>}</g>)}
{STEPS.map(([a,b,t,dash],i)=>{const[x1,x2]=end(a,b),y=sy(i),two=i===7;return <g key={t}><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd={`url(#${M})`}/>{two&&<line x1={x2} y1={y+7} x2={x1} y2={y+7} stroke="#1c2733" markerEnd={`url(#${M})`}/>}<text x={(x1+x2)/2} y={y-6} textAnchor="middle" className="fl halo">{t}</text></g>})}
{!still&&<g aria-hidden="true">{STEPS.map(([a,b],i)=>{const[x1,x2]=end(a,b),t0=.03+i*.118,t1=t0+.09;return <g key={i}><Dot x1={x1} x2={x2} y={sy(i)} t0={t0} t1={t1} dur={D}/>{i===7&&<Dot x1={x2} x2={x1} y={sy(i)+7} t0={t0} t1={t1} dur={D}/>}</g>})}</g>}</svg>}

// FIG: a retry with an idempotency key. The first reply is lost; the retry gets the same order back.
function RetryFig({still,uid=""}){const M=`ar${uid}`,D="10s",A=110,B=470;
const note=(y,t)=><g><rect x={B+8} y={y-13} width="154" height="26" fill="#f8faff" stroke="#b9c9ff"/><text x={B+16} y={y+4} className="fl">{t}</text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`frt${uid}`}><title id={`frt${uid}`}>The app sends POST /orders with an idempotency key; the Order API saves order o_123 with the key; the reply is lost on the network; the app retries the same request with the same key; the API finds the key and returns o_123 instead of creating a second order.</title><Mark m={M}/>
{[[A,"Customer app"],[B,"Order API"]].map(([x,t])=><g key={t}><line x1={x} y1="40" x2={x} y2="272" stroke="#d9dee7" strokeDasharray="3 3"/><rect x={x-70} y="6" width="140" height="34" fill="#fff" stroke="#9aa5b4"/><text x={x} y="27" textAnchor="middle" className="fb">{t}</text></g>)}
<line x1={A+5} y1="76" x2={B-6} y2="76" stroke="#1c2733" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="70" textAnchor="middle" className="fl halo">POST /orders · Idempotency-Key: 7f3c</text>
{note(102,"saves o_123 + key 7f3c")}
<line x1={B-5} y1="138" x2="300" y2="138" stroke="#1c2733" strokeDasharray="4 3"/><text x="292" y="143" textAnchor="middle" className="fx">✕</text><text x={(300+B)/2} y="132" textAnchor="middle" className="fl halo">201 o_123 · lost on the network</text>
<line x1={A+5} y1="180" x2={B-6} y2="180" stroke="#1c2733" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="174" textAnchor="middle" className="fl halo">retry · same request, same key</text>
{note(206,"key seen: no new order")}
<line x1={B-5} y1="244" x2={A+6} y2="244" stroke="#1c2733" strokeDasharray="4 3" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="238" textAnchor="middle" className="fl halo">201 o_123 · the same order</text>
<text x="320" y="292" textAnchor="middle" className="fk">ONE ORDER, ONE CHARGE</text>
{!still&&<g aria-hidden="true"><Dot x1={A+8} x2={B-10} y={76} t0={.03} t1={.15} dur={D}/><Glow x={B+8} y={89} w={154} h={26} t0={.15} t1={.27} dur={D}/><Dot x1={B-8} x2={304} y={138} t0={.28} t1={.38} dur={D}/>
<Dot x1={A+8} x2={B-10} y={180} t0={.45} t1={.57} dur={D}/><Glow x={B+8} y={193} w={154} h={26} t0={.57} t1={.68} dur={D}/><Dot x1={B-8} x2={A+10} y={244} t0={.69} t1={.81} dur={D}/></g>}</svg>}

// id → {C, ar (width/height of the viewBox), title(example name)}; gathered into FIGS in figs/index.js.
// Keep in step with FIGS in backend/src/content/validate.js.
// From tap to server, FIG 1: the first request on a new connection. A phone on 4G in Pune asks DNS for
// api.zotato.in, opens TCP, agrees TLS keys and then sends the HTTP request: four round trips of about 40 ms
// each plus 20 ms on the server, about 180 ms. On a reused connection only the last round trip happens.
function NetFirstFig({still,uid=""}){const M=`nf${uid}`,D="14s",X={p:95,d:290,s:520};
const caps=[["1 · DNS: the phone asks which address api.zotato.in has (1 round trip)",INK],["2 · TCP: SYN, SYN-ACK, and the connection is open (1 round trip)",INK],["3 · TLS 1.3: keys agreed, the server's certificate checked (1 round trip)",INK],["4 · HTTP: the request and the menu (1 round trip + 20 ms of work)",BLUE]];
const T=(y,t)=><text x="10" y={y+4} className="fl">{t}</text>;
const m=[<g key={1}><Msg x1={X.p} x2={X.d} y={100} t="api.zotato.in?" m={M}/><Msg x1={X.d} x2={X.p} y={118} t="13.235.x.x" m={M}/>{T(100,"0 ms")}</g>,
<g key={2}><Msg x1={X.p} x2={X.s} y={150} t="SYN" tx={410} m={M}/><Msg x1={X.s} x2={X.p} y={166} t="SYN-ACK" tx={410} m={M}/>{T(150,"40 ms")}</g>,
<g key={3}><Msg x1={X.p} x2={X.s} y={198} t="TLS hello" tx={410} m={M}/><Msg x1={X.s} x2={X.p} y={214} t="certificate, keys" tx={410} m={M}/>{T(198,"80 ms")}</g>,
<g key={4}><Msg x1={X.p} x2={X.s} y={246} t="GET /restaurants/42/menu" tx={400} m={M}/><Msg x1={X.s} x2={X.p} y={270} t="200 OK · menu" tx={400} m={M} c={BLUE}/>{T(246,"120 ms")}{T(276,"180 ms")}<text x="10" y="316" className="fl" style={{fill:BLUE}}>4 round trips ≈ 180 ms on a new connection; on a reused one only the last: ≈ 60 ms.</text></g>];
return <svg viewBox="0 0 640 326" role="img" aria-labelledby={`nft${uid}`}><title id={`nft${uid}`}>A sequence diagram of the first request a phone makes to the Zotato API. The phone, on 4G in Pune, first asks a DNS resolver for the address of api.zotato.in: one round trip, about 40 milliseconds. It then opens a TCP connection with SYN and SYN-ACK: another round trip. TLS 1.3 agrees encryption keys and checks the server's certificate: a third. Finally the phone sends GET /restaurants/42/menu and the menu comes back: a fourth round trip plus about 20 milliseconds of work on the server, about 180 milliseconds in all. On a connection that is already open, only the last round trip is needed, about 60 milliseconds.</title><Mk m={M}/>
<Life x={X.p} t="Phone" s="4G, Pune" y1={292}/><Life x={X.d} t="DNS resolver" y1={292}/><Life x={X.s} t="Zotato API" s="Mumbai" y1={292}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.p} x2={X.d} y={100} t0={.04} t1={.12} dur={D}/><Dot x1={X.d} x2={X.p} y={118} t0={.13} t1={.21} dur={D}/><Dot x1={X.p} x2={X.s} y={150} t0={.29} t1={.37} dur={D}/><Dot x1={X.s} x2={X.p} y={166} t0={.38} t1={.46} dur={D}/>
<Dot x1={X.p} x2={X.s} y={198} t0={.54} t1={.62} dur={D}/><Dot x1={X.s} x2={X.p} y={214} t0={.63} t1={.71} dur={D}/><Dot x1={X.p} x2={X.s} y={246} t0={.79} t1={.87} dur={D}/><Dot x1={X.s} x2={X.p} y={270} t0={.89} t1={.97} dur={D}/></g>}</svg>}

// From tap to server, FIG 2: four ways to get live updates. The rider moves at 3, 7 and 12 seconds. Polling
// every 2 s: five of eight polls find nothing and news waits for the next poll. Long polling: the server holds
// the request until there is news. Server-sent events: one open response, pushed updates. WebSocket: one
// connection, messages both ways.
function NetLiveFig({still,uid=""}){const D="14s",x=t=>180+t*29,Y=[84,138,192,246],U=[3,7,12];
const caps=[["1 · polling every 2 s: most polls find nothing, and news waits for the next one",RED],["2 · long polling: the server holds each request until there is news",INK],["3 · server-sent events: one response stays open and the server pushes updates",BLUE],["4 · WebSocket: one connection, messages both ways",BLUE]];
const dot=(t,y,c=BLUE)=><circle key={t+"-"+y} cx={x(t)} cy={y} r="5" fill={c}/>,ring=(t,y)=><circle key={"r"+t} cx={x(t)} cy={y} r="5" fill="#fff" stroke={GREY}/>;
const bar=(a,b,y,c=BLUE)=><rect key={a+"-"+y} x={x(a)} y={y-4} width={x(b)-x(a)} height="8" fill={c} opacity=".18" stroke={c} strokeOpacity=".5"/>;
const base=<g>{U.map(t=><g key={t}><line x1={x(t)} y1="56" x2={x(t)} y2="262" stroke={GREY} strokeDasharray="3 3"/><text x={x(t)} y="50" textAnchor="middle" className="fl">rider moved</text></g>)}<line x1={x(0)} y1="272" x2={x(15)} y2="272" stroke={GREY}/>{[0,5,10,15].map(t=><text key={t} x={x(t)} y="286" textAnchor="middle" className="fl">{t} s</text>)}</g>;
const lab=(i,t,s)=><g><text x="10" y={Y[i]} className="fb">{t}</text><text x="10" y={Y[i]+14} className="fl">{s}</text></g>;
const r=[<g key={0}>{lab(0,"Polling, every 2 s","5 of 8 polls empty")}{[0,2,4,6,8,10,12,14].map(t=>[4,8,12].includes(t)?dot(t,Y[0]):ring(t,Y[0]))}</g>,
<g key={1}>{lab(1,"Long polling","held until news")}{bar(0,3,Y[1])}{bar(3,7,Y[1])}{bar(7,12,Y[1])}{bar(12,15,Y[1])}{U.map(t=>dot(t,Y[1]))}</g>,
<g key={2}>{lab(2,"Server-sent events","one-way stream")}{bar(0,15,Y[2])}{U.map(t=>dot(t,Y[2]))}</g>,
<g key={3}>{lab(3,"WebSocket","both ways")}{bar(0,15,Y[3])}{U.map(t=>dot(t,Y[3]))}{[5,10].map(t=><g key={t}><rect x={x(t)-5} y={Y[3]-5} width="10" height="10" fill={INK}/><text x={x(t)} y={Y[3]-10} textAnchor="middle" className="fl">chat</text></g>)}</g>];
return <svg viewBox="0 0 640 296" role="img" aria-labelledby={`nlt${uid}`}><title id={`nlt${uid}`}>Four ways for the customer's app to learn that the rider moved, at 3, 7 and 12 seconds. Polling every 2 seconds: five of the eight polls find nothing, and each update waits for the next poll. Long polling: the server holds each request open until there is news, answers at once, and the app asks again. Server-sent events: one response stays open and the server pushes each update down it. WebSocket: one connection carries messages both ways, the rider's location in and chat messages out.</title>
{base}{still?<g>{r}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{r.map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

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

// Shaping an API, FIG 2: slow work as a job. The partner app asks for October's statement; the API queues a
// job and answers 202 at once; a worker spends about 40 s on it; the app checks the job (running), then
// checks again and gets a link to the file.
function ApiJobFig({still,uid=""}){const M=`aj${uid}`,D="14s",X={a:90,s:320,w:540};
const caps=[["1 · the app asks for October's statement; the API queues a job and answers 202 at once",INK],["2 · a worker builds the statement, which takes about 40 seconds",INK],["3 · meanwhile the app checks on the job: still running",INK],["4 · the job is done, and the next check returns a link to the file",BLUE]];
const m=[<g key={1}><Msg x1={X.a} x2={X.s} y={100} t="POST /statements · month=10" m={M}/><Msg x1={X.s} x2={X.a} y={124} t="202 Accepted · job 77" m={M} c={BLUE}/></g>,
<g key={2}><Msg x1={X.s} x2={X.w} y={150} t="queue: job 77" m={M} dash/><rect x={X.w-5} y="160" width="10" height="84" fill="#dfe6fb" stroke={BLUE}/><text x={X.w+12} y="206" className="fl">~40 s</text></g>,
<g key={3}><Msg x1={X.a} x2={X.s} y={184} t="GET /jobs/77" m={M}/><Msg x1={X.s} x2={X.a} y={204} t="running, 40%" m={M}/></g>,
<g key={4}><Msg x1={X.w} x2={X.s} y={244} t="done: statement.pdf" m={M} dash/><Msg x1={X.a} x2={X.s} y={268} t="GET /jobs/77" m={M}/><Msg x1={X.s} x2={X.a} y={290} t="done · download link" m={M} c={BLUE}/></g>];
return <svg viewBox="0 0 640 306" role="img" aria-labelledby={`ajt${uid}`}><title id={`ajt${uid}`}>A sequence diagram of slow work handled as a job. The restaurant partner app asks the statements API for October's statement. The API puts a job on a queue and answers at once with 202 Accepted and job number 77. A worker takes about 40 seconds to build the statement. Meanwhile the app checks job 77 and hears that it is still running, 40 percent done. When the worker finishes, the next check returns done, with a link to download the file.</title><Mk m={M}/>
<Life x={X.a} t="Partner app" y1={298}/><Life x={X.s} t="Statements API" y1={298}/><Life x={X.w} t="Worker" y1={298}/>
{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((x,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{x}</Show>)}
<Dot x1={X.a} x2={X.s} y={100} t0={.03} t1={.11} dur={D}/><Dot x1={X.s} x2={X.a} y={124} t0={.13} t1={.21} dur={D}/><Dot x1={X.s} x2={X.w} y={150} t0={.28} t1={.36} dur={D}/><Dot x1={X.a} x2={X.s} y={184} t0={.53} t1={.61} dur={D}/><Dot x1={X.s} x2={X.a} y={204} t0={.63} t1={.71} dur={D}/><Dot x1={X.s} x2={X.a} y={290} t0={.88} t1={.97} dur={D}/></g>}</svg>}

// Back-of-envelope, FIG 1: a 300 ms budget for opening a restaurant page on 4G. The round trip costs 80 ms,
// the gateway 5 ms, three parallel calls as long as the slowest (delivery ETA, 60 ms), building the reply 5 ms,
// downloading 80 KB 64 ms, drawing 40 ms: 254 ms.
function EstBudgetFig({still,uid=""}){const D="14s",x=ms=>20+ms*2,Y=110;
const S=[[0,80,"round trip",GREY],[80,85,"",GREY],[85,145,"calls",BLUE],[145,150,"",GREY],[150,214,"download",GREY],[214,254,"draw",GREY]];
const caps=[["1 · the target: the restaurant page on screen within 300 ms, on 4G",INK],["2 · the round trip to Mumbai alone costs 80 ms, before any work is done",INK],["3 · three calls run in parallel, so the slowest, delivery ETA at 60 ms, sets the pace",BLUE],["4 · downloading and drawing add about 100 ms: 254 ms, inside the budget",BLUE]];
const seg=([a,b,t,c],k)=><g key={k}><rect x={x(a)} y={Y-16} width={x(b)-x(a)} height="32" fill={c===BLUE?"#dfe6fb":"#eef1f5"} stroke={c}/>{t&&<text x={(x(a)+x(b))/2} y={Y+4} textAnchor="middle" className="fl">{t}</text>}</g>;
const base=<g><line x1={x(300)} y1="70" x2={x(300)} y2="150" stroke={RED} strokeDasharray="4 3"/><text x={x(300)} y="64" textAnchor="end" className="fl" style={{fill:RED}}>budget 300 ms</text>{[0,100,200,300].map(t=><text key={t} x={x(t)} y="152" textAnchor="middle" className="fl">{t} ms</text>)}</g>;
const calls=<g>{[["menu, from cache",2],["offers, from the database",15],["delivery ETA service",60]].map(([t,ms],i)=><g key={t}><rect x={x(85)} y={176+i*22} width={Math.max(2,ms*2)} height="14" fill={i===2?"#dfe6fb":"#eef1f5"} stroke={i===2?BLUE:GREY}/><text x={x(85)+ms*2+8} y={187+i*22} className="fl" style={i===2?{fill:BLUE}:undefined}>{t}: {ms} ms</text></g>)}</g>;
const total=<text x={x(254)} y="88" textAnchor="middle" className="fb" style={{fill:BLUE}}>254 ms</text>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`ebt${uid}`}><title id={`ebt${uid}`}>A time budget of 300 milliseconds for opening a restaurant page on a 4G phone. The round trip to the Mumbai servers costs 80 milliseconds before any work starts. The gateway and sign-in check take 5. Three calls run in parallel: the menu from the cache in 2 milliseconds, offers from the database in 15, and the delivery-time service in 60, so the slowest, 60, sets the pace. Building the reply takes 5, downloading 80 kilobytes takes about 64, and drawing the page about 40. The total is 254 milliseconds, inside the budget.</title>
{base}{still?<g>{S.map(seg)}{calls}{total}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{seg(S[0],0)}</Show><Show t0={.5} t1={1} dur={D}>{seg(S[1],1)}{seg(S[2],2)}{calls}</Show><Show t0={.75} t1={1} dur={D}>{seg(S[3],3)}{seg(S[4],4)}{seg(S[5],5)}{total}</Show></g>}</svg>}

// Back-of-envelope, FIG 2: from a requirement to a decision. 1 crore orders a day ÷ 1 lakh seconds ≈ 116 a
// second; × 3 at dinner ≈ 350 writes a second; × 20 reads per order ≈ 7,000 reads a second; × 2 KB ≈ 20 GB a
// day; × 365 ≈ 7.3 TB a year.
function EstFunnelFig({still,uid=""}){const M=`ef${uid}`,D="14s",X=[20,230,440],W=180;
const B=[[0,60,"1 crore orders a day","the requirement"],[1,60,"≈ 116 a second","÷ 1 lakh seconds"],[2,60,"≈ 350 writes a second","× 3 at dinner time"],[0,150,"≈ 7,000 reads a second","× 20 reads per order"],[1,150,"≈ 20 GB a day","× 2 KB per order"],[2,150,"≈ 7.3 TB a year","× 365"]];
const caps=[["1 · start from the requirement: 1 crore orders a day",INK],["2 · per second, then at the peak: about 350 writes a second at dinner",BLUE],["3 · each order is read about 20 times (tracking, history): 7,000 reads a second",BLUE],["4 · and the bytes: about 20 GB a day, 7 TB a year",BLUE]];
const box=([c,y,t,s],k)=><g key={k}><Bx x={X[c]} y={y} w={W} h={50} t={t} s={s} c={k?BLUE:GREY} fill={k?"#f8faff":"#fff"}/>{c>0&&<Ar x1={X[c]-28} y1={y+25} x2={X[c]-3} y2={y+25} m={M}/>}</g>;
const verdict=<g><text x="20" y="232" className="fl" style={{fill:BLUE}}>One primary database takes 350 writes a second; a cache takes the 7,000 reads;</text><text x="20" y="248" className="fl" style={{fill:BLUE}}>7 TB a year means archiving old orders or sharding by the second year.</text></g>;
return <svg viewBox="0 0 640 258" role="img" aria-labelledby={`eft${uid}`}><title id={`eft${uid}`}>A back-of-envelope estimate in six steps. One crore orders a day, divided by about one lakh seconds in a day, is about 116 orders a second. Times three at dinner time is about 350 writes a second. Each order is read about 20 times, for tracking and history, so about 7,000 reads a second. At about 2 kilobytes per order that is about 20 gigabytes a day, or 7.3 terabytes a year. So one primary database can take the writes, a cache takes the reads, and a year's data means archiving old orders or sharding by the second year.</title><Mk m={M}/>
{still?<g>{B.map(box)}{verdict}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{B.map((b,k)=><Show key={k} t0={[0,.25,.25,.5,.75,.75][k]} t1={1} dur={D}>{box(b,k)}</Show>)}<Show t0={.75} t1={1} dur={D}>{verdict}</Show></g>}</svg>}

export const FIGS={
"patterns":{C:ApiFig,ar:640/372,title:n=>`FOUR WAYS TWO PROGRAMS TALK, IN ${n}`},
"choose":{C:ChooseFig,ar:640/470,title:()=>"CHOOSING AN API TYPE"},
"order":{C:OrderFig,ar:640/364,title:n=>`ONE ${n} ORDER, END TO END`},
"retry":{C:RetryFig,ar:640/300,title:()=>"A RETRY THAT DOES NOT CHARGE TWICE"},
"net-first":{C:NetFirstFig,ar:640/326,title:()=>"THE FIRST REQUEST ON A NEW CONNECTION"},
"net-live":{C:NetLiveFig,ar:640/296,title:()=>"FOUR WAYS TO GET LIVE UPDATES"},
"api-pages":{C:ApiPagesFig,ar:640/276,title:()=>"OFFSET OR CURSOR"},
"api-job":{C:ApiJobFig,ar:640/306,title:()=>"SLOW WORK AS A JOB"},
"est-budget":{C:EstBudgetFig,ar:640/250,title:()=>"WHERE 300 MILLISECONDS GO"},
"est-funnel":{C:EstFunnelFig,ar:640/258,title:()=>"FROM A REQUIREMENT TO A DECISION"},
};
