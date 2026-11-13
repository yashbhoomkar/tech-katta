// Motion settings shared by every animated part. Figures animate with SMIL on a loop: LOOP is the default length
// of one loop (figures with more steps pass their own). useStill() is true when the visitor asked for reduced
// motion (including a change while the page is open): figures then draw their still version.
import{useEffect,useState}from"react";import{flushSync}from"react-dom";
// SPEED: every figure loop runs at this fraction of the length written in its figure file (owner, 2026-11-12:
// "every animation is a bit slow"). Figures write loop lengths as pace(14), so this one number speeds up or slows down
// all of them, the steps and dots inside them staying in step.
export const SPEED=.7;
export const pace=s=>`${+(s*SPEED).toFixed(2)}s`;
export const LOOP=pace(8);
const Q="(prefers-reduced-motion: reduce)";
const query=()=>typeof window!=="undefined"&&typeof window.matchMedia==="function"?window.matchMedia(Q):null;
export function useStill(){const[still,setStill]=useState(()=>!!query()?.matches);
useEffect(()=>{const q=query();if(!q)return;const on=()=>setStill(q.matches);q.addEventListener("change",on);return()=>q.removeEventListener("change",on)},[]);return still}
// A change of page or theme cross-fades where the browser has view transitions (Chrome, Edge, Safari 18; others just
// change). `update` must change the DOM: flushSync makes React draw it inside the transition, so the new view is
// captured complete. Nothing fades under reduced motion. tech-katta-context 24, A2 and A10. The lengths are in
// motion.css (::view-transition-*). `kind` marks <html data-vt> while it runs, so a kind can have its own length.
export function viewChange(update,kind="page"){const d=typeof document!=="undefined"?document:null;
if(!d?.startViewTransition||!!query()?.matches||d.visibilityState==="hidden"){update();return}
try{d.documentElement.dataset.vt=kind;const vt=d.startViewTransition(()=>flushSync(update));vt.finished.finally(()=>{if(d.documentElement.dataset.vt===kind)delete d.documentElement.dataset.vt})}catch{update()}}
