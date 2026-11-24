// The #fragments the canvas's code sets to move between pages (site3d/scripts/legacy-hash.js).
import test from "node:test";
import assert from "node:assert/strict";
import { hashTarget } from "../scripts/legacy-hash.js";

const P = "/problems/url-shortener";
test("moves to another problem, a challenge, practice, the list and a lesson", () => {
  assert.equal(hashTarget("#problems/file-sync", P), "/problems/file-sync");
  assert.equal(hashTarget("#problems/challenge/abc", P), "/problems/challenge/abc");
  assert.equal(hashTarget("#problems/sandbox", P), "/problems/sandbox");
  assert.equal(hashTarget("#problems", P), "/problems");
  assert.equal(hashTarget("#practice", P), "/practice");
  assert.equal(hashTarget("#practice/x", P), "/practice/x");
  assert.equal(hashTarget("#concepts/caching", P), "/learn/concepts/caching");
  assert.equal(hashTarget("#interview-questions/file-sync", P), "/learn/interview-questions/file-sync");
  assert.equal(hashTarget("#/problems/file-sync", P), "/problems/file-sync");
});
test("a problem's own tabs and a shared design's data stay on the page", () => {
  assert.equal(hashTarget("#problems/url-shortener", P), null);
  assert.equal(hashTarget("#interview-questions/url-shortener", P), null);
  assert.equal(hashTarget("#problems/shared/abc123", "/problems/shared"), null);
});
test("anything else is not a move", () => {
  assert.equal(hashTarget("", P), null);
  assert.equal(hashTarget("#top", P), null);
  assert.equal(hashTarget("#concepts", P), null);
});
