// Saved Lab designs (localStorage). Whatever is in the browser is treated as untrusted: an old
// format, a half-written value or a hand-edited one must never crash the Lab. readStore() keeps
// every design it can repair against the current catalogue and drops what it cannot.
// Shape (version 1): {version:1, current:id, designs:{id:{id,name,updated,nodes,edges}}}. (Designs saved by the v1
// Lab also kept the credit they had spent; it is dropped.)
import{cleanSchema}from"./schema.js";import{cleanDesign2}from"../eval/design.js";
export const STORE_KEY="tk-lab-v1";
export const STORE_VERSION=1;
// A design has at most this many components: more is never a real design and makes the canvas crawl.
export const MAX_NODES=200;
const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const fin=v=>typeof v==="number"&&Number.isFinite(v);
const text=v=>typeof v==="string"&&v.trim()!=="";
const has=(o,k)=>typeof k==="string"&&Object.prototype.hasOwnProperty.call(o,k);
// A component's own name: printable text, spaces collapsed, at most 40 characters; empty means none.
export const cleanName=v=>typeof v==="string"?v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g," ").replace(/\s+/g," ").trim().slice(0,40):"";
const clamp=(v,r)=>fin(v)&&r?Math.min(r.max,Math.max(r.min,v)):undefined;

// One design checked against the catalogue (lab.components). Returns a clean copy, or null.
export function cleanDesign(d,lab,id){
  if(!obj(d))return null;
  // A design of a v2 problem (v: 2) keeps the v2 settings (evaluator.md §12.1 point 5): it is cleaned against
  // the v2 catalogue. Without that catalogue it is cleaned as v1 and keeps its v: 2 mark.
  const v2=d.v===2&&!!lab?.eval;
  // the store doesn't know the problem's operations: any well-formed id in an arrow's carries is kept (the judge
  // cleans again with the real ones)
  if(v2){const ids=(Array.isArray(d.edges)?d.edges:[]).flatMap(e=>obj(e)&&Array.isArray(e.carries)?e.carries:[]);const c=cleanDesign2(d,lab,ids);d={...d,nodes:c.nodes,edges:c.edges}}
  const cat=Object.fromEntries((lab.components||[]).map(c=>[c.type,c]));
  const nodes=[],seen=new Set();
  for(const n of Array.isArray(d.nodes)?d.nodes:[]){
    if(nodes.length>=MAX_NODES)break;
    if(!obj(n)||!text(n.id)||seen.has(n.id)||!has(cat,n.type))continue;
    const c=cat[n.type],src=obj(n.config)?n.config:{},config={};
    if(c.type==="client"){if(clamp(src.rps,c.rps)!==undefined)config.rps=clamp(src.rps,c.rps);if(Array.isArray(c.patterns)&&c.patterns.some(p=>p.id===src.pattern))config.pattern=src.pattern}
    if(c.type==="server"){if(clamp(src.count,c.count)!==undefined)config.count=Math.round(clamp(src.count,c.count));
      if(typeof src.autoscale==="boolean")config.autoscale=src.autoscale;if(clamp(src.maxCount,c.count)!==undefined)config.maxCount=Math.max(config.count??c.count.default,Math.round(clamp(src.maxCount,c.count)));if(clamp(src.queriesPerRequest,c.queriesPerRequest)!==undefined)config.queriesPerRequest=clamp(src.queriesPerRequest,c.queriesPerRequest)}
    if(c.type==="cdn"){if(clamp(src.hitPct,c.hitPct)!==undefined)config.hitPct=clamp(src.hitPct,c.hitPct);if(typeof src.live==="boolean")config.live=src.live}
    if(c.type==="cache"){for(const k of["hitPct","writePct"])if(clamp(src[k],c[k])!==undefined)config[k]=clamp(src[k],c[k]);
      for(const k of["writePolicy","onDown"])if(c[k]&&Array.isArray(c[k].options)&&c[k].options.some(o=>o.id===src[k]))config[k]=src[k]}
    if(Array.isArray(c.engines)&&c.engines.some(e=>e.id===src.engine))config.engine=src.engine;
    {const e=Array.isArray(c.engines)?c.engines.find(x=>x.id===(config.engine??c.defaultEngine)):null,sizes=e&&Array.isArray(e.sizes)?e.sizes:c.sizes;if(Array.isArray(sizes)&&sizes.some(s=>s.id===src.size))config.size=src.size}
    if(Array.isArray(c.roles)&&c.roles.some(r=>r.id===src.role))config.role=src.role;
    if(c.type==="database"){if(typeof src.multiAz==="boolean")config.multiAz=src.multiAz;{const sc=cleanSchema(src.schema);if(sc)config.schema=sc}
      if(c.replicas&&clamp(src.replicas,c.replicas)!==undefined)config.replicas=Math.round(clamp(src.replicas,c.replicas));if(c.writePct&&clamp(src.writePct,c.writePct)!==undefined)config.writePct=clamp(src.writePct,c.writePct)}
    seen.add(n.id);const name=cleanName(n.name);nodes.push({id:n.id,type:n.type,x:fin(n.x)&&Math.abs(n.x)<1e6?n.x:0,y:fin(n.y)&&Math.abs(n.y)<1e6?n.y:0,...(name?{name}:{}),config});
  }
  if(v2){nodes.length=0;nodes.push(...d.nodes.slice(0,MAX_NODES))}
  const kind=Object.fromEntries(nodes.map(n=>[n.id,n.type])),edges=[],links=new Set();
  for(const e of Array.isArray(d.edges)?d.edges:[]){
    if(!obj(e)||!has(kind,e.from)||!has(kind,e.to)||e.from===e.to)continue;
    if(kind[e.to]==="client"||kind[e.from]==="database")continue;
    const k=e.from+"→"+e.to;if(links.has(k))continue;links.add(k);edges.push({from:e.from,to:e.to,...(v2&&Array.isArray(e.carries)?{carries:e.carries}:{})});
  }
  // a design started from a Lab challenge remembers which one (only if the catalogue still has it)
  const challenge=text(d.challenge)&&(lab.challenges||[]).some(c=>c&&c.id===d.challenge)?{challenge:d.challenge}:{};
  // a design opened from Problems remembers the question (its article slug)
  const problem=typeof d.problem==="string"&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(d.problem)?{problem:d.problem}:{};
  return{id,name:text(d.name)?d.name.slice(0,120):"Untitled design",updated:fin(d.updated)?d.updated:Date.now(),nodes,edges,...challenge,...problem,...(d.v===2?{v:2}:{})};
}

// Parse and repair the whole store. `raw` is the string from localStorage (or null).
export function readStore(raw,lab){
  let s;try{s=JSON.parse(raw)}catch{s=null}
  // own keys only: ids like "__proto__" or "constructor" must neither vanish nor match inherited properties
  const designs=Object.create(null);
  // Version 1 is the first versioned format; unversioned data from before has the same shape.
  if(obj(s)&&obj(s.designs))for(const[id,d]of Object.entries(s.designs)){const c=cleanDesign(d,lab,id);if(c)designs[id]=c}
  const current=obj(s)&&has(designs,s.current)?s.current:Object.keys(designs)[0];
  return{version:STORE_VERSION,current,designs};
}
