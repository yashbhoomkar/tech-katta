// The swipe rules (tech-katta-context 24 §1.3): one decision for every swipe on the site.
import test from"node:test";import assert from"node:assert/strict";
import{decide,band,lock,settleMs,release}from"./gesture.js";
test("a release past 35 % of the size goes that way",()=>{assert.equal(decide(-100,0,260),-1);assert.equal(decide(100,0,260),1);assert.equal(decide(-90,0,260),0)});
test("a flick faster than 0.5 px/ms goes, a slow one returns",()=>{assert.equal(decide(-30,-.8,260),-1);assert.equal(decide(-30,-.3,260),0)});
test("a flick back against the drag does not go",()=>{assert.equal(decide(-60,.9,260),0);assert.equal(decide(0,-2,260),0)});
test("past a limit the paper gives a third, at most 32 px",()=>{assert.equal(band(30,-Infinity,0),10);assert.equal(band(300,-Infinity,0),32);assert.equal(band(-40,-50,0),-40);assert.equal(band(-80,-50,0),-60)});
test("nothing is decided under 10 px; then mostly-along wins, mostly-across lets go",()=>{
assert.equal(lock(6,3),undefined);assert.equal(lock(20,10),true);assert.equal(lock(12,10),false);assert.equal(lock(3,20,"y"),true);assert.equal(lock(20,3,"y"),false)});
test("the 2026-10 ratio still holds: exactly 1.25 times is not enough",()=>assert.equal(lock(25,20),false));
test("settling takes 0.14 to 0.28 s, by the distance left",()=>{assert.equal(settleMs(0,260),140);assert.equal(settleMs(260,260),280);assert.equal(settleMs(130,260),140);assert.equal(settleMs(200,260),215)});
test("past a limit nothing goes, however far or fast (the last tab, a closed drawer)",()=>{assert.equal(release(-230,-2,360,0,Infinity),0);assert.equal(release(-230,-2,360,-Infinity,Infinity),-1);assert.equal(release(120,0,260,-Infinity,0),0)});
