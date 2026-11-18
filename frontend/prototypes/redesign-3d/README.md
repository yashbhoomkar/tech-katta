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
Every motion on the landing is 3D: the opening system builds itself (parts rise one by one), then nine scroll-driven
chapters: the spike, it breaks, find the cause, fix it, the parts (the legend), learn, simulate, your turn. No flat
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
