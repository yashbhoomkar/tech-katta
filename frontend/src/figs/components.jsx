// Figures for the Components articles. Same conventions as the API article's figures (parts.jsx):
// 640-wide viewBox, Swiss colours, SMIL packets on a loop, nothing animated when `still`, and a
// `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Arr,Glow,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d";
// A straight arrow between any two points (Arr in parts.jsx is horizontal only).
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
// A small box (24 high) centred vertically on y.
const SBox=({x,y,w=110,t,blue,down})=><g><rect x={x} y={y-12} width={w} height="24" fill={down?"#fff5f4":blue?"#f8faff":"#fff"} stroke={down?RED:blue?"#2855d9":GREY} strokeDasharray={down?"4 3":undefined}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

// Load balancer, FIG: one address in front of four Order API servers; server 3 fails its health
// check and gets no traffic; requests go to 1, 2, 4, 1 in turn.
function LbSpreadFig({still,uid=""}){const M=`lbs${uid}`,D="8s",S=[45,115,185,255],A=[90,150,210];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`lbst${uid}`}><title id={`lbst${uid}`}>Customer apps send every request to one address, the load balancer. It passes each request to one of four Order API servers. Server 3 failed its health check, so the load balancer sends it nothing until it recovers.</title><Mark m={M}/>
{A.map(y=><Line key={y} x1={96} y1={y} x2={198} y2={150} m={M}/>)}
{S.map((y,i)=><Line key={y} x1={324} y1={150} x2={468} y2={y} m={i===2?undefined:M} dash={i===2} c={i===2?GREY:INK}/>)}
{A.map((y,i)=><Box key={y} x={0} y={y} w={96} t={`App ${i+1}`}/>)}
<Box x={200} y={150} t="Load balancer" blue/><text x="262" y="122" textAnchor="middle" className="fl">api.zotato.in</text><text x="262" y="186" textAnchor="middle" className="fl">checks /health every 10 s</text>
{S.map((y,i)=><g key={y}>{i===2?<g><rect x={470} y={y-17} width="150" height="34" fill="#fff5f4" stroke={RED} strokeDasharray="4 3"/><text x={545} y={y+4} textAnchor="middle" className="fb">Order API 3 ✕</text><text x={545} y={y+30} textAnchor="middle" className="fl" style={{fill:RED}}>failed check · no traffic</text></g>:<Box x={470} y={y} w={150} t={`Order API ${i+1}`}/>}</g>)}
{!still&&<g aria-hidden="true">
<Dot x1={98} x2={194} y={90} y2={146} t0={.02} t1={.1} dur={D}/><Dot x1={328} x2={464} y={150} y2={46} t0={.1} t1={.2} dur={D}/>
<Dot x1={98} x2={194} y={150} t0={.24} t1={.32} dur={D}/><Dot x1={328} x2={464} y={150} y2={115} t0={.32} t1={.42} dur={D}/>
<Dot x1={98} x2={194} y={210} y2={154} t0={.46} t1={.54} dur={D}/><Dot x1={328} x2={464} y={150} y2={254} t0={.54} t1={.64} dur={D}/>
<Dot x1={98} x2={194} y={90} y2={146} t0={.7} t1={.78} dur={D}/><Dot x1={328} x2={464} y={150} y2={46} t0={.78} t1={.88} dur={D}/>
<Glow x={470} y={168} w={150} h={34} t0={.88} t1={.98} dur={D}/></g>}</svg>}

