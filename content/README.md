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

An article is `{section, slug, no, tag, date, title, dek, body: [...]}` (optional `audio: true` once narration is recorded with `tools/tts`; optional `group`, see Subsections). Body blocks; text may use `` `code` ``:

- `tldr {items}` the "In 30 seconds" box · `example` the example-system box · `h2 {x}` · `p {x}` · `list {items}`
- `fig {id, cap}`: `id` must be a figure the frontend can draw: `patterns`, `choose`, `order`, `retry` (`FIGS` in `frontend/src/dashboard.jsx`), `lb-spread`, `lb-algos` (`COMPONENT_FIGS` in `frontend/src/figs/components.jsx`). A new figure is added in both places and in `FIGS` in `backend/src/content/validate.js` (a test checks they match)
- `type {name, kind, what, use, avoid, ex, more: [p…]}` one card per type; `more` is collapsed
- `code {label, x, say}` preformatted; `say` is read aloud instead of the code
- `table {head, rows, label?}` (`label` names it for screen readers) ·
- `lab {x, to, go?}` "Try it in the Lab" card: `to` is `lab` or `lab/<challenge id>` (checked against `lab.json`), `go` the link text · `more {label, body: [blocks]}` collapsed "Go deeper" section (not read aloud)

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
| `database` | `latencyMs, sizes [{id,label,qps,hourly}], defaultSize, multiAz, crash` | receives only |

`client`, `apigw`, `server` and `database` are required; the others are optional.

**Traffic through the day** (`client.patterns`, optional): `[{id, label, short, desc, points}]`.
`points` are `[hour, multiplier]` pairs from hour 0 to hour 24, hours never going back (two points
at the same hour make a jump), multipliers 0–1 with at least one 1: the Clients send `rps ×
multiplier`, linear between points, repeating every simulated day. The first pattern is the default.
`label` is the menu entry, `desc` the line under it, `short` what the canvas shows on the Clients box.
A design's Clients pick one with `config.pattern`.

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
