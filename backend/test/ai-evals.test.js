// The AI evaluator's ground truth and bake-off (ai-evals/): the truth file matches the problems and the judge, the
// scorer marks right and wrong reviews as a person would, and the bake-off runs end to end through stand-ins for
// Vercel AI Gateway and OpenRouter (no network, no money).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFileSync, rmSync, readdirSync } from 'node:fs';
import { buildGroundTruth, readGroundTruth } from '../ai-evals/ground-truth.mjs';
import { scoreReview, gateFailures } from '../ai-evals/score.mjs';

test('ground-truth.json is up to date with the problems and the judge (else: node ai-evals/ground-truth.mjs)', () => {
  assert.deepEqual(readGroundTruth().cases, buildGroundTruth().cases);
});

test('every case has a fault to lead with, and every authored wrong design has the author\'s words', () => {
  const { cases } = readGroundTruth();
  assert.ok(cases.length >= 70);
  for (const c of cases) {
    assert.ok(c.must_lead_with.length, c.id);
    assert.equal(c.verdict_fails, c.verdict.word !== 'Accepted', c.id);
    if (c.kind === 'wrong') { assert.ok(c.fault, c.id); assert.ok(c.verdict_fails, c.id); }
    if (c.kind === 'reference') assert.equal(c.verdict.word, 'Accepted', c.id);
    for (const id of c.must_lead_with) assert.ok(!c.never_a_problem.includes(id) || !c.verdict_fails, `${c.id}: ${id} is good`);
  }
});

const truth = { id: 'p/x', verdict_fails: true, must_lead_with: ['finding:overloaded:GET:api'], never_a_problem: ['test:t01'] };
const item = (kind, facts) => ({ kind, facts, text: 'words', ask: null });
const ok = (raw, dropped = []) => ({ ok: true, dropped, review: { items: raw.items } });

test('scoring: a review that leads with the fault is correct', () => {
  const raw = { items: [item('problem', ['finding:overloaded:GET:api']), item('risk', ['load:db'])] };
  assert.equal(scoreReview(truth, raw, ok(raw)).correct, true);
  const second = { items: [item('risk', ['load:db']), item('problem', ['finding:overloaded:GET:api'])] };
  assert.equal(scoreReview(truth, second, ok(second)).lead_rank, 2);
  assert.equal(scoreReview(truth, second, ok(second)).correct, true);
});

test('scoring: the fault only at item 3, or not at all, is wrong', () => {
  const raw = { items: [item('risk', ['load:db']), item('risk', ['load:lb']), item('problem', ['finding:overloaded:GET:api'])] };
  const s = scoreReview(truth, raw, ok(raw));
  assert.equal(s.correct, false);
  assert.match(s.why, /item 3/);
  const none = { items: [item('risk', ['load:db']), item('risk', ['load:lb'])] };
  assert.match(scoreReview(truth, none, ok(none)).why, /not cited/);
});

test('scoring: an item the verifier dropped does not count as finding the fault', () => {
  const raw = { items: [item('problem', ['finding:overloaded:GET:api']), item('risk', ['load:db'])] };
  assert.equal(scoreReview(truth, raw, ok(raw, [{ item: 0, rule: 'R4 digit' }])).found_fault, false);
});

test('scoring: calling a good fact a problem, or leading a failing design with praise, is wrong', () => {
  const good = { items: [item('problem', ['finding:overloaded:GET:api']), item('problem', ['test:t01'])] };
  assert.equal(scoreReview(truth, good, ok(good)).called_good_a_problem, true);
  assert.equal(scoreReview(truth, good, ok(good)).correct, false);
  const praise = { items: [item('strength', ['test:t01']), item('problem', ['finding:overloaded:GET:api'])] };
  assert.equal(scoreReview(truth, praise, ok(praise)).praised_failing, true);
  assert.equal(scoreReview(truth, praise, ok(praise)).correct, false);
});

test('scoring: no answer, or one the verifier rejects, is wrong', () => {
  assert.equal(scoreReview(truth, null, null).correct, false);
  assert.match(scoreReview(truth, { items: [] }, { ok: false, why: 'R1 shape' }).why, /R1 shape/);
});

test('gates: a model passes only when every line holds', () => {
  const pass = { correct_pct: 95, fallback_pct: 1, error_pct: 0, called_good_a_problem: 0, praised_failing: 0, ms_p95: 4000 };
  assert.deepEqual(gateFailures(pass), []);
  assert.equal(gateFailures({ ...pass, correct_pct: 89 }).length, 1);
  assert.equal(gateFailures({ ...pass, fallback_pct: 2, error_pct: 1 }).length, 1);
  assert.equal(gateFailures({ ...pass, praised_failing: 1, ms_p95: 12000 }).length, 2);
});

// A stand-in for a platform: its model list in the platform's own format, and answers that cite the first two fact ids
// the schema allows (plumbing, not quality, is under test here). OpenRouter reports each call's cost; Vercel does not,
// so the bake-off prices it from the list.
const STAND_INS = {
  openrouter: {
    env: (url) => ({ OPENROUTER_API_KEY: 'test-key', OPENROUTER_BASE_URL: url }),
    model: { id: 'fake/model', pricing: { prompt: '0.0000001', completion: '0.0000005' }, supported_parameters: ['structured_outputs'] },
    usage: { prompt_tokens: 2000, completion_tokens: 100, cost: 0.0003 },
    provider: { data_collection: 'deny', require_parameters: true },
  },
  vercel: {
    env: (url) => ({ AI_GATEWAY_API_KEY: 'test-key', AI_GATEWAY_BASE_URL: url }),
    model: { id: 'fake/model', pricing: { input: '0.0000001', output: '0.0000005' }, tags: ['structured-output'] },
    usage: { prompt_tokens: 2000, completion_tokens: 100 },
    provider: undefined,
  },
};

