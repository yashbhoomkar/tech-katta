import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{content as c}from"./content.js";import"./dashboard.css";

// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
const Icon=({name})=><svg className="ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[name]}/></svg>;
const d=c.dashboard,ids=d.sections.map(s=>s[0]);
const fromHash=()=>{const h=location.hash.slice(1);return ids.includes(h)?h:ids[0]};

function Section({id}){const[,label,card]=d.sections.find(s=>s[0]===id);const t=c.topics.cards.find(x=>x.id===card);
return <section className="d-panel" aria-labelledby="d-title"><label>{t?t.no:c.notes.eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{t?t.desc:c.notes.desc}</p>
{id==="quick-notes"?<ol className="d-notes">{c.notes.items.map(([n,title,tag,status])=><li key={n}><span className="d-no">{n}</span><b>{title}</b><span className="d-tag">{tag}</span><em className={status==="DRAFT"?"draft":""}>{status}</em></li>)}</ol>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}</section>}

function Dashboard(){const[active,setActive]=useState(fromHash);const[collapsed,setCollapsed]=useState(()=>localStorage.getItem("tk-sidebar")==="collapsed");const[open,setOpen]=useState(false);const menuBtn=useRef(null);const drawer=useRef(null);
useEffect(()=>{const f=()=>{setActive(fromHash());setOpen(false)};addEventListener("hashchange",f);return()=>removeEventListener("hashchange",f)},[]);
useEffect(()=>{localStorage.setItem("tk-sidebar",collapsed?"collapsed":"open")},[collapsed]);
useEffect(()=>{if(!open)return;const r=requestAnimationFrame(()=>drawer.current?.querySelector(".side-nav a")?.focus());const k=e=>{if(e.key==="Escape"){setOpen(false);menuBtn.current?.focus()}};addEventListener("keydown",k);return()=>{cancelAnimationFrame(r);removeEventListener("keydown",k)}},[open]);
useEffect(()=>{const s=d.sections.find(s=>s[0]===active);document.title=`${s[1]} · Dashboard | Tech Katta`},[active]);
const links=cls=>d.sections.map(([id,label])=><a key={id} href={`#${id}`} className={cls+(id===active?" active":"")} aria-current={id===active?"page":undefined} title={collapsed?label:undefined}>{cls==="side-link"&&<Icon name={id}/>}<span>{label}</span></a>);
return <div className={"dash"+(collapsed?" collapsed":"")+(open?" open":"")}>
<aside className="side" id="sidebar" ref={drawer} aria-label="Dashboard"><div className="side-head"><a className="side-brand" href="/" aria-label="Tech Katta home"><b>TK</b><span>{c.brand.name}</span></a><button type="button" className="icon-btn desk" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} aria-controls="sidebar" onClick={()=>setCollapsed(v=>!v)}><Icon name="collapse"/></button><button type="button" className="icon-btn mob" aria-label="Close menu" onClick={()=>{setOpen(false);menuBtn.current?.focus()}}><Icon name="close"/></button></div>
<div className="side-label">{d.label}</div><nav className="side-nav">{links("side-link")}</nav>
<a className="side-foot" href="/"><Icon name="back"/><span>{d.back}</span></a></aside>
{open&&<div className="scrim" onClick={()=>setOpen(false)}/>}
<div className="d-main"><header className="d-head"><button type="button" ref={menuBtn} className="icon-btn mob" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={()=>setOpen(true)}><Icon name="menu"/></button><nav className="tabs" aria-label="Sections">{links("tab")}</nav><a className="d-home" href="/">tech.katta.cc</a></header>
<main className="d-body"><Section id={active}/></main></div></div>}

createRoot(document.getElementById("root")).render(<React.StrictMode><Dashboard/></React.StrictMode>);
