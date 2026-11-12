// Motion settings shared by every animated part. Figures animate with SMIL on a loop: LOOP is the default length
// of one loop (figures with more steps pass their own). useStill() is true when the visitor asked for reduced
// motion (including a change while the page is open): figures then draw their still version.
import{useEffect,useState}from"react";
export const LOOP="8s";
const Q="(prefers-reduced-motion: reduce)";
const query=()=>typeof window!=="undefined"&&typeof window.matchMedia==="function"?window.matchMedia(Q):null;
export function useStill(){const[still,setStill]=useState(()=>!!query()?.matches);
useEffect(()=>{const q=query();if(!q)return;const on=()=>setStill(q.matches);q.addEventListener("change",on);return()=>q.removeEventListener("change",on)},[]);return still}
