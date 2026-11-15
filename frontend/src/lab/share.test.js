// Share links (context 36, step 11): the design survives the round trip; broken or foreign links give null.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeShare, decodeShare, sharePayload, shareUrl } from './share.js';
test('a design survives the link round trip, and the link stays in the fragment', async () => {
  const d = { nodes: [{ id: 'clients', type: 'client', x: 0, y: 0, config: {} }, { id: 'app', type: 'server', x: 240, y: 0, name: 'API', note: 'why', config: { count: 4 } }], edges: [{ from: 'clients', to: 'app' }], v: 2 };
  const s = await encodeShare(sharePayload('My design', d, 'url-shortener'));
  assert.match(s, /^[A-Za-z0-9_-]+$/);
  const p = await decodeShare(s);
  assert.equal(p.name, 'My design'); assert.equal(p.problem, 'url-shortener'); assert.deepEqual(p.design.nodes, d.nodes); assert.equal(p.design.v, 2);
  assert.ok(shareUrl(s, 'https://x.test').startsWith('https://x.test/dashboard/problems/shared/#problems/shared/'));
});
test('broken, foreign or oversized links are refused', async () => {
  for (const s of ['', 'x', 'not base64!', 'AAAAAAAAAAAA', null]) assert.equal(await decodeShare(s), null);
  assert.equal(await decodeShare(await encodeShare({ hello: 1 })), null);
  assert.equal(await decodeShare(await encodeShare(sharePayload('big', { nodes: [{ id: 'a', note: 'x'.repeat(300000) }], edges: [] }))), null);
});
