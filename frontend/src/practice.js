// What this browser keeps about the problems a visitor works on (solve.jsx): the written answer, how
// many hints were opened, and the submissions (newest first, at most 30). Small and dependency-free so
// the Problems tables can read it without loading the judge.
export const read=(k)=>{try{const v=JSON.parse(localStorage.getItem(k));return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}catch{return{}}};
export const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
export const ANSWERS="tk-answers-v1",HINTS="tk-hints-v1",SUBS="tk-subs-v1";
const ok1=x=>x&&typeof x==="object";
export const readSubs=slug=>{const l=read(SUBS)[slug];return Array.isArray(l)?l.filter(x=>ok1(x)&&typeof x.at==="number"&&typeof x.score==="number"):[]};
export const bestScore=slug=>{const l=readSubs(slug);return l.length?Math.max(...l.map(x=>x.score)):null};
export const usedHints=slug=>{const n=read(HINTS)[slug];return Number.isInteger(n)&&n>=0?n:0};
