// Usage events for analysis, sent to our own API (/v1/events; the server keeps only known events and
// fields, see backend/src/auth/events.js). No cookies are added: a visitor is a random id kept in this
// browser's storage; when signed in, the API adds the account from the existing session. Events wait in
// a small queue and go out every few seconds, and when the page is hidden or closed. Browsers asking not
// to be tracked (Global Privacy Control or Do Not Track) send nothing; nor do automated browsers.
import{API}from"./api.js";

const KEY="tk-visitor",FLUSH_MS=5000,MAX_QUEUE=50;
// automated browsers (navigator.webdriver: test scripts, crawlers that admit it) are not visitors
const off=()=>{try{return navigator.globalPrivacyControl===true||navigator.doNotTrack==="1"||navigator.webdriver===true}catch{return false}};
let visitorId=null;
export function visitor(){if(visitorId)return visitorId;let v=null;try{v=localStorage.getItem(KEY)}catch{}
if(!v||!/^[a-z0-9]{16,40}$/.test(v)){v=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>(b%36).toString(36)).join("");try{localStorage.setItem(KEY,v)}catch{}}return visitorId=v}
const device=()=>typeof innerWidth==="number"&&innerWidth<900?"phone":"desktop";
const page=()=>location.pathname+location.hash;

let queue=[],timer=0,wired=false;
function send(useBeacon){if(!queue.length)return;const now=Date.now();
const body=JSON.stringify({visitor:visitor(),device:device(),events:queue.splice(0,MAX_QUEUE).map(({at,...e})=>({...e,age:now-at}))});
// text/plain keeps it a simple request (no preflight); the API reads the JSON either way
if(useBeacon&&navigator.sendBeacon&&navigator.sendBeacon(API+"/v1/events",new Blob([body],{type:"text/plain"})))return;
fetch(API+"/v1/events",{method:"POST",credentials:"include",keepalive:true,headers:{"Content-Type":"text/plain"},body}).catch(()=>{})}
function wire(){if(wired)return;wired=true;const out=()=>{clearTimeout(timer);timer=0;send(true)};
addEventListener("pagehide",out);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")out()})}

// Record one event. props: only the fields the API knows for that event are kept.
export function track(name,props={}){if(off())return;try{wire();queue.push({name,at:Date.now(),page:page(),props});if(queue.length>=MAX_QUEUE)send(false);else if(!timer)timer=setTimeout(()=>{timer=0;send(false)},FLUSH_MS)}catch{}}

// Where a visitor came from: another site's domain, or "" (direct, or within this site).
export function referrer(){try{const h=document.referrer&&new URL(document.referrer).hostname;return h&&h!==location.hostname?h.replace(/^www\./,"").slice(0,80):""}catch{return""}}

// An open article: "article_open" now, "article_finish" the first time ~90% has been seen,
// "article_close" (how far, how long) when it is left or the page goes away. Returns the cleanup.
export function readArticle(section,slug){const t0=Date.now();let max=0,finished=false,closed=false;const secs=()=>Math.round((Date.now()-t0)/1000);
track("article_open",{section,slug});
const seen=()=>{const d=document.documentElement;const pct=Math.min(1,(scrollY+innerHeight)/Math.max(d.scrollHeight,1));if(pct>max)max=pct;if(!finished&&max>=.9&&secs()>=5){finished=true;track("article_finish",{section,slug,seconds:secs()})}};
const close=()=>{if(closed)return;closed=true;track("article_close",{section,slug,pct:Math.round(max*100),seconds:secs()})};
const hide=()=>{if(document.visibilityState==="hidden"){close();send(true)}};
addEventListener("scroll",seen,{passive:true});addEventListener("pagehide",close);document.addEventListener("visibilitychange",hide);const t=setTimeout(seen,1500);
return()=>{clearTimeout(t);removeEventListener("scroll",seen);removeEventListener("pagehide",close);document.removeEventListener("visibilitychange",hide);close()}}
