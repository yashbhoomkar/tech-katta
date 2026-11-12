// Shared by the canvas parts: design storage, positions, ids, formats, and the canvas context.
import{INK}from"../theme/palette.js";import React,{createContext}from"react";
import{MarkerType}from"@xyflow/react";
import{readStore,STORE_KEY,STORE_VERSION}from"./store.js";import{DELETED_KEY}from"../account.js";

export const deletedIds=()=>{try{return new Set(Object.keys(JSON.parse(localStorage.getItem(DELETED_KEY)||"{}")||{}))}catch{return new Set()}};

export const duration=h=>h<1?`${Math.round(h*60)} minutes`:h<48?`${Math.round(h)} hours`:h<24*90?`${Math.round(h/24)} days`:`${(h/730).toFixed(1)} months`;
// New components go to the nearest free spot around the point asked for, so they never stack.
export const W=176,H=110;
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
export const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:n.x??0,y:n.y??0},data:{kind:n.type,config:n.config||{},...(n.name?{name:n.name}:{})}})),edges:d.edges.map(e=>edge(e.from,e.to,e.carries))});
export const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x),y:Math.round(n.position.y),...(n.data.name?{name:n.data.name}:{}),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target,...(e.data?.carries?{carries:e.data.carries}:{})}))});
export const edge=(source,target,carries)=>({id:"e:"+JSON.stringify([source,target]),source,target,type:"arrow",markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16,color:INK},...(carries?{data:{carries}}:{})});

export const ICON={cdn:"M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5",client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",lb:"M10 3v4M10 7l-6 6M10 7l6 6M10 7v6M2 13h4v4H2zM8 13h4v4H8zM14 13h4v4h-4z",cache:"M11 2L4 11h5l-1 7 7-9h-5z",queue:"M2 7h16v6H2zM6 7v6M10 7v6M14 7v6",external:"M3 10h9M9 6l4 4-4 4M14 4h3v12h-3",realtime:"M4 10a6 6 0 0 1 12 0M7 10a3 3 0 0 1 6 0M10 10v7M7 17h6",stream:"M2 6h16M2 10h16M2 14h16M15 4l3 2-3 2",pubsub:"M10 4v4M10 8l-6 6M10 8l6 6M10 8v6M3 14h2v2H3zM9 14h2v2H9zM15 14h2v2h-2z",scheduler:"M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2",processor:"M2 6h6M2 10h6M2 14h6M8 4h6v12H8zM14 10h4",coord:"M10 3l6 3.5v7L10 17l-6-3.5v-7zM10 3v14M4 6.5l12 7M16 6.5l-12 7",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
export const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
export const level=u=>u>1+1e-9?"over":u>=0.7?"warn":"ok";
