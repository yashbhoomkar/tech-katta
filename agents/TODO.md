# The agents' to-do list

One scheduled run every 2 hours improves tech.katta.cc. In each run two agents work together: the
*Learner* and the *Builder*. This file is how runs talk to each other. The owner can add, reorder or
strike items here at any time; agents follow the owner's edits.

## How a run works (every 2 hours)

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

- **The Learner** argues for the reader: what to learn next, clarity, accuracy, mobile reading, the
  Interview Questions plan, gaps a candidate would hit.
- **The Builder** argues for the product: speed, bugs, accessibility, reliability, security, the Lab,
  analytics, what the chaos tests turn up.
- Ranking: things broken in production first, then the item both agents rank highest, then a fair
  mix (roughly alternate content and build items).

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
| 1 | content | Q02 File storage and sync (easy) | ready | Interview Questions plan, see below |
| 2 | content | Q03 Restaurants near me (easy) | ready | geo index, geohash/quadtree |
| 3 | content | Q04 10-minute grocery delivery (easy) | ready | dark stores, inventory, slotting |
| 4 | content | Q05 Match ticket booking (medium) | ready | seat holds, flash demand, queues |
| 5 | content | Q06–Q36, one per run, in plan order | ready | |

Interview Questions plan (section `interview-questions`, groups start/easy/medium/hard/practice; one
article per PR; shape as in `content/articles/interview-questions/url-shortener.json`):
00 How to answer ✅ · 01 URL shortener ✅ · Easy: 02 File storage and sync · 03 Restaurants near me ·
04 10-minute grocery delivery · Medium: 05 Match ticket booking · 06 Photo sharing · 07 News feed ·
08 Dating app swipes · 09 Coding judge · 10 Chat app · 11 Fitness tracker · 12 Distributed cache ·
13 Rate limiter · 14 Online auction · 15 Video platform · 16 Job scheduler · 17 Live comments ·
18 News aggregator · 19 Price tracker · 20 Notification system · Hard: 21 Top-K trending ·
22 Ride hailing · 23 Stock trading · 24 Collaborative docs · 25 Web crawler · 26 Ad click counting ·
27 Post search · 28 Payments (UPI-style) · 29 Metrics and alerting · 30 Online chess · 31 AI chat app ·
32 Flash sale · Practice: 33 Food reviews · 34 Game leaderboard · 35 Donations site · 36 CI job runner.

## Owner only (agents never do these; remind in a run summary at most once a day)

- Rotate the `techkatta-api` Atlas password, update `MONGODB_URI`; set its role to
  readWrite@techkatta_app; add the VPS IP in Atlas Network Access and remove `0.0.0.0/0`.
- Reset the Google client secret.
- Delete the leftover old `techkatta` database documents and the three test events.

## Ledger pending

(none)

## Context repo pending

(none)

## Review notes (newest first)

- 2026-11-05 — Interview Questions started: How to answer + URL shortener live, checked on phone and
  desktop (PR #170).

## Done log (newest first)

- 2026-11-05 — PR #170: Q00 How to answer, Q01 URL shortener.
