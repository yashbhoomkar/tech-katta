import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{content as c}from"./content.js";import{articles,example}from"./articles.js";import"./dashboard.css";

// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
const Icon=({name})=><svg className="ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[name]}/></svg>;
const d=c.dashboard,ids=d.sections.map(s=>s[0]);
// Hash routes: #<section> lists a section, #<section>/<slug> opens an article.
const fromHash=()=>{let h;try{h=decodeURIComponent(location.hash.slice(1))}catch{h=""}const[sec,slug]=h.split("/");if(!ids.includes(sec))return{sec:ids[0]};return{sec,art:articles.find(a=>a.section===sec&&a.slug===slug)}};
const inline=x=>x.split(/`([^`]+)`/).map((t,i)=>i%2?<code key={i}>{t}</code>:t);
const words=a=>[a.dek,example.text,...a.body.flatMap(b=>[b.x,b.how,b.use,b.cost,b.ex,b.cap,...(b.items||[])])].join(" ").split(/\s+/).length;

// prefers-reduced-motion, including changes while the page is open.
function useStill(){const q="(prefers-reduced-motion: reduce)";const[s,set]=useState(()=>matchMedia(q).matches);useEffect(()=>{const m=matchMedia(q),f=()=>set(m.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);return s}

// FIG. 01 of the API article: the four interaction patterns inside Dabba (viewBox 640×372).
// Animated with SMIL on an 8 s loop: a Dot travels x1→x2 between fractions t0 and t1 of the loop
// and is hidden the rest of the time. Reduced motion renders the static diagram.
const LOOP="8s";
const Dot=({x1,x2,y,t0,t1})=><circle cx={x1} cy={y} r="4" fill="#2855d9" opacity="0"><animate attributeName="cx" values={`${x1};${x1};${x2};${x2}`} keyTimes={`0;${t0};${t1};1`} dur={LOOP} repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={LOOP} repeatCount="indefinite"/></circle>;
const Box=({x,y,w=124,t,blue})=><g><rect x={x} y={y-17} width={w} height="34" fill={blue?"#f8faff":"#fff"} stroke={blue?"#2855d9":"#9aa5b4"}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
const Arr=({x1,x2,y,t,dash,ty})=><g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd="url(#ah)"/>{t&&<text x={(x1+x2)/2} y={ty??y-6} textAnchor="middle" className="fl">{t}</text>}</g>;
const ROWS=[["REQUEST / RESPONSE","REST · GraphQL · gRPC"],["OPEN CONNECTION","WebSockets · SSE"],["CALLBACK","Webhooks"],["ASYNCHRONOUS","Queues · event streams"]];
function ApiFig({still}){return <svg viewBox="0 0 640 372" role="img" aria-labelledby="fig1t"><title id="fig1t">Four API interaction patterns in Dabba: the customer app requests an order and waits for the response; the rider app and Dispatch keep a connection open and send messages both ways; the payment provider calls Dabba's webhook; the Order service puts an event on Kafka for the Notification service.</title><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>
{ROWS.map(([a,b],i)=><g key={a}>{i>0&&<line x1="0" x2="640" y1={i*93} y2={i*93} stroke="#d9dee7"/>}<text x="0" y={i*93+42} className="fk">{a}</text><text x="0" y={i*93+58} className="fs">{b}</text></g>)}
<Box x={190} y={46} t="Customer app"/><Box x={512} y={46} w={120} t="Order API"/><Arr x1={316} x2={510} y={38} t="GET /orders/123"/><Arr x1={510} x2={316} y={56} t="200 + the order as JSON" ty={72} dash/>
<Box x={190} y={139} t="Rider app"/><Box x={512} y={139} w={120} t="Dispatch"/><rect x="316" y="131" width="196" height="16" fill="#f5f7fa" stroke="#d9dee7"/><text x="414" y="124" textAnchor="middle" className="fl">one connection stays open</text><Arr x1={320} x2={505} y={135}/><Arr x1={505} x2={320} y={143}/><text x="414" y="164" textAnchor="middle" className="fl">location → · ← new job (SSE: ← only)</text>
<Box x={190} y={232} t="Payment provider"/><Box x={512} y={232} w={120} t="Dabba webhook" blue/><Arr x1={316} x2={510} y={224} t="POST payment.captured"/><Arr x1={510} x2={316} y={242} t="200 once the event is stored" ty={258} dash/>
<Box x={190} y={325} t="Order service"/><Box x={366} y={325} w={92} t="Kafka" blue/><Box x={512} y={325} w={120} t="Notifications"/><Arr x1={316} x2={364} y={325}/><Arr x1={460} x2={510} y={325}/><text x="414" y="358" textAnchor="middle" className="fl">order.placed · nobody waits</text>
{!still&&<g aria-hidden="true">
<Dot x1={318} x2={504} y={38} t0={.05} t1={.25}/><Dot x1={504} x2={318} y={56} t0={.32} t1={.52}/>
<Dot x1={324} x2={500} y={135} t0={.05} t1={.2}/><Dot x1={500} x2={324} y={143} t0={.26} t1={.41}/><Dot x1={324} x2={500} y={135} t0={.47} t1={.62}/><Dot x1={324} x2={500} y={135} t0={.8} t1={.95}/>
<Dot x1={318} x2={504} y={224} t0={.12} t1={.32}/><Dot x1={622} x2={622} y={223} t0={.32} t1={.46}/><Dot x1={504} x2={318} y={242} t0={.46} t1={.64}/>
<Dot x1={318} x2={358} y={325} t0={.04} t1={.12}/><Dot x1={448} x2={448} y={316} t0={.12} t1={.48}/><Dot x1={462} x2={504} y={325} t0={.48} t1={.56}/></g>}</svg>}

// Read aloud with the browser's speech engine (Web Speech API). The article is spoken one
// sentence-sized chunk at a time (long utterances stall in Chrome); the block being read is
// highlighted. Pause cancels and remembers the chunk; resume restarts that chunk.
const speakable=x=>(x||"").replace(/`/g,"").replace(/→/g," to ").replace(/←/g,"").replace(/\s*·\s*/g,", ").replace(/\s+/g," ").trim();
function chunks(a){const out=[];const add=(key,text)=>{const s=speakable(text).match(/[^.!?]+[.!?]+["”)]?\s*|[^.!?]+$/g)||[];let buf="";for(const x of s){if((buf+x).length>220&&buf){out.push({key,text:buf.trim()});buf=""}buf+=x}if(buf.trim())out.push({key,text:buf.trim()})};
add("head",`${a.title}. ${a.dek}`);a.body.forEach((b,i)=>add(i,b.t==="p"||b.t==="h2"?b.x:b.t==="list"?b.items.join(" "):b.t==="example"?`The example system: ${example.name}, a food delivery app. ${example.text} ${example.parts.map(p=>`${p[0]}: ${p[1]}.`).join(" ")}`:b.t==="type"?`${b.name}. ${b.how} Use it for: ${b.use} What it costs: ${b.cost} In ${example.name}: ${b.ex}`:b.t==="fig"?`Figure 1. ${b.cap}`:b.t==="table"?`Comparison table. ${b.rows.map(r=>`${r[0]}: who starts, ${r[1]}; format, ${r[2]}; from a browser, ${r[3]}; typical use, ${r[4]}.`).join(" ")}`:""));return out}
const canSpeak=typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
function useReader(a){const q=React.useMemo(()=>chunks(a),[a]);const[state,setState]=useState("idle");const[cur,setCur]=useState(null);const[rate,setRate]=useState(1);const run=useRef(0),idx=useRef(0),rateRef=useRef(1);
const halt=()=>{run.current++;if(canSpeak)speechSynthesis.cancel()};
const play=from=>{if(!canSpeak)return;halt();const id=run.current;const vs=speechSynthesis.getVoices();const v=vs.find(v=>v.lang==="en-IN")||vs.find(v=>v.lang==="en-GB")||vs.find(v=>/^en/.test(v.lang));
const say=i=>{if(id!==run.current)return;if(i>=q.length){setState("idle");setCur(null);idx.current=0;return}idx.current=i;setCur(q[i].key);const u=new SpeechSynthesisUtterance(q[i].text);if(v){u.voice=v;u.lang=v.lang}u.rate=rateRef.current;u.onend=()=>say(i+1);u.onerror=e=>{if(e.error!=="interrupted"&&e.error!=="canceled")say(i+1)};speechSynthesis.speak(u)};
setState("playing");say(from)};
useEffect(()=>()=>halt(),[a]);
return{q,state,cur,rate,play:()=>play(state==="paused"?idx.current:0),pause:()=>{halt();setState("paused")},stop:()=>{halt();idx.current=0;setState("idle");setCur(null)},setRate:r=>{rateRef.current=r;setRate(r);if(state==="playing")play(idx.current)}}}
function Reader({r}){if(!canSpeak)return null;return <div className="reader" role="group" aria-label="Listen to this article">
<button type="button" className="r-btn primary" onClick={r.state==="playing"?r.pause:r.play} aria-pressed={r.state==="playing"}>{r.state==="playing"?"❚❚ Pause":r.state==="paused"?"▶ Resume":"▶ Listen"}</button>
{r.state!=="idle"&&<button type="button" className="r-btn" onClick={r.stop}>■ Stop</button>}
<label className="r-rate">Speed<select value={r.rate} onChange={e=>r.setRate(+e.target.value)}>{[.75,1,1.25,1.5].map(x=><option key={x} value={x}>{x}×</option>)}</select></label>
<span className="r-note" aria-live="polite">{r.state==="playing"?"Reading aloud":r.state==="paused"?"Paused":"Read aloud by your browser"}</span></div>}

function Article({a}){const label=d.sections.find(s=>s[0]===a.section)[1];const still=useStill();const r=useReader(a);const rd=k=>r.cur===k?" reading":"";
useEffect(()=>{if(r.cur==null)return;const el=document.querySelector(".d-article .reading");el?.scrollIntoView({block:"nearest",behavior:still?"auto":"smooth"})},[r.cur]);
return <article className="d-panel d-article" aria-labelledby="d-title">
<nav className="crumbs" aria-label="Breadcrumb"><a href={`#${a.section}`}>{label}</a><span aria-hidden="true">/</span><span>{a.no}</span></nav>
<label>{a.tag}</label><h1 id="d-title">{a.title}</h1><p className={"d-dek"+rd("head")}>{a.dek}</p><Reader r={r}/><p className="d-meta">{a.date} · {Math.max(1,Math.round(words(a)/220))} MIN READ</p>
{a.body.map((b,i)=>b.t==="h2"?<h2 key={i} className={rd(i)}>{b.x}</h2>:b.t==="p"?<p key={i} className={rd(i)}>{inline(b.x)}</p>
:b.t==="list"?<ul key={i} className={rd(i)}>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul>
:b.t==="example"?<aside key={i} className={"a-example"+rd(i)} aria-label="Example system"><div className="a-ex-head"><b>EXAMPLE SYSTEM</b><span>{example.name}</span><small>{example.kind}</small></div><p>{example.text}</p><dl>{example.parts.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></aside>
:b.t==="type"?<section key={i} className={"a-type"+rd(i)}><h3>{b.name}<small>{b.kind}</small></h3><p>{inline(b.how)}</p><dl><dt>Use it for</dt><dd>{inline(b.use)}</dd><dt>What it costs</dt><dd>{inline(b.cost)}</dd><dt className="ex">In {example.name}</dt><dd className="ex">{inline(b.ex)}</dd></dl></section>
:b.t==="fig"?<figure key={i} className={"a-fig"+rd(i)}><div className="a-fig-head">FIG. 01 — FOUR WAYS TWO PROGRAMS TALK, IN {example.name.toUpperCase()}</div><div className="a-fig-scroll" role="region" aria-label="Figure 1, scrollable" tabIndex="0"><ApiFig still={still}/></div><figcaption>{b.cap}</figcaption></figure>
:b.t==="table"?<div key={i} className={"a-table"+rd(i)} role="region" aria-label="API types compared" tabIndex="0"><table><thead><tr>{b.head.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{b.rows.map(r=><tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>:null)}
<a className="a-back" href={`#${a.section}`}>← All {label.toLowerCase()}</a></article>}

function Section({id}){const[,label,card]=d.sections.find(s=>s[0]===id);const t=c.topics.cards.find(x=>x.id===card);
return <section className="d-panel" aria-labelledby="d-title"><label>{t?t.no:c.notes.eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{t?t.desc:c.notes.desc}</p>
{id==="quick-notes"?<ol className="d-notes">{c.notes.items.map(([n,title,tag,status])=><li key={n}><span className="d-no">{n}</span><b>{title}</b><span className="d-tag">{tag}</span><em className={status==="DRAFT"?"draft":""}>{status}</em></li>)}</ol>
:<List id={id}/>}</section>}
function List({id}){const list=articles.filter(a=>a.section===id);return list.length?<div className="d-list"><span>{list.length} {list.length>1?"PAGES":"PAGE"}</span><ol>{list.map(a=><li key={a.slug}><a href={`#${id}/${a.slug}`}><small>{a.no}</small><b>{a.title}</b><p>{a.dek}</p><em>Read →</em></a></li>)}</ol></div>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}

function Dashboard(){const[route,setRoute]=useState(fromHash);const active=route.sec;const[collapsed,setCollapsed]=useState(()=>localStorage.getItem("tk-sidebar")==="collapsed");const[open,setOpen]=useState(false);const menuBtn=useRef(null);const drawer=useRef(null);
useEffect(()=>{const f=()=>{setRoute(fromHash());setOpen(false);scrollTo(0,0)};addEventListener("hashchange",f);return()=>removeEventListener("hashchange",f)},[]);
useEffect(()=>{localStorage.setItem("tk-sidebar",collapsed?"collapsed":"open")},[collapsed]);
useEffect(()=>{if(!open)return;const r=requestAnimationFrame(()=>drawer.current?.querySelector(".side-nav a")?.focus());const k=e=>{if(e.key==="Escape"){setOpen(false);menuBtn.current?.focus()}};addEventListener("keydown",k);return()=>{cancelAnimationFrame(r);removeEventListener("keydown",k)}},[open]);
useEffect(()=>{const s=d.sections.find(s=>s[0]===active);document.title=route.art?`${route.art.title} | Tech Katta`:`${s[1]} · Dashboard | Tech Katta`},[route]);
const links=cls=>d.sections.map(([id,label])=>{const subs=cls==="side-link"&&id===active?articles.filter(a=>a.section===id):[];return <React.Fragment key={id}><a href={`#${id}`} className={cls+(id===active?" active":"")} aria-current={id===active&&!route.art?"page":undefined} title={collapsed?label:undefined}>{cls==="side-link"&&<Icon name={id}/>}<span>{label}</span></a>
{subs.length>0&&<div className="side-sub">{subs.map(a=><a key={a.slug} href={`#${id}/${a.slug}`} className={route.art===a?"active":""} aria-current={route.art===a?"page":undefined}>{a.title.split(":")[0]}</a>)}</div>}</React.Fragment>});
return <div className={"dash"+(collapsed?" collapsed":"")+(open?" open":"")}>
<aside className="side" id="sidebar" ref={drawer} aria-label="Dashboard"><div className="side-head"><a className="side-brand" href="/" aria-label="Tech Katta home"><b>TK</b><span>{c.brand.name}</span></a><button type="button" className="icon-btn desk" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} aria-controls="sidebar" onClick={()=>setCollapsed(v=>!v)}><Icon name="collapse"/></button><button type="button" className="icon-btn mob" aria-label="Close menu" onClick={()=>{setOpen(false);menuBtn.current?.focus()}}><Icon name="close"/></button></div>
<div className="side-label">{d.label}</div><nav className="side-nav">{links("side-link")}</nav>
<a className="side-foot" href="/"><Icon name="back"/><span>{d.back}</span></a></aside>
{open&&<div className="scrim" onClick={()=>setOpen(false)}/>}
<div className="d-main"><header className="d-head"><button type="button" ref={menuBtn} className="icon-btn mob" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={()=>setOpen(true)}><Icon name="menu"/></button><nav className="tabs" aria-label="Sections">{links("tab")}</nav><a className="d-home" href="/">tech.katta.cc</a></header>
<main className="d-body">{route.art?<Article a={route.art}/>:<Section id={active}/>}</main></div></div>}

createRoot(document.getElementById("root")).render(<React.StrictMode><Dashboard/></React.StrictMode>);
