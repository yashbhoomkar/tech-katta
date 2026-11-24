import React,{useEffect,useState}from"react";
import{Glyph}from"./shared.jsx";
// 3D thumbnails of the parts (the palette's tiles, the cards on the canvas, the drag ghost): each kind of part rendered once with the 3D site's own engine
// (/3d/scripts/world.js) into a small transparent image, per theme, in the background. Until an image is ready, or where there is no WebGL or no 3D site
// (the engine is the page's), the line icon (Glyph) shows as before.
const BASE="/3d/scripts/";
const store=new Map(),subs=new Set();let building=null,builtFor="";
const theme=()=>document.documentElement.getAttribute("data-theme")==="light"?"light":"dark";
const host=()=>typeof window!=="undefined"&&typeof window.tkGo==="function";
const frames=n=>new Promise(res=>{const f=()=>--n<=0?res():requestAnimationFrame(f);requestAnimationFrame(f)});
async function build(){const t=theme();if(builtFor===t||building)return;building=(async()=>{
 let W,R;try{[W,R]=await Promise.all([import(/* @vite-ignore */BASE+"world.js"),import(/* @vite-ignore */BASE+"replay3d.js")])}catch{return}
 store.clear();builtFor=t;
 for(const kind of R.KINDS){if(theme()!==t)break;const canvas=document.createElement("canvas");canvas.style.cssText="position:fixed;left:-9999px;top:0;width:176px;height:176px;pointer-events:none";document.body.appendChild(canvas);
  const ov=document.createElement("div");let w=null;
  try{w=W.createWorld(canvas,ov,{reduced:true,still:true});if(!w){console.warn("thumbnail: no WebGL for",kind);break}
   w.setSystem({parts:{a:{kind,x:0,z:0}},paths:{}},{instant:true});w.setState({parts:{a:""},labels:{}});const f=w.frame();w.setCamera({t:f.t,dist:f.dist*.5,az:42,el:30,sx:.5,sy:.4},{instant:true});
   await frames(4);store.set(t+":"+kind,crop(canvas));subs.forEach(s=>s())}
  catch(e){console.warn("thumbnail",kind,e)}finally{try{w?.destroy()}catch{}canvas.remove()}}
 })().finally(()=>{building=null});return building}
let kindOf=null;
/** the picture cropped to what is drawn (the model is small and low in the frame), then centred in a square */
function crop(src){const w=src.width,h=src.height,c=src.getContext?null:null;const t=document.createElement("canvas");t.width=w;t.height=h;const x=t.getContext("2d");x.drawImage(src,0,0);
 const d=x.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let i=0;i<w;i++)if(d[(y*w+i)*4+3]>12){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<=x0||y1<=y0)return src.toDataURL("image/png");const bw=x1-x0+1,bh=y1-y0+1,side=Math.max(bw,bh)*1.12,o=document.createElement("canvas");o.width=o.height=176;const q=o.getContext("2d");q.imageSmoothingQuality="high";
 const k=176/side;q.drawImage(t,x0,y0,bw,bh,(176-bw*k)/2,(176-bh*k)/2,bw*k,bh*k);return o.toDataURL("image/png")}
export function useThumb(type){const[,tick]=useState(0);
 useEffect(()=>{if(!host())return;const f=()=>tick(x=>x+1);subs.add(f);
  import(/* @vite-ignore */BASE+"replay3d.js").then(m=>{kindOf=m.kindOf;f()}).catch(()=>{});build();
  const mo=new MutationObserver(()=>{build().then(()=>f())});mo.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  return()=>{subs.delete(f);mo.disconnect()}},[]);// eslint-disable-line
 return kindOf?store.get(theme()+":"+kindOf(type)):undefined}
/** a part's picture: its 3D thumbnail, or the line icon */
export function Thumb({kind,size=28}){const src=useThumb(kind);return src?<img className="lab-thumb" src={src} width={size} height={size} alt="" draggable={false}/>:<Glyph kind={kind}/>}
