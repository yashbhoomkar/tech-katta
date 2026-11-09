# Site content

Everything tech.katta.cc shows comes from these JSON files. The API (`backend/`) validates them and serves them at `tech-api.katta.cc`; the frontend only renders what it receives.

```
content/
├── site.json                    landing page, dashboard chrome, footer   → GET /v1/site
│                                ("example": id of the example system below)
├── lab.json                     System Design Lab catalogue and example design → GET /v1/lab
├── examples/
│   └── zotato.json              the example system articles explain things through
└── articles/
    ├── index.json               which articles exist, in site order: ["concepts/api-types", …]
    └── <section>/<slug>.json    one article                               → GET /v1/articles/<slug>
                                 (GET /v1/articles lists summaries; ?section= filters)
```

## Where it lives in production

The deploy copies this folder onto the VPS's disk as a dated release and switches the API to it:

```
/var/lib/tech-katta/content/
├── current -> releases/20261031T1305Z-1e0f46d    what the API serves (CONTENT_DIR)
└── releases/                                     last 10 releases, newest first
```

A release is validated (`node backend/scripts/check-content.mjs <dir>`) before `current` moves to it. If it is invalid the deploy stops and the site keeps serving the previous release. To roll back on the VPS: point `current` at an older release and run `sudo systemctl kill -s HUP tech-katta-api` (the API reloads without restarting; it also keeps the old content if the new one fails to load).

## Article blocks

Research Papers (`papers/`, owner 11-08) replace "Did you know": one classic paper per article, in plain words with
animated figures: the paper (title, author, venue, year), the problem it solved, the idea, how it works, what it
promises, where you see it today and how to use it in an interview. Write it in our own words and figures; never
copy the paper's text or diagrams.

