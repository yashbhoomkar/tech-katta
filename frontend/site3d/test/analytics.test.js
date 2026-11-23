// Page views from the 3D pages have the same { section, slug } shape the React app sent (next/src/lib/analytics.ts pageOf),
// so the owner's /analytics page groups old and new views together.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageOf } from "../scripts/analytics.js";

const CASES = [
  ["/", { section: "next:landing", slug: "" }], ["/home", { section: "next:home", slug: "" }], ["/problems", { section: "next:problems", slug: "" }],
  ["/problems/menu-search", { section: "next:problems", slug: "menu-search" }], ["/problems/challenge/abc", { section: "next:challenge", slug: "abc" }],
  ["/learn", { section: "next:learn", slug: "" }], ["/learn/concepts", { section: "next:concepts", slug: "" }], ["/learn/concepts/caching", { section: "next:concepts", slug: "caching" }],
  ["/simulator/ind-vs-pak", { section: "next:simulator", slug: "ind-vs-pak" }], ["/me", { section: "next:me", slug: "" }], ["/practice/x", { section: "next:practice", slug: "x" }],
];
test("pageOf gives the React app's shape", () => { for (const [p, want] of CASES) assert.deepEqual(pageOf(p), want, p); });
test("pageOf's rules are still the ones in next/src/lib/analytics.ts", () => {
  const ts = readFileSync(new URL("../../next/src/lib/analytics.ts", import.meta.url), "utf8");
  for (const piece of ['"next:landing"', "`next:${b}`", '"next:learn"', '"next:challenge"', "`next:${a}`"]) assert.ok(ts.includes(piece), piece);
});
