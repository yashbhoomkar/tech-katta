# Writing a problem's test suite

Every Interview Question has a `practice` object (format in `content/README.md`): tests the judge runs
against a visitor's design, a rubric for the written steps, hints, and the designs that calibrate the
tests. These scripts write and calibrate them; the JSON in `content/` is the source of truth.

**Don't run these with `write` again.** They wrote the first versions; the content audit of 2026-11-07 then
fixed the JSON by hand (key decisions, API tests, schemas, solution designs). Re-running a `write` would
put the old versions back. Change `content/` directly and check it with `cd frontend && npm test`.

```bash
cd tools/practice
node run.mjs batch3.mjs                 # build and calibrate every spec in a batch, write nothing
node run.mjs batch3.mjs write           # write them into content/ when all pass
node run.mjs batch3.mjs write menu-search   # one problem
node q01.mjs write                      # the hand-written URL shortener suite
node roles.mjs write                    # each problem's parts (roles), role checks and key decisions
node requests.mjs write                 # request tests, sample data, reference schemas and a failing schema
cd ../../frontend && npm test           # the same calibration, as CI runs it
```

- `lib.mjs`: design helper `D(nodes, "a>b,b>c")` (laid out left to right), check builders, `calibrate()`
  (the reference passes everything, each wrong design fails the test it names, the start isn't accepted).
- `arch.mjs`: the archetypes. `build(o)` makes a reference sized from the numbers (two server groups,
  caches, a queue and workers when `async`, a CDN when `cdn`, Multi-AZ databases, several load balancers
  or queues past 80,000 a second); `suite(o, words)` makes the tests (normal, peak, spike, a server group
  dies, the database fails, a day's bill); `wrongs(o)` the tempting wrong designs.
- `run.mjs`: sets the budget at 1.6 × the reference's normal-day cost (rounded), builds, calibrates, writes.
- A spec: `{slug, easy?, o: {normal, peak, spike?, cache?, cdn?, async?, fixed, p99, structure?,
  spikeChecks?, extra?}, words, brief, rubric, hints, moreWrong?, skipWrong?}`.

Rules: numbers come from the article's "2. The numbers that matter" where the Lab can hold them (one
load balancer or queue takes 1 lakh a second; servers top out at 50 × 2,500 per group); words are
our own; every hint goes from a nudge to nearly the answer. Known engine limit: two queues feeding the
same workers each hand them their full capacity, so keep one queue per worker pool.

`roles.mjs` runs after the others: it puts roles on the reference (and on the wrong designs, by node id),
adds role checks to the `normal` test, adds a "Right sizes, general parts" wrong design (the reference
with no roles, which must fail `normal`), and writes `rubric.decisions` with the right option moved to a
position chosen from the problem and question ids. Re-running it replaces what it wrote before.

`requests.mjs` runs last: it writes `data`, the request tests (after the traffic tests), schemas (and engine
changes such as S3 for files) on the reference's databases, and a wrong design whose schema fails a request
test. Re-running it replaces what it wrote before.
