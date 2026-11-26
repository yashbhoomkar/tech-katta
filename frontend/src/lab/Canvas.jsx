// The canvas itself: the design, saving, adding and connecting components, a watched request or replay.
import{INK,INK_3,LINE,CAT_TEAL,CAT_GREEN,CAT_PINK,CAT_VIOLET,CAT_AMBER}from"../theme/palette.js";import{useTheme}from"../theme/mode.js";import React,{useCallback,useEffect,useMemo,useRef,useState}from"react";
import{ReactFlow,Background,Controls,ControlButton,MiniMap,addEdge,useNodesState,useEdgesState,useReactFlow,useNodesInitialized,ConnectionMode}from"@xyflow/react";import{designChecks}from"./checks.js";import{toMermaid,toSvg,download,copyText,fileName,walkOrder}from"./export.js";import{cleanNote,cleanDesign}from"./store.js";import{encodeShare,sharePayload,shareUrl,svgToPng,downloadBlob}from"./share.js";import{TINT}from"./drawing.js";import{protocolOf,inferProtocol,cleanLabel,PROTOCOL}from"./protocols.js";
import{catalogue,displayName}from"./engine.js";import{Sheet,usePhone,PhoneFrame,goBack}from"../phone.jsx";import{Thumb}from"./thumb.jsx";
import{STORE_KEY,MAX_NODES}from"./store.js";import{runChallenge}from"../eval/challenge.js";import{recordStars}from"../progress.js";import{track}from"../analytics.js";import{paletteV2}from"./LabV2.jsx";import{allowedEdge,evalCatalogue}from"../eval/design.js";
import{deletedIds,W,H,freeSpot,newId,Ctx,load,save,setAside,persistNew,toFlow,fromFlow,edge,Glyph}from"./shared.jsx";import{nodeTypes,edgeTypes}from"./nodes.jsx";import{layout as arrange,tidy}from"./drawing.js";import{Palette}from"./Palette.jsx";import{Design3D,host3d,mode3dWanted,saveMode3d}from"./design3d.jsx";import{webgl}from"../solve/replay3d.jsx";import{Inspector}from"./Inspector.jsx";import{useProgress,Score,ScoreBody,Stars}from"./Score.jsx";
export function Canvas({lab,start,embedded,problem,onDesign,onChecks,trace,replay,flow}){const theme=useTheme();const chStart=start?(lab.challenges||[]).find(c=>c.id===start):null;const cat=useMemo(()=>({...catalogue(lab),...evalCatalogue(lab)}),[lab]);const locked=useMemo(()=>new Set(problem?.locked||[]),[problem?.locked]);
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
useEffect(()=>{if(loaded.current===store.current&&nodes.length)return;loaded.current=store.current;const f=toFlow(store.designs[store.current]);setNodes(f.nodes);setEdges(f.edges);setName(store.designs[store.current].name);moved.current=false;setTimeout(()=>fitVisible(),60)},[store.current]);// eslint-disable-line
// Fitting the design to what is on screen (context 36, faults 1.1 to 1.3): on the canvas's real size once its cards are
// measured, again whenever the canvas changes size (the problem pane hidden or shown, the divider dragged, the side
// panels hidden for a replay) and when the results panel opens, closes or shrinks over its lower part. Never after the
// visitor has panned or zoomed it themselves, until they press Fit (or F) or a replay starts or ends.
const moved=useRef(false);const traceRef=useRef(trace);traceRef.current=trace;
const fitVisible=useCallback((duration=0)=>{const el=wrap.current;const ns=rf.getNodes();if(!el||!ns.length)return;const fr=el.getBoundingClientRect();if(fr.width<80||fr.height<80)return;
const cover=[...document.querySelectorAll(".sv-console,.sv-player")].map(x=>x.getBoundingClientRect()).filter(r=>r.height>0&&r.top>fr.top+60&&r.top<fr.bottom);
// what floats over the canvas on its left (the problem card, the parts column) is not free room either
const lx=Math.max(0,...(document.querySelector(".solve.ph")?[]:[".sv-q",".sv-tabs",".lab-pal"]).map(q=>{const e=document.querySelector(q);const r=e&&e.getBoundingClientRect();return r&&r.width>0&&r.height>0&&r.right>fr.left&&r.left<fr.left+fr.width/2?r.right-fr.left+8:0})); const visH=(cover.length?Math.min(...cover.map(r=>r.top)):fr.bottom)-fr.top,b=rf.getNodesBounds(ns),pad=Math.min(48,fr.width*.06),visW=fr.width-lx;
const zoom=Math.max(.25,Math.min(1,(visW-2*pad)/Math.max(b.width,1),(visH-2*pad)/Math.max(b.height,1)));
rf.setViewport({x:lx+(visW-b.width*zoom)/2-b.x*zoom,y:(visH-b.height*zoom)/2-b.y*zoom,zoom},{duration})},[rf]);
const inited=useNodesInitialized();useEffect(()=>{if(inited&&!moved.current&&!traceRef.current)fitVisible()},[inited]);// eslint-disable-line
useEffect(()=>{const el=wrap.current;if(!el||typeof ResizeObserver==="undefined")return;let t=0;const again=()=>{clearTimeout(t);t=setTimeout(()=>{if(!moved.current&&!traceRef.current)fitVisible()},90)};
const ro=new ResizeObserver(again);ro.observe(el);[el.closest(".solve")?.querySelector(".sv-q"),el.closest(".lab")?.querySelector(".lab-pal")].forEach(x=>x&&ro.observe(x));let watched=null;const host=el.closest(".sv-lab");
const look=()=>{const c=host?.querySelector(".sv-console,.sv-player")||null;if(c===watched)return;if(watched)ro.unobserve(watched);watched=c;if(c)ro.observe(c);again()};
const mo=host?new MutationObserver(look):null;mo?.observe(host,{childList:true,subtree:true});look();return()=>{clearTimeout(t);ro.disconnect();mo?.disconnect()}},[fitVisible]);
useEffect(()=>{moved.current=false},[!!replay]);// eslint-disable-line
const watching=useRef(!!trace);useEffect(()=>{if(watching.current&&!trace){moved.current=false;setTimeout(()=>fitVisible(300),60)}watching.current=!!trace},[!!trace]);// eslint-disable-line
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

const nodesRef=useRef(nodes);const[m3d,setM3d]=useState(()=>host3d()&&webgl()&&mode3dWanted()),d3=useRef(null),show3d=m3d&&!replay&&!trace;nodesRef.current=nodes;
const selected=nodes.find(n=>n.selected);const selEdge=selected?null:edges.find(e=>e.selected);
// Nothing selected: the settings close (Done does this on a wide screen).
const deselect=useCallback(()=>{setNodes(ns=>ns.some(n=>n.selected)?ns.map(n=>n.selected?{...n,selected:false}:n):ns);setEdges(es=>es.some(e=>e.selected)?es.map(e=>e.selected?{...e,selected:false}:e):es)},[setNodes,setEdges]);
// The phone (context 53 §5.2): parts come from a sheet and land in the middle of the view, a tapped part gets a small bar (Connect, Settings,
// Delete), its settings are a sheet of their own (a visible ✕; Back closes it first, phone.jsx), and Connect asks for the part it sends to.
const phone=usePhone(),phoneRef=useRef(phone);phoneRef.current=phone;
// A challenge on a phone is the same focus screen as a problem: Problem (the brief and the goals), Design, Results (the stars)
const seenKey="tk-ph:ch:"+start,[cview,setCview]=useState(()=>{try{return localStorage.getItem(seenKey)==="1"?"design":"problem"}catch{return"problem"}}),[cmenu,setCmenu]=useState(false),[cexpo,setCexpo]=useState(false);const[partsOpen,setPartsOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[connFrom,setConnFrom]=useState(null),[hint,setHint]=useState(null),[toast,setToast]=useState("");
useEffect(()=>{if(!selected&&!selEdge)setSettingsOpen(false)},[!!selected,!!selEdge]);// eslint-disable-line
useEffect(()=>{if(phone&&selEdge)setSettingsOpen(true)},[selEdge?.id,phone]);// eslint-disable-line
useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t)},[toast]);
useEffect(()=>{if(!connFrom)return;if(!selected){setConnFrom(null);return}if(selected.id===connFrom)return;
if(valid({source:connFrom,target:selected.id})){onConnect({source:connFrom,target:selected.id});setToast("Arrow added")}else setToast(`${labelOf(connFrom)} cannot send to ${labelOf(selected.id)}`);setConnFrom(null)},[selected?.id,connFrom]);// eslint-disable-line
// The settings float over the canvas's right side: a component selected under them slides left into view.
useEffect(()=>{if(!selected)return;const t=setTimeout(()=>{const el=wrap.current?.querySelector(`.react-flow__node[data-id="${CSS.escape(selected.id)}"]`),ins=wrap.current?.parentElement?.querySelector(".lab-ins:not(.idle)");if(!el||!ins||getComputedStyle(ins).position!=="relative")return;
const a=el.getBoundingClientRect(),b=ins.getBoundingClientRect();const over=a.right+16-b.left;if(over<=0||a.bottom<b.top||a.top>b.bottom)return;const v=rf.getViewport();rf.setViewport({...v,x:v.x-over},{duration:250})},60);return()=>clearTimeout(t)},[selected?.id]);// eslint-disable-line
const labelOf=id=>{const n=nodes.find(x=>x.id===id);return n?displayName(cat[n.data.kind],{name:n.data.name,config:n.data.config,type:n.data.kind}):"?"};const removeEdge=id=>setEdges(es=>es.filter(e=>e.id!==id));
// Adding a part (context 36, step 2): dropped where it is released; tapped, it goes just right of the selected card and is
// joined to it when that arrow is allowed (select the Server, tap Database: done), else in the middle of the view.
// from: a card to join it to (the menu at the end of a dropped arrow).
const add=useCallback((kind,pos,from,thumb)=>{if(nodesRef.current.length>=MAX_NODES)return;track("component_add",{type:kind});const id=newId(kind);const sel=from?nodesRef.current.find(n=>n.id===from):!pos&&!thumb&&nodesRef.current.find(n=>n.selected);
const at=pos||(sel?{x:sel.position.x+W+100+W/2,y:sel.position.y+H/2}:d3.current?d3.current.centerFlow():rf.screenToFlowPosition({x:(wrap.current?.getBoundingClientRect().left||0)+(wrap.current?.clientWidth||600)/2,y:(wrap.current?.getBoundingClientRect().top||0)+(wrap.current?.clientHeight||400)/2}));
setNodes(ns=>[...ns.map(n=>({...n,selected:false})),{id,type:"comp",position:freeSpot(ns,at.x-W/2,at.y-H/2),selected:!thumb,data:{kind,config:{}}}]);if(thumb&&nodesRef.current.length<=2){moved.current=false;setTimeout(()=>{fitVisible(300);d3.current?.fit()},120)}
if(sel&&allowedEdge({id:sel.id,type:sel.data.kind,config:sel.data.config},{id,type:kind,config:{}},lab))setEdges(es=>addEdge(edge(sel.id,id),es))},[cat,rf,setNodes,setEdges,lab]);
const update=(id,config)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,data:{...n.data,config}}:n));
const setNote=(id,note)=>setNodes(ns=>ns.map(n=>{if(n.id!==id)return n;const{note:_,...data}=n.data;const t=note.slice(0,280);return{...n,data:t.trim()?{...data,note:t}:data}}));
const rename=(id,name)=>setNodes(ns=>ns.map(n=>{if(n.id!==id)return n;const{name:_,...data}=n.data;return{...n,data:name?{...data,name}:data}}));
const remove=id=>{if(locked.has(id))return;setNodes(ns=>ns.filter(n=>n.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id))};
const valid=c=>{const s=nodes.find(n=>n.id===c.source),t=nodes.find(n=>n.id===c.target);if(!s||!t||c.source===c.target||edges.some(e=>e.source===c.source&&e.target===c.target))return false;
// the arrows eval.json allows (a database may point at a queue for change data capture, the Clients at S3)
const as=n=>({id:n.id,type:n.data.kind,config:n.data.config});return allowedEdge(as(s),as(t),lab)};
// An arrow's protocol and label (protocols.js): undefined clears one (the arrow then shows the usual protocol).
const setLook=(id,patch)=>setEdges(es=>es.map(e=>{if(e.id!==id)return e;const d={...(e.data||{}),...patch};if(!PROTOCOL[d.protocol])delete d.protocol;if(!cleanLabel(d.label))delete d.label;else d.label=cleanLabel(d.label);const{data:_,...rest}=e;return Object.keys(d).length?{...rest,data:d}:rest}));
// A click on an arrow's pill selects that arrow (and nothing else), so the panel shows it.
const pickEdge=useCallback(id=>{setNodes(ns=>ns.some(n=>n.selected)?ns.map(n=>n.selected?{...n,selected:false}:n):ns);setEdges(es=>es.map(e=>e.selected!==(e.id===id)?{...e,selected:e.id===id}:e))},[setNodes,setEdges]);
const setCarries=(id,carries)=>setEdges(es=>es.map(e=>e.id===id?{...e,data:carries?{...e.data,carries}:Object.fromEntries(Object.entries(e.data||{}).filter(([k])=>k!=="carries"))}:e));
const onConnect=useCallback(c=>setEdges(es=>addEdge(edge(c.source,c.target),es)),[setEdges]);
// Reverse an arrow (the panel's button, or Shift+R): the same arrow the other way, keeping what it carries and how it
// is drawn, if that way is allowed and not drawn already.
const canReverse=e=>!!e&&valid({source:e.target,target:e.source});
const reverse=id=>{const e=edges.find(x=>x.id===id);if(!canReverse(e))return;const r={...edge(e.target,e.source,e.data?.carries,e.data),selected:true};setEdges(es=>[...es.filter(x=>x.id!==id),r])};
// Copy, paste, duplicate and select all (context 36, step 2): the selected cards and the arrows between them, pasted a step
// down and right with new ids. Only while the canvas was the last thing pressed, so the page's own copy and select all work.
const clip=useRef(null),inCanvas=useRef(false);
useEffect(()=>{const down=e=>{inCanvas.current=!!wrap.current?.contains(e.target)};addEventListener("pointerdown",down,true);return()=>removeEventListener("pointerdown",down,true)},[]);
const copySel=()=>{const sel=nodes.filter(n=>n.selected);if(!sel.length)return false;const ids=new Set(sel.map(n=>n.id));clip.current={n:0,nodes:sel.map(n=>({id:n.id,kind:n.data.kind,config:structuredClone(n.data.config||{}),name:n.data.name,x:n.position.x,y:n.position.y})),edges:edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({s:e.source,t:e.target,data:e.data}))};return true};
const paste=()=>{const c=clip.current;if(!c||nodes.length+c.nodes.length>MAX_NODES)return;c.n++;const d=40*c.n,map={};for(const n of c.nodes)map[n.id]=newId(n.kind);
setNodes(ns=>[...ns.map(n=>n.selected?{...n,selected:false}:n),...c.nodes.map(n=>({id:map[n.id],type:"comp",position:{x:n.x+d,y:n.y+d},selected:true,data:{kind:n.kind,config:structuredClone(n.config),...(n.name?{name:n.name}:{})}}))]);
setEdges(es=>[...es.map(e=>e.selected?{...e,selected:false}:e),...c.edges.map(e=>edge(map[e.s],map[e.t],e.data?.carries,e.data))]);track("canvas_paste",{n:c.nodes.length})};
const selectAll=()=>{setNodes(ns=>ns.map(n=>n.selected?n:{...n,selected:true}))};
// Tidy up: the layered layout of drawing.js, then fit; undo puts it back.
const tidyUp=()=>{const cards=Object.fromEntries(nodes.map(n=>[n.id,{kind:n.data.kind,x:n.position.x,y:n.position.y}]));const p=tidy(cards,edges.map(e=>({from:e.source,to:e.target})),{w:W,h:Math.max(H,...nodes.map(n=>n.measured?.height||0))});
setNodes(ns=>ns.map(n=>p[n.id]?{...n,position:p[n.id]}:n));moved.current=false;setTimeout(()=>fitVisible(300),60);track("canvas_tidy",{n:nodes.length})};
// One small menu: the parts an arrow dropped on empty canvas may lead to, or a right click's actions.
const[menu,setMenu]=useState(null);
const onConnectEnd=useCallback((ev,st)=>{if(!st||st.isValid||st.toNode||!st.fromNode)return;const pt="changedTouches" in ev?ev.changedTouches[0]:ev;const from=st.fromNode;
const fromAs={id:from.id,type:from.data.kind,config:from.data.config};const kinds=paletteV2(lab).filter(c=>allowedEdge(fromAs,{id:"new",type:c.type,config:{}},lab));if(!kinds.length)return;
setMenu({x:pt.clientX,y:pt.clientY,title:"Add and join",items:kinds.map(c=>({label:c.name,kind:c.type,run:()=>add(c.type,rf.screenToFlowPosition({x:pt.clientX,y:pt.clientY}),from.id)}))})},[lab,rf,add]);
// Several cards selected (context 36): line them up in a row or a column on the card that was right-clicked (the first
// selected one from the bar), duplicate them with the arrows between them, or delete them (locked parts stay).
const multi=nodes.filter(n=>n.selected),multiItems=a=>{const ids=new Set(multi.map(n=>n.id));return[
{label:"Align in a row",run:()=>setNodes(ns=>ns.map(x=>ids.has(x.id)?{...x,position:{...x.position,y:a.position.y}}:x))},
{label:"Align in a column",run:()=>setNodes(ns=>ns.map(x=>ids.has(x.id)?{...x,position:{...x.position,x:a.position.x}}:x))},
{label:"Duplicate",keys:"Ctrl+D",run:()=>{if(copySel())paste()}},
{label:"Delete",keys:"Delete",run:()=>{const gone=new Set([...ids].filter(id=>!locked.has(id)));setNodes(ns=>ns.filter(x=>!gone.has(x.id)));setEdges(es=>es.filter(e=>!gone.has(e.source)&&!gone.has(e.target)))}}]};
const nodeMenu=(ev,n)=>{ev.preventDefault();if(n.selected&&multi.length>1){setMenu({x:ev.clientX,y:ev.clientY,title:`${multi.length} selected`,items:multiItems(n)});return}setNodes(ns=>ns.map(x=>({...x,selected:x.id===n.id})));setMenu({x:ev.clientX,y:ev.clientY,items:[{label:"Duplicate",keys:"Ctrl+D",run:()=>{clip.current={n:0,nodes:[{id:n.id,kind:n.data.kind,config:structuredClone(n.data.config||{}),name:n.data.name,x:n.position.x,y:n.position.y}],edges:[]};paste()}},{label:"Copy",keys:"Ctrl+C",run:()=>{clip.current={n:0,nodes:[{id:n.id,kind:n.data.kind,config:structuredClone(n.data.config||{}),name:n.data.name,x:n.position.x,y:n.position.y}],edges:[]}}},...(locked.has(n.id)?[]:[{label:"Delete",keys:"Delete",run:()=>remove(n.id)}])]})};
const paneMenu=ev=>{ev.preventDefault();setMenu({x:ev.clientX,y:ev.clientY,items:[...(clip.current?[{label:"Paste",keys:"Ctrl+V",run:paste}]:[]),{label:"Select all",keys:"Ctrl+A",run:selectAll},...(nodes.length>1?[{label:"Tidy up",run:tidyUp}]:[]),{label:"Fit to screen",keys:"F",run:()=>{moved.current=false;fitVisible(300)}}]})};
const[showKeys,setShowKeys]=useState(false);
// Present my design (context 36, step 8): the design one part at a time, from the Clients along the arrows; the rest dims
// and a card says what the part is, its settings, what calls it and what it calls, and the learner's own note.
const[present,setPresent]=useState(null);const order=useMemo(()=>present?walkOrder(fromFlow(nodes,edges)):[],[present?.on]);// eslint-disable-line
const presentAt=k=>{const id=order[k];if(!id)return;setPresent({on:true,k});const n=rf.getNode(id);if(n)rf.setCenter(n.position.x+(n.measured?.width||W)/2,n.position.y+(n.measured?.height||H)/2,{zoom:Math.max(.7,Math.min(1.1,rf.getZoom())),duration:350})};
const startPresent=()=>{setNodes(ns=>ns.map(n=>n.selected?{...n,selected:false}:n));setPresent({on:true,k:0});track("present_design",{n:nodes.length})};
useEffect(()=>{if(present?.on&&order.length)presentAt(present.k)},[present?.on,order.length]);// eslint-disable-line
const stopPresent=()=>{setPresent(null);moved.current=false;setTimeout(()=>fitVisible(300),60)};
// Undo and redo (Ctrl/⌘+Z, Shift+Ctrl/⌘+Z or Ctrl+Y, and the two buttons by the zoom controls): snapshots of the design
// as it is saved, taken when edits stop for 400 ms (a drag is one step), up to 60; a new design starts a new history.
const hist=useRef({past:[],future:[],cur:null,skip:false});
useEffect(()=>{hist.current={past:[],future:[],cur:null,skip:false}},[store.current]);
useEffect(()=>{const t=setTimeout(()=>{const h=hist.current,snap=JSON.stringify(fromFlow(nodes,edges));if(h.skip){h.skip=false;h.cur=snap;return}if(h.cur===snap)return;if(h.cur!==null){h.past.push(h.cur);if(h.past.length>60)h.past.shift();h.future=[]}h.cur=snap;setHistTick(x=>x+1)},400);return()=>clearTimeout(t)},[nodes,edges]);// eslint-disable-line
const[histTick,setHistTick]=useState(0);
const travel=dir=>{const h=hist.current;
// an edit made less than 400 ms ago has no snapshot yet: take it now, so undo steps back over it instead of past it
{const now=JSON.stringify(fromFlow(nodes,edges));if(h.cur!==null&&now!==h.cur&&!h.skip){h.past.push(h.cur);if(h.past.length>60)h.past.shift();h.future=[];h.cur=now}}
const from=dir<0?h.past:h.future,to=dir<0?h.future:h.past;if(!from.length||h.cur===null)return;to.push(h.cur);const snap=from.pop();h.cur=snap;h.skip=true;
const f=toFlow(JSON.parse(snap));setNodes(f.nodes);setEdges(f.edges);setHistTick(x=>x+1);track("canvas_undo",{dir:dir<0?"undo":"redo"})};
useEffect(()=>{const k=e=>{const tag=(e.target?.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select"||e.target?.isContentEditable)return;
const mod=e.metaKey||e.ctrlKey,key=e.key.toLowerCase(),textSel=!!getSelection?.()?.toString();
if(present){if(e.key==="Escape"){stopPresent();return}if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();presentAt(Math.min(order.length-1,present.k+1));return}if(e.key==="ArrowLeft"){e.preventDefault();presentAt(Math.max(0,present.k-1));return}}
if(e.key==="Escape"&&(menu||showKeys)){setMenu(null);setShowKeys(false);return}
if(e.key==="?"&&!mod){e.preventDefault();setShowKeys(v=>!v);return}
if(mod&&inCanvas.current&&!textSel&&!replay&&!trace){if(key==="c"){if(copySel())e.preventDefault();return}if(key==="v"&&clip.current){e.preventDefault();paste();return}if(key==="d"){e.preventDefault();if(copySel())paste();return}if(key==="a"){e.preventDefault();selectAll();return}}
if(mod&&e.key.toLowerCase()==="z"){e.preventDefault();travel(e.shiftKey?1:-1)}else if(mod&&e.key.toLowerCase()==="y"){e.preventDefault();travel(1)}
else if(e.key==="Escape"&&showChecks)setShowChecks(false);else if(e.key==="Escape"&&(nodes.some(n=>n.selected)||edges.some(x=>x.selected))){setNodes(ns=>ns.map(n=>n.selected?{...n,selected:false}:n));setEdges(es=>es.map(x=>x.selected?{...x,selected:false}:x))}else if(!mod&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==="f"){e.preventDefault();moved.current=false;fitVisible(300)}else if(e.shiftKey&&!mod&&e.key.toLowerCase()==="r"){const s=edges.find(x=>x.selected);if(s){e.preventDefault();reverse(s.id)}}};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)});
// Checks while you build (checks.js): the evaluator's first stage on the design, 500 ms after edits stop; a problem only.
const[exported,setExported]=useState("");const[checks,setChecks]=useState([]);const[showChecks,setShowChecks]=useState(false);
useEffect(()=>{if(!problem?.practice){setChecks([]);return}const t=setTimeout(()=>setChecks(designChecks(fromFlow(nodes,edges),lab,problem.practice)),500);return()=>clearTimeout(t)},[nodes,edges,problem?.practice,lab]);// eslint-disable-line
useEffect(()=>{onChecks?.(checks.length)},[checks.length]);// eslint-disable-line
const flagged=useMemo(()=>new Map(checks.filter(c=>c.node).map(c=>[c.node,c])),[checks]);
const doExport=async kind=>{const d=fromFlow(nodes,edges),ok=m=>{setExported(m);if(phoneRef.current)setToast(m)};
if(kind==="mermaid"){const c=await copyText(toMermaid(d,cat));ok(c?"Mermaid copied":"Copy failed: your browser blocked the clipboard")}
else if(kind==="svg"){download(fileName(name)+".svg",toSvg(d,cat,undefined,{title:name}),"image/svg+xml");ok("SVG saved")}
else if(kind==="mmd"){download(fileName(name)+".mmd",toMermaid(d,cat),"text/plain");ok("Mermaid file saved")}
else if(kind==="link"){try{const s=await encodeShare(sharePayload(name,{...d,v:2},problem?.id&&problem.id!=="sandbox"?problem.id:null));const c=await copyText(shareUrl(s));ok(c?"Share link copied: it holds the whole design, and opens read-only for anyone":"Copy failed: your browser blocked the clipboard")}catch{ok("This browser can't make share links")}}
else if(kind==="png"){try{downloadBlob(fileName(name)+".png",await svgToPng(toSvg(d,cat,undefined,{title:name}),2));ok("PNG saved")}catch{ok("The PNG couldn't be made in this browser; try SVG")}}
else if(kind==="json"){download(fileName(name)+".json",JSON.stringify({name,...d,v:2},null,2),"application/json");ok("JSON saved")}else return;track("design_export",{as:kind})};
// the phone's ⋯ menu (solve.jsx) has no toolbar to reach these from: it asks the canvas by name
useEffect(()=>{const on=e=>{const c=e.detail?.cmd;if(c==="rename"){const v=prompt("Name this design",name);if(v!==null)setName(v.slice(0,60))}else if(c==="view"){if(host3d()&&webgl()){const v=!m3d;setM3d(v);saveMode3d(v)}}else if(c)doExport(c)};addEventListener("tk-canvas",on);return()=>removeEventListener("tk-canvas",on)});
// the flat canvas fits the design when it is shown (it drew off to the side on a phone)
useEffect(()=>{if(!phone||show3d)return;const t=setTimeout(()=>{moved.current=false;fitVisible(0)},150);return()=>clearTimeout(t)},[show3d,phone]);// eslint-disable-line
const fitAll=()=>{moved.current=false;fitVisible(300);d3.current?.fit()};
const[dragging,setDragging]=useState(false);
// The palette can shrink to icons (context 36, fault 1.2): the visitor's choice is kept; until they choose, it starts as
// icons inside a problem when the window is narrower than 1,700 px, where the canvas would otherwise get a third of it.
const[narrow,setNarrowState]=useState(()=>{try{const v=localStorage.getItem("tk-pal-narrow");if(v!==null)return v==="1"}catch{}return!!problem&&typeof innerWidth==="number"&&innerWidth<1700});
const setNarrow=v=>{setNarrowState(v);try{localStorage.setItem("tk-pal-narrow",v?"1":"0")}catch{}track("palette_narrow",{on:v?1:0})};
// Drop from the palette: only when released over the canvas.
const dropAt=(kind,x,y)=>{const r=wrap.current?.getBoundingClientRect();if(!cat[kind]||!r||x<r.left||x>r.right||y<r.top||y>r.bottom)return;if(document.elementFromPoint(x,y)?.closest(".sv-q,.sv-tabs,.lab-pal"))return;if(show3d&&d3.current){const g=d3.current.groundAt(x,y);if(g)add(kind,d3.current.toFlow(g));return}add(kind,rf.screenToFlowPosition({x,y}))};
const pick=id=>{writeDesign(loaded.current);setStore(s=>({...s,current:id}));if(!embedded){const latest=load(lab);if(latest.designs[id]){latest.current=id;save(latest)}}};
const create=(src)=>{const id=newId("design");const d={id,name:src?src.name:"Untitled design",updated:Date.now(),nodes:src?structuredClone(src.nodes):[],edges:src?structuredClone(src.edges):[],...(src?.challenge?{challenge:src.challenge}:{}),...(src?.v===2?{v:2}:{})};writeDesign(loaded.current);persistNew(lab,d,embedded?null:id);setStore(s=>({...s,current:id,designs:{...s.designs,[id]:d}}))};
// Start a challenge: reopen this browser's latest design for it, or start one from its starting design.
const startChallenge=id=>{const c=(lab.challenges||[]).find(x=>x.id===id);if(!c)return;track("challenge_start",{challenge:id});setScore(null);const mine=Object.values(store.designs).filter(d=>d.challenge===id&&(c.v!==2||d.v===2)).sort((a,b)=>b.updated-a.updated)[0];if(mine)pick(mine.id);else create({name:c.title,nodes:c.start.nodes,edges:c.start.edges,challenge:id,...(c.v===2?{v:2}:{})})};
// A link to a challenge that doesn't exist says so instead of silently opening the last design (QA L3).
const badStart=start&&!(lab.challenges||[]).some(c=>c.id===start)?start:null;
const firstStart=useRef(start);useEffect(()=>{if(start&&start!==firstStart.current)startChallenge(start);firstStart.current=null},[start]);// eslint-disable-line
const scoreIt=()=>{if(!ch)return;const r=runChallenge(fromFlow(nodes,edges),lab,ch);if(!r.error){recordStars(ch.id,r.stars,r.checks.map(c=>c.ok));track("score",{challenge:ch.id,stars:r.stars,max:r.max,passed:r.checks.map(c=>c.ok?1:0).join(""),lite:false})}setScore(r)};
const nextCh=ch&&(()=>{const list=lab.challenges,i=list.findIndex(c=>c.id===ch.id);return list.slice(i+1).find(c=>(progress.stars[c.id]||0)<c.stars.length)||list.find(c=>c.id!==ch.id&&(progress.stars[c.id]||0)<c.stars.length)})();
// Each arrow is drawn with its protocol (the chosen one, else the usual one for the parts it joins): its colour and
// dash, the arrowhead in the same colour of the current theme (saved designs carry the colour of the theme they
// were drawn in).
// Every arrow's path and pill place come from one pass over the whole design (drawing.js layout): routes round
// cards, ports spread along shared sides, pills clear of cards and of each other.
const layout=nodes.map(n=>[n.id,n.data.kind,Math.round(n.position.x),Math.round(n.position.y),n.measured?.width|0,n.measured?.height|0].join("\u0000")).join("\u0001");
const flowEdges=React.useMemo(()=>{const kind=Object.fromEntries(nodes.map(n=>[n.id,n.data.kind])),col={teal:CAT_TEAL,green:CAT_GREEN,pink:CAT_PINK,violet:CAT_VIOLET,amber:CAT_AMBER,ink:INK_3};
const box=Object.fromEntries(nodes.map(n=>{const w=n.measured?.width||W,h=n.measured?.height||64;return[n.id,{x:n.position.x,y:n.position.y,w,h,cx:n.position.x+w/2,cy:n.position.y+h/2}]}));
const protos=Object.fromEntries(edges.map(e=>[e.id,protocolOf(e.data,kind[e.source],kind[e.target])]));
const geo=arrange(box,edges.map(e=>({id:e.id,from:e.source,to:e.target,text:e.data?.label||protos[e.id].name})));
return edges.map(e=>{const proto=protos[e.id];
return{...e,data:{...e.data,proto,...(geo[e.id]?{geo:geo[e.id]}:{})},...(e.markerEnd&&typeof e.markerEnd==="object"?{markerEnd:{...e.markerEnd,color:col[proto.color]||INK}}:{})}})},[edges,layout,theme]);// eslint-disable-line
const core=<Ctx.Provider value={{cat,trace,replay,flow,pickEdge,flagged:replay||trace?null:flagged,present:present&&!replay&&!trace?order[present.k]:null}}><div className={"lab"+(trace||replay?" lab-watch":"")+(narrow?" pal-narrow":"")}>
<header className="lab-top">{embedded&&embedded.h1?<h1 className="sr">{lab.title}</h1>:<h2 className="sr">{lab.title}</h2>}<input className="lab-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Design name" maxLength={60}/>
{embedded&&<a className="lab-btn ghost lab-open" href={embedded.href}>{embedded.back?`← ${embedded.open}`:`${embedded.open} →`}</a>}
{ch&&<button type="button" className="lab-btn ghost lab-score-top" onClick={scoreIt}>Score ★</button>}
{host3d()&&webgl()&&!replay&&!trace&&<span className="sv-seg lab-view" role="radiogroup" aria-label="Canvas view">{[["3d","3D"],["2d","2D"]].map(([v,t])=><button key={v} type="button" role="radio" aria-checked={(v==="3d")===m3d} className={(v==="3d")===m3d?"on":""} onClick={()=>{setM3d(v==="3d");saveMode3d(v==="3d")}} title={v==="3d"?"Design with 3D models":"Design on the flat canvas"}>{t}</button>)}</span>}{!embedded&&!replay&&!trace&&nodes.length>1&&<button type="button" className="lab-btn ghost" onClick={present?stopPresent:startPresent} aria-pressed={!!present} title="Walk through your design one part at a time, as you would in the interview">{present?"End presenting":"▶ Present"}</button>}
{!embedded&&!replay&&!trace&&nodes.length>1&&<button type="button" className="lab-btn ghost" onClick={tidyUp} title="Arrange the cards left to right along the arrows (undo puts them back)">Tidy up</button>}
{!embedded&&<button type="button" className="lab-btn ghost lab-keys-btn" onClick={()=>setShowKeys(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">⌨</button>}
{!embedded&&nodes.length>0&&<details className="lab-export" onToggle={e=>{if(!e.currentTarget.open)setExported("")}}><summary className="lab-btn ghost">Export ▾</summary><div className="lab-export-menu">
<button type="button" onClick={()=>doExport("mermaid")}>Copy as Mermaid</button>
<button type="button" onClick={()=>doExport("svg")}>Download SVG</button>
<button type="button" onClick={()=>doExport("mmd")}>Download Mermaid file</button>
<button type="button" onClick={()=>doExport("link")}>Copy share link</button>
<button type="button" onClick={()=>doExport("png")}>Download PNG</button>
<button type="button" onClick={()=>doExport("json")}>Download JSON</button>{setAside()&&<button type="button" title="Saved designs this browser could not read were kept aside instead of being overwritten" onClick={()=>{download("tech-katta-unreadable-designs.json",setAside(),"application/json");setExported("Unreadable designs saved")}}>Download unreadable designs</button>}
<label className="lab-import">Import JSON…<input type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;try{if(f.size>300000)throw 0;const raw=JSON.parse(await f.text());const d=cleanDesign({id:"import",name:raw.name,updated:1,nodes:raw.nodes,edges:raw.edges,v:2},lab,"import");if(!d||!d.nodes.length)throw 0;if(nodes.length>1&&!confirm("Replace the design on the canvas with the imported one? Undo brings this one back."))return;const fl=toFlow(d);setNodes(fl.nodes);setEdges(fl.edges);moved.current=false;setTimeout(()=>fitVisible(300),80);setExported(`Imported ${d.nodes.length} parts`);track("design_import",{n:d.nodes.length})}catch{setExported("That file isn't a design saved from here")}}}/></label>
{exported&&<p role="status">✓ {exported}</p>}</div></details>}
</header>
<div className="lab-status" aria-live="polite">{replay?<span>{replay.status}</span>:badStart?<span className="lab-warn">There is no challenge called “{badStart}”. Pick one on the Problems page.</span>:ch?<span className="lab-muted">Score your design to see which stars it earns.</span>:problem?.practice&&checks.length?<span className="lab-checks"><button type="button" className={"lab-chk "+(checks.some(c=>c.level==="error")?"bad":"warn")} aria-expanded={showChecks} onClick={()=>setShowChecks(v=>!v)}>{checks.length===1?"1 thing to fix":`${checks.length} things to fix`} {showChecks?"▴":"▾"}</button>{!showChecks&&<span className="lab-muted lab-chk-first">{checks[0].message}</span>}</span>:problem?.practice&&nodes.length>1?<span className="lab-ok">✓ Nothing stops this design from running. {problem.id==="sandbox"?"Run to try it with your traffic.":"Run or Submit to test it."}</span>:<span className="lab-muted">Run or Submit to test this design; then ▶ Replay a load test to watch it here.</span>}
{showChecks&&!replay&&checks.length>0&&<ul className="lab-chk-list">{checks.map((c,k)=><li key={k} className={c.level}><button type="button" disabled={!c.node} onClick={()=>{if(!c.node)return;setShowChecks(false);setNodes(ns=>ns.map(n=>({...n,selected:n.id===c.node})));const n=rf.getNode(c.node);if(n)rf.setCenter(n.position.x+100,n.position.y+40,{zoom:Math.max(rf.getZoom(),.9),duration:400})}}>{c.message}</button></li>)}</ul>}</div>
<Palette lab={lab} comps={paletteV2(lab)} onAdd={k=>add(k)} onDropAt={dropAt} setDragging={setDragging} narrow={narrow} setNarrow={embedded?null:setNarrow}/>
<div className={"lab-canvas"+(dragging?" drop":"")+(show3d?" d3on":"")} ref={wrap}>
<ReactFlow colorMode={theme} nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={ch=>onNodesChange(locked.size?ch.filter(c=>!(c.type==="remove"&&locked.has(c.id))):ch)} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={valid}
onMoveStart={e=>{if(e)moved.current=true}} onConnectEnd={onConnectEnd} onNodeContextMenu={nodeMenu} onPaneContextMenu={paneMenu} onPaneClick={()=>{setShowChecks(false);setMenu(null)}} minZoom={.25} maxZoom={2} snapToGrid snapGrid={[20,20]} connectionMode={ConnectionMode.Loose} deleteKeyCode={["Backspace","Delete"]} defaultEdgeOptions={{type:"arrow"}}>
<Background gap={20} size={1} color={LINE}/><Controls showInteractive={false} showFitView={false} position="bottom-left"><ControlButton className="react-flow__controls-fitview" onClick={()=>{moved.current=false;fitVisible(300)}} title="Fit the design to the screen (F)" aria-label="Fit view">⤢</ControlButton>{!replay&&<><ControlButton onClick={()=>travel(-1)} disabled={!hist.current.past.length} title="Undo (Ctrl+Z)" aria-label="Undo">↶</ControlButton><ControlButton onClick={()=>travel(1)} disabled={!hist.current.future.length} title="Redo (Shift+Ctrl+Z)" aria-label="Redo">↷</ControlButton></>}</Controls>
{!embedded&&nodes.length>5&&<MiniMap className="lab-mini" position="bottom-right" pannable zoomable ariaLabel="Map of the design" nodeColor={n=>({teal:CAT_TEAL,green:CAT_GREEN,pink:CAT_PINK,violet:CAT_VIOLET,amber:CAT_AMBER})[TINT[n.data?.kind]]||INK_3} nodeStrokeWidth={0} nodeBorderRadius={6} maskColor="transparent"/>}</ReactFlow>{show3d&&<Design3D nodes={nodes} edges={edges} names={Object.fromEntries(Object.entries(cat).map(([k,v])=>[k,v.name]))} api={d3} onFail={()=>setM3d(false)}
 onMove={(id,p)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,position:{x:p.x,y:p.y}}:n))} onSelect={ids=>setNodes(ns=>ns.map(n=>!!n.selected===ids.includes(n.id)?n:{...n,selected:ids.includes(n.id)}))}
 onConnect={(a,b)=>{if(valid({source:a,target:b})===false)return false;onConnect({source:a,target:b});return true}} onRemove={ids=>{setNodes(ns=>ns.filter(n=>!ids.includes(n.id)||locked.has(n.id)));setEdges(es=>es.filter(e=>!ids.includes(e.source)&&!ids.includes(e.target)))}}/>}
{phone&&!replay&&!trace&&!present&&<>
<div className="ph-corner"><button type="button" className="ph-fab-sm" onClick={fitAll} aria-label="Fit the design to the screen">⤢</button>{hist.current.past.length>0&&<button type="button" className="ph-fab-sm" onClick={()=>travel(-1)} aria-label="Undo">↶</button>}</div>
{!connFrom&&<button type="button" className="ph-add" onClick={()=>setPartsOpen(true)}>+ Part</button>}
{selected&&!connFrom&&!settingsOpen&&<div className="ph-selbar" role="toolbar" aria-label={labelOf(selected.id)}><b>{labelOf(selected.id)}</b>
<button type="button" onClick={()=>setConnFrom(selected.id)} disabled={!nodes.some(n=>valid({source:selected.id,target:n.id}))}>Connect</button><button type="button" onClick={()=>setSettingsOpen(true)}>Settings</button><button type="button" className="del" onClick={()=>remove(selected.id)} disabled={locked.has(selected.id)}>Delete</button></div>}
{connFrom&&<div className="ph-conn" role="status"><span>Tap the part {labelOf(connFrom)} sends to</span><button type="button" onClick={()=>setConnFrom(null)}>Cancel</button></div>}
{toast&&<div className="ph-toast" role="status">{toast}</div>}</>}
{multi.length>1&&!replay&&!trace&&!present&&<div className="lab-multi" role="toolbar" aria-label={`${multi.length} cards selected`}><b>{multi.length} selected</b>{multiItems(multi[0]).map(it=><button key={it.label} type="button" onClick={it.run} title={it.keys?`${it.label} (${it.keys})`:it.label}>{it.label.replace("Align in a ","Align ")}</button>)}</div>}
{!nodes.length&&<div className="lab-empty">{phone?"Tap + Part to add your first part.":"Drag components here from the left to start a design."}</div>}
{present&&!replay&&!trace&&order.length>0&&<PresentCard k={present.k} n={order.length} node={nodes.find(x=>x.id===order[present.k])} cat={cat} edges={edges} labelOf={labelOf} go={presentAt} stop={stopPresent}/>}
{menu&&<div className="lab-menu-back" onPointerDown={e=>{if(e.target===e.currentTarget)setMenu(null)}} onContextMenu={e=>{e.preventDefault();setMenu(null)}}><div className="lab-ctx" role="menu" style={{left:Math.min(menu.x,innerWidth-230),top:Math.min(menu.y,innerHeight-40-36*menu.items.length)}}>{menu.title&&<div className="lab-h">{menu.title}</div>}{menu.items.map(it=><button key={it.label} type="button" role="menuitem" onClick={()=>{setMenu(null);it.run()}}>{it.kind&&<Glyph kind={it.kind}/>}<span>{it.label}</span>{it.keys&&<kbd>{it.keys}</kbd>}</button>)}</div></div>}</div>
{showKeys&&<div className="lab-keys-back" onPointerDown={e=>{if(e.target===e.currentTarget)setShowKeys(false)}}><div className="lab-keys" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"><button type="button" className="lab-keys-x" onClick={()=>setShowKeys(false)} aria-label="Close">✕</button><h2>Keyboard shortcuts</h2><p className="lab-note">Ctrl is ⌘ on a Mac.</p>
<dl>{[["Fit the design to the screen","F"],["Undo · redo","Ctrl+Z · Shift+Ctrl+Z"],["Copy · paste","Ctrl+C · Ctrl+V"],["Duplicate","Ctrl+D"],["Select all","Ctrl+A"],["Delete the selection","Delete"],["Reverse the selected arrow","Shift+R"],["Deselect, close a menu","Esc"],["Add the first search match","Enter in the palette's search"],["Add a part and join it","Drag an arrow from a card onto empty canvas"],["More actions","Right-click a card or the canvas"],["This list","?"]].map(([a,k])=><React.Fragment key={a}><dt>{a}</dt><dd><kbd>{k}</kbd></dd></React.Fragment>)}</dl></div></div>}
{phone&&<Sheet name="parts" open={partsOpen} onClose={()=>{setPartsOpen(false);setHint(null)}} title="Add a part" height="tall"><PartsGrid comps={paletteV2(lab)} full={nodes.length>=MAX_NODES} hint={hint} setHint={setHint} onPick={k=>{add(k,undefined,undefined,true);setPartsOpen(false);setHint(null)}}/></Sheet>}
<Maybe on={phone} open={settingsOpen&&!!(selected||selEdge)} name="settings" title={selEdge&&!selected?"Arrow settings":"Settings: "+labelOf(selected?.id)} onClose={()=>setSettingsOpen(false)}><Inspector close={phone?()=>setSettingsOpen(false):deselect} hl={embedded&&!embedded.h1?4:2} fieldHints={problem?.fields||(chStart?[...new Set(Object.values(chStart.entities||{}).flatMap(e=>Object.keys(e.fields||{})))]:undefined)} rename={rename} conn={selected&&selected.data.kind!=="database"?{out:edges.filter(e=>e.source===selected.id),targets:nodes.filter(n=>valid({source:selected.id,target:n.id})),add:t=>onConnect({source:selected.id,target:t}),dupName:n=>nodes.filter(x=>x.data.kind===n.data.kind).length>1}:null} lab={lab} node={selected} edge={selEdge} removeEdge={removeEdge} labelOf={labelOf} update={update} remove={remove} ch={ch} best={ch?progress.stars[ch.id]:0} goals={ch?progress.goals[ch.id]:null} score={scoreIt} ops={problem?.ops||(chStart?chStart.operations.map(o=>({id:o.id,name:o.name})):undefined)} setCarries={setCarries} setNote={setNote} reverse={reverse} canReverse={canReverse(selEdge)} setLook={setLook} autoProto={selEdge?inferProtocol(nodes.find(n=>n.id===selEdge.source)?.data.kind,nodes.find(n=>n.id===selEdge.target)?.data.kind):null} lockedIds={locked}/></Maybe>
{score&&ch&&!(phone&&embedded?.back)&&<Score lab={lab} ch={ch} res={score} close={()=>setScore(null)} next={embedded?.next&&nextCh?(()=>{location.hash=`problems/challenge/${nextCh.id}`}):null} more={embedded?.next?null:embedded}/>}
</div></Ctx.Provider>;
if(!(phone&&ch&&embedded?.back))return core;
const best=progress.stars[ch.id]||0,gl=progress.goals[ch.id],unmet=score&&!score.error?score.checks.filter(c=>!c.ok).length:0;
const startDesign=()=>{try{localStorage.setItem(seenKey,"1")}catch{}setCview("design")},done=()=>{setCmenu(false)};
const renameDesign=()=>{done();const v=prompt("Name this design",name);if(v!==null)setName(v.slice(0,60))},swap=()=>{done();if(host3d()&&webgl()){const v=!m3d;setM3d(v);saveMode3d(v)}};
return <PhoneFrame cls="ph-ch" title={ch.title} back="/problems#challenges" runLabel="★ Score" onRun={()=>{scoreIt();setCview("results")}} views={["problem","design","results"]} view={cview} setView={setCview} badge={unmet} replay={!!(replay||trace)} exitReplay={()=>setCview("results")} menuOpen={cmenu} setMenuOpen={setCmenu}
problem={<><p className="lab-h">CHALLENGE · {lab.levels.find(l=>l.id===ch.level)?.label.toUpperCase()}</p><h1 className="ph-h1">{ch.title}</h1><p>{ch.brief}</p>
<ul className="lab-goals">{ch.stars.map((g,i)=><li key={i} className={gl?(gl[i]?"ok":""):i<best?"ok":""}><b>★</b><span>{g.label}</span></li>)}</ul><details className="lab-hint"><summary>Hint</summary><p>{ch.hint}</p></details>
<p className="lab-note">The challenge sets the traffic{ch.faults?.length?" and what goes wrong":""}. Best so far: <Stars n={best} max={ch.stars.length}/></p></>}
start={cview==="problem"&&(()=>{try{return localStorage.getItem(seenKey)!=="1"}catch{return true}})()?<div className="ph-start"><button type="button" className="sv-submit" onClick={startDesign}>Start designing →</button></div>:null}
results={score?<><ScoreBody ch={ch} res={score}/><div className="ph-acts"><button type="button" className="lab-btn ghost" onClick={()=>setCview("design")}>Keep improving</button>{embedded?.next&&nextCh&&<button type="button" className="lab-btn" onClick={()=>{location.hash=`problems/challenge/${nextCh.id}`}}>Next challenge →</button>}<a className="lab-btn ghost" href="/problems#challenges" onClick={e=>{e.preventDefault();goBack("/problems#challenges")}}>All challenges</a></div></>
:<div className="ph-empty"><b>No score yet</b><p>Score your design to see which stars it earns.</p><button type="button" className="sv-run" onClick={()=>{scoreIt();setCview("results")}}>★ Score</button></div>}
menu={<><button type="button" className="ph-item strong" onClick={()=>{done();scoreIt();setCview("results")}}>Score my design<small>Which stars it earns</small></button>
<button type="button" className="ph-item" onClick={renameDesign}>Rename the design</button>{host3d()&&webgl()&&<button type="button" className="ph-item" onClick={swap}>Switch between 3D and 2D</button>}
<button type="button" className="ph-item" aria-expanded={cexpo} onClick={()=>setCexpo(v=>!v)}>Export<small>{cexpo?"▴":"▾"}</small></button>
{cexpo&&<div className="ph-sub-list">{[["mermaid","Copy as Mermaid"],["svg","Download SVG"],["png","Download PNG"],["json","Download JSON"],["link","Copy share link"]].map(([c,t])=><button key={c} type="button" className="ph-item" onClick={()=>{done();doExport(c)}}>{t}</button>)}</div>}</>}>{core}</PhoneFrame>}

