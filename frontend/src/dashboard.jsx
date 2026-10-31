import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{content as c}from"./content.js";import{articles}from"./articles.js";import"./dashboard.css";

// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
const Icon=({name})=><svg className="ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[name]}/></svg>;
const d=c.dashboard,ids=d.sections.map(s=>s[0]);
// Hash routes: #<section> lists a section, #<section>/<slug> opens an article.
const fromHash=()=>{let h;try{h=decodeURIComponent(location.hash.slice(1))}catch{h=""}const[sec,slug]=h.split("/");if(!ids.includes(sec))return{sec:ids[0]};return{sec,art:articles.find(a=>a.section===sec&&a.slug===slug)}};
const inline=x=>x.split(/`([^`]+)`/).map((t,i)=>i%2?<code key={i}>{t}</code>:t);
const words=a=>[a.dek,...a.body.flatMap(b=>[b.x,b.how,b.use,b.cost,b.cap,...(b.items||[])])].join(" ").split(/\s+/).length;

// FIG. 01 of the API article: four interaction patterns as block diagrams (viewBox 640×372).
const Box=({x,y,w=112,t,blue})=><g><rect x={x} y={y-17} width={w} height="34" fill={blue?"#f8faff":"#fff"} stroke={blue?"#2855d9":"#9aa5b4"}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
const Arr=({x1,x2,y,t,dash,ty})=><g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd="url(#ah)"/>{t&&<text x={(x1+x2)/2} y={ty??y-6} textAnchor="middle" className="fl">{t}</text>}</g>;
const ROWS=[["REQUEST / RESPONSE","REST · GraphQL · gRPC"],["OPEN CONNECTION","WebSockets · SSE"],["CALLBACK","Webhooks"],["ASYNCHRONOUS","Queues · event streams"]];
function ApiFig(){return <svg viewBox="0 0 640 372" role="img" aria-labelledby="fig1t"><title id="fig1t">Four API interaction patterns: request and response, open connection, webhook callback, and asynchronous queue.</title><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>
{ROWS.map(([a,b],i)=><g key={a}>{i>0&&<line x1="0" x2="640" y1={i*93} y2={i*93} stroke="#d9dee7"/>}<text x="0" y={i*93+42} className="fk">{a}</text><text x="0" y={i*93+58} className="fs">{b}</text></g>)}
<Box x={200} y={46} t="Client"/><Box x={512} y={46} w={120} t="Server"/><Arr x1={314} x2={510} y={38} t="request"/><Arr x1={510} x2={314} y={56} t="response" ty={72} dash/>
<Box x={200} y={139} t="Client"/><Box x={512} y={139} w={120} t="Server"/><rect x="314" y="131" width="198" height="16" fill="#f5f7fa" stroke="#d9dee7"/><text x="413" y="124" textAnchor="middle" className="fl">one connection stays open</text><Arr x1={320} x2={505} y={135}/><Arr x1={505} x2={320} y={143}/><text x="413" y="164" textAnchor="middle" className="fl">WebSockets: both ways · SSE: server → client</text>
<Box x={200} y={232} t="Provider"/><Box x={512} y={232} w={120} t="Your server" blue/><Arr x1={314} x2={510} y={224} t="POST when an event happens"/><Arr x1={510} x2={314} y={242} t="200 OK once the event is stored" ty={258} dash/>
<Box x={200} y={325} t="Producer"/><Box x={366} y={325} w={92} t="Queue" blue/><Box x={512} y={325} w={120} t="Consumer"/><Arr x1={314} x2={364} y={325}/><Arr x1={460} x2={510} y={325}/><text x="413" y="358" textAnchor="middle" className="fl">nobody waits for a reply</text></svg>}

function Article({a}){const label=d.sections.find(s=>s[0]===a.section)[1];return <article className="d-panel d-article" aria-labelledby="d-title">
<nav className="crumbs" aria-label="Breadcrumb"><a href={`#${a.section}`}>{label}</a><span aria-hidden="true">/</span><span>{a.no}</span></nav>
<label>{a.tag}</label><h1 id="d-title">{a.title}</h1><p className="d-dek">{a.dek}</p><p className="d-meta">{a.date} · {Math.max(1,Math.round(words(a)/220))} MIN READ</p>
{a.body.map((b,i)=>b.t==="h2"?<h2 key={i}>{b.x}</h2>:b.t==="p"?<p key={i}>{inline(b.x)}</p>
:b.t==="list"?<ul key={i}>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul>
:b.t==="type"?<section key={i} className="a-type"><h3>{b.name}<small>{b.kind}</small></h3><p>{inline(b.how)}</p><dl><dt>Use it for</dt><dd>{inline(b.use)}</dd><dt>What it costs</dt><dd>{inline(b.cost)}</dd></dl></section>
:b.t==="fig"?<figure key={i} className="a-fig"><div className="a-fig-head">FIG. 01 — FOUR WAYS TWO PROGRAMS TALK</div><div className="a-fig-scroll" role="region" aria-label="Figure 1, scrollable" tabIndex="0"><ApiFig/></div><figcaption>{b.cap}</figcaption></figure>
:b.t==="table"?<div key={i} className="a-table" role="region" aria-label="API types compared" tabIndex="0"><table><thead><tr>{b.head.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{b.rows.map(r=><tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>:null)}
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
