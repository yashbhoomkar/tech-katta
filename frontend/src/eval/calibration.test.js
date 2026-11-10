// Calibration of every v2 problem (evaluator.md §14.2): the fixture, and every article whose practice has v: 2.
// (Item 5, the rubric grading its own answers, is v1's test in judge/judge.test.js, which covers every article.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { calibrate } from './calibrate.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/url-shortener.v2.json', import.meta.url)));

// every content article with a v2 practice (none yet in phase 2; the first arrives in phase 3)
function v2Articles() {
  const out = [];
  const walk = (url) => { for (const f of readdirSync(url)) { const u = new URL(f, url); if (statSync(u).isDirectory()) walk(new URL(`${f}/`, url)); else if (f.endsWith('.json')) { try { const a = JSON.parse(readFileSync(u)); if (a?.practice?.v === 2) out.push([f, a.practice]); } catch { /* not an article */ } } } };
  walk(new URL('articles/', content));
  return out;
}

const problems = [['fixture: url-shortener.v2', fixture], ...v2Articles()];
for (const [name, practice] of problems) {
  test(`calibration: ${name}`, () => {
    const r = calibrate(practice, lab);
    assert.deepEqual(r.problems, [], r.problems.join('\n'));
    assert.equal(r.reference.designPoints, 50);
    assert.equal(r.mutants.score, 1, 'every mutant not allowed is killed');
  });
}
