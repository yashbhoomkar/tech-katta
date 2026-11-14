// Concepts › Recurring patterns: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "patterns").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import{BG,FB,GRID,LB,LR}from"../../theme/palette.js";import React from"react";import{Dot,Show,Mk,Bx,Ar,Caps,Cap,Life,Msg,INK,GREY,RED,BLUE,pace}from"../parts.jsx";

// Live updates, FIG 1: one event to the one connection server holding the customer's phone. The order service
// publishes "order 9051 ready"; the registry says customer 77 is connected to C2; only C2 gets it and writes it
// down the open connection.
function LiveFanoutFig({still,uid=""}){const M=`lf${uid}`,D=pace(14);
const caps=[["1 · the kitchen marks order 9051 ready; the order service publishes one event",INK],["2 · the registry says customer 77's phone is connected to server C2",BLUE],["3 · only C2 gets the event, and writes it down the phone's open connection",BLUE],["4 · Asha sees \"ready\" within a second; C1 and C3 never handled it",BLUE]];
const base=<g><Bx x={10} y={110} w={120} h={44} t="Order service" s="9051: ready"/><Ar x1={132} y1={132} x2={176} y2={132} m={M}/>
<Bx x={180} y={110} w={110} h={44} t="Event bus" s="order.updated"/><Bx x={180} y={196} w={110} h={44} t="Registry" s="user → server"/>
{[["C1",56],["C2",116],["C3",176]].map(([n,y])=><Bx key={n} x={340} y={y} w={130} h={40} t={`Connection ${n}`} s="40,000 phones"/>)}
<Bx x={510} y={116} w={120} h={40} t="Asha's phone" s="customer 77"/>
<text x="10" y="266" className="fl">Servers add users to the registry when they connect, and remove them when they leave.</text></g>;
const s2=<g><Ar x1={235} y1={156} x2={235} y2={194} m={M} c={BLUE}/><text x="243" y="180" className="fl" style={{fill:BLUE}}>who holds 77?</text><Bx x={180} y={196} w={110} h={44} t="Registry" s="77 → C2" c={BLUE} fill={LB}/></g>;
const s3=<g><Ar x1={292} y1={130} x2={338} y2={136} m={M} c={BLUE}/><Bx x={340} y={116} w={130} h={40} t="Connection C2" s="40,000 phones" c={BLUE} fill={LB}/></g>;
const s4=<g><Ar x1={472} y1={136} x2={508} y2={136} m={M} c={BLUE}/><Bx x={510} y={116} w={120} h={40} t="Asha's phone" s="order ready" c={BLUE} fill={LB}/></g>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`lft${uid}`}><title id={`lft${uid}`}>Delivering one live update. The kitchen marks order 9051 ready and the order service publishes one event to the event bus. A registry records which connection server holds each user's open connection, and says customer 77 is on server C2. Only C2 receives the event, and it writes it down the phone's open connection, so Asha sees that her order is ready within a second. Servers C1 and C3, each holding about 40,000 other phones, never handle it.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Dot x1={134} x2={174} y={132} t0={.04} t1={.14} dur={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Dot x1={235} x2={235} y={158} y2={192} t0={.28} t1={.38} dur={D}/><Show t0={.5} t1={1} dur={D}>{s3}</Show><Dot x1={294} x2={334} y={130} y2={135} t0={.53} t1={.63} dur={D}/>
<Show t0={.75} t1={1} dur={D}>{s4}</Show><Dot x1={474} x2={504} y={136} t0={.78} t1={.86} dur={D}/></g>}</svg>}

// Live updates, FIG 2: resuming after a dropped connection. Updates carry numbers; the phone has seen 42 when
// it enters a tunnel; 43 and 44 reach no one; it reconnects with "last seen 42" and the server replays 43 and
// 44 from a short log before carrying on live.
function LiveResumeFig({still,uid=""}){const M=`lr${uid}`,D=pace(14),P=90,S=320,L=540;
const caps=[["1 · every update carries a number; the phone has seen up to 42",INK],["2 · the phone goes into a tunnel, so 43 and 44 reach no one",RED],["3 · it reconnects, waiting longer after each failed try, and says: last seen 42",INK],["4 · the server replays 43 and 44 from the log, then carries on live",BLUE]];
const lanes=<g><Life x={P} t="Phone" y1={292}/><Life x={S} t="Connection server" y1={292}/><Life x={L} t="Update log" s="kept for an hour" y1={292}/></g>;
const m=[<g key={1}><Msg x1={S} x2={P} y={98} t="#41 rider picked up" m={M}/><Msg x1={S} x2={P} y={122} t="#42 rider 2 km away" m={M}/><text x="10" y="146" className="fl" style={{fill:BLUE}}>seen: 42</text></g>,
<g key={2}><Msg x1={L} x2={S} y={164} t="#43, #44" m={M}/><Msg x1={S} x2={P+16} y={186} t="sent to no one" m={M} c={RED} dash/><path d={`M${P-6} 180l12 12m0-12l-12 12`} stroke={RED} strokeWidth="2"/><text x="10" y="190" className="fl" style={{fill:RED}}>tunnel</text></g>,
<g key={3}><text x="98" y="210" className="fl">tries after 1 s, 2 s, 4 s</text><Msg x1={P} x2={S} y={230} t="reconnect · last seen 42" m={M}/></g>,
<g key={4}><Msg x1={S} x2={L} y={250} t="after 42?" m={M}/><Msg x1={L} x2={S} y={268} t="#43, #44" m={M}/><Msg x1={S} x2={P} y={284} t="#43, #44, then live" m={M} c={BLUE}/></g>];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`lrt${uid}`}><title id={`lrt${uid}`}>A phone resuming live updates after losing its connection. Every update carries a number, and the phone has seen up to number 42: the rider picked up the order, then is 2 kilometres away. The phone enters a tunnel and loses its connection, so updates 43 and 44 reach no one. It reconnects, waiting 1, 2 and 4 seconds between tries, and says the last number it saw was 42. The connection server reads everything after 42 from an update log kept for an hour, sends 43 and 44, and then carries on live.</title><Mk m={M}/>
{lanes}{still?<g>{m}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{m.map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}
<Dot x1={S} x2={P+4} y={122} t0={.08} t1={.18} dur={D}/><Dot x1={S} x2={P+20} y={186} t0={.33} t1={.43} dur={D}/><Dot x1={P} x2={S-4} y={230} t0={.58} t1={.68} dur={D}/><Dot x1={S} x2={P+4} y={284} t0={.86} t1={.95} dur={D}/></g>}</svg>}

