// Arrows' protocols and labels (protocols.js): the usual protocol for each pair of parts, what a saved arrow
// keeps, and that the judge's view of a design (shape, cleanDesign2) never sees them.
import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";
import{PROTOCOLS,PROTOCOL,inferProtocol,protocolOf,cleanLabel,cleanArrowLook,MAX_LABEL}from"./protocols.js";
import{cleanDesign,readStore}from"./store.js";import{sameDesign}from"../judge/judge.js";import{evalCatalogue}from"../eval/design.js";
const lab=JSON.parse(readFileSync(new URL("../../../content/lab.json",import.meta.url)));
lab.eval=JSON.parse(readFileSync(new URL("../../../content/eval.json",import.meta.url)));

test("every part pair gets a known protocol, and the usual ones are the expected ones",()=>{
  const types=Object.keys(evalCatalogue(lab));assert.ok(types.length>=15);
  for(const a of types)for(const b of types)assert.ok(PROTOCOL[inferProtocol(a,b)],`${a}→${b}`);
  const t=(a,b)=>PROTOCOL[inferProtocol(a,b)].name;
  assert.equal(t("client","lb"),"HTTPS");assert.equal(t("client","cdn"),"HTTPS");assert.equal(t("client","realtime"),"WebSocket");
  assert.equal(t("lb","server"),"REST");assert.equal(t("apigw","server"),"REST");assert.equal(t("server","server"),"gRPC");
  assert.equal(t("server","database"),"DB query");assert.equal(t("server","cache"),"Key lookup");assert.equal(t("database","queue"),"CDC");
  assert.equal(t("server","queue"),"Message");assert.equal(t("queue","server"),"Message");assert.equal(t("server","stream"),"Event");
  assert.equal(t("server","pubsub"),"Pub/Sub");assert.equal(t("server","external"),"HTTPS");assert.equal(t("external","server"),"Webhook");
});

test("a chosen protocol wins over the usual one; an unknown one falls back",()=>{
  assert.equal(protocolOf({protocol:"graphql"},"client","lb").id,"graphql");
  assert.equal(protocolOf({protocol:"carrier-pigeon"},"client","lb").id,"https");
  assert.equal(protocolOf(undefined,"server","database").id,"query");
  assert.equal(new Set(PROTOCOLS.map(p=>p.id)).size,PROTOCOLS.length);
});

test("labels are printable, collapsed and short; bad protocols and empty labels are dropped",()=>{
  assert.equal(cleanLabel("  GET\n /{code}\u2028 "),"GET /{code}");assert.equal(cleanLabel("x".repeat(80)).length,MAX_LABEL);
  assert.equal(cleanLabel(42),"");assert.deepEqual(cleanArrowLook({protocol:"grpc",label:" OrderCreated "}),{protocol:"grpc",label:"OrderCreated"});
  assert.deepEqual(cleanArrowLook({protocol:"__proto__",label:"   "}),{});assert.deepEqual(cleanArrowLook(null),{});
});

test("a saved arrow keeps its protocol and label (v1 and v2 designs), and the judge's view ignores them",()=>{
  const nodes=[{id:"c",type:"client",x:0,y:0,config:{}},{id:"s",type:"server",x:240,y:0,config:{}},{id:"db",type:"database",x:480,y:0,config:{}}];
  const edges=[{from:"c",to:"s",protocol:"grpc",label:"POST /links"},{from:"s",to:"db",protocol:"nope",label:""},{from:"c",to:"s",protocol:"sse"}];
  for(const v of [undefined,2]){
    const d=cleanDesign({name:"d",updated:1,nodes,edges,...(v?{v}:{})},lab,"d");
    assert.deepEqual(d.edges.map(e=>[e.from,e.to,e.protocol,e.label]),[["c","s","grpc","POST /links"],["s","db",undefined,undefined]],`v${v||1}`);
    const plain=cleanDesign({name:"d",updated:1,nodes,edges:edges.map(({from,to})=>({from,to})),...(v?{v}:{})},lab,"d");
    assert.ok(sameDesign(d,plain),"a label doesn't make a copied design count as the learner's own");
  }
  const s=readStore(JSON.stringify({current:"d",designs:{d:{id:"d",name:"d",updated:1,nodes,edges}}}),lab);
  assert.equal(s.designs.d.edges[0].label,"POST /links");
});
