// prototype.katta.cc: the new frontend is copied once per look, and a build made for the wrong address or look
// must never be copied (hosting/prototype-copies.mjs, used by prototype-next.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { COPIES, copyProblem } from "./prototype-copies.mjs";

const page = (base, style) => `<html lang="en"${style ? ` data-style="${style}"` : ""}><script src="${base}assets/index-1.js"></script></html>`;

test("each copy takes only a build for its own address and look", () => {
  assert.deepEqual(Object.keys(COPIES), ["next", "neo-brutalism"]);
  assert.equal(copyProblem(page("/p/next/"), "next"), null);
  assert.equal(copyProblem(page("/p/neo-brutalism/", "neo-brutalism"), "neo-brutalism"), null);
});
test("a build for the other address is refused", () => {
  assert.match(copyProblem(page("/p/next/"), "neo-brutalism"), /BASE_PATH=\/p\/neo-brutalism\//);
  assert.match(copyProblem(page("/next/"), "next"), /BASE_PATH=\/p\/next\//);
});
test("a build in the wrong look is refused", () => {
  assert.match(copyProblem(page("/p/next/", "neo-brutalism"), "next"), /wrong VITE_STYLE/);
  assert.match(copyProblem(page("/p/neo-brutalism/"), "neo-brutalism"), /wrong VITE_STYLE/);
});
test("an unknown copy is refused", () => {
  assert.match(copyProblem(page("/p/x/"), "x"), /unknown copy/);
});
