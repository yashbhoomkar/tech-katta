// The panel for the selected component or arrow (and a challenge's goals).
import React from"react";
import{MAX_NAME}from"./engine.js";
import{InspectorV2,ArrowV2}from"./LabV2.jsx";
import{Glyph}from"./shared.jsx";import{Stars}from"./Score.jsx";
export function Inspector({lab,node,edge,update,rename,remove,removeEdge,labelOf,ch,best,goals,score,conn,fieldHints,hl=2,ops,setCarries,setLook,autoProto,reverse,canReverse,lockedIds}){
// hl: the level of its headings, one below the Lab's own title (h1 on its own page, h3 inside the landing page's section)
const H="h"+hl;
const chBox=ch&&<div className="lab-ch"><div className="lab-h">CHALLENGE · {lab.levels.find(l=>l.id===ch.level)?.label.toUpperCase()}</div><H>{ch.title}</H><p className="lab-desc">{ch.brief}</p>
<ul className="lab-goals">{ch.stars.map((g,i)=><li key={i} className={goals?(goals[i]?"ok":""):i<(best||0)?"ok":""}><b>★</b><span>{g.label}</span></li>)}</ul><details className="lab-hint"><summary>Hint</summary><p>{ch.hint}</p></details>
<button type="button" className="lab-btn lab-score-btn" onClick={score}>Score my design</button><p className="lab-note lab-note-tight">The challenge sets the traffic{ch.faults?.length?" and what goes wrong":""}. Best so far: <Stars n={best||0} max={ch.stars.length}/></p></div>;;
if(!node&&edge)return <ArrowV2 edge={edge} ops={ops||[]} labelOf={labelOf} removeEdge={removeEdge} setCarries={setCarries} setLook={setLook} autoProto={autoProto} reverse={reverse} canReverse={canReverse} H={H}/>;if(node)return <InspectorV2 locked={lockedIds?.has(node.id)} lab={lab} node={node} update={update} rename={rename} remove={remove} conn={conn&&{...conn,removeEdge}} labelOf={labelOf} fieldHints={fieldHints} H={H} Glyph={Glyph} maxName={MAX_NAME}/>;
return <aside className="lab-ins" tabIndex={0} aria-label="Details">{chBox}<div className="lab-h">DESIGN</div><p className="lab-desc">Select a component to change its settings, or an arrow to say how the two parts talk and which calls it carries.</p>{!ch&&<p className="lab-note">Run tries the example tests; Submit runs every test. After either, ▶ Replay a load test to watch it minute by minute here.</p>}<p className="lab-note">Prices are approximate AWS on-demand list prices for Mumbai, for learning only. The bill includes storage and data transfer.</p></aside>}