// Load balancer, FIG: three ways to pick a server, one row each.
const ALGOS=[["ROUND ROBIN","Each server in turn.","Fine when requests cost the same."],["LEAST CONNECTIONS","The server with the fewest","requests still open."],["HASH ON A KEY","The same key always goes","to the same server."]];
function LbAlgosFig({still,uid=""}){const M=`lba${uid}`,D="9s",X=280,BX=420;
const rows=[{notes:["requests 1, 4","requests 2, 5","requests 3, 6"],to:[0,1,2,0,1,2]},{notes:["9 open","2 open","5 open"],to:[1,1,1],glow:1},{notes:["user 7 · user 12","user 31","user 42"],to:[2,2,2],glow:2,key:"user 42"}];
return <svg viewBox="0 0 640 330" role="img" aria-labelledby={`lbat${uid}`}><title id={`lbat${uid}`}>Three ways a load balancer picks a server. Round robin sends requests to each server in turn. Least connections sends the next request to the server with the fewest requests still open. Hashing on a key, such as the user ID, sends the same user to the same server every time.</title><Mark m={M}/>
{ALGOS.map(([a,b,c],i)=><g key={a}>{i>0&&<line x1="0" x2="640" y1={i*110} y2={i*110} stroke="#d9dee7"/>}<text x="0" y={i*110+40} className="fk">{a}</text><text x="0" y={i*110+58} className="fsub">{b}</text><text x="0" y={i*110+74} className="fsub">{c}</text></g>)}
{rows.map((r,i)=>{const yc=i*110+55,ys=[yc-32,yc,yc+32];return <g key={i}>
<circle cx={X} cy={yc} r="16" fill="#f8faff" stroke="#2855d9"/><text x={X} y={yc+4} textAnchor="middle" className="fb">LB</text>{r.key&&<text x={X} y={yc-24} textAnchor="middle" className="fl">{r.key}</text>}
{ys.map((y,j)=><g key={j}><Line x1={X+16} y1={yc} x2={BX-2} y2={y} m={M} c={GREY}/><SBox x={BX} y={y} w={96} t={`Server ${"ABC"[j]}`}/><text x={BX+106} y={y+4} className="fl">{r.notes[j]}</text></g>)}
{!still&&<g aria-hidden="true">{r.to.map((j,k)=>{const n=r.to.length,t0=.04+k*(.9/n),t1=t0+.9/n*.8;return <Dot key={k} x1={X+18} x2={BX-4} y={yc} y2={ys[j]} t0={+t0.toFixed(3)} t1={+t1.toFixed(3)} dur={D}/>})}{r.glow!==undefined&&<Glow x={BX} y={ys[r.glow]-12} w={96} h={24} t0={.04} t1={.94} dur={D}/>}</g>}</g>})}</svg>}

// CDN, FIG: three cities. Pune's edge has the image (hit); Delhi's misses and fetches it through the
// origin shield from the origin once; Chennai's edge misses but the shield now has it.
function CdnEdgeFig({still,uid=""}){const M=`cde${uid}`,D="10s",Y=[60,160,260],EX=150,EW=130,SX=350,SW=120,OX=510;
const notes=["hit · answered here","miss · fetched once","miss · the shield has it"];
return <svg viewBox="0 0 640 320" role="img" aria-labelledby={`cdet${uid}`}><title id={`cdet${uid}`}>Users in Pune, Delhi and Chennai each reach the CDN edge in their own city. Pune's edge already has the restaurant photo and answers in about 10 milliseconds. Delhi's edge does not, so it asks the origin shield, which fetches it from Zotato's origin once and keeps a copy. When Chennai's edge misses, the shield already has it, so the origin is not asked again.</title><Mark m={M}/>
{Y.map(y=><Line key={y} x1={96} y1={y} x2={EX-2} y2={y} m={M}/>)}
{Y.map(y=><Line key={y} x1={EX+EW} y1={y} x2={SX-2} y2={160} m={M} c={GREY}/>)}
<Line x1={SX+SW} y1={160} x2={OX-2} y2={160} m={M}/>
{["Pune","Delhi","Chennai"].map((c,i)=><g key={c}><Box x={0} y={Y[i]} w={96} t={`User · ${c}`}/><Box x={EX} y={Y[i]} w={EW} t={`Edge · ${c}`} blue/><text x={EX+EW/2} y={Y[i]+31} textAnchor="middle" className="fl">{notes[i]}</text></g>)}
<Box x={SX} y={160} w={SW} t="Origin shield"/><text x={SX+SW/2} y={191} textAnchor="middle" className="fl">one cache tier</text>
<Box x={OX} y={160} w={130} t="Zotato origin"/><text x={OX+65} y={191} textAnchor="middle" className="fl">servers + storage</text>
{!still&&<g aria-hidden="true">
<Dot x1={98} x2={EX-6} y={60} t0={.02} t1={.08} dur={D}/><Glow x={EX} y={43} w={EW} h={34} t0={.08} t1={.13} dur={D}/><Dot x1={EX-6} x2={98} y={60} t0={.13} t1={.19} dur={D}/>
<Dot x1={98} x2={EX-6} y={160} t0={.25} t1={.31} dur={D}/><Dot x1={EX+EW+2} x2={SX-6} y={160} t0={.31} t1={.36} dur={D}/><Dot x1={SX+SW+2} x2={OX-6} y={160} t0={.36} t1={.42} dur={D}/>
<Glow x={OX} y={143} w={130} h={34} t0={.42} t1={.47} dur={D}/><Dot x1={OX-6} x2={SX+SW+2} y={160} t0={.47} t1={.53} dur={D}/><Dot x1={SX-6} x2={EX+EW+2} y={160} t0={.53} t1={.58} dur={D}/><Dot x1={EX-6} x2={98} y={160} t0={.58} t1={.64} dur={D}/>
<Dot x1={98} x2={EX-6} y={260} t0={.7} t1={.76} dur={D}/><Dot x1={EX+EW+2} x2={SX-6} y={260} y2={164} t0={.76} t1={.81} dur={D}/><Glow x={SX} y={143} w={SW} h={34} t0={.81} t1={.86} dur={D}/><Dot x1={SX-6} x2={EX+EW+2} y={164} y2={260} t0={.86} t1={.91} dur={D}/><Dot x1={EX-6} x2={98} y={260} t0={.91} t1={.97} dur={D}/></g>}</svg>}

