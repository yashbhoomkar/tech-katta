// Figures for the Components articles. Same conventions as the API article's figures (parts.jsx):
// 640-wide viewBox, Swiss colours, SMIL packets on a loop, nothing animated when `still`, and a
// `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark}from"./parts.jsx";

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

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const COMPONENT_FIGS={
"lb-spread":{C:LbSpreadFig,ar:640/300,title:n=>`ONE ADDRESS, MANY SERVERS AT ${n}`},
"lb-algos":{C:LbAlgosFig,ar:640/330,title:()=>"THREE WAYS TO PICK A SERVER"},
"cdn-edge":{C:CdnEdgeFig,ar:640/320,title:n=>`${n}'S PHOTOS, SERVED FROM NEARBY`},
"cdn-ttl":{C:CdnTtlFig,ar:640/260,title:()=>"ONE MENU AT ONE EDGE, 7 TO 8:40 PM"},
};
