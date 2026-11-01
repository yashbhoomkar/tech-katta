// System Design Lab: a canvas to design a system from components, with a cost meter against the
// design's budget and a steady-load simulation (engine.js). The component catalogue, prices and
// capacities come from the API (GET /v1/lab, content/lab.json). Designs are kept in this browser.
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,ReactFlowProvider,Background,Controls,Handle,Position,MarkerType,addEdge,useNodesState,useEdgesState,useReactFlow}from"@xyflow/react";
import"@xyflow/react/dist/style.css";import"./lab.css";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";
import{simulate,defaultConfig,summary,catalogue,advance,newRun}from"./engine.js";
import{readStore,STORE_KEY,STORE_VERSION}from"./store.js";

// Credits: every design starts with lab.budget and spends it while traffic runs, at its hourly cost,
// on a simulated clock. SPEEDS = simulated hours per real second.
const SPEEDS=[["1 s = 1 minute",1/60],["1 s = 10 minutes",1/6],["1 s = 1 hour",1],["1 s = 1 day",24],["1 s = 1 week",168]];const TICK=250;
const simTime=h=>{const m=Math.floor(h*60+1e-6),d=Math.floor(m/1440),hh=Math.floor(m%1440/60),mm=m%60;return `Day ${d+1}, ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`};
const cents=n=>"$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const eventText=(e,names,cat,lab)=>{const n=names[e.id]||{},c=cat[n.kind]||{},cr=c.crash||{};return e.kind==="recovered"?`${c.name||"Component"} is back.`:e.kind==="failover"?`Database primary crashed (${Math.round(cr.above*100)}%+ load for ${cr.minutes} min). Multi-AZ standby takes over in ${cr.failoverMinutes} min.`:`${c.name||"Component"} crashed (${Math.round(cr.above*100)}%+ load for ${cr.minutes} min). Back in ${cr.downMinutes} min.`};
const duration=h=>h<1?`${Math.round(h*60)} minutes`:h<48?`${Math.round(h)} hours`:h<24*90?`${Math.round(h/24)} days`:`${(h/730).toFixed(1)} months`;
// New components go to the nearest free spot around the point asked for, so they never stack.
const W=176,H=110;
function freeSpot(nodes,x,y){const hit=(px,py)=>nodes.some(n=>Math.abs(n.position.x-px)<W+20&&Math.abs(n.position.y-py)<H+20);
for(let ring=0;ring<12;ring++)for(let i=-ring;i<=ring;i++)for(const [dx,dy] of [[i,-ring],[i,ring],[-ring,i],[ring,i]]){const px=Math.round((x+dx*(W+40))/20)*20,py=Math.round((y+dy*(H+30))/20)*20;if(!hit(px,py))return{x:px,y:py}}return{x,y}}
const usd=n=>"$"+Math.round(n).toLocaleString("en-US");
const num=n=>Math.round(n).toLocaleString("en-US");
const newId=p=>`${p}-${Math.random().toString(36).slice(2,8)}`;
const Ctx=createContext(null);

// Designs live in localStorage (store.js); what is read back is checked and repaired first.
const load=lab=>{let raw=null;try{raw=localStorage.getItem(STORE_KEY)}catch{}return readStore(raw,lab)};
const save=s=>{try{localStorage.setItem(STORE_KEY,JSON.stringify({...s,version:STORE_VERSION}))}catch{}};
const savedSpeed=()=>{let v=NaN;try{v=+localStorage.getItem("tk-lab-speed")}catch{}return SPEEDS.some(s=>s[1]===v)?v:1/60};
const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:n.x??0,y:n.y??0},data:{kind:n.type,config:n.config||{}}})),edges:d.edges.map(e=>edge(e.from,e.to))});
const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x),y:Math.round(n.position.y),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target}))});
const edge=(source,target)=>({id:`e-${source}-${target}`,source,target,type:"smoothstep",markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16,color:"#1c2733"}});