// CDN, FIG: one menu at one edge over 100 minutes. First request misses, then hits while the copy is
// fresh (max-age=3600); at 8:00 one request revalidates (304); the menu changes at 8:20 and is purged,
// so the next request fetches the new menu.
const REQS=[[0,"miss"],[6,"hit"],[15,"hit"],[27,"hit"],[38,"hit"],[50,"hit"],[60,"check"],[66,"hit"],[74,"hit"],[82,"miss"],[90,"hit"],[97,"hit"]];
function CdnTtlFig({still,uid=""}){const D="12s",x=m=>130+4.9*m,ER=70,OR=206;
const mark=([m,k])=>k==="hit"?<circle cx={x(m)} cy={ER} r="6" fill="#2855d9"/>:<circle cx={x(m)} cy={ER} r="6" fill="#fff" stroke={k==="miss"?RED:INK} strokeWidth="1.5"/>;
const origin=[[0,"200 · full menu"],[60,"304 · unchanged"],[82,"200 · new menu"]];
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`cdtt${uid}`}><title id={`cdtt${uid}`}>One restaurant menu at one CDN edge from 7 pm to 8:40 pm. The first request misses and the edge fetches the menu from the origin. It stays fresh for an hour, so every request until 8 pm is a hit. At 8 pm one request checks with the origin, which answers not changed. At 8:20 the restaurant changes its menu and the old copy is purged, so the next request fetches the new menu.</title>
<text x="0" y="24" className="fl">filled = answered by the edge · open = asked the origin</text>
<text x="0" y={ER+4} className="fk">EDGE</text><text x="0" y={OR+4} className="fk">ORIGIN</text>
<rect x={x(0)} y="88" width={x(60)-x(0)} height="8" fill="#e7edff"/><rect x={x(60)+2} y="88" width={x(80)-x(60)-2} height="8" fill="#e7edff"/><rect x={x(82)} y="88" width={x(100)-x(82)} height="8" fill="#e7edff"/>
<text x={(x(0)+x(60))/2} y="110" textAnchor="middle" className="fl">fresh for an hour (max-age=3600)</text><text x={(x(60)+x(80))/2} y="110" textAnchor="middle" className="fl">fresh</text>
<line x1={x(0)} x2={x(100)} y1="134" y2="134" stroke={GREY}/>{[[0,"7:00 pm"],[60,"8:00"],[80,"8:20"],[100,"8:40"]].map(([m,t])=><g key={m}><line x1={x(m)} x2={x(m)} y1="130" y2="138" stroke={GREY}/><text x={x(m)} y="152" textAnchor={m===100?"end":"middle"} className="fl">{t}</text></g>)}
<line x1={x(80)} x2={x(80)} y1="44" y2="126" stroke={RED} strokeDasharray="4 3"/><text x={x(80)} y="40" textAnchor="middle" className="fl" style={{fill:RED}}>menu changed: purge</text>
{origin.map(([m,t])=><g key={m}><line x1={x(m)} x2={x(m)} y1={ER+8} y2={OR-14} stroke={GREY} strokeDasharray="2 3"/><SBox x={x(m)-52} y={OR} w={104} t={t}/></g>)}
{REQS.map((r,i)=>still?<g key={i}>{mark(r)}</g>:<Show key={i} t0={+(r[0]/100*.9+.02).toFixed(3)} t1={.98} dur={D}>{mark(r)}</Show>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(100)} y={134} t0={.02} t1={.92} dur={D}/></g>}</svg>}

