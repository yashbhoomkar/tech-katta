// Every Interview Question's solution is right for the learner (the audit of 2026-11-24, Part A).
// For each of the 22 problems: the reference is Accepted with the full 50 design points and no warning, it keeps
// a tenth of its budget to spare, holds more traffic than the busiest test sends and pays for nothing it does not
// need; the starting design and every wrong design fail; copying the solution scores 100; the article shows
// a call for every row the written API step is marked on; more capacity never fails a design only on cost.
// A problem that cannot meet one rule is listed below with its reason, and the exception itself is checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { evaluate } from '../eval/judge.js';
import { headroom, waste } from '../eval/probes.js';
import { gradeAnswer, score } from './judge.js';
import { modelAnswer } from './model.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const dir = new URL('articles/interview-questions/', content);
const articles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(f, dir)))]).filter(([, a]) => a.practice);
const counts = Object.fromEntries((lab.components || []).filter((c) => c.count).map((c) => [c.type, c.count]));

// ---- The exceptions: one line of reason each (and each is verified below) ------------------------------------------
// A budget with less than 10 % to spare: the problem's own "Biggest everything" design costs only a few per cent more
// than the reference, so a roomier cap would let that wrong design pass.
const TIGHT_BUDGET = {
  'ind-vs-pak': 'Biggest everything costs only 5.5 % more than the reference',
  'photo-sharing': 'Biggest everything costs only 11 % more than the reference, so a 10 % cushion would let it pass the cap',
  'video-streaming': 'Biggest everything costs only 1.4 % more than the reference',
};
// More capacity that costs more than the budget: doubling the part must still leave "Biggest everything" over its cap.
const DOUBLING_COSTS = { 'coding-judge': 'doubling the Judges costs $11,750 and Biggest everything $12,246: no cap fits between' };
// Cannot hold 1.25 times the busiest test.
const LOW_HEADROOM = {
  'file-sync': 'any design with that headroom makes the queue and its workers unnecessary for the tests, so the mutation test could not prove them',
  'shared-editor': 'one load balancer refuses above 100,000 calls a second and the busiest test sends 80,000: the most it can hold is 1.25 times',
};
// Parts the tests alone would let it shrink: holding 1.25 times the busiest test needs more than the tests need.
// Verified below: making every change the probe lists takes the headroom under 1.25.
const PAID_FOR_HEADROOM = new Set(['ad-clicks', 'coding-judge', 'dating-swipes', 'grocery-delivery', 'key-value-store', 'leaderboard', 'notifications', 'restaurants-near-me', 'rider-dispatch', 'shared-editor', 'url-shortener', 'web-crawler']);

const budgetTest = (p) => p.tests.find((t) => (t.checks || []).some((c) => c.kind === 'cost'));
const cap = (p) => budgetTest(p)?.checks.find((c) => c.kind === 'cost').max;
const costOf = (judged, p) => judged.results.find((r) => r.id === budgetTest(p)?.id)?.metrics?.avgMonthly;
const withConfig = (d, id, patch) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, config: { ...(n.config || {}), ...patch } } : n)) });