// The card under the canvas while presenting: the part, its settings, its arrows in and out, and the learner's note.
function PresentCard({k,n,node,cat,edges,labelOf,go,stop}){if(!node)return null;const comp=cat[node.data.kind];const inn=edges.filter(e=>e.target===node.id).map(e=>labelOf(e.source)),out=edges.filter(e=>e.source===node.id).map(e=>labelOf(e.target));
return <div className="lab-present" role="region" aria-label="Presenting your design" aria-live="polite"><div className="lab-present-top"><small>Part {k+1} of {n}</small><button type="button" className="lab-keys-x" onClick={stop} aria-label="End presenting">✕</button></div>
<b>{labelOf(node.id)}</b>{node.data.name&&comp&&<small className="lab-present-kind"> · {comp.name}</small>}
<p className="lab-present-io">{inn.length?<>Called by {inn.join(", ")}. </>:null}{out.length?<>Calls {out.join(", ")}.</>:inn.length?"Calls nothing further.":"Nothing calls it yet."}</p>
{node.data.note?<blockquote>{node.data.note}</blockquote>:<p className="lab-note">No note yet. Select it and write one under "Your note": say why it is there, as you would to the interviewer.</p>}
<div className="lab-present-nav"><button type="button" className="lab-btn ghost" disabled={k===0} onClick={()=>go(k-1)}>← Back</button><button type="button" className="lab-btn" onClick={()=>k<n-1?go(k+1):stop()}>{k<n-1?"Next →":"Done"}</button></div></div>}

