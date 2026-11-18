# redesign-3d: Tech Katta rebuilt around a live 3D system

**Live:** https://prototype.katta.cc/p/redesign-3d/ (branch `prototype`). Owner, 2026-11-18: "You don't need to follow
tech katta UI UX and widget placements for the new prototype. You can think and redesign everything."

## The idea
rca.gg teaches by letting you watch a system fail. Here the live 3D system is the product, not decoration:
- **Landing** (`#/`): one incident told in six scroll steps over the 3D world, then the three ways in.
- **Learn** (`#/learn`): a plain list of tracks; hovering a lesson rebuilds, on the right, the system it ends with.
- **Lessons** (`#/learn/<id>`): scroll stories. Each step sets the system's design, colours and labels.
- **Incidents** (`#/incidents`): five Indian evenings (IND vs PAK, a ticket sale, a big sale, salary day, election
  results), each a traffic curve, the failures that happen and a budget in rupees.
- **Simulator** (`#/sim/<id>`): add app servers, cache nodes, read replicas, a queue, a CDN; Run plays the evening at
  two ticks a second; parts glow amber when busy, orange when they fail; then a verdict with what broke and the lesson
  that explains it. Click a part in 3D to see what it does.
- **You** (`#/me`): lessons read, incidents survived, best runs (this device only). No streaks or badges.
One top bar (Learn · Incidents · Simulator · You), no sidebar.

## Files
| File | Role |
|---|---|
| `scripts/world.js` | the 3D engine (three.js, vendored): systems as data, parts rise in and sink out, states, labels, camera, picking |
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
