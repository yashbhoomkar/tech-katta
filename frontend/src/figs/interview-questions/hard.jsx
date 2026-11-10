// Interview Questions › Hard: the figures this sub-tab's articles draw (site.json dashboard.groups.interview-questions, "hard").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Glow,Mark,Line,SBox,T,Fig,Mk,INK,GREY,RED,BLUE,LR}from"../parts.jsx";

// IND vs PAK, FIG: the live pipeline. One stadium feed is encoded into six sizes and cut into 4-second segments;
// the packager writes segments and playlists to storage. Players fetch both through the CDN: 87.5 lakh requests a
// second at the peak, 99 in 100 answered at the edge, so the origin servers see 87,500.
function LivePipeFig({still,uid=""}){const M=`lp${uid}`,D="12s";
return <svg viewBox="0 0 640 236" role="img" aria-labelledby={`lpt${uid}`}><title id={`lpt${uid}`}>The live pipeline. The stadium feed goes to encoders, which make six sizes, and to a packager, which cuts each size into 4-second segments and writes them and the playlists to storage. 3.5 crore players fetch playlists and segments from CDN edges near them, 87.5 lakh requests a second at the peak. The edges answer 99 in 100; the rest, 87,500 a second, reach the origin servers, which read from storage.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="Stadium feed"/><SBox x={150} y={50} w={110} t="Encoders" blue/><SBox x={300} y={50} w={110} t="Packager"/><SBox x={450} y={50} w={150} t="Storage"/>
<Line x1={112} y1={50} x2={146} y2={50} m={M}/><Line x1={262} y1={50} x2={296} y2={50} m={M}/><Line x1={412} y1={50} x2={446} y2={50} m={M}/>
<T x={205} y={80} t="6 sizes, 240p to 1080p" a="middle"/><T x={430} y={32} t="every 4 s" a="middle"/><T x={525} y={80} t="segments + playlists" a="middle"/>
<Line x1={525} y1={92} x2={525} y2={154} m={M}/><T x={533} y={126} t="only on a miss"/>
<SBox x={450} y={170} w={150} t="Origin, 2 groups" blue/><SBox x={270} y={170} w={120} t="CDN edges"/><SBox x={50} y={170} w={150} t="3.5 crore players"/>
<Line x1={448} y1={170} x2={394} y2={170} m={M}/><Line x1={268} y1={170} x2={204} y2={170} m={M}/>
<T x={421} y={160} t="87,500/s" a="middle" c={BLUE}/><T x={236} y={160} t="87.5 lakh/s" a="middle"/><T x={330} y={200} t="99 in 100 answered here" a="middle"/>
<T x={320} y={226} t="each new segment: one fetch per edge, then every player there gets the edge's copy" a="middle"/>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={144} y={50} t0={.02} t1={.08} dur={D}/><Glow x={150} y={38} w={110} h={24} t0={.08} t1={.18} dur={D}/><Dot x1={264} x2={294} y={50} t0={.18} t1={.24} dur={D}/><Dot x1={414} x2={444} y={50} t0={.26} t1={.32} dur={D}/>
<Dot x1={525} x2={525} y={96} y2={152} t0={.36} t1={.44} dur={D}/><Dot x1={446} x2={396} y={170} t0={.46} t1={.54} dur={D}/><Glow x={270} y={158} w={120} h={24} t0={.54} t1={.7} dur={D}/>
<Dot x1={266} x2={206} y={166} t0={.6} t1={.68} dur={D}/><Dot x1={266} x2={206} y={174} t0={.66} t1={.74} dur={D}/><Dot x1={266} x2={206} y={170} t0={.72} t1={.8} dur={D}/></g>}</svg>}

