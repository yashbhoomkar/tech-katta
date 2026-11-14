// The component palette beside the canvas.
import React,{useState}from"react";
import{Glyph}from"./shared.jsx";
// Palette items are dragged with pointer events (mouse, trackpad, touch, pen) rather than HTML5
// drag-and-drop, which Firefox does not start from buttons and touch screens do not support.
// A press that moves less than 6 px is a tap/click and adds the component at a free spot; a drag
// shows a ghost under the pointer and drops the component where it is released over the canvas.
export function Palette({lab,comps:all=lab.components,onAdd,onDropAt,setDragging,narrow,setNarrow}){const[ghost,setGhost]=useState(null);const[q,setQ]=useState("");
// Search (context 36, step 2): by name, kind or what it does; Enter adds the first match.
const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);const comps=narrow||!words.length?all:all.filter(c=>{const t=`${c.name} ${c.type} ${c.group} ${c.desc}`.toLowerCase();return words.every(w=>t.includes(w))}).map((c,i)=>{const n=c.name.toLowerCase(),q0=words.join(" ");return[n.startsWith(q0)?0:n.includes(q0)?1:words.every(w=>n.includes(w))?2:3,i,c]}).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x[2]);const groups=[...new Set(comps.map(c=>c.group))];
const press=(e,c)=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.preventDefault();const sx=e.clientX,sy=e.clientY;let moved=false;
const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;if(!moved){moved=true;setDragging(true)}setGhost({c,x:ev.clientX,y:ev.clientY})};
const end=ok=>ev=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);removeEventListener("pointercancel",cancel);setGhost(null);setDragging(false);if(!ok)return;if(moved)onDropAt(c.type,ev.clientX,ev.clientY);else onAdd(c.type)};
const up=end(true),cancel=end(false);addEventListener("pointermove",move);addEventListener("pointerup",up);addEventListener("pointercancel",cancel)};
return <aside className="lab-pal" aria-label="Components"><div className="lab-h"><span>COMPONENTS</span>{setNarrow&&<button type="button" className="lab-pal-toggle" onClick={()=>setNarrow(!narrow)} aria-pressed={!!narrow} title={narrow?"Show the names":"Icons only: more room for the canvas"} aria-label={narrow?"Show component names":"Show icons only"}>{narrow?"»":"«"}</button>}</div>
{!narrow&&<input className="lab-pal-search" type="search" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&comps[0]){e.preventDefault();onAdd(comps[0].type);setQ("")}else if(e.key==="Escape")setQ("")}} placeholder="Search parts" aria-label="Search components"/>}{!comps.length&&<p className="lab-tip">No part matches “{q}”.</p>}
{groups.map(g=><div key={g}><div className="lab-g">{g}</div>{comps.filter(c=>c.group===g).map(c=>
<button key={c.type} type="button" className="lab-item" onPointerDown={e=>press(e,c)} onClick={e=>{if(e.detail===0)onAdd(c.type)}} title={`${c.name}. ${c.desc} Drag onto the canvas, or tap to add.`} aria-label={c.name}>
<Glyph kind={c.type}/><span>{c.name}</span></button>)}</div>)}
{ghost&&<div className="lab-ghost" style={{left:ghost.x,top:ghost.y}} aria-hidden="true"><Glyph kind={ghost.c.type}/>{ghost.c.name}</div>}
<p className="lab-tip">Drag a component onto the canvas, or tap it to add it. Connect two components by dragging from a dot on the edge of one to the other. Select a component or an arrow to change it; Delete removes it. F fits the design to the screen. Prices are approximate AWS on-demand list prices for Mumbai, for learning only.</p></aside>}
