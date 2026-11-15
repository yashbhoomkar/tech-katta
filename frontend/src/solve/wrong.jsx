// The wrong-design gallery (context 36, step 13): the problem's common wrong designs, each with the test it fails and
// why, drawn read-only. In the Solution tab, open once the problem is solved; before that, one button opens it anyway.
import React,{useEffect,useState}from"react";import{getJSON}from"../api.js";import{track}from"../analytics.js";
import{toSvg}from"../lab/export.js";import{catalogue}from"../lab/engine.js";import{evalCatalogue}from"../eval/design.js";import{cleanDesign}from"../lab/store.js";

function Drawing({w,lab,v2}){if(!lab)return null;const d=cleanDesign({id:"wrong",name:w.name,updated:1,nodes:w.nodes,edges:w.edges,...(v2?{v:2}:{})},lab,"wrong");
if(!d)return null;const cat={...catalogue(lab),...evalCatalogue(lab)};return <div className="sh-fig sv-wrong-fig" dangerouslySetInnerHTML={{__html:toSvg(d,cat,undefined,{title:w.name})}}/>}

export function WrongGallery({slug,P,lab,solved}){const[list,setList]=useState(null),[shown,setShown]=useState(false);const open=solved||shown;
useEffect(()=>{if(!open||list?.slug===slug)return;let on=true;getJSON(`/v1/articles/${slug}/wrong`).then(v=>{if(on)setList(v)},()=>{if(on)setList({slug,designs:[]})});return()=>{on=false}},[open,slug,list]);
const test=id=>P?.tests?.find(t=>t.id===id);
if(!open)return <section className="sv-wrong" aria-labelledby="sv-wrong-h"><h2 id="sv-wrong-h">Common wrong designs</h2><p className="sv-help">Designs that look right and fail, each with the test that catches it. They open here when you solve the problem.</p><button type="button" className="sv-linkbtn" onClick={()=>{setShown(true);track("wrong_gallery",{slug,early:true})}}>Show them now</button></section>;
if(!list||list.slug!==slug)return <section className="sv-wrong"><h2>Common wrong designs</h2><p className="sv-help">Loading…</p></section>;
if(!list.designs.length)return null;
return <section className="sv-wrong" aria-labelledby="sv-wrong-h"><h2 id="sv-wrong-h">Common wrong designs</h2><p className="sv-help">{list.designs.length} designs that look right and fail. Open one for its drawing.</p>
<ul>{list.designs.map((w,i)=>{const t=test(w.fails);return <li key={i}><details onToggle={e=>{if(e.currentTarget.open)track("wrong_open",{slug,name:w.name})}}><summary><b>{w.name}</b><span className="sv-wrong-fails">fails {t?.name||w.fails}</span></summary>
<p>{w.why}</p>{t?.desc&&<p className="sv-help">The test: {t.desc}</p>}<Drawing w={w} lab={lab} v2={P?.v===2}/></details></li>})}</ul></section>}
