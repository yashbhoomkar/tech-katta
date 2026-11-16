# The AI evaluator: ground truth and model bake-off

The AI evaluator tells a learner where the faults in their system design are. It is not a chat: one Submit gives one
review (spec 22 §12, the `review` job). The deterministic judge finds the faults; the model chooses which matter
most and explains them, citing the judge's facts. This folder answers one question: **which model does that job
correctly for the least money?**

| File | What it is |
|---|---|
| `ground-truth.json` | What a correct review must say, for each of 75 designs (every reference, wrong design and template of the 10 Practice problems). Generated; see `ground-truth.md` |
| `ground-truth.mjs` | Builds it from `content/problems2` and the judge; `--check` says whether it is out of date |
| `score.mjs` | Marks one model answer against its design's truth, and the gates a model must pass |
| `evaluate.mjs` | Runs one model over the cases: the production prompt, verifier and scoring |
| `run.mjs` | One model, from the server's `AI_*` settings (the mock by default: free, offline) |
| `bakeoff.mjs` | Several models through **OpenRouter**, ranked by cost per correct review |
| `candidates.json` | The models the bake-off compares by default |

## One platform, one key

The bake-off runs every model through [OpenRouter](https://openrouter.ai): one account, one prepaid balance and
one API key for every provider's models (Meta, Anthropic, OpenAI, DeepSeek, Google, Qwen, and hundreds more). No key
from each provider is needed. Its API is OpenAI-compatible, which the production client (`src/ai/client.js`)
already speaks, and every answer reports what it cost. Requests ask for providers that neither keep nor train on
prompts (`data_collection: deny`) and that honour the strict JSON schema (`require_parameters: true`).

```sh
cd backend
node ai-evals/bakeoff.mjs --estimate          # free: the models, their prices, what a run would cost
OPENROUTER_API_KEY=sk-or-… node ai-evals/bakeoff.mjs              # every model in candidates.json, 3 runs each
OPENROUTER_API_KEY=sk-or-… node ai-evals/bakeoff.mjs --models meta/muse-ember@low,z-ai/glm-5.3-flash@none --repeat 5
```

Options: `--models a,b` · `--repeat N` (3; use 5 for the final decision) · `--limit N` · `--problem <slug>` ·
`--out <name>` · `--budget <dollars>` (default 5: a model whose estimate would pass it is skipped). A model id may end
in `@none`, `@low` or `@medium`, the reasoning effort.

On 2026-11-16 the estimate for all ten candidates was **about $1.12 (₹98) at 3 runs, $1.86 (₹164) at 5**, before
reasoning tokens. Put $5 on the OpenRouter balance.

## How a model is judged

Each answer goes through the production verifier, then is scored against `ground-truth.json`. An answer is
**correct** when it survives the verifier, cites the fault the judge found in its first two items (for a passing
design: where it would break first), never calls a fact the judge marked good a problem, and does not lead a
failing design with praise.

A model **passes** when, over every run of every case: correct ≥ 90 %, fallbacks and errors ≤ 2 %, no good fact called
a problem, no failing design praised, 95th-percentile time ≤ 10 s (`GATES` in `score.mjs`). Passing models are ranked
by **cost per correct review** (what was spent on all calls ÷ correct answers, so wrong answers are paid for too).

The report goes to `results/bakeoff-<date>.md`, with every answer beside it (`results/` is not committed). The numbers
say whether a model found the fault; before choosing, read a sample of the passing models' reviews for tone and
usefulness.

## Using the winner

Set the server's `AI_PROVIDER=openai`, `AI_BASE_URL=https://openrouter.ai/api/v1`, `AI_MODEL=<the id>`,
`AI_API_KEY=<the OpenRouter key>` and `AI_EXTRA_BODY={"provider":{"data_collection":"deny","require_parameters":true},"reasoning":{…}}`
(the same effort as in the bake-off). The runner-up is the fallback if the winner's provider has an outage.
