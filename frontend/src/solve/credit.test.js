// The AWS credit ledger (solve/credit.jsx): a fresh $200,000 a run, spent test by test at the simulator's real cost.
import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";
import{ledger,spentBy,lasts,CREDIT}from"./credit.js";import{evaluate}from"../eval/index.js";
const root=new URL("../../../content/",import.meta.url).pathname;
const lab=JSON.parse(readFileSync(root+"lab.json"));lab.eval=JSON.parse(readFileSync(root+"eval.json"));
const P=JSON.parse(readFileSync(root+"articles/interview-questions/url-shortener.json")).practice;
test("each load test spends what its monthly bill says, and the run starts from a fresh $200,000",()=>{const j=evaluate(P.reference,lab,P);const L=ledger(j.results);
  assert.equal(L.start,CREDIT);let left=CREDIT;
  for(const r of j.results){assert.equal(L.before[r.id],left);if(r.timeline){const s=spentBy(r),h=r.test.hours;assert.ok(Math.abs(s*730/h-r.cost.monthly)<=Math.max(5,r.cost.monthly*.002),`${r.test.name}: ${s*730/h} vs ${r.cost.monthly}`)}left-=spentBy(r)}
  assert.ok(Math.abs(L.end-left)<1e-6&&L.spent>0&&L.peakPerHour>0);
  assert.deepEqual(ledger(j.results),L,"a second run starts from $200,000 again")});
test("how long the credit lasts reads in words",()=>{assert.equal(lasts(0),"");assert.equal(lasts(CREDIT/10),"10 hours");assert.match(lasts(25),/months|years/)});
