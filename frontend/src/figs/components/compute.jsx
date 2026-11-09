// Components › Compute: the figures this sub-tab's articles draw (site.json dashboard.groups.components, "compute").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Box,Glow,Show,Mark,Line,SBox,INK,GREY,RED}from"../parts.jsx";

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

export const FIGS={
"scale-out":{C:ScaleFig,ar:640/280,title:()=>"SCALE UP OR SCALE OUT"},
"autoscale":{C:AutoFig,ar:640/280,title:n=>`AUTOSCALING THROUGH ${n}'S FLASH SALE`},
};
