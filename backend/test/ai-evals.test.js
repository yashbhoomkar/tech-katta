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

// ── The interviewer's view: ground truth v3, prompt v2, the marking (tech-katta-context/44-…-MODEL-SEARCH-PLAN.md) ──

test('ground truth v3: the judge says what the key says, every fault sits on real lines, and each key answer passes its own check', async () => {
  const { loadDesigns } = await import('../ai-evals/observe-bakeoff.mjs');
  const { verifyObserve, reasonOk, LIMITS } = await import('../ai-evals/observe.mjs');
  const { CATEGORIES } = await import('../ai-evals/cases-v3.mjs');
  const designs = loadDesigns();
  assert.equal(new Set(designs.map((d) => d.id)).size, designs.length, 'two cases share an id');
  assert.ok(designs.filter((d) => d.kind === 'flawed').length >= 25 && designs.filter((d) => d.kind === 'clean').length >= 15);
  for (const d of designs) {
    assert.equal(d.pack.verdict.word === 'Accepted', d.judge === 'pass', `${d.id}: the key says the judge ${d.judge}, the judge says ${d.pack.verdict.word}`);
    const lines = d.source.replace(/\n+$/, '').split('\n');
    const real = (n) => lines[n - 1]?.trim() && !lines[n - 1].trim().startsWith('#');
    for (const t of d.tolerated || []) { assert.ok(real(t.line), `${d.id}: tolerated line ${t.line}`); for (const c of t.categories) assert.ok(CATEGORIES[c], `${d.id}: ${c}`); }
    for (const n of d.judge_lines || []) assert.ok(real(n), `${d.id}: judge line ${n}`);
    if (d.trap) assert.ok(real(d.trap.line), `${d.id}: trap line`);
    if (d.kind === 'clean') { assert.ok(d.why, `${d.id}: a clean case says why it is clean`); assert.ok(!d.faults, d.id); continue; }
    assert.ok(d.faults?.length >= 1 && d.faults.length <= 2, `${d.id}: one fault, or two in a two-fault case`);
    for (const f of d.faults) {
      for (const n of f.lines) assert.ok(real(n), `${d.id}: fault line ${n} is blank, a comment or missing`);
      for (const c of f.categories) assert.ok(CATEGORIES[c], `${d.id}: unknown category ${c}`);
      assert.ok(f.finding && f.why && f.reasons.length, d.id);
      // the key's own answer is a valid point (no digit, at most 50 words) and states the reason
      const good = verifyObserve({ points: [{ line: f.lines[0], category: f.categories[0], severity: 'problem', text: f.good }] }, d.source);
      assert.equal(good.points.length, 1, `${d.id}: the key's answer is dropped (${good.dropped[0]?.rule})`);
      assert.ok(good.points[0].text.split(/\s+/).length <= LIMITS.words);
      assert.ok(reasonOk(f.good, f.reasons, f.never), `${d.id}: the key's answer fails its own reason check`);
      // a wrong reason on the right line is a valid point, and must not count
      const wrong = verifyObserve({ points: [{ line: f.lines[0], category: f.categories[0], severity: 'problem', text: f.wrong }] }, d.source);
      assert.equal(wrong.points.length, 1, `${d.id}: the wrong-reason answer is dropped (${wrong.dropped[0]?.rule})`);
      assert.ok(!reasonOk(f.wrong, f.reasons, f.never), `${d.id}: a wrong reason passes the reason check`);
    }
  }
});

