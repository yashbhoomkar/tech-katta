// Figures for the "API types" article in Concepts, the site's first figures (they lived in dashboard.jsx).
import React from"react";import{Dot,Box,Arr,Glow,Show,Mark}from"./parts.jsx";

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

export const APITYPE_FIGS={
"patterns":{C:ApiFig,ar:640/372,title:n=>`FOUR WAYS TWO PROGRAMS TALK, IN ${n}`},
"choose":{C:ChooseFig,ar:640/470,title:()=>"CHOOSING AN API TYPE"},
"order":{C:OrderFig,ar:640/364,title:n=>`ONE ${n} ORDER, END TO END`},
"retry":{C:RetryFig,ar:640/300,title:()=>"A RETRY THAT DOES NOT CHARGE TWICE"},
};
