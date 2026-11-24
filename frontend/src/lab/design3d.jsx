import React,{useEffect,useRef,useState}from"react";import{W,H}from"./shared.jsx";
// The design canvas in 3D: the learner's parts as the 3D site's models, standing on a floor. It edits the same design as the 2D canvas (Canvas.jsx owns the
// nodes and arrows; this draws them and reports what the learner does): drag a part to move it, click to select (the inspector opens as usual), Connect to join
// two parts, drag from the palette to put a new one down, drag the floor to pan, scroll or pinch to zoom, Delete removes the selected part.
// Only on the 3D site (the engine is the page's: /3d/scripts/world.js) and with WebGL; otherwise Canvas.jsx keeps the 2D canvas.
const BASE="/3d/scripts/";
let engine=null;const load=()=>engine||=Promise.all([import(/* @vite-ignore */BASE+"world.js"),import(/* @vite-ignore */BASE+"replay3d.js")]).then(([w,r])=>({createWorld:w.createWorld,...r}));
/** how much of the canvas's left the problem card and the parts column cover, as the screen fraction where the design should be centred */
const sxOf=el=>{const r=el.getBoundingClientRect();if(r.width<50)return .5;const lx=Math.max(0,...[".sv-q",".sv-tabs",".lab-pal"].map(q=>{const e=document.querySelector(q),b=e&&e.getBoundingClientRect();return b&&b.width>0&&b.height>0&&b.right>r.left&&b.left<r.left+r.width/2?b.right-r.left+8:0}));return (lx+(r.width-lx)/2)/r.width};
// a card's size (shared.jsx): the centre of a part is its card's centre
export const mode3dWanted=()=>{try{return localStorage.getItem("tk-design-view")!=="2d"}catch{return true}};
export const saveMode3d=on=>{try{localStorage.setItem("tk-design-view",on?"3d":"2d")}catch{}};
export const host3d=()=>typeof window!=="undefined"&&typeof window.tkGo==="function";

export function Design3D({nodes,edges,names,api,onMove,onSelect,onConnect,onRemove,onFail}){
const cv=useRef(null),ov=useRef(null),eng=useRef(null),origin=useRef(null),fitted=useRef(false),live=useRef({});const[ready,setReady]=useState(false),[connect,setConnect]=useState(false),[from,setFrom]=useState(null),[note,setNote]=useState("");
live.current={nodes,onMove,onSelect,onConnect,onRemove,connect,from};
const centre=n=>({x:n.position.x+W/2,y:n.position.y+H/2});
useEffect(()=>{let alive=true,world=null,cleanup=()=>{};
load().then(m=>{if(!alive)return;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;world=m.createWorld(cv.current,ov.current,{reduced,still:false});if(!world){onFail?.();return}
 const ns=live.current.nodes;let ox=0,oy=0;if(ns.length){const cs=ns.map(centre);ox=(Math.min(...cs.map(c=>c.x))+Math.max(...cs.map(c=>c.x)))/2;oy=(Math.min(...cs.map(c=>c.y))+Math.max(...cs.map(c=>c.y)))/2}origin.current=[ox,oy];
 eng.current={world,m};
 const toWorld=n=>{const c=centre(n);return[(c.x-ox)/m.SCALE,(c.y-oy)/m.SCALE]};
 api.current={groundAt:(x,y)=>world.groundAt(x,y),toFlow:g=>({x:g[0]*m.SCALE+ox,y:g[1]*m.SCALE+oy}),centerFlow:()=>{const t=world.getCamera().t;return{x:t[0]*m.SCALE+ox,y:t[1]*m.SCALE+oy}},fit:()=>{const f=world.frame();world.setCamera({t:f.t,dist:f.dist*.95,az:42,el:32,sx:sxOf(cv.current),sy:.52})}};
 // pointer: drag a part, pan the floor, pinch and wheel to zoom
 const el=cv.current,ptrs=new Map();let drag=null,pinch=0;
 const down=e=>{el.setPointerCapture?.(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);const L=live.current;
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);drag=null;return}
  const id=world.pickAt(e.clientX,e.clientY);
  if(L.connect&&id){if(!L.from){setFrom(id)}else if(L.from!==id){const ok=L.onConnect(L.from,id);setFrom(null);if(ok===false){setNote("That arrow is not allowed there: see the line at the top for what a part can send to.");setTimeout(()=>setNote(""),3500)}else setConnect(false)}return}
  const g=world.groundAt(e.clientX,e.clientY);
  if(id){const n=L.nodes.find(x=>x.id===id);L.onSelect([id]);if(n&&g)drag={kind:"part",id,g0:g,c0:centre(n),moved:false}}
  else if(g)drag={kind:"pan",g0:g,t0:world.getCamera().t,moved:false,x:e.clientX,y:e.clientY}};
 const move=e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch>0){const c=world.getCamera();world.setCamera({dist:Math.max(6,Math.min(80,c.dist*pinch/d))},{instant:true})}pinch=d;return}
  if(!drag)return;const g=world.groundAt(e.clientX,e.clientY);if(!g)return;
  if(drag.kind==="part"){const dx=(g[0]-drag.g0[0])*m.SCALE,dz=(g[1]-drag.g0[1])*m.SCALE;if(Math.abs(dx)+Math.abs(dz)>3)drag.moved=true;if(drag.moved)live.current.onMove(drag.id,{x:drag.c0.x+dx-W/2,y:drag.c0.y+dz-H/2})}
  else{if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>4)drag.moved=true;if(drag.moved){const t=world.getCamera().t;world.setCamera({t:[t[0]-(g[0]-drag.g0[0]),t[1]-(g[1]-drag.g0[1])]},{instant:true})}}};
 const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0;if(drag?.kind==="pan"&&!drag.moved)live.current.onSelect([]);drag=null};
 const wheel=e=>{e.preventDefault();const c=world.getCamera();world.setCamera({dist:Math.max(6,Math.min(80,c.dist*Math.exp(e.deltaY*.0012)))})};
 el.addEventListener("pointerdown",down);el.addEventListener("pointermove",move);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("wheel",wheel,{passive:false});
 cleanup=()=>{el.removeEventListener("pointerdown",down);el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);el.removeEventListener("wheel",wheel)};
 setReady(true)}).catch(()=>onFail?.());
