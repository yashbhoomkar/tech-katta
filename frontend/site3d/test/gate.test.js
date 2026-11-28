// Who may open what (site3d/scripts/gate.js; tech-katta-context 52). Sign-in being unavailable never opens anything.
import test from "node:test";
import assert from "node:assert/strict";
import { gateFor } from "../scripts/gate.js";

const out = { ready: true, enabled: true, user: null }, inn = { ready: true, enabled: true, user: { name: "A" } };
const unavailable = { ready: true, enabled: false, unavailable: true, user: null };
const unknown = { ready: false, enabled: false, user: null };

test("open pages and lists are never locked", () => {
  for (const acc of [out, inn, unavailable, unknown]) for (const k of ["open", "list"]) assert.equal(gateFor(k, acc), "open");
});
test("signed out: an article and a problem show their public part; the Dashboard, You, the sandbox show the card", () => {
  assert.equal(gateFor("article", out), "preview");
  assert.equal(gateFor("problem", out), "preview");
  assert.equal(gateFor("personal", out), "locked");
  assert.equal(gateFor("workspace", out), "locked");
});
test("signed in: everything opens", () => {
  for (const k of ["list", "article", "problem", "personal", "workspace"]) assert.equal(gateFor(k, inn), "open");
});
test("until the account is known, a gated page waits (nothing locked or personal is drawn); a list does not", () => {
  for (const k of ["article", "problem", "personal", "workspace"]) assert.equal(gateFor(k, unknown), "wait");
  assert.equal(gateFor("list", unknown), "open");
});
test("with sign-in unavailable (the API cannot be reached) nothing is unlocked: the pages stay as when signed out", () => {
  assert.equal(gateFor("article", unavailable), "preview");
  assert.equal(gateFor("problem", unavailable), "preview");
  assert.equal(gateFor("personal", unavailable), "locked");
  assert.equal(gateFor("workspace", unavailable), "locked");
  assert.equal(gateFor("article", { ready: true, enabled: false, user: null }), "preview");
});
test("only the local-development flag opens the pages", () => {
  for (const k of ["article", "problem", "personal", "workspace"]) { assert.equal(gateFor(k, out, { devOpen: true }), "open"); assert.equal(gateFor(k, unavailable, { devOpen: true }), "open"); }
  assert.equal(gateFor("article", out, { devOpen: false }), "preview");
});
test("the sign-in flag off (the API says required: false) opens every page, signed out or with sign-in unavailable, once the answer is in", () => {
  for (const k of ["article", "problem", "personal", "workspace"]) {
    assert.equal(gateFor(k, { ...out, required: false }), "open");
    assert.equal(gateFor(k, { ...unavailable, required: false }), "open");
    assert.equal(gateFor(k, { ...unknown, required: false }), "wait");
    assert.equal(gateFor(k, { ...out, required: true }), k === "article" || k === "problem" ? "preview" : "locked");
  }
});
test("the free sample (free: true): an article or problem opens for everyone at once, signed out or while the account is unknown; nothing else does", () => {
  for (const acc of [out, inn, unavailable, unknown]) for (const k of ["article", "problem"]) assert.equal(gateFor(k, acc, { free: true }), "open");
  for (const k of ["personal", "workspace"]) assert.equal(gateFor(k, out, { free: true }), "locked");
});
