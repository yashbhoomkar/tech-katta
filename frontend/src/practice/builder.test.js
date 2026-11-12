// The Builder's logic (spec 20.9): text → Builder → text keeps the design; rename and delete reach every use; generated
// names; the "What happens next?" filter offers exactly what section 3.4 allows (table-driven over every pair of kinds);
// and problem 1's reference can be built from its template with these operations alone (taps only).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as B from "./builder.js";
import { compile } from "../tkd/compile.js";
import { judgeAll } from "../tkd/judge.js";
import { canonical } from "../tkd/format.js";
import { KIND_NAMES } from "../tkd/catalogue.js";

const problem = JSON.parse(readFileSync(new URL("../../../content/problems2/001-url-shortener.json", import.meta.url), "utf8"));
const [GET, CREATE] = problem.requests;
const text = (p) => B.write(p, problem);

test("text → Builder → text keeps every reference and wrong design", () => {
  for (const src of [problem.reference, ...problem.wrong.map((w) => w.source)]) {
    const once = text(B.read(src));
    assert.equal(text(B.read(once)), once);
    assert.equal(canonical(once, problem), canonical(src, problem));
  }
});

test("generated names: lb, api, db … then 2, 3", () => {
  let p = B.read("");
  for (const k of KIND_NAMES) ({ parsed: p } = B.addPart(p, k));
  assert.deepEqual(B.parts(p).map((s) => s.name), ["lb", "cdn", "api", "worker", "cache", "db", "kv", "queue", "files", "ids"]);
  ({ parsed: p } = B.addPart(p, "server")); ({ parsed: p } = B.addPart(p, "server"));
  assert.deepEqual(B.parts(p).slice(-2).map((s) => s.name), ["api2", "api3"]);
});

