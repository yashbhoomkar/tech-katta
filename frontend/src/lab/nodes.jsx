// A component and an arrow as the canvas draws them.
// A component is a card: a tinted icon tile, its name, what it is, then its settings (or, in a replay, its load).
// It has a handle on each side; an arrow can be drawn from any of them (the canvas connects in loose mode), and is
// drawn between the two sides that face each other, whichever handle it was started from, with a pill saying how
// the two parts talk (protocols.js).
import{BLUE}from"../theme/palette.js";import React,{useContext}from"react";
import{Handle,Position,useReactFlow,useInternalNode,BaseEdge,EdgeLabelRenderer}from"@xyflow/react";
import{schemaSummary}from"./schema.js";
import{displayName,engineOf,summary}from"./engine.js";
import{num,Ctx,Glyph,level,TINT}from"./shared.jsx";
import{DASH}from"./protocols.js";import{route,box}from"./drawing.js";
export{detour}from"./drawing.js";
const SIDES=[["t",Position.Top],["r",Position.Right],["b",Position.Bottom],["l",Position.Left]];
const Handles=()=>SIDES.map(([id,p])=><Handle key={id} id={id} type="source" position={p}/>);
function Head({kind,comp,data}){const tint=TINT[kind]||"teal",name=displayName(comp,{name:data.name,config:data.config});
return <div className="ln-head"><span className={"ln-tile t-"+tint}><Glyph kind={kind}/></span><span className="ln-id"><b>{name}</b><small>{data.name?comp.name:comp.group}</small></span></div>}
export function CompNode({id,data,selected}){const{cat,trace,replay}=useContext(Ctx);const comp=cat[data.kind];
const rp=replay?.nodes?.[id];if(replay&&data.kind!=="client"){const rst=rp?(rp.up?level(rp.rho):"down"):"";return <div className={"ln"+(selected?" sel":"")+(rst?" "+rst:"")}><Handles/><Head kind={data.kind} comp={comp} data={data}/>
{!rp?<span className="ln-m">not used</span>:!rp.up?<span className="ln-m ln-down">DOWN</span>:<><div className="ln-bar"><i style={{width:Math.min(100,rp.rho*100)+"%"}}/></div><span className="ln-m">{Math.round(rp.rho*100)}%{rp.inst?` · ${rp.inst} instance${rp.inst>1?"s":""}`:""}</span></>}{rp?.backlog>0&&<span className="ln-m ln-q">backlog {num(rp.backlog)}</span>}</div>}
const sum=summary(comp,data.config);
return <div className={"ln"+(selected?" sel":"")+(trace?.at===id?" ln-trace":"")}><Handles/>
<Head kind={data.kind} comp={comp} data={data}/>
{sum&&<span className="ln-sum">{sum}</span>}
{data.kind==="database"&&data.config?.schema?.tables?.length>0&&<span className="ln-m ln-sch">{schemaSummary(engineOf(comp,data.config),data.config.schema)}</span>}</div>}
export const nodeTypes={comp:CompNode};

const boxOf=n=>{const{x,y}=n.internals.positionAbsolute;return box(x,y,n.measured?.width||200,n.measured?.height||64)};
// After a passing Run or Submit (`flow`), one dot travels each arrow twice, source to target, then is gone; none
// under reduced motion.
const calm=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
// Arrows: click (or tap) one, or its pill, to select it: the panel then sets its protocol, label and what it
// carries; a selected arrow shows ✕ to remove it (Delete works too).
export function Arrow({id,source,target,markerEnd,selected,data}){const rf=useReactFlow();const{trace,flow,pickEdge}=useContext(Ctx);
const sn=useInternalNode(source),tn=useInternalNode(target);if(!sn||!tn)return null;
const p=data?.proto,off=data?.pair?(source<target?-9:9):0;
const[path,lx,ly]=route(boxOf(sn),boxOf(tn),data?.detour,off);
const fwd=trace&&trace.from===source&&trace.at===target,back=trace&&trace.from===target&&trace.at===source;
const text=data?.label||p?.name;
return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={fwd||back?{"--edge":BLUE,strokeWidth:2.5,strokeDasharray:"none"}:p?{"--edge":p.color==="ink"?"var(--ink-3)":`var(--cat-${p.color})`,strokeDasharray:DASH[p.dash]}:undefined}/>{flow&&!fwd&&!back&&!calm()&&<g className="lab-flow" opacity="0" key={flow}><circle r="11" className="lab-flow-halo"/><circle r="5.5"/><animateMotion dur="1.1s" repeatCount="2" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".3 0 .3 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="1.1s" repeatCount="2"/></g>}{(fwd||back)&&<circle r="6" className="lab-dot" key={trace.n}><animateMotion dur="0.9s" repeatCount="indefinite" path={path} keyPoints={back?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"/></circle>}
<EdgeLabelRenderer><div className={"lab-pill-at nodrag nopan"+(selected?" sel":"")} style={{transform:`translate(-50%,-50%) translate(${lx}px,${ly}px)`}}>
{text&&<button type="button" className={"lab-pill"+(p?" t-"+p.color:"")} onClick={()=>pickEdge?.(id)} title={data?.label&&p?`${data.label} · ${p.name}`:p?.name} aria-label={`Arrow: ${text}. Select it`}>{text}</button>}
{selected&&<button type="button" className="lab-edge-x" onClick={()=>rf.deleteElements({edges:[{id}]})} aria-label="Remove this arrow" title="Remove this arrow">✕</button>}</div></EdgeLabelRenderer></>}
export const edgeTypes={arrow:Arrow};