// API gateway, FIG: one front door. The customer app's request passes the four checks and is routed
// to Orders; a restaurant's billing system goes over its limit and gets 429 back.
const GW_STEPS=["1  HTTPS ends here","2  Who is calling?","3  Within their limit?","4  Route by path"];
function GwFrontFig({still,uid=""}){const M=`gwf${uid}`,D="10s",GX=200,GW=210,SX=490,SY=[70,150,230],RY=[88,132,176,220];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`gwft${uid}`}><title id={`gwft${uid}`}>Every request to Zotato goes through one API gateway. It ends HTTPS, checks who is calling, checks that they are within their rate limit, and routes by path to the Orders, Menus or Payments service. A customer's order passes all four checks and reaches Orders. A restaurant's billing system that has sent too many requests gets 429 Too Many Requests and never reaches a service.</title><Mark m={M}/>
<Line x1={130} y1={90} x2={GX-2} y2={90} m={M}/><Line x1={130} y1={210} x2={GX-2} y2={210} m={M}/>
{SY.map(y=><Line key={y} x1={GX+GW} y1={220} x2={SX-2} y2={y} m={M} c={GREY}/>)}
<Box x={0} y={90} w={130} t="Customer app"/><Box x={0} y={210} w={130} t="Restaurant billing"/><text x="65" y="241" textAnchor="middle" className="fl">partner, API key</text>
<rect x={GX} y="44" width={GW} height="200" fill="#f8faff" stroke="#2855d9"/><text x={GX+GW/2} y="64" textAnchor="middle" className="fk">API GATEWAY</text>
{GW_STEPS.map((t,i)=><g key={t}><rect x={GX+10} y={RY[i]-14} width={GW-20} height="28" fill="#fff" stroke="#d9dee7"/><text x={GX+20} y={RY[i]+4} className="fq">{t}</text></g>)}
{[["Orders","/orders"],["Menus","/menus"],["Payments","/payments"]].map(([n,p],i)=><g key={n}><Box x={SX} y={SY[i]} w={150} t={n}/><text x={SX+75} y={SY[i]+31} textAnchor="middle" className="fl">{p}</text></g>)}
{!still&&<g aria-hidden="true">
<Dot x1={132} x2={GX-4} y={90} t0={.02} t1={.08} dur={D}/>{RY.map((y,i)=><Glow key={i} x={GX+10} y={y-14} w={GW-20} h={28} t0={+(.08+i*.06).toFixed(2)} t1={+(.14+i*.06).toFixed(2)} dur={D}/>)}<Dot x1={GX+GW+2} x2={SX-4} y={220} y2={72} t0={.32} t1={.4} dur={D}/><Glow x={SX} y={53} w={150} h={34} t0={.4} t1={.46} dur={D}/>
<Dot x1={132} x2={GX-4} y={210} t0={.52} t1={.58} dur={D}/><Glow x={GX+10} y={RY[0]-14} w={GW-20} h={28} t0={.58} t1={.64} dur={D}/><Glow x={GX+10} y={RY[1]-14} w={GW-20} h={28} t0={.64} t1={.7} dur={D}/>
<Show t0={.7} t1={.92} dur={D}><rect x={GX+10} y={RY[2]-14} width={GW-20} height="28" fill="#fff5f4" stroke={RED}/><text x={GX+20} y={RY[2]+4} className="fq">3  Over the limit: stop</text></Show>
<Dot x1={GX-4} x2={132} y={222} t0={.74} t1={.82} dur={D}/><Show t0={.76} t1={.94} dur={D}><text x="165" y="200" textAnchor="middle" className="fl" style={{fill:RED}}>429</text></Show></g>}</svg>}

