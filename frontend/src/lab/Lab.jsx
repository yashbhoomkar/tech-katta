// System Design Lab: a canvas to design a system from components, with a cost meter against the
// design's budget and a steady-load simulation (engine.js). The component catalogue, prices and
// capacities come from the API (GET /v1/lab, content/lab.json). Designs are kept in this browser.
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,ReactFlowProvider,Background,Controls,Handle,Position,MarkerType,addEdge,useNodesState,useEdgesState,useReactFlow}from"@xyflow/react";
import"@xyflow/react/dist/style.css";import"./lab.css";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";
import{simulate,defaultConfig,summary,catalogue}from"./engine.js";

const STORE="tk-lab-v1";
const usd=n=>"$"+Math.round(n).toLocaleString("en-US");
const num=n=>Math.round(n).toLocaleString("en-IN");
const newId=p=>`${p}-${Math.random().toString(36).slice(2,8)}`;
const Ctx=createContext(null);

// Designs live in localStorage: {current, designs:{id:{id,name,updated,nodes,edges}}}.
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE))||{designs:{}}}catch{return{designs:{}}}};
const save=s=>{try{localStorage.setItem(STORE,JSON.stringify(s))}catch{}};
const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:n.x??0,y:n.y??0},data:{kind:n.type,config:n.config||{}}})),edges:d.edges.map(e=>edge(e.from,e.to))});
const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x),y:Math.round(n.position.y),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target}))});
const edge=(source,target)=>({id:`e-${source}-${target}`,source,target,type:"smoothstep",markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16,color:"#1c2733"}});

