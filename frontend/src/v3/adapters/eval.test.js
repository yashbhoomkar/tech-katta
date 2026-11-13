// The canvas judge as an evidence pack (adapters/eval.js): every reference, starting and wrong design of every
// Interview Question gives a pack the template review and the interviewer can use.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { judge } from '../../judge/judge.js';
import { cleanDesign } from '../../lab/store.js';
import { canvasEvidence, canvasProblem } from './eval.js';
import { templateReview, REVIEW_KINDS } from '../review.js';
import { TONES } from '../evidence.js';

const content = new URL('../../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const dir = new URL('articles/interview-questions/', content);
const articles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter((a) => a.practice?.reference);
const designs = (P) => [{ name: 'reference', ...P.reference }, { name: 'start', ...P.start }, ...P.wrong];

test('every design of every Interview Question: a pack with the verdict first, unique ids, a sentence on every fact', () => {
  assert.ok(articles.length >= 22);
  let n = 0;
  for (const a of articles) {
    const { wrong, ...problem } = a.practice;
    for (const w of designs(a.practice)) {
      const d = cleanDesign({ nodes: w.nodes, edges: w.edges, v: 2 }, lab, 'x');
      if (!d) continue;
      const j = judge(d, lab, problem), pack = canvasEvidence(j, a), at = `${a.slug}/${w.name}`;
      n += 1;
      assert.equal(pack.facts[0].id, 'verdict', at);
      assert.equal(new Set(pack.facts.map((f) => f.id)).size, pack.facts.length, at);
      assert.equal(pack.verdict.word, j.verdict === 'accepted' ? 'Accepted' : j.verdict === 'error' ? 'Invalid Design' : 'Failed', at);
      assert.equal(pack.facts.filter((f) => f.kind === 'test').length, j.results.length, at);
      for (const f of pack.facts) { assert.ok(TONES.includes(f.tone), at); assert.ok(f.say, `${at} ${f.id}`); assert.equal(f.hidden, false); }
      if (w.name === 'reference') assert.equal(pack.verdict.word, 'Accepted', at);
      else if (w.name !== 'start') assert.ok(pack.facts.some((f) => f.kind === 'finding'), `${at}: a wrong design has a finding`);
      const r = templateReview(pack);
      assert.ok(r.headline && r.items.length >= 1 && r.items.every((i) => REVIEW_KINDS.includes(i.kind)) && r.next.text, at);
    }
  }
  assert.ok(n >= 150);
});

test('the problem block for a canvas problem: title, statement and operations only', () => {
  const a = articles.find((x) => x.slug === 'url-shortener'), p = canvasProblem(a);
  assert.equal(p.id, 'iq:url-shortener');
  assert.equal(p.title, a.title);
  assert.deepEqual(p.requests.map((r) => r.name), a.practice.operations.map((o) => o.id));
  assert.ok(!JSON.stringify(p).includes('"nodes"'), 'no design in it');
});