// Rate limiting, FIG: the same requests through three limiters, each allowing 5 requests a second.
// Decisions are computed, not drawn: a burst just before and just after 1 s shows the fixed window
// letting 10 through in about 0.65 s, the sliding window holding to 5 in any second, the token
// bucket letting most of the bursts through (it starts full) and then about one request every 0.2 s.
const RT=[.62,.68,.74,.8,.86,.92,1.02,1.08,1.14,1.2,1.26,1.6,1.85,2.1,2.35,2.6,2.85];
const fixedW=()=>{const n={};return RT.map(t=>{const w=Math.floor(t);n[w]=(n[w]||0)+1;return n[w]<=5})};
const slideW=()=>{const ok=[];return RT.map(t=>{const c=ok.filter(x=>x>t-1).length;if(c<5){ok.push(t);return true}return false})};
const bucket=()=>{let tok=5,last=0;return RT.map(t=>{tok=Math.min(5,tok+(t-last)*5);last=t;if(tok>=1){tok-=1;return true}return false})};
const LIMITERS=[["FIXED WINDOW","5 per clock second",fixedW()],["SLIDING WINDOW","5 in any 1 second",slideW()],["TOKEN BUCKET","holds 5, refills 5 a second",bucket()]];
function RateFig({still,uid=""}){const D="10s",x=t=>150+t*135,RY0=56;
const dot=(t,ok,y)=>ok?<circle cx={x(t)} cy={y} r="4" fill="#2855d9"/>:<circle cx={x(t)} cy={y} r="3.5" fill="#fff" stroke={RED} strokeWidth="1.5"/>;
const at=t=>+(t/3*.85+.03).toFixed(3);
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rlt${uid}`}><title id={`rlt${uid}`}>The same 17 requests, a burst just before one second, a burst just after it, then one every quarter second, go through three rate limiters that each allow 5 requests a second. The fixed window lets 10 requests through within about two thirds of a second because the count resets at one second. The sliding window never lets more than 5 through in any second. The token bucket starts full and keeps refilling, so it lets most of the bursts through and then about one request every fifth of a second.</title>
<text x="0" y="22" className="fl">filled = let through · open = rejected with 429</text>
<text x="0" y={RY0+4} className="fk">REQUESTS</text>{RT.map((t,i)=>still?<circle key={i} cx={x(t)} cy={RY0} r="4" fill={GREY}/>:<Show key={i} t0={at(t)} t1={.98} dur={D}><circle cx={x(t)} cy={RY0} r="4" fill={GREY}/></Show>)}
{LIMITERS.map(([n,sub,ok],r)=>{const y=RY0+58*(r+1);return <g key={n}><line x1="0" x2="640" y1={y-29} y2={y-29} stroke="#d9dee7"/><text x="0" y={y} className="fk">{n}</text><text x="0" y={y+15} className="fsub">{sub}</text>
{r===0&&[1,2].map(w=><line key={w} x1={x(w)} x2={x(w)} y1={y-20} y2={y+12} stroke={GREY} strokeDasharray="2 3"/>)}
{RT.map((t,i)=>still?<g key={i}>{dot(t,ok[i],y)}</g>:<Show key={i} t0={at(t)} t1={.98} dur={D}>{dot(t,ok[i],y)}</Show>)}
<text x="640" y={y+4} textAnchor="end" className="fl">{ok.filter(Boolean).length} of {RT.length}</text></g>})}
<line x1={x(0)} x2={x(3)} y1="268" y2="268" stroke={GREY}/>{[0,1,2,3].map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="264" y2="272" stroke={GREY}/><text x={x(t)} y="288" textAnchor="middle" className="fl">{t} s</text></g>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(3)} y={268} t0={.03} t1={.88} dur={D}/></g>}</svg>}

// App servers, FIG: scale up (one bigger machine) or scale out (more machines behind a load balancer).
function ScaleFig({still,uid=""}){const M=`scl${uid}`,D="9s";const outs=[[70,1],[120,2],[170,3],[220,4]];
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`sclt${uid}`}><title id={`sclt${uid}`}>Two ways to handle more traffic. Scale up: replace an m5.large that handles about 600 requests a second with a c5.2xlarge that handles about 2,500; one machine has a ceiling and is a single point of failure. Scale out: put a load balancer in front and add m5.large instances one at a time, 600 requests a second each, with no ceiling, as long as the servers keep no state of their own.</title><Mark m={M}/>
<text x="0" y="22" className="fk">SCALE UP</text><text x="0" y="38" className="fsub">A bigger machine</text>
<rect x="20" y="150" width="90" height="40" fill="#fff" stroke={GREY}/><text x="65" y="168" textAnchor="middle" className="fb">m5.large</text><text x="65" y="182" textAnchor="middle" className="fl">600 req/s</text>
<Line x1={116} y1={150} x2={150} y2={150} m={M}/>
<rect x="156" y="80" width="130" height="150" fill="#f8faff" stroke="#2855d9"/><text x="221" y="150" textAnchor="middle" className="fb">c5.2xlarge</text><text x="221" y="166" textAnchor="middle" className="fl">2,500 req/s</text>
<text x="0" y="262" className="fl">one machine: a ceiling, and one point of failure</text>
<line x1="320" x2="320" y1="10" y2="270" stroke="#d9dee7"/>
<text x="340" y="22" className="fk">SCALE OUT</text><text x="340" y="38" className="fsub">More of the same size, 600 req/s each</text>
<Box x={340} y={145} w={110} t="Load balancer" blue/>
{outs.map(([y,i])=>{const box=<g><Line x1={450} y1={145} x2={508} y2={y} m={M} c={GREY}/><SBox x={510} y={y} w={110} t={`m5.large ${i}`}/></g>;return still||i<3?<g key={i}>{box}</g>:<Show key={i} t0={i===3?.3:.6} t1={.98} dur={D}>{box}</Show>})}
<text x="340" y="262" className="fl">no ceiling, if servers keep no state</text>
{!still&&<g aria-hidden="true"><Glow x={156} y={80} w={130} h={150} t0={.1} t1={.25} dur={D}/></g>}</svg>}

// Autoscaling, FIG: the 8 pm flash sale with target tracking at 60% (600 req/s per m5.large).
// Demand jumps from 1,600 to 8,000 req/s for 15 minutes. The group wants 23 instances at once but
// they arrive 4 minutes later; requests above capacity fail meanwhile. After the sale the group
// waits 15 minutes of low load before removing instances, paying for idle ones.
function AutoFig({still,uid=""}){const D="10s",x=t=>70+t*11,y=r=>230-r*.0125;
const demand=[[0,1600],[15,1600],[15,8000],[30,8000],[30,1600],[50,1600]],cap=[[0,3000],[19,3000],[19,13800],[45,13800],[45,3000],[50,3000]];
const path=pts=>pts.map(([t,r],i)=>`${i?"L":"M"}${x(t)} ${y(r)}`).join("");
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`autt${uid}`}><title id={`autt${uid}`}>The 8 pm flash sale with autoscaling. Before the sale, 1,600 requests a second run on 5 instances with room for 3,000. At 8:00 demand jumps to 8,000. The group asks for 23 instances, but they take 4 minutes to boot, so from 8:00 to 8:04 requests above 3,000 a second fail. From 8:04 capacity is 13,800. The sale ends at 8:15, but instances are only removed after 15 minutes of low load, at 8:30, so Zotato pays for idle instances in between.</title>
{[0,5000,10000].map(r=><g key={r}><line x1={x(0)} x2={x(50)} y1={y(r)} y2={y(r)} stroke="#eef1f5"/><text x={x(0)-8} y={y(r)+4} textAnchor="end" className="fl">{r.toLocaleString("en-IN")}</text></g>)}
<text x="0" y="40" className="fl">req/s</text>
<rect x={x(30)} y={y(13800)} width={x(45)-x(30)} height={y(1600)-y(13800)} fill="#f1f3f6"/><text x={(x(30)+x(45))/2} y={y(11000)} textAnchor="middle" className="fl">paying for idle</text><text x={(x(30)+x(45))/2} y={y(11000)+14} textAnchor="middle" className="fl">instances</text>
<rect x={x(15)} y={y(8000)} width={x(19)-x(15)} height={y(3000)-y(8000)} fill="#fde3e1" stroke={RED} strokeDasharray="3 3"/>
<text x={x(15)-6} y={y(8000)+16} textAnchor="end" className="fl" style={{fill:RED}}>booting: these</text><text x={x(15)-6} y={y(8000)+30} textAnchor="end" className="fl" style={{fill:RED}}>requests fail</text>
<path d={path(cap)} fill="none" stroke="#2855d9" strokeWidth="2"/><path d={path(demand)} fill="none" stroke={INK} strokeWidth="2"/>
<text x={x(46)} y={y(3000)-8} className="fl" style={{fill:"#2855d9"}}>capacity</text><text x={x(46)} y={y(1600)+16} className="fl">demand</text>
<text x={x(19)+6} y={y(13800)-8} className="fl" style={{fill:"#2855d9"}}>23 instances · 13,800 req/s</text><text x={x(1)} y={y(3000)-8} className="fl" style={{fill:"#2855d9"}}>5 instances · 3,000 req/s</text>
<line x1={x(0)} x2={x(50)} y1={y(0)} y2={y(0)} stroke={GREY}/>{[[0,"7:45 pm"],[15,"8:00"],[30,"8:15"],[45,"8:30"]].map(([t,l])=><g key={t}><line x1={x(t)} x2={x(t)} y1={y(0)-4} y2={y(0)+4} stroke={GREY}/><text x={x(t)} y={y(0)+20} textAnchor="middle" className="fl">{l}</text></g>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(50)} y={y(0)} t0={.03} t1={.93} dur={D}/><Glow x={x(15)} y={y(8000)} w={x(19)-x(15)} h={y(3000)-y(8000)} t0={.3} t1={.42} dur={D}/></g>}</svg>}

// Cache, FIG: cache-aside for one menu. Hit: Redis answers in about 1 ms. Miss: Redis has nothing,
// the Order API reads the database and stores the result with a TTL for the next request.
function CacheAsideFig({still,uid=""}){const M=`cas${uid}`,D="12s",AX=150,RX=468;
const lanes=[[60,"GET menu:r42",false,"→"],[84,"the menu (hit) · nothing (miss)",true,"←"],[108,"SET menu:r42 EX 300",false,"→"],[204,"SELECT … FROM menu_items",false,"→"],[228,"rows",true,"←"]];
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`cast${uid}`}><title id={`cast${uid}`}>Cache-aside for one restaurant menu. The Order API first asks Redis for menu:r42. On a hit, Redis returns the menu in about a millisecond and the database is never asked. On a miss, Redis returns nothing, the Order API reads the menu from the database in about 5 milliseconds, and stores it in Redis with a 5 minute expiry for the next request. When the restaurant changes its menu, the API updates the database and deletes the key.</title><Mark m={M}/>
<rect x="20" y="40" width={AX-20} height="210" fill="#fff" stroke={GREY}/><text x={(20+AX)/2} y="140" textAnchor="middle" className="fb">Order API</text><text x={(20+AX)/2} y="156" textAnchor="middle" className="fl">your code</text>
<rect x={RX} y="44" width="152" height="80" fill="#f8faff" stroke="#2855d9"/><text x={RX+76} y="80" textAnchor="middle" className="fb">Redis</text><text x={RX+76} y="96" textAnchor="middle" className="fl">about 1 ms</text>
<rect x={RX} y="188" width="152" height="56" fill="#fff" stroke={GREY}/><text x={RX+76} y="212" textAnchor="middle" className="fb">Database</text><text x={RX+76} y="228" textAnchor="middle" className="fl">about 5 ms</text>
{lanes.map(([y,t,back])=><Arr key={y} m={M} x1={back?RX-2:AX+2} x2={back?AX+4:RX-4} y={y} t={t} dash={back}/>)}
<text x="0" y="284" className="fl">On a menu change: UPDATE the database, then DEL menu:r42. The next read misses and loads the new menu.</text>
{!still&&<g aria-hidden="true">
<Dot x1={AX+4} x2={RX-8} y={60} t0={.02} t1={.1} dur={D}/><Glow x={RX} y={44} w={152} h={80} t0={.1} t1={.14} dur={D}/><Dot x1={RX-6} x2={AX+8} y={84} t0={.14} t1={.22} dur={D}/><Show t0={.14} t1={.3} dur={D}><text x={RX+76} y="138" textAnchor="middle" className="fl" style={{fill:"#2855d9"}}>HIT</text></Show>
<Dot x1={AX+4} x2={RX-8} y={60} t0={.36} t1={.44} dur={D}/><Show t0={.44} t1={.62} dur={D}><text x={RX+76} y="138" textAnchor="middle" className="fl" style={{fill:RED}}>MISS</text></Show><Dot x1={RX-6} x2={AX+8} y={84} t0={.46} t1={.52} dur={D}/>
<Dot x1={AX+4} x2={RX-8} y={204} t0={.54} t1={.62} dur={D}/><Glow x={RX} y={188} w={152} h={56} t0={.62} t1={.66} dur={D}/><Dot x1={RX-6} x2={AX+8} y={228} t0={.66} t1={.74} dur={D}/><Dot x1={AX+4} x2={RX-8} y={108} t0={.76} t1={.84} dur={D}/><Glow x={RX} y={44} w={152} h={80} t0={.84} t1={.9} dur={D}/></g>}</svg>}

// Cache, FIG: the "cache restarts at dinner" challenge. 12,000 queries a second, 90% hits, 10% writes:
// the database (db.m5.large, about 2,500 a second) normally sees about 2,300. The cache is down for
// 10 minutes (every query goes to the database), then comes back empty and warms up over 10 minutes.
function CacheWarmFig({still,uid=""}){const D="10s",x=t=>80+t*11.5,y=q=>232-q*.0145,CAP=2500,BASE=2280,ALL=12000;
const load=[[0,BASE],[15,BASE],[15,ALL],[25,ALL],[35,BASE],[45,BASE]],path=load.map(([t,q],i)=>`${i?"L":"M"}${x(t)} ${y(q)}`).join("");
const over=`M${x(15)} ${y(CAP)}L${x(15)} ${y(ALL)}L${x(25)} ${y(ALL)}L${x(25+10*(ALL-CAP)/(ALL-BASE))} ${y(CAP)}Z`;
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`cwt${uid}`}><title id={`cwt${uid}`}>Database queries a second during Zotato's dinner rush. With the cache working, the database sees about 2,300 a second, just under the 2,500 a db.m5.large handles. At 8:15 the cache crashes and every one of the 12,000 queries a second goes to the database for 10 minutes. When the cache returns at 8:25 it is empty, so the load falls back only as the cache warms up, reaching normal at 8:35. For about 20 minutes the database is asked for far more than it can handle.</title>
{[0,5000,10000].map(q=><g key={q}><line x1={x(0)} x2={x(45)} y1={y(q)} y2={y(q)} stroke="#eef1f5"/><text x={x(0)-8} y={y(q)+4} textAnchor="end" className="fl">{q.toLocaleString("en-IN")}</text></g>)}
<text x="0" y="30" className="fl">database queries/s</text>
<path d={over} fill="#fde3e1"/><line x1={x(0)} x2={x(45)} y1={y(CAP)} y2={y(CAP)} stroke={RED} strokeDasharray="4 3"/><text x={x(0)+4} y={y(CAP)-6} className="fl" style={{fill:RED}}>database limit · 2,500</text>
<path d={path} fill="none" stroke={INK} strokeWidth="2"/>
<text x={(x(15)+x(25))/2} y={y(ALL)-10} textAnchor="middle" className="fl">cache down</text><text x={(x(25)+x(35))/2+14} y={y(7600)} className="fl">back, empty:</text><text x={(x(25)+x(35))/2+14} y={y(7600)+14} className="fl">warming up</text>
<text x={x(1)} y={y(BASE)+18} className="fl">cache working: 90% hits</text>
<line x1={x(0)} x2={x(45)} y1={y(0)} y2={y(0)} stroke={GREY}/>{[[0,"8:00 pm"],[15,"8:15"],[25,"8:25"],[35,"8:35"],[45,"8:45"]].map(([t,l])=><g key={t}><line x1={x(t)} x2={x(t)} y1={y(0)-4} y2={y(0)+4} stroke={GREY}/><text x={x(t)} y={y(0)+20} textAnchor="middle" className="fl">{l}</text></g>)}
{!still&&<g aria-hidden="true"><Dot x1={x(0)} x2={x(45)} y={y(0)} t0={.03} t1={.93} dur={D}/></g>}</svg>}

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const COMPONENT_FIGS={
"lb-spread":{C:LbSpreadFig,ar:640/300,title:n=>`ONE ADDRESS, MANY SERVERS AT ${n}`},
"lb-algos":{C:LbAlgosFig,ar:640/330,title:()=>"THREE WAYS TO PICK A SERVER"},
"cdn-edge":{C:CdnEdgeFig,ar:640/320,title:n=>`${n}'S PHOTOS, SERVED FROM NEARBY`},
"cdn-ttl":{C:CdnTtlFig,ar:640/260,title:()=>"ONE MENU AT ONE EDGE, 7 TO 8:40 PM"},
"gw-front":{C:GwFrontFig,ar:640/300,title:n=>`ONE FRONT DOOR FOR ${n}`},
"rate-limit":{C:RateFig,ar:640/300,title:()=>"THREE RATE LIMITERS, 5 REQUESTS A SECOND"},
"scale-out":{C:ScaleFig,ar:640/280,title:()=>"SCALE UP OR SCALE OUT"},
"cache-aside":{C:CacheAsideFig,ar:640/300,title:()=>"ONE MENU READ: A HIT AND A MISS"},
"cache-warm":{C:CacheWarmFig,ar:640/290,title:n=>`WHEN ${n}'S CACHE RESTARTS AT DINNER`},
"autoscale":{C:AutoFig,ar:640/280,title:n=>`AUTOSCALING THROUGH ${n}'S FLASH SALE`},
};
