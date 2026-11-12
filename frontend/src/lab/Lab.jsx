// The design canvas: opens inside a problem (its Canvas tab), a challenge from Problems, or the landing page's IND vs PAK.
// The design is judged by the v2 evaluator (src/eval): a problem's Run and Submit (solve.jsx), a challenge's Score.
// The canvas shows a replayed load test minute by minute when one is being watched. The component catalogue, prices and
// settings come from the API (GET /v1/lab: content/lab.json and eval.json). Designs are kept in this browser.
import{BLUE,INK,LINE}from"../theme/palette.js";import{useTheme}from"../theme/mode.js";import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,ReactFlowProvider,Background,Controls,Handle,Position,MarkerType,addEdge,useNodesState,useEdgesState,useReactFlow,BaseEdge,EdgeLabelRenderer,getSmoothStepPath}from"@xyflow/react";
import"@xyflow/react/dist/style.css";import"./lab.css";import{schemaSummary}from"./schema.js";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";
import{catalogue,displayName,MAX_NAME,engineOf,summary}from"./engine.js";
import{readStore,STORE_KEY,STORE_VERSION,MAX_NODES}from"./store.js";import{runChallenge}from"../eval/challenge.js";import{readProgress,recordStars}from"../progress.js";import{syncLab,noteDeleted,useCatalogue,DELETED_KEY}from"../account.js";import{track}from"../analytics.js";import{InspectorV2,ArrowV2,paletteV2}from"./LabV2.jsx";import{allowedEdge,evalCatalogue}from"../eval/design.js";
const deletedIds=()=>{try{return new Set(Object.keys(JSON.parse(localStorage.getItem(DELETED_KEY)||"{}")||{}))}catch{return new Set()}};

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
const toFlow=d=>({nodes:d.nodes.map(n=>({id:n.id,type:"comp",position:{x:n.x??0,y:n.y??0},data:{kind:n.type,config:n.config||{},...(n.name?{name:n.name}:{})}})),edges:d.edges.map(e=>edge(e.from,e.to,e.carries))});
const fromFlow=(nodes,edges)=>({nodes:nodes.map(n=>({id:n.id,type:n.data.kind,x:Math.round(n.position.x),y:Math.round(n.position.y),...(n.data.name?{name:n.data.name}:{}),config:n.data.config})),edges:edges.map(e=>({from:e.source,to:e.target,...(e.data?.carries?{carries:e.data.carries}:{})}))});
const edge=(source,target,carries)=>({id:"e:"+JSON.stringify([source,target]),source,target,type:"arrow",markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16,color:INK},...(carries?{data:{carries}}:{})});

