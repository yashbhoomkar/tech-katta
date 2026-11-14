// Checks while you build (checks.js): no check on any reference design, the compiler's own messages on a start,
// and the three structural checks.
import test from"node:test";import assert from"node:assert/strict";import{readFileSync,readdirSync}from"node:fs";import{join}from"node:path";
import{designChecks}from"./checks.js";
const root=new URL("../../../content/",import.meta.url).pathname;
const lab=JSON.parse(readFileSync(root+"lab.json"));lab.eval=JSON.parse(readFileSync(root+"eval.json"));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const problems=walk(root+"articles").filter(f=>f.endsWith(".json")).map(f=>JSON.parse(readFileSync(f)).practice).filter(p=>p?.v===2&&p.reference);

test("no reference design is flagged",()=>{assert.ok(problems.length>=20);for(const P of problems)assert.deepEqual(designChecks(P.reference,lab,P),[])});
test("a start that can't run says why, in the compiler's words",()=>{const P=problems[0];const c=designChecks({nodes:[{id:"c",type:"client",x:0,y:0,config:{}},{id:"s",type:"server",x:240,y:0,config:{}}],edges:[{from:"c",to:"s"}]},lab,P);
  assert.ok(c.length&&c.every(x=>x.level==="error"));assert.ok(c.some(x=>/database/i.test(x.message)))});
test("unconnected, unreachable and unread parts are warned about, with the card",()=>{const P=problems[0],d=structuredClone(P.reference);
  d.nodes.push({id:"lone",type:"cache",x:0,y:900,config:{}},{id:"q",type:"queue",x:0,y:1100,config:{}},{id:"w",type:"server",x:300,y:1100,config:{}});d.edges.push({from:"w",to:"q"});
  const c=designChecks(d,lab,P),by=Object.fromEntries(c.filter(x=>x.node).map(x=>[x.node,x.message]));
  assert.match(by.lone,/isn't connected/);assert.match(by.w,/Nothing reaches/);assert.ok(c.every(x=>x.level==="warn"||x.level==="error"))});
test("nothing for v1, empty or unknown input",()=>{assert.deepEqual(designChecks({nodes:[]},lab,problems[0]),[]);assert.deepEqual(designChecks(problems[0].reference,lab,{v:1}),[]);assert.deepEqual(designChecks(null,lab,problems[0]),[])});
