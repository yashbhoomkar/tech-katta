// Every practice problem in content/problems2/ (spec sections 9, 21.6, 21.8): its shape, its calibration (the reference
// Accepted with 10 % to spare, each wrong design exactly its verdict), the formatter's round trip on its designs, and
// golden files: the full result of every reference and wrong design, compared exactly. A deliberate change to the judge
// shows up here as a reviewed diff and a JUDGE_VERSION bump: regenerate with UPDATE_GOLDEN=1 npm test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { problemShape, calibration, publicProblem } from './problem.js';
import { judgeAll, JUDGE_VERSION } from './judge.js';
import { format, canonical } from './format.js';
import { parseLenient } from './parse.js';

const DIR = new URL('../../../content/problems2/', import.meta.url);
const GOLDEN = new URL('./golden/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', DIR), 'utf8'));
const problems = index.problems.map((f) => JSON.parse(readFileSync(new URL(`${f}.json`, DIR), 'utf8')));

test('index.json lists NNN-slug files in order, ids 1, 2, 3 …', () => {
  assert.ok(problems.length >= 1);
  index.problems.forEach((f, i) => { assert.match(f, /^\d{3}-[a-z0-9-]+$/); assert.equal(f, `${String(problems[i].id).padStart(3, '0')}-${problems[i].slug}`); assert.equal(problems[i].id, i + 1); });
});

for (const p of problems) {
  test(`${p.slug}: shape`, () => assert.deepEqual(problemShape(p), []));
  test(`${p.slug}: calibration`, () => assert.deepEqual(calibration(p), []));
  test(`${p.slug}: format round trip on the reference and every wrong design`, () => {
    for (const src of [p.reference, ...p.wrong.map((w) => w.source)]) {
      const f = format(parseLenient(src), p);
      assert.equal(format(parseLenient(f), p), f);
      // the same verdicts and numbers (only the blamed part's line number moves with the formatting)
      const same = (x) => JSON.stringify(judgeAll(x, p, { all: true }), (k, v) => (k === 'line' ? undefined : v));
      assert.equal(same(f), same(src), 'formatting changes nothing the judge sees');
      assert.equal(canonical(f, p), canonical(src, p));
    }
  });
  test(`${p.slug}: the public view has no hidden numbers, reference, wrong designs or editorial`, () => {
    const pub = JSON.stringify(publicProblem(p));
    for (const k of ['"reference"', '"wrong"', '"editorial"']) assert.ok(!pub.includes(k), k);
    for (const t of publicProblem(p).tests.filter((x) => x.hidden)) assert.deepEqual(Object.keys(t).sort(), ['hidden', 'id', 'title']);
  });
  test(`${p.slug}: golden results`, () => {
    const now = { judge_version: JUDGE_VERSION, reference: judgeAll(p.reference, p, { all: true }), wrong: Object.fromEntries(p.wrong.map((w) => [w.name, judgeAll(w.source, p, { all: true })])) };
    const file = new URL(`${p.slug}.json`, GOLDEN);
    if (process.env.UPDATE_GOLDEN === '1' || !existsSync(file)) writeFileSync(file, `${JSON.stringify(now, null, 1)}\n`);
    const was = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(was.judge_version, JUDGE_VERSION, 'the golden file is from another judge version: regenerate it (UPDATE_GOLDEN=1)');
    assert.deepEqual(now, was, 'a result changed: if on purpose, raise JUDGE_VERSION and regenerate with UPDATE_GOLDEN=1');
  });
}
