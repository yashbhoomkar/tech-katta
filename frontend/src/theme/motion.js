// Motion settings shared by every animated part. Figures animate with SMIL on a loop: LOOP is the default length
// of one loop (figures with more steps pass their own). useStill() is true when the visitor asked for reduced
// motion (including a change while the page is open): figures then draw their still version.
import{useEffect,useState}from"react";
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
