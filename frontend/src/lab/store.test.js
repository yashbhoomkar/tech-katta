import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";
import{readStore,cleanDesign}from"./store.js";
const lab=JSON.parse(readFileSync(new URL("../../../content/lab.json",import.meta.url)));

test("missing, broken or foreign data gives an empty store instead of a crash",()=>{
  for(const raw of [null,"","{","null","42","[]",'"x"','{"designs":null}','{"designs":[1,2]}','{"designs":{"a":null,"b":7}}'])
    assert.deepEqual(readStore(raw,lab),{version:1,current:undefined,designs:{}},raw);
});

test("a good saved design survives unchanged",()=>{
  const ex=lab.example,d={id:"d1",name:ex.name,updated:5,nodes:ex.nodes,edges:ex.edges,credit:{spent:12.5,hours:3}};
  const s=readStore(JSON.stringify({current:"d1",designs:{d1:d}}),lab);
  assert.equal(s.current,"d1");assert.deepEqual(s.designs.d1,d);
});

test("bad parts are repaired or dropped: unknown types, duplicate ids, bad settings, illegal edges",()=>{
  const d={name:"",updated:"yesterday",credit:{spent:-4,hours:"x"},nodes:[
    {id:"c",type:"client",x:"a",config:{rps:1e12}},{id:"c",type:"client"},{id:"q",type:"teleporter"},{type:"server"},
    {id:"s",type:"server",x:1,y:2,config:{size:"x9.huge",count:0,queriesPerRequest:"two"}},{id:"db",type:"database",config:{multiAz:"yes"}}],
    edges:[{from:"c",to:"s"},{from:"c",to:"s"},{from:"s",to:"db"},{from:"db",to:"s"},{from:"s",to:"c"},{from:"s",to:"s"},{from:"s",to:"q"},null]};
  const out=cleanDesign(d,lab,"x");
  assert.equal(out.name,"Untitled design");assert.equal(typeof out.updated,"number");
  assert.deepEqual(out.credit,{spent:0,hours:0});
  assert.deepEqual(out.nodes.map(n=>n.id),["c","s","db"]);
  assert.deepEqual(out.nodes[0],{id:"c",type:"client",x:0,y:0,config:{rps:lab.components[0].rps.max}});
  assert.deepEqual(out.nodes[1].config,{count:1});
  assert.deepEqual(out.nodes[2].config,{});
  assert.deepEqual(out.edges,[{from:"c",to:"s"},{from:"s",to:"db"}]);
});

test("current falls back to a design that exists",()=>{
  const s=readStore(JSON.stringify({current:"gone",designs:{a:{nodes:[],edges:[]}}}),lab);
  assert.equal(s.current,"a");
});
