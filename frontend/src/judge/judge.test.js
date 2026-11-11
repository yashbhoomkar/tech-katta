// Judge tests: the written steps (rubric), the score and copied solutions. Every problem's calibration is
// in eval/calibration.test.js.
import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";import{fileURLToPath}from"node:url";
import{gradeAnswer,score,WEIGHTS,sameDesign}from"./judge.js";import{cleanDesign}from"../lab/store.js";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","..","..","content");
const lab={...JSON.parse(fs.readFileSync(path.join(root,"lab.json"),"utf8")),eval:JSON.parse(fs.readFileSync(path.join(root,"eval.json"),"utf8"))};
const index=JSON.parse(fs.readFileSync(path.join(root,"articles","index.json"),"utf8")).articles;
const problems=index.map(e=>JSON.parse(fs.readFileSync(path.join(root,"articles",e+".json"),"utf8"))).filter(a=>a.practice);

test("every Interview Question has practice tests, judged by v2",()=>{
  // the guides in Start here are articles, not problems
  const qs=index.filter(e=>e.startsWith("interview-questions/")&&JSON.parse(fs.readFileSync(path.join(root,"articles",e+".json"),"utf8")).group!=="start");
  assert.equal(problems.length,qs.length,`missing practice: ${qs.filter(e=>!problems.some(a=>e.endsWith("/"+a.slug))).join(", ")}`);
  assert.deepEqual(problems.filter(a=>a.practice.v!==2).map(a=>a.slug),[]);
});
// the reference, the starting design and the wrong designs are checked in eval/calibration.test.js
for(const a of problems)test(`${a.slug}: the reference's own answers grade fully`,()=>{
  const r=a.practice.rubric;const g=gradeAnswer({fr:r.fr.map(x=>x.keys[0]).join(". "),nfr:Object.fromEntries(Object.entries(r.nfr||{}).map(([k,v])=>[k,Array.isArray(v)?String(v[0]):v])),est:Object.fromEntries(r.est.map(x=>[x.id,String(x.answer)])),api:[],decisions:Object.fromEntries(r.decisions.map(x=>[x.id,x.answer]))},r);
  assert.equal(g.parts.fr,1);assert.equal(g.parts.est,1);assert.equal(g.parts.dec,1);if(Object.keys(r.nfr||{}).length)assert.equal(g.parts.nfr,1);
});
test("gradeAnswer: keywords, ranges, tolerance and API paths",()=>{
  const rubric={fr:[{label:"Shorten",keys:["short"]},{label:"Expiry",keys:["expir"]}],nfr:{availability:[99.9,99.999],consistency:"eventual"},est:[{id:"rps",label:"Peak reads",unit:"req/s",answer:30000,tol:3}],api:[{label:"Create",method:"POST",path:"^/(api/)?(v1/)?(urls|links)/?$"},{label:"Redirect",method:"GET",path:"^/\\{?[a-z_]*\\}?$|^/:[a-z_]+$"}]};
  const g=gradeAnswer({fr:"Make a SHORT link for any URL",nfr:{availability:"99.95",consistency:"strong"},est:{rps:"12,000"},api:[{method:"POST",path:"/v1/urls"},{method:"GET",path:"/{code}"}]},rubric);
  assert.deepEqual(g.fr.map(x=>x.ok),[true,false]);assert.deepEqual(g.nfr.map(x=>x.ok),[true,false]);assert.equal(g.est[0].ok,true);assert.deepEqual(g.api.map(x=>x.ok),[true,true]);
  assert.equal(gradeAnswer({est:{rps:"5000"}},rubric).est[0].ok,false);
  assert.equal(gradeAnswer({api:[{method:"POST",path:"/follows"}]},{api:[{label:"Follow",method:"PUT|POST",path:"^/follow"}]}).api[0].ok,true);
  assert.equal(gradeAnswer({},rubric).parts.api,0);
});
test("score: weights add to 100, hints cost 3 each up to 15",()=>{
  const full={parts:{fr:1,nfr:1,est:1,api:1,dec:1}};assert.equal(Object.values(WEIGHTS).reduce((x,y)=>x+y,0),100);
  assert.equal(score(full,{passed:5,total:5}).total,100);assert.equal(score(full,{passed:5,total:5},2).total,94);assert.equal(score(full,{passed:5,total:5},9).total,85);
  assert.equal(score(null,{passed:0,total:5}).total,0);
});
test("gradeAnswer: key decisions are right only when the chosen option is the answer",()=>{
  const rubric={decisions:[{id:"a",q:"?",options:["x","y"],answer:1,why:"."},{id:"b",q:"?",options:["x","y","z"],answer:0,why:"."}]};
  const g=gradeAnswer({decisions:{a:1,b:2}},rubric);
  assert.deepEqual(g.dec.map(x=>x.ok),[true,false]);assert.equal(g.parts.dec,0.5);assert.equal(g.dec[1].chosen,2);
  assert.equal(gradeAnswer({},rubric).parts.dec,0);assert.equal(gradeAnswer({decisions:{a:"1"}},rubric).dec[0].ok,true);
});
test("sameDesign: the solution copied unchanged is the same design; moved or renamed still is; any real change isn't",()=>{
  for(const a of problems){const ref=cleanDesign(a.practice.reference,lab,"r");
    const moved={...ref,nodes:ref.nodes.map(n=>({...n,x:n.x+40,y:n.y-20,name:"Mine"}))};
    assert.ok(sameDesign(ref,cleanDesign(structuredClone(a.practice.reference),lab,"c")),a.slug);
    assert.ok(sameDesign(ref,moved),a.slug+" moved");
    const srv=ref.nodes.find(n=>n.type==="server");const changed={...ref,nodes:ref.nodes.map(n=>n===srv?{...n,config:{...n.config,count:(n.config.count||1)+1}}:n)};
    assert.ok(!sameDesign(ref,changed),a.slug+" changed");
    assert.ok(!sameDesign(ref,{...ref,edges:ref.edges.slice(1)}),a.slug+" an arrow less");
    assert.ok(!sameDesign(ref,cleanDesign(a.practice.start,lab,"s")),a.slug+" start");}
  assert.ok(!sameDesign(null,null));
});