// IND vs PAK, FIG: the toss. Origin servers needed (35 at the last over's peak, so the y axis runs to 40) from
// 6:45 to 7:45 pm. The crowd jumps at the toss; autoscaling starting from 3 adds servers only after the load has
// arrived and each takes 4 minutes to boot, so for about ten minutes players buffer. 40 servers started at 6 pm
// were ready all along. Values follow content/lab.json's "match" pattern × 35.
const tx=t=>60+t/60*560,vy=v=>196-v/40*140;
const pts=a=>a.map(([t,v])=>`${tx(t).toFixed(1)},${vy(v).toFixed(1)}`).join(" ");
const DEMAND=[[0,1],[15,3],[23,4],[25,5],[29,14],[45,15],[60,16]],AUTO=[[0,3],[33,3],[33,9],[37,9],[37,15],[41,15],[41,20],[60,20]];
// where players buffer: needed above running, from the rush (7:10) until the second batch arrives (7:22)
const GAP=`${tx(25.7)},${vy(4.85)} ${tx(29)},${vy(14)} ${tx(37)},${vy(14.5)} ${tx(37)},${vy(9)} ${tx(33)},${vy(9)} ${tx(33)},${vy(3)} ${tx(25.7)},${vy(3)}`;
function TossFig({still,uid=""}){const M=`tr${uid}`;
const axes=<g><Line x1={60} y1={196} x2={620} y2={196} c={GREY}/><Line x1={60} y1={56} x2={60} y2={196} c={GREY}/>
{[[0,"6:45 pm","start"],[15,"7:00 toss","middle"],[30,"7:15","middle"],[45,"7:30","middle"],[60,"7:45","end"]].map(([t,l,a])=><T key={l} x={tx(t)} y={212} t={l} a={a}/>)}
<Line x1={tx(15)} y1={56} x2={tx(15)} y2={196} c={GREY} dash/><T x={52} y={vy(40)+4} t="40" a="end"/><T x={52} y={vy(20)+4} t="20" a="end"/><T x={52} y={200} t="0" a="end"/>
<T x={66} y={50} t="origin servers"/></g>;
const demand=<g><polyline points={pts(DEMAND)} fill="none" stroke={INK} strokeWidth="2"/><T x={tx(60)} y={vy(16)+16} t="needed" a="end"/></g>;
const auto=<g><polygon points={GAP} fill={LR} stroke="none"/><polyline points={pts(AUTO)} fill="none" stroke={RED} strokeWidth="2"/><T x={tx(60)} y={vy(20)-8} t="autoscaled from 3" a="end" c={RED}/><T x={tx(31)} y={vy(26)} t="players buffer" a="middle" c={RED} b/></g>;
const pre=<g><Line x1={60} y1={vy(40)} x2={620} y2={vy(40)} c={BLUE}/><T x={tx(60)} y={vy(40)-8} t="40 started at 6 pm" a="end" c={BLUE} b/></g>;
const caps=[["1 · 6:45 pm: a few lakh players; 3 servers would be plenty",INK],["2 · the toss: 1.4 crore arrive within 15 minutes",INK],["3 · autoscaling adds servers after the rush, 4 minutes each",RED],["4 · servers started before 7 pm were ready all along",BLUE]];
return <Fig still={still} h={222} id={`trt${uid}`} M={M} caps={caps} title="Origin servers needed from 6:45 to 7:45 pm on match night. Before the toss a few servers are enough. At the 7 pm toss 1.4 crore players arrive within 15 minutes and the need jumps to about 15 servers. A design that autoscales from 3 servers adds them only after the load has arrived, each taking 4 minutes to boot, so for about ten minutes players buffer. 40 servers started at 6 pm were ready all along."
base={axes} g={[<polyline key="d0" points={pts(DEMAND.slice(0,2))} fill="none" stroke={INK} strokeWidth="2"/>,demand,auto,pre]} last={<g>{demand}{auto}{pre}</g>}/>}

export const FIGS={
"live-pipe":{C:LivePipeFig,ar:640/236,title:()=>"ONE FEED, 87.5 LAKH REQUESTS A SECOND"},
"toss-rush":{C:TossFig,ar:640/222,title:()=>"THE CROWD ARRIVES BEFORE THE SERVERS DO"},
};
