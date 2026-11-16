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

test('answer key: written for every design, naming only facts the model is shown, and agreeing with the verdict', async () => {
  const { ANSWER_KEY } = await import('../ai-evals/answer-key.mjs');
  const { loadCases } = await import('../ai-evals/evaluate.mjs');
  const { factsFor } = await import('../src/ai/prompt.js');
  const cases = loadCases();
  assert.equal(ANSWER_KEY.size, cases.length);
  for (const c of cases) {
    const k = ANSWER_KEY.get(c.id);
    assert.ok(k, `no answer key for ${c.id}`);
    const sent = new Set(factsFor(c.pack).map((f) => f.id));
    for (const id of [...(Array.isArray(k.lead) ? k.lead : []), ...(k.needs || [])]) assert.ok(sent.has(id), `${c.id}: ${id} is not shown to the model`);
    assert.equal(k.fault === null, c.pack.verdict.word === 'Accepted', c.id);
    if (k.fault !== null) assert.ok(k.fix, `${c.id}: no fix`);
  }
});

test('answer key: the advice is marked (right fix, wrong advice, both faults)', async () => {
  const { ANSWER_KEY } = await import('../ai-evals/answer-key.mjs');
  const { loadCases } = await import('../ai-evals/evaluate.mjs');
  const { verifyReview, namesOf } = await import('../src/ai/verify.js');
  const byId = new Map(loadCases().map((c) => [c.id, c]));
  const mark = (id, items, next) => {
    const c = byId.get(id), raw = { headline: 'The judge found one main fault.', items, next: { text: next, repair: null } };
    return scoreReview(c.truth, raw, verifyReview(raw, c.pack, { names: namesOf(c.pack, c.problem.requests.map((r) => r.name)) }), ANSWER_KEY.get(id));
  };
  const p = (facts, text) => ({ kind: 'problem', facts, text, ask: null });
  // the right fact but a vague next step (a real answer of the first run)
  const vague = mark('url-shortener/no-cache', [p(['finding:p99:GET_LINK:db'], 'The database is the slowest hop at the peak.'), p(['load:db'], 'It runs hot at the busiest moment.')], 'Focus on the database part first and recheck its peak load.');
  assert.equal(vague.found_fault, true);
  assert.equal(vague.correct, false);
  assert.match(vague.why, /no fix suggested/);
  const good = mark('url-shortener/no-cache', [p(['finding:p99:GET_LINK:db'], 'The database is the slowest hop at the peak.'), p(['load:db'], 'It runs hot at the busiest moment.')], 'Put a cache in front of the database for opens, and clear it on write.');
  assert.equal(good.correct, true);
  // more servers for images that need a CDN: wrong advice
  const servers = mark('image-serving/no-cdn', [p(['finding:overloaded:GET_IMAGE:api'], 'The servers get far more views than they can serve.'), p(['load:lb'], 'The load balancer is over its limit too.')], 'Add more servers so the views fit.');
  assert.equal(servers.wrong_advice, true);
  assert.equal(servers.correct, false);
  const cdn = mark('image-serving/no-cdn', [p(['finding:overloaded:GET_IMAGE:api'], 'The servers get far more views than they can serve.'), p(['load:lb'], 'The load balancer is over its limit too.')], 'Serve the images from a CDN in front of the load balancer.');
  assert.equal(cdn.correct, true);
  // two faults: citing only one is not enough
  const one = mark('news-feed/quick-writes', [p(['finding:lost:POST:kv'], 'A post acknowledged by one copy dies with it.'), { kind: 'risk', facts: ['test:t04-a-node-dies'], text: 'The node test failed.', ask: null }], 'Use a write and read quorum so they overlap.');
  assert.equal(one.both_faults, false);
  assert.equal(one.correct, false);
});

test('answer-key.md matches the key (else: node ai-evals/answer-key.mjs)', async () => {
  const { answerKeySheet } = await import('../ai-evals/answer-key.mjs');
  assert.equal(readFileSync(new URL('../ai-evals/answer-key.md', import.meta.url), 'utf8'), answerKeySheet());
});

test('interviewer view: every test design passes the judge, and each flawed one has its own finding on a real line', async () => {
  const { loadDesigns } = await import('../ai-evals/observe-bakeoff.mjs');
  const designs = loadDesigns();
  for (const d of designs) assert.equal(d.pack.verdict.word, 'Accepted', `${d.id} must pass the judge, else it tests nothing the judge misses`);
  const flawed = designs.filter((d) => d.kind === 'flawed');
  assert.ok(flawed.length >= 10);
  assert.equal(new Set(flawed.map((d) => d.finding)).size, flawed.length, 'two flawed designs share a finding');
  for (const d of flawed) assert.ok(d.source.split('\n')[d.line - 1]?.trim(), `${d.id}: line ${d.line} is empty`);
});