test("rename reaches every route, then-clause and table", () => {
  const t = text(B.renamePart(B.read(problem.reference), "cache", "hot"));
  assert.match(t, /^hot +\= cache\(/m);
  assert.match(t, /api > hot \| db$/m);
  assert.match(t, /then invalidate hot$/m);
  const t2 = text(B.renamePart(B.read(problem.reference), "db", "main"));
  assert.match(t2, /^table main\.links/m);
});

test("delete with uses: removed from routes, neighbours joined with >, its then-clause dropped", () => {
  const p = B.read(problem.reference);
  assert.deepEqual(B.usesOf(p, "cache"), ["GET_LINK", "CREATE_LINK"]);
  const t = text(B.deletePart(p, "cache"));
  assert.match(t, /^read  GET_LINK: +client > lb > api > db$/m);
  assert.match(t, /^write CREATE_LINK: client > lb > api > ids > db$/m);
  assert.ok(compile(t, problem).ok);
});

// what may follow each kind of part, for a read and a write (3.4 rules 4–7 and the Builder's table in 20.6)
const ALL = "lb = lb()\ncdn = cdn()\napi = server()\nworker = worker()\ncache = cache()\ndb = sql(replicas=1)\nkv = nosql()\nqueue = queue()\nfiles = objectstore()\nids = idgen()\n";
const after = (lastKind, mode, cdnOk = false) => {
  const p = B.read(ALL + (lastKind === "client" ? "" : `${mode} R: client > ${lastKind === "worker" ? "api ~> queue > worker" : lastKind === "queue" ? "api ~> queue" : lastKind}\n`).replace(/> (server|sql|nosql|objectstore|idgen|cache|cdn|lb)$/m, (m, k) => `> ${B.BASE_NAME[k]}`));
  const req = { name: "R", mode, cdn_ok: cdnOk };
  const c = B.candidates(p, problem, req);
  return Object.fromEntries(c.list.map((x) => [x.kind, x.rows.map((r) => r.op).join("")]));
};
test("what happens next: a table over every kind of last hop", () => {
  assert.deepEqual(after("client", "read"), { lb: ">", server: ">", cache: ">", sql: ">", nosql: ">", objectstore: ">" });
  assert.deepEqual(after("client", "read", true).cdn, ">");
  assert.deepEqual(after("server", "write"), { lb: ">", cache: ">", sql: ">", nosql: ">", queue: "~>", objectstore: ">", idgen: ">" });
  assert.deepEqual(after("server", "read"), { lb: ">", cache: ">", sql: ">", nosql: ">", objectstore: ">" });
  assert.deepEqual(after("cache", "read"), { lb: ">", server: "|>", sql: "|>", nosql: "|>", objectstore: "|>" });
  assert.deepEqual(after("queue", "write"), { worker: ">" });
  for (const store of ["sql", "nosql", "objectstore"]) {
    const p = B.read(`${ALL}read R: client > ${B.BASE_NAME[store]}\n`);
    const c = B.candidates(p, problem, { name: "R", mode: "read" });
    assert.deepEqual(c.list, []);
    assert.match(c.why, /Nothing can come after .*: it is where the data lives\./);
  }
  assert.equal(B.candidates(B.read("api = server()\n"), problem, GET).needsStore, true);
  assert.equal(B.candidates(B.read(""), problem, GET).why, "There is no place to store data yet.");
  assert.ok(B.candidates(B.read(ALL), problem, GET).list.find((x) => x.kind === "sql").replicaOk);
});

test("problem 1's reference, built from the template with taps alone, is Accepted", () => {
  let p = B.read(problem.template), name;
  // + Add: cache, database, id generator
  ({ parsed: p, name } = B.addPart(p, "cache")); assert.equal(name, "cache");
  p = B.setArg(p, "cache", "nodes", 2); p = B.setArg(p, "cache", "ttl_s", 3600);
  ({ parsed: p } = B.addPart(p, "sql"));
  p = B.setArg(p, "db", "size", "medium"); p = B.setArg(p, "db", "replicas", 1); p = B.setArg(p, "db", "sync", true);
  ({ parsed: p } = B.addPart(p, "idgen"));
  // steppers and the size control on the template's server
  for (let i = 0; i < 3; i += 1) p = B.setArg(p, "api", "count", B.argOf(B.parts(p).find((s) => s.name === "api"), "count") + 1);
  p = B.setArg(p, "api", "size", "medium");
  // the one-tap table suggestion
  const [sug] = B.tableSuggestions(p, problem);
  p = B.addTable(p, sug.part, sug.name, sug.columns, sug.pk);
  // GET_LINK: + cache, then "On a miss, ask db"
  const rowOf = (req, part, op) => B.candidates(p, problem, req).list.find((x) => x.part === part).rows.find((r) => r.op === op);
  p = B.addHop(p, GET, { part: "cache", op: rowOf(GET, "cache", ">").op });
  p = B.addHop(p, GET, { part: "db", op: rowOf(GET, "db", "|").op });
  // CREATE_LINK: + ids, + db, After saving: clear the copy in cache
  p = B.addHop(p, CREATE, { part: "ids", op: rowOf(CREATE, "ids", ">").op });
  p = B.addHop(p, CREATE, { part: "db", op: rowOf(CREATE, "db", ">").op });
  p = B.setAfter(p, CREATE, "invalidate", "cache");
  const t = text(p);
  assert.equal(judgeAll(t, problem, { all: true }).verdict, "Accepted", t);
  assert.equal(canonical(t, problem), canonical(problem.reference, problem));
});

test("consequence lines speak the judge's numbers", () => {
  const p = B.read(problem.reference), by = (n) => B.parts(p).find((s) => s.name === n);
  assert.equal(B.consequence(by("api"), problem), "4 × 1,000 = 4,000 requests a second · ₹24,000");
  assert.equal(B.consequence(by("cache"), problem), "Holds about 40 lakh links of 500 bytes · ₹3,000");
  assert.equal(B.consequence(by("db"), problem), "1 primary + 1 replica · reads 3,000/s each · writes 1,000/s · ₹40,000");
  assert.deepEqual(B.limits(GET), ["may be 1 hour old"]);
  assert.deepEqual(B.limits(CREATE), ["ids must be unique", "must not be lost"]);
});