// every call "METHOD /path" in an article's body
export function callsIn(article) {
  const text = JSON.stringify(article.body).replace(/\\n/g, ' ');
  return [...text.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s"\\?]*)/g)].map((m) => [m[1], m[2]]);
}

test('there are 22 Interview Question problems', () => assert.equal(articles.length, 22));

for (const [slug, article] of articles) {
  const p = article.practice;
  const ref = evaluate(p.reference, lab, p);

  test(`${slug}: the reference is Accepted with 50 design points and no warning`, () => {
    assert.equal(ref.verdict, 'accepted', ref.results.filter((r) => !r.ok).map((r) => `${r.id}: ${(r.why || []).join(' ')}`).join('\n'));
    assert.ok(ref.designPoints >= 49.5, `design points ${ref.designPoints}`);
    const bad = ref.findings.filter((f) => f.severity === 'warn' || f.severity === 'fail');
    assert.deepEqual(bad.map((f) => `${f.severity} ${f.code} ${f.nodes}`), []);
  });

  test(`${slug}: the reference keeps a tenth of its budget to spare`, () => {
    if (cap(p) === undefined) return;
    const c = costOf(ref, p), room = 1 - c / cap(p);
    if (TIGHT_BUDGET[slug]) { assert.ok(room > 0, 'still inside the budget'); return; }
    assert.ok(c <= 0.9 * cap(p), `$${Math.round(c)} against a $${cap(p)} cap leaves ${(room * 100).toFixed(1)} %`);
  });

  test(`${slug}: the starting design is not Accepted and every wrong design fails its named test`, () => {
    assert.notEqual(evaluate(p.start, lab, p).verdict, 'accepted');
    for (const w of p.wrong) {
      const r = evaluate(w, lab, p), t = r.results.find((x) => x.id === w.fails);
      assert.ok(t, `${w.name}: no test ${w.fails}`);
      assert.equal(t.ok, false, `${w.name} should fail ${w.fails}`);
    }
  });

  test(`${slug}: copying the solution (design and model answer) scores 100`, () => {
    assert.equal(score(gradeAnswer(modelAnswer(p.rubric), p.rubric), ref, 0).total, 100);
  });

  test(`${slug}: the article shows a call for every row of the API step`, () => {
    const calls = callsIn(article);
    for (const row of p.rubric.api || []) {
      const ms = row.method.split('|'), re = new RegExp(row.path, 'i');
      assert.ok(calls.some(([m, path]) => ms.includes(m) && re.test(path)), `${row.label}: no ${row.method} ${row.path} in the article`);
    }
  });

  test(`${slug}: doubling any one part's count keeps the reference Accepted`, () => {
    const failed = [];
    for (const n of p.reference.nodes) {
      const lim = counts[n.type], cur = n.config?.count ?? lim?.default;
      if (!lim || cur == null || Math.min(lim.max, cur * 2) === cur) continue;
      const r = evaluate(withConfig(p.reference, n.id, { count: Math.min(lim.max, cur * 2) }), lab, p);
      if (r.verdict !== 'accepted') failed.push(`${n.id} x2: ${r.results.filter((x) => !x.ok).map((x) => x.id)}`);
    }
    if (DOUBLING_COSTS[slug]) { assert.ok(failed.length > 0, `${slug} is listed as an exception but doubling passes: remove it`); assert.ok(failed.every((x) => /budget/.test(x)), failed.join('; ')); return; }
    assert.deepEqual(failed, []);
  });

  test(`${slug}: the busiest part holds 1.25 times the busiest test`, () => {
    const h = headroom(p.reference, lab, p);
    if (LOW_HEADROOM[slug]) { assert.ok(h.m < 1.25, `${slug} is listed as an exception but holds ${h.m}: remove it`); assert.ok(h.exact >= 1, 'it still holds the test itself'); return; }
    assert.ok(h.m >= 1.25, `holds ${h.m}: ${h.first}`);
  });

  test(`${slug}: nothing is paid for that is not used`, () => {
    const w = waste(p.reference, lab, p, { maxRuns: 60 }), c = costOf(ref, p) ?? ref.metrics.avgMonthly, saved = w ? w.saving / c : 0;
    if (!PAID_FOR_HEADROOM.has(slug)) { assert.ok(saved <= 0.05, `${(saved * 100).toFixed(1)} % could go: ${w.changes.map((x) => `${x.name} ${x.field} ${x.from}→${x.to}`).join(', ')}`); return; }
    // the exception is the price of headroom: making the listed cuts leaves less than 1.25 times
    assert.ok(saved > 0.05, `${slug} is listed as an exception but only ${(saved * 100).toFixed(1)} % could go: remove it`);
    let d = p.reference;
    for (const x of w.changes) d = withConfig(d, x.part, { [x.field]: x.to });
    assert.ok(headroom(d, lab, p).exact < 1.25, 'the cuts would keep the headroom: the part is over-provisioned');
  });
}
