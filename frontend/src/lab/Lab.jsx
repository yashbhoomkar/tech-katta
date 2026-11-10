// The design canvas (once the System Design Lab tab; since 2026-11-10 it opens only inside a problem, a challenge from
// Problems, or the landing page's IND vs PAK): a canvas to design a system from components, with a cost meter against the
// design's budget and a steady-load simulation (engine.js). The component catalogue, prices and
// capacities come from the API (GET /v1/lab, content/lab.json). Designs are kept in this browser.
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,ReactFlowProvider,Background,Controls,Handle,Position,MarkerType,addEdge,useNodesState,useEdgesState,useReactFlow,BaseEdge,EdgeLabelRenderer,getSmoothStepPath}from"@xyflow/react";
import"@xyflow/react/dist/style.css";import"./lab.css";import SchemaEditor from"./SchemaEditor.jsx";import{schemaIssues,schemaSummary,vocab}from"./schema.js";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";
import{simulate,defaultConfig,summary,catalogue,advance,newRun,runOptions,crashNow,trafficAt,patternOf,autoscaled,scaleRange,cacheFlow,replicasOf,roleOf,displayName,MAX_NAME,engineOf,sizesOf,sizeOf,perRequest}from"./engine.js";
import{readStore,STORE_KEY,STORE_VERSION,MAX_NODES}from"./store.js";import{runChallenge,applyChallenge,chaosTarget}from"./challenges.js";import{readProgress,recordStars}from"../progress.js";import{syncLab,noteDeleted,useCatalogue,DELETED_KEY}from"../account.js";import{track}from"../analytics.js";
const deletedIds=()=>{try{return new Set(Object.keys(JSON.parse(localStorage.getItem(DELETED_KEY)||"{}")||{}))}catch{return new Set()}};

// Credits: every design starts with lab.budget and spends it while traffic runs, at its hourly cost,
// on a simulated clock. SPEEDS = simulated hours per real second.
const SPEEDS=[["1 s = 1 minute",1/60],["1 s = 10 minutes",1/6],["1 s = 1 hour",1],["1 s = 1 day",24],["1 s = 1 week",168]];const TICK=250;
const simTime=h=>{const m=Math.floor(h*60+1e-6),d=Math.floor(m/1440),hh=Math.floor(m%1440/60),mm=m%60;return `Day ${d+1}, ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`};
const cents=n=>"$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const eventText=(e,names,cat,lab)=>{const n=names[e.id]||{},c=cat[n.kind]||{},cr=c.crash||{};return e.kind==="cold"?`${n.label||c.name||"Cache"} is back, but empty: its misses go to the database while it warms up (${c.warmupMinutes} min).`:e.kind==="warm"?`${n.label||c.name||"Cache"} is warm again.`:e.kind==="dirty"?`${n.label||c.name||"Cache"} is writing to the database slower than writes arrive: unflushed writes are piling up.`:e.kind==="flushed"?`${n.label||c.name||"Cache"} has flushed every write to the database.`:e.kind==="writesLost"?`${n.label||c.name||"Cache"} crashed with ${num(e.n)} writes not yet in the database. They are lost.`:e.kind==="scaledOut"?`${n.label||c.name||"Server"} scaled out to ${e.n} instances.`:e.kind==="scaledIn"?`${n.label||c.name||"Server"} scaled in to ${e.n} instances: load has been low for ${c.autoscaling?.scaleInMinutes} min.`:e.kind==="backlog"?`${n.label||c.name||"Queue"} is filling up: messages arrive faster than the workers take them.`:e.kind==="drained"?`${n.label||c.name||"Queue"} backlog cleared: the workers have caught up.`:e.kind==="recovered"?`${n.label||c.name||"Component"} is back.`:e.forced&&e.kind==="failover"?`The challenge took the database primary down. Multi-AZ standby takes over in ${cr.failoverMinutes} min.`:e.forced?`The challenge crashed the ${(c.name||"component").toLowerCase()}. Back in ${cr.downMinutes} min.`:e.kind==="failover"?`Database primary crashed (${Math.round(cr.above*100)}%+ load for ${cr.minutes} min). Multi-AZ standby takes over in ${cr.failoverMinutes} min.`:`${n.label||c.name||"Component"} crashed (${Math.round(cr.above*100)}%+ load for ${cr.minutes} min). Back in ${cr.downMinutes} min.`};
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
const save=s=>{try{localStorage.setItem(STORE_KEY,JSON.stringify({...s,version:STORE_VERSION}))}catch{}try{dispatchEvent(new Event("tk-lab-saved"))}catch{}};// a signed-in user's account syncs after saves (account.js)
// Add a new design to what is stored now (and make it the one the full Lab opens, unless current is null).
const persistNew=(lab,d,current)=>{const latest=load(lab);latest.designs[d.id]=d;if(current)latest.current=current;save(latest)};
const savedSpeed=()=>{let v=NaN;try{v=+localStorage.getItem("tk-lab-speed")}catch{}return SPEEDS.some(s=>s[1]===v)?v:1/60};
const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:n.x??0,y:n.y??0},data:{kind:n.type,config:n.config||{},...(n.name?{name:n.name}:{})}})),edges:d.edges.map(e=>edge(e.from,e.to))});
const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x),y:Math.round(n.position.y),...(n.data.name?{name:n.data.name}:{}),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target}))});
const edge=(source,target)=>({id:"e:"+JSON.stringify([source,target]),source,target,type:"arrow",markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16,color:"#1c2733"}});