// Contention, FIG 1: two buyers, one plate left. Read-then-write lets both read 1 and both write 0: two sold.
// One conditional update (stock - 1 where stock > 0) lets exactly one win.
function RaceFig({still,uid=""}){const M=`rc${uid}`,D=pace(14);
const caps=[["1 · one plate of biryani is left, and two customers press Buy at the same moment",INK],["2 · both requests read the stock first, and both see 1 left",INK],["3 · both write 0 and both are confirmed: two plates sold, one in the kitchen",RED],["4 · one conditional update instead: the database lets exactly one of them win",BLUE]];
const lanes=(o,t)=><g><text x={o} y="48" className="fk">{t}</text><Life x={o+40} t="Buyer A" y0={72} y1={236}/><Life x={o+150} t="items · id 7" s="stock 1" y0={72} y1={236}/><Life x={o+260} t="Buyer B" y0={72} y1={236}/></g>;
const s2=<g><Msg x1={50} x2={160} y={118} t="read" m={M}/><Msg x1={160} x2={50} y={138} t="1 left" m={M}/><Msg x1={270} x2={160} y={118} t="read" m={M}/><Msg x1={160} x2={270} y={138} t="1 left" m={M}/></g>;
const s3=<g><Msg x1={50} x2={160} y={168} t="set 0" m={M}/><Msg x1={160} x2={50} y={188} t="sold" m={M} c={RED}/><Msg x1={270} x2={160} y={168} t="set 0" m={M}/><Msg x1={160} x2={270} y={188} t="sold" m={M} c={RED}/><rect x="104" y="212" width="112" height="20" fill={LR} stroke={RED}/><text x="160" y="226" textAnchor="middle" className="fb" style={{fill:RED}}>2 sold, 1 plate</text></g>;
const s4=<g><Msg x1={370} x2={480} y={118} t="−1 if stock > 0" m={M}/><Msg x1={590} x2={480} y={118} t="−1 if stock > 0" m={M}/><Msg x1={480} x2={370} y={150} t="1 row: sold" m={M} c={BLUE}/><Msg x1={480} x2={590} y={150} t="0 rows: sold out" m={M} c={RED}/>
<text x="340" y="268" className="fl">UPDATE items SET stock = stock - 1</text><text x="340" y="284" className="fl">WHERE id = 7 AND stock &gt; 0</text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rct${uid}`}><title id={`rct${uid}`}>Two customers buy the last plate of biryani at the same moment. On the left, each request reads the stock first and sees one left, then each writes zero and is told the plate is sold: two plates sold with one in the kitchen. On the right, each request sends one conditional update, subtract one only if the stock is above zero. The database runs them one at a time, so the first changes one row and is sold the plate, and the second changes no rows and is told it is sold out.</title><Mk m={M}/>
{lanes(10,"READ, THEN WRITE")}{lanes(330,"ONE CONDITIONAL UPDATE")}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show>
<Dot x1={52} x2={156} y={118} t0={.27} t1={.35} dur={D}/><Dot x1={268} x2={164} y={118} t0={.27} t1={.35} dur={D}/><Dot x1={52} x2={156} y={168} t0={.52} t1={.6} dur={D}/><Dot x1={268} x2={164} y={168} t0={.52} t1={.6} dur={D}/><Dot x1={372} x2={476} y={118} t0={.77} t1={.85} dur={D}/><Dot x1={588} x2={484} y={118} t0={.77} t1={.85} dur={D}/></g>}</svg>}

// Contention, FIG 2: a seat held for 10 minutes. Asha holds 14C at 10:00; Ravi is refused at 10:03; Asha
// never pays and the hold expires at 10:10; Ravi holds it at 10:11 and pays at 10:13.
function SeatHoldFig({still,uid=""}){const D=pace(14),x=m=>60+m*36;
const caps=[["1 · Asha picks seat 14C: it is held for her for 10 minutes, not sold yet",BLUE],["2 · Ravi tries 14C at 10:03 and is told it's taken, so he can pick another",RED],["3 · Asha never pays: at 10:10 the hold runs out and the seat is free again",INK],["4 · Ravi holds it at 10:11 and pays at 10:13: sold once, to one person",BLUE]];
const seg=(a,b,t,fill,c)=><g><rect x={x(a)} y="104" width={x(b)-x(a)} height="30" fill={fill} stroke={c}/>{t&&<text x={(x(a)+x(b))/2} y="123" textAnchor="middle" className="fl" style={{fill:c}}>{t}</text>}</g>;
const mk=(m,up,t,c=INK,a="middle")=><g><line x1={x(m)} y1={up?92:134} x2={x(m)} y2={up?104:148} stroke={c} strokeDasharray="2 2"/><text x={x(m)} y={up?88:160} textAnchor={a} className="fl" style={{fill:c}}>{t}</text></g>;
const base=<g><text x="10" y="123" className="fb">14C</text><rect x={x(0)} y="104" width={x(15)-x(0)} height="30" fill={BG} stroke={GREY}/>{[0,5,10,15].map(m=><text key={m} x={x(m)} y="186" textAnchor="middle" className="fl">10:{String(m).padStart(2,"0")}</text>)}
<text x="10" y="222" className="fl">UPDATE seats SET held_by = 'ravi', hold_until = now() + interval '10 min'</text><text x="10" y="238" className="fl">WHERE id = '14C' AND (held_by IS NULL OR hold_until &lt; now())</text></g>;
const s1=<g>{seg(0,10,"held for Asha until 10:10",LB,BLUE)}{mk(0,1,"Asha holds 14C",BLUE,"start")}</g>;
const s2=mk(3,0,"10:03 Ravi: it's taken",RED),s3=<g>{seg(10,11,"",BG,GREY)}{mk(10,1,"hold expires")}</g>;
const s4=<g>{seg(11,13,"Ravi",LB,BLUE)}{seg(13,15,"sold",FB,BLUE)}{mk(11,0,"Ravi holds",BLUE)}{mk(13,1,"Ravi pays",BLUE)}</g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`sht${uid}`}><title id={`sht${uid}`}>Seat 14C between 10:00 and 10:15. At 10:00 Asha picks it and it is held for her until 10:10, not sold. At 10:03 Ravi tries the same seat and is told it is taken. Asha never pays, so at 10:10 the hold expires and the seat is free again. At 10:11 Ravi holds it and at 10:13 he pays, so it is sold once, to one person. One update statement takes the hold only if the seat has no holder or the old hold has run out.</title>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{[s1,s2,s3,s4].map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

// Multi-step processes, FIG 1: an order as a state machine. Placed → accepted → preparing → picked up →
// delivered; with no answer in 5 minutes a timer cancels it and a refund follows; a late "accept" is refused.
function OrderStatesFig({still,uid=""}){const M=`os${uid}`,D=pace(14),X=[10,138,266,394,522],N=["Placed","Accepted","Preparing","Picked up","Delivered"];
const caps=[["1 · an order is always in exactly one state, and only the listed moves are allowed",INK],["2 · the restaurant accepts within 5 minutes, and the order moves on to preparing",BLUE],["3 · if nobody accepts in 5 minutes, a timer cancels it and starts the refund",BLUE],["4 · a late accept for a cancelled order is refused: that move isn't in the table",RED]];
const st=(x,y,t,c=GREY,fill=BG)=><Bx key={t} x={x} y={y} w={108} h={36} t={t} c={c} fill={fill}/>;
const base=<g>{N.map((n,i)=>st(X[i],70,n))}{X.slice(0,4).map(x=><Ar key={x} x1={x+110} y1={88} x2={x+125} y2={88} m={M}/>)}{st(10,170,"Cancelled")}{st(138,170,"Refunded")}
<Ar x1={64} y1={108} x2={64} y2={167} m={M}/><text x="72" y="136" className="fl">rejected, or no</text><text x="72" y="149" className="fl">answer in 5 min</text><Ar x1={120} y1={188} x2={135} y2={188} m={M}/>
<text x="400" y="150" className="fb">The allowed moves</text>{["placed → accepted, cancelled","accepted → preparing","preparing → picked up","picked up → delivered","cancelled → refunded"].map((t,i)=><text key={t} x="400" y={170+i*16} className="fl">{t}</text>)}</g>;
const s2=<g>{[0,1,2].map(i=>st(X[i],70,N[i],BLUE,LB))}</g>,s3=<g>{st(10,70,"Placed",BLUE,LB)}{st(10,170,"Cancelled",BLUE,LB)}{st(138,170,"Refunded",BLUE,LB)}</g>;
const s4=<g>{st(10,170,"Cancelled",BLUE,LB)}{st(138,70,"Accepted",RED,LR)}<text x="10" y="236" className="fl" style={{fill:RED}}>"accept" for a cancelled order: refused</text></g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`ost${uid}`}><title id={`ost${uid}`}>A food order as a state machine. It moves from placed to accepted, preparing, picked up and delivered. From placed it can also go to cancelled, when the restaurant rejects it or doesn't answer within 5 minutes, and from cancelled to refunded. A table lists the allowed moves. When the restaurant accepts in time, the order moves on to preparing. When nobody accepts, a timer cancels it and starts the refund. An accept that arrives after the order was cancelled is refused, because that move isn't in the table.</title><Mk m={M}/>
{base}{still?<g>{s4}<Cap t={caps[3][0]} c={RED}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={.5} dur={D}>{s2}</Show><Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show>
<Dot x1={64} x2={64} y={110} y2={166} t0={.53} t1={.62} dur={D}/></g>}</svg>}

// Multi-step processes, FIG 2: a durable workflow survives a crash. Worker A does steps 1 and 2, saving each
// result, then dies; worker B replays the history, skips the finished steps and runs 3 and 4.
function WorkflowResumeFig({still,uid=""}){const D=pace(14),Y=[96,128,160,192],S=["1 · charge the card","2 · tell the restaurant","3 · find a rider","4 · tell the customer"],H=["card charged, ref c-81","restaurant told","rider Ravi assigned","customer told"];
const caps=[["1 · a workflow runs its steps in order and saves each result in its history",INK],["2 · worker A charges the card and tells the restaurant, then its machine dies",RED],["3 · worker B takes over and replays the history: steps 1 and 2 are already done",INK],["4 · it runs steps 3 and 4 only, so the card is never charged twice",BLUE]];
const base=<g><text x="20" y="62" className="fk">STEPS</text><text x="230" y="62" className="fk">WORKER A</text><text x="330" y="62" className="fk">WORKER B</text><text x="440" y="62" className="fk">HISTORY, SAVED</text>
<rect x="440" y="74" width="190" height="136" fill={BG} stroke={GREY}/>{S.map((s,i)=><text key={s} x="20" y={Y[i]} className="fb">{s}</text>)}
<text x="20" y="242" className="fl">On replay, finished steps return their saved results instead of running again.</text></g>;
const mark=(x,i,t,c)=><text x={x} y={Y[i]} className="fl" style={{fill:c}}>{t}</text>,hist=i=><text key={i} x="452" y={Y[i]} className="fl">{i+1} · {H[i]}</text>;
const s2=<g>{mark(230,0,"done",BLUE)}{mark(230,1,"done",BLUE)}{mark(230,2,"crashed",RED)}{hist(0)}{hist(1)}</g>;
const s3=<g>{mark(330,0,"from history",GREY)}{mark(330,1,"from history",GREY)}</g>,s4=<g>{mark(330,2,"done",BLUE)}{mark(330,3,"done",BLUE)}{hist(2)}{hist(3)}</g>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`wrt${uid}`}><title id={`wrt${uid}`}>A durable workflow with four steps: charge the card, tell the restaurant, find a rider and tell the customer. Each finished step's result is saved in the workflow's history. Worker A charges the card and tells the restaurant, then its machine dies during step 3. Worker B takes over and replays the history: steps 1 and 2 return their saved results without running again. It then runs steps 3 and 4, so the card is charged only once.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Scaling reads, FIG 1: where 1 lakh reads a second end up. The CDN answers 60,000; the cache 36,000 of the
// 40,000 left; replicas 3,600 of 4,000; 400 that must be fresh reach the primary. Bar width = reads arriving.
function ReadLayersFig({still,uid=""}){const D=pace(14),X0=120,W=v=>Math.max(2,v/250);
const caps=[["1 · 1 lakh reads a second at dinner; one database handles thousands, not lakhs",INK],["2 · the CDN answers images and menus from a nearby city: 60,000 never reach us",BLUE],["3 · the cache answers 9 in 10 of the rest, so only 4,000 a second reach a database",BLUE],["4 · replicas take most of those; only reads that must be fresh go to the primary",BLUE]];
const R=[["Phones",100000,0,"1,00,000 reads a second at dinner"],["CDN",100000,60000,"answers 60,000: images and menus · passes on 40,000"],["Cache",40000,36000,"answers 36,000 · passes on 4,000"],["Replicas",4000,3600,"answer 3,600 · pass on 400"],["Primary",400,400,"400 reads a second that must be fresh: easy for one machine"]];
const row=([n,a,s,t],i)=>{const y=52+i*42;return <g key={n}><text x="10" y={y+11} className="fb">{n}</text><rect x={X0} y={y} width={W(a)} height="14" fill={GRID} stroke={GREY}/>{s>0&&<rect x={X0} y={y} width={W(s)} height="14" fill={FB} stroke={BLUE}/>}<text x={X0} y={y+30} className="fl">{t}</text></g>};
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`rlt${uid}`}><title id={`rlt${uid}`}>Where 1 lakh reads a second go at dinner time, with each bar as wide as the reads arriving at that layer. The CDN answers 60,000, images and menus, from a city near the user, and passes on 40,000. The cache answers 36,000 of those and passes on 4,000. Read replicas answer 3,600 and pass on 400 reads that must see the latest data, which the primary database handles easily.</title>
{row(R[0],0)}{still?<g>{R.slice(1).map((r,i)=>row(r,i+1))}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{row(R[1],1)}</Show><Show t0={.5} t1={1} dur={D}>{row(R[2],2)}</Show><Show t0={.75} t1={1} dur={D}>{row(R[3],3)}{row(R[4],4)}</Show></g>}</svg>}

// Scaling reads, FIG 2: a hot key. 1,000 requests for restaurant 42's menu arrive as its cache entry expires.
// Without coalescing all of them query the database; with it, one fetches and the rest share the answer.
function HotKeyFig({still,uid=""}){const M=`hk${uid}`,D=pace(14),Y=[70,92,114,136,158,180,202,224];
const caps=[["1 · during the match, 1,000 requests a second ask for restaurant 42's menu",INK],["2 · its cache entry expires, and all of them go to the database in the same moment",RED],["3 · coalesce: the first request fetches it, and the others wait for that answer",BLUE],["4 · each server also keeps the menu in memory for 5 seconds, so the key cools down",BLUE]];
const reqs=x=><g>{Y.map(y=><g key={y}><rect x={x} y={y-8} width="52" height="16" fill={BG} stroke={GREY}/><text x={x+26} y={y+4} textAnchor="middle" className="fl">menu 42</text></g>)}</g>;
const base=<g><text x="10" y="50" className="fk">WITHOUT COALESCING</text><text x="340" y="50" className="fk">WITH COALESCING</text>{reqs(10)}{reqs(340)}<Bx x={200} y={127} w={100} h={40} t="Database"/><Bx x={440} y={124} w={86} h={46} t="one fetch" s="others wait"/><Bx x={550} y={127} w={80} h={40} t="Database"/></g>;
const s2=<g>{Y.map(y=><line key={y} x1={64} y1={y} x2={198} y2={147} stroke={RED}/>)}<text x="10" y="252" className="fl" style={{fill:RED}}>1,000 database queries at once</text></g>;
const s3=<g>{Y.map(y=><line key={y} x1={394} y1={y} x2={438} y2={147} stroke={GREY}/>)}<Ar x1={528} y1={147} x2={548} y2={147} m={M} c={BLUE}/><text x="340" y="252" className="fl" style={{fill:BLUE}}>1 database query; the rest share it</text></g>;
const s4=<text x="340" y="268" className="fl" style={{fill:BLUE}}>then a copy in each server's memory for 5 s</text>;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`hkt${uid}`}><title id={`hkt${uid}`}>A hot key. During a match, 1,000 requests a second ask for restaurant 42's menu. When its cache entry expires, without coalescing every one of those requests queries the database at the same moment. With coalescing, the first request fetches the menu and the others wait for that one answer, so the database sees one query. Each server also keeps the menu in its own memory for 5 seconds, so the single cache entry is no longer hammered.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Scaling writes, FIG 1: a spike through a queue. Analytics events: 3,000 a second, then 20,000 a second for
// 10 minutes from 8:00; the database writes at most 8,000. The queue peaks at 72 lakh (12,000 × 600 s) and
// drains at 5,000 a second, empty 24 minutes later at 8:34.
function WriteBufferFig({still,uid=""}){const D=pace(14),x=m=>60+m*13.5,y=v=>230-v*0.008;
const caps=[["1 · app events for analytics: 3,000 writes a second, until the 8 pm flash sale",INK],["2 · for 10 minutes 20,000 a second arrive, but the database writes 8,000 at most",RED],["3 · the queue holds the difference: about 72 lakh events at the peak",BLUE],["4 · then the database keeps writing 8,000 a second, and the queue is empty by 8:34",BLUE]];
const inc=`M${x(0)} ${y(3000)}H${x(5)}V${y(20000)}H${x(15)}V${y(3000)}H${x(40)}`,db=`M${x(0)} ${y(3000)}H${x(5)}V${y(8000)}H${x(39)}V${y(3000)}H${x(40)}`;
const axes=<g><line x1="60" y1="60" x2="60" y2="230" stroke={GREY}/><line x1="60" y1="230" x2="604" y2="230" stroke={GREY}/>{[[20000,"20,000/s"],[8000,"8,000/s"],[0,"0"]].map(([v,t])=><text key={v} x="54" y={y(v)+4} textAnchor="end" className="fl">{t}</text>)}
{[[5,"8:00"],[15,"8:10"],[25,"8:20"],[35,"8:30"]].map(([m,t])=><text key={m} x={x(m)} y="246" textAnchor="middle" className="fl">{t}</text>)}<line x1="60" y1={y(8000)} x2="600" y2={y(8000)} stroke={RED} strokeDasharray="4 3"/><text x="66" y={y(8000)-6} className="fl" style={{fill:RED}}>limit</text></g>;
const inL=<g><path d={inc} fill="none" stroke={INK} strokeWidth="1.5"/><text x={x(10)} y="62" textAnchor="middle" className="fl">arriving</text></g>,dbL=<g><path d={db} fill="none" stroke={BLUE} strokeWidth="2.5"/><text x="470" y={y(8000)-6} className="fl" style={{fill:BLUE}}>written: 8,000/s</text></g>;
const area=<g><path d={`M${x(5)} 230L${x(15)} 110L${x(39)} 230Z`} fill={FB} opacity=".7"/><text x={x(15)+8} y="104" className="fl" style={{fill:BLUE}}>queue: 72 lakh</text></g>,end=<text x={x(39)} y="222" textAnchor="end" className="fl" style={{fill:BLUE}}>empty at 8:34</text>;
return <svg viewBox="0 0 640 256" role="img" aria-labelledby={`wbt${uid}`}><title id={`wbt${uid}`}>A chart of writes a second between 7:55 and 8:35. Analytics events arrive at 3,000 a second, then at 20,000 a second for ten minutes from 8:00, during a flash sale. The database can write at most 8,000 a second, so a queue in front of it takes the difference and grows to about 72 lakh events by 8:10. After the rush the database keeps writing 8,000 a second while 3,000 arrive, and the queue is empty by 8:34.</title>
{axes}{still?<g>{area}{inL}{dbL}{end}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.5} t1={1} dur={D}>{area}</Show>{inL}<Show t0={.25} t1={1} dur={D}>{dbL}</Show><Show t0={.75} t1={1} dur={D}>{end}</Show></g>}</svg>}

// Scaling writes, FIG 2: a hot counter split ten ways. All likes for one dish go to one key on one shard; at
// 10,000 a second that shard is overloaded. Ten parts on five shards take 1,000 a second each; a read adds them.
function SplitCounterFig({still,uid=""}){const M=`sc${uid}`,D=pace(14),px=i=>i<5?460:550,py=i=>58+(i%5)*38;
const caps=[["1 · a dish's like count is one key, so every like lands on the same shard",INK],["2 · a video of the dish goes viral: 10,000 likes a second, too many for one shard",RED],["3 · split the key into 10 parts on different shards; each like adds to a random one",BLUE],["4 · reading the count adds up the 10 parts: one bigger read, and no hot shard",BLUE]];
const left=<g><text x="10" y="44" className="fk">ONE KEY</text><Bx x={10} y={116} w={80} h={36} t="like +1"/><Ar x1={92} y1={134} x2={136} y2={134} m={M}/><Bx x={140} y={110} w={150} h={48} t="likes:dish-9" s="shard 3"/></g>;
const hot=<g><Bx x={140} y={110} w={150} h={48} t="likes:dish-9" s="shard 3" c={RED} fill={LR}/><text x="10" y="200" className="fl" style={{fill:RED}}>10,000 writes a second,</text><text x="10" y="216" className="fl" style={{fill:RED}}>all on one shard</text></g>;
const right=<g><text x="340" y="44" className="fk">TEN PARTS</text><Bx x={330} y={116} w={70} h={36} t="like +1"/><Ar x1={402} y1={134} x2={446} y2={134} m={M}/><text x="424" y="126" textAnchor="middle" className="fl">any one</text><rect x="450" y="50" width="184" height="192" fill="none" stroke={GREY} strokeDasharray="4 3"/>{[...Array(10).keys()].map(i=><g key={i}><rect x={px(i)} y={py(i)} width="80" height="26" fill={LB} stroke={BLUE}/><text x={px(i)+40} y={py(i)+17} textAnchor="middle" className="fl">#{i} · shard {i%5+1}</text></g>)}<text x="330" y="200" className="fl" style={{fill:BLUE}}>1,000/s each</text></g>;
const read=<text x="340" y="252" className="fl" style={{fill:BLUE}}>count = #0 + #1 + … + #9</text>;
return <svg viewBox="0 0 640 264" role="img" aria-labelledby={`sct${uid}`}><title id={`sct${uid}`}>A like counter for one dish. Stored as one key, every like goes to the same shard, and when a video of the dish goes viral, 10,000 likes a second overload that shard. Split into ten parts spread over five shards, each like adds one to a randomly chosen part, so each part takes about 1,000 writes a second. Reading the count adds up the ten parts.</title><Mk m={M}/>
{left}{still?<g>{hot}{right}{read}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{hot}</Show><Show t0={.5} t1={1} dur={D}>{right}</Show><Show t0={.75} t1={1} dur={D}>{read}</Show></g>}</svg>}

// Large files, FIG 1: a multipart upload. A 1.6 GB video in 16 parts of 100 MB, three in flight at a time;
// part 11 fails on a network switch and only it is sent again; one "complete" call joins the parts.
function MultipartFig({still,uid=""}){const M=`mp${uid}`,D=pace(14),px=i=>20+(i%8)*76,py=i=>60+Math.floor(i/8)*44;
const caps=[["1 · a 1.6 GB video is cut into 16 parts of 100 MB, each with its own signed URL",INK],["2 · the phone sends three parts at a time; each part is checked when it arrives",BLUE],["3 · part 11 fails when the phone switches networks: only part 11 is sent again",RED],["4 · when all 16 are in, one \"complete\" call joins them into a single file",BLUE]];
const part=(i,c=GREY,fill=BG,t="100 MB")=><g key={i}><rect x={px(i)} y={py(i)} width="66" height="34" fill={fill} stroke={c} strokeWidth={c===GREY?1:1.5}/><text x={px(i)+33} y={py(i)+15} textAnchor="middle" className="fb" style={c!==GREY?{fill:c}:undefined}>{i+1}</text><text x={px(i)+33} y={py(i)+28} textAnchor="middle" className="fl">{t}</text></g>;
const P=[...Array(16).keys()],done=i=>part(i,BLUE,FB,"in");
const s2=<g>{P.slice(0,10).map(done)}{[10,11,12].map(i=>part(i,BLUE,LB,"sending"))}</g>;
const s3=<g>{P.filter(i=>i!==10).map(done)}{part(10,RED,LR,"again")}</g>;
const s4=<g>{P.map(done)}<Ar x1={320} y1={150} x2={320} y2={180} m={M}/><text x="330" y="170" className="fl">complete: the list of 16 parts</text><rect x="20" y="184" width="600" height="30" fill={FB} stroke={BLUE}/><text x="320" y="203" textAnchor="middle" className="fb" style={{fill:BLUE}}>kitchen-tour.mp4 · 1.6 GB · one object</text></g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`mpt${uid}`}><title id={`mpt${uid}`}>A multipart upload of a 1.6 gigabyte video, cut into 16 parts of 100 megabytes, each with its own signed upload URL. The phone sends three parts at a time and storage checks each part as it arrives. Part 11 fails when the phone switches from Wi-Fi to mobile data, and only part 11 is sent again. When all 16 parts are in, one complete call with the list of parts joins them into a single object.</title><Mk m={M}/>
{P.map(i=>part(i))}<text x="20" y="242" className="fl">Parts can go in any order; storage keeps them until the complete call, or a cleanup rule.</text>
{still?<g>{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={.5} dur={D}>{s2}</Show><Show t0={.5} t1={.75} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Large files, FIG 2: an upload's states in the database. pending (row written, URLs handed out) → uploaded
// (storage event) → processing (checks, resizing) → ready; bad files go to failed; nothing after 24 h → swept.
function FileStatesFig({still,uid=""}){const M=`fs${uid}`,D=pace(14),X=[10,170,330,490];
const S=[["pending","row written, URLs out"],["uploaded","bytes in storage"],["processing","scan, resize, convert"],["ready","shown to customers"]];
const caps=[["1 · before any bytes move, the API writes the row: video 88, pending",BLUE],["2 · storage reports the finished upload, and a worker checks and converts it",BLUE],["3 · only then is it ready; customers never see a half-processed file",BLUE],["4 · uploads nobody finishes are swept after a day: the row and any stored parts",INK]];
const st=(i,c=GREY,fill=BG)=><Bx key={i} x={X[i]} y={74} w={140} h={44} t={S[i][0]} s={S[i][1]} c={c} fill={fill}/>;
const base=<g>{S.map((s,i)=>st(i))}{[0,1,2].map(i=><g key={i}><Ar x1={X[i]+142} y1={96} x2={X[i]+158} y2={96} m={M}/><text x={X[i]+150} y="64" textAnchor="middle" className="fl">{["storage event","worker takes it","checks pass"][i]}</text></g>)}
<Ar x1={400} y1={120} x2={400} y2={166} m={M}/><text x="408" y="148" className="fl">bad file</text><Bx x={330} y={168} w={140} h={44} t="failed" s="uploader told why"/>
<Ar x1={80} y1={120} x2={80} y2={166} m={M}/><text x="88" y="148" className="fl">nothing after 24 h</text><Bx x={10} y={168} w={140} h={44} t="swept" s="row and parts removed"/>
<text x="490" y="186" className="fl">the CDN serves</text><text x="490" y="200" className="fl">ready files only</text></g>;
const s1=st(0,BLUE,LB),s2=<g>{st(1,BLUE,LB)}{st(2,BLUE,LB)}</g>,s3=st(3,BLUE,LB),s4=<Bx x={10} y={168} w={140} h={44} t="swept" s="row and parts removed" c={BLUE} fill={LB}/>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`fst${uid}`}><title id={`fst${uid}`}>The states of an uploaded video in the database. Before any bytes move, the API writes a row for video 88 with status pending and hands out upload URLs. When storage reports the finished upload it becomes uploaded, and a worker takes it to processing: a virus scan, resizing and conversion. When the checks pass it becomes ready, and only ready files are served through the CDN. A bad file goes to failed and the uploader is told why. An upload with nothing after 24 hours is swept: the row and any stored parts are removed.</title><Mk m={M}/>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{[s1,s2,s3,s4].map((g,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{g}</Show>)}</g>}</svg>}

// Long-running jobs, FIG 1: a lease. Worker A takes job 512 with a 60 s lease and renews it every 20 s; it
// crashes at 50 s, the lease (last renewed at 40 s) runs out at 100 s, and worker B takes the job and finishes.
function JobLeaseFig({still,uid=""}){const D=pace(14),x=s=>130+s*2.4,A=84,L=134,B=184;
const caps=[["1 · worker A takes job 512 and gets a 60-second lease on it",INK],["2 · while it works, it renews the lease every 20 seconds",BLUE],["3 · worker A crashes at 50 s; with no renewals, the lease runs out at 100 s",RED],["4 · job 512 is free again: worker B takes it and finishes at 190 s",BLUE]];
const base=<g>{[["Worker A",A],["Lease, job 512",L],["Worker B",B]].map(([t,y])=><text key={t} x="10" y={y+4} className="fb">{t}</text>)}<line x1={x(0)} y1="214" x2={x(200)} y2="214" stroke={GREY}/>{[0,50,100,150,200].map(s=><text key={s} x={x(s)} y="230" textAnchor="middle" className="fl">{s} s</text>)}
<rect x={x(0)} y={A-10} width={x(50)-x(0)} height="20" fill={FB} stroke={BLUE}/><text x={(x(0)+x(50))/2} y={A+4} textAnchor="middle" className="fl">working</text></g>;
const lease=(to,c=GREY,fill=GRID)=><rect x={x(0)} y={L-8} width={x(to)-x(0)} height="16" fill={fill} stroke={c}/>;
const s1=<g>{lease(60)}<text x={x(60)+6} y={L+4} className="fl">until 60 s</text></g>;
const s2=<g>{lease(100,BLUE,LB)}{[20,40].map(s=><g key={s}><line x1={x(s)} y1={A+10} x2={x(s)} y2={L-8} stroke={BLUE} strokeDasharray="2 2"/><text x={x(s)} y={A-16} textAnchor="middle" className="fl" style={{fill:BLUE}}>renew</text></g>)}<text x={x(100)+6} y={L+4} className="fl" style={{fill:BLUE}}>until 100 s</text></g>;
const s3=<g><path d={`M${x(50)-6} ${A-6}l12 12m0-12l-12 12`} stroke={RED} strokeWidth="2"/><text x={x(50)+10} y={A+4} className="fl" style={{fill:RED}}>crash at 50 s</text><rect x={x(100)-1} y={L-12} width="3" height="24" fill={RED}/><rect x={x(100)+4} y={L-8} width="90" height="16" fill={BG}/><text x={x(100)+6} y={L+4} className="fl" style={{fill:RED}}>runs out: 100 s</text></g>;
const s4=<g><rect x={x(100)} y={B-10} width={x(190)-x(100)} height="20" fill={FB} stroke={BLUE}/><text x={(x(100)+x(190))/2} y={B+4} textAnchor="middle" className="fl">job 512, from the start</text><text x={x(190)+6} y={B+4} className="fl" style={{fill:BLUE}}>done</text></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`jlt${uid}`}><title id={`jlt${uid}`}>A job lease over 200 seconds. Worker A takes job 512 with a 60-second lease and renews it at 20 and 40 seconds, so the lease runs until 100 seconds. Worker A crashes at 50 seconds and stops renewing, so the lease runs out at 100 seconds. Job 512 becomes free again, and worker B takes it, runs it from the start and finishes at 190 seconds.</title>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={0} t1={.25} dur={D}>{s1}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Long-running jobs, FIG 2: retries, then a dead-letter queue. A payout fails at 0 s, 32 s and 155 s (waits of
// about 30 s and 2 min, with jitter), then moves to a dead-letter queue with an alert; other jobs keep flowing.
function JobRetryFig({still,uid=""}){const M=`jr${uid}`,D=pace(14),x=s=>120+s*2.5,T=[0,32,155];
const caps=[["1 · paying restaurant 77 fails: the bank's API doesn't answer in time",RED],["2 · it is tried again after about 30 seconds, then after about 2 minutes",INK],["3 · the third failure moves it to a dead-letter queue and alerts a person",RED],["4 · the other jobs never waited: the queue kept moving the whole time",BLUE]];
const att=i=><g key={i}><rect x={x(T[i])} y="80" width="10" height="24" fill={LR} stroke={RED}/><text x={x(T[i])+5} y="72" textAnchor="middle" className="fl" style={{fill:RED}}>try {i+1}</text><text x={x(T[i])+5} y="120" textAnchor="middle" className="fl">{T[i]} s</text></g>;
const base=<g><text x="10" y="96" className="fb">Payout 77</text><text x="10" y="236" className="fb">Other jobs</text>{[...Array(62).keys()].map(i=><rect key={i} x={120+i*8} y="226" width="4" height="12" fill={FB} stroke={BLUE} strokeWidth=".5"/>)}{att(0)}</g>;
const s2=<g>{att(1)}{att(2)}<text x={(x(0)+x(32))/2+5} y="140" textAnchor="middle" className="fl">wait ~30 s</text><text x={(x(32)+x(155))/2+5} y="140" textAnchor="middle" className="fl">wait ~2 min</text></g>;
const s3=<g><Ar x1={x(155)+5} y1={126} x2={x(155)+5} y2={156} m={M}/><Bx x={440} y={158} w={180} h={40} t="Dead-letter queue" s="payout 77 · alert sent" c={RED} fill={LR}/></g>;
const s4=<text x="120" y="216" className="fl" style={{fill:BLUE}}>never waited</text>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`jrt${uid}`}><title id={`jrt${uid}`}>Retrying a failing job. A payout to restaurant 77 fails because the bank's API doesn't answer in time. It is tried again after about 30 seconds, at 32 seconds, and again after about 2 minutes, at 155 seconds, and fails both times. After the third failure it moves to a dead-letter queue and a person is alerted. Meanwhile other jobs kept flowing through the queue the whole time.</title><Mk m={M}/>
{base}{still?<g>{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

export const FIGS={
"live-fanout":{C:LiveFanoutFig,ar:640/280,title:()=>"ONE EVENT, THE RIGHT PHONE"},
"live-resume":{C:LiveResumeFig,ar:640/300,title:()=>"PICKING UP WHERE IT LEFT OFF"},
"race-oversell":{C:RaceFig,ar:640/300,title:()=>"TWO BUYERS, ONE PLATE LEFT"},
"seat-hold":{C:SeatHoldFig,ar:640/250,title:()=>"HOLD, PAY, OR LET GO"},
"order-states":{C:OrderStatesFig,ar:640/250,title:()=>"AN ORDER AS A STATE MACHINE"},
"workflow-resume":{C:WorkflowResumeFig,ar:640/256,title:()=>"A CRASH HALFWAY THROUGH"},
"read-layers":{C:ReadLayersFig,ar:640/264,title:()=>"WHERE 1 LAKH READS A SECOND END UP"},
"hot-key-merge":{C:HotKeyFig,ar:640/280,title:()=>"ONE KEY EVERYONE WANTS"},
"write-buffer":{C:WriteBufferFig,ar:640/256,title:()=>"A SPIKE, ABSORBED BY A QUEUE"},
"split-counter":{C:SplitCounterFig,ar:640/264,title:()=>"ONE HOT COUNTER, SPLIT TEN WAYS"},
"multipart":{C:MultipartFig,ar:640/250,title:()=>"A BIG VIDEO, SIXTEEN PARTS"},
"file-states":{C:FileStatesFig,ar:640/230,title:()=>"AN UPLOAD'S LIFE IN THE DATABASE"},
"job-lease":{C:JobLeaseFig,ar:640/240,title:()=>"A WORKER DIES MID-JOB"},
"job-retries":{C:JobRetryFig,ar:640/250,title:()=>"TRY, WAIT, TRY AGAIN, THEN SET ASIDE"},
};
