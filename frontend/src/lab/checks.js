// Design checks while you build (spec 33 part 2): what would stop the design from working, found before Run, so a
// learner sees "Server reaches no database" the moment they draw it instead of after a test. Only the evaluator's
// first stage runs (compile: the graph and each call's plan), the same messages a Run shows first; no simulation,
// no numbers, nothing about the hidden tests. Plus three structural checks the compiler doesn't word: a part with no
// arrows, a part the Clients never reach, and a queue, stream or channel that nothing reads.
import{compile}from"../eval/compile.js";
const READS=new Set(["queue","stream","pubsub"]);
const MAX=6;
// → [{level: "error" | "warn", message, node?}] (errors first, at most MAX, no repeated message)
export function designChecks(design,lab,practice){
  if(!lab?.eval||practice?.v!==2||!Array.isArray(design?.nodes)||!design.nodes.length)return[];
  const out=[],seen=new Set(),add=(level,message,node)=>{if(!message||seen.has(message))return;seen.add(message);out.push({level,message,...(node?{node}:{})})};
  let r;try{r=compile(design,lab,practice)}catch{return[]}
  for(const e of r.errors||[])add("error",e.message,e.node);
  for(const op of practice.operations||[]){const p=r.plans?.[op.id];if(p&&!p.ok&&p.error)add("error",p.error.message,p.error.node)}
  const nodes=r.design?.nodes||design.nodes,edges=r.design?.edges||design.edges||[];
  const name=n=>n.name||lab.eval.components?.find(c=>c.type===n.type)?.name||lab.components?.find(c=>c.type===n.type)?.name||n.type;
  const outs=new Map(nodes.map(n=>[n.id,[]])),ins=new Map(nodes.map(n=>[n.id,0]));
  for(const e of edges)if(outs.has(e.from)&&ins.has(e.to)){outs.get(e.from).push(e.to);ins.set(e.to,ins.get(e.to)+1)}
  // reached from the Clients (or from a scheduler or an external service, where calls also begin)
  const seenFrom=new Set(),stack=nodes.filter(n=>n.type==="client"||n.type==="scheduler"||n.type==="external").map(n=>n.id);
  while(stack.length){const id=stack.pop();if(seenFrom.has(id))continue;seenFrom.add(id);stack.push(...(outs.get(id)||[]))}
  const hasClients=nodes.some(n=>n.type==="client");
  for(const n of nodes){const o=outs.get(n.id).length,i=ins.get(n.id);
    if(n.type!=="client"&&!o&&!i)add("warn",`${name(n)} isn't connected: draw an arrow to it or remove it.`,n.id);
    else if(hasClients&&!seenFrom.has(n.id))add("warn",`Nothing reaches ${name(n)}: no arrows lead to it from the Clients.`,n.id);
    else if(READS.has(n.type)&&!o)add("warn",`Nothing reads from ${name(n)}: draw an arrow from it to the worker that takes its messages.`,n.id)}
  out.sort((a,b)=>(a.level==="error"?0:1)-(b.level==="error"?0:1));
  return out.slice(0,MAX);
}
