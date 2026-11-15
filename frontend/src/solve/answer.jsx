// Your answer: the written steps of an interview, graded on Submit.
import React,{useState}from"react";import{parseAmount,rate,storage,fmtCount,fmtBytes,PER}from"./estimate.js";import{fmt}from"./format.js";
// ---- Your answer: the written steps of an interview, graded on Submit ----
export const NFR=[["availability","Availability target","%","99.9"],["p99","p99 latency target","ms","200"],["readsPerWrite","Reads for every write","×","100"]];
export function Answer({P,ans,save,g}){
if(!P)return <p className="d-desc">This problem has no graded answer yet.</p>;
const r=P.rubric,set=(k,v)=>save({...ans,[k]:v}),setIn=(k,id,v)=>save({...ans,[k]:{...(ans[k]||{}),[id]:v}});
const api=Array.isArray(ans.api)&&ans.api.length?ans.api:[{method:"GET",path:""}];
const setApi=(i,k,v)=>set("api",api.map((x,j)=>j===i?{...x,[k]:v}:x));
const mark=x=>g?<i className={"sv-mk "+(x?"ok":"no")} aria-label={x?"correct":"not yet"}>{x?"✓":"✕"}</i>:null;
const nf=id=>g?.nfr.find(x=>x.id===id);
return <div className="sv-ans">
<p className="sv-brief">Write it the way you would in the interview, then press Submit: the steps below are checked along with your design. {g?"Marks show your last submission.":""}</p>
<section><h2>1. Functional requirements</h2><p className="sv-help">What the system must do, one per line.</p>
<textarea rows={6} value={ans.fr||""} onChange={e=>set("fr",e.target.value)} aria-label="Functional requirements" placeholder={"Users can …\nAnyone who …"}/>
{g&&<ul className="sv-grade">{g.fr.map(x=><li key={x.label} className={x.ok?"ok":"no"}>{mark(x.ok)}{x.label}</li>)}</ul>}</section>
<section><h2>2. Non-functional requirements</h2><div className="sv-grid">
{NFR.filter(([id])=>r.nfr?.[id]!==undefined).map(([id,label,unit,ph])=><label key={id} className="sv-field"><span>{label}</span><span className="sv-in"><input inputMode="decimal" value={ans.nfr?.[id]??""} onChange={e=>setIn("nfr",id,e.target.value)} placeholder={ph}/><em>{unit}</em>{nf(id)&&mark(nf(id).ok)}</span>{g&&nf(id)&&!nf(id).ok&&<small>Aim for {fmt(r.nfr[id][0])}–{fmt(r.nfr[id][1])} {unit}</small>}</label>)}
{r.nfr?.consistency&&<label className="sv-field"><span>Consistency for reads</span><span className="sv-in"><select value={ans.nfr?.consistency||""} onChange={e=>setIn("nfr","consistency",e.target.value)}><option value="">Choose…</option><option value="strong">Strong: always the latest</option><option value="eventual">Eventual: a little stale is fine</option></select>{nf("consistency")&&mark(nf("consistency").ok)}</span>{g&&nf("consistency")&&!nf("consistency").ok&&<small>Think about what a reader can live with here.</small>}</label>}
</div></section>
<section><h2>3. Estimates</h2><p className="sv-help">Rough numbers are fine: within about 3× counts.</p><EstimateHelper/><div className="sv-grid">
{r.est.map(x=>{const e=g?.est.find(y=>y.id===x.id);return <label key={x.id} className="sv-field"><span>{x.label}</span><span className="sv-in"><input inputMode="decimal" value={ans.est?.[x.id]??""} onChange={e2=>setIn("est",x.id,e2.target.value)} placeholder="0"/><em>{x.unit}</em>{e&&mark(e.ok)}</span>{e&&!e.ok&&<small>About {fmt(x.answer)} {x.unit}{x.how?`: ${x.how}`:""}</small>}</label>})}
</div></section>
<section><h2>4. API</h2><p className="sv-help">The calls clients make: method and path.</p>
<div className="sv-api">{api.map((x,i)=><div key={i} className="sv-row"><select value={x.method} onChange={e=>setApi(i,"method",e.target.value)} aria-label={`Method ${i+1}`}>{["GET","POST","PUT","PATCH","DELETE"].map(m=><option key={m}>{m}</option>)}</select><input value={x.path} onChange={e=>setApi(i,"path",e.target.value)} placeholder="/v1/…" aria-label={`Path ${i+1}`}/><button type="button" onClick={()=>set("api",api.filter((_,j)=>j!==i))} aria-label={`Remove call ${i+1}`}>✕</button></div>)}
<button type="button" className="sv-add" onClick={()=>set("api",[...api,{method:"POST",path:""}])}>+ Add a call</button></div>
{g&&<ul className="sv-grade">{g.api.map(x=><li key={x.label} className={x.ok?"ok":"no"}>{mark(x.ok)}{x.label} <code>{x.ok?x.got:x.method}</code></li>)}</ul>}</section>
{r.decisions?.length>0&&<section><h2>5. Key decisions</h2><p className="sv-help">The choices this design turns on. Pick one answer for each; Submit explains the right one.</p>
{r.decisions.map((x,qi)=>{const d=g?.dec?.find(y=>y.id===x.id),pick=ans.decisions?.[x.id];return <fieldset key={x.id} className="sv-dec"><legend>{d&&mark(d.ok)}{qi+1}. {x.q}</legend>
{x.options.map((o,i)=><label key={i} className={d?(i===x.answer?"right":i===d.chosen?"wrong":""):""}><input type="radio" name={"dec-"+x.id} checked={pick===i} onChange={()=>setIn("decisions",x.id,i)}/><span>{o}</span></label>)}
{d&&<p className="sv-why">{d.ok?"Right: ":"The better choice: "+x.options[x.answer]+". "}{x.why}</p>}</fieldset>})}</section>}
<section><h2>{r.decisions?.length?6:5}. Design</h2><p className="sv-help">Build it on the canvas, then Run the example tests. Submit runs every test.{P.v===2?" Give each database the tables the calls need, in its schema.":" Give each part its job under \"What it does\" in its settings."}</p></section>
</div>}

