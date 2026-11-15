import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { RULES, ARTICLES, learnLinks } from './learn.js';
const dir = new URL('../../../content/articles/', import.meta.url);
const read = (sec, slug) => JSON.parse(readFileSync(new URL(`${sec}/${slug}.json`, dir)));

test('every link names an article and an h2 that exist', () => {
  const targets = [...RULES.map(([, s, g, h]) => [s, g, h]), ['concepts', 'numbers-to-know', 'Using numbers well'], ['concepts', 'api-design', 'REST endpoints'], ['interview-questions', 'how-to-answer', '1. Requirements']];
  for (const [sec, slug, h] of targets) {
    assert.ok(ARTICLES[sec][slug], `${sec}/${slug} has a name`);
    const a = read(sec, slug);
    assert.ok(a.body.some((b) => b.t === 'h2' && b.x === h), `${slug} has the heading "${h}"`);
  }
});

test('hints link to what they use', () => {
  const at = (h) => learnLinks(h).map((l) => `${l.slug}#${l.at}`);
  assert.deepEqual(at({ step: 'design', x: 'Put a Cache between the Service and the database.' }), ['caching#Where to cache']);
  assert.deepEqual(at({ step: 'estimates', x: 'Divide by 86,400 for writes a second.' }), ['numbers-to-know#Using numbers well']);
  assert.equal(learnLinks({ step: 'design', x: 'Spread it over zones, a Multi-AZ standby and a cache.' }).length, 2);
  assert.match(learnLinks({ step: 'design', x: 'a cache' })[0].href, /^\/dashboard\/concepts\/caching\/\?at=Where%20to%20cache$/);
});

test('most hints in the problems get a link', () => {
  const qs = new URL('interview-questions/', dir);
  let n = 0, linked = 0;
  for (const f of readdirSync(qs)) {
    const hints = JSON.parse(readFileSync(new URL(f, qs))).practice?.hints || [];
    for (const h of hints) { n++; if (learnLinks(h).length) linked++; }
  }
  assert.ok(n > 50 && linked / n > 0.9, `${linked} of ${n} hints linked`);
});
