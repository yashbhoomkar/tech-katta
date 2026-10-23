const KEY = "tk-architecture-workspace-v1";
const initialNodes = [
  {id:"client",type:"Client",title:"Web / Mobile client",x:40,y:72,subtitle:"User entry point"},
  {id:"gateway",type:"API Gateway",title:"API gateway",x:260,y:72,subtitle:"Auth · rate limits"},
  {id:"service",type:"Service",title:"Application service",x:480,y:72,subtitle:"Business logic"},
  {id:"cache",type:"Cache",title:"Redis cache",x:260,y:250,subtitle:"Hot reads · TTL"},
  {id:"database",type:"Database",title:"Primary database",x:480,y:250,subtitle:"Durable state"}
];
const initialEdges = [
  {id:"e1",from:"client",to:"gateway",label:"HTTPS"},
  {id:"e2",from:"gateway",to:"service",label:"request"},
  {id:"e3",from:"service",to:"cache",label:"read-through"},
  {id:"e4",from:"service",to:"database",label:"read / write"}
];
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function load() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) return {...value,scenario:value.scenario||scenarios[0].id,notes:value.notes||""}; } catch {}
  return {nodes:initialNodes.map(n=>({...n})),edges:initialEdges.map(e=>({...e})),scenario:scenarios[0].id,notes:""};
}
let connectMode = false;
let connectFrom = null;
let selected = null;
let serial = 1;
const kinds = ["Load balancer","Service","Cache","Queue","Database","Object storage","Search index","Worker","External API","CDN"];
const scenarios = [
 {id:"url-shortener",title:"Design a URL shortener",level:"Intermediate · 35 min",brief:"Build a short-link service with fast redirects, safe link creation, expiry, and click analytics.",requirements:["Redirects should be low-latency and highly available.","Link creation must avoid collisions and handle retries safely.","Popular links may receive highly skewed traffic.","Click analytics must not slow down redirects."],deepDive:"How would you handle a viral link, cache invalidation, and regional failover?"},
 {id:"news-feed",title:"Design a social news feed",level:"Intermediate · 45 min",brief:"Build a ranked home feed for users following accounts, with fresh posts and cursor-based pagination.",requirements:["Support feed reads at much higher volume than post creation.","Handle creators with millions of followers.","Feed generation and ranking can be asynchronous.","Privacy changes and deletions must propagate."],deepDive:"When would you switch from fan-out-on-write to fan-out-on-read?"},
 {id:"chat",title:"Design real-time chat",level:"Intermediate · 45 min",brief:"Build messaging with durable history, online delivery, and offline notifications.",requirements:["Persist a message before acknowledging durable acceptance.","Retries can create duplicate deliveries.","Support online and offline recipients.","Define ordering boundaries and delivery semantics."],deepDive:"What happens when a gateway fails while a user is sending a message?"},
 {id:"rate-limiter",title:"Design a distributed rate limiter",level:"Core pattern · 30 min",brief:"Enforce per-user and per-key request limits across many application instances.",requirements:["Support burst allowances and a defined quota window.","Coordinate instances without one global bottleneck.","Keep enforcement low-latency.","Choose fail-open or fail-closed behavior explicitly."],deepDive:"Compare token bucket and sliding-window strategies under concurrency."},
 {id:"ride-hailing",title:"Design ride-hailing dispatch",level:"Advanced · 50 min",brief:"Match riders to nearby drivers while handling live locations, trip state, and traffic spikes.",requirements:["Ingest frequent driver location updates.","Find nearby available drivers with bounded latency.","Prevent conflicting assignments and invalid trip transitions.","Handle regional outages and event replay."],deepDive:"How would you partition geo-indexes and avoid assigning one driver twice?"}
];
const rubric = [
 {label:"Requirements",weight:12,terms:["functional","non-functional","latency","availability","scope","requirement","sla","consistency","freshness"]},
 {label:"Capacity estimation",weight:14,terms:["rps","qps","throughput","requests per second","read/write","storage","bandwidth","peak","million","billion","estimate","traffic","growth"]},
 {label:"Data model & access patterns",weight:12,terms:["schema","entity","index","partition key","query","access pattern","relational","database","consistency","ttl","primary key"]},
 {label:"API design",weight:10,terms:["api","endpoint","pagination","idempotency","authorization","request","response","cursor","http"]},
 {label:"Architecture & request flow",weight:16,terms:["load balancer","service","cache","queue","worker","replica","database","gateway","flow","component","object storage","cdn","request path"]},
 {label:"Scalability & bottlenecks",weight:12,terms:["horizontal","shard","partition","hot key","fan-out","cache hit","replication","backpressure","bottleneck","autoscal","10x","scale"]},
 {label:"Reliability & security",weight:14,terms:["retry","timeout","failover","dead letter","duplicate","disaster recovery","backup","circuit breaker","degraded","recovery","failure","idempotent","auth","rate limit","encryption"]},
 {label:"Trade-offs & observability",weight:10,terms:["trade-off","tradeoff","alternative","cost","monitor","metric","p95","p99","logging","alert","why","versus"," vs ","dashboard"]}
];
let model = load();
function evaluate() {
 const text=String(model.notes||"").toLowerCase();
 const types=new Set(model.nodes.map(n=>n.type.toLowerCase()));
 const connected=new Set(model.edges.flatMap(e=>[e.from,e.to]));
 const diagramChecks=[
  {label:"Entry point",ok:[...types].some(t=>t.includes("client")||t.includes("gateway"))},
  {label:"Compute / business logic",ok:[...types].some(t=>t.includes("service")||t.includes("worker"))},
  {label:"Persistent data store",ok:[...types].some(t=>t.includes("database")||t.includes("storage")||t.includes("search"))},
  {label:"Connected request flow",ok:model.edges.length>0&&connected.size>=Math.min(3,model.nodes.length)},
  {label:"Scale / resilience component",ok:[...types].some(t=>t.includes("queue")||t.includes("cache")||t.includes("load balancer"))},
  {label:"No isolated components",ok:model.nodes.length>0&&model.nodes.every(n=>model.edges.some(e=>e.from===n.id||e.to===n.id))}
 ];
 const dimensions=rubric.map(r=>{
   const found=r.terms.filter(term=>text.includes(term));
   const coverage=Math.min(1,found.length/Math.max(2,Math.ceil(r.terms.length*.22)));
   const diagramBoost=(r.label==="Architecture & request flow"&&diagramChecks[0].ok&&diagramChecks[1].ok&&diagramChecks[3].ok)?0.22:(r.label==="Data model & access patterns"&&diagramChecks[2].ok)?0.15:(r.label==="Reliability & security"&&diagramChecks[4].ok)?0.12:0;
   const score=Math.min(100,Math.round(coverage*78+diagramBoost*100));
   return {...r,found,score};
 });
 const combined=Math.round(dimensions.reduce((sum,d)=>sum+d.score*d.weight,0)/100);
 const checks=[...diagramChecks,...dimensions.map(d=>({label:d.label,ok:d.score>=45,detail:d.found.length?d.found.slice(0,3).join(", "):"Add explicit evidence to your design rationale"}))];
 return {checks,points:combined,dimensions};
}
function edgeMarkup(edge) {
  const a=model.nodes.find(n=>n.id===edge.from), b=model.nodes.find(n=>n.id===edge.to);
  if (!a || !b) return "";
  const x1=a.x+92,y1=a.y+44,x2=b.x+92,y2=b.y+44, mx=(x1+x2)/2,my=(y1+y2)/2-10;
  return `<g class="ws-edge"><path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" marker-end="url(#ws-arrow)"/><text x="${mx}" y="${my}">${esc(edge.label||"request")}</text></g>`;
}
export function architectureWorkspace() {
  const report=evaluate();
  return `<main class="page-main ws-page">
    <div class="page-hero ws-hero"><div><div class="eyebrow">SYSTEM DESIGN STUDIO · INTERACTIVE CANVAS</div><h1>Design the system.<br><em>Defend every choice.</em></h1><p>Choose an interview brief, build the architecture, and document the reasoning behind your decisions. Your work is saved in this browser.</p></div><div class="ws-score"><span>DESIGN REVIEW</span><strong>${report.points}<small>/100</small></strong><small>${report.dimensions.filter(d=>d.score>=45).length} of ${report.dimensions.length} reasoning dimensions have evidence</small></div></div>
    <div class="ws-briefbar"><label>INTERVIEW PROMPT<select id="ws-scenario">${scenarios.map(sc=>`<option value="${sc.id}" ${sc.id===(model.scenario||scenarios[0].id)?"selected":""}>${esc(sc.title)}</option>`).join("")}</select></label><div class="ws-brief-copy"><span>${esc((scenarios.find(sc=>sc.id===(model.scenario||scenarios[0].id))||scenarios[0]).level)}</span><p>${esc((scenarios.find(sc=>sc.id===(model.scenario||scenarios[0].id))||scenarios[0]).brief)}</p></div></div>
    <div class="ws-toolbar"><div class="ws-toolgroup"><button class="button-primary small" data-ws-add>＋ Add component</button><button class="button-secondary small ${connectMode?"is-active":""}" data-ws-connect>${connectMode?"Select source, then target":"↗ Connect nodes"}</button></div><div class="ws-toolgroup"><button class="button-secondary small" data-ws-export>Export design JSON</button><button class="button-secondary small" data-ws-delete ${selected?"":"disabled"}>Delete selected</button><button class="button-secondary small" data-ws-reset>Reset canvas</button></div></div>
    <section class="ws-board-shell"><div class="ws-board-meta"><span><i class="ws-status-dot"></i> ${esc(model.nodes.length)} components · ${esc(model.edges.length)} connections</span><span>Drag nodes · connect mode to draw arrows</span></div>
      <div class="ws-board" id="ws-board"><svg class="ws-wires" id="ws-wires" viewBox="0 0 900 560" preserveAspectRatio="none"><defs><marker id="ws-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor"/></marker></defs>${model.edges.map(edgeMarkup).join("")}</svg>
      ${model.nodes.map(n=>`<button class="ws-node ${selected===n.id?"selected":""}" data-ws-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px" aria-label="Select ${esc(n.title)}"><span class="ws-node-icon">${esc(n.type.slice(0,2).toUpperCase())}</span><span class="ws-node-copy"><b>${esc(n.title)}</b><small>${esc(n.subtitle||n.type)}</small></span><span class="ws-node-grip">⠿</span></button>`).join("")}
      </div><div class="ws-board-foot"><span>↔ Move nodes to organize the flow</span><span>Original Tech Katta workspace · local save</span></div></section>
    <div class="ws-lower"><section class="ws-panel"><div class="ws-panel-heading"><div><div class="eyebrow">DESIGN REVIEW</div><h2>Evidence & completeness</h2></div><span class="ws-mini-score">${report.points}%</span></div>${report.checks.map(c=>`<div class="ws-check ${c.ok?"pass":"missing"}"><span>${c.ok?"✓":"○"}</span><div><b>${c.label}</b><small>${c.ok?(c.detail||"Evidence or structure detected"):(c.detail||"Add evidence to your diagram or rationale")}</small></div></div>`).join("")}<p class="ws-disclaimer">The report combines visible diagram structure with keyword coverage in your rationale. It is a transparent heuristic, not an AI judge or proof of technical correctness.</p></section>
    <section class="ws-panel"><div class="eyebrow">DESIGN RATIONALE</div><h2>Explain your decisions</h2><p class="ws-inspector-copy">Capture assumptions, estimates, API choices, data access patterns, failure handling, and trade-offs. The review checks for explicit evidence across these areas.</p><label class="ws-field">Design notes<textarea id="ws-notes" rows="9" placeholder="Requirements: ...&#10;Capacity: ...&#10;Data model and APIs: ...&#10;Architecture and request flow: ...&#10;Failure handling, security, and trade-offs: ...">${esc(model.notes||"")}</textarea></label><div class="ws-prompt-tip"><b>Deep-dive question</b><p>${esc((scenarios.find(sc=>sc.id===(model.scenario||scenarios[0].id))||scenarios[0]).deepDive)}</p></div><div class="ws-dimension-grid">${report.dimensions.map(d=>`<div><span>${esc(d.label)}</span><b>${d.score}%</b></div>`).join("")}</div></section></div>
    <section class="ws-panel"><div class="eyebrow">SELECTED COMPONENT</div><h2>${selected && model.nodes.some(n=>n.id===selected) ? esc(model.nodes.find(n=>n.id===selected).title) : "Component inspector"}</h2><p class="ws-inspector-copy">${selected && model.nodes.some(n=>n.id===selected) ? "Edit the component label and responsibility." : "Select a node on the canvas to inspect it. Add components to represent infrastructure and data flows."}</p>${selected && model.nodes.some(n=>n.id===selected) ? `<label class="ws-field">Component name<input id="ws-title" maxlength="70" value="${esc(model.nodes.find(n=>n.id===selected).title)}"></label><label class="ws-field">Responsibility<input id="ws-subtitle" maxlength="100" value="${esc(model.nodes.find(n=>n.id===selected).subtitle||"")}"></label><label class="ws-field">Type<select id="ws-type">${[...new Set([model.nodes.find(n=>n.id===selected).type,...kinds,"Client","API Gateway"])].map(k=>`<option ${k===model.nodes.find(n=>n.id===selected).type?"selected":""}>${esc(k)}</option>`).join("")}</select></label><button class="button-primary small" data-ws-save-inspector>Save component</button>` : `<div class="ws-inspector-empty"><span>＋</span><b>Start with a clear responsibility</b><small>Each box should represent one meaningful boundary. Keep the first design simple, then add complexity when a requirement demands it.</small></div>`}</section></div>
  </main>`;
}
function persist() { try { localStorage.setItem(KEY,JSON.stringify(model)); } catch {} }
function rerender(root) { const board=root.querySelector("#ws-board"); if (!board) return; const html=architectureWorkspace(); const temp=document.createElement("div"); temp.innerHTML=html; const fresh=temp.querySelector(".ws-page"); const current=root.querySelector(".ws-page"); if(current&&fresh) current.replaceWith(fresh); bindArchitectureWorkspace(root); }
export function bindArchitectureWorkspace(root) {
 const board=root.querySelector("#ws-board"); if(!board || board.dataset.bound==="true") return; board.dataset.bound="true";
 const drawEdges=()=>{const svg=root.querySelector("#ws-wires");if(svg){svg.innerHTML='<defs><marker id="ws-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor"/></marker></defs>'+model.edges.map(edgeMarkup).join("");}};
 const refresh=()=>{persist();const page=root.querySelector(".ws-page");if(!page)return;const temp=document.createElement("div");temp.innerHTML=architectureWorkspace();const fresh=temp.querySelector(".ws-page");page.replaceWith(fresh);bindArchitectureWorkspace(root);};
 root.querySelectorAll("[data-ws-node]").forEach(el=>{
  el.addEventListener("click",e=>{
   if(connectMode){e.preventDefault();const id=el.dataset.wsNode;if(!connectFrom){connectFrom=id;el.classList.add("connect-source");const meta=root.querySelector(".ws-board-meta span:last-child");if(meta)meta.textContent="Now select the destination component";return;}if(connectFrom!==id&&!model.edges.some(x=>x.from===connectFrom&&x.to===id)){model.edges.push({id:"e"+Date.now(),from:connectFrom,to:id,label:"request"});}connectMode=false;connectFrom=null;selected=id;refresh();return;}
   selected=el.dataset.wsNode;root.querySelectorAll(".ws-node").forEach(n=>n.classList.toggle("selected",n===el));
   const temp=document.createElement("div");temp.innerHTML=architectureWorkspace();const fresh=temp.querySelector(".ws-page");const page=root.querySelector(".ws-page");if(page&&fresh){page.replaceWith(fresh);bindArchitectureWorkspace(root);}
  });
  el.addEventListener("pointerdown",e=>{if(connectMode||e.button!==0||e.target.closest(".ws-node-grip")===null&&e.target.closest(".ws-node-copy")===null&&e.target.closest(".ws-node-icon")===null&&e.target!==el)return;const rect=board.getBoundingClientRect();const startX=e.clientX,startY=e.clientY;const node=model.nodes.find(n=>n.id===el.dataset.wsNode);if(!node)return;const ox=node.x,oy=node.y;el.setPointerCapture?.(e.pointerId);const move=ev=>{node.x=Math.max(0,Math.min(760,ox+(ev.clientX-startX)*900/rect.width));node.y=Math.max(0,Math.min(480,oy+(ev.clientY-startY)*560/rect.height));el.style.left=node.x+"px";el.style.top=node.y+"px";drawEdges();};const up=()=>{el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);persist();};el.addEventListener("pointermove",move);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);});
 });
 const scenario=root.querySelector("#ws-scenario");if(scenario)scenario.addEventListener("change",()=>{model.scenario=scenario.value;persist();refresh();});
 const notes=root.querySelector("#ws-notes");if(notes)notes.addEventListener("input",()=>{model.notes=notes.value;persist();const current=evaluate();const status=root.querySelector(".ws-score strong");if(status)status.innerHTML=current.points+'<small>/100</small>';const mini=root.querySelector(".ws-mini-score");if(mini)mini.textContent=current.points+'%';});
 const exportButton=root.querySelector("[data-ws-export]");if(exportButton)exportButton.addEventListener("click",()=>{const payload={product:"Tech Katta Design Studio",exportedAt:new Date().toISOString(),scenario:model.scenario,notes:model.notes,nodes:model.nodes,edges:model.edges,heuristicReview:evaluate()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="tech-katta-system-design.json";link.click();URL.revokeObjectURL(url);});
 const add=root.querySelector("[data-ws-add]");if(add)add.addEventListener("click",()=>{const type=kinds[(serial-1)%kinds.length];const id="node-"+Date.now()+"-"+serial++;model.nodes.push({id,type,title:type,subtitle:"Define responsibility",x:80+((model.nodes.length*71)%580),y:155+((model.nodes.length*59)%300)});selected=id;refresh();});
 const connect=root.querySelector("[data-ws-connect]");if(connect)connect.addEventListener("click",()=>{connectMode=!connectMode;connectFrom=null;refresh();});
 const del=root.querySelector("[data-ws-delete]");if(del)del.addEventListener("click",()=>{if(!selected)return;model.nodes=model.nodes.filter(n=>n.id!==selected);model.edges=model.edges.filter(e=>e.from!==selected&&e.to!==selected);selected=null;refresh();});
 const reset=root.querySelector("[data-ws-reset]");if(reset)reset.addEventListener("click",()=>{model={nodes:initialNodes.map(n=>({...n})),edges:initialEdges.map(e=>({...e})),scenario:scenarios[0].id,notes:""};selected=null;connectMode=false;connectFrom=null;persist();refresh();});
 const save=root.querySelector("[data-ws-save-inspector]");if(save)save.addEventListener("click",()=>{const n=model.nodes.find(n=>n.id===selected);if(!n)return;n.title=root.querySelector("#ws-title").value.trim()||n.type;n.subtitle=root.querySelector("#ws-subtitle").value.trim();n.type=root.querySelector("#ws-type").value;refresh();});
}
