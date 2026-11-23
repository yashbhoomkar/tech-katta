import React,{useEffect,useRef,useState}from"react";
// The replay (and ▶ Watch) in 3D: the learner's own design as the 3D models of the landing and the simulator, coloured by the replay's state at the
// minute on the scrubber. Only on the 3D site (tech.katta.cc): the engine is the page's own, /3d/scripts/world.js, loaded at run time, not bundled
// twice. Without WebGL, or off that site, the 2D canvas stays and the "3D" choice is off. The functions that turn a design and a minute into a
// system and a state are the 3D site's (site3d/scripts/replay3d.js, tested there).
const BASE="/3d/scripts/";
let engine=null;const load=()=>engine||=Promise.all([import(/* @vite-ignore */BASE+"world.js"),import(/* @vite-ignore */BASE+"replay3d.js")]).then(([w,r])=>({createWorld:w.createWorld,...r}));
export const webgl=()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch{return false}};
/** this page has the 3D site's engine (it is the 3D site's page); whether the browser can draw it is webgl() */
export const can3d=()=>typeof window!=="undefined"&&typeof window.tkGo==="function";
/** 2D | 3D, in the replay's and the watch's header; 3D is off, with its reason, where there is no WebGL */
export function ViewToggle({view,set}){const ok=webgl();return <span className="sv-seg" role="radiogroup" aria-label="View">{["2d","3d"].map(v=><button key={v} type="button" role="radio" aria-checked={view===v} className={view===v?"on":""} disabled={v==="3d"&&!ok} title={v==="3d"&&!ok?"3D needs WebGL":v==="3d"?"Watch your design as 3D models":"The canvas"} onClick={()=>{set(v);saveView(v)}}>{v.toUpperCase()}</button>)}</span>}
const KEY="tk-replay-view";
export const readView=()=>{try{return localStorage.getItem(KEY)==="3d"?"3d":"2d"}catch{return"2d"}};
export const saveView=v=>{try{localStorage.setItem(KEY,v)}catch{}};

/** a view of the design over the canvas area. `at`: replayAt(...) for a replay; `hop`: the step of a watched request. */
export function Replay3D({design,nameOf,at,hop,minute,label,onFail}){
const cv=useRef(null),ov=useRef(null),w=useRef(null),ex=useRef(null),last=useRef(-1);const[ready,setReady]=useState(false);
useEffect(()=>{let alive=true,world=null;
load().then(m=>{if(!alive)return;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;world=m.createWorld(cv.current,ov.current,{reduced,still:false});if(!world){onFail?.();return}
 world.setSystem(m.systemOf(design,nameOf),{instant:true});const f=world.frame();world.setCamera({t:f.t,dist:f.dist*1.05,az:42,el:32,sx:.5,sy:.27},{instant:true});w.current={world,m};setReady(true)}).catch(()=>onFail?.());
return()=>{alive=false;clearTimeout(ex.current);w.current=null;try{world?.destroy()}catch{}}},[]);// eslint-disable-line
useEffect(()=>{const c=w.current;if(!ready||!c)return;const{world,m}=c;
 // the picture follows the minute: no timer of its own, it moves when the replay's clock does
 const s=hop!==undefined&&hop!==null?m.stateOfHop(design,hop):m.stateAt(at,design);
 // a part that crashed in this minute is taken apart once, and only when the minute moved forward
 const fwd=minute>last.current;last.current=minute;const boom=fwd?s.explode:[];
 world.setState({...s,explode:boom});clearTimeout(ex.current);if(boom.length)ex.current=setTimeout(()=>{try{world.setState({...s,explode:[]})}catch{}},1400)},[ready,at,hop,minute,design]);
return <div className="sv-3d" role="img" aria-label={label}><canvas ref={cv}/><div ref={ov} className="overlay sv-3d-ov"/>{!ready&&<p className="sv-3d-wait" role="status">Building the 3D view…</p>}</div>}