const ICON={cdn:"M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5",client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",lb:"M10 3v4M10 7l-6 6M10 7l6 6M10 7v6M2 13h4v4H2zM8 13h4v4H8zM14 13h4v4h-4z",cache:"M11 2L4 11h5l-1 7 7-9h-5z",queue:"M2 7h16v6H2zM6 7v6M10 7v6M14 7v6",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
const level=u=>u>1+1e-9?"over":u>=0.7?"warn":"ok";

function CompNode({id,data,selected}){const{cat,result,running,run,trace}=useContext(Ctx);const comp=cat[data.kind];const r=result.nodes[id];
const back=run.down[id];const st=back!==undefined?"down":running&&r&&data.kind!=="client"?level(r.utilisation):"";
return <div className={"ln"+(selected?" sel":"")+(st?" "+st:"")+(trace?.at===id?" ln-trace":"")}>
{data.kind!=="client"&&<Handle type="target" position={Position.Left}/>}
<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div>
<b>{displayName(comp,{name:data.name,config:data.config})}</b><span className="ln-sum">{data.name?(roleOf(comp,data.config)?.label||comp.name)+" · ":roleOf(comp,data.config)?comp.name+" · ":""}{summary(comp,run.scale?.[id]?{...data.config,live:run.scale[id].n}:data.config)}{run.scale?.[id]?.pending.length?` · +${run.scale[id].pending.reduce((a,p)=>a+p.n,0)} booting`:""}</span>
{back!==undefined?<span className="ln-m ln-down">CRASHED · back in {Math.max(1,Math.ceil(back-run.t))} min{data.kind==="cache"&&cacheFlow(comp,data.config).fallThrough?" · queries go to the database":""}</span>:running&&r&&(data.kind==="client"?<span className="ln-m">sending {num(r.offered)} req/s{r.offered>(data.config.rps||0)*1.001?" incl. retries":""}</span>
:data.kind==="queue"?<span className={"ln-m"+(run.backlog?.[id]>0?" ln-q":"")}>{num(r.served)}/s in · {num(r.delivered)}/s to workers{run.backlog?.[id]>0?` · backlog ${num(run.backlog[id])}`:""}</span>
:<><div className="ln-bar"><i style={{width:Math.min(100,r.utilisation*100)+"%"}}/></div><span className="ln-m">{Math.round(r.utilisation*100)}% · {Math.round(r.latencyMs)} ms{r.dropped>0?` · drops ${num(r.dropped)}/s`:""}</span>
{data.kind==="cache"&&run.cold?.[id]!==undefined&&<span className="ln-m ln-q">warming up · {Math.round(r.hit*100)}% hits</span>}{data.kind==="cache"&&run.backlog?.[id]>0&&<span className="ln-m ln-q">unflushed writes {num(run.backlog[id])}</span>}</>)}
{data.kind==="database"&&!running&&back===undefined&&data.config?.schema?.tables?.length>0&&<span className="ln-m ln-sch">{schemaSummary(engineOf(comp,data.config),data.config.schema)}</span>}
{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const nodeTypes={comp:CompNode};
// Arrows: click (or tap) one to select it; a selected arrow shows ✕ to remove it (Delete works too).
function Arrow({id,source,target,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,markerEnd,selected}){const rf=useReactFlow();const{trace}=useContext(Ctx);const[path,lx,ly]=getSmoothStepPath({sourceX,sourceY,sourcePosition,targetX,targetY,targetPosition});
const fwd=trace&&trace.from===source&&trace.at===target,back=trace&&trace.from===target&&trace.at===source;
return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={fwd||back?{stroke:"#1d4ed8",strokeWidth:2.5}:undefined}/>{(fwd||back)&&<circle r="6" className="lab-dot" key={trace.n}><animateMotion dur="0.9s" repeatCount="indefinite" path={path} keyPoints={back?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"/></circle>}{selected&&<EdgeLabelRenderer><button type="button" className="lab-edge-x nodrag nopan" style={{transform:`translate(-50%,-50%) translate(${lx}px,${ly}px)`}} onClick={()=>rf.deleteElements({edges:[{id}]})} aria-label="Remove this arrow" title="Remove this arrow">✕</button></EdgeLabelRenderer>}</>}
const edgeTypes={arrow:Arrow};

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
<p className="lab-tip">Drag a component onto the canvas, or tap it to add it. Connect two components by dragging from the dot on the right of one to the dot on the left of the other. To remove a component or an arrow, click it and press Delete, or use the ✕ on a selected arrow.</p></aside>}

// The Clients' traffic over one simulated day (multiplier 0–1 of the rps setting), with "now".
function DayChart({comp,config,hours}){const w=240,h=56,pts=[];for(let m=0;m<=1440;m+=10)pts.push(`${(m/1440*w).toFixed(1)},${(h-trafficAt(comp,config,m)*(h-6)).toFixed(1)}`);const x=((hours%24)+24)%24/24*w;
return <figure className="lab-day"><svg viewBox={`0 0 ${w} ${h+14}`} role="img" aria-label="Requests per second over the simulated day"><path d={`M0,${h}L${pts.join("L")}L${w},${h}Z`} className="lab-day-a"/><path d={`M${pts.join("L")}`} className="lab-day-l"/>
<line x1={x} x2={x} y1="0" y2={h} className="lab-day-now"/>{[0,6,12,18,24].map(t=><text key={t} x={t/24*w} y={h+11} textAnchor={t===0?"start":t===24?"end":"middle"}>{String(t).padStart(2,"0")}:00</text>)}</svg>
<figcaption>Now {simTime(hours).split(", ")[1]} · {num((config.rps??comp.rps.default)*trafficAt(comp,config,hours*60))} req/s</figcaption></figure>}
function Field({label,children}){return <label className="lab-f"><span>{label}</span>{children}</label>}
// A database's schema in its settings: what it holds, its problems, and the editor.
function SchemaBox({comp,cfg,set,title,suggest}){const[open,setOpen]=useState(false);const e=engineOf(comp,cfg),v=vocab(e),iss=schemaIssues(e,cfg.schema),errs=iss.filter(x=>x.level==="error").length;
return <div className="lab-sch"><div className="lab-h">{(comp.schemaLabel||"Schema").toUpperCase()}</div>
<p className="lab-note lab-note-tight">{cfg.schema?.tables?.length?schemaSummary(e,cfg.schema):`No ${v.tables} yet. Add them so request tests can see where data lives and how it is found.`}</p>
{iss.length>0&&<p className={"lab-note lab-note-tight "+(errs?"lab-warn":"")}>{errs?`${errs} problem${errs>1?"s":""}`:""}{errs&&iss.length>errs?" · ":""}{iss.length>errs?`${iss.length-errs} warning${iss.length-errs>1?"s":""}`:""}: open the schema to see them.</p>}
<button type="button" className="lab-btn ghost" onClick={()=>setOpen(true)}>{cfg.schema?.tables?.length?"Edit schema":`Add ${v.tables}`}</button>
{open&&<SchemaEditor engine={e} schema={cfg.schema} title={title} suggest={suggest} save={schema=>set({schema})} close={()=>setOpen(false)}/>}</div>}
function Inspector({lab,cat,node,edge,result,running,update,rename,remove,removeEdge,run,names,hours,labelOf,ch,best,goals,score,conn,fieldHints,hl=2}){
// hl: the level of its headings, one below the Lab's own title (h1 on its own page, h3 inside the landing page's section)
const H="h"+hl;
// Settings a challenge fixes are shown at the challenge's value and can't be changed (QA M4).
const fx=ch?.fixed||{},lockOf=t=>t==="server"?{queriesPerRequest:fx.queriesPerRequest}:t==="cache"?{hitPct:fx.hitPct,writePct:fx.writePct}:t==="cdn"?{hitPct:fx.cdnHitPct,live:fx.cdnLive}:{};
const chBox=ch&&<div className="lab-ch"><div className="lab-h">CHALLENGE · {lab.levels.find(l=>l.id===ch.level)?.label.toUpperCase()}</div><H>{ch.title}</H><p className="lab-desc">{ch.brief}</p>
<ul className="lab-goals">{ch.stars.map((g,i)=><li key={i} className={goals?(goals[i]?"ok":""):i<(best||0)?"ok":""}><b>★</b><span>{g.label}</span></li>)}</ul><details className="lab-hint"><summary>Hint</summary><p>{ch.hint}</p></details>
<button type="button" className="lab-btn lab-score-btn" onClick={score}>Score my design</button><p className="lab-note lab-note-tight">The challenge sets the traffic{ch.fixed?" and some settings":""}. Best so far: <Stars n={best||0} max={ch.stars.length}/></p></div>;
if(!node&&edge)return <aside className="lab-ins" tabIndex={0} aria-label="Arrow"><div className="lab-h">ARROW</div><H>{labelOf(edge.source)} → {labelOf(edge.target)}</H>
<p className="lab-desc">Traffic flows this way. Remove the arrow to stop it; drag from the dot on the right of one component to the dot on the left of another to add a new one.</p>
<button type="button" className="lab-btn ghost" onClick={()=>removeEdge(edge.id)}>Remove arrow</button><p className="lab-note">Shortcut: select an arrow and press Delete, or use the ✕ on it.</p></aside>;
if(!node)return <aside className="lab-ins" tabIndex={0} aria-label="Details">{chBox}<div className="lab-h">DESIGN</div>
<dl className="lab-kv"><dt>Monthly cost</dt><dd>{usd(result.total.monthlyCost)}</dd><dt>Budget</dt><dd>{usd(lab.budget)}</dd><dt>Region</dt><dd>{lab.region}</dd></dl>
{run.sent>0&&<dl className="lab-kv"><dt>Availability this run</dt><dd className={run.served/run.sent<0.999?"over":""}>{(100*run.served/run.sent).toFixed(2)}%</dd><dt>Run time</dt><dd>{duration(run.t/60)}</dd>{run.lost>0&&<><dt>Writes lost</dt><dd className="over">{num(run.lost)}</dd></>}</dl>}
{run.events.length>0&&<><div className="lab-h lab-log-h">RUN LOG</div><ol className="lab-log">{[...run.events].reverse().slice(0,12).map((e,i)=><li key={i} className={e.kind}><small>{simTime(run.start+e.t/60)}</small>{eventText(e,names,cat,lab)}</li>)}</ol></>}
<p className="lab-note">{lab.crashNote}</p><p className="lab-note">{lab.priceNote}</p><p className="lab-note">{lab.modelNote}</p></aside>;
const comp=cat[node.data.kind],r=result.nodes[node.id],lock=Object.fromEntries(Object.entries(lockOf(comp.type)).filter(([,v])=>v!==undefined)),cfg={...node.data.config,...lock},locked=k=>Object.hasOwn(lock,k);const set=patch=>update(node.id,{...cfg,...patch});
return <aside className="lab-ins" tabIndex={0} aria-label="Component settings"><div className="lab-h">{comp.group.toUpperCase()}</div><H><Glyph kind={comp.type}/>{displayName(comp,{name:node.data.name,config:cfg})}</H>{node.data.name&&<p className="lab-note lab-note-tight">{roleOf(comp,cfg)?.label||comp.name}</p>}
<Field label="Name"><input type="text" maxLength={MAX_NAME} value={node.data.name||""} placeholder={roleOf(comp,cfg)?.label||comp.name} onChange={e=>rename(node.id,e.target.value.slice(0,MAX_NAME))} onBlur={e=>{const v=e.target.value.replace(/\s+/g," ").trim();if(v!==(node.data.name||""))rename(node.id,v)}}/></Field><p className="lab-desc">{comp.desc}</p>{comp.like&&<p className="lab-like"><b>IN REAL LIFE</b>{comp.like}</p>}
{comp.type==="client"&&ch&&<p className="lab-like"><b>SET BY THE CHALLENGE</b>{num(ch.traffic.rps)} req/s at the busiest moment · {comp.patterns?.find(p=>p.id===ch.traffic.pattern)?.label||ch.traffic.pattern}. Your settings here are ignored while it runs.</p>}
{comp.type==="client"&&<Field label={comp.rps.label}><input type="number" min={comp.rps.min} max={comp.rps.max} step="100" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:Math.max(comp.rps.min,Math.min(comp.rps.max,+e.target.value||0))})}/><input type="range" min={comp.rps.min} max={Math.min(comp.rps.max,Math.max(20000,cfg.rps??0))} step="50" value={cfg.rps??comp.rps.default} onChange={e=>set({rps:+e.target.value})} aria-label={comp.rps.label}/></Field>}
{comp.type==="client"&&comp.patterns&&<><Field label="Traffic through the day"><select value={patternOf(comp,cfg)?.id||comp.patterns[0].id} onChange={e=>set({pattern:e.target.value})}>{comp.patterns.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></Field><p className="lab-note lab-note-tight">{patternOf(comp,cfg)?.desc||comp.patterns[0].desc}</p><DayChart comp={comp} config={cfg} hours={hours}/></>}
{comp.type==="database"&&comp.engines&&(()=>{const e=engineOf(comp,cfg),fam=[...new Set(comp.engines.map(x=>x.family))];return <><Field label={comp.engineLabel||"Engine"}><select value={e.id} onChange={ev=>{const n=comp.engines.find(x=>x.id===ev.target.value),c={...cfg,engine:n.id};set({engine:n.id,size:sizesOf(comp,c)[1],...(n.replicas===false?{replicas:0}:{}),...(n.multiAz==="builtin"?{multiAz:false}:{})})}}>{fam.map(f=><optgroup key={f} label={f}>{comp.engines.filter(x=>x.family===f).map(x=><option key={x.id} value={x.id}>{x.aws.startsWith(x.label)?x.aws:`${x.label} · ${x.aws}`}</option>)}</optgroup>)}</select></Field>
<p className="lab-note lab-note-tight">{e.desc}</p>{e.features?.length>0&&<p className="lab-note lab-note-tight lab-good"><b>Good at:</b> {e.features.map(f=>comp.features?.find(x=>x.id===f)?.label||f).join(", ")}.</p>}</>})()}
{comp.type==="database"&&comp.engines&&<SchemaBox key={node.id} comp={comp} cfg={cfg} set={set} title={displayName(comp,{name:node.data.name,config:cfg})} suggest={fieldHints||[]}/>}
{comp.roles&&<><Field label="What it does"><select value={roleOf(comp,cfg)?.id||""} onChange={e=>set({role:e.target.value||undefined})}><option value="">{comp.name} (general)</option>{comp.roles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></Field><p className="lab-note lab-note-tight">{roleOf(comp,cfg)?.desc||lab.roleNote}</p></>}
{sizesOf(comp,cfg)[0]&&!perRequest(comp,cfg)&&<Field label="Size"><select value={sizeOf(comp,cfg)?.id||sizesOf(comp,cfg)[1]} onChange={e=>set({size:e.target.value})}>{sizesOf(comp,cfg)[0].map(s=><option key={s.id} value={s.id}>{s.label} · {num(s.rps||s.qps||s.ops)} {s.rps?"req":s.qps?"queries":"ops"}/s · ${s.hourly}/h</option>)}</select></Field>}
{comp.queriesPerRequest&&<Field label={comp.queriesPerRequest.label+(locked("queriesPerRequest")?" · set by the challenge":"")}><input type="number" disabled={locked("queriesPerRequest")} min={comp.queriesPerRequest.min} max={comp.queriesPerRequest.max} value={cfg.queriesPerRequest??comp.queriesPerRequest.default} onChange={e=>set({queriesPerRequest:Math.max(comp.queriesPerRequest.min,Math.min(comp.queriesPerRequest.max,Math.round(+e.target.value)||1))})}/></Field>}
{["hitPct","writePct"].map(k=>comp[k]&&comp.type!=="database"&&<Field key={k} label={comp[k].label+(locked(k)?" · set by the challenge":"")}><input type="number" disabled={locked(k)} min={comp[k].min} max={comp[k].max} value={cfg[k]??comp[k].default} onChange={e=>set({[k]:Math.max(comp[k].min,Math.min(comp[k].max,Math.round(+e.target.value)||0))})}/><input type="range" disabled={locked(k)} min={comp[k].min} max={comp[k].max} value={cfg[k]??comp[k].default} onChange={e=>set({[k]:+e.target.value})} aria-label={comp[k].label}/></Field>)}
{comp.autoscaling&&<label className="lab-check"><input type="checkbox" checked={!!cfg.autoscale} onChange={e=>set({autoscale:e.target.checked,...(e.target.checked&&cfg.maxCount===undefined?{maxCount:Math.max(cfg.count??comp.count.default,comp.autoscaling.defaultMax)}:{})})}/>{comp.autoscaling.label}</label>}
{comp.type==="cache"&&["writePolicy","onDown"].map(k=>comp[k]&&<React.Fragment key={k}><Field label={comp[k].label}><select value={cfg[k]&&comp[k].options.some(o=>o.id===cfg[k])?cfg[k]:comp[k].default} onChange={e=>set({[k]:e.target.value})}>{comp[k].options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>
<p className="lab-note lab-note-tight">{(comp[k].options.find(o=>o.id===cfg[k])||comp[k].options.find(o=>o.id===comp[k].default)).desc}</p></React.Fragment>)}
{comp.type==="cache"&&running&&r&&<dl className="lab-kv"><dt>Hits now</dt><dd className={run.cold?.[node.id]!==undefined?"warn":""}>{Math.round(r.hit*100)}% of reads{run.cold?.[node.id]!==undefined?" · warming up":""}</dd>{cacheFlow(comp,cfg).back&&<><dt>Unflushed writes</dt><dd className={run.backlog?.[node.id]>0?"warn":""}>{num(run.backlog?.[node.id]||0)}</dd></>}</dl>}
{comp.count&&<Field label={autoscaled(comp,cfg)?comp.autoscaling.minLabel:comp.count.label}><input type="number" min={comp.count.min} max={comp.count.max} value={cfg.count??comp.count.default} onChange={e=>{const v=Math.max(comp.count.min,Math.min(comp.count.max,Math.round(+e.target.value)||1));set({count:v,...(cfg.maxCount!==undefined&&cfg.maxCount<v?{maxCount:v}:{})})}}/></Field>}
{autoscaled(comp,cfg)&&<><Field label={comp.autoscaling.maxLabel}><input type="number" min={cfg.count??comp.count.default} max={comp.count.max} value={scaleRange(comp,cfg)[1]} onChange={e=>set({maxCount:Math.max(cfg.count??comp.count.default,Math.min(comp.count.max,Math.round(+e.target.value)||1))})}/></Field>
<p className="lab-note lab-note-tight">{comp.autoscaling.note}{comp.autoscaling.like?` ${comp.autoscaling.like}`:""}</p>{running&&run.scale?.[node.id]&&<dl className="lab-kv"><dt>Running now</dt><dd>{run.scale[node.id].n} instances{run.scale[node.id].pending.length?` · ${run.scale[node.id].pending.reduce((a,p)=>a+p.n,0)} booting`:""}</dd></dl>}</>}
{comp.live&&<label className="lab-check"><input type="checkbox" disabled={locked("live")} checked={!!cfg.live} onChange={e=>set({live:e.target.checked})}/>{comp.live.label}{locked("live")?" · set by the challenge":""}</label>}
{comp.multiAz&&(engineOf(comp,cfg)?.multiAz==="builtin"?<p className="lab-note lab-note-tight">AWS keeps copies in three zones: losing one zone or machine doesn't take it down, and there is no standby to add.</p>:engineOf(comp,cfg)?.multiAz!=="none"&&<label className="lab-check"><input type="checkbox" checked={!!cfg.multiAz} onChange={e=>set({multiAz:e.target.checked})}/>{comp.multiAz.label}</label>)}
{comp.type==="database"&&comp.replicas&&engineOf(comp,cfg)?.replicas!==false&&<Field label={comp.replicas.label}><input type="number" min={comp.replicas.min} max={comp.replicas.max} value={replicasOf(comp,cfg)} onChange={e=>set({replicas:Math.max(comp.replicas.min,Math.min(comp.replicas.max,Math.round(+e.target.value)||0))})}/></Field>}
{comp.type==="database"&&comp.writePct&&(replicasOf(comp,cfg)>0||perRequest(comp,cfg))&&<Field label={comp.writePct.label}><input type="number" min={comp.writePct.min} max={comp.writePct.max} value={cfg.writePct??comp.writePct.default} onChange={e=>set({writePct:Math.max(comp.writePct.min,Math.min(comp.writePct.max,Math.round(+e.target.value)||0))})}/></Field>}
{comp.type==="database"&&perRequest(comp,cfg)&&(()=>{const e=engineOf(comp,cfg);return <dl className="lab-kv"><dt>Price</dt><dd>${e.readPerMillion} per million reads · ${e.writePerMillion} per million writes</dd><dt>Limit</dt><dd>{num(e.limitQps)} requests/s</dd></dl>})()}
{comp.type==="apigw"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.pricePerMillion} per million requests</dd><dt>Limit</dt><dd>{num(comp.limitRps)} req/s</dd></dl>}
{comp.type==="cdn"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.pricePer10k} per 10,000 requests</dd><dt>Limit</dt><dd>{num(comp.limitRps)} req/s</dd>{running&&r&&<><dt>To your servers</dt><dd>{num(r.served*(1-(cfg.hitPct??comp.hitPct.default)/100))}/s</dd></>}</dl>}
{comp.type==="lb"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.hourly}/hour + ${comp.lcuHourly} per LCU-hour</dd><dt>1 LCU</dt><dd>≈ {num(comp.rpsPerLcu)} req/s</dd></dl>}
{comp.type==="queue"&&<dl className="lab-kv"><dt>Price</dt><dd>${comp.pricePerMillion} per million requests</dd>{running&&r&&<><dt>Sent to workers</dt><dd>{num(r.delivered)}/s</dd><dt>Backlog</dt><dd className={run.backlog?.[node.id]>0?"warn":""}>{num(run.backlog?.[node.id]||0)} messages{run.backlog?.[node.id]>0&&r.delivered>r.served?` · clears in ${duration(run.backlog[node.id]/(r.delivered-r.served)/3600)}`:""}</dd></>}</dl>}
<dl className="lab-kv">{comp.type!=="client"&&<><dt>Capacity</dt><dd>{r&&r.capacity!==Infinity?num(r.capacity)+(comp.type==="database"?" queries/s":comp.type==="cache"?" ops/s":comp.type==="queue"?" messages/s":" req/s"):"—"}</dd></>}<dt>Monthly cost</dt><dd>{usd(r?.cost||0)}</dd>
{running&&r&&comp.type!=="client"&&<><dt>Load</dt><dd className={level(r.utilisation)}>{num(r.offered)}/s · {Math.round(r.utilisation*100)}%</dd><dt>Latency here</dt><dd>{Math.round(r.latencyMs)} ms</dd><dt>Dropped</dt><dd>{num(r.dropped)}/s</dd></>}{running&&r?.readOnly&&<><dt>Primary down</dt><dd className="warn">replicas answer reads; writes fail</dd></>}</dl>
{conn&&<div className="lab-conn"><div className="lab-h">ARROWS OUT</div>{conn.out.length?<ul>{conn.out.map(e=><li key={e.id}><span>→ {labelOf(e.target)}</span><button type="button" className="lab-x" aria-label={`Remove the arrow to ${labelOf(e.target)}`} onClick={()=>removeEdge(e.id)}>✕</button></li>)}</ul>:<p className="lab-note lab-note-tight">None yet.</p>}
{conn.targets.length>0&&<Field label="Connect to"><select value="" onChange={e=>{if(e.target.value)conn.add(e.target.value)}}><option value="">Choose a component…</option>{conn.targets.map(n=><option key={n.id} value={n.id}>{labelOf(n.id)}{conn.dupName(n)?` (${n.id})`:""}</option>)}</select></Field>}</div>}
<button type="button" className="lab-btn ghost" onClick={()=>remove(node.id)}>Remove from design</button></aside>}

// Learner progress (stars per challenge), kept in sync across the page.
function useProgress(){const[p,setP]=useState(readProgress);useEffect(()=>{const on=()=>setP(readProgress());addEventListener("tk-progress",on);addEventListener("storage",on);return()=>{removeEventListener("tk-progress",on);removeEventListener("storage",on)}},[]);return p}
const Stars=({n,max=3})=><span className="lab-stars" aria-label={`${n} of ${max} stars`}>{"★".repeat(n)}<i>{"★".repeat(Math.max(0,max-n))}</i></span>;
const goalValue=(c)=>c.kind==="availability"?`${c.value.toFixed(2)}%`:c.kind==="cost"?`${usd(c.value)}/month`:c.kind==="spend"?usd(c.value):c.kind==="noCrash"?(c.value?`${c.value} crash${c.value>1?"es":""}`:"none"):c.kind==="noLostWrites"?(c.value?`${num(c.value)} writes lost`:"none"):"";
function Score({ch,res,next,close,more,lab}){const names=t=>lab.components.find(c=>c.type===t)?.name||t;const ref=useRef(null);const box=useRef(null);const trap=e=>{if(e.key!=="Tab")return;const f=[...box.current.querySelectorAll("button,a[href]")];if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}};useEffect(()=>{ref.current?.focus();const k=e=>{if(e.key==="Escape")close()};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[]);// eslint-disable-line
return <div className="lab-score-back" onClick={e=>{if(e.target===e.currentTarget)close()}}><div className="lab-score" role="dialog" aria-modal="true" aria-label={`Score: ${ch.title}`} ref={box} onKeyDown={trap}>
<div className="lab-h">CHALLENGE SCORE</div><h3>{ch.title}</h3>{res.error?<p className="lab-warn">{res.error}</p>:<><div className="lab-score-stars"><Stars n={res.stars} max={res.max}/></div>{res.missing&&<p className="lab-warn lab-missing">{(lab.requiresNote||"Every request has to go through: {types}. Some never reach the {missing}.").replace("{types}",ch.requires.map(names).join(", ")).replace("{missing}",names(res.missing))}</p>}
<ul className="lab-goals">{res.checks.map((c,i)=><li key={i} className={c.ok?"ok":"no"}><b>{c.ok?"✓":"✕"}</b><span>{c.label}</span><small>{goalValue(c)}</small></li>)}</ul>
<p className="lab-note">{res.stars===res.max?"Every star. Try the next one.":res.stars===0&&!res.checks[0].ok?"No stars yet: the first goal has to be met before the others count.":"Some goals left. Change the design and score it again."} Simulated {ch.hours} hours from {String(Math.floor(ch.startHour)).padStart(2,"0")}:00{ch.chaos?.length?", with the crash the challenge causes":""}.</p></>}
<div className="lab-score-act"><button type="button" ref={ref} className="lab-btn ghost" onClick={close}>Keep improving</button>{next&&<button type="button" className="lab-btn" onClick={next}>Next challenge →</button>}{more&&<a className="lab-btn" href={more.href}>{more.open} →</a>}</div></div></div>}

function Canvas({lab,start,embedded,problem,onDesign,trace}){const cat=useMemo(()=>catalogue(lab),[lab]);
// a request being watched: the view follows it from component to component, centred in the part of the
// canvas above the results (which cover its lower part)
const followRf=useReactFlow();useEffect(()=>{if(!trace)return;const go=()=>{const ns=[trace.at,trace.from].filter(Boolean).map(id=>followRf.getNode(id)).filter(Boolean);if(!ns.length)return;
const box=ns.reduce((b,n)=>{const w=n.measured?.width||176,h=n.measured?.height||80;return{x0:Math.min(b.x0,n.position.x),y0:Math.min(b.y0,n.position.y),x1:Math.max(b.x1,n.position.x+w),y1:Math.max(b.y1,n.position.y+h)}},{x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity});
// the part of the canvas actually on screen: below the top of the window, above the results panel
const el=document.querySelector(".lab-watch .react-flow");if(!el)return;const fr=el.getBoundingClientRect(),pl=document.querySelector(".sv-player")?.getBoundingClientRect();
const top=Math.max(fr.top,0),bottom=Math.min(fr.bottom,pl&&pl.top>top+60?pl.top:fr.bottom,innerHeight),visH=Math.max(80,bottom-top),W=fr.width;
const zoom=Math.max(0.35,Math.min(1.1,(W-40)/(box.x1-box.x0+60),(visH-30)/(box.y1-box.y0+50)));
// setCenter puts a point at the middle of the canvas; shift it so the hop lands in the middle of the visible part
followRf.setCenter((box.x0+box.x1)/2,(box.y0+box.y1)/2+(fr.height/2-((top+bottom)/2-fr.top))/zoom,{zoom,duration:450})};
// wait for the canvas to widen (the side panels hide while watching) before centring
const t=setTimeout(go,trace.n===0?120:0);return()=>clearTimeout(t)},[trace?.n,trace?.at]);// eslint-disable-line
const rf=useReactFlow();useEffect(()=>track("lab_open",{embedded:!!embedded,challenge:start||""}),[]);// eslint-disable-line

const[store,setStore]=useState(()=>{const s=load(lab);const sc=start&&(lab.challenges||[]).find(c=>c.id===start);
// Opened on a problem (#problems/<slug>): its own design, id "q-<slug>" on every device, starting with just
// the Clients; the visitor builds the rest. A deleted one is made again under a new id.
// problem.load (Reset, Copy the solution, Undo in solve.jsx): put that design on the canvas in place of
// this one; credit is kept unless load.credit says otherwise.
if(problem){const pid="q-"+problem.id;const mine=s.designs[pid]?pid:Object.values(s.designs).filter(d=>d.problem===problem.id).sort((a,b)=>b.updated-a.updated)[0]?.id;
const L=problem.load,put=d=>L?{...d,...structuredClone({nodes:L.nodes,edges:L.edges}),...(L.credit?{credit:{...L.credit}}:{}),updated:Date.now()}:d;
if(mine){s.current=mine;if(L){s.designs[mine]=put(s.designs[mine]);persistNew(lab,s.designs[mine],mine)}return s}
const fresh=!deletedIds().has(pid),id=fresh?pid:newId("design");s.designs[id]=put({id,name:problem.name,updated:fresh?1:Date.now(),...(problem.start?structuredClone({nodes:problem.start.nodes,edges:problem.start.edges}):{nodes:[{id:"clients",type:"client",x:0,y:160,config:defaultConfig(cat.client)}],edges:[]}),credit:{spent:0,hours:0},problem:problem.id});s.current=id;persistNew(lab,s.designs[id],id);return s}
// Opened on a challenge (the landing page, #lab/<id>): open this browser's latest design for it, or make
// one from its start, without creating the example design too (QA H7).
if(sc){const mine=Object.values(s.designs).filter(d=>d.challenge===start).sort((a,b)=>b.updated-a.updated)[0];if(mine){s.current=mine.id;return s}/* A challenge's untouched starting design has the same id on every device and the oldest possible
time, so signed-in copies merge into one and any real edit (re-stamped on save) wins over it. */
const stable="ch-"+start,fresh=!s.designs[stable]&&!deletedIds().has(stable),id=fresh?stable:newId("design");s.designs[id]={id,name:sc.title,updated:fresh?1:Date.now(),...structuredClone({nodes:sc.start.nodes,edges:sc.start.edges}),credit:{spent:0,hours:0},challenge:start};s.current=id;persistNew(lab,s.designs[id],embedded?null:id);return s}
if(!Object.keys(s.designs).length){const id=newId("design");s.designs[id]={id,name:lab.example.name,updated:Date.now(),...structuredClone({nodes:lab.example.nodes,edges:lab.example.edges})};s.current=id}if(!s.designs[s.current])s.current=Object.keys(s.designs)[0];return s});
const cur=store.designs[store.current];const init=useMemo(()=>toFlow(cur),[store.current]);// eslint-disable-line
const[nodes,setNodes,onNodesChange]=useNodesState(init.nodes);const[edges,setEdges,onEdgesChange]=useEdgesState(init.edges);
const[name,setName]=useState(cur.name);const[running,setRunning]=useState(false);const[credit,setCredit]=useState(()=>cur.credit||{spent:0,hours:0});const[run,setRun]=useState(newRun);const[speed,setSpeedState]=useState(savedSpeed);const setSpeed=v=>{setSpeedState(v);try{localStorage.setItem("tk-lab-speed",String(v))}catch{}};const[ended,setEnded]=useState(false);const wrap=useRef(null);const loaded=useRef(store.current);
useEffect(()=>{if(loaded.current===store.current&&nodes.length)return;loaded.current=store.current;const f=toFlow(store.designs[store.current]);setNodes(f.nodes);setEdges(f.edges);setName(store.designs[store.current].name);setCredit(store.designs[store.current].credit||{spent:0,hours:0});setEnded(false);setRun(newRun());setRunning(false);setTimeout(()=>rf.fitView({padding:.25,maxZoom:1}),30)},[store.current]);// eslint-disable-line
// Saving (QA H3, H4): every save re-reads what is stored and writes back only this design, so two
// tabs don't overwrite each other's designs. Edits are saved 400 ms after they stop; while traffic
// runs, the spent credit is saved at most every 2 s; leaving the page, the section or the design
// saves at once. The embedded Lab (landing page) never changes which design the full Lab opens.
const snap=useRef(null);snap.current={nodes,edges,name,credit};const storeRef=useRef(store);storeRef.current=store;
const writeDesign=useCallback(id=>{const mem=storeRef.current.designs[id];if(!id||!mem)return;const latest=load(lab),cur=snap.current;
const base=latest.designs[id]||mem,next={name:cur.name.trim()||"Untitled design",...fromFlow(cur.nodes,cur.edges),credit:cur.credit};
// Unchanged designs aren't re-saved: a save stamps "updated", and a needless stamp would make an old
// copy look newer than a deletion or edit synced from another device.
const same=k=>JSON.stringify(base[k]??null)===JSON.stringify(next[k]??null);if(latest.designs[id]&&["name","nodes","edges","credit"].every(same))return;
const d={...base,...next,updated:Date.now()};
latest.designs[id]=d;if(!embedded)latest.current=storeRef.current.current;save(latest);setStore(s=>({...s,designs:{...latest.designs,[id]:d}}))},[lab,embedded]);
useEffect(()=>{const id=loaded.current;const t=setTimeout(()=>writeDesign(id),400);return()=>clearTimeout(t)},[nodes,edges,name]);// eslint-disable-line
// The problem workspace judges the design on the canvas as it is now (solve.jsx Run / Submit).
useEffect(()=>{onDesign?.(fromFlow(nodes,edges))},[nodes,edges]);// eslint-disable-line
useEffect(()=>{if(problem?.load)problem.onLoaded?.()},[]);// eslint-disable-line
const lastCredit=useRef(0);useEffect(()=>{const now=Date.now();if(now-lastCredit.current<2000)return;lastCredit.current=now;writeDesign(loaded.current)},[credit]);// eslint-disable-line
useEffect(()=>{if(!running)writeDesign(loaded.current)},[running]);// eslint-disable-line
useEffect(()=>{const flush=()=>writeDesign(loaded.current);addEventListener("pagehide",flush);return()=>{removeEventListener("pagehide",flush);flush()}},[writeDesign]);
// Another tab changed the designs: take its list, keep what this tab has open.
useEffect(()=>{const on=e=>{if(e.key!==STORE_KEY)return;const latest=load(lab);setStore(s=>({...latest,current:latest.designs[s.current]?s.current:latest.current}))};const synced=()=>on({key:STORE_KEY});addEventListener("storage",on);addEventListener("tk-lab-synced",synced);return()=>{removeEventListener("storage",on);removeEventListener("tk-lab-synced",synced)}},[lab]);
const progress=useProgress();const ch=(lab.challenges||[]).find(c=>c.id===store.designs[store.current]?.challenge)||null;const[score,setScore]=useState(null);
// In a challenge the challenge's traffic (and fixed settings) are what runs.
const design=useMemo(()=>{const d=fromFlow(nodes,edges);return ch?applyChallenge(d,ch):d},[nodes,edges,ch]);const downKey=Object.keys(run.down).sort().join();
// What the design is doing now: crashed parts, queue backlogs, autoscaled instances, and the Clients'
// traffic at the simulated time of day.
const result=useMemo(()=>simulate(design,lab,runOptions(run,credit.hours*60,lab)),[design,lab,run,credit.hours]);const designRef=useRef(design);designRef.current=design;const nodesRef=useRef(nodes);nodesRef.current=nodes;const chRef=useRef(ch);chRef.current=ch;
const names=useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,{kind:n.data.kind,label:displayName(cat[n.data.kind],{name:n.data.name,config:n.data.config})}])),[nodes,cat]);
const selected=nodes.find(n=>n.selected);const selEdge=selected?null:edges.find(e=>e.selected);
const labelOf=id=>{const n=nodes.find(x=>x.id===id);return n?displayName(cat[n.data.kind],{name:n.data.name,config:n.data.config,type:n.data.kind}):"?"};const removeEdge=id=>setEdges(es=>es.filter(e=>e.id!==id));
// While running, the simulated clock advances and the design's hourly cost is taken from its credit.
const burn=useRef(0);burn.current=result.total.burnPerHour;
useEffect(()=>{if(!running)return;const iv=setInterval(()=>{setRun(r=>{let n=advance(designRef.current,lab,r,speed*TICK/1000*60);const c=chRef.current;if(c?.chaos&&r.start%24===c.startHour%24)for(const x of c.chaos)if(r.t<x.minute&&n.t>=x.minute){const id=chaosTarget(designRef.current,lab,n,x.type);if(id)n=crashNow(designRef.current,lab,n,id)}return n});setCredit(c=>{const hours=speed*TICK/1000,cost=burn.current*hours;
// Stop the clock exactly when the credit runs out (part of the last tick).
if(c.spent+cost>=lab.budget)return{spent:lab.budget,hours:c.hours+(cost>0?hours*(lab.budget-c.spent)/cost:hours)};return{spent:c.spent+cost,hours:c.hours+hours}})},TICK);return()=>clearInterval(iv)},[running,speed,lab.budget,lab]);
useEffect(()=>{if(running&&credit.spent>=lab.budget){setRunning(false);setEnded(true)}},[credit,running,lab.budget]);
const add=useCallback((kind,pos)=>{if(nodesRef.current.length>=MAX_NODES)return;track("component_add",{type:kind});const comp=cat[kind];const id=newId(kind);const at=pos||rf.screenToFlowPosition({x:(wrap.current?.getBoundingClientRect().left||0)+(wrap.current?.clientWidth||600)/2,y:(wrap.current?.getBoundingClientRect().top||0)+(wrap.current?.clientHeight||400)/2});
setNodes(ns=>[...ns.map(n=>({...n,selected:false})),{id,type:"comp",position:freeSpot(ns,at.x-W/2,at.y-H/2),selected:true,data:{kind,config:defaultConfig(comp)}}])},[cat,rf,setNodes]);
const update=(id,config)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,data:{...n.data,config}}:n));
const rename=(id,name)=>setNodes(ns=>ns.map(n=>{if(n.id!==id)return n;const{name:_,...data}=n.data;return{...n,data:name?{...data,name}:data}}));
const remove=id=>{setNodes(ns=>ns.filter(n=>n.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id))};
const valid=c=>{const s=nodes.find(n=>n.id===c.source),t=nodes.find(n=>n.id===c.target);return !!s&&!!t&&c.source!==c.target&&t.data.kind!=="client"&&s.data.kind!=="database"&&!edges.some(e=>e.source===c.source&&e.target===c.target)};
const onConnect=useCallback(c=>setEdges(es=>addEdge(edge(c.source,c.target),es)),[setEdges]);
const[dragging,setDragging]=useState(false);
// Drop from the palette: only when released over the canvas.
const dropAt=(kind,x,y)=>{const r=wrap.current?.getBoundingClientRect();if(!cat[kind]||!r||x<r.left||x>r.right||y<r.top||y>r.bottom)return;add(kind,rf.screenToFlowPosition({x,y}))};
const pick=id=>{writeDesign(loaded.current);setStore(s=>({...s,current:id}));if(!embedded){const latest=load(lab);if(latest.designs[id]){latest.current=id;save(latest)}}};
const create=(src)=>{const id=newId("design");const d={id,name:src?src.name:"Untitled design",updated:Date.now(),nodes:src?structuredClone(src.nodes):[],edges:src?structuredClone(src.edges):[],credit:{spent:0,hours:0},...(src?.challenge?{challenge:src.challenge}:{})};writeDesign(loaded.current);persistNew(lab,d,embedded?null:id);setStore(s=>({...s,current:id,designs:{...s.designs,[id]:d}}));setMenu(false)};
// Start a challenge: reopen this browser's latest design for it, or start one from its starting design.
const startChallenge=id=>{const c=(lab.challenges||[]).find(x=>x.id===id);if(!c)return;track("challenge_start",{challenge:id});setScore(null);const mine=Object.values(store.designs).filter(d=>d.challenge===id).sort((a,b)=>b.updated-a.updated)[0];if(mine)pick(mine.id);else create({name:c.title,nodes:c.start.nodes,edges:c.start.edges,challenge:id})};
// A link to a challenge that doesn't exist says so instead of silently opening the last design (QA L3).
const badStart=start&&!(lab.challenges||[]).some(c=>c.id===start)?start:null;
const firstStart=useRef(start);useEffect(()=>{if(start&&start!==firstStart.current)startChallenge(start);firstStart.current=null},[start]);// eslint-disable-line
const scoreIt=()=>{if(!ch)return;const r=runChallenge(fromFlow(nodes,edges),lab,ch);if(!r.error){recordStars(ch.id,r.stars,r.checks.map(c=>c.ok));track("score",{challenge:ch.id,stars:r.stars,max:r.max,passed:r.checks.map(c=>c.ok?1:0).join(""),lite:false})}setScore(r)};
const nextCh=ch&&(()=>{const list=lab.challenges,i=list.findIndex(c=>c.id===ch.id);return list.slice(i+1).find(c=>(progress.stars[c.id]||0)<c.stars.length)||list.find(c=>c.id!==ch.id&&(progress.stars[c.id]||0)<c.stars.length)})();
// Out of credit: start the clock again with a fresh budget (there is no list of designs to duplicate from).
const refill=()=>{setRunning(false);setEnded(false);setRun(newRun());setCredit({spent:0,hours:0})};
const t=result.total,blocking=result.problems.filter(p=>!p.includes("no traffic")),left=Math.max(0,lab.budget-credit.spent),pct=left/lab.budget*100,out=left<=0;
const lasts=t.burnPerHour>0?left/t.burnPerHour:Infinity;
const flowEdges=useMemo(()=>edges.map(e=>{const dead=run.down[e.source]!==undefined||run.down[e.target]!==undefined;return{...e,animated:running&&!dead,className:dead?"dead":running?"live":""}}),[edges,running,downKey]);// eslint-disable-line
return <Ctx.Provider value={{cat,result,running,run,trace}}><div className={"lab"+(trace?" lab-watch":"")}>
<header className="lab-top">{embedded&&!embedded.h1?<h3 className="sr">{lab.title}</h3>:<h1 className="sr">{lab.title}</h1>}<input className="lab-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Design name" maxLength={60}/>
{embedded&&<a className="lab-btn ghost lab-open" href={embedded.href}>{embedded.back?`← ${embedded.open}`:`${embedded.open} →`}</a>}
{ch&&<button type="button" className="lab-btn ghost lab-score-top" onClick={scoreIt}>Score ★</button>}
<div className={"lab-budget"+(out||lasts<24*30?" over":"")} title={lab.priceNote}><span>{cents(left)} <small>credit left of {usd(lab.budget)}</small></span><div className="lab-meter"><i style={{width:pct+"%"}}/></div><small className="lab-burn">burns {usd(t.burnPerHour)}/hour · {usd(t.monthlyCost)}/month</small></div>
<label className="lab-speed"><span className="sr">Simulation speed</span><select value={speed} onChange={e=>setSpeed(+e.target.value)}>{SPEEDS.map(([l,h])=><option key={l} value={h}>{l}</option>)}</select></label>
<button type="button" className="lab-btn run" disabled={!running&&(blocking.length>0||out)} onClick={()=>{setEnded(false);if(!running){track("run_start",{nodes:nodes.length,challenge:ch?.id||""});if(run.t===0){let h=credit.hours;if(ch){const day=Math.floor(h/24+1e-9);h=day*24+ch.startHour;if(h<credit.hours-1e-6)h+=24;setCredit(c=>({...c,hours:h}))}setRun({...newRun(),start:h})}}setRunning(r=>!r)}}>{running?"■ Stop":"▶ Run traffic"}</button>
</header>
<div className="lab-status" aria-live="polite">{badStart?<span className="lab-warn">There is no challenge called “{badStart}”. Pick one on the Problems page.</span>:blocking.length?<span className="lab-warn">{blocking[0]}</span>:out?<><span className="lab-warn">{ended?`Credit used up after ${duration(credit.hours)} of traffic.`:"This design has no credit left."}</span><button type="button" className="lab-btn ghost lab-refill" onClick={refill}>Start again with a fresh {usd(lab.budget)}</button></>
:running||run.t>0?<>{!running&&<span className="lab-muted">Stopped ·</span>}<span><b>{simTime(credit.hours)}</b></span><span><b>{num(t.sentRps)}</b> req/s sent{t.clients>1?` by ${t.clients} Clients`:""}</span><span className={t.successPct<99.9?"bad":""}><b>{t.successPct>=99.95?"100":t.successPct.toFixed(1)}%</b> served</span>{t.successPct>=0.05&&<span><b>{Math.round(t.latencyMs)} ms</b> average latency</span>}{t.retryRps>0.5&&<span>+<b>{num(t.retryRps)}</b> retries/s</span>}{run.sent>0&&<span className={run.served/run.sent<0.999?"bad":""}>availability <b>{(100*run.served/run.sent).toFixed(2)}%</b></span>}{t.down.length>0&&<span className="lab-warn"><b>{t.down.length}</b> crashed</span>}{t.bottleneck&&<span>Busiest: <b>{cat[nodes.find(n=>n.id===t.bottleneck)?.data.kind]?.name}</b> at {Math.round(result.nodes[t.bottleneck].utilisation*100)}%</span>}{result.problems[0]&&<span className="lab-warn">{result.problems[0]}</span>}</>
:<span className="lab-muted">{result.problems[0]||`Press Run traffic to send the Clients' requests through your design. Credit is spent while it runs: at this design's cost ${usd(left)} lasts ${lasts===Infinity?"indefinitely":duration(lasts)}.`}</span>}</div>
<Palette lab={lab} onAdd={k=>add(k)} onDropAt={dropAt} setDragging={setDragging}/>
<div className={"lab-canvas"+(dragging?" drop":"")} ref={wrap}>
<ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={valid}
fitView fitViewOptions={{padding:.25,maxZoom:1}} minZoom={.25} maxZoom={2} snapToGrid snapGrid={[20,20]} deleteKeyCode={["Backspace","Delete"]} defaultEdgeOptions={{type:"arrow"}}>
<Background gap={20} size={1} color="#d9dee7"/><Controls showInteractive={false} position="bottom-left"/></ReactFlow>
{!nodes.length&&<div className="lab-empty">Drag components here from the left to start a design.</div>}</div>
<Inspector hl={embedded&&!embedded.h1?4:2} fieldHints={problem?.fields} rename={rename} conn={selected&&selected.data.kind!=="database"?{out:edges.filter(e=>e.source===selected.id),targets:nodes.filter(n=>valid({source:selected.id,target:n.id})),add:t=>onConnect({source:selected.id,target:t}),dupName:n=>nodes.filter(x=>x.data.kind===n.data.kind).length>1}:null} lab={lab} cat={cat} node={selected} edge={selEdge} removeEdge={removeEdge} labelOf={labelOf} result={result} running={running} update={update} remove={remove} run={run} names={names} hours={credit.hours} ch={ch} best={ch?progress.stars[ch.id]:0} goals={ch?progress.goals[ch.id]:null} score={scoreIt}/>
{score&&ch&&<Score lab={lab} ch={ch} res={score} close={()=>setScore(null)} next={embedded?.next&&nextCh?(()=>{location.hash=`problems/challenge/${nextCh.id}`}):null} more={embedded?.next?null:embedded}/>}
</div></Ctx.Provider>}

// Signed in, the account's designs are merged in before the Lab opens (at most 4 s), so a stale copy
// in this browser is never what gets edited.
export default function Lab({challenge,embedded,problem,onDesign,trace}){const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(async lab=>{useCatalogue(lab);await Promise.race([syncLab(),new Promise(r=>setTimeout(r,4000))]);set({lab})},()=>set({err:1}))};useEffect(go,[]);
if(st.err)return <LoadError what="the canvas" retry={go}/>;if(!st.lab)return <Loading label="Loading the canvas"/>;
return <div className="lab-wrap"><div className="lab-small">{st.lab.smallScreen}</div><ReactFlowProvider><Canvas trace={trace} lab={st.lab} start={challenge} embedded={embedded} problem={problem} onDesign={onDesign}/></ReactFlowProvider></div>}
