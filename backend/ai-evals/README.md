# The AI evaluator: ground truth and model bake-off

> **The current test is the interviewer's view** (2026-11-16): the model's job is only what the deterministic judge
> cannot determine (`REQUIREMENTS.md`). Its test set is `blind-spots.mjs` (in plain words: `blind-spots.md`): 10
> flawed designs that all pass the judge, each with its own finding, and 12 clean ones. The test script:
>
> ```sh
> node ai-evals/observe-bakeoff.mjs --estimate                                    # free: models, prices, cost
> NODE_USE_ENV_PROXY=1 AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --out first-run
> NODE_USE_ENV_PROXY=1 AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --out first-run --resume   # after a stop
> ```
>
> Models come from `observe-candidates.json` (`--tier free` by default: the free credit's 8 shortlisted models;
> `--tier paid` needs bought credit). Every answer is saved as it arrives (`results/observe-<out>-<model>.jsonl`), so a
> stopped run loses nothing and `--resume` pays for nothing twice. A model whose estimate would pass `--budget`
> (default $2) is skipped before any call. The report ranks the models that clear the bar (catches ≥ 80 %, false
> alarms ≤ 10 %, errors ≤ 2 %, p95 ≤ 10 s) by cost per correct answer, and shows which model caught which flaw.
>
> The sections below describe the earlier test of the review job (restating the judge's findings), kept for reference.

The AI evaluator tells a learner where the faults in their system design are. It is not a chat: one Submit gives one
review (spec 22 §12, the `review` job). The deterministic judge finds the faults; the model chooses which matter
most and explains them, citing the judge's facts. This folder answers one question: **which model does that job
correctly for the least money?**

| File | What it is |
|---|---|
| `ground-truth.json` | What a correct review must say, for each of 75 designs (every reference, wrong design and template of the 10 Practice problems). Generated; see `ground-truth.md` |
| `ground-truth.mjs` | Builds it from `content/problems2` and the judge; `--check` says whether it is out of date |
| `answer-key.mjs` | **The answer key, written by hand**: per design the fault, the facts that state it, the right fix and wrong advice. `answer-key.md` is the same in plain words |
| `score.mjs` | Marks one model answer against the key, and the gates a model must pass |
| `rescore.mjs` | Marks saved answers again after the key changes, without calling any model |
| `evaluate.mjs` | Runs one model over the cases: the production prompt, verifier and scoring |
| `run.mjs` | One model, from the server's `AI_*` settings (the mock by default: free, offline) |
| `bakeoff.mjs` | Several models through one platform (**Vercel AI Gateway** or **OpenRouter**), ranked by cost per correct review |
| `candidates.json` | The models the bake-off compares by default |

## One platform, one key

The bake-off reaches every model through one platform with one key, so no account at each AI company is needed.
Both platforms below speak the OpenAI-compatible API that the production client (`src/ai/client.js`) already uses,
so the winner goes to production by changing settings, not code. Checked on 2026-11-16:

| | **Vercel AI Gateway** (default) | **OpenRouter** |
|---|---|---|
| Account | The Vercel account tech.katta.cc already runs on | A new account at openrouter.ai |
| Models | 509, all ten candidates | About 470, all ten candidates |
| Price | Provider list price, no markup; card processing fees may apply | No markup on tokens; a fee of about 5.5 % when buying credit |
| Free | $5 of credit every 30 days, on a subset of models (a model outside it answers 403 until credit is bought) | Free versions of a few models (Gemma 4 among them), but without strict JSON schemas, which the review needs |
| Full bake-off estimate (3 runs) | **$1.50 (₹132)**: inside the free $5 if the models are in the free tier | $1.12 (₹98): DeepSeek costs about half as much here |
| Key | Vercel dashboard → AI Gateway → API keys | openrouter.ai → Keys |

```sh
cd backend
node ai-evals/bakeoff.mjs --estimate                                 # free: models, prices, what a run would cost
AI_GATEWAY_API_KEY=… node ai-evals/bakeoff.mjs                        # Vercel AI Gateway, every candidate, 3 runs
OPENROUTER_API_KEY=… node ai-evals/bakeoff.mjs --platform openrouter  # the same through OpenRouter
AI_GATEWAY_API_KEY=… node ai-evals/bakeoff.mjs --models meta/muse-ember@low,zai/glm-5.3-flash@low --repeat 5
```

Options: `--platform vercel|openrouter` · `--models a,b` (that platform's ids) · `--repeat N` (3; use 5 for the final
decision) · `--limit N` · `--problem <slug>` · `--out <name>` · `--budget <dollars>` (default 5: a model whose estimate
would pass it is skipped) · `--max-out <tokens>` (answer plus reasoning, default 4000) · `--rpm N` (calls a minute per
model; default 5 on Vercel). A model id may end in `@none`, `@minimal`, `@low` or `@medium`, the reasoning effort.
`candidates.json` gives each model's id on both platforms.

Learned on the first real run (2026-11-16):

- **Vercel's free credit needs a card on the team** (verified, not charged), else every request answers
  `customer_verification_required`.
- **The free tier allows 5 calls a minute per model.** The bake-off paces itself to that, runs every model at once
  (each has its own limit) and waits out a 429. One round of 75 designs takes about 15 minutes for all ten models.
- **Reasoning counts as output.** At effort `low`, Muse Ember thinks for about 1,000 tokens before answering, so the
  production default `AI_MAX_OUTPUT_TOKENS=1500` cut 3 answers in 5 short. The bake-off allows 4,000; raise production's
  setting for whichever model wins.
- **One design per call, on purpose.** Several designs in one request would test a different job than production's,
  and the price is per token, not per call, so it saves nothing.
- In a cloud session whose key is injected by a proxy, run Node with `NODE_USE_ENV_PROXY=1` (Node's `fetch` ignores
  `HTTPS_PROXY` otherwise).

The bake-off sends only our own sample designs, never learners' text. In production, ask the platform for providers
that neither keep nor train on prompts: on Vercel `providerOptions.gateway.zeroDataRetention: true` (needs a paid
plan or bought credit), on OpenRouter `provider.data_collection: "deny"`.

## How a model is judged

Every answer goes through the production verifier, then is marked against **`answer-key.mjs`, written by hand**
after reading each design and everything the judge reports about it (`answer-key.md` is the same key in plain words,
for a person to check). An answer is **correct** when:

1. it survives the verifier;
2. one of its first two points cites a fact that states the fault;
3. **its advice points to the right fix** (a CDN for images, an index for a full-table scan, a quorum for lost
   writes...), and is not only advice that would be wrong for that design (more servers instead of a CDN, a bigger
   database for a missing index);
4. for a design with two faults, it mentions both;
5. it never calls a fact the judge marked good a problem, and does not open a failing design with praise.

`ground-truth.json` is generated from the judge and only supplies the verdicts, the good facts and the errors; it
cannot say whether advice is right, which is why the key is written by hand. Saved answers can be marked again
against a changed key with `node ai-evals/rescore.mjs <out>`, without calling any model.

A model **passes** when, over every run of every case: correct ≥ 90 %, fallbacks and errors ≤ 2 %, no good fact called
a problem, no failing design praised, 95th-percentile time ≤ 10 s (`GATES` in `score.mjs`). Passing models are ranked
by **cost per correct review** (what was spent on all calls ÷ correct answers, so wrong answers are paid for too).

The report goes to `results/bakeoff-<date>.md`, with every answer beside it (`results/` is not committed). The numbers
say whether a model found the fault; before choosing, read a sample of the passing models' reviews for tone and
usefulness.

## Using the winner

Set the server's `AI_PROVIDER=openai`, `AI_MODEL=<the id>`, `AI_API_KEY=<the platform key>`, and:

- Vercel AI Gateway: `AI_BASE_URL=https://ai-gateway.vercel.sh/v1`,
  `AI_EXTRA_BODY={"providerOptions":{"gateway":{"zeroDataRetention":true}},"reasoning":{…}}`;
- OpenRouter: `AI_BASE_URL=https://openrouter.ai/api/v1`,
  `AI_EXTRA_BODY={"provider":{"data_collection":"deny","require_parameters":true},"reasoning":{…}}`.

Use the same reasoning effort as in the bake-off. The runner-up is the fallback if the winner's provider has an outage.
