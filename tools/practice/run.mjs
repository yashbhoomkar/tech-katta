// node run.mjs <batch file> [write]: builds each spec's practice, calibrates, writes when every one passes.
import {D,calibrate,write,lab} from './lib.mjs';
import {suite,build,wrongs,nice} from './arch.mjs';
import {runTest} from '../../frontend/src/judge/judge.js';
const file=process.argv[2],doWrite=process.argv[3]==='write',only=process.argv[4];
const specs=(await import('./'+file)).default;
let all=true;
for(const sp of specs){
  if(only&&sp.slug!==only)continue;
  const o={...sp.o};const ref=sp.reference||build(o);
  // budget: 1.6 × what the reference costs on a normal day, rounded up to a round number
  const probe={fixed:o.fixed||{},tests:[]};
  const day=runTest(ref,lab,probe,{id:'x',hours:24,startHour:0,traffic:{rps:o.normal,pattern:'steady'},checks:[{kind:'cost',max:1e9,label:'x'}]});
  o.cost=sp.o.cost||nice(day.metrics.avgMonthly*1.6);
  const tests=suite(o,sp.words);
  const start=sp.start||(sp.easy?D([['clients','client',{rps:o.peak,pattern:'steady'}],['lb','lb',{}],['app','server',{size:'m5.large',count:2,queriesPerRequest:o.fixed?.queriesPerRequest||1}]],'clients>lb,lb>app'):D([['clients','client',{rps:o.peak,pattern:'steady'}]],''));
  const practice={brief:sp.brief,fixed:o.fixed||{},start,tests,rubric:sp.rubric,hints:sp.hints,reference:ref,wrong:[...wrongs(o,ref),...(sp.moreWrong||[])].filter(w=>!(sp.skipWrong||[]).includes(w.name))};
  const ok=calibrate(sp.slug,practice);
  if(!ok)all=false;
  if(ok&&doWrite){write(sp.slug,practice);console.log('   written')}
}
console.log(all?'ALL OK':'SOME FAILED');
