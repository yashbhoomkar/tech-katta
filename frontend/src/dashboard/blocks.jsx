// One article block (site content `body` item) drawn as HTML. Block types are listed in tech-katta-context 05-CONTENT-MODEL.
import React from"react";import{example}from"./site.js";import{inline}from"./text.jsx";import{Fig}from"./figure.jsx";
export function Block({b,i,rd,still,fn}){const k=i;const cls=x=>x+(rd?rd(k):"");
switch(b.t){
case"h2":return <h2 id={`s-${k}`} className={cls("")}>{b.x}</h2>;case"h3":return <h3 id={`s-${k}`} className={cls("")}>{b.x}</h3>;
case"p":return <p className={cls("")}>{inline(b.x)}</p>;
case"list":return <ul className={cls("")}>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul>;
case"example":return <aside className={cls("a-example")} aria-label="Example system"><div className="a-ex-head"><b>EXAMPLE SYSTEM</b><span>{example.name}</span><small>{example.kind}</small></div><p>{example.text}</p><dl>{example.parts.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></aside>;
case"type":return <section className={cls("a-type")}><h3>{b.name}<small>{b.kind}</small></h3><p className="a-what">{inline(b.what)}</p><dl><dt>Use it for</dt><dd>{inline(b.use)}</dd><dt>Avoid it for</dt><dd>{inline(b.avoid)}</dd><dt className="ex">In {example.name}</dt><dd className="ex">{inline(b.ex)}</dd>{b.like&&<><dt className="like">In real life</dt><dd className="like">{inline(b.like)}</dd></>}</dl>{b.more&&<details className="a-more"><summary>How it works and what it costs</summary>{b.more.map(x=><p key={x}>{inline(x)}</p>)}</details>}</section>;
case"analogy":return <aside className={cls("a-analogy")} aria-label="In real life"><b>IN REAL LIFE</b><p>{inline(b.x)}</p></aside>;
case"code":return <figure className={cls("a-code")}><figcaption>{b.label}</figcaption><pre tabIndex="0" aria-label={b.say}><code>{b.x}</code></pre></figure>;
case"fig":return <Fig id={b.id} n={fn?.[k]??1} cap={b.cap} still={still} rd={rd?rd(k):""}/>;
case"lab":return <a className={cls("a-lab")} href={`#${b.to}`}><b>TRY IT ON THE CANVAS</b><p>{inline(b.x)}</p><em>{b.go||"Open it"} →</em></a>;
case"table":return <div className={cls("a-table")} role="region" aria-label={b.label||"Comparison table"} tabIndex="0"><table role="table"><thead role="rowgroup"><tr role="row">{b.head.map(h=><th key={h} scope="col" role="columnheader">{h}</th>)}</tr></thead><tbody role="rowgroup">{b.rows.map(r=><tr key={r[0]} role="row"><th scope="row" role="rowheader">{r[0]}</th>{r.slice(1).map((x,j)=><td key={j} role="cell" data-label={b.head[j+1]}>{x}</td>)}</tr>)}</tbody></table></div>;
case"more":return <details className="a-more a-deeper"><summary><small>GO DEEPER</small>{b.label}</summary>{b.body.map((x,j)=><Block key={j} b={x} i={`${k}.${j}`} still={still}/>)}</details>;
default:return null}}
