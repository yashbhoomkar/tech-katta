// Shared by the canvas parts: design storage, positions, ids, formats, and the canvas context.
import{INK}from"../theme/palette.js";import React,{createContext}from"react";
import{MarkerType}from"@xyflow/react";
import{readStore,STORE_KEY,STORE_VERSION}from"./store.js";import{cleanArrowLook}from"./protocols.js";import{ICON,SX,SY}from"./drawing.js";export{ICON,TINT,SX,SY}from"./drawing.js";import{DELETED_KEY}from"../account.js";

export const deletedIds=()=>{try{return new Set(Object.keys(JSON.parse(localStorage.getItem(DELETED_KEY)||"{}")||{}))}catch{return new Set()}};

export const duration=h=>h<1?`${Math.round(h*60)} minutes`:h<48?`${Math.round(h)} hours`:h<24*90?`${Math.round(h/24)} days`:`${(h/730).toFixed(1)} months`;
// New components go to the nearest free spot around the point asked for, so they never stack.
export const W=200,H=96;
export function freeSpot(nodes,x,y){const hit=(px,py)=>nodes.some(n=>Math.abs(n.position.x-px)<W+20&&Math.abs(n.position.y-py)<H+20);
for(let ring=0;ring<12;ring++)for(let i=-ring;i<=ring;i++)for(const [dx,dy] of [[i,-ring],[i,ring],[-ring,i],[ring,i]]){const px=Math.round((x+dx*(W+40))/20)*20,py=Math.round((y+dy*(H+30))/20)*20;if(!hit(px,py))return{x:px,y:py}}return{x,y}}
export const usd=n=>"$"+Math.round(n).toLocaleString("en-US");
export const num=n=>Math.round(n).toLocaleString("en-US");
export const newId=p=>`${p}-${Math.random().toString(36).slice(2,8)}`;
export const Ctx=createContext(null);

// Designs live in localStorage (store.js); what is read back is checked and repaired first.
export const load=lab=>{let raw=null;try{raw=localStorage.getItem(STORE_KEY)}catch{}return readStore(raw,lab)};
export const save=s=>{try{localStorage.setItem(STORE_KEY,JSON.stringify({...s,version:STORE_VERSION}))}catch{}try{dispatchEvent(new Event("tk-lab-saved"))}catch{}};// a signed-in user's account syncs after saves (account.js)
// Add a new design to what is stored now (and make it the one the full Lab opens, unless current is null).
export const persistNew=(lab,d,current)=>{const latest=load(lab);latest.designs[d.id]=d;if(current)latest.current=current;save(latest)};
export const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:(n.x??0)*SX,y:(n.y??0)*SY},data:{kind:n.type,config:n.config||{},...(n.name?{name:n.name}:{})}})),edges:d.edges.map(e=>edge(e.from,e.to,e.carries,e))});
export const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x/SX),y:Math.round(n.position.y/SY),...(n.data.name?{name:n.data.name}:{}),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target,...(e.data?.carries?{carries:e.data.carries}:{}),...cleanArrowLook(e.data)}))});
// An arrow: what it carries (the judge reads it) and how it is drawn, its protocol and label (protocols.js).
export const edge=(source,target,carries,look)=>{const data={...(carries?{carries}:{}),...cleanArrowLook(look)};return{id:"e:"+JSON.stringify([source,target]),source,target,type:"arrow",markerEnd:{type:MarkerType.ArrowClosed,width:14,height:14,color:INK},...(Object.keys(data).length?{data}:{})}};

export const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
export const level=u=>u>1+1e-9?"over":u>=0.7?"warn":"ok";
