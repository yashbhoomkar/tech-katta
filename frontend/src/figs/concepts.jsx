// Figures for the Concepts articles (the APIs article's own figures are in dashboard.jsx). Same
// conventions as components.jsx: 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated
// when `still`, and a `uid` so the full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
const SBox=({x,y,w=110,t,blue,down})=><g><rect x={x} y={y-12} width={w} height="24" fill={down?"#fff5f4":blue?"#f8faff":"#fff"} stroke={down?RED:blue?BLUE:GREY} strokeDasharray={down?"4 3":undefined}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

// Replication, FIG: one payment write, two ways. Synchronous: the leader waits for the follower in
// the other zone before saying OK, so the answer takes a few milliseconds longer and a crash loses
// nothing. Asynchronous: OK at once; the follower gets the write a moment later, and a crash in that
// moment loses it.
function ReplSyncFig({still,uid=""}){const M=`rs${uid}`,D="10s";
const row=(y,label,sub,sync)=><g><text x="0" y={y-40} className="fb">{label}</text><text x="0" y={y-24} className="fl">{sub}</text>
<SBox x={0} y={y} w={90} t="Payments"/><SBox x={200} y={y} w={120} t="Leader · zone A" blue/><SBox x={470} y={y} w={150} t="Follower · zone B"/>
<Line x1={92} y1={y-4} x2={196} y2={y-4} m={M}/><Line x1={196} y1={y+6} x2={94} y2={y+6} m={M} dash/>
<Line x1={322} y1={y-4} x2={466} y2={y-4} m={M} c={sync?INK:GREY}/>{sync&&<Line x1={466} y1={y+6} x2={324} y2={y+6} m={M} dash/>}
<text x="144" y={y-10} textAnchor="middle" className="fl">write</text><text x="144" y={y+22} textAnchor="middle" className="fl">OK</text>
<text x="394" y={y-10} textAnchor="middle" className="fl">{sync?"copy, then wait":"copy later"}</text>{sync&&<text x="394" y={y+22} textAnchor="middle" className="fl">got it</text>}</g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`rst${uid}`}><title id={`rst${uid}`}>Synchronous replication: the payments service writes to the leader, the leader copies the write to the follower in another zone and waits for its reply, then answers OK. The answer takes a few milliseconds longer, and if the leader crashes right after, the follower already has the payment. Asynchronous replication: the leader answers OK at once and sends the copy afterwards. The answer is faster, but if the leader crashes before the copy arrives, that payment is lost.</title><Mark m={M}/>
{row(90,"Synchronous","OK after the follower has it · +2 ms · nothing lost",true)}
<line x1="0" y1="150" x2="640" y2="150" stroke="#e6eaf0"/>
{row(230,"Asynchronous","OK at once · the follower is a moment behind",false)}
{still?<text x="394" y="258" textAnchor="middle" className="fl" style={{fill:RED}}>crash before the copy: payment lost</text>:<g aria-hidden="true">
<Dot x1={94} x2={194} y={86} t0={.02} t1={.1} dur={D}/><Dot x1={324} x2={464} y={86} t0={.12} t1={.24} dur={D}/><Glow x={470} y={78} w={150} h={24} t0={.24} t1={.3} dur={D}/><Dot x1={464} x2={326} y={96} t0={.3} t1={.4} dur={D}/><Dot x1={194} x2={96} y={96} t0={.42} t1={.5} dur={D}/>
<Show t0={.5} t1={.98} dur={D}><text x="144" y="134" textAnchor="middle" className="fl" style={{fill:BLUE}}>OK · safe in two zones</text></Show>
<Dot x1={94} x2={194} y={226} t0={.55} t1={.63} dur={D}/><Dot x1={194} x2={96} y={236} t0={.65} t1={.72} dur={D}/>
<Show t0={.72} t1={.98} dur={D}><text x="144" y="274" textAnchor="middle" className="fl" style={{fill:BLUE}}>OK · faster</text></Show>
<Show t0={.76} t1={.98} dur={D}><text x="394" y="258" textAnchor="middle" className="fl" style={{fill:RED}}>crash now: payment lost</text></Show>
<Dot x1={324} x2={464} y={226} t0={.86} t1={.97} dur={D}/></g>}</svg>}

