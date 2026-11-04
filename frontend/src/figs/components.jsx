// Figures for the Components articles. Same conventions as the API article's figures (parts.jsx):
// 640-wide viewBox, Swiss colours, SMIL packets on a loop, nothing animated when `still`, and a
// `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Mark}from"./parts.jsx";

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

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const COMPONENT_FIGS={
"lb-spread":{C:LbSpreadFig,ar:640/300,title:n=>`ONE ADDRESS, MANY SERVERS AT ${n}`},
"lb-algos":{C:LbAlgosFig,ar:640/330,title:()=>"THREE WAYS TO PICK A SERVER"},
};
