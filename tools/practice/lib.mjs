// Helpers to write practice suites: designs, tests, calibration.
import fs from 'node:fs';
import {judge,runTest} from '../../frontend/src/judge/judge.js';
export const ROOT=new URL('../../content',import.meta.url).pathname;
export const lab=JSON.parse(fs.readFileSync(ROOT+'/lab.json','utf8'));
// design from a compact spec: nodes [[id,type,config]], edges "a>b,b>c"; laid out left to right by depth
export function D(nodes,edges){
  const E=edges.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{const[a,b]=s.split('>');return{from:a,to:b}});
  const depth={};const ids=nodes.map(n=>n[0]);ids.forEach(i=>depth[i]=0);
  for(let k=0;k<ids.length;k++)for(const e of E)depth[e.to]=Math.max(depth[e.to],depth[e.from]+1);
  const N=nodes.map(([id,type,config={}])=>({id,type,x:depth[id]*240,y:0,config}));
  const cnt={},seen={};N.forEach(n=>cnt[n.x]=(cnt[n.x]||0)+1);N.forEach(n=>{seen[n.x]=seen[n.x]||0;n.y=(seen[n.x]++-(cnt[n.x]-1)/2)*150});
  return{nodes:N,edges:E};
}
export const A=(min,label)=>({kind:'availability',min,label:label||`At least ${min}% of requests succeed`});
export const P99=(max,label)=>({kind:'p99',max,label:label||`p99 latency at most ${max} ms`});
export const COST=(max,label)=>({kind:'cost',max,label:label||`Costs at most $${max.toLocaleString('en-US')} a month`});
export const NOCRASH=(type,label)=>({kind:'noCrash',...(type?{type}:{}),label:label||'Nothing crashes from overload'});
export const REQ=(types,label)=>({kind:'requires',types,label});
export const RED=(type,label)=>({kind:'redundant',type,label});
export const MAZ=(label)=>({kind:'multiAz',label:label||'Every database has a standby in another zone (Multi-AZ)'});
export const HAS=(type,label)=>({kind:'has',type,label});
export const NOLOST=(label)=>({kind:'noLostWrites',label:label||'No acknowledged write is lost'});
export function calibrate(slug,practice,{verbose=true}={}){
  const out=[];const ref=judge(practice.reference,lab,practice);
  out.push(`${slug}: reference ${ref.verdict} ${ref.passed}/${ref.total}`);
  for(const r of ref.results)out.push(`   ${r.ok?'ok':'XX'} ${r.id} avail=${r.metrics?.availability.toFixed(3)} p99=${r.metrics?.p99.toFixed(0)} cost=${r.metrics?.avgMonthly.toFixed(0)} ${r.error||''} ${r.ok?'':r.why.join(' ')}`);
  let ok=ref.verdict==='accepted';
  for(const w of practice.wrong){const t=practice.tests.find(x=>x.id===w.fails);const r=runTest(w,lab,practice,t);if(r.ok)ok=false;out.push(`   wrong "${w.name}" on ${w.fails}: ${r.ok?'PASSED (bad)':'fails ok'} | ${r.ok?'':(r.why[0]||r.error)}`)}
  const st=judge(practice.start,lab,practice);if(st.verdict==='accepted')ok=false;out.push(`   start ${st.verdict} ${st.passed}/${st.total}`);
  if(verbose)console.log(out.join('\n'));return ok;
}
export function write(slug,practice){
  const f=`${ROOT}/articles/interview-questions/${slug}.json`;const a=JSON.parse(fs.readFileSync(f,'utf8'));a.practice=practice;
  fs.writeFileSync(f,JSON.stringify(a,null,2)+'\n');
}
