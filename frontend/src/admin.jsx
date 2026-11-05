// The owner's analytics dashboard (analytics.katta.cc). Reads /v1/admin/summary, which only admin
// accounts may read; the session is the one from signing in on tech.katta.cc (same site, so the API's
// cookie comes along). Mobile-first: tiles, one daily chart, a funnel, then tables.
import React,{useEffect,useMemo,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{API}from"./api.js";import"./admin.css";

const RANGES=[[1,"24 hours"],[7,"7 days"],[30,"30 days"],[90,"90 days"]];
const SITE="https://tech.katta.cc";
const fmt=n=>typeof n==="number"?n.toLocaleString("en-IN"):"–";
const pct=(a,b)=>b?`${Math.round(a/b*100)}%`:"–";
const secs=s=>s==null?"–":s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;
const day=iso=>new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const when=iso=>iso?new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}):"–";

async function load(days){const r=await fetch(`${API}/v1/admin/summary?days=${days}`,{credentials:"include"});if(r.status===401)return{state:"signed_out"};if(r.status===403)return{state:"not_admin"};if(!r.ok)throw new Error(`HTTP ${r.status}`);return{state:"ok",data:await r.json()}}

function Tile({label,value,sub}){return <div className="a-tile"><span>{label}</span><b>{value}</b>{sub&&<small>{sub}</small>}</div>}

