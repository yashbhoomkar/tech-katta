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
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) return value; } catch {}
  return {nodes:initialNodes.map(n=>({...n})),edges:initialEdges.map(e=>({...e}))};
}
let model = load();
let connectMode = false;
let connectFrom = null;
let selected = null;
let serial = 1;
const kinds = ["Load balancer","Service","Cache","Queue","Database","Object storage","Search index","Worker","External API","CDN"];
function evaluate() {
  const types = new Set(model.nodes.map(n=>n.type.toLowerCase()));
  const hasClient = [...types].some(t=>t.includes("client"));
  const hasService = [...types].some(t=>t.includes("service") || t.includes("worker"));
  const hasStore = [...types].some(t=>t.includes("database") || t.includes("storage") || t.includes("search"));
  const hasResilience = [...types].some(t=>t.includes("queue") || t.includes("cache") || t.includes("load balancer"));
  const connected = new Set(model.edges.flatMap(e=>[e.from,e.to])).size;
  const checks = [
    {label:"Entry point",ok:hasClient || [...types].some(t=>t.includes("gateway"))},
    {label:"Compute / business logic",ok:hasService},
    {label:"Persistent data store",ok:hasStore},
    {label:"Components connected",ok:model.edges.length>0 && connected>=Math.min(3,model.nodes.length)},
    {label:"Scale or resilience component",ok:hasResilience},
    {label:"No isolated components",ok:model.nodes.every(n=>model.edges.some(e=>e.from===n.id||e.to===n.id))}
  ];
  const points = Math.round(checks.filter(c=>c.ok).length/checks.length*100);
  return {checks,points};
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
    <div class="page-hero ws-hero"><div><div class="eyebrow">SYSTEM DESIGN STUDIO · INTERACTIVE CANVAS</div><h1>Design the system.<br><em>Defend every choice.</em></h1><p>Build a high-level architecture, connect request flows, and check the completeness of your design. Your canvas is saved in this browser.</p></div><div class="ws-score"><span>DESIGN CHECKLIST</span><strong>${report.points}<small>/100</small></strong><small>${report.checks.filter(c=>c.ok).length} of ${report.checks.length} baseline checks</small></div></div>
    <div class="ws-toolbar"><div class="ws-toolgroup"><button class="button-primary small" data-ws-add>＋ Add component</button><button class="button-secondary small ${connectMode?"is-active":""}" data-ws-connect>${connectMode?"Select source, then target":"↗ Connect nodes"}</button></div><div class="ws-toolgroup"><button class="button-secondary small" data-ws-delete ${selected?"":"disabled"}>Delete selected</button><button class="button-secondary small" data-ws-reset>Reset canvas</button></div></div>
    <section class="ws-board-shell"><div class="ws-board-meta"><span><i class="ws-status-dot"></i> ${esc(model.nodes.length)} components · ${esc(model.edges.length)} connections</span><span>Drag nodes · connect mode to draw arrows</span></div>
      <div class="ws-board" id="ws-board"><svg class="ws-wires" id="ws-wires" viewBox="0 0 900 560" preserveAspectRatio="none"><defs><marker id="ws-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor"/></marker></defs>${model.edges.map(edgeMarkup).join("")}</svg>
      ${model.nodes.map(n=>`<button class="ws-node ${selected===n.id?"selected":""}" data-ws-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px" aria-label="Select ${esc(n.title)}"><span class="ws-node-icon">${esc(n.type.slice(0,2).toUpperCase())}</span><span class="ws-node-copy"><b>${esc(n.title)}</b><small>${esc(n.subtitle||n.type)}</small></span><span class="ws-node-grip">⠿</span></button>`).join("")}
      </div><div class="ws-board-foot"><span>↔ Move nodes to organize the flow</span><span>Original Tech Katta workspace · local save</span></div></section>
    <div class="ws-lower"><section class="ws-panel"><div class="ws-panel-heading"><div><div class="eyebrow">DESIGN REVIEW</div><h2>Architecture checklist</h2></div><span class="ws-mini-score">${report.points}%</span></div>${report.checks.map(c=>`<div class="ws-check ${c.ok?"pass":"missing"}"><span>${c.ok?"✓":"○"}</span><div><b>${c.label}</b><small>${c.ok?"Signal present in the current canvas":"Add or connect a component to cover this area"}</small></div></div>`).join("")}<p class="ws-disclaimer">This is a structural checklist, not an AI assessment of correctness. It does not yet validate capacity, consistency, security, or architecture-specific trade-offs.</p></section>
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
 const add=root.querySelector("[data-ws-add]");if(add)add.addEventListener("click",()=>{const type=kinds[(serial-1)%kinds.length];const id="node-"+Date.now()+"-"+serial++;model.nodes.push({id,type,title:type,subtitle:"Define responsibility",x:80+((model.nodes.length*71)%580),y:155+((model.nodes.length*59)%300)});selected=id;refresh();});
 const connect=root.querySelector("[data-ws-connect]");if(connect)connect.addEventListener("click",()=>{connectMode=!connectMode;connectFrom=null;refresh();});
 const del=root.querySelector("[data-ws-delete]");if(del)del.addEventListener("click",()=>{if(!selected)return;model.nodes=model.nodes.filter(n=>n.id!==selected);model.edges=model.edges.filter(e=>e.from!==selected&&e.to!==selected);selected=null;refresh();});
 const reset=root.querySelector("[data-ws-reset]");if(reset)reset.addEventListener("click",()=>{model={nodes:initialNodes.map(n=>({...n})),edges:initialEdges.map(e=>({...e}))};selected=null;connectMode=false;connectFrom=null;persist();refresh();});
 const save=root.querySelector("[data-ws-save-inspector]");if(save)save.addEventListener("click",()=>{const n=model.nodes.find(n=>n.id===selected);if(!n)return;n.title=root.querySelector("#ws-title").value.trim()||n.type;n.subtitle=root.querySelector("#ws-subtitle").value.trim();n.type=root.querySelector("#ws-type").value;refresh();});
}
