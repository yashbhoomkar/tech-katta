// The Solution tab's design: the problem's reference design (GET /v1/articles/<slug>/solution), drawn
// read-only the way the Lab draws it (components where the Lab puts them, arrows between them), with
// what each part does and the tables each database holds, and a button that copies the whole solution: the design onto
// the canvas and the model answer into Your answer (solve.jsx puts both there and offers Undo). Copying is marked in this browser (tk-solution-v1), so a
// submission of the copied design unchanged isn't counted as solved (judge.js sameDesign). `note`
// (practice.referenceNote) says where the Lab's version differs from the worked answer's full-size one.
import{useTheme}from"./theme/mode.js";import{ICON,TINT,SX,SY,box as card,layout}from"./lab/drawing.js";import{protocolOf,DASH}from"./lab/protocols.js";import{toMermaid,toSvg,download,copyText,fileName,walkOrder}from"./lab/export.js";import React,{useEffect,useMemo,useRef,useState}from"react";import{catalogue,displayName,summary,engineOf}from"./lab/engine.js";import{schemaSummary}from"./lab/schema.js";

const KIND={btree:"index",unique:"unique index",geo:"geo index",text:"text index"};
// Drawn the way the canvas draws it (lab/drawing.js): cards spread out by SX and SY, a curved arrow between the
// sides that face each other (round other cards when they are in the way), coloured and dashed by its protocol,
// with the protocol (or the arrow's label) in a pill halfway along.
const NW=200,NH=74,PAD=28;
const cut=(t,n)=>t.length>n?t.slice(0,n-1)+"…":t;
const COLORS=["teal","green","pink","violet","amber","ink"];