const ICON={client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
const level=u=>u>=1?"over":u>=0.7?"warn":"ok";

function CompNode({id,data,selected}){const{cat,result,running}=useContext(Ctx);const comp=cat[data.kind];const r=result.nodes[id];
const st=running&&r&&data.kind!=="client"?level(r.utilisation):"";
return <div className={"ln"+(selected?" sel":"")+(st?" "+st:"")}>
{data.kind!=="client"&&<Handle type="target" position={Position.Left}/>}
<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div>
<b>{comp.name}</b><span className="ln-sum">{summary(comp,data.config)}</span>
{running&&r&&(data.kind==="client"?<span className="ln-m">sending {num(r.offered)} req/s</span>
:<><div className="ln-bar"><i style={{width:Math.min(100,r.utilisation*100)+"%"}}/></div><span className="ln-m">{Math.round(r.utilisation*100)}% · {Math.round(r.latencyMs)} ms{r.dropped>0?` · drops ${num(r.dropped)}/s`:""}</span></>)}
{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const nodeTypes={comp:CompNode};

function Palette({lab,onAdd}){const groups=[...new Set(lab.components.map(c=>c.group))];
return <aside className="lab-pal" aria-label="Components"><div className="lab-h">COMPONENTS</div>
{groups.map(g=><div key={g}><div className="lab-g">{g}</div>{lab.components.filter(c=>c.group===g).map(c=>
<button key={c.type} type="button" className="lab-item" draggable onDragStart={e=>{e.dataTransfer.setData("application/x-tk-lab",c.type);e.dataTransfer.effectAllowed="move"}} onClick={()=>onAdd(c.type)} title={`${c.desc} Drag onto the canvas, or click to add.`}>
<Glyph kind={c.type}/><span>{c.name}</span></button>)}</div>)}
<p className="lab-tip">Drag a component onto the canvas (or click it). Connect two components by dragging from the dot on the right of one to the dot on the left of the other. Select and press Delete to remove.</p></aside>}

function Field({label,children}){return <label className="lab-f"><span>{label}</span>{children}</label>}
function Inspector({lab,cat,node,result,running,update,remove}){
if(!node)return <aside className="lab-ins" aria-label="Details"><div className="lab-h">DESIGN</div>
<dl className="lab-kv"><dt>Monthly cost</dt><dd>{usd(result.total.monthlyCost)}</dd><dt>Budget</dt><dd>{usd(lab.budget)}</dd><dt>Region</dt><dd>{lab.region}</dd></dl>
<p className="lab-note">{lab.priceNote}</p><p className="lab-note">{lab.modelNote}</p></aside>;
const comp=cat[node.data.kind],cfg=node.data.config,r=result.nodes[node.id];const set=patch=>update(node.id,{...cfg,...patch});
return <aside className="lab-ins" aria-label="Component settings"><div className="lab-h">{comp.group.toUpperCase()}</div><h3><Glyph kind={comp.type}/>{comp.name}</h3><p className="lab-desc">{comp.desc}</p>
{comp.type==="client"&&<Field label={comp.rps.label}><input type="number" min={comp.rps.min} max={comp.rps.max} step="100" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:Math.max(comp.rps.min,Math.min(comp.rps.max,+e.target.value||0))})}/><input type="range" min={comp.rps.min} max={Math.min(comp.rps.max,20000)} step="50" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:+e.target.value})} aria-label={comp.rps.label}/></Field>}
{comp.sizes&&<Field label="Size"><select value={cfg.size||comp.defaultSize} onChange={e=>set({size:e.target.value})}>{comp.sizes.map(s=><option key={s.id} value={s.id}>{s.label} · {num(s.rps||s.qps)} {s.rps?"req":"queries"}/s · ${s.hourly}/h</option>)}</select></Field>}
{comp.count&&<Field label={comp.count.label}><input type="number" min={comp.count.min} max={comp.count.max} value={cfg.count??comp.count.default} onChange={e=>set({count:Math.max(comp.count.min,Math.min(comp.count.max,Math.round(+e.target.value)||1))})}/></Field>}
{comp.multiAz&&<label className="lab-check"><input type="checkbox" checked={!!cfg.multiAz} onChange={e=>set({multiAz:e.target.checked})}/>{comp.multiAz.label}</label>}
{comp.type==="apigw"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.pricePerMillion} per million requests</dd><dt>Limit</dt><dd>{num(comp.limitRps)} req/s</dd></dl>}
<dl className="lab-kv">{comp.type!=="client"&&<><dt>Capacity</dt><dd>{r&&r.capacity!==Infinity?num(r.capacity)+(comp.type==="database"?" queries/s":" req/s"):"—"}</dd></>}<dt>Monthly cost</dt><dd>{usd(r?.cost||0)}</dd>
{running&&r&&comp.type!=="client"&&<><dt>Load</dt><dd className={level(r.utilisation)}>{num(r.offered)}/s · {Math.round(r.utilisation*100)}%</dd><dt>Latency here</dt><dd>{Math.round(r.latencyMs)} ms</dd><dt>Dropped</dt><dd>{num(r.dropped)}/s</dd></>}</dl>
<button type="button" className="lab-btn ghost" onClick={()=>remove(node.id)}>Remove from design</button></aside>}

