import React,{useEffect}from"react";import{fmt,pct,clockOf}from"./format.js";
import{CreditMeter,CREDIT,money,lasts}from"./credit.jsx";
// ---- v2 problems (tech-katta-context/evaluator.md §12.1): what the system must do, findings, how the design was
// read, and a test replayed on the canvas ----
export const fieldsOf=P=>[...new Set(Object.values(P.entities||{}).flatMap(e=>Object.keys(e.fields||{})))];
export const targetsOf=o=>[o.slo?.availability!==undefined?`${o.slo.availability}%`:null,o.slo?.p99Ms?`p99 ${fmt(o.slo.p99Ms)} ms`:null,o.consistency==="strong"?"always fresh":o.consistency?.maxStalenessSec?`at most ${fmt(o.consistency.maxStalenessSec)} s old`:null,o.durable?"never lost":null,o.effect==="once"?"never twice":null].filter(Boolean).join(" · ")||"—";
export function Ops({P}){return <section className="sv-tests" aria-labelledby="sv-ops"><h2 id="sv-ops">What the system must do</h2>
<div className="sv-tablewrap"><table className="sv-subs sv-optable"><thead><tr><th>Call</th><th>Request</th><th>Share</th><th>Targets</th></tr></thead><tbody>
{P.operations.map(o=><tr key={o.id}><td>{o.name}</td><td><code>{o.request.method} {o.request.path}</code></td><td>{!o.source||o.source==="clients"?pct(o.share*100):"—"}</td><td>{targetsOf(o)}</td></tr>)}</tbody></table></div></section>}
export function Findings({f,more}){return <section className="sv-findings" aria-label="Findings"><h3>Findings</h3><ol>{f.map((x,k)=><li key={k} className={x.severity}><details><summary><b>{x.severity==="fail"?"Problem":x.severity==="warn"?"Warning":"Note"}</b> {x.title}</summary><p>{x.story}</p>{x.fix&&<p className="sv-fix">Try: {x.fix}</p>}</details></li>)}</ol>{more>f.length&&<p className="sv-tdesc">{more-f.length} more not shown.</p>}</section>}
export const HOW={key:"by its key",index:"through an index",scan:"by reading the whole table","key-range":"in key order","index-range":"in index order",geo:"near a point",text:"by words",agg:"adding up rows",zset:"from a sorted set",write:"writes",blob:"a file",transaction:"in one transaction"};
export function HowRead({plans,P,nameOf}){return <details className="sv-read"><summary>How your design was read</summary>{Object.entries(plans).map(([id,p])=><div key={id}><b>{P?.operations?.find(o=>o.id===id)?.name||id}</b>{!p.ok?<p className="sv-whyline">{p.error?.message}</p>:<ol className="sv-hops">{p.hops.filter(h=>h.kind!=="source").map((h,k)=>{const st=h.step?p.steps[h.step]:null;return <li key={k} style={{marginLeft:(h.depth-1)*14}}>{h.share==="miss"?"on a miss: ":h.share==="cdnMiss"?"not cached at the edge: ":""}{!h.sync?"after answering: ":""}{nameOf(h.node)}{h.kind==="store"&&st?h.copy?" (keeps a copy)":` · ${HOW[st.how]||st.how} on ${st.table}`:h.kind==="cache"?" (look-aside cache)":h.kind==="invalidate"?" (drops the old copy)":h.kind==="enqueue"?" (holds the message)":""}</li>})}</ol>}</div>)}</details>}
// the canvas's view of a replayed test at tick i
// One minute of a replay for the canvas: each part's load, up, instances, backlog and held connections, plus what its
// events say at this minute (spec 33 §1.2): `fo` after a failover; `warm` 0..1 between a cache's cold restart and its
// warm event; `fresh` the event kinds of the last tick (one-shot animations: crash, scale out/in, backlog, drained);
// `peak` the largest backlog in the test (the queue's blocks are drawn against it).
export function replayAt(rep,P){const{r,i}=rep,tl=r.timeline,nodes={},t0=i*tl.tickMinutes,evs=r.events||[];
for(const[id,n]of Object.entries(tl.nodes)){const mine=evs.filter(e=>e.node===id),past=mine.filter(e=>e.t<=t0);
 const cold=[...past].reverse().find(e=>e.kind==="cold"||e.kind==="warm"),warmAt=cold?.kind==="cold"?mine.find(e=>e.kind==="warm"&&e.t>cold.t)?.t:null;
 nodes[id]={rho:n.rho[i]??0,up:n.up[i]??1,inst:n.instances[i]??0,backlog:n.backlog[i]??0,held:n.held?.[i]??0,peak:Math.max(1,...(n.backlog||[0])),
  fo:past.some(e=>e.kind==="failover")&&!past.some(e=>e.kind==="recovered"&&e.t>[...past].reverse().find(x=>x.kind==="failover").t),
  warm:cold?.kind==="cold"?(warmAt?Math.min(1,Math.max(0,(t0-cold.t)/Math.max(1,warmAt-cold.t))):0):1,
  fresh:mine.filter(e=>e.t<=t0&&e.t>t0-tl.tickMinutes).map(e=>e.kind),perHour:(n.spend?.[i]||0)*60/tl.tickMinutes}}
const ops=Object.entries(tl.ops).map(([id,o])=>`${P?.operations?.find(x=>x.id===id)?.name||id} ${fmt(o.rate[i]??0)}/s, ${pct(100*(o.ok[i]??1))} ok`).join(" · ");
const spentSoFar=(tl.spend||[]).slice(0,i+1).reduce((a,b)=>a+b,0),perHour=(tl.spend?.[i]||0)*60/tl.tickMinutes;
return{nodes,spent:spentSoFar,perHour,status:`${clockOf((r.test.startHour||0)*60+i*tl.tickMinutes)} · ${ops}${tl.spend?` · burning ${money(perHour)}/hour`:""}`}}
export function ReplayBar({rep,set,P,nameOf}){const{r,i,play}=rep,tl=r.timeline,n=Object.values(tl.ops)[0]?.rate.length||1,last=i>=n-1;
useEffect(()=>{if(!play)return;if(last){set(x=>x&&{...x,play:false});return}const t=setTimeout(()=>set(x=>x&&{...x,i:Math.min(x.i+1,n-1)}),180);return()=>clearTimeout(t)},[play,i,last]);// eslint-disable-line
useEffect(()=>{const k=e=>{if(e.key==="Escape")set(null)};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[set]);
const t0=i*tl.tickMinutes,ev=(r.events||[]).filter(e=>e.t<=t0&&e.t>t0-tl.tickMinutes*3).slice(-3);
return <section className="sv-console sv-player" aria-label={`Replay of ${r.test.name}`}>
<header className={"sv-v "+(r.ok?"good":"bad")}><div><b>▶ Replay: {r.test.name}</b><small>{clockOf((r.test.startHour||0)*60+t0)} · minute {t0} of {fmt(r.test.hours*60)}</small></div>
<span className="sv-vbtns"><button type="button" onClick={()=>set(x=>({...x,play:!x.play,i:last?0:x.i}))} aria-label={play?"Pause":"Play"}>{play?"❚❚":"▶"}</button><button type="button" onClick={()=>set(null)} aria-label="Close the replay">✕</button></span></header>
<div className="sv-scrubw"><input type="range" className="sv-scrub" min={0} max={n-1} value={i} onChange={e=>set(x=>({...x,play:false,i:+e.target.value}))} aria-label="Minute of the test"/>
<div className="sv-ticks">{marks(r.events,tl.tickMinutes,n).map(m=>{const words=m.evs.map(e=>eventWords(e,nameOf)).join(" ");return <button key={m.i} type="button" className={"sv-tick "+m.level} style={{left:`${100*m.i/Math.max(1,n-1)}%`}} title={words} aria-label={`Go to minute ${m.i*tl.tickMinutes}: ${words}`} onClick={()=>set(x=>({...x,play:false,i:m.i}))}/>})}</div></div>
{tl.spend&&(()=>{const from=rep.from??CREDIT,spent=tl.spend.slice(0,i+1).reduce((a,b)=>a+b,0),ph=(tl.spend[i]||0)*60/tl.tickMinutes;return <CreditMeter ms={160} from={from-tl.spend.slice(0,Math.max(0,i)).reduce((a,b)=>a+b,0)} to={Math.max(0,from-spent)} label={`This test has spent ${money(spent)} so far · burning ${money(ph)}/hour now`} note={`at this rate the credit lasts ${lasts(ph)}`}/>})()}
<ul className="sv-opres">{Object.entries(tl.ops).map(([id,o])=><li key={id}><b>{P?.operations?.find(x=>x.id===id)?.name||id}</b> {fmt(o.rate[i]??0)} calls/s · {pct(100*(o.ok[i]??1))} succeed · p99 {fmt(o.p99[i]??0)} ms</li>)}</ul>
{ev.length>0&&<ul className="sv-why">{ev.map((e,k)=><li key={k}>{eventWords(e,nameOf)}</li>)}</ul>}</section>}
// Scrubber marks: red for trouble, green for recovery, teal for scaling (spec 33 §1.5).
const TICK={crashed:"bad",writesLost:"bad",cold:"bad",backlog:"bad",hotPart:"bad",zoneDown:"bad",poison:"bad",hotKey:"bad",abuse:"bad",recovered:"good",failover:"good",warm:"good",drained:"good",zoneBack:"good",scaledOut:"info",scaledIn:"info"};
// One mark per tick that has events, in the most serious colour among them (several events often share a minute).
const RANK={bad:3,good:2,info:1};
export const marks=(events,tick,n)=>{const by=new Map();for(const e of events||[]){if(!TICK[e.kind])continue;const i=Math.min(n-1,Math.max(0,Math.round(e.t/tick)));if(!by.has(i))by.set(i,[]);by.get(i).push(e)}
return[...by].sort((a,b)=>a[0]-b[0]).slice(0,40).map(([i,evs])=>({i,evs,level:evs.map(e=>TICK[e.kind]).sort((a,b)=>RANK[b]-RANK[a])[0]}))};
export const EVENT={crashed:"crashed",failover:"failed over to its standby",recovered:"is back",cold:"came back empty: its misses go to the database",warm:"is warm again",scaledOut:"started more instances",scaledIn:"stopped some instances",backlog:"began to fill: messages arrive faster than they are taken",drained:"has caught up",writesLost:"lost writes it had not saved",hotPart:"has one part far busier than the rest: a hot item"};
export const eventWords=(e,nameOf)=>e.kind==="zoneDown"?"A zone went dark.":e.kind==="zoneBack"?"The zone is back.":e.kind==="poison"?`Bad messages arrive: ${Math.round((e.share||0)*1000)/10}% can never be processed.`:e.kind==="hotKey"?"One item suddenly gets a large share of the calls.":e.kind==="abuse"?`One client starts sending ${e.factor||0} times the normal traffic.`:`${nameOf?nameOf(e.node):e.node} ${EVENT[e.kind]||e.kind}${e.n&&e.kind!=="cold"?` (${fmt(e.n)})`:""}.`;
