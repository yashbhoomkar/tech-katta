// The AWS credit ledger (owner: "replenish it for every run/submit/ask the interviewer"): every Run, Submit and Ask
// the interviewer starts with a fresh $200,000 of virtual credit, spent test by test at the design's real cost (the
// simulator's per-tick `timeline.spend`, eval/simulate.js). Pure; the meter is credit.jsx.
export const CREDIT=200000;
const sum=a=>(a||[]).reduce((x,y)=>x+y,0);
// Dollars a test spent: its timeline's spend; a test without one (a request trace) costs nothing.
export const spentBy=r=>sum(r?.timeline?.spend);
// → {start, end, spent, before: {testId: balance when it began}, peakPerHour}
export function ledger(results){let left=CREDIT,peak=0;const before={};
for(const r of results||[]){before[r.id]=left;left-=spentBy(r);const tl=r.timeline;if(tl?.spend?.length)peak=Math.max(peak,...tl.spend.map(s=>s*60/tl.tickMinutes))}
return{start:CREDIT,end:Math.max(0,left),spent:CREDIT-Math.max(0,left),before,peakPerHour:peak}}
export const money=(n,cents=true)=>"$"+(cents?n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):Math.round(n).toLocaleString("en-US"));
// How long the credit lasts at a rate in dollars per hour, in words.
export const lasts=perHour=>{if(!(perHour>0))return"";const h=CREDIT/perHour;return h<48?`${Math.round(h)} hours`:h<24*60?`${Math.round(h/24)} days`:h<24*365*2?`${Math.round(h/730)} months`:`${(h/8760).toFixed(1)} years`};

