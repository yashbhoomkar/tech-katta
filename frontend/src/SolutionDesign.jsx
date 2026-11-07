// The Solution tab's design: the problem's reference design (GET /v1/articles/<slug>/solution), drawn
// read-only the way the Lab draws it (components where the Lab puts them, arrows between them), with
// what each part does and the tables each database holds, and a button that copies it onto the canvas
// (solve.jsx puts it there and offers Undo). Copying is marked in this browser (tk-solution-v1), so a
// submission of the copied design unchanged isn't counted as solved (judge.js sameDesign). `note`
// (practice.referenceNote) says where the Lab's version differs from the worked answer's full-size one.
import React,{useEffect,useMemo,useRef,useState}from"react";import{catalogue,displayName,summary,roleOf,engineOf}from"./lab/engine.js";import{schemaSummary}from"./lab/schema.js";

const KIND={btree:"index",unique:"unique index",geo:"geo index",text:"text index"};
const NW=176,NH=74,PAD=24;
const cut=(t,n)=>t.length>n?t.slice(0,n-1)+"…":t;
// A curved arrow from the right side of one component to the left side of the next (the Lab's layout
// runs left to right); an arrow going back left or straight down bends round instead.
function path(a,b){const x1=a.x+NW,y1=a.y+NH/2,x2=b.x,y2=b.y+NH/2;
if(x2>=x1+20){const m=(x1+x2)/2;return `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`}
if(Math.abs(a.x-b.x)<NW&&b.y>a.y)return `M${a.x+NW/2},${a.y+NH} L${b.x+NW/2},${b.y}`;
if(Math.abs(a.x-b.x)<NW&&b.y<a.y)return `M${a.x+NW/2},${a.y} L${b.x+NW/2},${b.y+NH}`;
const lo=Math.max(a.y,b.y)+NH+30;return `M${a.x+NW/2},${a.y+NH} C${a.x+NW/2},${lo} ${b.x+NW/2},${lo} ${b.x+NW/2},${b.y+NH}`}

export default function SolutionDesign({sol,lab,copy,copied,undo,busy,note}){
const cat=useMemo(()=>lab?catalogue(lab):{},[lab]);
// a design wider than the pane scrolls in its box (say so), and opens full size in a dialog
const box=useRef(null),dlg=useRef(null),[wide,setWide]=useState(false);
useEffect(()=>{const el=box.current;if(!el||typeof ResizeObserver==="undefined")return;const f=()=>setWide(el.scrollWidth>el.clientWidth+2);f();const ro=new ResizeObserver(f);ro.observe(el);return()=>ro.disconnect()},[sol]);
if(!sol)return null;
const parts=sol.nodes.map(n=>{const comp=cat[n.type],config=n.config||{},eng=engineOf(comp,config),role=roleOf(comp,config);
return{n,comp,name:displayName(comp,n),group:(comp?.group||n.type).toUpperCase(),sum:comp?summary(comp,config):"",role,eng,schema:config.schema?.tables?.length?config.schema:null}});
const x0=Math.min(...sol.nodes.map(n=>n.x))-PAD,y0=Math.min(...sol.nodes.map(n=>n.y))-PAD,x1=Math.max(...sol.nodes.map(n=>n.x))+NW+PAD,y1=Math.max(...sol.nodes.map(n=>n.y))+NH+PAD+30;
const W=x1-x0,H=y1-y0,at=Object.fromEntries(sol.nodes.map(n=>[n.id,n]));
const draw=(min,id)=><svg viewBox={`${x0} ${y0} ${W} ${H}`} style={{width:"100%",minWidth:min+"px"}} aria-hidden="true">
<defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5b6b7f"/></marker></defs>
{sol.edges.map((e,k)=>at[e.from]&&at[e.to]?<path key={k} d={path(at[e.from],at[e.to])} className="sd-edge" markerEnd={`url(#${id})`}/>:null)}
{parts.map(({n,name,group,sum,role,comp})=><g key={n.id} transform={`translate(${n.x},${n.y})`}>
<rect width={NW} height={NH} rx="2" className="sd-node"/>
<text x="12" y="19" className="sd-grp">{group}</text>
<text x="12" y="39" className="sd-name">{cut(name,20)}</text>
<text x="12" y="57" className="sd-sum">{cut(role&&!n.name?comp.name+" · "+sum:sum,28)}</text>
</g>)}
</svg>;
return <section className="sd" aria-labelledby="sd-h">
<header className="sd-head"><div><label>SOLUTION DESIGN</label><h2 id="sd-h">A design that passes every test</h2>
<p>It's one way to solve it, not the only one: any design that passes the tests is accepted. Copy it onto your canvas to run it, watch the API calls travel through it, and change it.</p>{note&&<p className="sd-note">{note}</p>}</div></header>
<div className="sd-acts">{copied?<p className="sd-done" role="status">✓ Copied to your canvas.{undo&&<> <button type="button" className="sv-linkbtn" onClick={undo} disabled={busy}>Undo: put my design back</button></>}</p>
:<button type="button" className="sd-copy" onClick={copy} disabled={busy||!lab}>Copy to my canvas</button>}
<small>{copied?"A copied design that you submit unchanged isn't counted as solved.":"It replaces the design on your canvas; you can undo it."}</small></div>
<div className="sd-fig" ref={box} tabIndex={0} role="img" aria-label={`The solution design: ${parts.map(p=>p.name).join(", ")}`}>{draw(Math.min(W,Math.round(W*.6)),"sd-a1")}</div>
<div className="sd-under">{wide&&<p className="sd-swipe">Scroll the diagram sideways to see all of it.</p>}<button type="button" className="sv-linkbtn" onClick={()=>dlg.current?.showModal?.()}>⤢ Full size</button></div>
<dialog ref={dlg} className="sd-dlg" aria-label="The solution design, full size" onClick={e=>{if(e.target===dlg.current)dlg.current.close()}}><div className="sd-dlg-bar"><b>Solution design</b><button type="button" onClick={()=>dlg.current.close()} aria-label="Close" autoFocus>✕</button></div><div className="sd-fig sd-fig-big">{draw(Math.round(W*.85),"sd-a2")}</div></dialog>
<details className="sd-parts"><summary>What each part does ({parts.length})</summary><ul>
{parts.map(({n,name,comp,sum,role,eng,schema})=><li key={n.id}><b>{name}</b><span className="sd-what">{comp?.name&&comp.name!==name?comp.name+" · ":""}{sum}</span>
{role?.desc&&<p>{role.label}: {role.desc}</p>}
{schema&&<div className="sd-sch"><small>{schemaSummary(eng,schema)}</small>{schema.tables.map(t=><p key={t.name}><code>{t.name}</code>{t.key?.length?<> · key <code>{t.key.join(", ")}</code></>:""}{t.sortKey?<> · sorted by <code>{t.sortKey}</code></>:""}{(t.indexes||[]).map((i,k)=><React.Fragment key={k}> · {KIND[i.kind]||"index"} on <code>{i.fields.join(", ")}</code></React.Fragment>)}{t.ttl?<> · expires by <code>{t.ttl}</code></>:""}<br/><small>{t.fields.map(f=>f.name).join(", ")}</small></p>)}</div>}
</li>)}</ul></details>
</section>}