// Visitors per day: one hue, bars from a shared baseline, a value on hover/tap and on the latest bar.
function Daily({data}){const days=useMemo(()=>{const out=[],seen=new Map(data.daily.map(d=>[d.day,d]));const end=new Date(data.to),start=new Date(data.from);
for(let t=new Date(start);t<=end;t.setDate(t.getDate()+1)){const k=t.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});if(!out.length||out[out.length-1].day!==k)out.push(seen.get(k)||{day:k,visitors:0,views:0})}return out},[data]);
const[hover,setHover]=useState(null);const max=Math.max(1,...days.map(d=>d.visitors));const W=600,H=160,gap=days.length>40?1:2,bw=Math.max(2,(W-gap*(days.length-1))/days.length);
const h=hover??days.length-1,cur=days[h];
return <figure className="a-card a-chart"><figcaption><b>Visitors per day</b><span>{cur?`${day(cur.day+"T12:00:00+05:30")}: ${fmt(cur.visitors)} visitors · ${fmt(cur.views)} page views`:""}</span></figcaption>
<div className="a-plot"><span className="a-max">{fmt(max)}</span><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Visitors per day, ${days.length} days`} onMouseLeave={()=>setHover(null)}>
{[.5,1].map(f=><line key={f} x1="0" x2={W} y1={H-(H-8)*f} y2={H-(H-8)*f} className="a-grid" vectorEffect="non-scaling-stroke"/>)}<line x1="0" x2={W} y1={H-.5} y2={H-.5} className="a-axis" vectorEffect="non-scaling-stroke"/>
{days.map((d,i)=>{const x=i*(bw+gap),bh=d.visitors?Math.max(2,d.visitors/max*(H-8)):0;return <g key={d.day} onMouseEnter={()=>setHover(i)} onClick={()=>setHover(i)}>
<rect x={x} y="0" width={bw+gap} height={H} fill="transparent"/>{bh>0&&<rect x={x} y={H-bh} width={bw} height={bh} rx={Math.min(2,bw/2)} className={"a-bar"+(i===h?" on":"")}/>}</g>})}
</svg><div className="a-ticks"><span>{day(days[0]?.day+"T12:00:00+05:30")}</span><span>{day(days[days.length-1]?.day+"T12:00:00+05:30")}</span></div></div>
<details className="a-table-view"><summary>Show as a table</summary><Table cols={["Day","Visitors","Page views"]} rows={days.map(d=>[d.day,fmt(d.visitors),fmt(d.views)])}/></details></figure>}

// Home page → locked Lab → signed in → scored: distinct visitors at each step.
function Funnel({steps}){const top=steps[0]?.visitors||0;return <section className="a-card"><h2>From the home page to a score</h2><ol className="a-funnel">
{steps.map((s,i)=><li key={s.step}><div className="a-funnel-row"><span>{s.step}</span><b>{fmt(s.visitors)}</b><small>{i?pct(s.visitors,top):""}</small></div><i style={{width:`${top?Math.max(s.visitors/top*100,s.visitors?2:0):0}%`}}/></li>)}</ol>
{steps[1]?.visitors>0&&<p className="a-note">Of the visitors who saw the locked Lab, <b>{pct(steps[2].visitors,steps[1].visitors)}</b> signed in.</p>}</section>}

function Table({cols,rows,empty="Nothing yet in this range."}){if(!rows.length)return <p className="a-empty">{empty}</p>;
return <div className="a-scroll"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>}
const Card=({title,children,note})=><section className="a-card"><h2>{title}</h2>{children}{note&&<p className="a-note">{note}</p>}</section>;

function Report({d}){const t=d.totals,a=d.accounts,phones=d.devices.find(x=>x.device==="phone")?.visitors||0;
return <>
<div className="a-tiles"><Tile label="Visitors" value={fmt(t.visitors)} sub={`${pct(phones,t.visitors)} on phones`}/><Tile label="Page views" value={fmt(d.byName.page_view||0)}/>
<Tile label="Signed-in visitors" value={fmt(t.users)}/><Tile label="New accounts" value={fmt(a.newInRange)} sub={`${fmt(a.total)} in all`}/>
<Tile label="Sign-ins" value={fmt(d.byName.sign_in||0)}/><Tile label="Ads opt-ins" value={fmt(a.adsOptIn)} sub="all time"/></div>
<Daily data={d}/>
<div className="a-two"><Funnel steps={d.funnel}/>
<Card title="Phone and desktop"><Table cols={["Device","Visitors","Share"]} rows={d.devices.map(x=>[x.device,fmt(x.visitors),pct(x.visitors,t.visitors)])}/></Card></div>
<div className="a-two"><Card title="Most viewed pages"><Table cols={["Page","Views","Visitors"]} rows={d.pages.map(p=>[p.slug?`${p.section} / ${p.slug}`:p.section,fmt(p.views),fmt(p.visitors)])}/></Card>
<Card title="Where visitors came from" note="Visits from other sites only; typed-in and in-site visits aren't listed."><Table cols={["Site","Visitors","Views"]} rows={d.referrers.map(r=>[r.ref,fmt(r.visitors),fmt(r.views)])}/></Card></div>
<Card title="Articles" note="Finished: reached about 90% of the page and stayed 5 seconds or more. Read and time are averages over visits that closed the article."><Table cols={["Article","Opened","Finished","Finish rate","Read","Time"]} rows={d.articles.map(x=>[`${x.section} / ${x.slug}`,fmt(x.opens),fmt(x.finishes),pct(x.finishes,x.opens),x.pct==null?"–":`${x.pct}%`,secs(x.seconds)])}/></Card>
<Card title="Lab challenges" note="Checks: how often each check passed, in the challenge's order. Phone: scores from the three-control version on the home page."><Table cols={["Challenge","Scores","Players","Avg stars","Best","Checks passed","Phone"]} rows={d.lab.scores.map(s=>[s.challenge,fmt(s.attempts),fmt(s.visitors),`${s.stars} / ${s.max}`,`${s.best} ★`,s.checkPass.map(c=>`${c}%`).join(" · "),pct(s.lite,s.attempts)])}/></Card>
<div className="a-two"><Card title="Components added in the Lab"><Table cols={["Component","Added"]} rows={d.lab.components.map(c=>[c.type,fmt(c.n)])}/></Card>
<Card title="Accounts by country" note="Country of the first sign-in, from Cloudflare. All time."><Table cols={["Country","Accounts"]} rows={a.countries.map(c=>[c.country||"unknown",fmt(c.n)])}/></Card></div>
<Card title="Newest accounts" note="All time, newest first. Personal data: don't share screenshots of this table."><Table cols={["Name","Email","Country","Joined","Last sign-in","Ads"]} rows={a.recent.map(u=>[u.name||"–",u.email,u.country||"–",when(u.createdAt),when(u.lastLoginAt),u.ads?"Yes":"No"])} empty="No accounts yet."/></Card>
<Card title="All events in this range"><Table cols={["Event","Count"]} rows={Object.entries(d.byName).map(([k,v])=>[k,fmt(v)])}/></Card></>}

function App(){const[days,setDays]=useState(()=>{try{return Number(localStorage.getItem("tk-analytics-days"))||7}catch{return 7}});const[st,setSt]=useState({state:"loading"});const tick=useRef(0);
const go=()=>{const id=++tick.current;setSt(s=>s.data?{...s,refreshing:true}:{state:"loading"});load(days).then(r=>{if(id===tick.current)setSt(r)},e=>{if(id===tick.current)setSt({state:"error",message:e.message})})};
useEffect(()=>{try{localStorage.setItem("tk-analytics-days",String(days))}catch{}go()},[days]);// eslint-disable-line
return <div className="a-page"><header className="a-head"><div><b>Tech Katta</b><span>Analytics</span></div>
{st.state==="ok"&&<a className="a-btn ghost" href={`${API}/v1/admin/audience.csv`}>Meta audience CSV</a>}</header>
<nav className="a-range" aria-label="Time range">{RANGES.map(([d,l])=><button key={d} type="button" aria-pressed={days===d} onClick={()=>setDays(d)}>{l}</button>)}<button type="button" className="a-refresh" onClick={go} disabled={st.state==="loading"||st.refreshing}>{st.refreshing?"Refreshing…":"Refresh"}</button></nav>
<main>{st.state==="loading"?<p className="a-msg">Loading…</p>
:st.state==="signed_out"?<div className="a-msg"><b>Sign in first</b><p>Sign in on <a href={SITE+"/#ind-vs-pak"}>tech.katta.cc</a> with the owner's Google account, then come back and press Refresh.</p></div>
:st.state==="not_admin"?<div className="a-msg"><b>Not an admin account</b><p>This Google account can't see the analytics. Sign out on tech.katta.cc and sign in with the owner's account.</p></div>
:st.state==="error"?<div className="a-msg"><b>Couldn't load the numbers</b><p>{st.message}. <button type="button" className="a-link" onClick={go}>Try again</button></p></div>
:<><p className="a-sub">{day(st.data.from)} – {day(st.data.to)}, India time · {fmt(st.data.totals.events)} events</p><Report d={st.data}/></>}</main></div>}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