export default function SolutionDesign({sol,lab,copy,copied,undo,busy,note}){useTheme();
const cat=useMemo(()=>lab?catalogue(lab):{},[lab]);
// a design wider than the pane scrolls in its box (say so), and opens full size in a dialog
const box=useRef(null),dlg=useRef(null),[wide,setWide]=useState(false);
// "Walk me through it": the full-size drawing, one part at a time from the Clients along the arrows, the rest dimmed,
// with what the part is and how it talks to its neighbours (spec 33 part 2, after System Design Canvas's presentation mode).
const[walk,setWalk]=useState(null),[copiedMd,setCopiedMd]=useState(false);
useEffect(()=>{const el=box.current;if(!el||typeof ResizeObserver==="undefined")return;const f=()=>setWide(el.scrollWidth>el.clientWidth+2);f();const ro=new ResizeObserver(f);ro.observe(el);return()=>ro.disconnect()},[sol]);
if(!sol)return null;
const parts=sol.nodes.map(n=>{const comp=cat[n.type],config=n.config||{},eng=engineOf(comp,config);
return{n,comp,name:displayName(comp,n),group:(comp?.group||n.type).toUpperCase(),sum:comp?summary(comp,config):"",eng,schema:config.schema?.tables?.length?config.schema:null}});
const at=Object.fromEntries(sol.nodes.map(n=>[n.id,card(n.x*SX,n.y*SY,NW,NH)])),kind=Object.fromEntries(sol.nodes.map(n=>[n.id,n.type]));
const list=sol.edges.filter(e=>at[e.from]&&at[e.to]).map((e,k)=>{const p=protocolOf(e,kind[e.from],kind[e.to]);return{id:String(k),k,from:e.from,to:e.to,p,text:e.label||p.name}});
const geo=layout(at,list),arrows=list.filter(a=>geo[a.id]).map(a=>({...a,d:geo[a.id].path,lx:geo[a.id].lx,ly:geo[a.id].ly}));
// the drawing's extent: the cards, every arrow's control points (detours bend outside the cards) and the pills
const cs=arrows.map(a=>a.d.match(/-?[\d.]+/g).map(Number));
const xs=[...Object.values(at).flatMap(b=>[b.x,b.x+b.w]),...cs.flatMap(c=>c.filter((_,i)=>i%2===0)),...arrows.flatMap(a=>[a.lx-60,a.lx+60])];
const ys=[...Object.values(at).flatMap(b=>[b.y,b.y+b.h]),...cs.flatMap(c=>c.filter((_,i)=>i%2===1)),...arrows.flatMap(a=>[a.ly-12,a.ly+12])];
const x0=Math.min(...xs)-PAD,y0=Math.min(...ys)-PAD,x1=Math.max(...xs)+PAD,y1=Math.max(...ys)+PAD;
const W=x1-x0,H=y1-y0;
const order=walkOrder(sol),focus=walk!=null?order[walk]:null,near=focus?new Set([focus,...sol.edges.filter(e=>e.from===focus||e.to===focus).flatMap(e=>[e.from,e.to])]):null;
const draw=(min,id,lit)=><svg viewBox={`${x0} ${y0} ${W} ${H}`} style={{width:"100%",minWidth:min+"px"}} aria-hidden="true" className={lit?"sd-walking":undefined}>
<defs>{COLORS.map(c=><marker key={c} id={id+"-"+c} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className={"sd-head t-"+c}/></marker>)}</defs>
{arrows.map(a=><path key={a.k} d={a.d} className={"sd-edge t-"+a.p.color+(lit&&a.from!==lit&&a.to!==lit?" sd-dim":"")} strokeDasharray={DASH[a.p.dash]} markerEnd={`url(#${id}-${a.p.color})`}/>)}
{parts.map(({n,name,sum,comp})=>{const b=at[n.id];return <g key={n.id} transform={`translate(${b.x},${b.y})`} className={lit?(n.id===lit?"sd-lit":near?.has(n.id)?"":"sd-dim"):undefined}>
<rect width={NW} height={NH} rx="12" className="sd-node"/>
<g className={"t-"+(TINT[n.type]||"teal")}><rect x="12" y="12" width="32" height="32" rx="9" className="sd-tile"/><path d={ICON[n.type]||ICON.server} transform="translate(19.5 19.5) scale(.85)" className="sd-ico"/></g>
<text x="54" y="26" className="sd-name">{cut(name,20)}</text>
<text x="54" y="40" className="sd-sub">{cut(n.name&&comp?comp.name:comp?.group||"",26)}</text>
<text x="12" y="62" className="sd-sum">{cut(sum,32)}</text>
</g>})}
{arrows.map(a=>{const w=a.text.length*5.9+22;return <g key={"p"+a.k} className={"sd-pill t-"+a.p.color+(lit&&a.from!==lit&&a.to!==lit?" sd-dim":"")} transform={`translate(${a.lx-w/2},${a.ly-9})`}><rect width={w} height="18" rx="9"/><circle cx="10" cy="9" r="3"/><text x="17" y="12.5">{a.text}</text></g>})}
</svg>;
return <section className="sd" aria-labelledby="sd-h">
<header className="sd-head"><div><label>SOLUTION DESIGN</label><h2 id="sd-h">A design that passes every test</h2>
<p>It's one way to solve it, not the only one: any design that passes the tests is accepted. Copy it to run it, watch the API calls travel through it, and change it. Copying also fills in Your answer: the requirements, numbers, estimates, API and key decisions.</p>{note&&<p className="sd-note">{note}</p>}</div></header>
<div className="sd-acts">{copied?<p className="sd-done" role="status">✓ Copied: the design is on your canvas and the full answer is in Your answer.{undo&&<> <button type="button" className="sv-linkbtn" onClick={undo} disabled={busy}>Undo: put mine back</button></>}</p>
:<button type="button" className="sd-copy" onClick={copy} disabled={busy||!lab}>Copy to my canvas</button>}
<small>{copied?"A copied design that you submit unchanged isn't counted as solved.":"It replaces your design and your answer; you can undo it."}</small></div>
<div className="sd-fig" ref={box} tabIndex={0} role="img" aria-label={`The solution design: ${parts.map(p=>p.name).join(", ")}`}>{draw(Math.min(W,360),"sd-a1")}</div>
<div className="sd-under">{wide&&<p className="sd-swipe">Scroll the diagram sideways to see all of it.</p>}<span className="sd-tools"><button type="button" className="sv-linkbtn" onClick={()=>{setWalk(0);dlg.current?.showModal?.()}}>▶ Walk me through it</button><button type="button" className="sv-linkbtn" onClick={async()=>{if(await copyText(toMermaid(sol,cat))){setCopiedMd(true);setTimeout(()=>setCopiedMd(false),1800)}}}>{copiedMd?"✓ Copied":"Copy as Mermaid"}</button><button type="button" className="sv-linkbtn" onClick={()=>download(fileName(sol.slug||"solution")+".svg",toSvg(sol,cat,undefined,{title:"Solution design"}),"image/svg+xml")}>SVG</button><button type="button" className="sv-linkbtn" onClick={()=>{setWalk(null);dlg.current?.showModal?.()}}>⤢ Full size</button></span></div>
<dialog ref={dlg} className="sd-dlg" aria-label={walk!=null?"Walk through the solution design":"The solution design, full size"} onClose={()=>setWalk(null)} onClick={e=>{if(e.target===dlg.current)dlg.current.close()}}
 onKeyDown={e=>{if(walk==null)return;if(e.key==="ArrowRight"){e.preventDefault();setWalk(w=>Math.min(order.length-1,w+1))}if(e.key==="ArrowLeft"){e.preventDefault();setWalk(w=>Math.max(0,w-1))}}}><div className="sd-dlg-bar"><b>{walk!=null?"Walk through the solution":"Solution design"}</b><button type="button" onClick={()=>dlg.current.close()} aria-label="Close" autoFocus>✕</button></div>
<div className="sd-fig sd-fig-big">{draw(Math.round(W*.85),"sd-a2",focus)}</div>
{focus&&(()=>{const pt=parts.find(x=>x.n.id===focus),nm=id=>parts.find(x=>x.n.id===id)?.name||id,how=e=>e.label||protocolOf(e,kind[e.from],kind[e.to]).name;
const ins=sol.edges.filter(e=>e.to===focus),outs=sol.edges.filter(e=>e.from===focus);
return <div className="sd-story" aria-live="polite"><small>{walk+1} of {order.length}</small><h3>{pt.name}</h3><p className="sd-what">{pt.comp?.name&&pt.comp.name!==pt.name?pt.comp.name+" · ":""}{pt.sum}</p>
{pt.comp?.desc&&<p>{pt.comp.desc}</p>}
{ins.length>0&&<p>Calls arrive from {ins.map((e,k)=><React.Fragment key={k}>{k?", ":""}<b>{nm(e.from)}</b> ({how(e)})</React.Fragment>)}.</p>}
{outs.length>0&&<p>It calls {outs.map((e,k)=><React.Fragment key={k}>{k?", ":""}<b>{nm(e.to)}</b> ({how(e)})</React.Fragment>)}.</p>}
{pt.schema&&<p><small>{schemaSummary(pt.eng,pt.schema)}</small></p>}
<div className="sd-walk-btns"><button type="button" onClick={()=>setWalk(w=>Math.max(0,w-1))} disabled={walk===0}>← Back</button><button type="button" onClick={()=>walk<order.length-1?setWalk(w=>w+1):dlg.current.close()}>{walk<order.length-1?"Next →":"Done"}</button></div></div>})()}
</dialog>
<details className="sd-parts"><summary>What each part does ({parts.length})</summary><ul>
{parts.map(({n,name,comp,sum,eng,schema})=><li key={n.id}><b>{name}</b><span className="sd-what">{comp?.name&&comp.name!==name?comp.name+" · ":""}{sum}</span>

{schema&&<div className="sd-sch"><small>{schemaSummary(eng,schema)}</small>{schema.tables.map(t=><p key={t.name}><code>{t.name}</code>{t.key?.length?<> · key <code>{t.key.join(", ")}</code></>:""}{t.sortKey?<> · sorted by <code>{t.sortKey}</code></>:""}{(t.indexes||[]).map((i,k)=><React.Fragment key={k}> · {KIND[i.kind]||"index"} on <code>{i.fields.join(", ")}</code></React.Fragment>)}{t.ttl?<> · expires by <code>{t.ttl}</code></>:""}<br/><small>{t.fields.map(f=>f.name).join(", ")}</small></p>)}</div>}
</li>)}</ul></details>
</section>}
