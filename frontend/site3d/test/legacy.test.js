// The old /dashboard addresses (site3d/scripts/legacy.js, a port of next/src/content/legacy.ts: the same cases).
import test from "node:test";
import assert from "node:assert/strict";
import { legacyKey, legacyTarget } from "../scripts/legacy.js";
import { fromLab } from "../../src/routes.js";

const P = ["url-shortener", "ind-vs-pak-live-streaming"];
const S = ["concepts", "components", "interview-questions", "real-systems", "quick-notes"];
const to = (path, hash = "") => legacyTarget(legacyKey(path, hash), P, S, fromLab);


test("reads the key from the path, or from the hash when there is one", () => {
  assert.equal(legacyKey("/dashboard/concepts/caching/", ""), "concepts/caching");
  assert.equal(legacyKey("/dashboard/", "#components/redis"), "components/redis");
  assert.equal(legacyKey("/dashboard", ""), "");
  assert.equal(legacyKey("/dashboard/concepts%2Fx/", ""), "concepts/x");
});
test("maps the dashboard, sections and lessons", () => {
  assert.equal(to("/dashboard/"), "/home");
  assert.equal(to("/dashboard/concepts/"), "/learn/concepts");
  assert.equal(to("/dashboard/concepts/caching/"), "/learn/concepts/caching");
  assert.equal(to("/dashboard/", "#interview-questions/url-shortener-iq"), "/learn/interview-questions/url-shortener-iq");
});
test("maps problems, the sandbox, challenges, practice and the policies", () => {
  assert.equal(to("/dashboard/problems/"), "/problems");
  assert.equal(to("/dashboard/problems/url-shortener/"), "/problems/url-shortener");
  assert.equal(to("/dashboard/problems/sandbox/"), "/problems/sandbox");
  assert.equal(to("/dashboard/problems/challenge/cricket/"), "/problems/challenge/cricket");
  assert.equal(to("/dashboard/practice/"), "/practice");
  assert.equal(to("/dashboard/practice/two-sum-cache/"), "/practice/two-sum-cache");
  assert.equal(to("/dashboard/privacy/"), "/privacy");
  assert.equal(to("/dashboard/terms/"), "/terms");
});
test("keeps a shared design's data in the hash", () => {
  assert.equal(to("/dashboard/problems/shared/", "#problems/shared/eJyrVkos"), "/problems/shared#problems/shared/eJyrVkos");
});
test("maps the old Lab addresses, including a challenge that became a problem", () => {
  assert.equal(to("/dashboard/lab/"), "/problems");
  assert.equal(to("/dashboard/lab/cricket/"), "/problems/challenge/cricket");
  assert.equal(to("/dashboard/lab/ind-vs-pak-live-streaming/"), "/problems/ind-vs-pak-live-streaming");
});
test("sends unknown keys home and unknown problems to the list", () => {
  assert.equal(to("/dashboard/nothing/"), "/home");
  assert.equal(to("/dashboard/problems/no-such-problem/"), "/problems");
});

test("new-style paths under /dashboard land on the same path without it", () => {
  assert.equal(to("/dashboard/learn/concepts/caching"), "/learn/concepts/caching");
  assert.equal(to("/dashboard/learn/real-systems/shopify-reservations"), "/learn/real-systems/shopify-reservations");
  assert.equal(to("/dashboard/learn"), "/learn/concepts");
  assert.equal(to("/dashboard/simulator/ind-vs-pak"), "/simulator/ind-vs-pak");
  assert.equal(to("/dashboard/me"), "/me");
  assert.equal(to("/dashboard"), "/home");
});