// On a phone the settings are a sheet; on a wide screen they float over the canvas as they always did.
const Maybe=({on,open,children,...p})=>!on?children:open?<Sheet {...p} open>{children}</Sheet>:null;
// The parts sheet: every part in the palette's own groups, three to a row; a long press says what a part is.
function PartsGrid({comps,onPick,hint,setHint,full}){const t=useRef(0),down=useRef(0),held=useRef(false),stop=()=>clearTimeout(t.current);const groups=[...new Set(comps.map(c=>c.group))];
// a press is long by the time between its own events, not by a timer: on a busy phone a timer can fire before the finger's release is delivered
return <>{full&&<p className="lab-note">The design is full. Delete a part to add another.</p>}{groups.map(g=><div key={g}><div className="lab-g">{g}</div><div className="ph-grid">{comps.filter(c=>c.group===g).map(c=><button key={c.type} type="button" className="ph-part" aria-label={c.name} disabled={full}
onPointerDown={e=>{held.current=false;down.current=e.timeStamp;stop();t.current=setTimeout(()=>setHint(c),450)}} onPointerUp={e=>{held.current=e.timeStamp-down.current>450;if(!held.current)stop()}} onPointerCancel={stop} onContextMenu={e=>e.preventDefault()} onClick={()=>{if(held.current){held.current=false;setHint(c);return}onPick(c.type)}}><Thumb kind={c.type} size={36}/><span>{c.name}</span></button>)}</div></div>)}
{hint&&<p className="ph-hint" role="status"><b>{hint.name}.</b> {hint.desc}</p>}</>}
