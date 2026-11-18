# redesign-3d: Tech Katta rebuilt around a live 3D system

**Live:** https://prototype.katta.cc/p/redesign-3d/ (branch `prototype`). Owner, 2026-11-18: "You don't need to follow
tech katta UI UX and widget placements for the new prototype. You can think and redesign everything."

## The idea
Watching a system fail teaches more than reading about it. Here the live 3D system is the product, not decoration:
- **Landing** (`#/`): one incident told in six scroll steps over the 3D world, then the three ways in.
- **Learn** (`#/learn`): a plain list of tracks; hovering a lesson rebuilds, on the right, the system it ends with.
- **Lessons** (`#/learn/<id>`): scroll stories. Each step sets the system's design, colours and labels.
- **Simulator** (`#/sim/<id>`): add app servers, cache nodes, read replicas, a queue, a CDN; Run plays the evening at
  two ticks a second; parts glow amber when busy, orange when they fail; then a verdict with what broke and the lesson
  that explains it. Click a part in 3D to see what it does.
- **You** (`#/me`): lessons read, incidents survived, best runs (this device only). No streaks or badges.
One top bar (Learn · Incidents · Simulator · You), no sidebar.

## Scroll drives the animation, then the words take over
`story.js`: each chapter after the opening is a tall section in two phases.
While it scrolls into place, its scroll position blends the world from the previous chapter to this one (camera,
parts rising one by one, colours, glows, paths: `world.setState(next, { from, mix, reveal })`); the scene is centre
stage and there are no words. Then the section pins: its words fade in (`--t`) and the scene slides aside. Nothing runs
on a timer, so scrolling back plays it backwards.

## The look is Tech Katta's own
Owner, 2026-11-18: "I don't want the UI to be exactly the same as rca.gg, I don't want any legal issues." The owner then
chose pastels: "Make the multi-pastel version that's our own." So the palette is the app's six section pastels as a
family (sky, lilac, peach, mint, lemon, rose), never a single lavender with a single violet: each kind of part has its
own pastel (app servers sky, load balancer lilac, cache peach, databases mint, queue lemon, CDN rose), headlines get a
sky-lilac-peach highlighter, failure glows coral red, busy amber, healthy keeps its colour with a green halo. Type is
Instrument Sans and Geist Mono; models are single matte blocks with marigold lights; tags, a vertical chapter rail, a
dot grid. A paper-and-ink variant is kept on the branch `redesign-3d-paper-ink`. Keep it that way:
take ideas (scroll-driven story, 3D systems) from other sites, never their palette, fonts, shapes or components.

## One palette, everywhere (owner: "Pastel colours chosen for those 3D components should remain consistent across
the website")
`scripts/palette.js` is the only place the pastels live (brighter since 2026-11-18, owner: "Choose some brighter colours, but still don't copy rca.gg"; the lilac leans orchid, away from lavender; NeutralToneMapping keeps them saturated in 3D): each kind of part has one (app servers sky, load balancer
lilac, cache peach, databases mint, queue lemon, CDN rose, users mist). `world.js` colours the models from it and
`applyPaletteVars()` writes the same values as CSS variables (`--sky`, `--k-server` …) for the page: legend chips,
label dots, highlighters, tints. Status never replaces a part's colour except failure: busy adds an amber halo,
healthy a green one; broken turns coral red so it stands out.

