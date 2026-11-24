// Out-of-range settings are changed to fit and said so (B2b of the judge audit): an info finding F_CLAMPED in the
// result, with the part, the field, the value sent and the value used; the same when the server cleaned the design first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { evaluate } from './judge.js';
import { cleanDesign2 } from './design.js';
import { cleanDesign } from '../lab/store.js';
import { canvasEvidence, CANVAS_EVIDENCE_VERSION } from '../v3/adapters/eval.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const dir = new URL('articles/interview-questions/', content);
const articles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir)))).filter((a) => a.practice);
const ad = articles.find((a) => a.slug === 'ad-clicks'), P = ad.practice;
const withCount = (v) => { const d = structuredClone(P.reference); const n = d.nodes.find((x) => x.type === 'server'); n.config.count = v; return [d, n]; };
const clamps = (j) => j.findings.filter((f) => f.code === 'F_CLAMPED');
const max = lab.eval.components.find((c) => c.type === 'server').settings.find((s) => s.key === 'count');

test('above the maximum: clamped, said so, with the part, the field, what was sent and what was used', () => {
  const [d, n] = withCount(1_000_000_000), j = evaluate(d, lab, P);
  assert.equal(clamps(j).length, 1);
  assert.equal(clamps(j)[0].severity, 'info');
  assert.deepEqual(j.clamped, [{ node: n.id, part: n.name || 'Server', field: max.label, key: 'count', sent: 1_000_000_000, used: max.max, min: max.min, max: max.max }]);
  assert.match(clamps(j)[0].title, new RegExp(`${n.name}: ${max.label} 1,000,000,000 is above the maximum ${max.max}; judged as ${max.max}`));
});
test('below the minimum, and not a number', () => {
  assert.match(clamps(evaluate(withCount(-3)[0], lab, P))[0].title, /is below the minimum 1; judged as 1/);
  const j = evaluate(withCount('abc')[0], lab, P);
  assert.match(clamps(j)[0].title, /"abc" is not a number; judged as/);
  assert.equal(j.clamped[0].sent, 'abc');
});
test('in range: nothing to say; the clean copy of a good design is the same design', () => {
  const j = evaluate(P.reference, lab, P);
  assert.deepEqual(clamps(j), []);
  assert.equal(j.clamped, undefined);
  assert.equal('clamped' in cleanDesign2(P.reference, lab), false);
});
test('the 22 references produce no F_CLAMPED', () => {
  for (const a of articles) assert.deepEqual(clamps(evaluate(a.practice.reference, lab, a.practice)), [], a.slug);
});
test('the server cleans the design first (cleanDesign, v 2) and the judge still says so', () => {
  const [d] = withCount(1_000_000_000), cleaned = cleanDesign({ ...d, v: 2 }, lab, 'submitted');
  assert.equal(cleaned.nodes.find((x) => x.type === 'server').config.count, max.max, 'it was clamped');
  assert.equal(cleaned.clamped.length, 1);
  const j = evaluate(cleaned, lab, P);
  assert.equal(clamps(j).length, 1, 'the cleaned design carries what was changed');
  // cleaned again (the judge cleans every design): still one, not two
  assert.equal(clamps(evaluate(cleanDesign({ ...cleaned, v: 2 }, lab, 'again'), lab, P)).length, 1);
});
test('the AI evidence pack says it too, and the version is bumped', () => {
  const j = evaluate(cleanDesign({ ...withCount(1_000_000_000)[0], v: 2 }, lab, 's'), lab, P), pack = canvasEvidence(j, ad);
  assert.ok(pack.facts.some((f) => f.id.startsWith('input:clamped:') && /1,000,000,000 is above the maximum 50; judged as 50/.test(f.say)), JSON.stringify(pack.facts.map((f) => f.id)));
  assert.ok(CANVAS_EVIDENCE_VERSION >= 2);
  assert.equal(pack.evidence_version, CANVAS_EVIDENCE_VERSION);
});