return()=>{alive=false;cleanup();api.current=null;eng.current=null;try{world?.destroy()}catch{}}},[]);// eslint-disable-line
// the design, as a system; selected parts glow amber, the part a connection starts from green
useEffect(()=>{const c=eng.current;if(!ready||!c)return;const{world,m}=c,[ox,oy]=origin.current;
 const parts={},paths={},st={},labels={};
 nodes.forEach(n=>{const cc=centre(n);parts[n.id]={kind:m.kindOf(n.data?.kind),x:(cc.x-ox)/m.SCALE,z:(cc.y-oy)/m.SCALE,name:n.data?.name||names[n.data?.kind]||n.data?.kind,...(n.data?.kind==="database"&&n.data?.config?.replicas?{layers:2}:{})};st[n.id]=n.id===from?"ok":n.selected?"warn":"";labels[n.id]=["",""]});
 edges.forEach((e,i)=>{if(parts[e.source]&&parts[e.target])paths["e"+i]=[e.source,e.target]});
 world.setSystem({parts,paths});world.setState({parts:st,paths:{},labels,speed:.5});
 if(!fitted.current&&nodes.length){fitted.current=true;const f=world.frame();world.setCamera({t:f.t,dist:f.dist*.95,az:42,el:32,sx:sxOf(cv.current),sy:.52},{instant:true})}
 else if(!fitted.current){world.setCamera({t:[0,0],dist:16,az:42,el:32,sx:sxOf(cv.current),sy:.52},{instant:true})}},[ready,nodes,edges,from,names]);
useEffect(()=>{const k=e=>{if(e.key==="Escape"){setConnect(false);setFrom(null)}else if((e.key==="Delete"||e.key==="Backspace")&&!/^(input|textarea|select)$/i.test(document.activeElement?.tagName||"")){const sel=live.current.nodes.filter(n=>n.selected).map(n=>n.id);if(sel.length){e.preventDefault();live.current.onRemove(sel)}}};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[]);
return <div className={"d3"+(connect?" connecting":"")} role="application" aria-label="Your design in 3D. Drag a part to move it, drag the floor to move around, scroll to zoom.">
<canvas ref={cv}/><div ref={ov} className="overlay d3-ov"/>
<div className="d3-tools" role="toolbar" aria-label="3D view"><button type="button" className={connect?"on":""} aria-pressed={connect} onClick={()=>{setConnect(c=>!c);setFrom(null)}} title="Join two parts with an arrow: click one, then the other">Connect</button><button type="button" onClick={()=>api.current?.fit()} title="Fit the design to the screen">Fit</button></div>
<p className="d3-hint" role="status">{note?note:!ready?"Building the 3D view…":connect?(from?"Now click the part it sends to":"Click the part the arrow starts at"):nodes.length?"Drag a part to move it · drag the floor to pan · scroll to zoom":"Drag a component from the left onto the floor"}</p>
</div>}
