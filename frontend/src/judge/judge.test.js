// Judge tests, and the calibration of every problem in content/: the reference design passes every
// test, each wrong design fails the test it names, and the starting design passes no non-sample test.
import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";import{fileURLToPath}from"node:url";
import{judge,runTest,gradeAnswer,score}from"./judge.js";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","..","..","content");
const lab=JSON.parse(fs.readFileSync(path.join(root,"lab.json"),"utf8"));
const index=JSON.parse(fs.readFileSync(path.join(root,"articles","index.json"),"utf8")).articles;
const problems=index.map(e=>JSON.parse(fs.readFileSync(path.join(root,"articles",e+".json"),"utf8"))).filter(a=>a.practice);

test("every Interview Question has practice tests",()=>{
  const qs=index.filter(e=>e.startsWith("interview-questions/")&&!e.endsWith("/how-to-answer"));
  assert.equal(problems.length,qs.length,`missing practice: ${qs.filter(e=>!problems.some(a=>e.endsWith("/"+a.slug))).join(", ")}`);
});
for(const a of problems){
  test(`${a.slug}: the reference design passes every test`,()=>{
    const r=judge(a.practice.reference,lab,a.practice);
    assert.equal(r.verdict,"accepted",r.results.filter(x=>!x.ok).map(x=>`${x.id}: ${x.error||x.why.join(" ")}`).join(" | "));
  });
  for(const w of a.practice.wrong)test(`${a.slug}: wrong design "${w.name}" fails ${w.fails}`,()=>{
    const t=a.practice.tests.find(x=>x.id===w.fails);const r=runTest(w,lab,a.practice,t);
    assert.equal(r.ok,false,`${w.name} passed ${w.fails}`);
  });
  test(`${a.slug}: the starting design is not accepted`,()=>{assert.notEqual(judge(a.practice.start,lab,a.practice).verdict,"accepted")});
  test(`${a.slug}: the reference's own answers grade fully`,()=>{
    const r=a.practice.rubric;const g=gradeAnswer({fr:r.fr.map(x=>x.keys[0]).join(". "),nfr:Object.fromEntries(Object.entries(r.nfr||{}).map(([k,v])=>[k,Array.isArray(v)?String(v[0]):v])),est:Object.fromEntries(r.est.map(x=>[x.id,String(x.answer)])),api:[]},r);
    assert.equal(g.parts.fr,1);assert.equal(g.parts.est,1);if(Object.keys(r.nfr||{}).length)assert.equal(g.parts.nfr,1);
  });
}

test("gradeAnswer: keywords, ranges, tolerance and API paths",()=>{
  const rubric={fr:[{label:"Shorten",keys:["short"]},{label:"Expiry",keys:["expir"]}],nfr:{availability:[99.9,99.999],consistency:"eventual"},est:[{id:"rps",label:"Peak reads",unit:"req/s",answer:30000,tol:3}],api:[{label:"Create",method:"POST",path:"^/(api/)?(v1/)?(urls|links)/?$"},{label:"Redirect",method:"GET",path:"^/\\{?[a-z_]*\\}?$|^/:[a-z_]+$"}]};
  const g=gradeAnswer({fr:"Make a SHORT link for any URL",nfr:{availability:"99.95",consistency:"strong"},est:{rps:"12,000"},api:[{method:"POST",path:"/v1/urls"},{method:"GET",path:"/{code}"}]},rubric);
  assert.deepEqual(g.fr.map(x=>x.ok),[true,false]);assert.deepEqual(g.nfr.map(x=>x.ok),[true,false]);assert.equal(g.est[0].ok,true);assert.deepEqual(g.api.map(x=>x.ok),[true,true]);
  assert.equal(gradeAnswer({est:{rps:"5000"}},rubric).est[0].ok,false);
  assert.equal(gradeAnswer({api:[{method:"POST",path:"/follows"}]},{api:[{label:"Follow",method:"PUT|POST",path:"^/follow"}]}).api[0].ok,true);
  assert.equal(gradeAnswer({},rubric).parts.api,0);
});
test("score: weights add to 100, hints cost 3 each up to 15",()=>{
  const full={parts:{fr:1,nfr:1,est:1,api:1}};
  assert.equal(score(full,{passed:5,total:5}).total,100);assert.equal(score(full,{passed:5,total:5},2).total,94);assert.equal(score(full,{passed:5,total:5},9).total,85);
  assert.equal(score(null,{passed:0,total:5}).total,0);
});
test("runTest explains a design without Clients instead of failing silently",()=>{
  const r=runTest({nodes:[],edges:[]},lab,{fixed:{}},{id:"x",hours:1,startHour:0,traffic:{rps:100,pattern:"steady"},checks:[{kind:"availability",min:99}]});
  assert.equal(r.ok,false);assert.match(r.error,/Clients/);
});
test("singlePoints: one group behind a load balancer is a single point of failure; two side by side are not",async()=>{
  const{singlePoints}=await import("./judge.js");
  const one={nodes:[{id:"c",type:"client"},{id:"lb",type:"lb"},{id:"a",type:"server"},{id:"q",type:"queue"},{id:"w1",type:"server"},{id:"w2",type:"server"},{id:"d",type:"database"}],edges:[["c","lb"],["lb","a"],["a","q"],["q","w1"],["q","w2"],["w1","d"],["w2","d"]].map(([from,to])=>({from,to}))};
  assert.deepEqual(singlePoints(one,"server"),["a"]);
  const two={nodes:[...one.nodes,{id:"b",type:"server"}],edges:[...one.edges,{from:"lb",to:"b"},{from:"b",to:"q"}]};
  assert.deepEqual(singlePoints(two,"server"),[]);
});
