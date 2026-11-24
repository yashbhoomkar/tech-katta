// The learner's design as a 3D system, and its state per minute (site3d/scripts/replay3d.js).
import test from "node:test";
import assert from "node:assert/strict";
import { systemOf, stateAt, stateOfHop, kindOf } from "../scripts/replay3d.js";

const design = { nodes: [
  { id: "c", type: "client", name: "Clients", x: 0, y: 100 }, { id: "lb", type: "lb", name: "LB", x: 240, y: 100 }, { id: "s", type: "server", name: "Svc", x: 480, y: 100 },
  { id: "k", type: "cache", name: "Hot", x: 480, y: 0 }, { id: "d", type: "database", name: "DB", x: 720, y: 100, config: { replicas: 2 } }, { id: "z", type: "mystery", x: 720, y: 200 } ],
edges: [{ from: "c", to: "lb" }, { from: "lb", to: "s" }, { from: "s", to: "k" }, { from: "s", to: "d" }, { from: "s", to: "nope" }] };

test("systemOf: kinds, centring, unknown types, replicas, paths to missing parts dropped", () => {
  const { parts, paths } = systemOf(design);
  assert.equal(parts.c.kind, "laptop"); assert.equal(parts.d.kind, "db"); assert.equal(parts.z.kind, "small"); assert.equal(kindOf("queue"), "queue");
  assert.equal(parts.d.layers, 2); assert.equal(parts.s.layers, undefined);
  const xs = Object.values(parts).map((p) => p.x), zs = Object.values(parts).map((p) => p.z);
  assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 1e-9, "centred on x"); assert.ok(Math.abs(Math.min(...zs) + Math.max(...zs)) < 1e-9, "centred on z");
  assert.ok(parts.c.x < parts.d.x, "clients stay at the far left");
  assert.deepEqual(Object.values(paths), [["c", "lb"], ["lb", "s"], ["s", "k"], ["s", "d"]]);
  assert.deepEqual(systemOf({ nodes: [] }), { parts: {}, paths: {} });
  assert.equal(systemOf({ nodes: [{ id: "a", type: "cache", x: 0, y: 0 }] }, (id) => `Cache ${id}`).parts.a.name, "Cache a", "an unnamed part takes its catalogue name");
});

const node = (o = {}) => ({ rho: 0.3, up: 1, inst: 0, backlog: 0, peak: 1, fo: false, warm: 1, fresh: [], ...o });
test("stateAt: ok below 70 %, warn from 70 %, alert over 100 % or down", () => {
  const at = { nodes: { c: node(), lb: node({ rho: 0.7 }), s: node({ rho: 1.2 }), k: node({ rho: 0.69 }), d: node({ up: 0 }) }, arrows: {} };
  const s = stateAt(at, design);
  assert.deepEqual([s.parts.c, s.parts.lb, s.parts.s, s.parts.k, s.parts.d], ["ok", "warn", "alert", "ok", "alert"]);
  assert.equal(s.parts.z, "dim", "a part the replay knows nothing about");
  assert.deepEqual(s.labels.d, ["DOWN", "alert"]); assert.equal(s.labels.lb[0], "70%");
});
test("stateAt: a part explodes only in the minute it crashes", () => {
  const down = (fresh) => stateAt({ nodes: { d: node({ up: 0, fresh }) }, arrows: {} }, design);
  assert.deepEqual(down(["crashed"]).explode, ["d"]);
  assert.deepEqual(down([]).explode, [], "scrubbing inside the outage does not repeat it");
  assert.deepEqual(stateAt({ nodes: { d: node() }, arrows: {} }, design).explode, [], "back before the outage: nothing");
});
test("stateAt: failover, cache warming, queue backlog and request paths", () => {
  const q = { nodes: [{ id: "q", type: "queue" }, { id: "c", type: "client" }], edges: [{ from: "c", to: "q" }] };
  const s = stateAt({ nodes: { c: node(), q: node({ backlog: 50, peak: 200 }) }, arrows: { "c>q": 1000 } }, q);
  assert.equal(s.fill.q, 0.25); assert.equal(s.paths.e0, "ok"); assert.ok(s.speed > 0.6 && s.speed <= 2.2);
  assert.equal(stateAt({ nodes: { d: node({ fo: true }) }, arrows: {} }, design).labels.d[0], "standby took over");
  assert.match(stateAt({ nodes: { k: node({ warm: 0.4 }) }, arrows: {} }, design).labels.k[0], /^warming 40%/);
  assert.equal(stateAt({ nodes: { c: node(), q: node() }, arrows: {} }, q).paths.e0, "dim");
});
test("stateOfHop lights the part the request is at and dims the rest", () => {
  const s = stateOfHop(design, { at: "s", from: "lb" });
  assert.equal(s.parts.s, "warn"); assert.equal(s.parts.c, "dim"); assert.equal(s.paths.e1, "ok"); assert.equal(s.paths.e0, "dim");
});
