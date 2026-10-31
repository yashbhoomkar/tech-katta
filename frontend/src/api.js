// All site content comes from the API (backend/src/content). VITE_API_BASE points a local build at
// a local API (e.g. VITE_API_BASE=http://127.0.0.1:5000 npm run dev).
export const API=(import.meta.env.VITE_API_BASE||"https://tech-api.katta.cc").replace(/\/$/,"");
const cache=new Map();
// GET a JSON path once per page load; retries once on network errors and 5xx, gives up after 8 s.
export function getJSON(path,{timeout=8000,retries=1}={}){
if(cache.has(path))return cache.get(path);
const p=(async()=>{let err;for(let i=0;i<=retries;i++){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
try{const r=await fetch(API+path,{signal:ctl.signal});if(r.ok)return await r.json();err=Object.assign(new Error(`HTTP ${r.status}`),{status:r.status});if(r.status<500)break}
catch(e){err=e}finally{clearTimeout(t)}if(i<retries)await new Promise(res=>setTimeout(res,600))}
cache.delete(path);throw err})();
cache.set(path,p);return p}
