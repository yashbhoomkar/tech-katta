import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate } from '../eval/judge.js';
import { troubleAt, whyPart } from './why.js';
const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const p = JSON.parse(readFileSync(new URL('articles/interview-questions/url-shortener.json', content))).practice;
const comp = (t) => lab.components.find((c) => c.type === t);
const nodeOf = (d, id) => d.nodes.find((n) => n.id === id);

test('a part the test fails on purpose: said so, with when it came back', () => {
  const r = evaluate(p.reference, lab, p).results.find((x) => x.id === 'db-failover');
  const i = r.events.find((e) => e.kind === 'failover' || e.kind === 'crashed').t / r.timeline.tickMinutes;
  const id = r.events.find((e) => e.kind === 'failover' || e.kind === 'crashed').node;
  assert.ok(troubleAt(r, i).includes(id));
  const w = whyPart(r, i, id, { comp: comp(nodeOf(p.reference, id).type) });
  assert.match(w.story.join(' '), /on purpose/);
  assert.match(w.story.join(' '), /came back/);
  assert.equal(w.fix, null);
});

test('a part that falls over from load: how long it ran over, what fed it, and a fix', () => {
  const chat = JSON.parse(readFileSync(new URL('articles/interview-questions/chat-app.json', content))).practice;
  const d = chat.wrong.find((x) => x.name === 'Too few gateways');
  const r = evaluate(d, lab, chat).results.find((x) => x.events?.some((e) => e.kind === 'crashed' && !e.forced));
  assert.ok(r, 'too few gateways fall over at the peak');
  const e = r.events.find((x) => x.kind === 'crashed' && !x.forced), i = e.t / r.timeline.tickMinutes;
  const w = whyPart(r, i, e.node, { comp: comp(nodeOf(d, e.node).type) });
  assert.match(w.story.join(' '), /fell over: it had run above/);
  assert.ok(w.fix);
  assert.ok(w.fedBy.length > 0 || w.now.up < 1);
});

test('nothing in trouble on a quiet afternoon', () => {
  const r = evaluate(p.reference, lab, p).results.find((x) => x.id === 'normal');
  assert.deepEqual(troubleAt(r, 5), []);
});
