import React,{useEffect,useState}from"react";import{readProgress}from"../progress.js";import{lsGet}from"./storage.js";import{Thumb}from"./figure.jsx";import Problems,{Questions}from"../problems.jsx";import Numbers from"../numbers.jsx";import LibraryCards from"../library.jsx";import{c,d,articles}from"./site.js";
// The dashboard's start page (spec 26): a greeting, "continue reading" (the last article opened here, how far you got),
// your progress (problems solved, challenge stars), the three library cards, and the next problems to solve.
// Copy in site.json dashboard.home; progress from progress.js (kept in this browser, synced when signed in).
const libHref=x=>{const sec=d.sections.find(s=>s[2]===x.id)?.[0];if(!sec)return"#";const first=articles.find(a=>a.section===sec);return first?`#${sec}/${first.slug}`:`#${sec}`};
const lastRead=()=>{try{const o=JSON.parse(lsGet("tk-last")||"null");const a=o&&articles.find(x=>x.slug===o.slug);return a?{a,p:Math.max(0,Math.min(1,+o.p||0))}:null}catch{return null}};
function Continue({h}){const last=lastRead(),a=last?.a||articles.find(x=>x.section==="interview-questions"&&x.group==="start")||articles[0];if(!a)return null;const pct=Math.round((last?.p||0)*100);
return <a className="h-card h-cont" href={`#${a.section}/${a.slug}`}>{a.fig&&<Thumb id={a.fig}/>}<span className="h-cont-t"><small>{last?h.continue:h.start}</small><b>{a.title.split(":")[0]}</b>{a.dek&&<p>{a.dek}</p>}{last&&<span className="h-bar" role="img" aria-label={`${pct}% ${h.read}`}><i style={{width:`${Math.max(4,pct)}%`}}/></span>}<em>{last?h.resume:h.begin} →</em></span></a>}
function Progress({h}){const[p,setP]=useState(readProgress);useEffect(()=>{const f=()=>setP(readProgress());addEventListener("tk-progress",f);addEventListener("storage",f);return()=>{removeEventListener("tk-progress",f);removeEventListener("storage",f)}},[]);
const qs=articles.filter(a=>a.tests),done=qs.filter(a=>p.steps["solved:"+a.slug]).length,stars=Object.values(p.stars).reduce((x,y)=>x+y,0),max=(c.counts?.challenges||0)*3,r=15.5,len=2*Math.PI*r,k=qs.length?done/qs.length:0;
return <div className="h-card h-prog"><div className="h-ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r={r} className="h-ring-bg"/><circle cx="18" cy="18" r={r} className="h-ring-on" strokeDasharray={`${Math.max(.001,k*len)} ${len}`} transform="rotate(-90 18 18)"/></svg><span><b>{done} <i>of {qs.length}</i></b>{h.solved}</span></div>
{max>0&&<div className="h-stars"><b>{stars} <i>of {max}</i></b>{h.stars}</div>}<p>{h.progressNote}</p></div>}
function UpNext({h}){const[p]=useState(readProgress);const list=articles.filter(a=>a.tests&&!p.steps["solved:"+a.slug]).slice(0,4);if(!list.length)return null;
return <><div className="h-head"><h2>{h.next}</h2><a href="#problems">{h.all} →</a></div><ol className="h-next">{list.map(a=><li key={a.slug}><a className="h-card" href={`#problems/${a.slug}`}><small className={"lv "+(a.group||"")}>{h.levels?.[a.group]||a.group}</small><b>{a.title.split(":")[0]}</b><em>{h.solve} →</em></a></li>)}</ol></>}
export function Home(){const h=d.home||{};const hour=new Date().getHours(),g=h.greet||[];
return <section className="d-panel d-start" aria-labelledby="d-title"><h1 id="d-title">{g[hour<12?0:hour<17?1:2]||c.topics.title}</h1>{h.sub&&<p className="d-desc">{h.sub}</p>}
<div className="h-row"><Continue h={h}/><Progress h={h}/></div>
<div className="h-head"><h2>{h.explore||c.topics.eyebrow}</h2></div><LibraryCards cards={c.topics.cards} href={libHref}/>
<UpNext h={h}/></section>}
// Privacy and Terms pages (site.json "privacy", "terms").
export function Policy({p}){return <section className="d-panel" aria-labelledby="d-title"><label>{p.eyebrow}</label><h1 id="d-title">{p.title}</h1><p className="d-desc">{p.updated}</p>
{p.sections.map(([h,x])=><div className="priv" key={h}><h2>{h}</h2><p>{x}</p></div>)}</section>}
export function Section({id}){if(id==="problems"&&c.problems)return <Problems p={c.problems} articles={articles} groups={d.groups?.["interview-questions"]}/>;const[,label,card]=d.sections.find(s=>s[0]===id);const t=c.topics.cards.find(x=>x.id===card);
// the section header: a library card's, the section's own (site.json dashboard.heads), or Quick Notes'
const h=t?{eyebrow:t.no,desc:t.desc}:d.heads?.[id]||{eyebrow:c.notes.eyebrow,desc:c.notes.desc};
if(id==="interview-questions"&&c.problems?.solve)return <Questions p={c.problems} articles={articles} label={label} desc={t?t.desc:""} eyebrow={t?t.no:""} groups={d.groups?.[id]}/>;
return <section className="d-panel" aria-labelledby="d-title"><label>{h.eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{h.desc}</p>
{id==="quick-notes"?<><ol className="d-notes">{c.notes.items.map(([n,title,tag,status])=><li key={n}><span className="d-no">{n}</span><b>{title}</b><span className="d-tag">{tag}</span><em className={status==="DRAFT"?"draft":""}>{status}</em></li>)}</ol><Numbers n={c.numbers}/></>
:<List id={id}/>}</section>}
// A section's articles under its subsection headings (site.json dashboard.groups[section]: [[id, label, desc]],
// article "group"), in that order; articles without a known group come last. No groups: one plain list.
export const grouped=(id,list)=>{const g=d.groups?.[id];if(!g)return[[null,list]];const known=new Set(g.map(x=>x[0]));const rest=list.filter(a=>!known.has(a.group));
return[...g.map(([gid,label,desc])=>[{gid,label,desc},list.filter(a=>a.group===gid)]),...(rest.length?[[null,rest]]:[])]};
// a card is a picture first (the article's first figure, still), then the title and a short line (25 §7)
const Item=({id,a})=><li><a href={`#${id}/${a.slug}`} className={a.fig?"has-thumb":undefined}>{a.fig&&<Thumb id={a.fig}/>}<span className="d-card-t"><small>{a.no}</small><b>{a.title.split(":")[0]}</b><p>{a.dek}</p><em>Read →</em></span></a></li>;
function List({id}){const list=articles.filter(a=>a.section===id);return list.length?<div className="d-list"><span>{list.length} {list.length>1?"PAGES":"PAGE"}</span>
{grouped(id,list).map(([g,items],i)=>g?<section className="d-group" key={g.gid} aria-labelledby={`g-${g.gid}`}><h2 id={`g-${g.gid}`}>{g.label}</h2><p>{g.desc}</p>{items.length?<ol>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>:<p className="d-soon">{d.groupEmpty||"Coming soon."}</p>}</section>:<ol key={i}>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>)}</div>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}