test("key decisions don't give the answer away: it isn't by far the longest option, and right answers sit in every position",()=>{
  const at=[0,0,0];let n=0;
  for(const a of problems)for(const d of a.practice.rubric.decisions||[]){n++;at[Math.min(d.answer,2)]++;
    const L=d.options.map(o=>o.length),r=L[d.answer],others=Math.max(...L.filter((_,i)=>i!==d.answer));
    assert.ok(r<=others*1.15,`${a.slug} ${d.id}: the right answer (${r} characters) is much longer than every other option (${others})`);
    assert.ok(d.options.every(o=>o.length>=10),`${a.slug} ${d.id}: an option too short to be a real choice`);}
  for(const k of at)assert.ok(k>=n/6,`right answers bunch up in one position: ${at}`);
});

// The written requirements: each one is earned by its own label and by a second, plain phrasing of it
// (fr-paraphrases.json, in rubric order); a vague answer that names no requirement earns at most one;
// and a keyword has to start a word ("tie" isn't found in "cities").
const para=JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),"fr-paraphrases.json"),"utf8"));
const vague="Users can open the app and see their data, with live status, on time, at once, in order. It should be fast, reliable and scale. Support cities across India. Output the results to the user and store them together.";
for(const a of problems)test(`${a.slug}: each requirement is earned by its label and a paraphrase, not by a vague answer`,()=>{
  const fr=a.practice.rubric.fr,p=para[a.slug];
  assert.ok(p&&p.length===fr.length,`fr-paraphrases.json needs ${fr.length} phrasings for ${a.slug}`);
  fr.forEach((r,i)=>{for(const t of [r.label,p[i]]){const g=gradeAnswer({fr:t},a.practice.rubric);assert.ok(g.fr[i].ok,`"${t}" should earn "${r.label}"`)}});
  const v=gradeAnswer({fr:vague},a.practice.rubric).fr.filter(x=>x.ok);
  assert.ok(v.length<=1,`a vague answer earns ${v.map(x=>x.label).join(", ")}`);
});
test("a requirement keyword has to start a word",()=>{
  const rubric={fr:[{label:"Ties",keys:["tie"]}]};
  assert.equal(gradeAnswer({fr:"Support cities"},rubric).fr[0].ok,false);
  assert.equal(gradeAnswer({fr:"Break ties by time"},rubric).fr[0].ok,true);
});