function Designs({store,current,open,create,example,rename,remove,close}){const list=Object.values(store.designs).sort((a,b)=>b.updated-a.updated);
return <div className="lab-menu" role="dialog" aria-label="Your designs"><div className="lab-h">YOUR DESIGNS · SAVED IN THIS BROWSER</div>
<div className="lab-menu-act"><button type="button" className="lab-btn" onClick={create}>+ New design</button><button type="button" className="lab-btn ghost" onClick={example}>+ Example: Zotato order API</button></div>
<ul>{list.map(d=><li key={d.id} className={d.id===current?"cur":""}><button type="button" onClick={()=>open(d.id)}><b>{d.name}</b><small>{d.nodes.length} components · {new Date(d.updated).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</small></button>
<button type="button" className="lab-x" aria-label={`Delete ${d.name}`} onClick={()=>{if(confirm(`Delete "${d.name}"?`))remove(d.id)}}>✕</button></li>)}</ul>
<button type="button" className="lab-btn ghost lab-close" onClick={close}>Close</button></div>}

function Canvas({lab}){const cat=useMemo(()=>catalogue(lab),[lab]);const rf=useReactFlow();
const[store,setStore]=useState(()=>{const s=load();if(!Object.keys(s.designs).length){const id=newId("design");s.designs[id]={id,name:lab.example.name,updated:Date.now(),...structuredClone({nodes:lab.example.nodes,edges:lab.example.edges})};s.current=id}if(!s.designs[s.current])s.current=Object.keys(s.designs)[0];return s});
const cur=store.designs[store.current];const init=useMemo(()=>toFlow(cur),[store.current]);// eslint-disable-line
const[nodes,setNodes,onNodesChange]=useNodesState(init.nodes);const[edges,setEdges,onEdgesChange]=useEdgesState(init.edges);
const[name,setName]=useState(cur.name);const[running,setRunning]=useState(false);const[menu,setMenu]=useState(false);const wrap=useRef(null);const loaded=useRef(store.current);
useEffect(()=>{if(loaded.current===store.current&&nodes.length)return;loaded.current=store.current;const f=toFlow(store.designs[store.current]);setNodes(f.nodes);setEdges(f.edges);setName(store.designs[store.current].name);setRunning(false);setTimeout(()=>rf.fitView({padding:.25,maxZoom:1}),30)},[store.current]);// eslint-disable-line
// Autosave the open design (debounced). The id is captured now, so a save that fires after
// switching designs still goes to the design these nodes belong to.
useEffect(()=>{const id=loaded.current;const t=setTimeout(()=>setStore(s=>{if(!s.designs[id])return s;const d={...s.designs[id],name:name.trim()||"Untitled design",updated:Date.now(),...fromFlow(nodes,edges)};const next={...s,designs:{...s.designs,[id]:d}};save(next);return next}),400);return()=>clearTimeout(t)},[nodes,edges,name]);// eslint-disable-line
const design=useMemo(()=>fromFlow(nodes,edges),[nodes,edges]);const result=useMemo(()=>simulate(design,lab),[design,lab]);
const selected=nodes.find(n=>n.selected);
const add=useCallback((kind,pos)=>{const comp=cat[kind];const id=newId(kind);const at=pos||rf.screenToFlowPosition({x:(wrap.current?.getBoundingClientRect().left||0)+(wrap.current?.clientWidth||600)/2,y:(wrap.current?.getBoundingClientRect().top||0)+(wrap.current?.clientHeight||400)/2});
setNodes(ns=>[...ns.map(n=>({...n,selected:false})),{id,type:"comp",position:{x:at.x-80,y:at.y-40},selected:true,data:{kind,config:defaultConfig(comp)}}])},[cat,rf,setNodes]);
const update=(id,config)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,data:{...n.data,config}}:n));
const remove=id=>{setNodes(ns=>ns.filter(n=>n.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id))};
const valid=c=>{const s=nodes.find(n=>n.id===c.source),t=nodes.find(n=>n.id===c.target);return !!s&&!!t&&c.source!==c.target&&t.data.kind!=="client"&&s.data.kind!=="database"&&!edges.some(e=>e.source===c.source&&e.target===c.target)};
const onConnect=useCallback(c=>setEdges(es=>addEdge(edge(c.source,c.target),es)),[setEdges]);
const onDrop=e=>{e.preventDefault();const kind=e.dataTransfer.getData("application/x-tk-lab");if(cat[kind])add(kind,rf.screenToFlowPosition({x:e.clientX,y:e.clientY}))};
const pick=id=>{setStore(s=>({...s,current:id}));setMenu(false)};
const create=(src)=>{const id=newId("design");const d={id,name:src?src.name:"Untitled design",updated:Date.now(),nodes:src?structuredClone(src.nodes):[],edges:src?structuredClone(src.edges):[]};setStore(s=>{const n={...s,current:id,designs:{...s.designs,[id]:d}};save(n);return n});setMenu(false)};
const del=id=>setStore(s=>{const designs={...s.designs};delete designs[id];if(!Object.keys(designs).length){const nid=newId("design");designs[nid]={id:nid,name:"Untitled design",updated:Date.now(),nodes:[],edges:[]}}const n={...s,designs,current:designs[s.current]?s.current:Object.keys(designs)[0]};save(n);return n});
const t=result.total,blocking=result.problems.filter(p=>!p.includes("no traffic")),pct=Math.min(100,t.monthlyCost/lab.budget*100);
const flowEdges=useMemo(()=>edges.map(e=>({...e,animated:running,className:running?"live":""})),[edges,running]);
return <Ctx.Provider value={{cat,result,running}}><div className="lab">
<header className="lab-top"><input className="lab-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Design name" maxLength={60}/>
<button type="button" className="lab-btn ghost" onClick={()=>setMenu(m=>!m)} aria-expanded={menu}>Designs ▾</button>
<div className={"lab-budget"+(t.overBudget?" over":"")} title={lab.priceNote}><span>{usd(t.monthlyCost)} <small>/ {usd(lab.budget)} a month</small></span><div className="lab-meter"><i style={{width:pct+"%"}}/></div></div>
<button type="button" className="lab-btn run" disabled={!running&&(blocking.length>0||t.overBudget)} onClick={()=>setRunning(r=>!r)}>{running?"■ Stop":"▶ Run traffic"}</button>
{menu&&<Designs store={store} current={store.current} open={pick} create={()=>create()} example={()=>create(lab.example)} remove={del} close={()=>setMenu(false)}/>}</header>
<div className="lab-status" aria-live="polite">{blocking.length?<span className="lab-warn">{blocking[0]}</span>:t.overBudget?<span className="lab-warn">Over budget by {usd(t.monthlyCost-lab.budget)} a month. Use fewer or smaller components.</span>
:running?<><span><b>{num(t.sentRps)}</b> req/s sent</span><span className={t.successPct<99.9?"bad":""}><b>{t.successPct>=99.95?"100":t.successPct.toFixed(1)}%</b> served</span><span><b>{Math.round(t.latencyMs)} ms</b> average latency</span>{t.bottleneck&&<span>Busiest: <b>{cat[nodes.find(n=>n.id===t.bottleneck)?.data.kind]?.name}</b> at {Math.round(result.nodes[t.bottleneck].utilisation*100)}%</span>}{result.problems[0]&&<span className="lab-warn">{result.problems[0]}</span>}</>
:<span className="lab-muted">{result.problems[0]||"Press Run traffic to send the Clients' requests through your design. Change anything while it runs and the numbers update."}</span>}</div>
<Palette lab={lab} onAdd={k=>add(k)}/>
<div className="lab-canvas" ref={wrap} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move"}} onDrop={onDrop}>
<ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={valid}
fitView fitViewOptions={{padding:.25,maxZoom:1}} minZoom={.25} maxZoom={2} snapToGrid snapGrid={[20,20]} deleteKeyCode={["Backspace","Delete"]} defaultEdgeOptions={{type:"smoothstep"}}>
<Background gap={20} size={1} color="#d9dee7"/><Controls showInteractive={false} position="bottom-left"/></ReactFlow>
{!nodes.length&&<div className="lab-empty">Drag components here from the left to start a design.</div>}</div>
<Inspector lab={lab} cat={cat} node={selected} result={result} running={running} update={update} remove={remove}/>
</div></Ctx.Provider>}

export default function Lab(){const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(lab=>set({lab}),()=>set({err:1}))};useEffect(go,[]);
if(st.err)return <LoadError what="the Lab" retry={go}/>;if(!st.lab)return <Loading label="Loading the Lab"/>;
return <div className="lab-wrap"><div className="lab-small">{st.lab.smallScreen}</div><ReactFlowProvider><Canvas lab={st.lab}/></ReactFlowProvider></div>}