## The landing (owner: "every animation should be 3D")
Every motion on the landing is 3D: the opening system builds itself (parts rise one by one), then scroll-driven
chapters: the spike, it breaks, find the cause, fix it, the parts (the legend), learn, simulate, what you will design
(one real system per figure: a chat app, `chatApp()` in landing.js, passed as `step.system`; owner: "I need one
system in one figure"), your turn (free, Google sign-in).
Below the 3D, plain text with no 2D animation: who it is for, who teaches it, questions. No flat
cards or charts. The Incidents page was removed (owner: "Remove the incidents thing"); the simulator still opens
with the IND vs PAK scenario.

## Files
| File | Role |
|---|---|
| `scripts/world.js` | the 3D engine (three.js, vendored): systems as data, parts rise in and sink out, states, labels, camera, picking |
| `scripts/palette.js` | the pastels: one per kind of part, for the 3D models and the page |
| `scripts/vendor/RoomEnvironment.js` | three.js 0.170 add-on (soft studio lighting for the matte pastels) |
| `scripts/sim.js` | the traffic model, prices, the layout of a design, the incidents (tuned: each start design fails; several designs pass) |
| `scripts/content.js` | tracks and lessons (four written: load balancing, caching, read replicas, queues) |
| `scripts/story.js` | a scroll story: steps over a sticky 3D stage (landing, lessons) |
| `scripts/app.js` | hash router, top bar, theme |
| `scripts/pages/*.js` | one module per page; each returns a cleanup that frees its 3D context |
| `styles/app.css` | every colour as a token, light and dark |

## The model (sim.js)
App server 10k req/s · cache node 80k, holds 1/n of the keys, re-warms over 5 s after a node dies · database 6k
reads/s + 4k writes/s, each replica +6k reads · queue holds writes the primary cannot take · CDN answers the static
share · a replica is promoted 2 s after the primary dies. Pass: errors under 1 %, p99 under the incident's limit, cost
within budget. To retune, run every design against every incident (5 × 4 × 4 × 2 × 2) and check that the start design
fails and at least one design passes within budget.

## Unslop pass (2026-11-18)
Owner: "Use this skill: https://github.com/heydamir/unslop". The landing was audited against unslop's signs and
fixed in its passes. unslop is by Damir Sokolovsky (@heydamir), CC BY 4.0; this prototype follows its guidance, no
code or images were copied. Direction: patient, exact, a little playful; a workbench of small models in daylight on a
match night. Moment: the bright 3D system, one per screen; the chrome around it is quiet. Signature: a part named in
the text carries its colour dot (`pd()` in landing.js). Removed: the gradient headline highlighter and gradient
buttons, the coloured washes and dot grid behind the page, uppercase tracked labels, full stops on headlines. Hero:
text on the left, the system on the right.

## The landing's system: an event pipeline (2026-11-18)
Owner: "this looks rca.gg copy … instead of servers, cache, database have something else, like servers producing to
Kafka, then a Kafka consumer consuming that and putting it in an SQL db." The landing tells one IND vs PAK fantasy
night through `pipe()` in landing.js: users → app servers (producers) → a Kafka topic → a consumer group → an SQL
database. New 3D kinds in world.js: `kafka` (partition logs with segment ticks and an orange backlog bar that grows
and drains with `state.fill`) and `consumer` (an octagonal worker). Colours: Kafka lemon (the colour of waiting
messages, as the queue), consumer lime (new). Chapters: the spike (lag 0) → it breaks (database slow, lag 2.1M,
nothing lost) → fix it (6 partitions, 6 consumers, batched writes; lag drains) → the parts → learn and build →
a chat app → your turn.

## 2026-11-19: Dashboard, Learn and concept articles
- **Learn** (`#/learn/<section>`): four tabs (concepts, components, interview questions, real systems) with the real
  66 articles from `tech-api.katta.cc/v1/articles` (bundled snapshot in `scripts/data/articles.js` if offline). A 3D
  preview of each article's figure rebuilds on hover; on phones it stays at the top and follows the middle row.
- **Articles** (`#/learn/<section>/<slug>`): a 3D scroll story (`scripts/figures.js`, slug → steps), then the full
  article from the API with every block type. Wide screens keep a 3D figure beside the text that follows its sections.
  Reaching the end marks it read. Hand-built stories: networking, caching, sharding, consistent hashing, CAP; the
  rest get a generic figure until their own recipe is written.
- **Dashboard** (`#/me`, `#/dashboard`): one 3D system whose parts carry the 21 concepts; a part turns amber when
  started and green when all its concepts are read; tap a part to open its next concept.
- The four sample lessons are gone; their old links redirect to the matching concept.
- **All 21 concepts and all 10 components** now have their own 3D story in `scripts/figures.js` (one system per
  figure, 3–4 chapters, words and numbers taken from each article's own text and figure captions). Interview
  questions and real systems still use the generic two-step figure.
