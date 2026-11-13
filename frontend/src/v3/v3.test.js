// Evaluator v3, the parts with no AI (tech-katta-context/22-EVALUATOR-V3.md §6, §12.5): the evidence pack of every
// reference, wrong design and template of every problem; what redaction removes; the template review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildEvidence, redact, TONES, EVIDENCE_VERSION } from './evidence.js';
import { templateReview, REVIEW_KINDS } from './review.js';

const dir = new URL('../../../content/problems2/', import.meta.url);
const problems = readdirSync(dir).filter((f) => /^\d{3}-.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const designs = (p) => [['reference', p.reference, 'Accepted'], ...p.wrong.map((w) => [w.name, w.source, w.expect]), ['template', p.template, 'Invalid Design']];

test('every design of every problem gets a pack: verdict first, unique ids, a sentence and a tone on every fact', () => {
  assert.ok(problems.length >= 10);
  for (const p of problems) for (const [name, src, expect] of designs(p)) {
    const pack = buildEvidence(src, p);
    const at = `${p.slug}/${name}`;
    assert.equal(pack.verdict.word, expect, at);
    assert.equal(pack.evidence_version, EVIDENCE_VERSION);
    assert.equal(pack.facts[0].id, 'verdict', at);
    assert.equal(new Set(pack.facts.map((f) => f.id)).size, pack.facts.length, `${at}: ids repeat`);
    for (const f of pack.facts) {
      assert.ok(TONES.includes(f.tone), `${at} ${f.id} tone`);
      assert.ok(typeof f.say === 'string' && f.say.length > 0, `${at} ${f.id} say`);
      assert.ok(/^[a-z]+(:[A-Za-z0-9_.\-]+)*$/.test(f.id), `${at} ${f.id} id shape`);
      for (const v of Object.values(f.f)) assert.equal(typeof v, 'string', `${at} ${f.id} f`);
    }
    assert.ok(JSON.stringify(redact(pack)).length < 64 * 1024, `${at}: pack over 64 KB`);
  }
});

test('the same design always gives the same pack (no clock, no randomness)', () => {
  for (const p of problems.slice(0, 4)) for (const [, src] of designs(p)) assert.deepEqual(buildEvidence(src, p), buildEvidence(src, p));
});

test('redaction: a fact from a hidden test keeps its words without numbers; nothing hidden survives', () => {
  let hiddenSeen = 0;
  for (const p of problems) for (const [name, src] of designs(p)) {
    const full = buildEvidence(src, p), pub = redact(full);
    for (const f of pub.facts) {
      assert.ok(!('hiddenSay' in f), `${p.slug}/${name}: hiddenSay leaked`);
      if (!f.hidden) continue;
      hiddenSeen += 1;
      assert.deepEqual([f.n, f.f], [{}, {}], `${p.slug}/${name} ${f.id}`);
      const test = p.tests.find((t) => t.id === f.about.test);
      assert.ok(test?.hidden, `${p.slug}/${name} ${f.id} is from a visible test`);
      // no number of the hidden test's own: its rates, promises and measurements are not in the sentence
      const own = [...Object.values(test.promises || {}).flatMap((x) => (typeof x === 'object' ? Object.values(x) : [x])), ...test.phases.flatMap((ph) => Object.values(ph.rates))].filter((x) => x >= 10).map(String);
      for (const n of own) assert.ok(!f.say.replace(test.title, '').includes(n), `${p.slug}/${name} ${f.id}: "${f.say}" shows ${n}`);
    }
  }
  assert.ok(hiddenSeen > 10, 'some designs fail hidden tests');
});

test('a pack from the visible tests only (the browser, on Run) has no hidden fact', () => {
  for (const p of problems) {
    const pack = buildEvidence(p.reference, p, { mode: 'run' });
    assert.ok(pack.facts.every((f) => !f.hidden), p.slug);
    assert.equal(pack.verdict.total, p.tests.filter((t) => !t.hidden).length);
  }
});

test('a design that does not compile: the verdict and one fact per error, nothing measured', () => {
  const p = problems[0], pack = buildEvidence(p.template, p);
  assert.deepEqual(pack.facts.map((f) => f.kind), ['verdict', ...pack.facts.slice(1).map(() => 'static')]);
  assert.ok(pack.facts.length >= 2);
});

test('facts the review leans on are where they should be', () => {
  const p = problems.find((x) => x.slug === 'url-shortener');
  const ok = buildEvidence(p.reference, p), ids = ok.facts.map((f) => f.id);
  for (const id of ['verdict', 'test:t01-quiet-afternoon', 'path:GET_LINK', 'path:CREATE_LINK', 'load:db', 'cost:total', 'cost:db', 'margin:tightest']) assert.ok(ids.includes(id), id);
  const over = buildEvidence(p.wrong.find((w) => w.name === 'no-cache-one-server').source, p);
  const f = over.facts.find((x) => x.id === 'finding:overloaded:GET_LINK:api');
  assert.equal(f.tone, 'fail');
  assert.equal(f.f.rho, '505 %');
  assert.equal(over.facts.find((x) => x.id === 'load:api').tone, 'risk');
});

test('the template review: a headline, 1 to 5 items of known kinds tied to real facts, and a next step', () => {
  for (const p of problems) for (const [name, src] of designs(p)) {
    const pack = redact(buildEvidence(src, p)), r = templateReview(pack), ids = new Set(pack.facts.map((f) => f.id));
    const at = `${p.slug}/${name}`;
    assert.ok(r.headline, at);
    assert.ok(r.items.length >= 1 && r.items.length <= 5, `${at}: ${r.items.length} items`);
    for (const it of r.items) { assert.ok(REVIEW_KINDS.includes(it.kind), at); assert.ok(it.facts.every((id) => ids.has(id)), at); assert.ok(it.text, at); }
    assert.ok(r.next.text, at);
    if (pack.verdict.word !== 'Accepted' && pack.verdict.word !== 'Invalid Design') assert.equal(r.items[0].kind, 'problem', `${at}: the failure comes first`);
  }
});
