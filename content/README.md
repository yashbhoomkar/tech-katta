# Site content

Everything tech.katta.cc shows comes from these JSON files. The API (`backend/`) validates them and serves them at `tech-api.katta.cc`; the frontend only renders what it receives.

```
content/
├── site.json                    landing page, dashboard chrome, footer   → GET /v1/site
│                                ("example": id of the example system below)
├── lab.json                     the design canvas's catalogue, challenges and example design → GET /v1/lab
├── eval.json                    the v2 evaluator's catalogue (served inside /v1/lab as `eval`); see below
├── examples/
│   └── zotato.json              the example system articles explain things through
└── articles/
    ├── index.json               which articles exist, in site order: ["concepts/networking-essentials", …]
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

What there is (owner, 2026-11-09 and 2026-11-10): the technical articles follow the reference site's system design
library, no more and no less, in our own words, figures and examples (don't name that site on ours).
- **Sections** (`site.json` `dashboard.sections`): Concepts (Core concepts, Recurring patterns, Specialised data),
  Components (Tools by name), Interview Questions (Start here: seven guides; then the problems), Quick Notes, Real
  systems (case studies, each retelling one company's public engineering post and citing it). The Problems tab is
  added by the frontend from `site.json` `problems`. **There is no Lab tab** (removed 2026-11-10): the design canvas
  opens inside a problem's workspace, in a challenge opened from Problems (`/dashboard/problems/challenge/<id>/`),
  and in the landing page's IND vs PAK.
- **Interview Questions**: the reference's 32 problem breakdowns plus IND vs PAK (QUESTION // 22, group `hard`),
  each with `practice` (below). On 2026-11-10, 21 of the 32 are written; the other 11 are being added.
- A section without a library card gets its header from `dashboard.heads[<section>]` = `{eyebrow, desc}`.
- A topic with several parts keeps them as `h2` parts with `h3` sections. Figures live in one module per sub-tab or,
  for a long article, per article: `frontend/src/figs/<section>/<name>.jsx` (see `fig` below).

`access` is `"free"` or `"paid"`: who can read it once subscriptions start. It is data only for now (nothing is
locked and nothing shows it). Free: only How to answer, until the owner picks more. Everything else is paid, and an article with
`practice` (a problem) must be paid (the validator checks it). The challenges and videos are paid too.

An article is `{section, slug, no, tag, access, date, title, dek, body: [...]}` (optional `audio: true` once narration is recorded with `tools/tts`; optional `group`, see Subsections). Body blocks; text may use `` `code` ``:

- `example` the example-system box · `h2 {x}` · `p {x}` · `list {items}`
- `fig {id, cap}`: `id` must be a figure the frontend can draw. Figures are organised by sub-tab (the `group` of `dashboard.groups` in `site.json`): each sub-tab with figures has `frontend/src/figs/<tab>/<sub-tab>.jsx`, exporting `FIGS` (id → component), and `backend/src/content/figs/<tab>/<sub-tab>.js`, listing the same ids, e.g. `figs/concepts/caching.jsx` and `content/figs/concepts/caching.js`. Shared drawing parts are in `frontend/src/figs/parts.jsx`. A figure lives in the sub-tab it was made for; any article may still use it by id. A new figure goes in its sub-tab's two files; a new sub-tab adds both files and a line in each `figs/index.js`. A backend test checks the two folders, both indexes and every pair of id lists match.
- `type {name, kind, what, use, avoid, ex, more: [p…]}` one card per type; `more` is collapsed
- `code {label, x, say}` preformatted; `say` is read aloud instead of the code
- `table {head, rows, label?}` (`label` names it for screen readers) ·
- `lab {x, to, go?}` "Try it on the canvas" card: `to` is a dashboard route, `problems/<problem slug>` (an article with `practice`) or `problems/challenge/<challenge id>` (one of `lab.json`'s challenges); both are checked; `go` the link text · `more {label, body: [blocks]}` collapsed "Go deeper" section (not read aloud)

## Problems: tests for an Interview Question (`practice`)

Every Interview Question except "Start here" has a `practice` object, which turns it into a LeetCode-style
problem: the visitor writes an answer and builds a design on the canvas, and the v2 evaluator
(`frontend/src/eval/`; `judge()` in `frontend/src/judge/judge.js` calls it) runs the tests against that design:
it compiles the design into a plan for each call, simulates every test minute by minute, analyses it for
correctness and checks the results. Nothing is compared with a model answer. The full format is in
tech-katta-context `evaluator.md` §6; the URL shortener fixture `frontend/src/eval/fixtures/url-shortener.v2.json`
is a worked example. Every practice is `"v": 2` (the v1 format was removed in #301; the validator refuses it).

```
practice: {
  v: 2,
  brief,                          what the tests send, shown above the example tests
  entities: {name: {rows, rowBytes, fields: {field: type}, sample: [≥ 2 rows], growthPerDay?, expires?}},
  aliases?: {field: [other names]},          other names a learner may give a field
  operations: [{id, name, kind: read | write | connect, request, share, steps, respond, bytesOut?,
                keys?, cacheable?, live?, slo?, consistency?, durable?, effect?, idempotencyField?, ordered?,
                source?: clients | external | schedule, perSec?}],   the Clients' shares add up to 1
  tests: [trace test {id, name, desc, op, sample?}             one per operation
        | load test {id, name, desc, sample?, hours, startHour, traffic: {rps, pattern}, faults?, checks}],
  start: {nodes, edges},          the design a visitor starts from
  locked?: [node id],             start nodes the visitor can't remove (e.g. a third party)
  rubric: {fr, nfr, est, api, decisions},   the written steps (below)
  hints: [{step, x}],             step: requirements, estimates, api, design or deep; nudge → near-answer
  referenceNote?: text,           shown under the solution design
  reference: {nodes, edges},      passes every test; shown on the Solution tab (GET /v1/articles/<slug>/solution)
  wrong: [{name, why, fails, nodes, edges}],   each fails the test `fails` names
  mutantsAllowed?, mutantsAllowedWhy?        the reference's mutants that are rightly still accepted
}
```

- **Steps:** `get`, `query` (where, range, order, limit, near, text), `put` (unique?), `update` (set, add,
  cond), `incr`, `rank`, `sum`, `tx`, `blob`, `call` (a third party, by `preset`), `publish`, `compute`
  (cpuMs, isolated?). A step may be deferred (`timing: "defer", withinSec`), done a fraction of the time
  (`times`) or, by a stream processor, once every n events (`batch`).
- **Load test checks:** `slo`, `completes`, `fresh`, `noCrash`, `noLostWrites`, `noDuplicates`, `ordered`,
  `atomic`, `fits`, `cost` and `has`. **Faults:** `crash`, `zoneDown`, `groupDown`, `instanceCrash`, `slow`,
  `spike`, `hotKey`, `poison`, `abuse`; minutes are multiples of the tick (1 minute up to 6 hours, else 5).
- At least one test of each kind is `sample` (shown, run by Run); Submit runs all.
- **Designs:** `start`, `reference` and `wrong` designs come out of the v2 cleaning unchanged; the reference's
  schemas have no errors. `reference`, `wrong` and the mutant lists are never served with the article.
- **Calibration:** `node tools/eval/calibrate.mjs <article.json>`: the reference is accepted, each wrong design
  fails its test, every mutant is killed or allowed (at most a fifth), and the reference with every count doubled
  passes everything but cost. `cd frontend && npm test` runs it for every problem, so content changes run the
  frontend CI. Budgets: the reference's fixed costs (storage, transfer, per-request parts) + 1.6 × the rest.

Rubric (the written steps): `fr: [{label, keys}]`, `nfr: {availability, p99, readsPerWrite: [min, max],
consistency}`, `est: [{id, label, unit, answer, tol?, how?}]`, `api: [{label, method, path (regex)}]`,
`decisions: [{id, q, options (2–6), answer (index), why}]`. Scoring (out of 100): functional requirements 10
(keywords), non-functional 5 (ranges), estimates 10 (within `tol`×, default 3), API 10 (method + path regex),
key decisions 15 (exact), design 50 (the evaluator's design score: function 15, scale 15, resilience 10,
correctness 5, cost 5); each hint opened −3, at most −15.

## Challenges (`lab.json` `challenges`)

Eight short scenarios on Problems (`/dashboard/problems/challenge/<id>/`), each a small v2 problem (#300):
`{id, level, title, brief, hint, v: 2, hours, startHour, traffic, faults?, entities, operations, stars, start}`.
`stars` (1–3) are the scenario's checks: `availability {min, from?, to?}`, `cost {max}`, `noCrash {type?}`,
`noLostWrites`, `completes {withinSec?}`; the first must be met for any star to count.
`frontend/src/eval/challenge.js` scores a design. Each challenge's reference design (earns every star) is a test
fixture, `frontend/src/eval/fixtures/challenge-references.json`, not content, since `lab.json` is served to
everyone; `frontend/src/lab/challenges.test.js` checks every start scores 0 and every reference every star.

## Subsections

`site.json` `dashboard.groups` maps a section to its subsections, in order: `{"components": [[id, label,
description], …]}`. An article in that section sets `"group": "<id>"`. The section page lists each
subsection with its articles (an empty one shows `dashboard.groupEmpty`), and the sidebar groups the
section's articles the same way. Sections without groups show one plain list.

Components subsections and the planned articles (in writing order): **Edge**: load balancers, CDNs,
API gateways and rate limiting · **Compute**: app servers and autoscaling · **Storage**: caches,
databases, sharding and partitioning, object storage · **Messaging**: queues vs event streams.

## Lab catalogue (`lab.json`)

`{title, smallScreen, components, example, levels, challenges, import?, …}` (the v1 keys `budget`, `retries` and
the v1 notes are refused since #301). Each component has `type, name, group, desc` plus the numbers its type needs
(checked by `backend/src/content/validate.js`; sizes and prices read by `frontend/src/lab/engine.js`, simulated by
the v2 evaluator with `eval.json`):

| type | fields | how it behaves |
|---|---|---|
| `client` | `rps {label,min,max,default}`, optional `patterns` | sends the test's traffic (its `rps` at the busiest moment of the pattern) |
| `apigw` | `latencyMs, limitRps, pricePerMillion` | throttles past its limit, never crashes |
| `lb` | `latencyMs, limitRps, hourly, lcuHourly, rpsPerLcu` | spreads load evenly; billed per hour + per LCU |
| `server` | `latencyMs, sizes [{id,label,rps,hourly}], defaultSize, count, crash`, optional `autoscaling` | runs the operations' steps; `rps` is its capacity in work units a second |
| `queue` | `latencyMs, limitRps, pricePerMillion` | async: the sender is done once the message is stored; workers take what they can, the rest waits as a backlog |
| `cache` | `latencyMs, sizes [{id,label,ops,hourly}], defaultSize, crash`, optional `warmupMinutes, flushSeconds, writePolicy, onDown` | Server → Cache → Database: hits are worked out from the keys' popularity and the TTL; misses and writes reach the database |
| `database` | `latencyMs, sizes [{id,label,qps,hourly}], defaultSize, multiAz, crash`, optional `replicas, engines, defaultEngine, features` | receives only |

`client`, `apigw`, `server` and `database` are required; the others are optional. The v1 settings
`queriesPerRequest`, `hitPct`, `writePct`, `roles` and the CDN's `live` are refused (#302): a design's load comes
from the problem's operations, not from settings on its parts.

**Traffic through the day** (`client.patterns`, optional): `[{id, label, short, desc, points}]`.
`points` are `[hour, multiplier]` pairs from hour 0 to hour 24, hours never going back (two points
at the same hour make a jump), multipliers 0–1 with at least one 1: a test's traffic is `rps × multiplier`,
linear between points, repeating every simulated day. A test names its pattern (`traffic.pattern`).

**Database engines** (`database.engines`, optional; with `defaultEngine` and `features: [{id, label}]`):
`[{id, label, family, aws, desc, capacity: "instance" | "request", multiAz: "option" | "builtin" | "none",
replicas, crash, features: [feature id], aliases?, latencyMs?}]`. An `instance` engine has `sizes` +
`defaultSize` (or uses the component's), is billed per hour and may crash. A `request` engine has
`limitQps`, `readPerMillion`, `writePerMillion` (billed at 20% writes), `crash: false`
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

**Read replicas** (`database.replicas {label, min, max, default}`, whole numbers from 0, max at most 10;
optional): a design's database sets `config.replicas`. Writes all go to the primary; reads spread over the primary
and its replicas (or only the replicas, `readFrom: replicas`, a moment behind); each replica costs what the
primary costs.

**Cache behaviour** (all optional): `warmupMinutes`: after a crash without a replica the cache comes back empty
and fills again over this time, with the misses on the database. `writePolicy` and `onDown` are choices
`{label, default, options: [{id, label, desc}]}` with exactly the ids `through`/`back` and `database`/`fail`; a
design's cache picks one with `config.writePolicy` / `config.onDown`. Write-back acknowledges writes in the cache
and saves them later: when the cache crashes, the last `flushSeconds` of writes are lost. A cache with a replica in
another zone fails over in a minute and keeps its data. `onDown: database` sends a down cache's reads straight to
the database.

**Autoscaling** (`server.autoscaling`, optional): `{label, minLabel, maxLabel, note, targetPct,
warmupMinutes, scaleInMinutes, defaultMax}`. A server with `config.autoscale: true` runs between
`count` and `maxCount` instances (both within `count`'s range), adds instances to stay near
`targetPct` % load (they arrive `warmupMinutes` later) and removes them after load has stayed low for
`scaleInMinutes`. `note` explains this to the user, so keep its numbers in step with the fields. `crash` is
`{above, minutes, downMinutes, failoverMinutes?}`. Settings ranges are `{label, min, max, default}`
(percentages 0–100). The `example` design is checked too: unique node ids, numeric `x`/`y`,
settings inside their ranges, and no v1 settings.

## Tours (`site.json` `tour`)

The Tour button in the dashboard opens the tour for the page it is on (`frontend/src/dashboard/shell.jsx` picks it):
`tour.concepts`, `components`, `interview-questions`, `quick-notes`, `real-systems` on a section's list (else
`tour.section`), `tour.article` on an article, `tour.problems` on the Problems list, `tour.problem` in a problem's
workspace, `tour.lab` on a challenge, `tour.dashboard` on the start page. Each is a list of steps
`{target, title, text, click?, cta?}`: `target` is a CSS selector (a step whose target is missing or hidden, such as the
sidebar on a phone, is skipped); `click` is clicked first to open what the step shows; `cta {label, href}` on the last
step is a link that closes the tour and goes there (hash routes, e.g. `#concepts/networking-essentials`).