test('interviewer view: answers are checked and marked (catch, false alarm, wrong line, bad shape)', async () => {
  const { verifyObserve, scoreObserve } = await import('../ai-evals/observe.mjs');
  const { BLIND_SPOTS } = await import('../ai-evals/blind-spots.mjs');
  const spot = BLIND_SPOTS.find((d) => d.id === 'ticket-booking/one-row-per-show');
  const point = (line, category, severity) => ({ line, category, severity, text: 'One row per show, so booking a seat overwrites the others.' });
  assert.equal(scoreObserve(spot, verifyObserve({ points: [point(7, 'key_choice', 'problem')] }, spot.source)).caught, true);
  assert.match(scoreObserve(spot, verifyObserve({ points: [point(7, 'key_choice', 'consider')] }, spot.source)).why, /right line/);
  assert.match(scoreObserve(spot, verifyObserve({ points: [point(3, 'key_choice', 'problem')] }, spot.source)).why, /missed/);
  assert.equal(verifyObserve({ points: [point(6, 'key_choice', 'problem')] }, spot.source).points.length, 0); // line 6 is blank
  assert.equal(verifyObserve({ points: [point(99, 'key_choice', 'problem')] }, spot.source).dropped[0].rule, 'line');
  assert.equal(verifyObserve({ nope: [] }, spot.source).ok, false);
  const clean = { id: 'x/reference', kind: 'clean', source: spot.source };
  assert.equal(scoreObserve(clean, verifyObserve({ points: [] }, clean.source)).correct, true);
  assert.equal(scoreObserve(clean, verifyObserve({ points: [point(7, 'key_choice', 'consider')] }, clean.source)).correct, true);
  assert.equal(scoreObserve(clean, verifyObserve({ points: [point(7, 'key_choice', 'problem')] }, clean.source)).false_alarms, 1);
  assert.equal(scoreObserve(clean, verifyObserve({ points: [point(5, 'security', 'problem')] }, clean.source), ['security']).correct, true);
});

test('interviewer-view test script, end to end against a stand-in for Vercel: marks, saves each answer, resumes, keeps to the budget', async () => {
  const { loadDesigns } = await import('../ai-evals/observe-bakeoff.mjs');
  const designs = loadDesigns();
  const calls = [];
  // the stand-in answers like a careful model: a "problem" on the flawed line of a flawed design, nothing on a clean one
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: [
      { id: 'fake/good', pricing: { input: '0.0000001', output: '0.0000005' }, tags: ['structured-output'] },
      { id: 'fake/dear', pricing: { input: '0.01', output: '0.01' }, tags: ['structured-output'] },
    ] }));
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    calls.push(body.model);
    const d = designs.find((x) => body.messages[1].content.includes(x.source.split('\n').find((l) => l.startsWith('table')) || x.source.split('\n')[0]) && body.messages[1].content.includes(x.source.split('\n')[x.line ? x.line - 1 : 0]));
    const points = d?.kind === 'flawed' ? [{ line: d.line, category: d.categories[0], severity: 'problem', text: 'This line is wrong for this problem.' }] : [];
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ points }) } }], usage: { prompt_tokens: 1300, completion_tokens: 300 } }));
  }).listen(0);
  await once(server, 'listening');
  const out = `obs-test-${process.pid}`, env = { ...process.env, AI_GATEWAY_API_KEY: 'test-key', AI_GATEWAY_BASE_URL: `http://127.0.0.1:${server.address().port}` };
  const run = async (extra) => {
    const child = spawn(process.execPath, ['ai-evals/observe-bakeoff.mjs', '--models', 'fake/good@low,fake/dear', '--repeat', '1', '--rpm', '0', '--out', out, ...extra], { cwd: new URL('..', import.meta.url), env });
    let log = '';
    child.stdout.on('data', (x) => { log += x; });
    child.stderr.on('data', (x) => { log += x; });
    const [code] = await once(child, 'exit');
    assert.equal(code, 0, log);
    return log;
  };
  try {
    const first = await run(['--limit', '12']);
    assert.match(first, /fake\/dear.*skipped: over the \$2 budget/);            // the budget guard
    assert.equal(calls.filter((m) => m === 'fake/dear').length, 0);
    assert.equal(calls.length, 12);                                              // one answer per design
    const lines = readFileSync(new URL(`../ai-evals/results/observe-${out}-fake_good_low.jsonl`, import.meta.url), 'utf8').trim().split('\n');
    assert.equal(lines.length, 12);                                              // saved as it went
    await run(['--limit', '14', '--resume']);
    assert.equal(calls.length, 14);                                              // resume: only the 2 new designs
    const md = readFileSync(new URL(`../ai-evals/results/observe-${out}.md`, import.meta.url), 'utf8');
    assert.match(md, /\| 1 \| fake\/good@low \| yes \| 100 % \| 0 % \|/);       // the careful stand-in clears the bar
    assert.match(md, /Which model caught which flaw/);
  } finally {
    server.close();
    const dir = new URL('../ai-evals/results/', import.meta.url);
    for (const f of readdirSync(dir).filter((f) => f.includes(out))) rmSync(new URL(f, dir));
  }
});

test('interviewer-view script: finds every free reasoning model (catalog + one tiny call each)', async () => {
  const { discoverFreeReasoning } = await import('../ai-evals/observe-bakeoff.mjs');
  const catalog = { data: [
    { id: 'a/free-thinker', type: 'language', tags: ['reasoning', 'structured-output'], reasoning_options: [{ type: 'effort', values: ['minimal', 'low', 'high'] }] },
    { id: 'b/paid-thinker', type: 'language', tags: ['reasoning', 'structured-output'] },
    { id: 'c/no-reasoning', type: 'language', tags: ['structured-output'] },
    { id: 'd/free-thinker-batch', type: 'language', tags: ['reasoning', 'structured-output'] },
    { id: 'e/free-no-effort', type: 'language', tags: ['reasoning', 'structured-output'] },
  ] };
  const tried = [];
  const fake = async (url, init) => {
    if (url.endsWith('/models')) return { json: async () => catalog };
    const model = JSON.parse(init.body).model;
    tried.push(model);
    return { json: async () => (model.startsWith('b/') ? { error: { message: 'Free tier users do not have access to this model.' } } : { choices: [{ message: { content: 'ok' } }] }) };
  };
  const specs = await discoverFreeReasoning({ base: 'http://x' }, 'k', { fetch: fake });
  assert.deepEqual(tried, ['a/free-thinker', 'b/paid-thinker', 'e/free-no-effort']);
  assert.deepEqual(specs, ['a/free-thinker@low', 'e/free-no-effort']);
});
