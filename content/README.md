# Site content

Everything tech.katta.cc shows comes from these JSON files. The API (`backend/`) validates them and serves them at `tech-api.katta.cc`; the frontend only renders what it receives.

```
content/
├── site.json                    landing page, dashboard chrome, footer   → GET /v1/site
│                                ("example": id of the example system below)
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

An article is `{section, slug, no, tag, date, title, dek, body: [...]}` (optional `audio: true` once narration is recorded with `tools/tts`). Body blocks; text may use `` `code` ``:

- `tldr {items}` the "In 30 seconds" box · `example` the example-system box · `h2 {x}` · `p {x}` · `list {items}`
- `fig {id, cap}`: `id` must be a figure the frontend can draw: `patterns`, `choose`, `order`, `retry` (`FIGS` in `frontend/src/dashboard.jsx`)
- `type {name, kind, what, use, avoid, ex, more: [p…]}` one card per type; `more` is collapsed
- `code {label, x, say}` preformatted; `say` is read aloud instead of the code
- `table {head, rows}` · `more {label, body: [blocks]}` collapsed "Go deeper" section (not read aloud)

## Changing content

1. Edit the JSON (new article: add the file and its entry in `articles/index.json`).
2. `cd backend && npm test` (includes the same validation the deploy runs).
3. Open a PR. Merging to `main` runs the backend deploy, which publishes a new release; the site shows it within about a minute (API responses are cached for 60 s).
