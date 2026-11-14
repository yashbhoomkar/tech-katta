import React,{useEffect,useLayoutEffect,useMemo,useRef,useState}from"react";import{topicsOf,TopicCards,TopicSheet}from"./topics.jsx";import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";import{readArticle,track}from"../analytics.js";import{knownFig,loadFigs,prefetchFigs}from"../figs/index.js";import{useStill}from"../theme/motion.js";import{c,d,articles,example}from"./site.js";import{words,extraWords}from"./text.jsx";import{Share}from"./share.jsx";import{Block}from"./blocks.jsx";import{previewOf}from"../preview.js";import{lsGet,lsSet}from"./storage.js";
// lock (signed-out readers): only the public preview (preview.js), then the sign-in card passed in; read
// times stay those of the whole article.
export function Article({a:full,pane,lock}){const a=useMemo(()=>lock?previewOf(full):full,[full,lock]);const still=useStill();
// Cards or full text (tech-katta-context 27): an article opens as topic cards (topics.jsx); "Full text" shows it as one
// page, as before. The choice is kept in this browser (tk-view).
const[view,setViewState]=useState(()=>lsGet("tk-view")==="text"?"text":"cards");const setView=v=>{setViewState(v);lsSet("tk-view",v);track("article_view",{view:v})};
const[open,setOpen]=useState(null);const ts=useMemo(()=>topicsOf(a),[a]);
// Signed out, Cards follows the same preview as Full text: the topics inside the preview open (one cut short says so in
// its sheet); the article's other topics show as locked cards that lead to the sign-in card.
const{locked,cut}=useMemo(()=>{if(!lock)return{locked:[],cut:-1};const all=topicsOf(full),end=a.body.length;const t=ts[ts.length-1];const whole=t&&all.find(x=>x.at===t.at);
return{locked:all.filter(x=>x.at>=end),cut:t&&whole&&whole.blocks.length>t.blocks.length?ts.length-1:-1}},[lock,full,a,ts]);
const toLock=()=>{setOpen(null);const el=document.querySelector(".d-article .a-locked");if(!el)return;el.scrollIntoView({behavior:still?"auto":"smooth",block:"center"});el.classList.remove("nudge");void el.offsetWidth;el.classList.add("nudge");el.querySelector("input,button,a")?.focus({preventScroll:true})};
const cards=view==="cards"&&ts.length+locked.length>1;
const openTopic=(k,via)=>{setOpen(k);track("topic_open",{n:k+1,via})};
const label=d.sections.find(s=>s[0]===a.section)[1];const rd=()=>"";
// Interview Questions (not the method page) open their problem workspace: design it on the canvas, Run, Submit.
const pr=a.section==="interview-questions"&&a.group!=="start";
const fn={};a.body.reduce((n,b,i)=>b.t==="fig"?(fn[i]=n+1):n,0);
const main=Math.max(1,Math.round(words(full)/220)),all=Math.max(main,Math.round((words(full)+extraWords(full))/220));
return <div className="d-read"><article className={"d-panel d-article"+(lock?" a-preview":"")+(cards?" a-cards":"")} aria-labelledby="d-title">
<nav className="crumbs" aria-label="Breadcrumb"><a href={`#${a.section}`}>{label}</a><span aria-hidden="true">/</span><span>{a.no}</span></nav>
<label>{a.tag}</label><h1 id="d-title">{a.title}</h1><p className="d-dek">{a.dek}</p><div className="d-meta"><span>{cards?`${ts.length+locked.length} topics · `:""}{main} min read{all>main?` · ${all} with details`:""}</span>{ts.length+locked.length>1&&<div className="a-view" role="group" aria-label="How to read this article"><button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}>Cards</button><button type="button" aria-pressed={view==="text"} onClick={()=>setView("text")}>Full text</button></div>}<Share a={a}/></div>
{pr&&!pane&&!lock&&c.problems?.solve&&<a className="pr-solve" href={`#problems/${a.slug}`}>{c.problems.solve.button} →</a>}
{cards?<>{a.body.some(b=>b.t==="example")&&<details className="a-ex-mini"><summary>Examples use <b>{example?.name}</b>, a made-up {String(example?.kind||"system").toLowerCase()}</summary><Block b={{t:"example"}} i="ex" still={still}/></details>}<TopicCards ts={ts} locked={locked} lockText={c.account?.previewLock?.card} onLocked={toLock} still={still} onOpen={openTopic}/></>:a.body.map((b,i)=><Block key={i} b={b} i={i} rd={rd} still={still} fn={fn}/>)}{cards&&open!=null&&<TopicSheet ts={ts} n={open} setN={setOpen} onClose={()=>setOpen(null)} still={still} fn={fn} cut={cut} cutText={c.account?.previewLock?.rest} onLocked={toLock}/>}
{lock?<div className="a-locked">{lock}</div>:<NextProblem a={a}/>}<a className="a-back" href={`#${a.section}`}>← All {label.toLowerCase()}</a></article>{!pane&&!lock&&!cards&&<Rail a={a}/>}</div>}
// Wide screens: a column beside the article with its sections (the one you are reading is marked) and,
// for an article with a card to a problem or challenge, a shortcut to it. Hidden below 1240 px, where the article fills the width.
function Rail({a}){const hs=a.body.map((b,i)=>b.t==="h2"?{id:`s-${i}`,x:b.x}:null).filter(Boolean);const lab=a.body.find(b=>b.t==="lab");const[on,setOn]=useState(null);
useEffect(()=>{if(!hs.length||typeof IntersectionObserver==="undefined")return;const els=hs.map(h=>document.getElementById(h.id)).filter(Boolean);
const pick=()=>{let cur=null;const line=innerHeight*.35;for(const el of els){if(el.getBoundingClientRect().top<=line)cur=el.id;else break}if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)cur=els[els.length-1]?.id??cur;setOn(cur)};const io=new IntersectionObserver(pick,{rootMargin:"0px 0px -60% 0px"});els.forEach(el=>io.observe(el));addEventListener("scroll",pick,{passive:true});pick();
return()=>{io.disconnect();removeEventListener("scroll",pick)}},[a.slug]);
// the marker beside the current heading slides to the next one instead of jumping (tech-katta-context 24, A4)
const ol=useRef(null),[mk,setMk]=useState(null);useLayoutEffect(()=>{const x=ol.current?.querySelector("a.on");setMk(x?{y:x.offsetTop,h:x.offsetHeight}:null)},[on]);
const go=(e,id)=>{const el=document.getElementById(id);if(!el)return;e.preventDefault();el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});setOn(id)};
const solve=c.problems?.solve&&a.section==="interview-questions"&&a.group!=="start";if(!hs.length&&!lab&&!solve)return null;
return <aside className="d-rail" aria-label="On this page">{hs.length>0&&<nav aria-label="Article contents"><b>ON THIS PAGE</b><ol ref={ol}>{mk&&<i className="rail-mark" aria-hidden="true" style={{height:mk.h,transform:`translateY(${mk.y}px)`}}/>}{hs.map(h=><li key={h.id}><a href={`#${a.section}/${a.slug}`} aria-current={on===h.id?"location":undefined} className={on===h.id?"on":""} onClick={e=>go(e,h.id)}>{h.x}</a></li>)}</ol></nav>}
{solve&&<a className="rail-lab rail-solve" href={`#problems/${a.slug}`}><b>{c.problems.solve.eyebrow}</b><span>{c.problems.solve.button} →</span></a>}
{lab&&<a className="rail-lab" href={`#${lab.to}`}><b>TRY IT ON THE CANVAS</b><span>{lab.go||"Open it"} →</span></a>}</aside>}
// After an Interview Question: the next one in the list (site.json "problems" copy), and the Problems page.
function NextProblem({a}){const p=c.problems;if(!p?.next||a.section!=="interview-questions"||a.group==="start")return null;const qs=articles.filter(x=>x.section===a.section&&x.group!=="start");const n=qs[qs.findIndex(x=>x.slug===a.slug)+1];
return <nav className="a-next" aria-label={p.next}>{n&&<a href={`#${n.section}/${n.slug}`}><small>{p.next}</small><b>{n.title} →</b></a>}<a className="a-all" href="#problems">{p.allProblems}</a></nav>}