// The estimate helper (context 36, step 12): two small sums beside the estimates. Nothing here is graded or saved.
export function EstimateHelper(){const[r,setR]=useState({n:"5 crore",per:"day",peak:"2"}),[s,setS]=useState({n:"10 lakh",size:"1",unit:"KB",years:"5",copies:"3"});
const n=parseAmount(r.n),rt=Number.isFinite(n)?rate(n,r.per,+r.peak||1):null;
const c=parseAmount(s.n),st=Number.isFinite(c)&&+s.size>0?storage(c,+s.size,s.unit,+s.years||1,+s.copies||1):null;
return <details className="sv-calc"><summary>Estimate helper</summary>
<p className="sv-help">Type amounts as 5 crore, 2.5 lakh, 10k or 3M. Not graded; it just does the sums.</p>
<div className="sv-calc-row"><input aria-label="How many" value={r.n} onChange={e=>setR({...r,n:e.target.value})}/><span>per</span><select aria-label="Per" value={r.per} onChange={e=>setR({...r,per:e.target.value})}>{Object.keys(PER).filter(k=>k!=="second").map(k=><option key={k}>{k}</option>)}</select><span>peak ×</span><input aria-label="Peak multiple" className="sv-calc-s" inputMode="decimal" value={r.peak} onChange={e=>setR({...r,peak:e.target.value})}/>
<output>{rt?<>= <b>{fmtCount(rt.perSecond)}</b> a second on average, <b>{fmtCount(rt.peak)}</b> at peak</>:"Type an amount"}</output></div>
<div className="sv-calc-row"><input aria-label="Items a day" value={s.n} onChange={e=>setS({...s,n:e.target.value})}/><span>a day ×</span><input aria-label="Size of each" className="sv-calc-s" inputMode="decimal" value={s.size} onChange={e=>setS({...s,size:e.target.value})}/><select aria-label="Size unit" value={s.unit} onChange={e=>setS({...s,unit:e.target.value})}>{["B","KB","MB","GB"].map(u=><option key={u}>{u}</option>)}</select><span>for</span><input aria-label="Years" className="sv-calc-s" inputMode="decimal" value={s.years} onChange={e=>setS({...s,years:e.target.value})}/><span>years ×</span><input aria-label="Copies" className="sv-calc-s" inputMode="decimal" value={s.copies} onChange={e=>setS({...s,copies:e.target.value})}/><span>copies</span>
<output>{st?<>= <b>{fmtBytes(st.perDay)}</b> a day, <b>{fmtBytes(st.total)}</b> in all</>:"Type an amount"}</output></div></details>}