const ICON={client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
const level=u=>u>=1?"over":u>=0.7?"warn":"ok";

function CompNode({id,data,selected}){const{cat,result,running,run}=useContext(Ctx);const comp=cat[data.kind];const r=result.nodes[id];
const back=run.down[id];const st=back!==undefined?"down":running&&r&&data.kind!=="client"?level(r.utilisation):"";
return <div className={"ln"+(selected?" sel":"")+(st?" "+st:"")}>
{data.kind!=="client"&&<Handle type="target" position={Position.Left}/>}
<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div>
<b>{comp.name}</b><span className="ln-sum">{summary(comp,data.config)}</span>
{back!==undefined?<span className="ln-m ln-down">CRASHED · back in {Math.max(1,Math.ceil(back-run.t))} min</span>:running&&r&&(data.kind==="client"?<span className="ln-m">sending {num(r.offered)} req/s{r.offered>(data.config.rps||0)*1.001?" incl. retries":""}</span>
:<><div className="ln-bar"><i style={{width:Math.min(100,r.utilisation*100)+"%"}}/></div><span className="ln-m">{Math.round(r.utilisation*100)}% · {Math.round(r.latencyMs)} ms{r.dropped>0?` · drops ${num(r.dropped)}/s`:""}</span></>)}
{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const nodeTypes={comp:CompNode};

// Palette items are dragged with pointer events (mouse, trackpad, touch, pen) rather than HTML5
// drag-and-drop, which Firefox does not start from buttons and touch screens do not support.
// A press that moves less than 6 px is a tap/click and adds the component at a free spot; a drag
// shows a ghost under the pointer and drops the component where it is released over the canvas.
function Palette({lab,onAdd,onDropAt,setDragging}){const groups=[...new Set(lab.components.map(c=>c.group))];const[ghost,setGhost]=useState(null);
const press=(e,c)=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.preventDefault();const sx=e.clientX,sy=e.clientY;let moved=false;
const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;if(!moved){moved=true;setDragging(true)}setGhost({c,x:ev.clientX,y:ev.clientY})};
const end=ok=>ev=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);removeEventListener("pointercancel",cancel);setGhost(null);setDragging(false);if(!ok)return;if(moved)onDropAt(c.type,ev.clientX,ev.clientY);else onAdd(c.type)};
const up=end(true),cancel=end(false);addEventListener("pointermove",move);addEventListener("pointerup",up);addEventListener("pointercancel",cancel)};
return <aside className="lab-pal" aria-label="Components"><div className="lab-h">COMPONENTS</div>
{groups.map(g=><div key={g}><div className="lab-g">{g}</div>{lab.components.filter(c=>c.group===g).map(c=>
<button key={c.type} type="button" className="lab-item" onPointerDown={e=>press(e,c)} onClick={e=>{if(e.detail===0)onAdd(c.type)}} title={`${c.desc} Drag onto the canvas, or tap to add.`}>
<Glyph kind={c.type}/><span>{c.name}</span></button>)}</div>)}
{ghost&&<div className="lab-ghost" style={{left:ghost.x,top:ghost.y}} aria-hidden="true"><Glyph kind={ghost.c.type}/>{ghost.c.name}</div>}
<p className="lab-tip">Drag a component onto the canvas, or tap it to add it. Connect two components by dragging from the dot on the right of one to the dot on the left of the other. Select and press Delete to remove.</p></aside>}

