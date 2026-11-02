// Import your own architecture into the Lab, as text or as a JSON file (and export a design as JSON).
//
// Text: one chain per line, components joined by "->" (or "→"); lines starting with # are comments.
//   Clients 2000 rush -> Load Balancer -> Server:orders x4 m5.large auto up to 12 -> Cache 90% hits -> Database db.m5.large multi-az
//   Server:orders -> Queue -> Server:workers x2 -> Database
// A component is named by any of its catalogue `aliases` (longest match wins), optionally followed by
// ":label" to tell two of the same kind apart; the same kind and label on several lines is the same
// component. The rest of the item sets its options; anything not understood is reported, not guessed.
// The design is then laid out left to right and repaired against the catalogue (store.js cleanDesign).
import{cleanDesign}from"./store.js";

const norm=s=>s.toLowerCase().replace(/\s+/g," ").trim();
function aliasesOf(lab){const out=[];for(const c of lab.components)for(const a of [c.name,c.type,...(c.aliases||[])])out.push([norm(a),c]);return out.sort((a,b)=>b[0].length-a[0].length)}

// Read one item's options (everything after the name). Returns {config, unknown: [tokens]}.
function options(comp,rest){
  const config={},unknown=[];let s=" "+norm(rest)+" ";
  const take=(re,fn)=>{s=s.replace(re,(...m)=>{fn(...m);return" "})};
  if(comp.type==="client"){
    take(/\s(\d[\d,]*)\s*(?:rps|req\/s|requests?(?: per second| a second)?)?(?=\s)/,(_,n)=>{config.rps=+n.replace(/,/g,"")});
    for(const p of comp.patterns||[])for(const w of [p.id,norm(p.short),norm(p.label)])if(w&&s.includes(" "+w+" ")){config.pattern=p.id;s=s.replace(" "+w+" "," ")}
    take(/\s(rush|peaks?)\s/,()=>{const p=(comp.patterns||[]).find(x=>x.id==="meals");if(p)config.pattern=p.id});
    take(/\s(sale|spike)\s/,()=>{const p=(comp.patterns||[]).find(x=>x.id==="sale");if(p)config.pattern=p.id});
  }
  if(comp.type==="server"){
    take(/\s(?:x|×)\s?(\d+)(?=\s)|\s(\d+)\s?(?:x|×|instances?|servers?)(?=\s)/,(_,a,b)=>{config.count=+(a||b)});
    take(/\s(?:auto(?:scal(?:e|ing|ed))?)(?:\s+(?:up to|max|to)\s+(\d+))?(?=\s)/,(_,m)=>{config.autoscale=true;if(m)config.maxCount=+m});
    take(/\s(\d+)\s?(?:q|queries?)(?:\s?(?:\/|per|a)\s?(?:req|request))?(?=\s)|\sq(\d+)(?=\s)/,(_,a,b)=>{config.queriesPerRequest=+(a||b)});
  }
  if(comp.type==="cache"){
    take(/\s(\d+)\s?%\s?(?:hits?|hit rate)(?=\s)|\shits?\s(\d+)\s?%(?=\s)/,(_,a,b)=>{config.hitPct=+(a||b)});
    take(/\s(\d+)\s?%\s?writes?(?=\s)|\swrites?\s(\d+)\s?%(?=\s)/,(_,a,b)=>{config.writePct=+(a||b)});
    take(/\swrite[- ]?back(?=\s)/,()=>{config.writePolicy="back"});
    take(/\swrite[- ]?through(?=\s)/,()=>{config.writePolicy="through"});
    take(/\s(?:fail(?: when down)?|fail-closed)(?=\s)/,()=>{config.onDown="fail"});
  }
  if(comp.type==="database")take(/\smulti[- ]?az(?=\s)/,()=>{config.multiAz=true});
  // sizes by id, with or without the "db." / "cache." prefix
  if(comp.sizes)for(const tok of s.trim().split(" ").filter(Boolean)){const z=comp.sizes.find(x=>x.id===tok||x.id==="db."+tok||x.id==="cache."+tok);if(z){config.size=z.id;s=s.replace(" "+tok+" "," ")}}
  for(const tok of s.trim().split(" ").filter(Boolean))unknown.push(tok);
  return{config,unknown};
}

