import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChallenge } from './lab/challenges.js';

// lablite.jsx imports CSS, so its design builder is checked through the same shape here.
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const liteDesign = ({ cdn, servers, prewarm }) => { const ns = [N('viewers', 'client'), ...(cdn ? [N('cdn', 'cdn')] : []), N('lb', 'lb'), N('origin', 'server', { size: 'c5.2xlarge', count: prewarm ? servers : Math.min(5, servers), maxCount: servers, autoscale: !prewarm, queriesPerRequest: 1 })]; return { nodes: ns, edges: ns.slice(1).map((n, i) => ({ from: ns[i].id, to: n.id })) }; };
const src = readFileSync(new URL('./lablite.jsx', import.meta.url), 'utf8');
const lab = JSON.parse(readFileSync(new URL('../../content/lab.json', import.meta.url)));
const ch = lab.challenges.find((c) => c.id === 'ind-vs-pak');

test('the phone version builds the same design as this test', () => {
  assert.ok(src.includes('count:prewarm?servers:Math.min(5,servers),maxCount:servers,autoscale:!prewarm'));
});

test('the phone controls can earn 0, 2 and 3 stars, like the full Lab', () => {
  const stars = (o) => runChallenge(liteDesign(o), lab, ch).stars;
  assert.equal(stars({ cdn: false, servers: 50, prewarm: true }), 0, 'no CDN');
  assert.equal(stars({ cdn: true, servers: 30, prewarm: true }), 2, 'too few for the last over');
  assert.equal(stars({ cdn: true, servers: 50, prewarm: false }), 2, 'autoscaling from 5 misses the toss');
  assert.equal(stars({ cdn: true, servers: 40, prewarm: true }), 3);
});