function Field({label,children}){return <label className="lab-f"><span>{label}</span>{children}</label>}
function Inspector({lab,cat,node,result,running,update,remove,run,names}){
if(!node)return <aside className="lab-ins" aria-label="Details"><div className="lab-h">DESIGN</div>
<dl className="lab-kv"><dt>Monthly cost</dt><dd>{usd(result.total.monthlyCost)}</dd><dt>Budget</dt><dd>{usd(lab.budget)}</dd><dt>Region</dt><dd>{lab.region}</dd></dl>
{run.sent>0&&<dl className="lab-kv"><dt>Availability this run</dt><dd className={run.served/run.sent<0.999?"over":""}>{(100*run.served/run.sent).toFixed(2)}%</dd><dt>Run time</dt><dd>{duration(run.t/60)}</dd></dl>}
{run.events.length>0&&<><div className="lab-h lab-log-h">RUN LOG</div><ol className="lab-log">{[...run.events].reverse().slice(0,12).map((e,i)=><li key={i} className={e.kind}><small>{simTime(run.start+e.t/60)}</small>{eventText(e,names,cat,lab)}</li>)}</ol></>}
<p className="lab-note">{lab.crashNote}</p><p className="lab-note">{lab.priceNote}</p><p className="lab-note">{lab.modelNote}</p></aside>;
const comp=cat[node.data.kind],cfg=node.data.config,r=result.nodes[node.id];const set=patch=>update(node.id,{...cfg,...patch});
return <aside className="lab-ins" aria-label="Component settings"><div className="lab-h">{comp.group.toUpperCase()}</div><h3><Glyph kind={comp.type}/>{comp.name}</h3><p className="lab-desc">{comp.desc}</p>
{comp.type==="client"&&<Field label={comp.rps.label}><input type="number" min={comp.rps.min} max={comp.rps.max} step="100" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:Math.max(comp.rps.min,Math.min(comp.rps.max,+e.target.value||0))})}/><input type="range" min={comp.rps.min} max={Math.min(comp.rps.max,20000)} step="50" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:+e.target.value})} aria-label={comp.rps.label}/></Field>}
{comp.sizes&&<Field label="Size"><select value={cfg.size||comp.defaultSize} onChange={e=>set({size:e.target.value})}>{comp.sizes.map(s=><option key={s.id} value={s.id}>{s.label} · {num(s.rps||s.qps)} {s.rps?"req":"queries"}/s · ${s.hourly}/h</option>)}</select></Field>}
{comp.queriesPerRequest&&<Field label={comp.queriesPerRequest.label}><input type="number" min={comp.queriesPerRequest.min} max={comp.queriesPerRequest.max} value={cfg.queriesPerRequest??comp.queriesPerRequest.default} onChange={e=>set({queriesPerRequest:Math.max(comp.queriesPerRequest.min,Math.min(comp.queriesPerRequest.max,Math.round(+e.target.value)||1))})}/></Field>}
{comp.count&&<Field label={comp.count.label}><input type="number" min={comp.count.min} max={comp.count.max} value={cfg.count??comp.count.default} onChange={e=>set({count:Math.max(comp.count.min,Math.min(comp.count.max,Math.round(+e.target.value)||1))})}/></Field>}
{comp.multiAz&&<label className="lab-check"><input type="checkbox" checked={!!cfg.multiAz} onChange={e=>set({multiAz:e.target.checked})}/>{comp.multiAz.label}</label>}
{comp.type==="apigw"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.pricePerMillion} per million requests</dd><dt>Limit</dt><dd>{num(comp.limitRps)} req/s</dd></dl>}
<dl className="lab-kv">{comp.type!=="client"&&<><dt>Capacity</dt><dd>{r&&r.capacity!==Infinity?num(r.capacity)+(comp.type==="database"?" queries/s":" req/s"):"—"}</dd></>}<dt>Monthly cost</dt><dd>{usd(r?.cost||0)}</dd>
{running&&r&&comp.type!=="client"&&<><dt>Load</dt><dd className={level(r.utilisation)}>{num(r.offered)}/s · {Math.round(r.utilisation*100)}%</dd><dt>Latency here</dt><dd>{Math.round(r.latencyMs)} ms</dd><dt>Dropped</dt><dd>{num(r.dropped)}/s</dd></>}</dl>
<button type="button" className="lab-btn ghost" onClick={()=>remove(node.id)}>Remove from design</button></aside>}

