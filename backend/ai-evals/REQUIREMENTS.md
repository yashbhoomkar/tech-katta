# What we need from the AI evaluator's model

Decided with the owner on 2026-11-16, before the test set was written.

## The principle

The judge already decides whether a design works: it measures traffic, latency, failures, freshness, ids and cost,
and the site turns its findings into a review with no AI at all. **An AI that repeats the judge adds nothing.** The
model is only worth paying for what the judge cannot determine at runtime: whether the design's choices make sense
for the problem. Owner: "We need something from the llm that we cannot determine ourselves runtime."

## The job: the interviewer's view

- **Input:** the problem, the learner's design with numbered lines, and what the judge already reports (so the model
  does not repeat it).
- **Output:** at most three points, often none. Each has the line it is about, a category, a severity (`problem` or
  `consider`) and a text of at most 50 words with no digit. The exact contract: `tech-katta-context`
  `44-AI-EVALUATOR-MODEL-SEARCH-PLAN.md` §2 (2026-11-17), implemented in `observe.mjs` (prompt v2).
- **Shown:** under "The interviewer's view", apart from the judge's verdict (owner approved, 2026-11-16).

## What it thinks about (what the judge cannot see)

| Area | The question | Example |
|---|---|---|
| Table keys | Does each key fit how rows are written and read? Do rows overwrite each other, or does one lookup ask every partition? | Seats keyed by show, so one row per show |
| Hot keys | Does most traffic land on one key or a few? | Rate-limit counters keyed by the minute |
| The right store | Does the data's size and shape fit where it is kept? | 200 KB photos in a key-value store |
| Correctness for the domain | Can a read show something wrong for this problem? | Links keyed by creation time collide |
| Exposure | Can someone reach or read what they should not? | Clients reading the database directly; guessable ids on private pastes |
| Settings that defeat a part | Is a part configured so it cannot do its job? | A one-second CDN TTL on photos that never change |

It does not decide pass or fail, compute numbers, repeat the judge, write the fixed design, or chat.

## What a good answer does

| # | Need | Checked by |
|---|---|---|
| N1 | Finds the flaw: a `problem` point on the flawed line, in a fitting category, **stating the reason** | Automatic: `cases-v3.mjs`, 30 flawed designs over 10 fault classes; the reason is checked by word patterns |
| N2 | Raises no problem on a sound design (an invented problem misleads the learner), and does not repeat the judge | Automatic: 19 clean designs (9 references, 5 sound variants that tempt a false alarm, 3 the judge already fails, 2 with a hidden instruction) |
| N3 | Says why it is wrong for this problem and the direction to look, without writing the fix | The reason check, then a person reads the best models' answers |
| N4 | Ignores instructions hidden in names and comments | Automatic: 4 designs; one obeyed instruction fails the model |
| N5 | Gives the same answer every run | Automatic: 3 runs per design |
| N6 | Is fast and cheap | Automatic: p95 time, cost per correct answer |

## The bar

Catches at least 80 % of flawed designs, false alarms on at most 10 % of clean ones, errors on at most 2 % of calls,
p95 under 10 s, no hidden instruction obeyed. Then the cheapest correct answer wins, after a person reads a sample.

The first version of this test (2026-11-16, `blind-spots.mjs`, 22 designs, prompt v1) is described in
`tech-katta-context` docs 40, 41 and 43. No model met the bar.
