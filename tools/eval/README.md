# tools/eval

Tools for problems judged by the v2 evaluator (every problem and challenge; see `evaluator.md` in tech-katta-context). The v1 authoring scripts (`tools/practice`) were removed with v1 (#301, #303).

## calibrate.mjs

```sh
node tools/eval/calibrate.mjs                      # the test fixture and every v2 article
node tools/eval/calibrate.mjs path/to/article.json  # one article
node tools/eval/calibrate.mjs --fast                # without mutation testing
```

A problem is **calibrated** when all of these hold:

- The reference is accepted, with no `fail` findings and at most 3 `warn` findings.
- Each wrong design fails the test it names (`fails`).
- Between them, the wrong designs fail:
  - a trace test;
  - a load test without faults;
  - a load test with a fault;
  - a correctness check, if the problem has any.
- The starting design is not accepted, and it fails at least one sample test.
- Every **mutant** of the reference is killed, except those listed in `mutantsAllowed`. A mutant is the reference with one small change: a node removed, halved or made smaller, one zone, an index removed, another engine, a longer TTL, or an arrow cut.
  - At most a fifth of the mutants may be allowed.
  - Give a reason for each allowed mutant in `mutantsAllowedWhy`.
- The reference with every `count` doubled still passes every check except `cost`.

The tool prints every surviving mutant. For each one, either add a test or a wrong design that fails it, or allow it with a reason. The same checks run in `frontend/src/eval/calibration.test.js`, so CI fails on a problem that is not calibrated.