function Designs({store,current,open,create,example,duplicate,remove,close,budget}){const list=Object.values(store.designs).sort((a,b)=>b.updated-a.updated);
return <div className="lab-menu" role="dialog" aria-label="Your designs"><div className="lab-h">YOUR DESIGNS · SAVED IN THIS BROWSER</div>
<div className="lab-menu-act"><button type="button" className="lab-btn" onClick={create}>+ New design</button><button type="button" className="lab-btn ghost" onClick={example}>+ Example: Zotato order API</button></div>
<ul>{list.map(d=><li key={d.id} className={d.id===current?"cur":""}><button type="button" onClick={()=>open(d.id)}><b>{d.name}</b><small>{d.nodes.length} components · {usd(budget-(d.credit?.spent||0))} credit left · {new Date(d.updated).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</small></button>
<button type="button" className="lab-x" aria-label={`Duplicate ${d.name} with fresh credit`} title="Duplicate with fresh credit" onClick={()=>duplicate(d.id)}>⧉</button><button type="button" className="lab-x" aria-label={`Delete ${d.name}`} onClick={()=>{if(confirm(`Delete "${d.name}"?`))remove(d.id)}}>✕</button></li>)}</ul>
<button type="button" className="lab-btn ghost lab-close" onClick={close}>Close</button></div>}

function Canvas({lab}){const cat=useMemo(()=>catalogue(lab),[lab]);const rf=useReactFlow();
const[store,setStore]=useState(()=>{const s=load(lab);if(!Object.keys(s.designs).length){const id=newId("design");s.designs[id]={id,name:lab.example.name,updated:Date.now(),...structuredClone({nodes:lab.example.nodes,edges:lab.example.edges})};s.current=id}if(!s.designs[s.current])s.current=Object.keys(s.designs)[0];return s});
const cur=store.designs[store.current];const init=useMemo(()=>toFlow(cur),[store.current]);// eslint-disable-line
const[nodes,setNodes,onNodesChange]=useNodesState(init.nodes);const[edges,setEdges,onEdgesChange]=useEdgesState(init.edges);
const[name,setName]=useState(cur.name);const[running,setRunning]=useState(false);const[credit,setCredit]=useState(()=>cur.credit||{spent:0,hours:0});const[run,setRun]=useState(newRun);const[speed,setSpeedState]=useState(savedSpeed);const setSpeed=v=>{setSpeedState(v);try{localStorage.setItem("tk-lab-speed",String(v))}catch{}};const[ended,setEnded]=useState(false);const[menu,setMenu]=useState(false);const wrap=useRef(null);const loaded=useRef(store.current);
useEffect(()=>{if(loaded.current===store.current&&nodes.length)return;loaded.current=store.current;const f=toFlow(store.designs[store.current]);setNodes(f.nodes);setEdges(f.edges);setName(store.designs[store.current].name);setCredit(store.designs[store.current].credit||{spent:0,hours:0});setEnded(false);setRun(newRun());setRunning(false);setTimeout(()=>rf.fitView({padding:.25,maxZoom:1}),30)},[store.current]);// eslint-disable-line
// Autosave the open design (debounced). The id is captured now, so a save that fires after
// switching designs still goes to the design these nodes belong to.
useEffect(()=>{const id=loaded.current;const t=setTimeout(()=>setStore(s=>{if(!s.designs[id])return s;const d={...s.designs[id],name:name.trim()||"Untitled design",updated:Date.now(),...fromFlow(nodes,edges),credit};const next={...s,designs:{...s.designs,[id]:d}};save(next);return next}),400);return()=>clearTimeout(t)},[nodes,edges,name,credit]);// eslint-disable-line
const design=useMemo(()=>fromFlow(nodes,edges),[nodes,edges]);const downKey=Object.keys(run.down).sort().join();
const result=useMemo(()=>simulate(design,lab,{down:new Set(downKey?downKey.split(","):[])}),[design,lab,downKey]);const designRef=useRef(design);designRef.current=design;
const names=useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,{kind:n.data.kind}])),[nodes]);
const selected=nodes.find(n=>n.selected);
// While running, the simulated clock advances and the design's hourly cost is taken from its credit.
const burn=useRef(0);burn.current=result.total.burnPerHour;
useEffect(()=>{if(!running)return;const iv=setInterval(()=>{setRun(r=>advance(designRef.current,lab,r,speed*TICK/1000*60));setCredit(c=>{const hours=speed*TICK/1000,cost=burn.current*hours;
// Stop the clock exactly when the credit runs out (part of the last tick).
if(c.spent+cost>=lab.budget)return{spent:lab.budget,hours:c.hours+(cost>0?hours*(lab.budget-c.spent)/cost:hours)};return{spent:c.spent+cost,hours:c.hours+hours}})},TICK);return()=>clearInterval(iv)},[running,speed,lab.budget,lab]);
useEffect(()=>{if(running&&credit.spent>=lab.budget){setRunning(false);setEnded(true)}},[credit,running,lab.budget]);
const add=useCallback((kind,pos)=>{const comp=cat[kind];const id=newId(kind);const at=pos||rf.screenToFlowPosition({x:(wrap.current?.getBoundingClientRect().left||0)+(wrap.current?.clientWidth||600)/2,y:(wrap.current?.getBoundingClientRect().top||0)+(wrap.current?.clientHeight||400)/2});
setNodes(ns=>[...ns.map(n=>({...n,selected:false})),{id,type:"comp",position:freeSpot(ns,at.x-W/2,at.y-H/2),selected:true,data:{kind,config:defaultConfig(comp)}}])},[cat,rf,setNodes]);
const update=(id,config)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,data:{...n.data,config}}:n));
const remove=id=>{setNodes(ns=>ns.filter(n=>n.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id))};
const valid=c=>{const s=nodes.find(n=>n.id===c.source),t=nodes.find(n=>n.id===c.target);return !!s&&!!t&&c.source!==c.target&&t.data.kind!=="client"&&s.data.kind!=="database"&&!edges.some(e=>e.source===c.source&&e.target===c.target)};
const onConnect=useCallback(c=>setEdges(es=>addEdge(edge(c.source,c.target),es)),[setEdges]);
const[dragging,setDragging]=useState(false);
// Drop from the palette: only when released over the canvas.
const dropAt=(kind,x,y)=>{const r=wrap.current?.getBoundingClientRect();if(!cat[kind]||!r||x<r.left||x>r.right||y<r.top||y>r.bottom)return;add(kind,rf.screenToFlowPosition({x,y}))};
const pick=id=>{setStore(s=>({...s,current:id}));setMenu(false)};
const create=(src)=>{const id=newId("design");const d={id,name:src?src.name:"Untitled design",updated:Date.now(),nodes:src?structuredClone(src.nodes):[],edges:src?structuredClone(src.edges):[],credit:{spent:0,hours:0}};setStore(s=>{const n={...s,current:id,designs:{...s.designs,[id]:d}};save(n);return n});setMenu(false)};
const duplicate=id=>{const s=store.designs[id];create({...s,name:`${s.name} (copy)`})};
const del=id=>setStore(s=>{const designs={...s.designs};delete designs[id];if(!Object.keys(designs).length){const nid=newId("design");designs[nid]={id:nid,name:"Untitled design",updated:Date.now(),nodes:[],edges:[]}}const n={...s,designs,current:designs[s.current]?s.current:Object.keys(designs)[0]};save(n);return n});
const t=result.total,blocking=result.problems.filter(p=>!p.includes("no traffic")),left=Math.max(0,lab.budget-credit.spent),pct=left/lab.budget*100,out=left<=0;
const lasts=t.burnPerHour>0?left/t.burnPerHour:Infinity;
const flowEdges=useMemo(()=>edges.map(e=>{const dead=run.down[e.source]!==undefined||run.down[e.target]!==undefined;return{...e,animated:running&&!dead,className:dead?"dead":running?"live":""}}),[edges,running,downKey]);// eslint-disable-line
return <Ctx.Provider value={{cat,result,running,run}}><div className="lab">
<header className="lab-top"><input className="lab-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Design name" maxLength={60}/>
<button type="button" className="lab-btn ghost" onClick={()=>setMenu(m=>!m)} aria-expanded={menu}>Designs ▾</button>
<div className={"lab-budget"+(out||lasts<24*30?" over":"")} title={lab.priceNote}><span>{cents(left)} <small>credit left of {usd(lab.budget)}</small></span><div className="lab-meter"><i style={{width:pct+"%"}}/></div><small className="lab-burn">burns {usd(t.burnPerHour)}/hour · {usd(t.monthlyCost)}/month</small></div>
<label className="lab-speed"><span className="sr">Simulation speed</span><select value={speed} onChange={e=>setSpeed(+e.target.value)}>{SPEEDS.map(([l,h])=><option key={l} value={h}>{l}</option>)}</select></label>
<button type="button" className="lab-btn run" disabled={!running&&(blocking.length>0||out)} onClick={()=>{setEnded(false);if(!running&&run.t===0)setRun({...newRun(),start:credit.hours});setRunning(r=>!r)}}>{running?"■ Stop":"▶ Run traffic"}</button>
{menu&&<Designs store={store} current={store.current} budget={lab.budget} open={pick} create={()=>create()} example={()=>create(lab.example)} duplicate={duplicate} remove={del} close={()=>setMenu(false)}/>}</header>
<div className="lab-status" aria-live="polite">{blocking.length?<span className="lab-warn">{blocking[0]}</span>:out?<span className="lab-warn">{ended?`Credit used up after ${duration(credit.hours)} of traffic.`:"This design has no credit left."} Designs → ⧉ duplicates it with a fresh {usd(lab.budget)}.</span>
:running?<><span><b>{simTime(credit.hours)}</b></span><span><b>{num(t.sentRps)}</b> req/s sent{t.clients>1?` by ${t.clients} Clients`:""}</span><span className={t.successPct<99.9?"bad":""}><b>{t.successPct>=99.95?"100":t.successPct.toFixed(1)}%</b> served</span><span><b>{Math.round(t.latencyMs)} ms</b> average latency</span>{t.retryRps>0.5&&<span>+<b>{num(t.retryRps)}</b> retries/s</span>}{run.sent>0&&<span className={run.served/run.sent<0.999?"bad":""}>availability <b>{(100*run.served/run.sent).toFixed(2)}%</b></span>}{t.down.length>0&&<span className="lab-warn"><b>{t.down.length}</b> crashed</span>}{t.bottleneck&&<span>Busiest: <b>{cat[nodes.find(n=>n.id===t.bottleneck)?.data.kind]?.name}</b> at {Math.round(result.nodes[t.bottleneck].utilisation*100)}%</span>}{result.problems[0]&&<span className="lab-warn">{result.problems[0]}</span>}</>
:<span className="lab-muted">{result.problems[0]||`Press Run traffic to send the Clients' requests through your design. Credit is spent while it runs: at this design's cost ${usd(left)} lasts ${lasts===Infinity?"indefinitely":duration(lasts)}.`}</span>}</div>
<Palette lab={lab} onAdd={k=>add(k)} onDropAt={dropAt} setDragging={setDragging}/>
<div className={"lab-canvas"+(dragging?" drop":"")} ref={wrap}>
<ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={valid}
fitView fitViewOptions={{padding:.25,maxZoom:1}} minZoom={.25} maxZoom={2} snapToGrid snapGrid={[20,20]} deleteKeyCode={["Backspace","Delete"]} defaultEdgeOptions={{type:"smoothstep"}}>
<Background gap={20} size={1} color="#d9dee7"/><Controls showInteractive={false} position="bottom-left"/></ReactFlow>
{!nodes.length&&<div className="lab-empty">Drag components here from the left to start a design.</div>}</div>
<Inspector lab={lab} cat={cat} node={selected} result={result} running={running} update={update} remove={remove} run={run} names={names}/>
</div></Ctx.Provider>}

export default function Lab(){const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(lab=>set({lab}),()=>set({err:1}))};useEffect(go,[]);
if(st.err)return <LoadError what="the Lab" retry={go}/>;if(!st.lab)return <Loading label="Loading the Lab"/>;
return <div className="lab-wrap"><div className="lab-small">{st.lab.smallScreen}</div><ReactFlowProvider><Canvas lab={st.lab}/></ReactFlowProvider></div>}
