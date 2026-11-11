// The schema editor: a dialog over the Lab for one database. Tables (collections, buckets…) with their
// fields, key, sort key, indexes and expiry, in the engine's own words (lab/schema.js `vocab`). Every
// change is cleaned and saved at once; problems the engine would have are listed under each table.
import React,{useEffect,useRef,useState}from"react";
import{TYPES,INDEX_KINDS,LIMITS,cleanSchema,schemaIssues,vocab}from"./schema.js";

const NAME=/^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const blankTable=(v,n)=>({name:`${v.table.toLowerCase().split(" ")[0].replace(/[^a-z]/g,"")||"table"}${n}`,fields:[{name:"id",type:"string"}],key:["id"]});

export default function SchemaEditor({engine,schema,title,save,close,suggest=[],shards=1}){
const v=vocab(engine);
// the draft keeps what is being typed (an empty or invalid name); what is valid is saved at once
const[draft,setDraft]=useState(()=>structuredClone(schema?.tables||[]));
const box=useRef(null);
useEffect(()=>{box.current?.querySelector("input,select,button")?.focus();const k=e=>{if(e.key==="Escape")close()};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[]);// eslint-disable-line
const put=tables=>{setDraft(tables);save(cleanSchema({tables}))};
const tab=(i,patch)=>put(draft.map((t,j)=>j===i?{...t,...patch}:t));
const issues=schemaIssues(engine,cleanSchema({tables:draft}));
const trap=e=>{if(e.key!=="Tab")return;const f=[...box.current.querySelectorAll("input,select,button")].filter(x=>!x.disabled);if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}};
return <div className="lab-score-back" onClick={e=>{if(e.target===e.currentTarget)close()}}>
<div className="sch" role="dialog" aria-modal="true" aria-label={`Schema: ${title}`} ref={box} onKeyDown={trap}>
<header><div><small>SCHEMA · {engine?.label||"Database"}</small><h3>{title}</h3></div><button type="button" className="lab-x" onClick={close} aria-label="Close the schema">✕</button></header>
<p className="sch-help">{engine?.schema?.allIndexed?`Every field of an ${v.table.toLowerCase()} is searchable by its type: long text by its words, locations by distance, the rest by value.`:`Each ${v.table.toLowerCase()} needs a ${v.key.toLowerCase()}${v.sortKey?` (and may have a ${v.sortKey.toLowerCase()})`:""}. ${v.indexKinds.length?`Add an ${v.index.toLowerCase()} for every other way you look rows up.`:`${engine?.label} has no secondary indexes: every query must give the ${v.key.toLowerCase()}.`}`} Request tests check that each call can be answered with this schema.</p>
{suggest.length>0&&<datalist id="sch-fields">{suggest.map(s=><option key={s} value={s}/>)}</datalist>}
{draft.map((t,i)=>{const fields=t.fields||[],names=fields.map(f=>f.name).filter(n=>NAME.test(n)),mine=issues.filter(x=>x.table===t.name),bad=!NAME.test(t.name||"")||draft.some((o,j)=>j!==i&&(o.name||"").toLowerCase()===(t.name||"").toLowerCase());
return <section key={i} className="sch-t" aria-label={`${v.table} ${t.name||i+1}`}>
<div className="sch-row"><label className="sch-name"><span>{v.table}</span><input value={t.name||""} onChange={e=>tab(i,{name:e.target.value.slice(0,40)})} aria-invalid={bad}/></label>
<button type="button" className="sch-del" onClick={()=>put(draft.filter((_,j)=>j!==i))}>Delete {v.table.toLowerCase()}</button></div>
{bad&&<p className="sch-err">Names start with a letter and use letters, digits and _ (each name once).</p>}
<table className="sch-f"><thead><tr><th>Field</th><th>Type</th><th>{v.key}</th><th><span className="sr">Remove</span></th></tr></thead><tbody>
{fields.map((f,k)=><tr key={k}><td><input value={f.name} list={suggest.length?"sch-fields":undefined} aria-label={`Field ${k+1} name`} aria-invalid={!NAME.test(f.name)} onChange={e=>{const old=f.name,nn=e.target.value.slice(0,40);tab(i,{fields:fields.map((x,j)=>j===k?{...x,name:nn}:x),key:(t.key||[]).map(x=>x===old?nn:x),...(t.sortKey===old?{sortKey:nn}:{}),...(t.ttl===old?{ttl:nn}:{}),indexes:(t.indexes||[]).map(ix=>({...ix,fields:ix.fields.map(x=>x===old?nn:x)}))})}}/></td>
<td><select value={f.type} aria-label={`Field ${f.name} type`} onChange={e=>tab(i,{fields:fields.map((x,j)=>j===k?{...x,type:e.target.value}:x)})}>{TYPES.map(([id,l])=><option key={id} value={id}>{l}</option>)}</select></td>
<td className="c"><input type="checkbox" aria-label={`${f.name} is part of the ${v.key.toLowerCase()}`} checked={(t.key||[]).includes(f.name)} onChange={e=>tab(i,{key:e.target.checked?fields.map(x=>x.name).filter(n=>n===f.name||(t.key||[]).includes(n)):(t.key||[]).filter(x=>x!==f.name)})}/></td>
<td><button type="button" className="lab-x" aria-label={`Remove field ${f.name}`} onClick={()=>tab(i,{fields:fields.filter((_,j)=>j!==k),key:(t.key||[]).filter(x=>x!==f.name),...(t.sortKey===f.name?{sortKey:undefined}:{}),...(t.ttl===f.name?{ttl:undefined}:{}),indexes:(t.indexes||[]).map(ix=>({...ix,fields:ix.fields.filter(x=>x!==f.name)})).filter(ix=>ix.fields.length)})}>✕</button></td></tr>)}
</tbody></table>
<button type="button" className="sch-add" disabled={fields.length>=LIMITS.fields} onClick={()=>tab(i,{fields:[...fields,{name:`field${fields.length+1}`,type:"string"}]})}>+ Add a field</button>
{(v.sortKey||v.ttl)&&<div className="sch-row">{v.sortKey&&<label className="sch-name"><span>{v.sortKey}</span><select value={t.sortKey||""} onChange={e=>tab(i,{sortKey:e.target.value||undefined})}><option value="">none</option>{names.filter(n=>!(t.key||[]).includes(n)).map(n=><option key={n}>{n}</option>)}</select></label>}
{v.ttl&&<label className="sch-name"><span>Expires at</span><select value={t.ttl||""} onChange={e=>tab(i,{ttl:e.target.value||undefined})}><option value="">never</option>{fields.filter(f=>f.type==="time").map(f=><option key={f.name}>{f.name}</option>)}</select></label>}</div>}
{shards>1&&<div className="sch-row"><label className="sch-name"><span>Shard by</span><select value={t.shardKey?.[0]||""} onChange={e=>tab(i,{shardKey:e.target.value?[e.target.value]:undefined})}><option value="">{(t.key||[])[0]?`${t.key[0]} (the first ${v.key.toLowerCase()} field)`:"the key"}</option>{names.map(n=><option key={n}>{n}</option>)}</select></label><small className="sch-none"> A lookup that gives this field goes to one of the {shards} shards; any other asks all of them.</small></div>}
{v.indexKinds.length>0&&<div className="sch-ix"><b>{v.index}es</b>{(t.indexes||[]).length===0&&<span className="sch-none"> none</span>}
{(t.indexes||[]).map((ix,k)=><div key={k} className="sch-row"><select value={ix.kind} aria-label={`${v.index} ${k+1} kind`} onChange={e=>tab(i,{indexes:t.indexes.map((x,j)=>j===k?{...x,kind:e.target.value}:x)})}>{INDEX_KINDS.filter(([id])=>v.indexKinds.includes(id)||id===ix.kind).map(([id,l])=><option key={id} value={id}>{l}</option>)}</select>
{Array.from({length:Math.min(v.maxIndexFields,ix.kind==="geo"||ix.kind==="text"?1:v.maxIndexFields)},(_,n)=><select key={n} value={ix.fields[n]||""} aria-label={`${v.index} ${k+1} field ${n+1}`} onChange={e=>{const fs=[...ix.fields];fs[n]=e.target.value;tab(i,{indexes:t.indexes.map((x,j)=>j===k?{...x,fields:fs.filter(Boolean)}:x)})}}><option value="">{n?"(then)":"field"}</option>{names.map(nm=><option key={nm}>{nm}</option>)}</select>)}
<button type="button" className="lab-x" aria-label={`Remove ${v.index.toLowerCase()} ${k+1}`} onClick={()=>tab(i,{indexes:t.indexes.filter((_,j)=>j!==k)})}>✕</button></div>)}
<button type="button" className="sch-add" disabled={(t.indexes||[]).length>=LIMITS.indexes||!names.length} onClick={()=>tab(i,{indexes:[...(t.indexes||[]),{kind:v.indexKinds[0],fields:[names.find(n=>!(t.key||[]).includes(n))||names[0]]}]})}>+ Add an {v.index.toLowerCase()}</button></div>}
{mine.length>0&&<ul className="sch-issues">{mine.map((x,k)=><li key={k} className={x.level}>{x.level==="error"?"✕ ":"! "}{x.text}</li>)}</ul>}
</section>})}
<div className="sch-foot"><button type="button" className="lab-btn" disabled={draft.length>=LIMITS.tables} onClick={()=>put([...draft,blankTable(v,draft.length+1)])}>+ Add a {v.table.toLowerCase()}</button><button type="button" className="lab-btn ghost" onClick={close}>Done</button></div>
</div></div>}
