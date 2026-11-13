# The interviewer's evaluation run

`run.mjs` sends every reference, wrong design and template of every Practice problem to the configured model as a
review job, runs each answer through the same verifier as production (`src/ai/verify.js`), and reports how often the
answer survives, how long it takes and what it costs. It is how a model is chosen
(tech-katta-context/29-SELF-HOSTED-LLM-ON-A-VPS.md §12.4) and how a prompt change is checked
(tech-katta-context/22-EVALUATOR-V3.md §19.3).

```sh
cd backend
node ai-evals/run.mjs                                   # the mock: free, offline, should be 100 % verified
AI_PROVIDER=openai AI_BASE_URL=https://… AI_MODEL=… AI_API_KEY=… \
  node ai-evals/run.mjs --repeat 5 --price-in 0.10 --price-out 0.50 --out candidate-a
```

Options: `--repeat N` (runs per case; use 5 for a decision), `--limit N`, `--problem <slug>`, `--out <name>`,
`--price-in`/`--price-out` (dollars per million tokens, for the cost per verified review).

**With a real provider this costs money** (about 75 cases × repeats; a few hundred rupees for a full bake-off at
cheap-model prices). Results go to `results/` (not committed). The numbers say whether answers survive the
verifier; a person still reads a sample to judge whether they are right and useful.
