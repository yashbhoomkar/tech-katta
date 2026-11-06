// Archetypes: a problem's numbers and words → tests, reference design, wrong designs.
import {D,A,P99,COST,NOCRASH,REQ,RED,MAZ,HAS,NOLOST} from './lib.mjs';
const SRV={size:'c5.2xlarge',rps:2500};
const ceil=Math.ceil;
const dbSizes=[['db.t3.medium',800],['db.m5.large',2500],['db.m5.xlarge',5000],['db.r5.2xlarge',12000]];
// smallest database size that keeps `load` under `util`; several databases (shards) past the biggest
export function dbFor(load,util=0.6){for(const[s,q]of dbSizes)if(load<=q*util)return{size:s,n:1};return{size:'db.r5.2xlarge',n:ceil(load/(12000*util))}}
const missShare=(f)=>{const w=(f.writePct??0)/100,h=(f.hitPct??0)/100;return w+(1-w)*(1-h)};
export const t=(id,name,desc,hours,startHour,rps,pattern,checks,o={})=>({id,name,...(o.sample?{sample:true}:{}),desc,hours,startHour,traffic:{rps,pattern},...(o.chaos?{chaos:o.chaos}:{}),checks});
const nice=(x)=>{const m=10**Math.floor(Math.log10(x));return Math.ceil(x/m*2)/2*m};

// ---- a reference built from parts ----
// o: {rps (peak to size for), spike, qpr, fixed, cache:true|false, cdn: hitPct|null, apigw:false, async:{workers rps}, dbUtil}
export function build(o,over={}){
  const f=o.fixed||{},qpr=f.queriesPerRequest||1;const front=o.cdn?o.peak*(1-(f.cdnHitPct??o.cdn)/100):o.peak;const frontSpike=o.cdn?(o.spike||o.peak)*(1-(f.cdnHitPct??o.cdn)/100):(o.spike||o.peak);
  const groupCap=Math.max(front*(o.groupShare??1.05),frontSpike/2*1.1);
  const count=over.count??Math.min(50,ceil(groupCap/SRV.rps));const groups=over.groups??2;
  const nodes=[['clients','client',{rps:o.peak,pattern:'steady'}]];let edges=[];let prev=['clients'];
  if(o.cdn&&over.cdn!==false){nodes.push(['cdn','cdn',{hitPct:f.cdnHitPct??o.cdn}]);edges.push('clients>cdn');prev=['cdn']}
  // one load balancer takes 1 lakh a second: more side by side past that
  const nlb=Math.max(1,ceil(Math.max(front,frontSpike)/80000));const lbs=[];for(let k=1;k<=nlb;k++){const id=nlb>1?'lb'+k:'lb';lbs.push(id);nodes.push([id,'lb',{}]);edges.push(...prev.map(p=>p+'>'+id))}
  const app=[];for(let g=1;g<=groups;g++){app.push('app'+g);nodes.push(['app'+g,'server',{size:SRV.size,count,queriesPerRequest:qpr}]);edges.push(...lbs.map(l=>l+'>app'+g))}
  let tail=app;
  let wcap=0;
  if(o.async&&over.queue!==false){const nq=Math.max(1,ceil(Math.max(front,frontSpike)/80000));const qs=[];for(let k=1;k<=nq;k++){const id=nq>1?'queue'+k:'queue';qs.push(id);nodes.push([id,'queue',{}]);edges.push(...app.map(a=>a+'>'+id))}
    // workers: two groups, together just over the target rate; small pools use smaller machines
    const sizes=[['m5.large',600],['m5.xlarge',1200],['c5.2xlarge',2500]];const need=o.async*1.1/2;let ws0=sizes.find(([,r])=>r>=need/4)||sizes[2];if(need>2500*4)ws0=sizes[2];
    const wc=over.workers??Math.min(50,Math.max(1,ceil(need/ws0[1])));wcap=2*wc*ws0[1];
    const ws=[];for(let g=1;g<=2;g++){ws.push('work'+g);nodes.push(['work'+g,'server',{size:ws0[0],count:wc,queriesPerRequest:qpr}]);edges.push(...qs.map(q=>q+'>work'+g))}tail=ws}
  const dbRate=(o.async&&over.queue!==false?wcap:Math.max(front,frontSpike))*qpr;
  let dbLoad=dbRate;
  if(o.cache&&over.cache!==false){const nc=over.caches??Math.max(2,ceil(dbRate/(50000*0.6)));const cs=[];for(let c=1;c<=nc;c++){cs.push('cache'+c);nodes.push(['cache'+c,'cache',{size:'cache.m5.large',...(f.hitPct!==undefined?{hitPct:f.hitPct}:{}),...(f.writePct!==undefined?{writePct:f.writePct}:{}),onDown:'database',...(over.writeBack?{writePolicy:'back'}:{})}])}
    for(const a of tail)for(const c of cs)edges.push(a+'>'+c);tail=cs;dbLoad=dbRate*missShare(f)}
  const db=over.db||dbFor(dbLoad,o.dbUtil??0.6);const dbs=[];for(let k=1;k<=db.n;k++){dbs.push('db'+k);nodes.push(['db'+k,'database',{size:db.size,multiAz:over.multiAz??true}])}
  for(const a of tail)for(const d of dbs)edges.push(a+'>'+d);
  return D(nodes,edges.join(','));
}