export function parseText(text,lab){
  const names=aliasesOf(lab),nodes=new Map(),edges=[],errors=[],warnings=[],seen=new Set();
  const lines=String(text||"").split(/\r?\n/);
  lines.forEach((raw,li)=>{
    const line=raw.replace(/#.*$/,"").trim();if(!line)return;const n=li+1;
    const items=line.split(/\s*(?:->|→|=>)\s*/).filter(x=>x.trim());
    if(items.length<1)return;
    const ids=[];
    for(const item of items){
      const low=norm(item);const hit=names.find(([a])=>low===a||low.startsWith(a+" ")||low.startsWith(a+":"));
      if(!hit){errors.push({line:n,message:`"${item.trim()}" is not a component I know. Try one of: ${lab.components.map(c=>c.name).join(", ")}.`});ids.push(null);continue}
      const[alias,comp]=hit;let rest=item.trim().slice(alias.length);let label="";
      const m=rest.match(/^\s*:\s*([\w.-]+)/);if(m){label=m[1].toLowerCase();rest=rest.slice(m[0].length)}
      const key=comp.type+(label?":"+label:"");const{config,unknown}=options(comp,rest);
      if(unknown.length)warnings.push({line:n,message:`Ignored "${unknown.join(" ")}" on ${comp.name}${label?":"+label:""}.`});
      if(!nodes.has(key))nodes.set(key,{id:key.replace(/[^a-z0-9:_-]/g,"-"),type:comp.type,label,config:{}});
      Object.assign(nodes.get(key).config,config);ids.push(key);
    }
    for(let i=0;i+1<ids.length;i++){const a=ids[i],b=ids[i+1];if(!a||!b)continue;const A=nodes.get(a),Bn=nodes.get(b);
      if(a===b){errors.push({line:n,message:`${A.type} can't send to itself.`});continue}
      if(Bn.type==="client"){errors.push({line:n,message:"Nothing can send traffic into Clients; they only send."});continue}
      if(A.type==="database"){errors.push({line:n,message:"A Database only receives; put it at the end of the line."});continue}
      const k=a+">"+b;if(!seen.has(k)){seen.add(k);edges.push({from:nodes.get(a).id,to:nodes.get(b).id})}}
  });
  const list=[...nodes.values()];
  if(!list.length&&!errors.length)errors.push({line:0,message:"Type at least one line, for example: Clients 1000 -> Server x2 -> Database"});
  return{design:layout({nodes:list.map(({id,type,config})=>({id,type,config})),edges},lab),errors,warnings};
}

// Left to right by depth from the Clients (longest path), stacked in each column, then repaired.
export function layout(design,lab){
  const depth=new Map(design.nodes.map(n=>[n.id,0]));
  for(let k=0;k<design.nodes.length;k++)for(const e of design.edges)if(depth.has(e.from)&&depth.has(e.to)&&depth.get(e.to)<depth.get(e.from)+1)depth.set(e.to,Math.min(depth.get(e.from)+1,design.nodes.length));
  const cols=new Map();for(const n of design.nodes){const d=depth.get(n.id);if(!cols.has(d))cols.set(d,[]);cols.get(d).push(n)}
  const nodes=design.nodes.map(n=>{const col=cols.get(depth.get(n.id)),i=col.indexOf(n);return{...n,x:depth.get(n.id)*240,y:Math.round((i-(col.length-1)/2)*150)}});
  return cleanDesign({name:"Imported design",nodes,edges:design.edges},lab,"import");
}

// JSON: what exportDesign() writes, or a bare {nodes, edges}. Repaired like saved designs.
export function parseJSON(text,lab){
  let d;try{d=JSON.parse(text)}catch{return{errors:[{line:0,message:"That file isn't valid JSON."}]}}
  const src=d&&d.tk==="lab-design"?d.design:d;
  if(!src||!Array.isArray(src.nodes)||!src.nodes.length)return{errors:[{line:0,message:"No components found. Export a design from the Lab, or give {\"nodes\": [...], \"edges\": [...]}."}]};
  const hasXY=src.nodes.every(n=>Number.isFinite(n?.x)&&Number.isFinite(n?.y));
  const clean=cleanDesign(src,lab,"import");
  if(!clean.nodes.length)return{errors:[{line:0,message:"None of those components are in the Lab's catalogue."}]};
  return{design:hasXY?clean:layout(clean,lab),errors:[],warnings:clean.nodes.length<src.nodes.length?[{line:0,message:`Skipped ${src.nodes.length-clean.nodes.length} component(s) the Lab doesn't know.`}]:[]};
}
export const exportDesign=d=>JSON.stringify({tk:"lab-design",version:1,design:{name:d.name,nodes:d.nodes,edges:d.edges}},null,2);