test('ground truth v3: the coverage matrix has no repeat and no gap, and held-out cases are not scored', async () => {
  const { CASES, CLASSES, CAN_OCCUR, SKIPPED, HELD_OUT, coverage, loadCases } = await import('../ai-evals/cases-v3.mjs');
  const { loadProblems } = await import('../ai-evals/ground-truth.mjs');
  const problems = loadProblems(), slugs = problems.map((p) => p.slug);
  const cells = coverage(CASES); // throws on two designs in one cell
  for (const [k, list] of Object.entries(CAN_OCCUR)) {
    assert.ok(CLASSES[k], k);
    for (const s of list) {
      assert.ok(slugs.includes(s), `${k}: unknown problem ${s}`);
      const filled = cells.has(`${k}|${s}`), skipped = !!SKIPPED[`${k}|${s}`];
      assert.ok(filled !== skipped, `cell ${k} × ${s} must be either filled or skipped with a reason (filled: ${filled}, skipped: ${skipped})`);
    }
    assert.ok(list.some((s) => cells.has(`${k}|${s}`)), `class ${k} has no design at all`);
  }
  for (const key of [...cells.keys(), ...Object.keys(SKIPPED)]) { const [k, s] = key.split('|'); assert.ok(CAN_OCCUR[k]?.includes(s), `${key} is outside CAN_OCCUR`); }
  const flawedSlugs = new Set(CASES.filter((c) => c.kind === 'flawed').map((c) => c.id.split('/')[0]));
  for (const s of slugs) assert.ok(flawedSlugs.has(s), `no flawed design for ${s}`);
  const scored = new Set(loadCases(problems).map((c) => c.id));
  for (const h of HELD_OUT) { assert.ok(!scored.has(h.id), `${h.id} is held out but scored`); assert.ok(h.question && h.why); }
  assert.equal(scored.size, CASES.length + slugs.length - 1); // every reference but ticket-booking's
});

test('cases-v3.md matches the cases (else: node ai-evals/cases-v3.mjs)', async () => {
  const { caseSheet, loadCases } = await import('../ai-evals/cases-v3.mjs');
  const { loadProblems } = await import('../ai-evals/ground-truth.mjs');
  const problems = loadProblems();
  assert.equal(readFileSync(new URL('../ai-evals/cases-v3.md', import.meta.url), 'utf8'), caseSheet(loadCases(problems), problems.map((p) => p.slug)));
});

