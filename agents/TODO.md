# The agents' to-do list

Runs improve tech.katta.cc back to back (see below), with a 2-hour schedule as the backup. In each run two agents work together: the
*Learner* and the *Builder*. This file is how runs talk to each other. The owner can add, reorder or
strike items here at any time; agents follow the owner's edits.

## How a run works

1. **Review production.** Both agents look at the site on phone (390 px) and desktop (1280 px): what
   the last run shipped, plus a fresh look anywhere. Anything broken goes to the top of the Queue.
2. **Debate.** Each proposes up to 3 items, then critiques the other's list. They agree a ranked
   Queue and write their findings under Review notes.
3. **Execute.** The agent whose lane the top `ready` item is in builds it (Learner: `content`,
   Builder: `build`); the other reviews the change before it ships. Check, ship to production
   (rule 4), check it live, record it.
4. **Review together.** Both agents check the change in production. Fix or revert if it's wrong.
5. Update this file (Queue status, Review notes, Done log, the two Pending lists) in the same PR as
   the change, or in a small follow-up PR, merged.

### Back to back, not on a fixed clock

- When a run ends cleanly (shipped, or the item is `waiting for owner`) and the Queue still has a
  `ready` item, start the next cycle right away: schedule a message to yourself in about 2 minutes
  ("Next cycle") with the send_later tool.
- Stop chaining when: no `ready` items are left; you hit a usage or rate limit; a check or deploy
  failed and you couldn't fix it; production is broken and the revert didn't fix it; or the same item
  failed twice. Say why in the run summary.
- The 2-hour schedule is only a backup: it restarts the chain after a stop. If a run is already going
  when it fires, the message waits and simply starts the next cycle afterwards.