for (const [platform, s] of Object.entries(STAND_INS)) {
  test(`the bake-off runs end to end through a stand-in for ${platform}, one key for every model`, async () => {
    const bodies = [], keys = new Set();
    const server = createServer(async (req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: [s.model] }));
      keys.add(req.headers.authorization);
      let text = '';
      for await (const chunk of req) text += chunk;
      const body = JSON.parse(text);
      bodies.push(body);
      const ids = body.response_format.json_schema.schema.properties.items.items.properties.facts.items.enum;
      const answer = { headline: 'Look at the busiest part first.', items: [{ kind: 'problem', facts: [ids[0]], text: 'This is where it breaks.', ask: null }, { kind: 'risk', facts: [ids[1]], text: 'This is next.', ask: null }], next: { text: 'Change that part and run it again.', repair: null } };
      res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }], usage: s.usage }));
    }).listen(0);
    await once(server, 'listening');
    const out = `test-${platform}-${process.pid}`;
    try {
      const child = spawn(process.execPath, ['ai-evals/bakeoff.mjs', '--platform', platform, '--models', 'fake/model@low', '--limit', '4', '--repeat', '1', '--out', out], {
        cwd: new URL('..', import.meta.url), env: { ...process.env, ...s.env(`http://127.0.0.1:${server.address().port}`) },
      });
      let log = '';
      child.stdout.on('data', (d) => { log += d; });
      child.stderr.on('data', (d) => { log += d; });
      const [code] = await once(child, 'exit');
      assert.equal(code, 0, log);
      assert.equal(bodies.length, 4);
      assert.deepEqual([...keys], ['Bearer test-key']);
      for (const b of bodies) {
        assert.equal(b.model, 'fake/model');
        assert.equal(b.response_format.type, 'json_schema');
        assert.deepEqual(b.provider, s.provider);
        assert.deepEqual(b.reasoning, { effort: 'low' });
      }
      const md = readFileSync(new URL(`../ai-evals/results/bakeoff-${out}.md`, import.meta.url), 'utf8');
      assert.match(md, /\| 1 \| fake\/model@low \|/);
      // 4 calls: reported $0.0003 each (OpenRouter), or 2,000 in and 100 out at $0.10 / $0.50 a million (Vercel)
      assert.match(md, /Spent about \$0\.001\b/);
    } finally {
      server.close();
      const dir = new URL('../ai-evals/results/', import.meta.url);
      for (const f of readdirSync(dir).filter((f) => f.includes(out))) rmSync(new URL(f, dir));
    }
  });
}

test('evaluate: a call refused for its rate (429) waits and is tried again; calls are paced to the rpm given', async () => {
  const { evaluate, loadCases } = await import('../ai-evals/evaluate.mjs');
  const cases = loadCases({ limit: 2 });
  let calls = 0;
  const slept = [];
  const client = { call: async () => { calls += 1; return calls === 1 ? { ok: false, why: 'http 429', usage: null, ms: 1 } : { ok: false, why: 'http 500', usage: null, ms: 1 }; } };
  const { rows } = await evaluate({ client, config: { maxOutputTokens: 100 }, cases, rpm: 60_000, concurrency: 1, sleep: async (ms) => { slept.push(ms); } });
  assert.equal(calls, 3); // the first case: refused, then tried again; the second case once
  assert.ok(slept.includes(61_000));
  assert.deepEqual(rows.map((r) => r.why), ['http 500', 'http 500']);
});

test('ground truth: a fact stating the same cause counts (over budget: the cost facts; overloaded: the part\'s load)', () => {
  const { cases } = readGroundTruth();
  const budget = cases.find((c) => c.id === 'url-shortener/everything-large');
  assert.deepEqual(budget.also_accept.sort(), ['cost:db', 'cost:total']);
  // the answer from the first real run, marked wrong before also_accept existed
  const raw = { items: [item('problem', ['verdict', 'test:t01-quiet-afternoon', 'cost:total']), item('problem', ['cost:total', 'cost:db', 'cost:api'])] };
  assert.equal(scoreReview(budget, raw, ok(raw)).found_fault, true);
  const overloaded = cases.find((c) => c.id === 'url-shortener/no-cache-one-server');
  assert.deepEqual(overloaded.also_accept, ['load:api']);
  // an alternative is never a fact the judge marked good
  for (const c of cases) for (const id of c.also_accept) assert.ok(!c.never_a_problem.includes(id), `${c.id}: ${id}`);
});

test('rescore: saved answers are marked again against the current truth, without calling a model', async () => {
  const { rescoreRows } = await import('../ai-evals/rescore.mjs');
  const { loadCases } = await import('../ai-evals/evaluate.mjs');
  const c = loadCases().find((x) => x.id === 'url-shortener/everything-large');
  const raw = { headline: 'Your design is over budget and the database drives most of the cost.', items: [{ kind: 'problem', facts: ['cost:total', 'cost:db'], text: 'The database is most of the bill.', ask: null }, { kind: 'problem', facts: ['cost:api'], text: 'The servers are the next largest cost.', ask: null }], next: { text: 'Choose a smaller database and run it again.', repair: null } };
  const [row] = rescoreRows([{ case: c.id, outcome: 'verified', raw }], new Map([[c.id, c.truth]]), new Map([[c.id, c]]));
  assert.equal(row.score.correct, true);
});

test('ground-truth-review.md matches the truth (else: node ai-evals/ground-truth.mjs --sheet)', async () => {
  const { reviewSheet } = await import('../ai-evals/ground-truth.mjs');
  assert.equal(readFileSync(new URL('../ai-evals/ground-truth-review.md', import.meta.url), 'utf8'), reviewSheet(readGroundTruth()));
});
