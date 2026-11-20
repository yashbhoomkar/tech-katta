# redesign-3d: Tech Katta rebuilt around a live 3D system

**Live:** at an unlisted address on prototype.katta.cc that the owner shares directly (branch `prototype`). It used to be /p/redesign-3d/; that address leaked and was retired on 2026-11-20. Do not write the new address in the repository, commit messages or docs, and do not add a redirect from the old one. Owner, 2026-11-18: "You don't need to follow
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
| `scripts/world.js` | the 3D engine (three.js, vendored): systems as data, parts rise in and sink out, states, labels (free or edge callouts), camera, picking, adaptive quality, accessible names |
| `scripts/story.js` | a scroll story: steps over a sticky 3D stage (landing, article stories) |
| `scripts/tour.js` | the guided tour: first-visit offer, coral spotlight that follows its target, step card placed clear of it |
| `scripts/figures.js` | a 3D recipe for every one of the 66 articles, and the section previews |
| `scripts/articles.js` | the live article API with a bundled fallback; section groups, component groups, interview questions' second lines |
| `scripts/data/articles.js` | the fallback snapshot of the article list |
| `scripts/sim.js` | the traffic model, prices, the layout of a design, the five practice problems |
| `scripts/shell.js` | the app frame: sidebar (with a windowed article list), rail mode, places |
| `scripts/app.js` | hash router, page titles, scroll restore, view transitions, theme |
| `scripts/store.js` | progress on this device (articles done, best practice scores) |
| `scripts/palette.js` | the pastels: one per kind of part, for the 3D models and the page |
| `scripts/boot-theme.js` · `scripts/ui.js` | theme before first paint · small shared helpers |
| `scripts/pages/*.js` | one module per page (landing, me, learn, article, practice, sim); each returns a cleanup that frees its 3D context |
| `scripts/vendor/` | three.js 0.170 and its RoomEnvironment add-on |
| `styles/app.css` | every colour as a token, light and dark; the shared scale is in its later blocks |
| `AUDIT.md` | every UI/UX audit (five passes, 75 findings) and what was done about each |

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
- **Every one of the 66 articles** has a 3D story: real systems show what each company changed; interview
  questions show their high-level design, then two deep dives. A chapter that names a section (`h2`) takes its words
  from that section at run time. The reader also renders the API's option cards (`type`: first try, better, what
  you'd ship) and analogies, which had been skipped.

## 2026-11-19: the app frame, and words that rise
- **Landing words** were popping in: hidden until the chapter pinned, then fully opaque within ~8% of a screen while
  moving 10–24 px (and the outgoing card slid down). Now the incoming card rises from the bottom over ~0.4 screen of
  scroll, eased (`--t`), and the outgoing one fades only as it scrolls off the top (`--o`).
- **App frame** (`scripts/shell.js`), after tech.katta.cc's own: a left sidebar on wide screens (Home, Dashboard,
  Learn by section with read counts and the open section's articles, Practise; the active fill slides between rows;
  `[` folds it to an icon rail; the simulator folds it automatically). Phones keep the glass bottom bar, now
  Home · Learn · Practice · Dashboard. The landing keeps its own top bar.
- **Home** (`#/home`): a live 3D figure of what to read next, then one card per sidebar place (same names, colours,
  icons) with progress and what is next; cards slide up in turn; on phones a sideways-swipe deck with dots.
- **Motion**: sideways page slides between app pages (view transitions, direction from the sidebar order); on phones,
  swipe the Learn list to change tab (it follows the finger, rubber-bands at the ends).
- **Inside a section and an article** (after tech.katta.cc): section pages have a header with a progress card (x of
  y done, next up, Start/Continue), group jump links (a sliding-pill difficulty filter on interview questions),
  groups with "x of y done", rows with a status tick, number, title and tag; the 3D preview stays beside the list.
  The reader has a reading-progress line, breadcrumbs, number and tag, read time ("with details"), a Completed chip,
  Full text / Cards (a sliding pill; Cards opens one topic at a time, swipe or step between them), Share, a right
  rail with the 3D figure, "On this page" that follows you and the group's lessons, and "Mark complete & next"
  (a burst in the part colours, a toast). Articles now count as read when marked complete, as on tech.katta.cc.
- **One page, not two** (owner: "Why home and dashboard are different pages. There should be only dashboard page"):
  Home is merged into the Dashboard: the 3D system and next concept, then a card per place (Concepts, Components,
  Interview questions, Real systems, Practice) with progress, then recently read and the parts' concepts. `#/home`
  redirects to `#/me`; the sidebar and phone bar start with Dashboard.
