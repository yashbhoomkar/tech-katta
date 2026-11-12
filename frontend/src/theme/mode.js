// Light or dark. The visitor's choice is kept in this browser (tk-theme: "light" or "dark"); without one the page
// follows the device's setting, including changes while it is open. public/theme-boot.js sets <html data-theme>
// before anything draws (no white flash); this module keeps it up to date and lets React redraw what reads
// colours in code (figures, the canvas) through useTheme().
import{useSyncExternalStore}from"react";import{readTokens}from"./palette.js";
const KEY="tk-theme",Q="(prefers-color-scheme: dark)";
const subs=new Set();
const stored=()=>{try{const v=localStorage.getItem(KEY);return v==="light"||v==="dark"?v:null}catch{return null}};
const system=()=>typeof matchMedia==="function"&&matchMedia(Q).matches?"dark":"light";
export const current=()=>typeof document!=="undefined"&&document.documentElement.dataset.theme==="dark"?"dark":"light";
function apply(t){if(typeof document==="undefined")return;const el=document.documentElement;if(el.dataset.theme!==t)el.dataset.theme=t;
  const meta=document.querySelector('meta[name="theme-color"]');readTokens(el);if(meta)meta.content=getComputedStyle(el).getPropertyValue("--bg").trim()||meta.content;
  subs.forEach(f=>f())}
// Set the theme ("light" or "dark") and remember it; null forgets the choice and follows the device again.
export function setTheme(t){try{t?localStorage.setItem(KEY,t):localStorage.removeItem(KEY)}catch{}apply(t||system())}
export const toggleTheme=()=>setTheme(current()==="dark"?"light":"dark");
// Once per page, at start: apply the theme (theme-boot.js may have run already) and follow the device setting.
let started=false;
export function startTheme(){if(started||typeof window==="undefined")return;started=true;apply(stored()||system());
  if(typeof matchMedia==="function")matchMedia(Q).addEventListener?.("change",()=>{if(!stored())apply(system())})}
const subscribe=f=>{subs.add(f);return()=>subs.delete(f)};
// "light" or "dark"; a component that calls it redraws when the theme changes.
export const useTheme=()=>useSyncExternalStore(subscribe,current,()=>"light");
