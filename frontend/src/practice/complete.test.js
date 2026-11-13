// Autocomplete (spec 11.3, step 6): kinds after "=", settings inside "(", declared names after an operator.
import test from "node:test";
import assert from "node:assert/strict";
import { suggest, accept } from "./complete.js";

const at = (t) => suggest(t.replace("|^", ""), t.indexOf("|^"));
const labels = (s) => (s ? s.items.map((x) => x.label) : []);

test("after = : part kinds, filtered by what is typed", () => {
  assert.deepEqual(labels(at("cache = |^")).slice(0, 3), ["lb", "cdn", "server"]);
  assert.deepEqual(labels(at("db = s|^")), ["server", "sql"]);
  const s = at("db = sq|^");
  assert.deepEqual(accept("db = sq", s, s.items[0], 7), { text: "db = sql(", cursor: 9 });
});

test("inside kind( : its settings not yet written", () => {
  assert.deepEqual(labels(at("api = server(|^")), ["count", "size"]);
  assert.deepEqual(labels(at("api = server(count=2, |^")), ["size"]);
  assert.deepEqual(labels(at("c = cache(nodes=2, m|^")), ["memory_gb"]);
  assert.equal(at("api = server(count=2|^"), null, "not while typing a value");
});

test("after an operator on a route: declared parts not yet in the route", () => {
  const head = "lb = lb()\napi = server()\ncache = cache()\ndb = sql()\n";
  assert.deepEqual(labels(suggest(`${head}read GET: client > lb > `, `${head}read GET: client > lb > `.length)), ["api", "cache", "db"]);
  assert.deepEqual(labels(suggest(`${head}read GET: client > lb > api > cache | d`, `${head}read GET: client > lb > api > cache | d`.length)), ["db"]);
  assert.equal(suggest("# lb = ", 7), null, "nothing inside a comment");
});
