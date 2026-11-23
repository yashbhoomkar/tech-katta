// The content lock (site3d/scripts/gate.js, a port of next/src/content/gate.ts) and the preview cut (a copy of src/preview.js).
import test from "node:test";
import assert from "node:assert/strict";
import { gateFor } from "../scripts/gate.js";
import { previewCut as copyCut } from "../scripts/preview.js";
import { previewCut } from "../../src/preview.js";

const copy = { pageLock: { title: "t", text: "x" }, previewLock: { eyebrow: "e", title: "t", text: "x" } };
const out = { ready: true, enabled: true, user: null }, inn = { ready: true, enabled: true, user: { name: "A" } };

test("open pages are never locked", () => {
  for (const acc of [out, inn, { ready: false, enabled: false, user: null }]) assert.equal(gateFor("open", acc, copy), "open");
});
test("signed out: lists open, an article is a preview, the workspace is locked", () => {
  assert.equal(gateFor("list", out, copy), "open");
  assert.equal(gateFor("article", out, copy), "preview");
  assert.equal(gateFor("workspace", out, copy), "locked");
});
test("signed in: everything opens", () => {
  for (const k of ["list", "article", "workspace"]) assert.equal(gateFor(k, inn, copy), "open");
});
test("until the account is known, a gated page waits; a list does not", () => {
  const unknown = { ready: false, enabled: false, user: null };
  assert.equal(gateFor("article", unknown, copy), "wait");
  assert.equal(gateFor("workspace", unknown, copy), "wait");
  assert.equal(gateFor("list", unknown, copy), "open");
});
test("with sign-in unavailable, or no lock copy, nothing is locked", () => {
  const off = { ready: true, enabled: false, user: null };
  for (const k of ["list", "article", "workspace"]) { assert.equal(gateFor(k, off, copy), "open"); assert.equal(gateFor(k, out, undefined), "open"); assert.equal(gateFor(k, out, {}), "open"); }
});
test("no previewLock copy: an article is locked like the workspace; a list is gated too", () => {
  const only = { pageLock: copy.pageLock };
  assert.equal(gateFor("article", out, only), "locked");
  assert.equal(gateFor("list", out, only), "locked");
});
test("the 3D site's preview cut is the one the build and the current app use", () => {
  const p = (x) => ({ t: "p", x }), body = [p("a ".repeat(120)), { t: "h2", x: "H" }, p("b ".repeat(200)), p("c ".repeat(300)), { t: "h2", x: "I" }, p("d ".repeat(50)), p("e ".repeat(400))];
  for (const b of [body, body.slice(0, 2), body.slice(0, 1), [p("short")], [...body, ...body]]) assert.equal(copyCut(b), previewCut(b));
});
