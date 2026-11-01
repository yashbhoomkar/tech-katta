// Saved Lab designs (localStorage). Whatever is in the browser is treated as untrusted: an old
// format, a half-written value or a hand-edited one must never crash the Lab. readStore() keeps
// every design it can repair against the current catalogue and drops what it cannot.
// Shape (version 1): {version:1, current:id, designs:{id:{id,name,updated,nodes,edges,credit}}}.
export const STORE_KEY="tk-lab-v1";
export const STORE_VERSION=1;
const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const fin=v=>typeof v==="number"&&Number.isFinite(v);
const text=v=>typeof v==="string"&&v.trim()!=="";
const has=(o,k)=>typeof k==="string"&&Object.prototype.hasOwnProperty.call(o,k);
const clamp=(v,r)=>fin(v)&&r?Math.min(r.max,Math.max(r.min,v)):undefined;

// One design checked against the catalogue (lab.components). Returns a clean copy, or null.
export function cleanDesign(d,lab,id){
  if(!obj(d))return null;
  const cat=Object.fromEntries((lab.components||[]).map(c=>[c.type,c]));
  const nodes=[],seen=new Set();
  for(const n of Array.isArray(d.nodes)?d.nodes:[]){
    if(!obj(n)||!text(n.id)||seen.has(n.id)||!has(cat,n.type))continue;
    const c=cat[n.type],src=obj(n.config)?n.config:{},config={};
    if(c.type==="client"){if(clamp(src.rps,c.rps)!==undefined)config.rps=clamp(src.rps,c.rps);if(Array.isArray(c.patterns)&&c.patterns.some(p=>p.id===src.pattern))config.pattern=src.pattern}
    if(c.type==="server"){if(clamp(src.count,c.count)!==undefined)config.count=Math.round(clamp(src.count,c.count));
      if(typeof src.autoscale==="boolean")config.autoscale=src.autoscale;if(clamp(src.maxCount,c.count)!==undefined)config.maxCount=Math.max(config.count??c.count.default,Math.round(clamp(src.maxCount,c.count)));if(clamp(src.queriesPerRequest,c.queriesPerRequest)!==undefined)config.queriesPerRequest=clamp(src.queriesPerRequest,c.queriesPerRequest)}
    if(c.type==="cache"){for(const k of["hitPct","writePct"])if(clamp(src[k],c[k])!==undefined)config[k]=clamp(src[k],c[k]);
      for(const k of["writePolicy","onDown"])if(c[k]&&Array.isArray(c[k].options)&&c[k].options.some(o=>o.id===src[k]))config[k]=src[k]}
    if(Array.isArray(c.sizes)&&c.sizes.some(s=>s.id===src.size))config.size=src.size;
    if(c.type==="database"&&typeof src.multiAz==="boolean")config.multiAz=src.multiAz;
    seen.add(n.id);nodes.push({id:n.id,type:n.type,x:fin(n.x)?n.x:0,y:fin(n.y)?n.y:0,config});
  }
  const kind=Object.fromEntries(nodes.map(n=>[n.id,n.type])),edges=[],links=new Set();
  for(const e of Array.isArray(d.edges)?d.edges:[]){
    if(!obj(e)||!has(kind,e.from)||!has(kind,e.to)||e.from===e.to)continue;
    if(kind[e.to]==="client"||kind[e.from]==="database")continue;
    const k=e.from+"→"+e.to;if(links.has(k))continue;links.add(k);edges.push({from:e.from,to:e.to});
  }
  const cr=obj(d.credit)?d.credit:{};
  return{id,name:text(d.name)?d.name.slice(0,120):"Untitled design",updated:fin(d.updated)?d.updated:Date.now(),nodes,edges,
    credit:{spent:fin(cr.spent)&&cr.spent>0?Math.min(cr.spent,lab.budget):0,hours:fin(cr.hours)&&cr.hours>0?cr.hours:0}};
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
