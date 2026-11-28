// The ship rules of the design-space sweep (sweep.js, backend/scripts/sweep-problem.mjs) for the practice problems whose grid is small enough to run
// in a few seconds. The four with grids of 60,000 designs or more (url-shortener, paste-bin, news-feed, ticket-booking, about 7 to 9 s each) are run
// with `node backend/scripts/sweep-problem.mjs <slug>` and their summary goes in the pull request that changes them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sweep, grid } from './sweep.js';

const DIR = new URL('../../../content/problems2/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', DIR), 'utf8'));
const BIG = new Set(['url-shortener', 'paste-bin', 'news-feed', 'ticket-booking']);

for (const f of index.problems) {
  const p = JSON.parse(readFileSync(new URL(`${f}.json`, DIR), 'utf8'));
  if (BIG.has(p.slug)) continue;
  test(`${p.slug}: the sweep says the problem may ship`, () => {
    const s = sweep(p);
    assert.deepEqual(s.rules.filter((r) => !r.ok).map((r) => `${r.rule}: ${r.value}`), []);
  });
}

test('the grid has the reference in it, and designs just above and below its servers', () => {
  const p = JSON.parse(readFileSync(new URL('003-rate-limiter.json', DIR), 'utf8'));
  const labels = grid(p).map((d) => d.label);
  assert.ok(labels.some((l) => l.includes('api:10×large')), 'the reference');
  assert.ok(labels.some((l) => l.includes('api:8×large')) && labels.some((l) => l.includes('api:13×large')), 'around it');
});
