// The canvas itself: the design, saving, adding and connecting components, a watched request or replay.
import{INK,LINE}from"../theme/palette.js";import{useTheme}from"../theme/mode.js";import React,{useCallback,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,Background,Controls,addEdge,useNodesState,useEdgesState,useReactFlow}from"@xyflow/react";
import{catalogue,displayName}from"./engine.js";
import{STORE_KEY,MAX_NODES}from"./store.js";import{runChallenge}from"../eval/challenge.js";import{recordStars}from"../progress.js";import{track}from"../analytics.js";import{paletteV2}from"./LabV2.jsx";import{allowedEdge,evalCatalogue}from"../eval/design.js";
import{deletedIds,W,H,freeSpot,newId,Ctx,load,save,persistNew,toFlow,fromFlow,edge}from"./shared.jsx";import{nodeTypes,edgeTypes}from"./nodes.jsx";import{Palette}from"./Palette.jsx";import{Inspector}from"./Inspector.jsx";import{useProgress,Score}from"./Score.jsx";
export function Canvas({lab,start,embedded,problem,onDesign,trace,replay,flow}){const theme=useTheme();const chStart=start?(lab.challenges||[]).find(c=>c.id===start):null;const cat=useMemo(()=>({...catalogue(lab),...evalCatalogue(lab)}),[lab]);const locked=useMemo(()=>new Set(problem?.locked||[]),[problem?.locked]);
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
return <Ctx.Provider value={{cat,trace,replay,flow}}><div className={"lab"+(trace?" lab-watch":"")}>
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