const ICON={cdn:"M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5",client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",lb:"M10 3v4M10 7l-6 6M10 7l6 6M10 7v6M2 13h4v4H2zM8 13h4v4H8zM14 13h4v4h-4z",cache:"M11 2L4 11h5l-1 7 7-9h-5z",queue:"M2 7h16v6H2zM6 7v6M10 7v6M14 7v6",external:"M3 10h9M9 6l4 4-4 4M14 4h3v12h-3",realtime:"M4 10a6 6 0 0 1 12 0M7 10a3 3 0 0 1 6 0M10 10v7M7 17h6",stream:"M2 6h16M2 10h16M2 14h16M15 4l3 2-3 2",pubsub:"M10 4v4M10 8l-6 6M10 8l6 6M10 8v6M3 14h2v2H3zM9 14h2v2H9zM15 14h2v2h-2z",scheduler:"M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2",processor:"M2 6h6M2 10h6M2 14h6M8 4h6v12H8zM14 10h4",coord:"M10 3l6 3.5v7L10 17l-6-3.5v-7zM10 3v14M4 6.5l12 7M16 6.5l-12 7",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
const Glyph=({kind})=><svg className="lab-ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[kind]||ICON.server}/></svg>;
const level=u=>u>1+1e-9?"over":u>=0.7?"warn":"ok";

function CompNode({id,data,selected}){const{cat,trace,replay}=useContext(Ctx);const comp=cat[data.kind];
const rp=replay?.nodes?.[id];if(replay&&data.kind!=="client"){const rst=rp?(rp.up?level(rp.rho):"down"):"";return <div className={"ln"+(selected?" sel":"")+(rst?" "+rst:"")}>{<Handle type="target" position={Position.Left}/>}<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div><b>{displayName(comp,{name:data.name,config:data.config})}</b>
{!rp?<span className="ln-m">not used</span>:!rp.up?<span className="ln-m ln-down">DOWN</span>:<><div className="ln-bar"><i style={{width:Math.min(100,rp.rho*100)+"%"}}/></div><span className="ln-m">{Math.round(rp.rho*100)}%{rp.inst?` · ${rp.inst} instance${rp.inst>1?"s":""}`:""}</span></>}{rp?.backlog>0&&<span className="ln-m ln-q">backlog {num(rp.backlog)}</span>}{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const sum=summary(comp,data.config);
return <div className={"ln"+(selected?" sel":"")+(trace?.at===id?" ln-trace":"")}>
{data.kind!=="client"&&<Handle type="target" position={Position.Left}/>}
<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div>
<b>{displayName(comp,{name:data.name,config:data.config})}</b>{(sum||data.name)&&<span className="ln-sum">{data.name?comp.name+(sum?" · ":""):""}{sum}</span>}
{data.kind==="database"&&data.config?.schema?.tables?.length>0&&<span className="ln-m ln-sch">{schemaSummary(engineOf(comp,data.config),data.config.schema)}</span>}
{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const nodeTypes={comp:CompNode};
// Arrows: click (or tap) one to select it; a selected arrow shows ✕ to remove it (Delete works too).
function Arrow({id,source,target,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,markerEnd,selected}){const rf=useReactFlow();const{trace}=useContext(Ctx);const[path,lx,ly]=getSmoothStepPath({sourceX,sourceY,sourcePosition,targetX,targetY,targetPosition});
const fwd=trace&&trace.from===source&&trace.at===target,back=trace&&trace.from===target&&trace.at===source;
return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={fwd||back?{stroke:BLUE,strokeWidth:2.5}:undefined}/>{(fwd||back)&&<circle r="6" className="lab-dot" key={trace.n}><animateMotion dur="0.9s" repeatCount="indefinite" path={path} keyPoints={back?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"/></circle>}{selected&&<EdgeLabelRenderer><button type="button" className="lab-edge-x nodrag nopan" style={{transform:`translate(-50%,-50%) translate(${lx}px,${ly}px)`}} onClick={()=>rf.deleteElements({edges:[{id}]})} aria-label="Remove this arrow" title="Remove this arrow">✕</button></EdgeLabelRenderer>}</>}
const edgeTypes={arrow:Arrow};

// Palette items are dragged with pointer events (mouse, trackpad, touch, pen) rather than HTML5
// drag-and-drop, which Firefox does not start from buttons and touch screens do not support.
// A press that moves less than 6 px is a tap/click and adds the component at a free spot; a drag
// shows a ghost under the pointer and drops the component where it is released over the canvas.
function Palette({lab,comps=lab.components,onAdd,onDropAt,setDragging}){const groups=[...new Set(comps.map(c=>c.group))];const[ghost,setGhost]=useState(null);
const press=(e,c)=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.preventDefault();const sx=e.clientX,sy=e.clientY;let moved=false;
const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;if(!moved){moved=true;setDragging(true)}setGhost({c,x:ev.clientX,y:ev.clientY})};
const end=ok=>ev=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);removeEventListener("pointercancel",cancel);setGhost(null);setDragging(false);if(!ok)return;if(moved)onDropAt(c.type,ev.clientX,ev.clientY);else onAdd(c.type)};
const up=end(true),cancel=end(false);addEventListener("pointermove",move);addEventListener("pointerup",up);addEventListener("pointercancel",cancel)};
return <aside className="lab-pal" aria-label="Components"><div className="lab-h">COMPONENTS</div>
{groups.map(g=><div key={g}><div className="lab-g">{g}</div>{comps.filter(c=>c.group===g).map(c=>
<button key={c.type} type="button" className="lab-item" onPointerDown={e=>press(e,c)} onClick={e=>{if(e.detail===0)onAdd(c.type)}} title={`${c.desc} Drag onto the canvas, or tap to add.`}>
<Glyph kind={c.type}/><span>{c.name}</span></button>)}</div>)}
{ghost&&<div className="lab-ghost" style={{left:ghost.x,top:ghost.y}} aria-hidden="true"><Glyph kind={ghost.c.type}/>{ghost.c.name}</div>}
<p className="lab-tip">Drag a component onto the canvas, or tap it to add it. Connect two components by dragging from the dot on the right of one to the dot on the left of the other. To remove a component or an arrow, click it and press Delete, or use the ✕ on a selected arrow.</p></aside>}

function Inspector({lab,node,edge,update,rename,remove,removeEdge,labelOf,ch,best,goals,score,conn,fieldHints,hl=2,ops,setCarries,lockedIds}){
// hl: the level of its headings, one below the Lab's own title (h1 on its own page, h3 inside the landing page's section)
const H="h"+hl;
const chBox=ch&&<div className="lab-ch"><div className="lab-h">CHALLENGE · {lab.levels.find(l=>l.id===ch.level)?.label.toUpperCase()}</div><H>{ch.title}</H><p className="lab-desc">{ch.brief}</p>
<ul className="lab-goals">{ch.stars.map((g,i)=><li key={i} className={goals?(goals[i]?"ok":""):i<(best||0)?"ok":""}><b>★</b><span>{g.label}</span></li>)}</ul><details className="lab-hint"><summary>Hint</summary><p>{ch.hint}</p></details>
<button type="button" className="lab-btn lab-score-btn" onClick={score}>Score my design</button><p className="lab-note lab-note-tight">The challenge sets the traffic{ch.faults?.length?" and what goes wrong":""}. Best so far: <Stars n={best||0} max={ch.stars.length}/></p></div>;;
if(!node&&edge)return <ArrowV2 edge={edge} ops={ops||[]} labelOf={labelOf} removeEdge={removeEdge} setCarries={setCarries} H={H}/>;if(node)return <InspectorV2 locked={lockedIds?.has(node.id)} lab={lab} node={node} update={update} rename={rename} remove={remove} conn={conn&&{...conn,removeEdge}} labelOf={labelOf} fieldHints={fieldHints} H={H} Glyph={Glyph} maxName={MAX_NAME}/>;
return <aside className="lab-ins" tabIndex={0} aria-label="Details">{chBox}<div className="lab-h">DESIGN</div><p className="lab-desc">Select a component to change its settings, or an arrow to choose which calls it carries.</p>{!ch&&<p className="lab-note">Run tries the example tests; Submit runs every test. After either, ▶ Replay a load test to watch it minute by minute here.</p>}<p className="lab-note">Prices are approximate AWS on-demand list prices for Mumbai, for learning only. The bill includes storage and data transfer.</p></aside>}

// Learner progress (stars per challenge), kept in sync across the page.
function useProgress(){const[p,setP]=useState(readProgress);useEffect(()=>{const on=()=>setP(readProgress());addEventListener("tk-progress",on);addEventListener("storage",on);return()=>{removeEventListener("tk-progress",on);removeEventListener("storage",on)}},[]);return p}
const Stars=({n,max=3})=><span className="lab-stars" aria-label={`${n} of ${max} stars`}>{"★".repeat(n)}<i>{"★".repeat(Math.max(0,max-n))}</i></span>;
const goalValue=(c)=>typeof c.value==="string"?c.value:c.kind==="completes"?(c.value?`longest wait ${duration(c.value/3600)}`:"none waiting"):c.kind==="cost"?`${usd(c.value)}/month`:c.kind==="spend"?usd(c.value):c.kind==="noCrash"?(c.value?`${c.value} crash${c.value>1?"es":""}`:"none"):c.kind==="noLostWrites"?(c.value?`${num(c.value)} writes lost`:"none"):"";
function Score({ch,res,next,close,more,lab}){const names=t=>lab.components.find(c=>c.type===t)?.name||t;const ref=useRef(null);const box=useRef(null);const trap=e=>{if(e.key!=="Tab")return;const f=[...box.current.querySelectorAll("button,a[href]")];if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}};useEffect(()=>{ref.current?.focus();const k=e=>{if(e.key==="Escape")close()};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[]);// eslint-disable-line
return <div className="lab-score-back" onClick={e=>{if(e.target===e.currentTarget)close()}}><div className="lab-score" role="dialog" aria-modal="true" aria-label={`Score: ${ch.title}`} ref={box} onKeyDown={trap}>
<div className="lab-h">CHALLENGE SCORE</div><h3>{ch.title}</h3>{res.error?<p className="lab-warn">{res.error}</p>:<><div className="lab-score-stars"><Stars n={res.stars} max={res.max}/></div>
<ul className="lab-goals">{res.checks.map((c,i)=><li key={i} className={c.ok?"ok":"no"}><b>{c.ok?"✓":"✕"}</b><span>{c.label}</span><small>{goalValue(c)}</small></li>)}</ul>{res.why?.length>0&&res.stars<res.max&&<p className="lab-note">{res.why[0]}</p>}
<p className="lab-note">{res.stars===res.max?"Every star. Try the next one.":res.stars===0&&!res.checks[0].ok?"No stars yet: the first goal has to be met before the others count.":"Some goals left. Change the design and score it again."} Simulated {ch.hours} hours from {String(Math.floor(ch.startHour)).padStart(2,"0")}:00{ch.faults?.length?", with the crash the challenge causes":""}.</p></>}
<div className="lab-score-act"><button type="button" ref={ref} className="lab-btn ghost" onClick={close}>Keep improving</button>{next&&<button type="button" className="lab-btn" onClick={next}>Next challenge →</button>}{more&&<a className="lab-btn" href={more.href}>{more.open} →</a>}</div></div></div>}

function Canvas({lab,start,embedded,problem,onDesign,trace,replay}){const theme=useTheme();const chStart=start?(lab.challenges||[]).find(c=>c.id===start):null;const cat=useMemo(()=>({...catalogue(lab),...evalCatalogue(lab)}),[lab]);const locked=useMemo(()=>new Set(problem?.locked||[]),[problem?.locked]);
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
// this one.
if(problem){const pid="q-"+problem.id;const mine=s.designs[pid]?pid:Object.values(s.designs).filter(d=>d.problem===problem.id).sort((a,b)=>b.updated-a.updated)[0]?.id;
const L=problem.load,put=d=>L?{...d,...structuredClone({nodes:L.nodes,edges:L.edges}),updated:Date.now()}:d;
if(mine){s.current=mine;if(problem.v===2&&s.designs[mine].v!==2)s.designs[mine]={...s.designs[mine],v:2};if(L||problem.v===2){if(L)s.designs[mine]=put(s.designs[mine]);persistNew(lab,s.designs[mine],mine)}return s}
const fresh=!deletedIds().has(pid),id=fresh?pid:newId("design");s.designs[id]=put({id,name:problem.name,updated:fresh?1:Date.now(),...(problem.start?structuredClone({nodes:problem.start.nodes,edges:problem.start.edges}):{nodes:[{id:"clients",type:"client",x:0,y:160,config:{}}],edges:[]}),problem:problem.id,...(problem.v===2?{v:2}:{})});s.current=id;persistNew(lab,s.designs[id],id);return s}
// Opened on a challenge (the landing page, #lab/<id>): open this browser's latest design for it, or make
// one from its start, without creating the example design too (QA H7).
if(sc){const mine=Object.values(s.designs).filter(d=>d.challenge===start&&(sc.v!==2||d.v===2)).sort((a,b)=>b.updated-a.updated)[0];if(mine){s.current=mine.id;return s}/* A challenge's untouched starting design has the same id on every device and the oldest possible
time, so signed-in copies merge into one and any real edit (re-stamped on save) wins over it. */
const stable=(sc.v===2?"ch2-":"ch-")+start,fresh=!s.designs[stable]&&!deletedIds().has(stable),id=fresh?stable:newId("design");s.designs[id]={id,name:sc.title,updated:fresh?1:Date.now(),...structuredClone({nodes:sc.start.nodes,edges:sc.start.edges}),challenge:start,...(sc.v===2?{v:2}:{})};s.current=id;persistNew(lab,s.designs[id],embedded?null:id);return s}
if(!Object.keys(s.designs).length){const id=newId("design");s.designs[id]={id,name:lab.example.name,updated:Date.now(),...structuredClone({nodes:lab.example.nodes,edges:lab.example.edges})};s.current=id}if(!s.designs[s.current])s.current=Object.keys(s.designs)[0];return s});
const cur=store.designs[store.current];const init=useMemo(()=>toFlow(cur),[store.current]);// eslint-disable-line
const[nodes,setNodes,onNodesChange]=useNodesState(init.nodes);const[edges,setEdges,onEdgesChange]=useEdgesState(init.edges);
const[name,setName]=useState(cur.name);const wrap=useRef(null);const loaded=useRef(store.current);
useEffect(()=>{if(loaded.current===store.current&&nodes.length)return;loaded.current=store.current;const f=toFlow(store.designs[store.current]);setNodes(f.nodes);setEdges(f.edges);setName(store.designs[store.current].name);setTimeout(()=>rf.fitView({padding:.25,maxZoom:1}),30)},[store.current]);// eslint-disable-line
// Saving (QA H3, H4): every save re-reads what is stored and writes back only this design, so two
// tabs don't overwrite each other's designs. Edits are saved 400 ms after they stop; leaving the page, the
// section or the design saves at once. The embedded Lab (landing page) never changes which design the full Lab opens.
const snap=useRef(null);snap.current={nodes,edges,name};const storeRef=useRef(store);storeRef.current=store;
const writeDesign=useCallback(id=>{const mem=storeRef.current.designs[id];if(!id||!mem)return;const latest=load(lab),cur=snap.current;
const base=latest.designs[id]||mem,next={name:cur.name.trim()||"Untitled design",...fromFlow(cur.nodes,cur.edges),v:2};
// Unchanged designs aren't re-saved: a save stamps "updated", and a needless stamp would make an old
// copy look newer than a deletion or edit synced from another device.
const same=k=>JSON.stringify(base[k]??null)===JSON.stringify(next[k]??null);if(latest.designs[id]&&["name","nodes","edges","v"].every(same))return;
const d={...base,...next,updated:Date.now()};
latest.designs[id]=d;if(!embedded)latest.current=storeRef.current.current;save(latest);setStore(s=>({...s,designs:{...latest.designs,[id]:d}}))},[lab,embedded]);
useEffect(()=>{const id=loaded.current;const t=setTimeout(()=>writeDesign(id),400);return()=>clearTimeout(t)},[nodes,edges,name]);// eslint-disable-line
// The problem workspace judges the design on the canvas as it is now (solve.jsx Run / Submit).
useEffect(()=>{onDesign?.(fromFlow(nodes,edges))},[nodes,edges]);// eslint-disable-line
useEffect(()=>{if(problem?.load)problem.onLoaded?.()},[]);// eslint-disable-line
useEffect(()=>{const flush=()=>writeDesign(loaded.current);addEventListener("pagehide",flush);return()=>{removeEventListener("pagehide",flush);flush()}},[writeDesign]);
// Another tab changed the designs: take its list, keep what this tab has open.
useEffect(()=>{const on=e=>{if(e.key!==STORE_KEY)return;const latest=load(lab);setStore(s=>({...latest,current:latest.designs[s.current]?s.current:latest.current}))};const synced=()=>on({key:STORE_KEY});addEventListener("storage",on);addEventListener("tk-lab-synced",synced);return()=>{removeEventListener("storage",on);removeEventListener("tk-lab-synced",synced)}},[lab]);
const progress=useProgress();const ch=(lab.challenges||[]).find(c=>c.id===store.designs[store.current]?.challenge)||null;const[score,setScore]=useState(null);

const nodesRef=useRef(nodes);nodesRef.current=nodes;
const selected=nodes.find(n=>n.selected);const selEdge=selected?null:edges.find(e=>e.selected);
const labelOf=id=>{const n=nodes.find(x=>x.id===id);return n?displayName(cat[n.data.kind],{name:n.data.name,config:n.data.config,type:n.data.kind}):"?"};const removeEdge=id=>setEdges(es=>es.filter(e=>e.id!==id));
const add=useCallback((kind,pos)=>{if(nodesRef.current.length>=MAX_NODES)return;track("component_add",{type:kind});const id=newId(kind);const at=pos||rf.screenToFlowPosition({x:(wrap.current?.getBoundingClientRect().left||0)+(wrap.current?.clientWidth||600)/2,y:(wrap.current?.getBoundingClientRect().top||0)+(wrap.current?.clientHeight||400)/2});
setNodes(ns=>[...ns.map(n=>({...n,selected:false})),{id,type:"comp",position:freeSpot(ns,at.x-W/2,at.y-H/2),selected:true,data:{kind,config:{}}}])},[cat,rf,setNodes]);
const update=(id,config)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,data:{...n.data,config}}:n));
const rename=(id,name)=>setNodes(ns=>ns.map(n=>{if(n.id!==id)return n;const{name:_,...data}=n.data;return{...n,data:name?{...data,name}:data}}));
const remove=id=>{if(locked.has(id))return;setNodes(ns=>ns.filter(n=>n.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id))};
const valid=c=>{const s=nodes.find(n=>n.id===c.source),t=nodes.find(n=>n.id===c.target);if(!s||!t||c.source===c.target||edges.some(e=>e.source===c.source&&e.target===c.target))return false;
// the arrows eval.json allows (a database may point at a queue for change data capture, the Clients at S3)
const as=n=>({id:n.id,type:n.data.kind,config:n.data.config});return allowedEdge(as(s),as(t),lab)};
const setCarries=(id,carries)=>setEdges(es=>es.map(e=>e.id===id?{...e,data:carries?{...e.data,carries}:Object.fromEntries(Object.entries(e.data||{}).filter(([k])=>k!=="carries"))}:e));
const onConnect=useCallback(c=>setEdges(es=>addEdge(edge(c.source,c.target),es)),[setEdges]);
const[dragging,setDragging]=useState(false);
// Drop from the palette: only when released over the canvas.
const dropAt=(kind,x,y)=>{const r=wrap.current?.getBoundingClientRect();if(!cat[kind]||!r||x<r.left||x>r.right||y<r.top||y>r.bottom)return;add(kind,rf.screenToFlowPosition({x,y}))};
const pick=id=>{writeDesign(loaded.current);setStore(s=>({...s,current:id}));if(!embedded){const latest=load(lab);if(latest.designs[id]){latest.current=id;save(latest)}}};
const create=(src)=>{const id=newId("design");const d={id,name:src?src.name:"Untitled design",updated:Date.now(),nodes:src?structuredClone(src.nodes):[],edges:src?structuredClone(src.edges):[],...(src?.challenge?{challenge:src.challenge}:{}),...(src?.v===2?{v:2}:{})};writeDesign(loaded.current);persistNew(lab,d,embedded?null:id);setStore(s=>({...s,current:id,designs:{...s.designs,[id]:d}}))};
// Start a challenge: reopen this browser's latest design for it, or start one from its starting design.
const startChallenge=id=>{const c=(lab.challenges||[]).find(x=>x.id===id);if(!c)return;track("challenge_start",{challenge:id});setScore(null);const mine=Object.values(store.designs).filter(d=>d.challenge===id&&(c.v!==2||d.v===2)).sort((a,b)=>b.updated-a.updated)[0];if(mine)pick(mine.id);else create({name:c.title,nodes:c.start.nodes,edges:c.start.edges,challenge:id,...(c.v===2?{v:2}:{})})};
// A link to a challenge that doesn't exist says so instead of silently opening the last design (QA L3).
const badStart=start&&!(lab.challenges||[]).some(c=>c.id===start)?start:null;
const firstStart=useRef(start);useEffect(()=>{if(start&&start!==firstStart.current)startChallenge(start);firstStart.current=null},[start]);// eslint-disable-line
const scoreIt=()=>{if(!ch)return;const r=runChallenge(fromFlow(nodes,edges),lab,ch);if(!r.error){recordStars(ch.id,r.stars,r.checks.map(c=>c.ok));track("score",{challenge:ch.id,stars:r.stars,max:r.max,passed:r.checks.map(c=>c.ok?1:0).join(""),lite:false})}setScore(r)};
const nextCh=ch&&(()=>{const list=lab.challenges,i=list.findIndex(c=>c.id===ch.id);return list.slice(i+1).find(c=>(progress.stars[c.id]||0)<c.stars.length)||list.find(c=>c.id!==ch.id&&(progress.stars[c.id]||0)<c.stars.length)})();
// Arrowheads take the current ink colour (saved designs carry the colour of the theme they were drawn in).
const flowEdges=React.useMemo(()=>edges.map(e=>e.markerEnd&&typeof e.markerEnd==="object"?{...e,markerEnd:{...e.markerEnd,color:INK}}:e),[edges,theme]);// eslint-disable-line
return <Ctx.Provider value={{cat,trace,replay}}><div className={"lab"+(trace?" lab-watch":"")}>
<header className="lab-top">{embedded&&!embedded.h1?<h3 className="sr">{lab.title}</h3>:<h1 className="sr">{lab.title}</h1>}<input className="lab-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Design name" maxLength={60}/>
{embedded&&<a className="lab-btn ghost lab-open" href={embedded.href}>{embedded.back?`← ${embedded.open}`:`${embedded.open} →`}</a>}
{ch&&<button type="button" className="lab-btn ghost lab-score-top" onClick={scoreIt}>Score ★</button>}
</header>
<div className="lab-status" aria-live="polite">{replay?<span>{replay.status}</span>:badStart?<span className="lab-warn">There is no challenge called “{badStart}”. Pick one on the Problems page.</span>:ch?<span className="lab-muted">Score your design to see which stars it earns.</span>:<span className="lab-muted">Run or Submit to test this design; then ▶ Replay a load test to watch it here.</span>}</div>
<Palette lab={lab} comps={paletteV2(lab)} onAdd={k=>add(k)} onDropAt={dropAt} setDragging={setDragging}/>
<div className={"lab-canvas"+(dragging?" drop":"")} ref={wrap}>
<ReactFlow colorMode={theme} nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={ch=>onNodesChange(locked.size?ch.filter(c=>!(c.type==="remove"&&locked.has(c.id))):ch)} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={valid}
fitView fitViewOptions={{padding:.25,maxZoom:1}} minZoom={.25} maxZoom={2} snapToGrid snapGrid={[20,20]} deleteKeyCode={["Backspace","Delete"]} defaultEdgeOptions={{type:"arrow"}}>
<Background gap={20} size={1} color={LINE}/><Controls showInteractive={false} position="bottom-left"/></ReactFlow>
{!nodes.length&&<div className="lab-empty">Drag components here from the left to start a design.</div>}</div>
<Inspector hl={embedded&&!embedded.h1?4:2} fieldHints={problem?.fields||(chStart?[...new Set(Object.values(chStart.entities||{}).flatMap(e=>Object.keys(e.fields||{})))]:undefined)} rename={rename} conn={selected&&selected.data.kind!=="database"?{out:edges.filter(e=>e.source===selected.id),targets:nodes.filter(n=>valid({source:selected.id,target:n.id})),add:t=>onConnect({source:selected.id,target:t}),dupName:n=>nodes.filter(x=>x.data.kind===n.data.kind).length>1}:null} lab={lab} node={selected} edge={selEdge} removeEdge={removeEdge} labelOf={labelOf} update={update} remove={remove} ch={ch} best={ch?progress.stars[ch.id]:0} goals={ch?progress.goals[ch.id]:null} score={scoreIt} ops={problem?.ops||(chStart?chStart.operations.map(o=>({id:o.id,name:o.name})):undefined)} setCarries={setCarries} lockedIds={locked}/>
{score&&ch&&<Score lab={lab} ch={ch} res={score} close={()=>setScore(null)} next={embedded?.next&&nextCh?(()=>{location.hash=`problems/challenge/${nextCh.id}`}):null} more={embedded?.next?null:embedded}/>}
</div></Ctx.Provider>}

// Signed in, the account's designs are merged in before the Lab opens (at most 4 s), so a stale copy
// in this browser is never what gets edited.
export default function Lab({challenge,embedded,problem,onDesign,trace,replay}){const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(async lab=>{useCatalogue(lab);await Promise.race([syncLab(),new Promise(r=>setTimeout(r,4000))]);set({lab})},()=>set({err:1}))};useEffect(go,[]);
if(st.err)return <LoadError what="the canvas" retry={go}/>;if(!st.lab)return <Loading label="Loading the canvas"/>;
return <div className="lab-wrap"><div className="lab-small">{st.lab.smallScreen}</div><ReactFlowProvider><Canvas trace={trace} replay={replay} lab={st.lab} start={challenge} embedded={embedded} problem={problem} onDesign={onDesign}/></ReactFlowProvider></div>}
