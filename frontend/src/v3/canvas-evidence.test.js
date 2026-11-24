// The AI reviewer's evidence pack for the canvas judge states the bill the problem budgets (B2c of the judge audit),
// not the dearest test priced as a whole month.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { evaluate } from '../eval/judge.js';
import { canvasEvidence, CANVAS_EVIDENCE_VERSION } from './adapters/eval.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const dir = new URL('articles/interview-questions/', content);
const articles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir)))).filter((a) => a.practice);
const cost = (a, d) => canvasEvidence(evaluate(d, lab, a.practice), a).facts.find((f) => f.id === 'cost:total');

test('the evidence version is 2', () => assert.equal(CANVAS_EVIDENCE_VERSION, 2));
test('the 22 references: the bill is the budget test\'s month against its cap, tone note', () => {
  for (const a of articles) {
    const f = cost(a, a.practice.reference), bt = a.practice.tests.find((t) => (t.checks || []).some((c) => c.kind === 'cost'));
    assert.equal(f.tone, 'note', `${a.slug}: ${f.say}`);
    if (bt) { assert.equal(f.n.budget, bt.checks.find((c) => c.kind === 'cost').max, a.slug); assert.ok(f.n.usd <= f.n.budget, `${a.slug}: ${f.say}`); assert.match(f.say, /at normal traffic; the budget is/); }
  }
});
test('"Biggest everything" is over budget and the pack says so with tone fail', () => {
  for (const a of articles) {
    const w = a.practice.wrong.find((x) => x.fails === 'budget');
    if (!w) continue;
    const f = cost(a, w);
    assert.equal(f.tone, 'fail', `${a.slug}: ${f.say}`);
    assert.ok(f.n.usd > f.n.budget, a.slug);
  }
});
test('the peak is a separate note that says it is a rate during the peak', () => {
  const a = articles.find((x) => x.slug === 'ticket-booking'), pack = canvasEvidence(evaluate(a.practice.reference, lab, a.practice), a);
  const peak = pack.facts.find((f) => f.id === 'cost:peak');
  assert.equal(peak.tone, 'note');
  assert.match(peak.say, /rate for a short peak, not a month's bill/);
  assert.ok(!pack.facts.some((f) => f.tone === 'fail'), 'no fact calls an accepted design over budget');
});
