// Where an article's lab box goes, and the canvas record the problems pages read (site3d/scripts/solving.js).
import test from "node:test";
import assert from "node:assert/strict";
import { labHref, record, solveState } from "../scripts/solving.js";

test("a lab box goes to its own address, never to a fixed simulator page", () => {
  assert.equal(labHref({ to: "problems/challenge/first-rush" }), "/problems/challenge/first-rush");
  assert.equal(labHref({ to: "/problems/menu-search" }), "/problems/menu-search");
  assert.equal(labHref({ to: "problems/ind-vs-pak" }), "/problems/ind-vs-pak");
  assert.equal(labHref({}), "/problems");
  assert.equal(labHref({ to: "https://evil.example/x" }), "/problems");
  assert.equal(labHref({ to: "//evil.example" }), "/problems");
  assert.equal(labHref({ to: "problems/<script>" }), "/problems");
});
test("the record: solved, started, best own score", () => {
  const prog = { steps: { "solved:a": true, "practice:b": true } }, subs = { c: [{ score: 40 }, { score: 90, copied: true }] };
  assert.deepEqual(record("a", prog, subs), { solved: true, started: false, best: null });
  assert.deepEqual(record("b", prog, subs), { solved: false, started: true, best: null });
  assert.deepEqual(record("c", prog, subs), { solved: false, started: true, best: 40 });
});
test("next problem: a started one first, else the first not solved; guides are not problems", () => {
  const list = [{ section: "interview-questions", group: "start", slug: "g" }, ...["p1", "p2", "p3"].map((slug) => ({ section: "interview-questions", group: "easy", slug }))];
  assert.equal(solveState(list, {}, {}).next.slug, "p1");
  assert.equal(solveState(list, {}, {}).total, 3);
  assert.equal(solveState(list, { steps: { "practice:p3": true } }, {}).next.slug, "p3");
  const all = solveState(list, { steps: { "solved:p1": true, "solved:p2": true, "solved:p3": true } }, {});
  assert.equal(all.next, null); assert.equal(all.solved, 3);
});