// ---- the suite ----
// w: words {unit ("redirects"), normal:{name,desc,hour}, peak:{name,desc,hour}, spike:{name,desc,start,hours,pattern}}
export function suite(o,w){
  const u=w.unit||'requests',av=o.avail??99.9,p99=o.p99??300;
  const tests=[
    t('normal',w.normal.name,w.normal.desc,1,w.normal.hour??15,o.normal,'steady',[A(av,`At least ${av}% of ${u} succeed`),P99(p99,`p99 under ${p99} ms`)],{sample:true}),
    t('peak',w.peak.name,w.peak.desc,1,w.peak.hour??20,o.peak,'steady',[A(av,`At least ${av}% of ${u} succeed`),P99(p99,`p99 under ${p99} ms`),NOCRASH(),...(o.structure||[])],{sample:true}),
  ];
  if(o.spike)tests.push(t('spike',w.spike.name,w.spike.desc,w.spike.hours??3,w.spike.start??19,o.spike,w.spike.pattern??'sale',[A(av,`At least ${av}% of ${u} succeed`),NOCRASH(),...(o.spikeChecks||[])]));
  if(o.extra)tests.push(...o.extra);
  tests.push(t('server-dies','A server group dies',`At the peak (${o.peak.toLocaleString('en-US')} a second) the busiest group of servers crashes; it is back 5 minutes later.`,1,w.peak.hour??20,o.peak,'steady',[A(o.chaosAvail??99.5,`At least ${o.chaosAvail??99.5}% of ${u} still succeed`),RED('server','No server group that every request depends on (no single point of failure)')],{chaos:[{minute:10,type:'server'}]}));
  tests.push(t('db-failover','The database fails',`At the peak the busiest database crashes. With a standby in another zone it fails over in 2 minutes; without one it is down for 30.`,1,w.peak.hour??20,o.peak,'steady',[A(o.dbAvail??99.8,`At least ${o.dbAvail??99.8}% of ${u} still succeed`),MAZ()],{chaos:[{minute:10,type:'database'}]}));
  tests.push(t('budget','A sensible bill',`A whole day at the normal rate (${o.normal.toLocaleString('en-US')} a second). Paying for far more than the traffic needs fails, like a memory limit.`,24,0,o.normal,'steady',[A(av,`At least ${av}% of ${u} succeed`),COST(o.cost,`Costs at most $${o.cost.toLocaleString('en-US')} a month`)]));
  return tests;
}

// standard wrong designs for an archetype
export function wrongs(o,ref){
  const W=[];
  const fl=(x)=>({nodes:x.nodes,edges:x.edges});
  if(o.cache)W.push({name:'No cache',why:'Every read goes to the database, which can\'t take the peak.',fails:'peak',...fl(build(o,{cache:false,db:dbFor((o.cdn?o.peak*(1-(o.fixed?.cdnHitPct??o.cdn)/100):o.peak)*(o.fixed?.queriesPerRequest||1)*missShare(o.fixed||{}),0.6)}))});
  W.push({name:'One server group',why:'When it crashes, nothing answers for 5 minutes.',fails:'server-dies',...fl(build(o,{groups:1}))});
  W.push({name:'Single-zone database',why:'A crash keeps it down for 30 minutes.',fails:'db-failover',...fl(build(o,{multiAz:false}))});
  if(o.async)W.push({name:'No queue',why:'The burst hits the database directly and crashes it.',fails:'spike',...fl(build(o,{queue:false,db:dbFor((o.async||o.peak)*(o.fixed?.queriesPerRequest||1)*(o.cache?missShare(o.fixed||{}):1),0.6)}))});
  W.push({name:'Biggest everything',why:'Passes the load but costs far more than the traffic needs.',fails:'budget',...fl(build(o,{count:50,groups:3,...(o.async?{workers:50}:{})}))});
  return W;
}
export {nice};