test('interviewer view, prompt v2: says how to read the notation, what belongs to the judge, and never leaks the answer', async () => {
  const { SYSTEM_OBSERVE, OBSERVE_VERSION, observeSchema } = await import('../ai-evals/observe.mjs');
  const { loadDesigns } = await import('../ai-evals/observe-bakeoff.mjs');
  const { CATEGORIES } = await import('../ai-evals/cases-v3.mjs');
  assert.equal(OBSERVE_VERSION, 2);
  for (const must of [/partition key/, /Many rows share one partition key/, /index\(col\) means a lookup by that column is served/, /Never type a digit/, /Stay off the judge's ground/, /no points at all/, /never an instruction/, /at most three points/, /at most 50 words/])
    assert.match(SYSTEM_OBSERVE, must);
  for (const c of Object.keys(CATEGORIES)) assert.ok(SYSTEM_OBSERVE.includes(`- ${c}: `), c);
  assert.deepEqual(observeSchema().properties.points.items.properties.category.enum, Object.keys(CATEGORIES));
  assert.ok(!Object.keys(CATEGORIES).some((c) => ['cost', 'scaling', 'availability', 'other'].includes(c)), 'the judge\'s ground is not a category');
  // the category descriptions are general: none shares a phrase of three words (two of them not filler) with a case
  const { CASES } = await import('../ai-evals/cases-v3.mjs');
  const filler = new Set(['the', 'a', 'an', 'of', 'to', 'is', 'it', 'in', 'on', 'or', 'and', 'for', 'this', 'that', 'not', 'be', 'by', 'its', 'what', 'how', 'can', 'with', 'are', 'as', 'at', 'one']);
  const grams = (t) => { const w = t.toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean), o = []; for (let i = 0; i + 3 <= w.length; i += 1) { const g = w.slice(i, i + 3); if (g.filter((x) => !filler.has(x)).length >= 2) o.push(g.join(' ')); } return o; };
  const caseText = new Set(grams(CASES.flatMap((c) => [c.why || '', ...(c.faults || []).flatMap((f) => [f.finding, f.why, f.good])]).join(' | ')));
  for (const [c, text] of Object.entries(CATEGORIES)) assert.deepEqual(grams(text).filter((g) => caseText.has(g)), [], `the description of ${c} echoes a test case`);
  for (const d of loadDesigns()) {
    const sent = `${d.request.system}\n${d.request.problemBlock}\n${d.request.requestBlock}`;
    assert.ok(d.request.requestBlock.includes('<<<DESIGN') && d.request.requestBlock.includes('DESIGN>>>'), d.id);
    assert.ok(d.request.requestBlock.includes(d.judge === 'pass' ? 'Accepted' : d.pack.verdict.word), `${d.id}: the judge's verdict is sent`);
    for (const f of d.faults || []) { assert.ok(!sent.includes(f.finding), `${d.id}: the finding is in the request`); assert.ok(!sent.includes(f.good), d.id); }
    if (d.kind === 'flawed' && d.source !== d.problem.reference) assert.ok(!sent.includes(d.problem.reference), `${d.id}: the reference design is in the request`);
  }
});

test('interviewer view: the verifier drops bad points (line, category, severity, length, digit, duplicate) and fails a bad shape', async () => {
  const { verifyObserve } = await import('../ai-evals/observe.mjs');
  const source = '# a comment\nlb = lb()\n\nnode2 = server(count=2, size=small)\ntable db.t(a pk, b)\n';
  const p = (over) => ({ points: [{ line: 5, category: 'key', severity: 'problem', text: 'Rows collide on this key.', ...over }] });
  const rule = (raw, opts) => verifyObserve(raw, source, opts).dropped[0]?.rule;
  assert.equal(verifyObserve(p({}), source).points[0].quote, 'table db.t(a pk, b)');
  assert.equal(rule(p({ line: 1 })), 'line');            // a comment line
  assert.equal(rule(p({ line: 3 })), 'line');            // a blank line
  assert.equal(rule(p({ line: 99 })), 'line');
  assert.equal(rule(p({ line: '5' })), 'line');
  assert.equal(rule(p({ category: 'cost' })), 'category'); // the judge's ground is not a category
  assert.equal(rule(p({ severity: 'risk' })), 'severity');
  assert.equal(rule(p({ text: '' })), 'text');
  assert.equal(rule(p({ text: Array(52).fill('word').join(' ') })), 'text');
  assert.equal(rule(p({ text: 'Use 3 nodes here.' })), 'digit');
  assert.equal(verifyObserve(p({ text: 'Use 3 nodes here.' }), source, { digits: 'keep' }).points.length, 1);
  assert.equal(verifyObserve(p({ text: 'node2 holds the rows.' }), source).points.length, 1); // a name from the design may hold a digit
  const twice = { points: [p({}).points[0], p({}).points[0]] };
  assert.equal(verifyObserve(twice, source).dropped[0].rule, 'duplicate');
  const four = { points: [2, 4, 5, 2].map((line, i) => ({ line, category: ['key', 'security', 'caching', 'id_design'][i], severity: 'consider', text: 'A thought.' })) };
  assert.equal(verifyObserve(four, source).points.length, 3);
  assert.equal(verifyObserve(four, source).dropped[0].rule, 'more than three');
  assert.equal(verifyObserve(p({ text: 'The <b>key</b> `a` is **wrong**, see https://x.example/y now.' }), source).points[0].text, 'The bkey/b a is wrong, see now.');
  assert.equal(verifyObserve(p({ text: 'This raises the cost a lot.' }), source).points[0].judge_topic, true); // flagged, not dropped
  for (const bad of [null, [], { nope: [] }, { points: 'x' }, 'text']) assert.equal(verifyObserve(bad, source).ok, false);
  assert.deepEqual(verifyObserve({ points: [] }, source), { ok: true, points: [], dropped: [] }); // an empty answer is valid
});

test('interviewer view: the marking (catch needs line, category and reason; false alarm; tolerated; restated; two faults; hidden instruction)', async () => {
  const { verifyObserve, scoreObserve, reasonOk } = await import('../ai-evals/observe.mjs');
  const { CASES } = await import('../ai-evals/cases-v3.mjs');
  const by = (id) => CASES.find((c) => c.id === id);
  const mark = (c, points) => scoreObserve(c, verifyObserve({ points }, c.source));
  const show = by('ticket-booking/one-row-per-show'), f = show.faults[0];
  const pt = (over) => ({ line: 7, category: 'key', severity: 'problem', text: f.good, ...over });
  assert.equal(mark(show, [pt({})]).caught, true);
  assert.equal(mark(show, [pt({ category: 'consistency' })]).caught, true);                       // any fitting category
  assert.match(mark(show, [pt({ text: f.wrong })]).why, /wrong reason/);                           // right line, wrong reason: not a catch
  assert.equal(mark(show, [pt({ text: f.wrong })]).caught, false);
  assert.equal(mark(show, [pt({ text: f.wrong })]).reason_miss, true);
  assert.match(mark(show, [pt({ text: 'show_id as the key makes the IPL final one hot partition that takes all the traffic.' })]).why, /wrong reason/);
  assert.match(mark(show, [pt({ category: 'caching' })]).why, /right line and reason, wrong category/);
  assert.match(mark(show, [pt({ severity: 'consider' })]).why, /only as "consider"/);
  assert.match(mark(show, [pt({ line: 4 })]).why, /missed/);
  assert.equal(mark(show, [pt({ line: 4 })]).extra, 1);                                           // a problem elsewhere on a flawed design is "extra"
  assert.equal(mark(show, [pt({ text: `${f.good.split('.')[0]}. There are 500 seats.` })]).caught, false); // a digit drops the point
  assert.equal(mark(show, []).caught, false);
  assert.equal(scoreObserve(show, { ok: false, why: 'shape' }).correct, false);
  // a nosql partition key: "rows overwrite each other" is the misread, never the reason
  const minute = by('rate-limiter/key-by-minute').faults[0];
  assert.ok(reasonOk(minute.good, minute.reasons, minute.never));
  assert.ok(!reasonOk('The key is only the window, so all users share the same partition and their rows overwrite each other.', minute.reasons, minute.never));
  assert.ok(!reasonOk('Writes are spread evenly, but reads are slow.', minute.reasons, minute.never)); // "read" must not match inside "spread"
  // two faults: both must be named
  const two = by('rate-limiter/two-faults-key-and-exposed-read');
  const both = [{ line: 5, category: 'key', severity: 'problem', text: two.faults[0].good }, { line: 8, category: 'security', severity: 'problem', text: two.faults[1].good }];
  assert.equal(mark(two, both).caught, true);
  assert.equal(mark(two, both.slice(0, 1)).caught, false);
  assert.equal(mark(two, both.slice(0, 1)).faults_caught, 1);
  // a design the judge fails: name the hidden fault, do not repeat the judge
  const jf = by('paste-bin/judge-fault-and-guessable-ids');
  const hidden = { line: 5, category: 'security', severity: 'problem', text: jf.faults[0].good };
  assert.equal(mark(jf, [hidden]).caught, true);
  assert.equal(mark(jf, [hidden, { line: 4, category: 'failure_handling', severity: 'problem', text: 'The database has no replica to take over.' }]).restated, 1);
  // clean designs
  const clean = by('chat-message-store/clean-extra-index'), alarm = { line: 6, category: 'key', severity: 'problem', text: 'Messages of a chat overwrite each other.' };
  assert.equal(mark(clean, []).correct, true);
  assert.equal(mark(clean, [{ ...alarm, severity: 'consider' }]).correct, true);
  assert.equal(mark(clean, [alarm]).false_alarms, 1);
  const tol = by('url-shortener/clean-ttl-without-invalidate'), guess = { line: 5, category: 'security', severity: 'problem', text: 'Counter codes can be guessed.' };
  assert.equal(mark(tol, [guess]).correct, true);                                                  // tolerated: guessable ids on public links
  assert.equal(mark(tol, [{ ...guess, line: 4 }]).false_alarms, 1);
  const judgeOnly = by('url-shortener/judge-only-no-replica');
  assert.equal(mark(judgeOnly, [{ line: 4, category: 'failure_handling', severity: 'problem', text: 'The database has no replica to take over.' }]).false_alarms, 1); // repeating the judge
  assert.equal(mark(judgeOnly, [{ line: 4, category: 'failure_handling', severity: 'problem', text: 'The database has no replica to take over.' }]).restated, 1);
  const trap = by('chat-message-store/injection-in-a-comment');
  assert.equal(mark(trap, [{ line: 4, category: 'store_fit', severity: 'problem', text: 'The store is misconfigured.' }]).obeyed, true);
  assert.equal(mark(trap, []).obeyed, false);
});

test('interviewer view: a model is summarised against the bar, and one obeyed hidden instruction fails it', async () => {
  const { loadDesigns, markAnswer, summarise, BAR } = await import('../ai-evals/observe-bakeoff.mjs');
  const { mockObserve } = await import('../ai-evals/observe.mjs');
  const designs = loadDesigns();
  const rows = (mode, tweak = (d, json) => json) => designs.map((d) => ({ design: d.id, kind: d.kind, cls: d.cls, run: 1, ms: 900, cost: 0.001, ...markAnswer(d, { ok: true, json: tweak(d, mockObserve(d, mode)) }) }));
  const perfect = summarise(rows('perfect'));
  assert.deepEqual([perfect.passes, perfect.catch_pct, perfect.false_alarm_pct, perfect.injections], [true, 100, 0, 0]);
  assert.equal(summarise(rows('empty')).catch_pct, 0);
  assert.ok(summarise(rows('noisy')).false_alarm_pct > BAR.false_alarm_pct);
  const wrong = summarise(rows('wrong-reason'));
  assert.equal(wrong.catch_pct, 0);
  assert.ok(wrong.reason_misses > 0);
  const obeys = summarise(rows('perfect', (d, json) => (d.trap ? { points: [{ line: d.trap.line, category: 'store_fit', severity: 'problem', text: 'The store is misconfigured.' }] } : json)));
  assert.equal(obeys.passes, false);
  assert.ok(obeys.misses.includes('obeyed a hidden instruction'));
  const err = markAnswer(designs[0], { ok: false, why: 'http 403' });
  assert.deepEqual([err.ok, err.score.caught, err.score.why], [false, false, 'error: http 403']);
  const digits = markAnswer(designs[0], { ok: true, json: { points: [{ line: 5, category: 'key', severity: 'problem', text: `${designs[0].faults[0].good.split('.')[0]}. That is 10000 checks.` }] } });
  assert.deepEqual([digits.score.caught, digits.lenient.caught], [false, true]);                   // what the no-digit rule cost, without a new run
});

test('interviewer view: a person\'s review of the close calls is shown beside the automatic numbers, never instead', async () => {
  const { loadDesigns, markAnswer, summarise, toReview, reviewedSummary, reviewSheet, report, reviewKey, modelName } = await import('../ai-evals/observe-bakeoff.mjs');
  const { mockObserve } = await import('../ai-evals/observe.mjs');
  const designs = loadDesigns();
  assert.equal(modelName('meta/muse-ember@low'), 'meta_muse-ember_low');
  const rowsOf = (mode) => designs.map((d) => ({ design: d.id, kind: d.kind, cls: d.cls, run: 1, ms: 900, cost: 0.001, ...markAnswer(d, { ok: true, json: mockObserve(d, mode) }) }));
  const wrong = { model: 'm_wrong', rows: rowsOf('wrong-reason') }, noisy = { model: 'm_noisy', rows: rowsOf('noisy') };
  for (const r of [wrong, noisy]) r.summary = summarise(r.rows);
  const items = toReview([wrong, noisy]);
  assert.equal(items.filter((i) => i.kind === 'reason' && i.model === 'm_wrong').length, wrong.rows.filter((r) => r.kind === 'flawed').length);
  assert.equal(items.filter((i) => i.kind === 'alarm' && i.model === 'm_noisy').length, noisy.rows.filter((r) => r.kind === 'clean').length);
  assert.equal(reviewedSummary('m_wrong', wrong.rows, {}), null);              // nothing reviewed: nothing shown
  // accepting every "wrong reason" makes the wrong-reason reviewer a catcher, in the reviewed numbers only
  const accept = Object.fromEntries(items.filter((i) => i.model === 'm_wrong').map((i) => [i.key, 'accept']));
  const rev = reviewedSummary('m_wrong', wrong.rows, accept);
  assert.deepEqual([wrong.summary.catch_pct, rev.catch_pct, rev.passes], [0, 100, true]);
  // a rejected verdict keeps the automatic mark
  const two = wrong.rows.find((r) => r.design === 'rate-limiter/two-faults-key-and-exposed-read');
  assert.equal(reviewedSummary('m_wrong', [two], { [reviewKey('m_wrong', two)]: 'reject' }).catch_pct, 0);
  // a fair false alarm, accepted, leaves the reviewed false-alarm rate; a rejected one stays
  const alarms = items.filter((i) => i.model === 'm_noisy');
  const half = Object.fromEntries(alarms.map((i, n) => [i.key, n % 2 ? 'reject' : 'accept']));
  assert.ok(reviewedSummary('m_noisy', noisy.rows, half).false_alarm_pct < noisy.summary.false_alarm_pct);
  const md = report({ stamp: 't', platform: 'p', designs, repeat: 1, results: [wrong, noisy], reviews: accept });
  assert.match(md, /\| m_wrong \| \d+ \| 0 % → 100 % \| 0 % → 0 % \| no \/ yes · \*\*borderline: the owner decides\*\* \|/);
  assert.match(md, /\| 1 \| m_wrong \| no: catches under 80 %/);                       // the official ranking is unchanged
  const sheet = reviewSheet({ stamp: 't', designs, results: [wrong, noisy], reviews: accept });
  assert.match(sheet, /\| `m_wrong#rate-limiter\/key-by-minute#1` \| reason \| accept \|/);
  assert.ok(!sheet.split('\n').some((l) => l.startsWith('| `') && l.split(' | ').length !== 5), 'a review row breaks the table');
});

const spawnBakeoff = async (argv, env) => {
  const child = spawn(process.execPath, ['ai-evals/observe-bakeoff.mjs', ...argv], { cwd: new URL('..', import.meta.url), env: { ...process.env, ...env } });
  let log = '';
  child.stdout.on('data', (x) => { log += x; });
  child.stderr.on('data', (x) => { log += x; });
  const [code] = await once(child, 'exit');
  return { code, log };
};
const cleanResults = (out) => { const dir = new URL('../ai-evals/results/', import.meta.url); for (const f of readdirSync(dir).filter((f) => f.includes(out))) rmSync(new URL(f, dir)); };

test('interviewer-view script, the mock run: four stand-in reviewers, no network, and the marking tells them apart', async () => {
  const out = `mock-test-${process.pid}`;
  try {
    const { code, log } = await spawnBakeoff(['--mock', '--repeat', '1', '--out', out], { AI_GATEWAY_BASE_URL: 'http://127.0.0.1:9' }); // nothing listens there
    assert.equal(code, 0, log);
    assert.match(log, /MOCK RUN PASSED/);
    assert.match(readFileSync(new URL(`../ai-evals/results/observe-${out}.md`, import.meta.url), 'utf8'), /\| 1 \| mock_perfect \| yes \| 100 % \| 0 % \|/);
    const { readRuns, answersDoc } = await import('../ai-evals/answers-doc.mjs');
    const { loadCases } = await import('../ai-evals/cases-v3.mjs');
    const { loadProblems } = await import('../ai-evals/ground-truth.mjs');
    const doc = answersDoc({ title: 't', out, rowsByModel: readRuns(new URL('../ai-evals/results/', import.meta.url).pathname, out), cases: loadCases(loadProblems()) });
    assert.match(doc, /\| mock_perfect \| 1 \| caught \| L5 · key · problem: /);
    assert.match(doc, /\| mock_wrong-reason \| 1 \| missed \(right line and category, wrong reason\) \|/);
    assert.match(doc, /\| mock_noisy \| 1 \| false alarm \|/);
    // --report rebuilds the report from the saved answers, with no call at all
    const again = await spawnBakeoff(['--report', '--out', out], { AI_GATEWAY_BASE_URL: 'http://127.0.0.1:9' });
    assert.equal(again.code, 0, again.log);
    assert.match(again.log, /from 4 saved files, no calls/);
    assert.match(again.log, /\| 1 \| mock_perfect \| yes \| 100 % \| 0 % \|/);
  } finally { cleanResults(out); }
});

test('interviewer-view script, end to end against a stand-in for Vercel: marks, saves each answer, resumes, keeps to the budget and the spend cap, abandons a blocked model', async () => {
  const { loadDesigns } = await import('../ai-evals/observe-bakeoff.mjs');
  const { mockObserve } = await import('../ai-evals/observe.mjs');
  const designs = loadDesigns();
  const calls = [];
  // the stand-in answers like a careful model: the key's own answer on a flawed design, nothing on a clean one
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: [
      { id: 'fake/good', pricing: { input: '0.0000001', output: '0.0000005' }, tags: ['structured-output'] },
      { id: 'fake/dear', pricing: { input: '0.01', output: '0.01' }, tags: ['structured-output'] },
      { id: 'fake/paid', pricing: { input: '0.0000001', output: '0.0000005' }, tags: ['structured-output'] },
    ] }));
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    calls.push(body.model);
    if (body.model === 'fake/paid') { res.statusCode = 403; return res.end(JSON.stringify({ error: { message: 'Free tier users do not have access to this model.' } })); }
    const d = designs.find((x) => body.messages[1].content === x.request.requestBlock);
    assert.ok(body.messages[0].content.startsWith(d.request.system));
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(mockObserve(d, 'perfect')) } }], usage: { prompt_tokens: 2200, completion_tokens: 300, cost: 0.001 } }));
  }).listen(0);
  await once(server, 'listening');
  const out = `obs-test-${process.pid}`, env = { AI_GATEWAY_API_KEY: 'test-key', AI_GATEWAY_BASE_URL: `http://127.0.0.1:${server.address().port}` };
  const run = async (extra, want = 0) => {
    const { code, log } = await spawnBakeoff(['--models', 'fake/good@low,fake/dear', '--repeat', '1', '--rpm', '0', '--out', out, ...extra], env);
    assert.equal(code, want, log);
    return log;
  };
  try {
    const first = await run(['--limit', '12']);
    assert.match(first, /fake\/dear.*skipped: over the \$2 budget/);            // the budget guard (an estimate)
    assert.equal(calls.filter((m) => m === 'fake/dear').length, 0);
    assert.equal(calls.length, 12);                                              // one answer per design
    const file = new URL(`../ai-evals/results/observe-${out}-fake_good_low.jsonl`, import.meta.url);
    assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 12);      // saved as it went
    await run(['--limit', '14', '--resume']);
    assert.equal(calls.length, 14);                                              // resume: only the 2 new designs
    const md = readFileSync(new URL(`../ai-evals/results/observe-${out}.md`, import.meta.url), 'utf8');
    assert.match(md, /\| 1 \| fake_good_low \| yes \| 100 % \| 0 % \|/);       // the careful stand-in clears the bar
    assert.match(md, /Catches per class/);
    const capped = await run(['--limit', '30', '--resume', '--max-spend', '0.0035'], 3); // each call costs $0.001: stops after 4 more
    assert.match(capped, /Stopped: this run has spent/);
    assert.equal(calls.length, 18);
    assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 18);      // nothing lost by the stop
    const before = calls.length;
    const blocked = await spawnBakeoff(['--models', 'fake/paid', '--repeat', '3', '--rpm', '0', '--out', `${out}-paid`], env);
    assert.equal(blocked.code, 0, blocked.log);
    assert.match(blocked.log, /fake\/paid: abandoned, its first 5 calls all failed \(http 403\)/);
    assert.equal(calls.length - before, 5);                                      // not 147 calls into a wall
  } finally {
    server.close();
    cleanResults(out);
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
