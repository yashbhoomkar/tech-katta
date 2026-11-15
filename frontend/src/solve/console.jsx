import React,{useEffect,useState}from"react";import{headroom,waste}from"../eval/probes.js";import{defendQuestions}from"../eval/defend.js";import{tradeoffs}from"../eval/tradeoffs.js";import{track}from"../analytics.js";
import{CreditMeter,CREDIT,money,lasts}from"./credit.jsx";
// The score runs up from 0 to the result over 0.8 s (easing out); with reduced motion it shows at once.
function CountUp({n}){const[v,setV]=useState(()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches?n:0);
useEffect(()=>{if(v===n)return;let raf,t0;const step=t=>{t0??=t;const k=Math.min(1,(t-t0)/800);setV(Math.round(n*(1-(1-k)**3)));if(k<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[n]);// eslint-disable-line
return v}import{WEIGHTS}from"../judge/judge.js";import{fmt,pct}from"./format.js";import{Json,reqOf}from"./player.jsx";import{Findings,HowRead}from"./v2.jsx";import{ReviewPanel}from"../practice/review.jsx";
// A load test's budget, if it has one; and the first moment of trouble in its timeline (context 36, step 3): a part over
// its capacity or down, or a call failing more than 1 in 100. 0 when the trouble starts at once or there is none.
const budgetOf=r=>r.test?.checks?.find(c=>c.kind==="cost")?.max||0;
export function troubleAt(r){const tl=r.timeline;if(!tl)return 0;const n=Math.max(0,...Object.values(tl.ops||{}).map(o=>o.ok?.length||0),...Object.values(tl.nodes||{}).map(x=>x.rho?.length||0));
for(let i=0;i<n;i++){if(Object.values(tl.nodes||{}).some(x=>(x.up?.[i]??1)===0||(x.rho?.[i]??0)>1))return i;if(Object.values(tl.ops||{}).some(o=>(o.rate?.[i]??0)>0&&(o.ok?.[i]??1)<.99))return i}return 0}
// Since the last submission (context 36, step 5): the score, the tests that turned, the bill, and what changed on the canvas.
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} days ago`};
const sign=(n,f=x=>x)=>n>0?`+${f(n)}`:n<0?`−${f(-n)}`:"no change";
function Compare({c,diff}){return <details className="sv-compare" open><summary>Since your last submission <small>({ago(c.at)})</small></summary>
<p>{c.score!=null&&<>Score <b className={c.score>0?"up":c.score<0?"down":""}>{sign(c.score)}</b> · </>}Tests passed <b className={c.passed>0?"up":c.passed<0?"down":""}>{sign(c.passed)}</b>{c.cost!=null&&<> · Bill <b className={c.cost<0?"up":c.cost>0?"down":""}>{sign(Math.round(c.cost),x=>"$"+fmt(x))}/month</b></>}</p>
{(c.fixed.length>0||c.broke.length>0)&&<ul className="sv-turned">{c.fixed.map(n=><li key={"f"+n} className="ok">Now passes: {n}</li>)}{c.broke.map(n=><li key={"b"+n} className="no">Now fails: {n}</li>)}</ul>}
{diff?.length>0?<ul className="sv-diff">{diff.slice(0,12).map((x,k)=><li key={k} className={x.kind}>{x.text}</li>)}{diff.length>12&&<li>…and {diff.length-12} more</li>}</ul>:diff&&<p className="sv-tdesc">The design is the same as last time.</p>}</details>}
// What a load test's month costs, part by part (context 36, step 5).
export function Bill({cost,nameOf}){const rows=[...Object.entries(cost.byNode||{}).map(([id,v])=>[nameOf?nameOf(id):id,v]),["Storage",cost.storage||0],["Data transfer",cost.transfer||0]].filter(r=>r[1]>=1).sort((a,b)=>b[1]-a[1]);const top=rows[0]?.[1]||1;
return rows.length>0&&<details className="sv-bill"><summary>The bill, part by part: ${fmt(cost.monthly)}/month</summary><ul>{rows.map(([n,v])=><li key={n}><span>{n}</span><i style={{"--w":`${Math.max(2,100*v/top)}%`}} aria-hidden="true"/><b>${fmt(v)}</b></li>)}</ul></details>}
// ---- Results under the canvas ----
// After Accepted (context 36, step 8): the worked answer's "Follow-ups an interviewer may ask", one at a time; answer it
// aloud or in your head first, then open the article's answer.
function FollowUps({qs}){const[k,setK]=useState(0),[open,setOpen]=useState(false);const q=qs[k];if(!q)return null;
return <section className="sv-follow" aria-label="Follow-up questions"><h4>An interviewer would now ask <small>({k+1} of {qs.length})</small></h4><p className="sv-follow-q">{q.q}</p>
{open?<p className="sv-follow-a">{q.a}</p>:<button type="button" className="sv-linkbtn" onClick={()=>setOpen(true)}>Say your answer, then show one</button>}
{k<qs.length-1&&<button type="button" className="sv-linkbtn sv-follow-next" onClick={()=>{setK(k+1);setOpen(false)}}>Next question →</button>}</section>}
export const followUpsOf=article=>{const blk=(article?.body||[]).find(b=>b.t==="more"&&/^follow-ups/i.test(b.label||""));const items=(blk?.body||[]).flatMap(b=>b.t==="list"?b.items:[]);
return items.map(x=>{const m=String(x).match(/^\s*["“](.+?)["”]\s*(.*)$/s);return m?{q:m[1],a:m[2]}:null}).filter(Boolean)};
export function Console({busy,res,close,hint,answer,watch,replay,P,nameOf,credits,followUps,probe}){const[min,setMin]=useState(false);useEffect(()=>setMin(false),[res?.j]);
if(busy)return <section className="sv-console" aria-live="polite"><p className="sv-running">Running the tests…</p></section>;
if(res.kind==="review")return <section className="sv-console" aria-live="polite" aria-label="The interviewer's review"><header className="sv-v"><div><b>The interviewer</b><small>{res.busy?"Reading your design and every test…":"On the design that is on the canvas now"}</small></div><span className="sv-vbtns"><button type="button" onClick={close} aria-label="Close the review">✕</button></span></header><CreditMeter to={CREDIT} topped label="The interviewer reads your design and every test; your AWS credit is back to the full amount for your next run"/><div className="sv-review"><ReviewPanel review={res} credits={credits}/></div></section>;
const{kind,j,g,sc,crash}=res;
if(crash)return <section className="sv-console" aria-live="polite"><header className="sv-v bad"><b>Something went wrong</b><button type="button" onClick={close} aria-label="Close results">✕</button></header><p className="sv-why">{crash}</p></section>;
const acc=j.verdict==="accepted",err=j.verdict==="error";
return <section className={"sv-console"+(min?" min":"")} aria-live="polite" aria-label="Test results">
<header className={"sv-v "+(acc?"good":"bad")}><div><b>{err?"Can't run the tests":acc?(kind==="run"?"Example tests passed":"Accepted"):"Wrong design"}</b>
<small>{err?j.first?.error:`${j.passed} / ${j.total} ${kind==="run"?"example ":""}tests passed`}{j.metrics&&!err?(acc?` · each within its own targets · up to $${fmt(j.metrics.avgMonthly)}/month`:` · worst availability ${pct(j.metrics.availability)} · p99 ${fmt(j.metrics.p99)} ms · up to $${fmt(j.metrics.avgMonthly)}/month`):""}</small></div>
<span className="sv-vbtns"><button type="button" onClick={()=>setMin(m=>!m)} aria-expanded={!min} aria-label={min?"Show the results":"Make the results smaller"}>{min?"▴":"▾"}</button><button type="button" onClick={close} aria-label="Close results">✕</button></span></header>
{!min&&!err&&res.credit&&j.results.some(r=>r.timeline)&&<CreditMeter key={j.passed+":"+res.credit.end} to={res.credit.end} label={`Spent ${money(res.credit.spent)} across ${j.results.filter(r=>r.timeline).length} load test${j.results.filter(r=>r.timeline).length===1?"":"s"} · topped back up on every Run, Submit and Ask`} note={res.credit.peakPerHour>0?`at its peak rate (${money(res.credit.peakPerHour)}/hour) the credit lasts ${lasts(res.credit.peakPerHour)}`:""}/>}
{!min&&<>{sc&&<div className="sv-score"><b aria-label={`${sc.total} out of 100`}><CountUp n={sc.total}/><small>/100</small></b><ul>
<li>Requirements <span>{Math.round(sc.parts.fr+sc.parts.nfr)}/{WEIGHTS.fr+WEIGHTS.nfr}</span></li><li>Estimates <span>{Math.round(sc.parts.est)}/{WEIGHTS.est}</span></li>
<li>API <span>{Math.round(sc.parts.api)}/{WEIGHTS.api}</span></li><li>Key decisions <span>{Math.round(sc.parts.dec||0)}/{WEIGHTS.dec}</span></li><li>Design tests <span>{Math.round(sc.parts.design)}/{WEIGHTS.design}</span></li>{sc.penalty>0&&<li>Hints <span>−{sc.penalty}</span></li>}</ul>
{g&&(g.parts.fr<1||g.parts.est<1||g.parts.api<1||g.parts.nfr<1||g.parts.dec<1)&&<button type="button" className="sv-linkbtn" onClick={answer}>See what your answer missed →</button>}</div>}
{res.cmp&&<Compare c={res.cmp} diff={res.diff}/>}
{kind==="submit"&&acc&&!res.copied&&P?.v===2&&probe&&<Defend key={"d"+(res.at||j.total)} P={P} probe={probe}/>}
{!err&&P?.v===2&&probe&&<Probes key={res.at||j.passed+":"+j.total} P={P} probe={probe} accepted={kind==="submit"&&acc&&!res.copied}/>}
{kind==="submit"&&acc&&!res.copied&&followUps?.length>0&&<FollowUps qs={followUps}/>}
{res.copied&&<p className="sv-copied">This is the solution's design, copied unchanged, so it isn't counted as solved and doesn't set a best score. Change it, or build your own, and submit again.</p>}
{res.server&&<p className="sv-server">{res.server==="pending"?"Checking on our server…":res.server==="off"?"Sign in to have your submission checked and compared with everyone else's.":<>✓ Checked on our server{res.server.verdict!==j.verdict?` (it says: ${res.server.verdict})`:""} · {res.server.accepted} of {res.server.submissions} submissions accepted ({Math.round(100*res.server.accepted/Math.max(1,res.server.submissions))}%){res.server.cheaperThan!=null&&res.server.verdict==="accepted"?<> · <b>cheaper than {res.server.cheaperThan}% of accepted designs</b></>:""}</>}</p>}
{!err&&<ol className="sv-results">{j.results.map((r,k)=><li key={r.id} className={r.ok?"ok":"no"} style={{"--i":Math.min(k,14)}}><details open={!r.ok&&r===j.first}><summary><i aria-hidden="true">{r.ok?"✓":"✕"}</i><span>Test {k+1}: {r.test.name}</span><small>{r.metrics?`${pct(r.metrics.availability)} · p99 ${fmt(r.metrics.p99)} ms · $${fmt(r.metrics.avgMonthly)}/mo${budgetOf(r)?` of $${fmt(budgetOf(r))} allowed`:""}`:(r.request||r.test.request)&&r.output?`${(r.request||r.test.request).method} ${(r.request||r.test.request).path} → ${r.output.status}${r.ok?"":` (expected ${r.expect.status})`}`:r.error}</small></summary>
<p className="sv-tdesc">{r.test.desc}</p>{r.why?.length>0&&<ul className="sv-why">{r.why.map(x=><li key={x}>{x}</li>)}</ul>}
{(r.request||r.test.request)&&<><div className="sv-io"><Json label="Request" v={r.request||reqOf(r.test)}/><Json label="Expected" v={r.expect}/>{r.output&&<Json label="Your design's response" v={r.output} bad={!r.ok}/>}</div>{r.trace?.length>1&&<button type="button" className="sv-watch" onClick={()=>watch(r)}>▶ Watch the request travel</button>}</>}
{r.cost&&<Bill cost={r.cost} nameOf={nameOf}/>}<ul className="sv-checks">{r.checks.map((c,ci)=><li key={ci} className={c.ok?"ok":"no"}><i aria-hidden="true">{c.ok?"✓":"✕"}</i>{c.label}</li>)}</ul>
{r.ops&&<ul className="sv-opres">{Object.entries(r.ops).map(([id,o])=><li key={id}><b>{P?.operations?.find(x=>x.id===id)?.name||id}</b> {o.planned?<>{pct(o.availability)} · p50 {fmt(o.p50)} ms · p99 {fmt(o.p99Worst)} ms{Object.entries(o.deferred||{}).map(([sid,d])=><span key={sid}> · done later within {fmt(d.worstDelaySec)} s{d.notDone>0?`, ${fmt(d.notDone)} left`:""}</span>)}</>:"can't run"}</li>)}</ul>}
{r.timeline&&<span className="sv-replays">{!r.ok&&troubleAt(r)>0&&<button type="button" className="sv-watch" onClick={()=>replay(r,troubleAt(r))}>▶ Replay from minute {troubleAt(r)*(r.timeline.tickMinutes||1)}, where it went wrong</button>}<button type="button" className="sv-watch" onClick={()=>replay(r)}>▶ Replay this test</button></span>}</details></li>)}</ol>}
{!err&&j.findings?.length>0&&<Findings f={j.findings} more={j.allFindings}/>}{!err&&j.plans&&Object.keys(j.plans).length>0&&<HowRead plans={j.plans} P={P} nameOf={nameOf}/>}
{!acc&&!err&&<p className="sv-nudge">Stuck? <button type="button" className="sv-linkbtn" onClick={hint}>Open a hint</button> (3 points each).</p>}</>}
</section>}

// Probes (context 36, step 16): two questions no test asks, run on the design as it is now, on demand.
const times=m=>`${m.toLocaleString("en-US",{maximumFractionDigits:1})}×`;
function Probes({P,probe,accepted}){const[h,setH]=useState(null),[w,setW]=useState(null),[how,setHow]=useState(false),[t,setT]=useState(null);
const run=(set,f)=>{set("busy");setTimeout(()=>{try{set(f(probe.design(),probe.lab,P)||"none")}catch{set("none")}},30)};
const tone=h&&h!=="busy"&&h!=="none"?(h.m<1?"no":h.m<1.2?"edge":"ok"):"";
return <details className="sv-probes" open><summary>Beyond the tests</summary>
<div className="sv-probe"><button type="button" className="sv-linkbtn" disabled={h==="busy"} onClick={()=>{run(setH,headroom);track("probe",{kind:"headroom"})}}>How much more can it take?</button>
{h==="busy"?<p className="sv-help">Turning the traffic up…</p>:h==="none"?<p className="sv-help">This problem has no load test to turn up.</p>:h?<p className={"sv-probe-out "+tone}>{h.m<1?<>It does not hold <b>{h.base.name}</b> itself: it manages <b>{times(h.m)}</b> of it.</>:h.capped?<>It held <b>{times(h.m)}</b> {h.base.name}, the most this check tries.</>:<>It holds <b>{times(h.m)}</b> {h.base.name} ({fmt(h.base.rps*h.m)} a second){h.m<1.2?", close to the line":""}.</>}{h.first&&<small> The first thing to give: {h.first}</small>}</p>:null}</div>
<div className="sv-probe"><button type="button" className="sv-linkbtn" disabled={t==="busy"} onClick={()=>{run(setT,tradeoffs);track("probe",{kind:"tradeoffs"})}}>What did each choice buy you?</button>
{t==="busy"?<p className="sv-help">Running every test with each setting turned the other way…</p>:t==="none"?<p className="sv-help">Nothing to compare here.</p>:t?<TradeOffs t={t}/>:null}</div>
{accepted&&<div className="sv-probe"><button type="button" className="sv-linkbtn" disabled={w==="busy"} onClick={()=>{run(setW,waste);track("probe",{kind:"waste"})}}>What would still pass, for less?</button>
{w==="busy"?<p className="sv-help">Trying it one step smaller at a time…</p>:w==="none"?<p className="sv-help">Nothing to try here.</p>:w?(w.saving<Math.max(1,w.before*0.02)?<p className="sv-probe-out ok">Nothing smaller still passes every test: this design is already lean.</p>:<p className="sv-probe-out">It would still pass every test at <b>${fmt(w.after)}</b> a month, <b>${fmt(w.saving)}</b> less.{w.partial?" (It stopped trying after a while; there may be more.)":""} <button type="button" className="sv-linkbtn" onClick={()=>setHow(v=>!v)} aria-expanded={how}>{how?"Hide how":"Show how"}</button></p>):null}
{w&&w.changes&&how&&<ul className="sv-probe-how">{w.changes.map(c=><li key={c.part+c.field}><b>{c.name}</b>: {c.label||c.field} {String(c.from)} → {String(c.to)}</li>)}</ul>}</div>}</details>}

// Defend your design (context 36, step 17): three questions about this design, answered by running it. Kept in this
// browser (tk-defend-v1: the last result per problem); not part of the score.
const DEFEND_KEY="tk-defend-v1";
function Defend({P,probe}){const[st,setSt]=useState(null),[i,setI]=useState(0),[picks,setPicks]=useState([]);
const start=()=>{setSt("busy");setTimeout(()=>{let qs=[];try{qs=defendQuestions(probe.design(),probe.lab,P)}catch{}setSt(qs.length?{qs}:"none");setI(0);setPicks([]);track("defend_start",{n:qs.length})},30)};
if(!st)return <div className="sv-defend"><b>Defend your design</b><p className="sv-help">An interviewer asks about your own design: what if this part fails, what gives first. Three questions, answered by running it.</p><button type="button" className="sv-run" onClick={start}>Start</button></div>;
if(st==="busy")return <div className="sv-defend"><b>Defend your design</b><p className="sv-help">Running your design to find the questions…</p></div>;
if(st==="none")return <div className="sv-defend"><b>Defend your design</b><p className="sv-help">No questions could be built for this design.</p></div>;
const{qs}=st,q=qs[i],pick=picks[i],done=picks.length===qs.length&&pick!==undefined&&i===qs.length-1,right=picks.filter((p,k)=>p===qs[k].right).length;
const choose=c=>{if(pick!==undefined)return;const np=[...picks];np[i]=c;setPicks(np);track("defend_answer",{kind:q.kind,right:c===q.right});
if(np.filter(x=>x!==undefined).length===qs.length){try{const all=JSON.parse(localStorage.getItem(DEFEND_KEY)||"{}");all[probe.slug||"p"]={at:Date.now(),right:np.filter((p,k)=>p===qs[k].right).length,n:qs.length};localStorage.setItem(DEFEND_KEY,JSON.stringify(all))}catch{}}};
return <div className="sv-defend" aria-live="polite"><b>Defend your design <small>· question {i+1} of {qs.length}</small></b>
<p className="sv-defend-q">{q.q}</p><ul className="sv-defend-c">{q.choices.map((c,k)=><li key={k}><button type="button" disabled={pick!==undefined} className={pick===undefined?"":k===q.right?"right":k===pick?"wrong":""} onClick={()=>choose(k)}>{c}</button></li>)}</ul>
{pick!==undefined&&<p className="sv-defend-say"><b>{pick===q.right?"Right.":"Not quite."}</b> {q.say}</p>}
{pick!==undefined&&(i<qs.length-1?<button type="button" className="sv-linkbtn" onClick={()=>setI(i+1)}>Next →</button>:<p className="sv-defend-end">{right} of {qs.length} right. {right===qs.length?"You know how your design behaves.":"The run above is what an interviewer would expect you to know: try Break it yourself in a replay to see it."}</p>)}</div>}

// Trade-offs (context 36, step 18): each setting turned the other way, run against every test.
const dollars=d=>`$${fmt(Math.abs(d))} a month ${d>0?"more":"less"}`;
function TradeOffs({t}){if(!t.cards.length)return <p className="sv-help">Your design has no settings with another side to compare.</p>;
const felt=t.cards.filter(c=>c.newFails.length||c.fixes.length),cost=t.cards.filter(c=>!c.newFails.length&&!c.fixes.length&&Math.abs(c.other.monthly-t.yours.monthly)>=1),same=t.cards.filter(c=>!felt.includes(c)&&!cost.includes(c));
const card=c=>{const d=c.other.monthly-t.yours.monthly;return <li key={c.part+c.key}><b>{c.name} · {c.label}</b>: yours is <em>{c.fromWords}</em>. As <em>{c.toWords}</em>: {Math.abs(d)>=1?dollars(d):"the same bill"}{c.newFails.length?<>, but it fails {c.newFails.map((f,i)=><React.Fragment key={f.id}>{i?", ":""}<span className="sv-to-fail">{f.name}</span></React.Fragment>)}.{c.newFails[0].why&&<small>{c.newFails[0].why}</small>}</>:c.fixes.length?<>, and it would pass {c.fixes.map(f=>f.name).join(", ")}.</>:<>; the same tests pass.</>}</li>};
return <div className="sv-to"><p className="sv-help">Your design: {t.yours.passed} of {t.yours.total} tests, ${fmt(t.yours.monthly)} a month. Each line turns one setting the other way and runs every test again.</p>
{felt.length>0&&<><h4>Choices the tests depend on</h4><ul>{felt.map(card)}</ul></>}
{cost.length>0&&<><h4>Choices that only change the bill</h4><ul>{cost.map(card)}</ul></>}
{same.length>0&&<p className="sv-help">No difference in these tests: {same.map(c=>`${c.name} · ${c.label}`).join("; ")}. What separates those is something the tests don't measure, so be ready to explain it in words.</p>}</div>}
