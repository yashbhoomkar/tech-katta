// A group of instances with nothing in front to spread calls: only one instance takes them (B1 of the judge audit),
// as Practice's W002 does. A load balancer or an API gateway in front gives every instance a share.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { simulateTest } from './simulate.js';
import { analyse } from './analyse.js';
import { evaluate } from './judge.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const E = (...pairs) => pairs.map(([from, to]) => ({ from, to }));
const F = (s) => s.split(' ').map((x) => ({ name: x, type: 'string' }));
const P = { v: 2, entities: { items: { rows: 1e6, rowBytes: 500, fields: {}, sample: [{ id: 'a', v: '1' }, { id: 'b', v: '2' }] } },
  operations: [{ id: 'read', name: 'Read', kind: 'read', share: 1, steps: [{ id: 's1', op: 'get', entity: 'items', by: { id: 'a' }, fields: ['v'] }], respond: { status: 200, body: {} }, slo: { availability: 99, p99Ms: 500 } }] };
const design = (front) => ({ nodes: [N('c', 'client'), ...front.map((t) => N(t, t)), N('app', 'server', { size: 'm5.large', count: 8 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: { tables: [{ name: 'items', fields: F('id v'), key: ['id'] }] } })],
  edges: E(...['c', ...front, 'app'].slice(0, -1).map((x, i, a) => [x, [...a.slice(1), 'app'][i]]), ['app', 'db']) });
const sim = (d, rps) => simulateTest(compile(d, lab, P), lab, P, { hours: 1, startHour: 12, traffic: { rps, pattern: 'steady' } });
const findings = (d, rps) => { const c = compile(d, lab, P); return analyse(c, P, lab, [{ test: { id: 't' }, sim: simulateTest(c, lab, P, { hours: 1, startHour: 12, traffic: { rps, pattern: 'steady' } }) }]); };

test('no load balancer: 8 instances take the load of one', () => {
  const direct = sim(design([]), 500).nodes.app.rhoMax, behind = sim(design(['lb']), 500).nodes.app.rhoMax;
  assert.ok(Math.abs(direct / behind - 8) < 1e-6, `${direct} vs ${behind}`);
  assert.ok(direct > 0.8 && behind < 0.2, `${direct} ${behind}`);
  assert.ok(sim(design([]), 1000).nodes.app.rhoMax > 1, 'one m5.large cannot take 1,000 a second');
});
test('an API gateway spreads the calls too; a CDN alone does not', () => {
  assert.ok(Math.abs(sim(design(['apigw']), 3000).nodes.app.rhoMax - sim(design(['lb']), 3000).nodes.app.rhoMax) < 1e-6);
  assert.ok(sim(design(['cdn']), 3000).nodes.app.rhoMax > 1);
});
test('one instance behind no load balancer is fine: nothing to spread', () => {
  const d = design([]); d.nodes.find((n) => n.id === 'app').config.count = 1;
  assert.ok(Math.abs(sim(d, 500).nodes.app.rhoMax - sim({ ...d, nodes: d.nodes }, 500).nodes.app.rhoMax) < 1e-9);
  assert.equal(findings(d, 500).some((f) => f.code === 'F_NO_LB'), false);
});
test('the analyser warns, naming the group, only without a spreader', () => {
  const f = findings(design([]), 500).find((x) => x.code === 'F_NO_LB');
  assert.equal(f.severity, 'warn');
  assert.deepEqual(f.nodes, ['app']);
  assert.match(f.story, /no load balancer in front of Server/i);
  assert.match(f.story, /only one of your 8 "Server" servers/);
  assert.equal(findings(design(['lb']), 500).some((x) => x.code === 'F_NO_LB'), false);
  assert.equal(findings(design(['apigw']), 500).some((x) => x.code === 'F_NO_LB'), false);
});
test('the verdict: a design that is only fast enough with a spreader fails without it', () => {
  const pr = { ...P, tests: [{ id: 'busy', name: 'Busy', desc: '', hours: 1, startHour: 12, traffic: { rps: 3000, pattern: 'steady' }, checks: [{ kind: 'slo' }] }] };
  assert.equal(evaluate(design(['lb']), lab, pr).verdict, 'accepted');
  assert.equal(evaluate(design([]), lab, pr).verdict, 'failed');
});
