import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { viewersAt, originGbps, playMatch, serversForPeak } from './challenge.js';

const ch = JSON.parse(readFileSync(new URL('../../content/site.json', import.meta.url))).challenge;

test('the viewer curve peaks at the 3.5 crore record in the last over', () => {
  assert.equal(viewersAt(ch.viewers, 198), 3.5);
  assert.equal(viewersAt(ch.viewers, 12), 0.95, 'linear between points');
  assert.equal(viewersAt(ch.viewers, -5), ch.viewers[0][1]);
  assert.equal(viewersAt(ch.viewers, 9999), ch.viewers.at(-1)[1]);
});

test('the bandwidth maths: 3.5 crore × 2 Mbps = 70 Tbps; a 98% CDN leaves 1.4 Tbps for the origin', () => {
  assert.equal(originGbps(ch, 3.5, 0), 70000);
  assert.ok(Math.abs(originGbps(ch, 3.5, 0.98) - 1400) < 1e-6);
  assert.equal(serversForPeak(ch, 'none'), 7000);
  assert.equal(serversForPeak(ch, 'cdn90'), 700);
  assert.equal(serversForPeak(ch, 'cdn98'), 140);
});

test('the default setup (98% CDN, up to 100 servers, autoscale) buffers at the last over', () => {
  const r = playMatch(ch, { servers: ch.servers.default, cdn: ch.cdn.default, scaling: ch.scaling.default });
  assert.equal(r.survived, false);
  assert.ok(r.worst.m >= 192 && r.worst.m <= 203, JSON.stringify(r.worst));
  assert.equal(r.peakServers, 100);
});

test('autoscaling with enough servers still buffers at the toss: new servers take minutes to boot', () => {
  const r = playMatch(ch, { servers: 300, cdn: 'cdn98', scaling: 'auto' });
  assert.equal(r.survived, false);
  assert.ok(r.rows.filter((x) => x.failing > 0).every((x) => x.m >= 10 && x.m < 20 || x.m >= 118 && x.m < 130), 'only right after the toss and when the chase starts');
  assert.ok(r.badMinutes <= ch.autoscale.bootMinutes * 2 + 2, String(r.badMinutes));
});

test('starting every server before the toss survives, and costs more than autoscaling', () => {
  const pre = playMatch(ch, { servers: 150, cdn: 'cdn98', scaling: 'prewarm' });
  assert.equal(pre.survived, true);
  assert.equal(pre.peakServers, 150);
  const auto = playMatch(ch, { servers: 150, cdn: 'cdn98', scaling: 'auto' });
  assert.ok(auto.cost < pre.cost, `${auto.cost} < ${pre.cost}`);
  assert.ok(Math.abs(pre.cost - 150 * 216 / 60 * ch.serverHourly) < 1e-6, 'every server for every minute');
});

test('no CDN cannot work, whatever the server count', () => {
  const r = playMatch(ch, { servers: ch.servers.max, cdn: 'none', scaling: 'prewarm' });
  assert.equal(r.survived, false);
  assert.ok(Math.abs(r.worst.crore - 3.5 * (1 - 20000 / 70000)) < 1e-9, String(r.worst.crore)); // 2,000 × 10 Gbps of 70 Tbps
});
