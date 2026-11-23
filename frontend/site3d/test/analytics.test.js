// Page views from the 3D pages keep the { section, slug } shape the React app sent (its pageOf was removed in phase 6 of tech-katta-context 49),
// so the owner's /analytics page groups old and new views together: these cases are that contract.
import test from "node:test";
import assert from "node:assert/strict";
import { pageOf } from "../scripts/analytics.js";

const CASES = [
  ["/", { section: "next:landing", slug: "" }], ["/home", { section: "next:home", slug: "" }], ["/problems", { section: "next:problems", slug: "" }],
  ["/problems/menu-search", { section: "next:problems", slug: "menu-search" }], ["/problems/challenge/abc", { section: "next:challenge", slug: "abc" }],
  ["/learn", { section: "next:learn", slug: "" }], ["/learn/concepts", { section: "next:concepts", slug: "" }], ["/learn/concepts/caching", { section: "next:concepts", slug: "caching" }],
  ["/simulator/ind-vs-pak", { section: "next:simulator", slug: "ind-vs-pak" }], ["/me", { section: "next:me", slug: "" }], ["/practice/x", { section: "next:practice", slug: "x" }],
];
test("pageOf gives the React app's shape", () => { for (const [p, want] of CASES) assert.deepEqual(pageOf(p), want, p); });