Networking essentials (owner 11-08) is a group inside Concepts (CONCEPT // 26-36), not a tab: how machines
reach each other, from layers and addresses to load balancers, live updates, distance and failing calls.
Figures are `NETWORK_FIGS` in `frontend/src/figs/network.jsx`. Written through Zotato with our own figures; another
site's page on the topic was the reference for what to cover, point by point. Don't name that site on ours.

API design (CONCEPT // 37-43, `API_FIGS` in `apidesign.jsx`) and Data modelling (CONCEPT // 44-48, `DM_FIGS` in
`datamodel.jsx`) are groups built the same way: Concepts groups, our own words and figures, checked paragraph by
paragraph against the reference for coverage. Caching (CONCEPT // 49-53, `CACHE_FIGS` in
`caching.jsx`), Sharding (54-57, `SHARD_FIGS`), Consistent hashing (58-60, `HASH_FIGS`, including the interactive
`ch-playground`) and CAP theorem (61-63, `CAP_FIGS`) follow the same method.

`access` is `"free"` or `"paid"`: who can read it once subscriptions start. It is data only for now (nothing is
locked and nothing shows it). Free: How to answer, APIs, CAP and PACELC, Load balancers and Caches, the entry
topics people search for, each leading into paid material. Everything else is paid, and an article with
`practice` (a problem) must be paid (the validator checks it). The Lab and videos are paid too.

An article is `{section, slug, no, tag, access, date, title, dek, body: [...]}` (optional `audio: true` once narration is recorded with `tools/tts`; optional `group`, see Subsections). Body blocks; text may use `` `code` ``:

- `tldr {items}` the "In 30 seconds" box · `example` the example-system box · `h2 {x}` · `p {x}` · `list {items}`
- `fig {id, cap}`: `id` must be a figure the frontend can draw. Each figure module in `frontend/src/figs/` exports a map of its ids (`PAPER_FIGS` in `papers.jsx`, `COMPONENT_FIGS` in `components.jsx`, `APITYPE_FIGS` in `apitypes.jsx` for `patterns`, `choose`, `order`, `retry`, and so on), and `frontend/src/figs/index.js` gathers them into `FIGS`. A new figure goes in its module's map and in `FIGS` in `backend/src/content/validate.js`; a new module is also added to `figs/index.js`. A backend test reads every module and checks all of this matches.
- `type {name, kind, what, use, avoid, ex, more: [p…]}` one card per type; `more` is collapsed
- `code {label, x, say}` preformatted; `say` is read aloud instead of the code
- `table {head, rows, label?}` (`label` names it for screen readers) ·
- `lab {x, to, go?}` "Try it in the Lab" card: `to` is `lab` or `lab/<challenge id>` (checked against `lab.json`), `go` the link text · `more {label, body: [blocks]}` collapsed "Go deeper" section (not read aloud)

## Problems: tests for an Interview Question (`practice`)

Every Interview Question except "Start here" has a `practice` object, which turns it into a LeetCode-style
problem: the visitor writes an answer and builds a design on the Lab canvas, and the judge
(`frontend/src/judge/judge.js`) runs the tests against that design. Nothing is compared with a model answer.

```
practice: {
  brief,                          what the tests send, shown above the example tests
  fixed: {queriesPerRequest, hitPct, writePct, cdnHitPct, cdnLive},   applied in every test
  start: {nodes, edges},          the design a visitor starts from (Easy: Clients → LB → a small server)
  tests: [{id, name, desc, sample?, hours, startHour, traffic: {rps, pattern}, chaos?: [{minute, type}],
           checks: [{kind, label, …}]}],    at least one sample (shown, run by Run); Submit runs all
  rubric: {fr: [{label, keys}], nfr: {availability, p99, readsPerWrite: [min, max], consistency},
           est: [{id, label, unit, answer, tol?, how?}], api: [{label, method, path (regex)}],
           decisions: [{id, q, options (2–6), answer (index of the right option), why}]},
  data: {entities: {name: {rows, sample: [row]}}, fields: [name], aliases?: {field: [other names]}},
                                  sample data and field names for request tests (fields also feed the
                                  schema editor's suggestions)
  hints: [{step, x}],             step: requirements, estimates, api, design or deep; nudge → near-answer
  referenceNote?: text,           shown under the solution design: where the Lab's version differs from the
                                  worked answer's full-size one (e.g. capacity counted in requests, not CPU)
  reference: {nodes, edges},      must pass every test; shown on the Solution tab (GET /v1/articles/<slug>/
                                  solution) with Copy to my canvas, so lay it out neatly (left to right,
                                  ~240 apart); submitted unchanged it isn't counted as solved
  wrong: [{name, why, fails, nodes, edges}]   each must fail the test `fails` names
}
```

**Request tests** (a test with `request` instead of traffic; `frontend/src/judge/requests.js`):
`{id, name, desc, sample?, async?, request: {method, path, body?}, steps: [step], respond: {status, body}}`.
Steps: `get {entity, by, fields}`, `query {entity, where?, near?: {field, at: [lat, lng], km}, text?: {field,
q}, range?, order?: {field, desc?}, limit?, fields, matches?}`, `put {entity, values}`, `update {entity, by,
set?, add?, cond?: {field: {gte} | {eq}}}`, `tx {steps: [put | update]}`, `blob {entity, key, field, mode:
put | get}`, `sum {entity, where?, range?, field}`. `respond.body` is a template: `"$s1.field"`, `"$s1"`,
`"{$s1.code}"` inside text. The expected response is the steps run on `data` samples. The design's response
is the same steps run through the design: from the Clients through CDN, API gateway and load balancers to
a server, then to the databases it reaches (through caches and servers: synchronous; past a queue: only
writes, and only when `async` is true, answering 202). A table qualifies when its fields cover the step's
(names matched ignoring case, `_` and camelCase, plus `aliases`); its engine and schema must give an access
path: the key, a sort key, an index (geo for `near`, text for `text`), OpenSearch's searchable fields, or a
scan of a small table (≤ 50,000 rows) on an engine that can scan; more than 10,000 matching rows can't be
sorted in memory (`matches`); `tx` needs one store with transactions; `blob` needs S3 with a file field.
Each hop is recorded for the workspace's ▶ Watch. `tools/practice/requests.mjs` writes every problem's
data, request tests, reference schemas (and engine changes) and a wrong design that fails one.

Check kinds: `availability {min, from?, to?}`, `p99 {max}` (ms), `cost {max}` (dollars a month),
`noCrash {type?}`, `noLostWrites`, `requires {types}`, `redundant {type}` (no single component of that
type every request needs), `multiAz`, `has {type}`, `role {role, any?, behind?, min?}` (a component
given that job, e.g. `geo`, is on every request's path; `any`: on at least one; `behind`: reached only
after a component of that type, e.g. `queue`; `min`: at least that many). Roles are listed per component
type in `lab.json` (`roles: [{id, label, desc}]`); a design sets `config.role`. They don't change the
simulation: they say what a part is for, so a well-sized but generic design fails a problem it doesn't
solve. `tools/practice/roles.mjs` holds each problem's roles, role checks and key decisions. `cd frontend && npm test` runs the calibration: the
reference passes everything, each wrong design fails its test, the starting design is not accepted, and
the rubric accepts its own answers. Content changes run the frontend CI for this reason.

Scoring (out of 100): functional requirements 10 (keywords), non-functional 5 (ranges), estimates 10
(within `tol`×, default 3), API 10 (method + path regex), key decisions 15 (exact), design tests 50
(share passed); each hint
opened −3, at most −15. Known limit: two queues feeding the same workers each hand them their full
capacity, so suites keep to one queue per worker pool.

## Subsections

`site.json` `dashboard.groups` maps a section to its subsections, in order: `{"components": [[id, label,
description], …]}`. An article in that section sets `"group": "<id>"`. The section page lists each
subsection with its articles (an empty one shows `dashboard.groupEmpty`), and the sidebar groups the
section's articles the same way. Sections without groups show one plain list.

Components subsections and the planned articles (in writing order): **Edge**: load balancers, CDNs,
API gateways and rate limiting · **Compute**: app servers and autoscaling · **Storage**: caches,
databases, sharding and partitioning, object storage · **Messaging**: queues vs event streams.

## Lab catalogue (`lab.json`)

`{title, intro, region, budget, retries, priceNote, modelNote, crashNote, smallScreen, components, example}`.
Each component has `type, name, group, desc` plus the numbers its type needs (checked by
`backend/src/content/validate.js`, simulated by `frontend/src/lab/engine.js`):

| type | fields | how it behaves |
|---|---|---|
| `client` | `rps {label,min,max,default}`, optional `patterns` | sends requests (at the `rps` rate at its busiest moment); retries a failed one `retries` times |
| `apigw` | `latencyMs, limitRps, pricePerMillion` | throttles past its limit, never crashes |
| `lb` | `latencyMs, limitRps, hourly, lcuHourly, rpsPerLcu` | spreads load evenly; billed per hour + per LCU |
| `server` | `latencyMs, sizes [{id,label,rps,hourly}], defaultSize, count, queriesPerRequest, crash`, optional `autoscaling` | each request makes `queriesPerRequest` queries to a cache or database |
| `queue` | `latencyMs, limitRps, pricePerMillion` | async: the sender is done once the message is stored; workers take what they can, the rest waits as a backlog |
| `cache` | `latencyMs, sizes [{id,label,ops,hourly}], defaultSize, hitPct, writePct, crash`, optional `warmupMinutes, flushSeconds, writePolicy, onDown` | Server → Cache → Database: only misses and writes reach the database |
| `database` | `latencyMs, sizes [{id,label,qps,hourly}], defaultSize, multiAz, crash`, optional `replicas, writePct, engines, defaultEngine, features` | receives only |

`client`, `apigw`, `server` and `database` are required; the others are optional.

**Traffic through the day** (`client.patterns`, optional): `[{id, label, short, desc, points}]`.
`points` are `[hour, multiplier]` pairs from hour 0 to hour 24, hours never going back (two points
at the same hour make a jump), multipliers 0–1 with at least one 1: the Clients send `rps ×
multiplier`, linear between points, repeating every simulated day. The first pattern is the default.
`label` is the menu entry, `desc` the line under it, `short` what the canvas shows on the Clients box.
A design's Clients pick one with `config.pattern`.

**Database engines** (`database.engines`, optional; with `defaultEngine` and `features: [{id, label}]`):
`[{id, label, family, aws, desc, capacity: "instance" | "request", multiAz: "option" | "builtin" | "none",
replicas, crash, features: [feature id], aliases?, latencyMs?}]`. An `instance` engine has `sizes` +
`defaultSize` (or uses the component's), is billed per hour and may crash. A `request` engine has
`limitQps`, `readPerMillion`, `writePerMillion` (billed with the database's writes %), `crash: false`
(it throttles) and `replicas: false`. `multiAz: "builtin"` means AWS already spreads it over zones: it
counts as a standby for the `multiAz` check and a test can't crash it. A design's database sets
`config.engine`; without it the `defaultEngine` is used, so older designs are unchanged. The import text
accepts an engine's names ("DynamoDB", "Mongo r6g.xlarge", "Database s3").

**Database schemas** (`config.schema` on a design's database, written by the Lab's schema editor and
cleaned by `frontend/src/lab/schema.js`): `{tables: [{name, fields: [{name, type}], key: [field],
sortKey?, indexes?: [{fields, kind: btree | unique | geo | text}], ttl?}]}`. Types: string, text, int,
float, bool, time, geo, json, list, blob. Each engine's `schema` entry in `lab.json` says what it calls
a table and a key, whether it has a sort key or TTL, which index kinds it allows (DynamoDB: one or two
fields, no geo or text; Cassandra and S3: none) and whether every field is searchable (OpenSearch).
`schemaIssues` lists what an engine can't do (errors) and choices that usually hurt (warnings); a schema
in content must be clean and have no errors.

**Read replicas** (`database.replicas {label, min, max, default}` whole numbers from 0, max at most 10,
and `database.writePct`, a percent; both optional): a design's database sets `config.replicas` and
`config.writePct` (the share of the queries reaching it that are writes). Writes all go to the
primary, reads spread over the primary and its replicas, so it takes `qps / (w + (1 − w) / (1 +
replicas))` queries a second; each replica costs what the primary costs. While the primary is down
the replicas still answer reads and writes fail. Replication lag is not modelled.

**Cache behaviour** (all optional; without them a cache is write-through, never cold, and fails its
queries while down): `warmupMinutes` — after a crash the cache comes back empty and its hit rate
climbs from 0 to its hit % over this time, with the misses on the database. `writePolicy` and `onDown`
are choices `{label, default, options: [{id, label, desc}]}` with exactly the ids `through`/`back` and
`database`/`fail`; a design's cache picks one with `config.writePolicy` / `config.onDown`.
Write-back acknowledges writes in the cache and flushes them to the database as its spare capacity
allows (a backlog of unflushed writes builds otherwise); when the cache crashes, that backlog plus the
last `flushSeconds` of writes are lost. `onDown: database` sends a down cache's queries straight to
the database.

**Autoscaling** (`server.autoscaling`, optional): `{label, minLabel, maxLabel, note, targetPct,
warmupMinutes, scaleInMinutes, defaultMax}`. A server with `config.autoscale: true` runs between
`count` and `maxCount` instances (both within `count`'s range), adds instances to stay near
`targetPct` % load (they arrive `warmupMinutes` later) and removes them after load has stayed low for
`scaleInMinutes`. `note` explains this to the user, so keep its numbers in step with the fields. `crash` is
`{above, minutes, downMinutes, failoverMinutes?}`. Settings ranges are `{label, min, max, default}`
(percentages 0–100). The `example` design is checked too: unique node ids, numeric `x`/`y`,
settings inside their ranges, and edges that never point into Clients or out of a Database.

## Changing content

1. Edit the JSON (new article: add the file and its entry in `articles/index.json`).
2. `cd backend && npm test` (includes the same validation the deploy runs).
3. Open a PR. Merging to `main` runs the backend deploy, which publishes a new release; the site shows it within about a minute (API responses are cached for 60 s).
