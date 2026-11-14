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
const SIDES=[["t",Position.Top],["r",Position.Right],["b",Position.Bottom],["l",Position.Left]];
const Handles=()=>SIDES.map(([id,p])=><Handle key={id} id={id} type="source" position={p}/>);
function Head({kind,comp,data,extra}){const tint=TINT[kind]||"teal",name=displayName(comp,{name:data.name,config:data.config});
return <div className="ln-head"><span className={"ln-tile t-"+tint}><Glyph kind={kind}/>{extra}</span><span className="ln-id"><b>{name}</b><small>{data.name?comp.name:comp.group}</small></span></div>}
export function CompNode({id,data,selected}){const{cat,trace,replay,flagged}=useContext(Ctx);const comp=cat[data.kind];const flag=flagged?.get(id);
const rp=replay?.nodes?.[id];if(replay&&data.kind!=="client")return <ReplayCard id={id} data={data} comp={comp} rp={rp} selected={selected}/>;
const sum=summary(comp,data.config);
return <div className={"ln t-"+(TINT[data.kind]||"teal")+(selected?" sel":"")+(trace?.at===id?" ln-trace":"")}><Handles/>
<Head kind={data.kind} comp={comp} data={data}/>{flag&&<span className={"ln-flag "+flag.level} title={flag.message} role="img" aria-label={flag.message}>!</span>}
{sum&&<span className="ln-sum">{sum}</span>}
{data.kind==="database"&&data.config?.schema?.tables?.length>0&&<span className="ln-m ln-sch">{schemaSummary(engineOf(comp,data.config),data.config.schema)}</span>}</div>}
// A card during a replay (spec 33 §1.2–1.3): its glow and heartbeat follow the load, a crash cracks the tile and
// dashes the border, and each kind adds what its own state looks like: a server's instances, a database's standby, a
// cache warming up, a queue's backlog, a gateway's held connections. Everything comes from replayAt (solve/v2.jsx).
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e4?Math.round(n/1e3)+"k":Math.round(n).toLocaleString("en-US");
function ReplayCard({data,comp,rp,selected}){const k=data.kind,rho=rp?Math.min(1.2,rp.rho):0,up=!rp||rp.up!==0;
const st=!rp?"idle":!up?"down":rp.rho>1+1e-9?"over":rp.rho>=.7?"warn":"ok",fresh=rp?.fresh||[];
const style={"--rho":Math.min(1,rho),"--g":(.2+.5*Math.min(1,rho)).toFixed(2),"--bp":(2.6-1.8*Math.min(1,rho)).toFixed(2)+"s"};
const extra=<>{rp&&<span className="ln-beat" aria-hidden="true"/>}{!up&&<svg className="ln-crack" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 6l9 9-4 3 11 9"/></svg>}
{k==="cache"&&rp&&<svg className="ln-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><circle cx="24" cy="24" r="21" className="fg" style={{strokeDashoffset:132*(1-(rp.warm??1))}}/></svg>}</>;
const inst=Math.max(0,up?rp?.inst||0:0),shown=Math.min(inst,8);
return <div className={"ln t-"+(TINT[k]||"teal")+" ln-rp "+st+(selected?" sel":"")+(fresh.some(x=>x==="scaledOut"||x==="scaledIn")?" ln-scaled":"")} style={style}><Handles/><Head kind={k} comp={comp} data={data} extra={extra}/>
{!rp?<span className="ln-m">not used</span>:!up?<span className="ln-m ln-down">DOWN</span>:<><div className="ln-bar"><i/></div><span className="ln-m">{Math.round(rp.rho*100)}%{rp.inst?` · ${rp.inst} instance${rp.inst>1?"s":""}`:""}{k==="realtime"&&rp.held?` · ${fmt(rp.held)} held`:""}</span>{rp.perHour>0&&<span className="ln-m ln-cost">${rp.perHour<10?rp.perHour.toFixed(2):Math.round(rp.perHour).toLocaleString("en-US")}/hour</span>}</>}
{k==="server"&&rp&&rp.inst>0&&<div className="ln-slots" aria-hidden="true">{Array.from({length:Math.max(shown,up?0:Math.min(rp.inst,8))},(_,j)=><span key={j} className={"ln-slot"+(up?"":" gone")} style={{transitionDelay:up?"0ms":j*60+"ms"}}><i/></span>)}{inst>8&&<small>+{inst-8}</small>}</div>}
{k==="database"&&rp&&<div className={"ln-discs"+(rp.fo?" fo":"")} aria-hidden="true"><span className="p">PRIMARY</span><span className="s">STANDBY</span></div>}
{k==="cache"&&rp&&rp.warm<1&&<span className="ln-m ln-q">cold · warming {Math.round(rp.warm*100)}%</span>}
{rp?.backlog>0&&<><div className="ln-blocks" aria-hidden="true">{Array.from({length:Math.max(1,Math.round(12*rp.backlog/rp.peak))},(_,j)=><i key={j} className={j>=9?"over":""}/>)}</div><span className="ln-m ln-q">backlog {fmt(rp.backlog)}</span></>}</div>}
export const nodeTypes={comp:CompNode};

const boxOf=n=>{const{x,y}=n.internals.positionAbsolute;return box(x,y,n.measured?.width||200,n.measured?.height||64)};
// After a passing Run or Submit (`flow`), one dot travels each arrow twice, source to target, then is gone; none
// under reduced motion.
const calm=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
// Arrows: click (or tap) one, or its pill, to select it: the panel then sets its protocol, label and what it
// carries; a selected arrow shows ✕ to remove it (Delete works too).
export function Arrow({id,source,target,markerEnd,selected,data}){const rf=useReactFlow();const{trace,flow,pickEdge,replay}=useContext(Ctx);
const sn=useInternalNode(source),tn=useInternalNode(target);if(!sn||!tn)return null;
const p=data?.proto;
const[path,lx,ly]=data?.geo?[data.geo.path,data.geo.lx,data.geo.ly]:route(boxOf(sn),boxOf(tn));
const fwd=trace&&trace.from===source&&trace.at===target,back=trace&&trace.from===target&&trace.at===source;
const text=data?.label||p?.name;
// During a replay: an arrow from a part that is down is dead (grey, dashed, no dots); one into a part that is down
// fails (its dots turn red and stop short); a message arrow marches its dashes; others carry dots by the sender's load.
const rs=replay?.nodes?.[source],rt=replay?.nodes?.[target],srcDown=!!replay&&rs?.up===0,tgtDown=!!replay&&rt?.up===0,quiet=calm();
const rstate=!replay?null:srcDown?"dead":tgtDown?"fail":(rs?.rho||0)>0||rs===undefined?"live":"idle";
const dots=rstate==="live"&&!quiet&&p?.dash!=="dash"?Math.min(3,1+Math.round(2*Math.min(1,rs?.rho??.5))):rstate==="fail"&&!quiet?2:0;
return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={fwd||back?{"--edge":BLUE,strokeWidth:2.5,strokeDasharray:"none"}:rstate==="dead"?{"--edge":"var(--line-strong)",strokeDasharray:"4 4"}:rstate==="fail"?{"--edge":"var(--danger)",strokeDasharray:DASH[p?.dash]}:p?{"--edge":p.color==="ink"?"var(--ink-3)":`var(--cat-${p.color})`,strokeDasharray:DASH[p.dash],...(rstate==="live"&&p.dash==="dash"&&!quiet?{animation:"tk-march 1.2s linear infinite"}:{})}:undefined}/>
{Array.from({length:dots},(_,k)=><circle key={"r"+k+rstate} r="4.5" className={"lab-rdot"+(rstate==="fail"?" fail":"")} style={rstate!=="fail"&&p?{fill:p.color==="ink"?"var(--ink-3)":`var(--cat-${p.color})`}:undefined}><animateMotion dur={rstate==="fail"?"1.4s":"1.8s"} begin={`${(k*(rstate==="fail"?1.4:1.8))/dots}s`} repeatCount="indefinite" path={path} keyPoints={rstate==="fail"?"0;.82;.82":"0;1"} keyTimes={rstate==="fail"?"0;.7;1":"0;1"} calcMode="linear"/>{rstate==="fail"&&<animate attributeName="opacity" values="1;1;0" keyTimes="0;.7;1" dur="1.4s" begin={`${(k*1.4)/dots}s`} repeatCount="indefinite"/>}</circle>)}{flow&&!fwd&&!back&&!calm()&&<g className="lab-flow" opacity="0" key={flow}><circle r="11" className="lab-flow-halo"/><circle r="5.5"/><animateMotion dur="1.1s" repeatCount="2" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".3 0 .3 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="1.1s" repeatCount="2"/></g>}{(fwd||back)&&<circle r="6" className="lab-dot" key={trace.n}><animateMotion dur="0.9s" repeatCount="indefinite" path={path} keyPoints={back?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"/></circle>}
<EdgeLabelRenderer><div className={"lab-pill-at nodrag nopan"+(selected?" sel":"")} style={{transform:`translate(-50%,-50%) translate(${lx}px,${ly}px)`}}>
{text&&<button type="button" className={"lab-pill"+(p?" t-"+p.color:"")+(rstate==="fail"?" err":"")+(rstate==="dead"?" dead":"")} onClick={()=>pickEdge?.(id)} title={data?.label&&p?`${data.label} · ${p.name}`:p?.name} aria-label={`Arrow: ${text}${rstate==="dead"?", no reply":rstate==="fail"?", failing":""}. Select it`}>{text}{rstate==="dead"&&<em> · no reply</em>}</button>}
{selected&&<button type="button" className="lab-edge-x" onClick={()=>rf.deleteElements({edges:[{id}]})} aria-label="Remove this arrow" title="Remove this arrow">✕</button>}</div></EdgeLabelRenderer></>}
export const edgeTypes={arrow:Arrow};