// Replication, FIG: failover with asynchronous followers. The leader (term 1) dies while follower 1 is
// two writes behind. Follower 1 is promoted (term 2) and the two writes are gone. The old leader comes
// back still believing it leads; its writes carry term 1 and are refused, so there are never two leaders.
function ReplFailoverFig({still,uid=""}){const D="14s",LOG=(x,y,n,lost)=><g>{Array.from({length:n},(_,i)=><rect key={i} x={x+i*18} y={y} width="14" height="14" fill={lost&&i>=n-2?"#fff5f4":"#dfe6fb"} stroke={lost&&i>=n-2?RED:BLUE} strokeDasharray={lost&&i>=n-2?"3 2":undefined}/>)}</g>;
const caps=[["1 · leader (term 1) takes writes; followers copy them a moment later",INK],["2 · the leader's machine dies; follower 1 is two writes behind",RED],["3 · follower 1 becomes leader, term 2; those two writes are lost",RED],["4 · the old leader returns, still says term 1; its writes are refused",BLUE]];
return <svg viewBox="0 0 640 290" role="img" aria-labelledby={`rft${uid}`}><title id={`rft${uid}`}>The leader, in term 1, accepts writes and two followers copy them asynchronously. The leader's machine fails while follower 1 is two writes behind. Follower 1 is promoted to leader for term 2, and the two writes only the old leader had are lost. When the old leader comes back it still believes it is the leader of term 1, but the database and its clients only accept term 2, so its writes are refused and there are never two leaders at once.</title>
<text x="60" y="88" className="fb">Leader · zone A</text>{LOG(60,98,8,still)}
<text x="250" y="88" className="fb">Follower 1 · zone B</text>{LOG(250,98,6)}
<text x="440" y="88" className="fb">Follower 2 · zone C</text>{LOG(440,98,5)}
<text x="60" y="140" className="fl">8 writes · term 1</text><text x="250" y="140" className="fl">6 writes</text><text x="440" y="140" className="fl">5 writes</text>
{still?<g><rect x="54" y="72" width="160" height="80" fill="none" stroke={RED} strokeDasharray="4 3"/><text x="60" y="176" className="fl" style={{fill:RED}}>failed</text><text x="60" y="192" className="fl" style={{fill:RED}}>writes 7, 8 never copied</text><rect x="244" y="72" width="160" height="80" fill="none" stroke={BLUE} strokeWidth="2"/><text x="250" y="176" className="fl" style={{fill:BLUE}}>new leader · term 2</text>
<text x="10" y="30" className="fb" style={{fill:RED}}>{caps[2][0]}</text></g>:<g aria-hidden="true">
{caps.map(([t,c],i)=><Show key={i} t0={i/4} t1={(i+1)/4} dur={D}><text x="10" y="30" className="fb" style={{fill:c}}>{t}</text></Show>)}
<Dot x1={60} x2={250} y={60} t0={.04} t1={.16} dur={D}/><Dot x1={60} x2={440} y={60} t0={.08} t1={.22} dur={D}/>
<Show t0={.25} t1={.75} dur={D}><rect x="54" y="72" width="160" height="80" fill="#fff5f4" opacity=".6" stroke={RED} strokeDasharray="4 3"/><text x="60" y="176" className="fl" style={{fill:RED}}>failed</text><text x="60" y="192" className="fl" style={{fill:RED}}>writes 7, 8 never copied</text></Show><Show t0={.25} t1={1} dur={D}>{[6,7].map(i=><rect key={i} x={60+i*18} y="98" width="14" height="14" fill="#fff5f4" stroke={RED} strokeDasharray="3 2"/>)}</Show>
<Show t0={.5} t1={1} dur={D}><rect x="244" y="72" width="160" height="80" fill="none" stroke={BLUE} strokeWidth="2"/><text x="250" y="176" className="fl" style={{fill:BLUE}}>new leader · term 2</text><Dot x1={260} x2={440} y={160} t0={.55} t1={.68} dur={D}/></Show>
<Show t0={.75} t1={1} dur={D}><text x="60" y="176" className="fl">back · "I'm leader, term 1"</text><text x="60" y="230" className="fb" style={{fill:BLUE}}>write with term 1 → refused: the current term is 2</text><text x="60" y="250" className="fl">the old leader drops its two extra writes and follows the new leader</text></Show></g>}</svg>}

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const CONCEPT_FIGS={
"repl-sync":{C:ReplSyncFig,ar:640/300,title:()=>"ONE PAYMENT, COPIED TWO WAYS"},
"repl-failover":{C:ReplFailoverFig,ar:640/290,title:()=>"WHEN THE LEADER DIES"},
};
