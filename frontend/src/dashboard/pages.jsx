import React from"react";import Problems,{Questions}from"../problems.jsx";import Numbers from"../numbers.jsx";import LibraryCards from"../library.jsx";import{c,d,articles}from"./site.js";
// The dashboard's start page (no tab selected): the three library cards. A card opens its section
// (tab selected in the sidebar and top bar) and that section's first article, or the section itself
// while it has none.
export function Home(){const href=x=>{const sec=d.sections.find(s=>s[2]===x.id)?.[0];if(!sec)return"#";const first=articles.find(a=>a.section===sec);return first?`#${sec}/${first.slug}`:`#${sec}`};
return <section className="d-panel d-start" aria-labelledby="d-title"><label>{c.topics.eyebrow}</label><h1 id="d-title">{c.topics.title}</h1><LibraryCards cards={c.topics.cards} href={href}/></section>}
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
const Item=({id,a})=><li><a href={`#${id}/${a.slug}`}><small>{a.no}</small><b>{a.title}</b><p>{a.dek}</p><em>Read →</em></a></li>;
function List({id}){const list=articles.filter(a=>a.section===id);return list.length?<div className="d-list"><span>{list.length} {list.length>1?"PAGES":"PAGE"}</span>
{grouped(id,list).map(([g,items],i)=>g?<section className="d-group" key={g.gid} aria-labelledby={`g-${g.gid}`}><h2 id={`g-${g.gid}`}>{g.label}</h2><p>{g.desc}</p>{items.length?<ol>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>:<p className="d-soon">{d.groupEmpty||"Coming soon."}</p>}</section>:<ol key={i}>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>)}</div>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}
