// A component and an arrow as the canvas draws them.
import{BLUE}from"../theme/palette.js";import React,{useContext}from"react";
import{Handle,Position,useReactFlow,BaseEdge,EdgeLabelRenderer,getSmoothStepPath}from"@xyflow/react";
import{schemaSummary}from"./schema.js";
import{displayName,engineOf,summary}from"./engine.js";
import{num,Ctx,Glyph,level}from"./shared.jsx";
export function CompNode({id,data,selected}){const{cat,trace,replay}=useContext(Ctx);const comp=cat[data.kind];
const rp=replay?.nodes?.[id];if(replay&&data.kind!=="client"){const rst=rp?(rp.up?level(rp.rho):"down"):"";return <div className={"ln"+(selected?" sel":"")+(rst?" "+rst:"")}>{<Handle type="target" position={Position.Left}/>}<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div><b>{displayName(comp,{name:data.name,config:data.config})}</b>
{!rp?<span className="ln-m">not used</span>:!rp.up?<span className="ln-m ln-down">DOWN</span>:<><div className="ln-bar"><i style={{width:Math.min(100,rp.rho*100)+"%"}}/></div><span className="ln-m">{Math.round(rp.rho*100)}%{rp.inst?` · ${rp.inst} instance${rp.inst>1?"s":""}`:""}</span></>}{rp?.backlog>0&&<span className="ln-m ln-q">backlog {num(rp.backlog)}</span>}{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
const sum=summary(comp,data.config);
return <div className={"ln"+(selected?" sel":"")+(trace?.at===id?" ln-trace":"")}>
{data.kind!=="client"&&<Handle type="target" position={Position.Left}/>}
<div className="ln-head"><Glyph kind={data.kind}/><small>{comp.group.toUpperCase()}</small></div>
<b>{displayName(comp,{name:data.name,config:data.config})}</b>{(sum||data.name)&&<span className="ln-sum">{data.name?comp.name+(sum?" · ":""):""}{sum}</span>}
{data.kind==="database"&&data.config?.schema?.tables?.length>0&&<span className="ln-m ln-sch">{schemaSummary(engineOf(comp,data.config),data.config.schema)}</span>}
{data.kind!=="database"&&<Handle type="source" position={Position.Right}/>}</div>}
export const nodeTypes={comp:CompNode};
// After a passing Run or Submit (`flow`), one dot travels each arrow twice, source to target, then is gone; none
// under reduced motion.
const calm=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
// Arrows: click (or tap) one to select it; a selected arrow shows ✕ to remove it (Delete works too).
export function Arrow({id,source,target,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,markerEnd,selected}){const rf=useReactFlow();const{trace,flow}=useContext(Ctx);const[path,lx,ly]=getSmoothStepPath({sourceX,sourceY,sourcePosition,targetX,targetY,targetPosition});
const fwd=trace&&trace.from===source&&trace.at===target,back=trace&&trace.from===target&&trace.at===source;
return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={fwd||back?{stroke:BLUE,strokeWidth:2.5}:undefined}/>{flow&&!fwd&&!back&&!calm()&&<g className="lab-flow" opacity="0" key={flow}><circle r="11" className="lab-flow-halo"/><circle r="5.5"/><animateMotion dur="1.1s" repeatCount="2" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".3 0 .3 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="1.1s" repeatCount="2"/></g>}{(fwd||back)&&<circle r="6" className="lab-dot" key={trace.n}><animateMotion dur="0.9s" repeatCount="indefinite" path={path} keyPoints={back?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"/></circle>}{selected&&<EdgeLabelRenderer><button type="button" className="lab-edge-x nodrag nopan" style={{transform:`translate(-50%,-50%) translate(${lx}px,${ly}px)`}} onClick={()=>rf.deleteElements({edges:[{id}]})} aria-label="Remove this arrow" title="Remove this arrow">✕</button></EdgeLabelRenderer>}</>}
export const edgeTypes={arrow:Arrow};
