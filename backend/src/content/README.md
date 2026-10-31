# Site content

All copy on tech.katta.cc is served from here by the API; the frontend has no content of its own.

| File | Served at | What |
|---|---|---|
| `site.js` | `GET /v1/site` | Landing page (brand, nav, hero, topics, notes, numbers, footer) and dashboard chrome. `example` is added to the response. |
| `example.js` | in `/v1/site` and every article | The example system articles use (Zotato). |
| `articles/<slug>.js` | `GET /v1/articles/<slug>` | One article. List it in `index.js`. `GET /v1/articles` returns summaries. |

Article body blocks (`body: [...]`; text may use `` `code` ``):

- `tldr {items}` "In 30 seconds" box · `example` the example-system box · `h2 {x}` · `p {x}` · `list {items}`
- `fig {id, cap}` figure; `id` must exist in the frontend's `FIGS` registry (`patterns`, `choose`, `order`, `retry`)
- `type {name, kind, what, use, avoid, ex, more: [p…]}` one card per type; `more` is collapsed
- `code {label, x, say}` preformatted; `say` is read aloud instead of the code
- `table {head, rows}` · `more {label, body: [blocks]}` collapsed "Go deeper" section (not read aloud)

Optional article field `audio: true` means narration was recorded with `tools/tts` (only for final content).

Changing content = edit here, run `npm test` in `backend/`, open a PR. Merging to `main` deploys the API; the site picks the change up within a minute (responses are cached for 60 s).
