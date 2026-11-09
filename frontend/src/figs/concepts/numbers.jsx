// Concepts › Numbers to know: the figures this sub-tab's articles draw (site.json dashboard.groups.concepts, "numbers").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
// Bars use log scales.
import React from"react";import{INK,RED,BLUE,LB,LR,T,Fig}from"../parts.jsx";

// A log-scale bar: label on the left, bar from x0 to sx(v), value text after it.
const Bar=({y,label,v,sx,x0,t,c=BLUE})=><g><T x={10} y={y+13} t={label}/><rect x={x0} y={y} width={Math.max(2,sx(v)-x0)} height={18} fill={c===RED?LR:LB} stroke={c}/><T x={sx(v)+6} y={y+13} t={t} c={c}/></g>;

const Axis=({sx,ticks,y})=><g>{ticks.map(([v,t])=><g key={t}><line x1={sx(v)} y1={48} x2={sx(v)} y2={y} stroke="#e3e7ec"/><T x={sx(v)} y={y+14} t={t} a="middle"/></g>)}</g>;

// FIG: what one machine offers today.
function MachineFig({still,uid=""}){
const card=(x,y,t,a,b,c=BLUE)=><g><rect x={x} y={y} width={300} height={78} fill={LB} stroke={c}/><T x={x+12} y={y+22} t={t} b/><T x={x+12} y={y+44} t={a}/><T x={x+12} y={y+62} t={b}/></g>;
const s1=card(10,48,"compute and memory","m6i.32xlarge: 128 vCPUs, 512 GiB","enough for most single-machine services");
const s2=card(330,48,"memory-optimised","x1e.32xlarge: about 4 TB of memory","u-24tb1.metal: 24 TB");
const s3=card(10,140,"storage","i3en.24xlarge: 60 TB of local NVMe SSD","d3en.12xlarge: 336 TB of hard disk");
const s4=card(330,140,"network","25 Gbit/s ordinary; 50–100+ Gbit/s available","< 1 ms in a zone, 1–2 ms across zones");
const caps=[["1 · a general-purpose machine: 128 vCPUs and 512 GiB of memory",BLUE],["2 · memory-optimised machines reach terabytes of memory",BLUE],["3 · tens of terabytes of local SSD; object storage is effectively unlimited",BLUE],["4 · and a fast, predictable network between machines",BLUE]];
return <Fig still={still} h={236} id={`nmt${uid}`} caps={caps} title="What one cloud machine offers today. A general-purpose m6i.32xlarge has 128 vCPUs and 512 GiB of memory. Memory-optimised machines reach about 4 TB (x1e.32xlarge) and 24 TB (u-24tb1.metal). An i3en.24xlarge has 60 TB of local NVMe SSD and a d3en.12xlarge 336 TB of hard disk, while S3 is effectively unlimited. Networks run at 25 Gbit/s ordinarily and 50 to 100 or more on network-optimised machines, with under 1 ms within a zone and 1 to 2 ms across zones."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG: the latency ladder.
function LatencyFig({still,uid=""}){
const sx=t=>180+(Math.log10(t)+8)*55, x0=180;
const R=[["read from memory",1e-7,"100 ns"],["SSD random read",1e-4,"100 µs"],["round trip, same zone",5e-4,"0.5 ms"],["round trip, other zone",1.5e-3,"1–2 ms"],["Mumbai ⇄ Singapore",6e-2,"~60 ms"],["India ⇄ US east coast",2e-1,"~200 ms"]];
const row=i=><Bar key={i} y={52+i*28} label={R[i][0]} v={R[i][1]} sx={sx} x0={x0} t={R[i][2]} c={i>=4?RED:BLUE}/>;
const base=<Axis sx={sx} y={222} ticks={[[1e-7,"100 ns"],[1e-6,"1 µs"],[1e-5,"10 µs"],[1e-4,"100 µs"],[1e-3,"1 ms"],[1e-2,"10 ms"],[1e-1,"100 ms"]]}/>;
const s1=<g>{row(0)}{row(1)}</g>,s2=<g>{row(2)}{row(3)}</g>,s3=<g>{row(4)}{row(5)}</g>;
const s4=<g><T x={180} y={252} t="each step is roughly ten times the one before (log scale)" c={INK}/></g>;
const caps=[["1 · memory takes nanoseconds; an SSD read about a tenth of a millisecond",BLUE],["2 · a call inside a region costs under a millisecond to about two",BLUE],["3 · a call to another region costs tens to hundreds of milliseconds",RED],["4 · so cross-region calls, not in-region hops, dominate a request's time",INK]];
return <Fig still={still} h={258} id={`nlt${uid}`} caps={caps} title="The latency ladder on a log scale. Reading memory takes about 100 nanoseconds and an SSD random read about 100 microseconds. A round trip within one availability zone takes about half a millisecond, and to another zone in the same region 1 to 2 milliseconds. Mumbai to Singapore and back takes about 60 milliseconds, and India to the US east coast about 200. Cross-region calls, not in-region hops, dominate a request's time."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG: rough operations a second per instance.
function CapacityFig({still,uid=""}){
const sx=v=>190+(Math.log10(v)-2)*105, x0=190;
const R=[["Kafka broker, small msgs",5e5,"lakhs/s"],["Redis node",2e5,"1–several lakh/s"],["Postgres: indexed reads",3e4,"tens of thousands/s"],["Postgres: simple writes",1e4,"~10,000/s"],["app server: simple requests",1e4,"thousands–tens of thousands/s"]];
const row=i=><Bar key={i} y={52+i*30} label={R[i][0]} v={R[i][1]} sx={sx} x0={x0} t={R[i][2]}/>;
const base=<Axis sx={sx} y={206} ticks={[[1e2,"100"],[1e3,"1,000"],[1e4,"10,000"],[1e5,"1 lakh"],[1e6,"10 lakh"]]}/>;
const s1=<g>{row(0)}{row(1)}</g>,s2=<g>{row(2)}{row(3)}</g>,s3=row(4);
const s4=<g><T x={190} y={238} t="orders of magnitude for one well-provisioned instance, not benchmarks" c={INK}/></g>;
const caps=[["1 · logs and caches: lakhs of simple operations a second per node",BLUE],["2 · one relational primary: tens of thousands of reads, about ten thousand writes",BLUE],["3 · an app server: thousands to tens of thousands of simple requests",BLUE],["4 · compare your peak with these before adding a component",INK]];
return <Fig still={still} h={246} id={`nct${uid}`} caps={caps} title="Rough operations a second for one well-provisioned instance, on a log scale. A Kafka broker handles lakhs of small messages a second and a Redis node one to several lakh operations. One PostgreSQL primary handles tens of thousands of indexed reads and about ten thousand simple writes a second. An app server handles thousands to tens of thousands of simple requests. These are orders of magnitude, not benchmarks."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG: data sizes against one machine.
function ShardMathFig({still,uid=""}){
const sx=gb=>190+(Math.log10(gb)-2)*140, x0=190;
const R=[["5 crore users × 5 KB",250,"250 GB"],["50 crore users × 5 KB",2500,"2.5 TB"],["orders, one year",3600,"3.6 TB"],["orders, five years",18000,"18 TB"]];
const row=i=><Bar key={i} y={60+i*30} label={R[i][0]} v={R[i][1]} sx={sx} x0={x0} t={R[i][2]}/>;
const base=<Axis sx={sx} y={196} ticks={[[100,"100 GB"],[1000,"1 TB"],[10000,"10 TB"],[100000,"100 TB"]]}/>;
const s1=<g>{row(0)}{row(1)}</g>,s2=<g>{row(2)}{row(3)}</g>;
const s3=<g><line x1={sx(60000)} y1={50} x2={sx(60000)} y2={186} stroke={RED} strokeWidth="2"/><T x={sx(60000)-4} y={48} t="one machine: 60 TB SSD" a="end" c={RED}/></g>;
const s4=<g><T x={10} y={230} t="all of it fits one machine; shard for write rate or many years of history, not user count" c={BLUE}/></g>;
const caps=[["1 · Zotato's users, even at 50 crore, are a few terabytes at most",BLUE],["2 · a year of orders is a few terabytes; five years under twenty",BLUE],["3 · one large machine holds 60 TB of local SSD",RED],["4 · so the arithmetic, not the user count, decides when to shard",BLUE]];
return <Fig still={still} h={240} id={`nst${uid}`} caps={caps} title="Data sizes against what one machine holds, on a log scale. Five crore users at 5 KB each are 250 GB, and fifty crore are 2.5 TB. A year of orders is about 3.6 TB and five years about 18 TB. One large machine holds 60 TB of local SSD, so all of it fits; shard for write rate or many years of history, not because the user count sounds big."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG: write rates against one primary.
function WritesFig({still,uid=""}){
const sx=v=>190+Math.log10(v)*68, x0=190;
const R=[["menu edits at peak",10,"~10/s",BLUE],["orders at peak",600,"~600/s",BLUE],["order status updates",3000,"~3,000/s",BLUE],["rider location pings",2e5,"~2 lakh/s",RED]];
const row=i=><Bar key={i} y={66+i*30} label={R[i][0]} v={R[i][1]} sx={sx} x0={x0} t={R[i][2]} c={R[i][3]}/>;
const base=<Axis sx={sx} y={196} ticks={[[1,"1"],[10,"10"],[100,"100"],[1000,"1,000"],[1e4,"10,000"],[1e5,"1 lakh"],[1e6,"10 lakh"]]}/>;
const zone=<g><rect x={x0} y={56} width={sx(1e4)-x0} height={130} fill={BLUE} opacity="0.06"/><T x={sx(1e4)-4} y={52} t="one primary, comfortably" a="end" c={BLUE}/></g>;
const s1=<g>{zone}{row(0)}{row(1)}</g>,s2=row(2),s3=row(3);
const s4=<g><T x={10} y={230} t="most writes fit one database; only the extreme needs an LSM store, batching or sharding" c={INK}/></g>;
const caps=[["1 · menu edits and orders: tens to hundreds of writes a second",BLUE],["2 · even order status updates stay well inside one primary",BLUE],["3 · rider pings at lakhs a second are the exception",RED],["4 · match the tool to the number: most features need no write pipeline",INK]];
return <Fig still={still} h={240} id={`nwt${uid}`} caps={caps} title="Write rates against one primary database, on a log scale. Menu edits are about 10 writes a second at peak, orders about 600, and order status updates about 3,000, all comfortably within one primary's range of up to about ten thousand. Rider location pings at about 2 lakh a second are the exception that needs an LSM-based store, batching or sharding."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

export const FIGS={
"nm-machine":{C:MachineFig,ar:640/236,title:()=>"ONE MACHINE, TODAY"},
"nm-latency":{C:LatencyFig,ar:640/258,title:()=>"THE LATENCY LADDER"},
"nm-capacity":{C:CapacityFig,ar:640/246,title:()=>"WHAT ONE INSTANCE CAN TAKE"},
"nm-shard-math":{C:ShardMathFig,ar:640/240,title:()=>"DOES IT FIT ON ONE MACHINE?"},
"nm-writes":{C:WritesFig,ar:640/240,title:()=>"HOW MANY WRITES IS A LOT?"},
};
