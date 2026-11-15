// A shared design (context 36, step 11): /dashboard/problems/shared/#problems/shared/<data>. Read-only: the drawing, its
// parts and notes, and two ways on: open it in your sandbox, or open the problem it was drawn for. Open without signing in,
// so a link sent to a friend works; nothing is stored until the visitor chooses to copy it.
import React,{useEffect,useState}from"react";
import{getJSON}from"../api.js";import{Loading}from"../status.jsx";import{track}from"../analytics.js";
import{decodeShare}from"./share.js";import{toSvg,walkOrder}from"./export.js";import{catalogue}from"./engine.js";import{evalCatalogue}from"../eval/design.js";import{cleanDesign}from"./store.js";
import"../solve.css";

export const SANDBOX_IMPORT="tk-sandbox-import";
export default function SharedDesign({data,problemTitle}){const[st,setSt]=useState({});
useEffect(()=>{let on=true;Promise.all([decodeShare(data),getJSON("/v1/lab")]).then(([p,lab])=>{if(!on)return;if(!p){setSt({bad:true});return}
const d=cleanDesign({id:"shared",name:p.name,updated:1,nodes:p.design.nodes,edges:p.design.edges,...(p.design.v===2?{v:2}:{})},lab,"shared");if(!d||!d.nodes.length){setSt({bad:true});return}
setSt({p,d,lab});track("share_open",{problem:p.problem||"",parts:d.nodes.length})},()=>on&&setSt({bad:true}));return()=>{on=false}},[data]);
if(st.bad)return <section className="d-panel"><h1>This link doesn't open a design</h1><p className="d-desc">It may have been cut short when it was copied. Ask for the link again.</p><p><a href="#problems">← Problems</a></p></section>;
if(!st.d)return <Loading label="Opening the shared design"/>;
const{p,d,lab}=st,cat={...catalogue(lab),...evalCatalogue(lab)},svg=toSvg(d,cat,undefined,{title:p.name}),name=n=>n.name||cat[n.type]?.name||n.type;
const toSandbox=()=>{try{sessionStorage.setItem(SANDBOX_IMPORT,JSON.stringify({name:p.name,nodes:d.nodes,edges:d.edges}))}catch{}track("share_copy",{to:"sandbox"});location.hash="#problems/sandbox"};
return <section className="d-panel sh" aria-labelledby="sh-t"><label>SHARED DESIGN</label><h1 id="sh-t">{p.name}</h1>
<p className="d-desc">{d.nodes.length} parts{p.problem?<> · drawn for <a href={`#problems/${p.problem}`}>{problemTitle?.(p.problem)||p.problem}</a></>:null}. Read-only: copy it to change it or run it.</p>
<div className="sh-fig" dangerouslySetInnerHTML={{__html:svg}}/>
<p className="sh-acts"><button type="button" className="sv-run" onClick={toSandbox}>Open in my sandbox</button>{p.problem&&<a className="sv-linkbtn" href={`#problems/${p.problem}`}>Try the problem yourself →</a>}</p>
<h2>The parts</h2><ol className="sh-parts">{walkOrder(d).map(id=>{const n=d.nodes.find(x=>x.id===id);return n&&<li key={id}><b>{name(n)}</b>{n.name&&<small> · {cat[n.type]?.name}</small>}{n.note&&<p>{n.note}</p>}</li>})}</ol></section>}