How to write one (owner, 2026-11-12): say what the page is for, the order to use it in, what is inside and how it
links to practice, in five steps or fewer, and end on one first step (`cta`). Point at content, not at the sidebar or
the theme button. Signed out, pages are behind the sign-in card: when a page's tour can show fewer than three steps,
`tour.dashboard` is shown instead, starting with its sign-in step (`.lock-card`). Check a new tour on a phone and
signed out.

## Changing content

1. Edit the JSON (new article: add the file and its entry in `articles/index.json`).
2. `cd backend && npm test` (includes the same validation the deploy runs).
3. Open a PR. Merging to `main` runs the backend deploy, which publishes a new release; the site shows it within about a minute (API responses are cached for 60 s).

## The v2 evaluator's catalogue (`eval.json`)

What the v2 evaluator (tech-katta-context `evaluator.md`) needs on top of `lab.json`: tick lengths, retries,
limits, the work units each kind of step costs, each database engine's capabilities and storage price, and for each
component type its settings (`number`, `choice`, `bool`, `size`, `fields`, `engine`, `schema`, `structures`), the
arrows it may draw (`to`, `toIf` for conditions on the target, `toCdc` for a database's change stream) and extra
size numbers (`sizeExtras`, e.g. a cache's `memoryGb`). Sizes, prices, latencies and crash policies stay in
`lab.json`. `backend/src/content/validate-eval.js` checks it. Every problem and challenge uses it.

## Practice problems (`problems2/`), LeetCode style

The problems of `/dashboard/practice/` (specification: `tech-katta-context/21-PROBLEM-EXPERIENCE-LEETCODE-STYLE.md`).
`problems2/index.json` lists `NNN-slug` files in order (`{"problems": ["001-url-shortener"]}`); each file is one problem:
`id`, `slug`, `title`, `difficulty`, `topics`, `companies`, `free`, `statement` (Markdown, at most 200 words),
`constraints`, `total_items`, `requests`, `tables_hint`, `template` (TKD text), `tests` (phases, events, promises; `hidden`),
`reference` (TKD), `wrong` (designs with the verdict each must get), `hints`, `editorial` (Markdown). The answer is a
design in TKD text; the judge is `frontend/src/tkd/` (the same files in the browser and the API).

Checked when content loads (so by the deploy too): the shape, and the calibration — the reference is Accepted with
10 % to spare on every promise, each wrong design gets exactly its verdict, at least 2 visible and 3 hidden tests, the
template only unfinished (E022/E029/E030). The API never serves hidden tests' numbers, the reference, wrong designs or the
editorial except through their endpoints. Before adding or changing a problem, run
`node backend/scripts/sweep-problem.mjs <slug>` and paste its summary into the pull request; then
`UPDATE_GOLDEN=1 npm test` in `frontend/` regenerates `src/tkd/golden/<slug>.json` (review the diff).