- **3D only draws while visible**: world.js pauses its render loop when the canvas is off screen (and, as before,
  when the tab is hidden). Measured: ~550 draw calls a second on screen, 0 when scrolled away.
- **One shot per landing chapter** (owner: "if we don't give that much attention to the animation it appears as if
  the animation is just zooming in and out ... zoom into database, kafka, database or something like that"): the
  camera no longer moves closer then back for every chapter (`cam.hold` in story.js). It travels: the whole
  pipeline → a low dolly onto the slowing SQL database (Learn) → an orbit round the Kafka topic (Interview) → a crane
  up over the whole pipeline (Practice).

## 2026-11-19: audit fixes
All 32 findings in `AUDIT.md` are addressed (status table at the top). New `#/sim` Practice page; Home/Practise/read wording
unified; one scale for heading sizes, radii, button heights, label size, text colours and card hover (last block of
app.css); drawn tick; icon theme button; tablets get the bottom bar; 83 dead rules removed.

- Third audit pass: Dashboard 3D follows list focus/hover; the shared scale no longer uses `!important` (older label rules fixed at the source, verified element by element).
- **The landing's 3D is clickable** (an industry leader took it for something to click and did not scroll): click or tap
  any part for a glass card with what it does in this pipeline, what is happening to it in the current chapter (or the
  question interviewers ask about it), and the article that teaches it. The colour key in Learn is a row of buttons
  that open the same cards. Scrolling still works over the 3D and closes the card; Esc and × close it too. The hero
  says "Tap any part to see what it does · scroll to play". Phones get the card as a sheet above the bottom bar.
- **Dashboard labels on phones are callouts** (owner: "every label is very congested"): two columns at the left and right
  edges, each in its parts' top-to-bottom order, with a thin line to the part (`world.setLabelMode('edge')`). Checked at
  360 and 412 px: 11 labels, no overlaps, none off screen.
- **Dashboard, "Everything here"** (owner: "why do we have Parts and their concepts … the cards should be listed vertically
  for mobile, and for desktop think for it"): "Parts and their concepts" is gone (the 3D and Learn already carry it).
  The places are progress rows: one column on phones, two on tablets, and one row of five cards on wide screens.

## 2026-11-20: explore hint, tour, speed on slow phones, sixth consistency pass

- **The explore hint is a pill** (owner: "make the sentence … either highlighted or do something that it will be visible a
  lot"): a glass pill under the hero buttons, "Tap any part to see what it does" with a pulsing dot and "Scroll to play"
  with a bobbing arrow, plus "Take the tour". A ring pulses on the Kafka topic until the first tap or a scroll past a
  quarter of the screen.
- **One "look here" colour** (owner: "Change the blue ring colour to something that will catch attention"): hot coral
  `--beacon` (#ff4a3d), a hue the 3D never uses, for the tap ring, the hint dot, the tour's spotlight and step dots.
- **A guided tour** (owner: "There should be a popup given to the user on the landing page to take a tour"):
  `scripts/tour.js`. On a first visit a small card (not a modal) offers "Take a 40-second tour" after 1.5 s; any answer
  or scrolling on counts as seen (`tk-r3d-tour`). Six steps move the real page: the whole system, tap the Kafka topic
  (the step waits for the tap, or "Show me"), the part card, a chapter playing as the camera flies to the slowing
  database, the interview questions, practice, ending on "Start preparing". The spotlight dims the rest of the page but
  never blocks taps; the card sits beside it on wide screens and at whichever end of a phone has more room, dropping its
  body on short screens. Back / Next / Skip, arrow keys, Esc, swipe.
- **The tour on every phone** (owner: "Is the tour good for mobile view as well"): tested at 320, 360, 390, 430 px and on
  a sideways phone. On small phones the hero's words fade back and let taps through in the first steps (scrolling them
  away would start chapter one); the offer moves to the top rather than cover the hint; sideways, cards clear the tab
  bar and the spotlight hugs the words. Also fixed: on sideways phones the chapter text was taller than the screen.
- **Adaptive 3D quality** (owner: "Our website loads slow on other people's phone who have a bit slow processor"): the
  download was never the problem (310 KB, first text at 1.2 s); every frame was. Three levels in `world.js`: full (soft
  shadows on a 2048 map), light (hard shadows on a 1024 map, solid glass instead of blur via `html.lite`), lighter (no
  shadows, 30 fps). Phones with 4 or fewer cores, 4 GB or less, or Data Saver start light; a watchdog times about 2 s of
  frames and steps down after two slow windows in a row, live, and remembers it (`tk-r3d-q`).
- **Sharpness is never traded** (owner: "The animations are just too blur"): the first version of the light levels drew
  at 1x pixels without antialiasing, which a 2-3x phone screen stretched. Every level now keeps phones at 1.5x with smooth
  edges; only shadows, frame rate and glass blur change.
- **Sixth consistency pass**: all of the fifth audit's findings (items 51-75 in `AUDIT.md`; item 50 was a false alarm).
  Decisions taken:
  - *Text is pure white / pure black everywhere* (the owner's rule); the two greys are gone from text, hierarchy is size
    and weight. Non-text greys (dividers, leader lines, hollow dots) keep `--mute`.
  - *One type scale*: 12 / 14 / 16 / 18 / 22 / 28 px for text, 40 px for chapter and reader headings, `--h-app` (56 px)
    for every page title including articles; weights 400 / 600 / 700. Desktop went from 44 size/weight pairs to 17; the only non-black/white text left is status green and red, text on inverted buttons, and code on its always-dark block.
  - *One noun for practice*: "problem" (Practice list, scenario page, landing, article call to action). The landing says
    the real count (5).
  - *Components have real groups*: Data stores and search · Streams and workflows · Gateways and coordination (the API
    files them all under the section's tagline; `articles.js` regroups, reorders and renumbers them).
  - *Every interview question has a second line* in its title (`SECOND` in `articles.js`), like every other article.
  - *Articles open with breadcrumbs*, left-aligned on phones; the right rail no longer repeats the sidebar's list; the
    sidebar's article list is a window of nine with "All 29"; contents lists are never numbered.
  - *Controls*: tabs, chips and filters are 40 px; a chip that scrolls the page wears "↓"; tap areas of breadcrumbs and
    small switches extend to 40 px without changing their look; steppers and the theme button are 40 px.
  - *Tablets* stack the Dashboard figure under the words; an article hero keeps its words narrow with the figure further
    right and back. `#/learn` opens Concepts. Wide tables and code fade at the edge that has more. The landing, Dashboard
    and article 3D have accessible names; preview figures that repeat the text beside them stay hidden from screen
    readers.

## 2026-11-20: the simulator, rebuilt for portrait

Owner: "The simulator, rebuilt for portrait" (from the plan for practising on phones: drawing and long typing do not
fit a phone, but a design here is a handful of counts, which fits steppers and a thumb). Phones (up to 760 px wide)
go through stages, one thing on screen at a time, set as `data-phase` on `.sim`; wide screens are unchanged.

- **Brief**: the whole problem as a card anchored low: story, the evening's traffic chart, "To pass, by the end of the
  evening" and the three targets, with "Start building" (or "Back to your design") under the thumb. The system shows
  above it.
- **Build**: a slim bar at the top (the problem's title, "Brief" to reopen it, and the three targets as chips that fill
  in: the budget live as you build). A bottom sheet of parts as rows: name, price a month, one line on what it does
  (dropped on screens under 700 px tall), a 40 px stepper. The cost "of ₹55,000" and "Run the evening" stay at the very
  bottom. The sheet's handle folds the parts away to show the system; the list fades at the bottom while it scrolls.
- **Run**: the system full screen; time, traffic, errors and p99 at the top; failures as toasts (at most two);
  the evening as a timeline at the bottom with "Skip to the end".
- **Done**: the verdict as a bottom sheet (what broke, the article that explains the fix, "Change the design",
  "Next problem", "Replay the evening").
- **Replay**: drag along the timeline (or tap anywhere on it) to see any moment of the evening again: the 3D, the
  numbers (errors counted from the start to that moment) and the chart's marker follow. "Back to the verdict".
- **The camera follows the free space**: on phones the system is centred, and drawn smaller when needed, in the band
  between the bar at the top and whatever panel is at the bottom, measured from the page each time a stage changes,
  so no part sits behind a panel. Labels start below the top bar.
- Checked at 390 × 844 (dark) and 320 × 568 (light) through every stage, including folding the sheet, reopening the
  brief, skipping, replaying and scrubbing; no panel overlaps another or the top bar, nothing off screen, every control
  40 px or more, no script errors; the desktop run and verdict unchanged.
