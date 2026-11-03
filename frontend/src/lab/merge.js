// Merging a signed-in user's Lab data from two places (this browser and the account on the API),
// used by both: the API merges what a browser sends into what it has stored, and the browser merges
// the API's answer into whatever changed locally meanwhile. Nothing here touches storage.
//
// Lab data: { designs: [design], deleted: [{id, at}], progress: {steps, stars, goals} }
// - A design is kept in its newest version (its `updated` time); a deletion wins over any version
//   saved before it, so a design deleted on one device doesn't come back from another.
// - Stars keep the best result per challenge, with the goals of that result; tour flags are joined.
import{cleanDesign}from"./store.js";import{cleanProgress}from"../progress.js";
export const MAX_DESIGNS=100,MAX_DELETED=500;
const fin=v=>typeof v==="number"&&Number.isFinite(v);
const text=v=>typeof v==="string"&&v.length>0&&v.length<=120;

// Repair one side: designs checked against the catalogue (store.js rules), at most MAX_DESIGNS of
// the newest; deletions as {id, at}; progress as progress.js reads it.
export function cleanLab(data,lab){
  const src=data&&typeof data==="object"?data:{};
  const designs=new Map();
  for(const d of Array.isArray(src.designs)?src.designs:[]){
    if(!d||!text(d.id))continue;const c=cleanDesign(d,lab,d.id);if(!c)continue;
    const prev=designs.get(c.id);if(!prev||c.updated>prev.updated)designs.set(c.id,c);
  }
  const deleted=new Map();
  for(const x of Array.isArray(src.deleted)?src.deleted:[])if(x&&text(x.id)&&fin(x.at))deleted.set(x.id,Math.max(x.at,deleted.get(x.id)||0));
  return{designs:[...designs.values()].sort((a,b)=>b.updated-a.updated).slice(0,MAX_DESIGNS),
    deleted:[...deleted].map(([id,at])=>({id,at})).sort((a,b)=>b.at-a.at).slice(0,MAX_DELETED),
    progress:plainProgress(cleanProgress(JSON.stringify(src.progress??null)))};
}
const plainProgress=p=>({steps:{...p.steps},stars:{...p.stars},goals:{...p.goals}});

export function mergeLab(a,b,lab){
  const x=cleanLab(a,lab),y=cleanLab(b,lab);
  const deleted=new Map();for(const d of [...x.deleted,...y.deleted])deleted.set(d.id,Math.max(d.at,deleted.get(d.id)||0));
  const designs=new Map();
  for(const d of [...x.designs,...y.designs]){const prev=designs.get(d.id);if(!prev||d.updated>prev.updated)designs.set(d.id,d)}
  for(const [id,at] of deleted){const d=designs.get(id);if(d&&d.updated<=at)designs.delete(id)}
  const stars={},goals={};
  for(const p of [x.progress,y.progress])for(const [id,n] of Object.entries(p.stars)){if(id==="__proto__")continue;
    const better=n>(stars[id]??-1)||(n===stars[id]&&!goals[id]&&p.goals[id]);
    if(better){stars[id]=n;if(p.goals[id])goals[id]=p.goals[id];else delete goals[id]}
  }
  return cleanLab({designs:[...designs.values()],deleted:[...deleted].map(([id,at])=>({id,at})),
    progress:{steps:{...x.progress.steps,...y.progress.steps},stars,goals}},lab);
}