// Article bodies are fetched when opened; the summaries list came with the dashboard.
// A figure id this build doesn't know (new content can go live a few minutes before the frontend that
// draws it) is left out, so the page and the figure numbers skip it instead of showing
// the wrong diagram.
const knownFigs=a=>a.body.some(x=>x.t==="fig"&&!knownFig(x.id))?{...a,body:a.body.filter(x=>x.t!=="fig"||knownFig(x.id))}:a;
// the article, once the modules that draw its figures have loaded (figs/index.js), so it shows complete
export const withFigs=a=>{const k=knownFigs(a);return loadFigs(k.body.filter(x=>x.t==="fig").map(x=>x.id)).then(()=>k)};
// A late answer for the article the visitor has already left is dropped (cur), so it never replaces the one on screen.
// "Continue reading" on the start page: the last article opened here, and the furthest point reached in it (0 to 1).
function lastRead(slug){const save=()=>{const max=document.documentElement.scrollHeight-innerHeight,p=Math.round((max>0?Math.min(1,scrollY/max):0)*100)/100;try{const o=JSON.parse(lsGet("tk-last")||"null");if(o?.slug===slug&&o.p>=p)return}catch{}lsSet("tk-last",JSON.stringify({slug,p}))};
save();let t;const on=()=>{clearTimeout(t);t=setTimeout(save,500)};addEventListener("scroll",on,{passive:true});return()=>{clearTimeout(t);removeEventListener("scroll",on)}}
export function ArticlePage({s,lock}){const[st,set]=useState({});const cur=useRef(s.slug);cur.current=s.slug;const load=()=>{const want=s.slug;set({});prefetchFigs(s.section,s.group);getJSON(`/v1/articles/${want}`).then(withFigs).then(a=>{if(cur.current===want)set({a})},e=>{if(cur.current===want)set({err:e.status===404?"missing":e.figs?"figs":"failed"})})};useEffect(load,[s.slug]);useEffect(()=>readArticle(s.section,s.slug),[s.section,s.slug]);useEffect(()=>lastRead(s.slug),[s.slug]);
return st.a?<Article a={st.a} lock={lock}/>:st.err?<section className="d-panel">{st.err==="missing"?<p className="d-desc">This article is no longer available. <a href={`#${s.section}`}>Back to {s.section}</a></p>:<LoadError what="this article" retry={st.err==="figs"?()=>location.reload():load}/>}</section>:<section className="d-panel"><Loading label={s.title}/></section>}