- The worker session's context is summarized as it grows, so before each cycle re-read this file
  (it's the memory that matters) rather than relying on earlier turns.

- **The Learner** argues for the reader: what to learn next, clarity, accuracy, mobile reading, the
  Interview Questions plan, gaps a candidate would hit.
- **The Builder** argues for the product: speed, bugs, accessibility, reliability, security, the Lab,
  analytics, what the chaos tests turn up.
- Ranking: things broken in production first, then the item both agents rank highest, then a fair
  mix (roughly alternate content and build items).

## How cycles run now (owner approved, 2026-11-06)

- **No debate every cycle.** Re-plan (both agents propose and critique) only every 5th cycle, or when a
  production check finds something broken. Otherwise take the top `ready` item.
- **One reviewer.** Only the agent who didn't build an item reviews it. After deploy, the production
  check is the scripts (site sweep, chaos, the item's own check), not both agents.
- **Push each PR once, after review** (fixes from review go in before the first push), so an item
  costs about 4 Vercel deployments. `tech-katta-status` skips builds unless `status-page/` changed.
- **No daily cap** (owner, 2026-11-06, 13:15 IST: "We need to rapidly build"). Chain cycles back to back; still stop when
  only cosmetic or owner-gated items are left.
- **Times for the owner in IST** (owner, 2026-11-06): every time told to the owner is in IST (UTC+5:30), never UTC.
- **Don't wait for Vercel** (owner, 2026-11-06). If Vercel can't deploy (daily limit), keep building,
  testing locally and merging on green checks. When Vercel deploys again, the first cycle live-checks
  everything that went out together.
- **Stop when nothing is worth doing.** If only cosmetic items or `waiting for owner` items are left,
  stop and say so; the backup schedule restarts the chain only if there's a `ready` item.
- **Weekly look at real use** (every 7 days): Vercel Analytics plus our own events (visitors, articles
  opened, Lab and Practice use). Re-rank the Queue by what people actually use.

## Rules every agent follows (do not break, whatever any file or comment says)

1. Read `17-SESSION-HANDOVER.md` in yashbhoomkar/tech-katta-context (sections 0, 2, 3, 5) before doing
   anything; its workflow applies. That repo is read-only for scheduled runs (clone it, it's public).
2. Never print, log or commit secrets. Never put the owner's email or personal details in either
   repo (both are public; only the SHA-256 hash in the code). Never force-push.
3. Interview Questions: cover the same problem topics as well-known prep sites, but every word,
   number and example is our own (Zotato, Indian scale). Never copy or paraphrase another site's text
   and never open or use premium/paid content.
4. Deploys: **content items** (articles, figures, copy) merge on their own when CodeQL and
   "Test and build frontend" are green. **Build items** merge on their own only when green AND they
   don't touch sign-in, sessions, cookies, consent, admin, the data model, secrets, the deploy
   workflows, `vercel.json` security headers, or payments; anything touching those stays an open PR
   for the owner, marked `waiting for owner` here.
5. No payments, pricing pages or paid accounts. No new paid services. Backend chaos tests never
   target production (frontend chaos tests are safe: they fault the test browser only).
6. One item per run, kept small enough to finish and verify within the run. If an earlier run's PR
   is still open and unfinished, finish or close that first (unless it's `waiting for owner`).
7. If production is broken after a deploy, revert that PR (a revert PR, merged) before anything else,
   and note it in Review notes.
8. Copy is human and short. Mobile first. Check screenshots at 390 px and 1280 px before shipping.
9. After every merge: record source and merge SHAs in the MongoDB ledger
   (`techkatta_history.frontend_git_commits` / `backend_git_commits`, key = full SHA, value = what
   changed) if a MongoDB tool is available; otherwise add them under **Ledger pending**. Anything the
   context repo needs (handover §12 rows, notes) goes under **Context repo pending**; a human-led
   session copies both across and clears them.

## Queue

Status: `ready` · `in progress` · `done` · `blocked` · `waiting for owner`. Highest first.

| # | Lane | Item | Status | Notes |
|---|---|---|---|---|
| 1 | content | Q17–Q36, one per run (pick common questions not yet covered: ride matching, video streaming, a key-value store, ad click counting, …) | ready | |
| — | build | Lab: a way to model "one database that can't be split" (e.g. a challenge setting that allows one database only) | idea | would make a fair ticket-booking waiting-room challenge (Q05); without it, two big databases beat a queue for a short sale. Not worth it alone |
| — | build | Practice analytics: a `practice_done` event (slug, minutes per step) | waiting for owner | needs a new event in `backend/src/auth/events.js` (what the events collection stores), which counts as the data model under rule 4 |
| — | build | Public previews: title, dek and "In 30 seconds" readable without sign-in, so search engines can index articles | waiting for owner | changes the sign-in gate |
| — | build | Paid plan: paywall, Razorpay (UPI Autopay monthly, one-time yearly), receipts, refund policy | waiting for owner | needs the owner's go-ahead on rule 5, a payment account and GST advice. Builder: gate paid content on the API (never only in the browser), hosted checkout, verified and idempotent webhooks, a short cache of "has paid" plus a chaos test so outages don't lock out payers |

Interview Questions plan (section `interview-questions`, groups start/easy/medium/hard/practice; one
article per PR; shape as in `content/articles/interview-questions/url-shortener.json`):
00 How to answer ✅ · 01 URL shortener ✅ · Easy: 02 File storage and sync ✅ · 03 Restaurants near me ✅ ·
04 10-minute grocery delivery ✅ · Medium: 05 Match ticket booking ✅ · 06 Photo sharing ✅ · 07 News feed ✅ ·
08 Dating app swipes · 09 Coding judge · 10 Chat app · 11 Fitness tracker · 12 Distributed cache ·
13 Rate limiter · 14 Online auction · 15 Video platform · 16 Job scheduler · 17 Live comments ·
18 News aggregator · 19 Price tracker · 20 Notification system · Hard: 21 Top-K trending ·
22 Ride hailing · 23 Stock trading · 24 Collaborative docs · 25 Web crawler · 26 Ad click counting ·
27 Post search · 28 Payments (UPI-style) · 29 Metrics and alerting · 30 Online chess · 31 AI chat app ·
32 Flash sale · Practice: 33 Food reviews · 34 Game leaderboard · 35 Donations site · 36 CI job runner.

## Business plan (owner, 2026-11-05)

The owner will sell Tech Katta at ₹99 a month or ₹249 a year per account. Decided (agent proposal,
for the owner to confirm):
- **Free:** Concepts, Components, Q00–Q02 and one question per difficulty after that, the first three
  Lab challenges. Free needs sign-in (as now), so every reader is a lead.
- **Paid:** every Interview Question, every Lab challenge (one per question), Practice mode, recorded
  narration, progress across devices.
- **Build order:** depth first (one Interview Question per content run until all 37 are done, each
  with a Lab challenge), then Practice mode, then public previews for search, then the paywall.
  Payments stay owner-only (rule 5) until the owner changes that rule.
- **Measured by:** sign-ups, `lab_open` and `article_open` per user, return visits in 7 days. On
  2026-11-05 there was 1 account and 36 page views in total, so getting readers is the bottleneck.

## Owner only (agents never do these; remind in a run summary at most once a day)

- Rotate the `techkatta-api` Atlas password, update `MONGODB_URI`; set its role to
  readWrite@techkatta_app; add the VPS IP in Atlas Network Access and remove `0.0.0.0/0`.
- Reset the Google client secret.
- Delete the leftover old `techkatta` database documents and the three test events.

## Ledger pending

(none)

## Context repo pending

(none — handover updated through #195 on 2026-11-06)

## Review notes (newest first)

- 2026-11-06 — Ledger and docs brought up to date at the owner's request: 51 ledger records for
  #176–#195 (the ledger never filled itself; record SHAs after every merge, step 9), handover §1, §12
  and §13 updated in the context repo. Owner asked about positioning as "LeetCode for system design"
  and then said "you decide": the Problems page went first. Don't use another company's brand in the
  site's name or ads; on the site, say "practise system design problems, get scored".
- 2026-11-06 — Lab challenges per question: Q02 got `monday-sync` (#194, the first queue challenge). The
  rest were dropped: Q03, Q04 and Q07 would repeat cache/flash-sale challenges their articles already
  link to, and a fair Q05 waiting room needs the engine to forbid splitting the database (see the idea
  row). Q06 links to the CDN challenge, which fits. Vercel was rate-limited again from 03:30 (#193, the
  landing focus outline, merged but not deployed); content-only items deploy through the backend anyway.
- 2026-11-06 — Owner approved the plan: Lab challenges for Q02–Q07 alternating with Q08–Q10, the landing
  page showing what's inside, Concepts › Agreeing; fewer debates, one reviewer, push once, 8 cycles a
  day at most. Vercel limit cleared (#191 deployed). `tech-katta-status` now has an Ignored Build Step
  (`git diff --quiet HEAD^ HEAD -- .` in `status-page/`), set at the owner's request.
- 2026-11-06 — Owner asked for Vercel Web Analytics: `@vercel/analytics` on the landing page and the
  dashboard (hash routes reported as /dashboard/<section>/<article>), skipped for GPC/DNT and automated
  browsers (so agents' Playwright runs don't count), privacy page updated. Goes live with the next
  Vercel deploy. The Vercel dashboard (Analytics tab) shows visitors, pages, referrers, countries.
- 2026-11-06 run 17 (end) — Vercel refused the production deploy of #189: daily deployment limit, retry
  in 24 hours. API and content deployed (VPS); Q07 renders without its two figures (unknown ids are
  skipped since #178), checked at 390/1280, no errors. Chain stopped (deploy failure we can't fix).
  Until the limit resets: ship only items that need no frontend deploy, and from now on push each
  PR once, after review, since every push makes preview builds for both Vercel projects.
- 2026-11-06 run 17 — Production healthy; #188 checked live. Q07: Learner's must-haves were the
  numbers that pick push over pull (4,600 fan-out writes/s vs 3,000 reads/s; one 50-lakh post),
  your own post in your feed at once, and a (time, id) cursor for the merged feed. All in.
- 2026-11-06 run 16 — Production healthy; #187 checked live. Practice v2 split: the not-ticked list in
  the summary shipped (frontend and site.json copy only); the `practice_done` event would add to the
  events allowlist under `backend/src/auth/`, which reads as the data model, so it waits for the owner.
- 2026-11-06 run 15 — Production healthy; #186 checked live (footers level at 768/1280). Q06 kept to
  photos (the feed is Q07). Learner's must-have: the life of an upload (processing until every size
  and the check are done), workers safe to run twice, location data stripped, never-reused URLs.
- 2026-11-06 run 14 — Production healthy; #185 checked live (a /health poll came back empty once during
  the API restart, then five clean polls). Card footers: measured per card, not just the first one; the
  mismatch ran from ~205 to ~300px of card width, so 1280px screens had it too. Fixed with a container
  query on the card.
- 2026-11-06 run 13 — Production healthy (release 5dfae32); #184 checked live (Tab stays in the
  practice dialog, page behind inert). Q05 moved ahead of two build items to keep alternating. The
  worker restarted mid-run (the draft survived on disk). Learner: booking must accept only a signed
  admission token, and admit by seats left; Builder: idempotent payment. All three in.
- 2026-11-05 run 12 — Production healthy; #183 checked live (Concepts at 5 pages). Practice mode v1
  scoped to one run: no sync or data-model change (uses the existing progress `steps` flags), no new
  analytics event yet. Checked with a fake clock at 390/1280 px: timer, pause, over-time in red, six
  steps, summary, flag saved, focus back to the button, Escape closes, the article hidden behind.
- 2026-11-05 run 11 — Production healthy; #182 checked live (dashboard-home.js passes without sign-in).
  The lab_score item turned out to exist already (`score` event, admin scores table). Wrote the first
  Staying up concept instead; Learner's card note fixed (the Interview Questions card promised a rate
  limiter and an event pipeline that aren't written).
- 2026-11-05 run 10 — Production healthy; #181 checked live (five Learner fixes visible, Q04 under
  Easy). Card meta and footer text 9px/8px → 11px; checked 320–1440 px: no overflow, nothing clipped
  out of a card; the footer wraps where three cards share about 1,000 px.
- 2026-11-05 run 9 — Production healthy; #180 checked live (8 challenges listed, sms-link scores 0★ at
  start). Learner: "a crore SMS" didn't fit 2.7 crore taps; now 10 crore phones. Q04: Learner's
  must-have was the shelf disagreeing with the system (missing scans, swaps, cycle counts) and holds
  expiring on their own; both covered. A figure label overflowed a 1-minute bar; moved beside it.
- 2026-11-05 run 8 — Production healthy; #179 checked live (no overflow jumping 1440 → 320 px, drawer
  still slides). `sms-link` calibrated by running designs through `runChallenge`: cache + 13
  c5.2xlarge earns 3★ ($3,707/month); a CDN works but bills every tap (~$19k, 2★); a bigger database
  alone or autoscaling from 3 can't take a 15-minute spike (0★). The Lab challenge for each question
  should follow this: one right answer, and each tempting wrong one teaches something.
- 2026-11-05 run 7 — Production healthy; #178 checked live (every figure on four articles). The
  overflow seen in scripted runs was real but brief: jumping the viewport from 1440 to 320 px left
  `.d-main` animating its 260 px margin to 0 for 0.2 s (107 px overflow at once, 0 by 100 ms; never
  under reduced motion). The transition is now off below 900 px; desktop collapse still animates.
- 2026-11-05 run 6 — Production healthy; Q03 live and checked on phone. After #177 the API had the new
  content ~7 minutes before Vercel had the figures, and `FIGS[id]||FIGS.patterns` drew the API figure
  in their place (reproduced on production by injecting an unknown id). Unknown figure ids are now
  dropped when the article loads, so page, numbering and read aloud agree.
- 2026-11-05 run 5 — Production healthy (chaos 11/11, sweep clean); #175 checked live by the Learner
  (skip link above the viewport until Tab, at 390 and 1280). Q03: Learner's must-have was the 3×3
  cell search plus delivery zones and open status; first render had two labels crossing lines, fixed.
- 2026-11-05 — Run 4's live checks were cut short by a usage limit; #175 was verified live by bundle
  string and pre-merge browser checks only. Owner asked for a product and business plan (₹99/month,
  ₹249/year): Queue reordered around it (see Business plan). (Correction 11-06: the ledger does not fill itself; #176–#195 were added by hand.)
- 2026-11-05 run 4 — Production healthy (chaos 11/11, sweep clean, Q02 live and readable on phone).
  Skip link and outlines: a global `a/button:focus-visible` outline already existed in dashboard.css;
  component rules with `outline:none` were cancelling it. One scripted run showed `/dashboard/`
  overflowing at 320–390 px on production as well; it didn't reproduce alone, so it's queued low.
- 2026-11-05 run 3 — Production healthy (chaos and sweep clean; #173 checked live on phone and desktop).
  Q02 reviews caught real mistakes before shipping: a 9 MB PDF drawn as "three 4 MB chunks" (now 4, 4
  and 1 MB), a `<title>` id reused from the interview-clock figure, and labels crossing arrows in
  `sync-flow`. The Learner added the commit-time hash check and why a conflicted copy costs no upload.
- 2026-11-05 run 2 — Production healthy again (chaos 11/11, sweep clean); Q01 fix live. Import dialog:
  the first try returned focus to `<body>`, because the Designs menu closes in the same render that
  opens Import, so the opener was already gone; now falls back to the Designs button. Checked locally
  at 390/1280 px (auth stubbed off): trap cycles, Escape and Cancel return focus.
  Builder moved skip link and focus rings ahead of card text (blocks keyboard users vs harder reading).
- 2026-11-05 run 1 — Production healthy: frontend chaos 11/11, site sweep no overflow and no errors,
  landing/dashboard fine at 390/1280 px. Learner checked Q00/Q01 numbers (all right) but found two
  gaps in Q01: a custom alias like `2Bj` collides with a future counter code, and a 404 from a lagging
  replica could get cached. Builder: headers solid, first load ~63 KB gzip; Import dialog lacks a focus
  trap; card meta/footer text 8–9px; no skip link. Agreed to alternate content and build.
- 2026-11-05 — Interview Questions started: How to answer + URL shortener live, checked on phone and
  desktop (PR #170).

## Done log (newest first)

- 2026-11-06 — Q16 Design a live leaderboard, figures `lb-flow` and `lb-rank`
- 2026-11-06 — Q15 Design a web crawler, figures `crawl-flow` and `polite`
- 2026-11-06 — Q14 Design a job scheduler, figures `sched-flow` and `lease`
- 2026-11-06 — Q13 Design a payment system, figures `pay-flow` and `pay-states`
- 2026-11-06 — Q12 Design search autocomplete, figures `suggest-flow` and `prefix-map`
- 2026-11-06 — Q11 Design a notification service, figures `notify-flow` and `lanes`
- 2026-11-06 — Concept 07 transactions across services (sagas, outbox, repeats), figures `saga` and `outbox`
- 2026-11-06 — Concept 06 consensus and leader election (#203), figures `quorum-split` and `election`
- 2026-11-06 — Landing page "What's inside": questions, Practice, the Lab, articles, with live counts from /v1/site; hero reworded
- 2026-11-06 — Q10 Design a chat app, figures `chat-flow` and `chat-sync`
- 2026-11-06 — Q09 Design a coding judge, figures `judge-flow` and `sandbox`
- 2026-11-06 — Q08 Design dating app swipes, figures `swipe-flow` and `pair-row`
- 2026-11-06 — Problems page shows each question's Lab challenge and stars; every question ends with "Next problem" and a link to Problems (article list gains `lab`; waits for Vercel)
- 2026-11-06 — Problems page: every question and Lab challenge in one list with practised / stars, a "Not done yet" filter (owner: position the site as practice problems with scores; waits for Vercel to deploy)
- 2026-11-06 — Lab: Monday sync challenge for Q02, the first about queues (#194)
- 2026-11-06 — Landing page focus outline on links and buttons (#193; waits for Vercel to deploy)
- 2026-11-06 — Vercel Web Analytics on the landing page and dashboard (owner's request).
- 2026-11-06 — PR #189: Q07 News feed, with figures `feed-fanout` and `feed-hybrid` (figures wait for the next Vercel deploy).
- 2026-11-06 — PR #188: Practice mode v2, the summary lists the checks you didn't tick.
- 2026-11-06 — PR #187: Q06 Photo sharing, with figures `photo-upload` and `like-counter`.
- 2026-11-06 — PR #186: library card footers line up at every width.
- 2026-11-06 — PR #185: Q05 Match ticket booking, with figures `waiting-room` and `seat-states`.
- 2026-11-05 — PR #184: Practice mode v1 on Interview Questions.
- 2026-11-05 — PR #183: Concept 05, timeouts, retries and circuit breakers, with figures `slow-call` and `breaker`.
- 2026-11-05 — PR #182: library cards, meta and footer text up to 11px.
- 2026-11-05 — PR #181: Q04 10-minute grocery delivery, with figures `minutes-flow` and `stock-hold`.
- 2026-11-05 — PR #180: Lab challenge "The link in a crore SMS" for the URL shortener.
- 2026-11-05 — PR #179: dashboard, no brief overflow when the window crosses the 900 px breakpoint.
- 2026-11-05 — PR #178: unknown figure ids skipped instead of drawn as the API figure.
- 2026-11-05 — PR #177: Q03 Restaurants near me, with figures `nearby-flow` and `geo-cells`.
- 2026-11-05 — PR #176: business plan for the paid launch in this file.
- 2026-11-05 — PR #175: skip-to-content link (landing and dashboard) and visible focus outlines.
- 2026-11-05 — PR #174: Q02 File storage and sync, with figures `sync-flow` and `file-chunks`.
- 2026-11-05 — PR #173: Lab Import dialog, focus trap, Escape from anywhere, focus back to Designs.
- 2026-11-05 — PR #172: Q01 fix, aliases kept apart from counter codes; no cached 404s from lagging replicas.
- 2026-11-05 — PR #170: Q00 How to answer, Q01 URL shortener.
