// The model answer that "Copy to my canvas" puts in Your answer (judge/model.js): for every Interview Question it is
// graded right on every part, so a copied solution scores the written half too (the owner saw 64/100 without it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelAnswer, examplePath } from './model.js';
import { gradeAnswer } from './judge.js';

const root = fileURLToPath(new URL('../../../content/articles/', import.meta.url));
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.json')) files.push(p); } })(root);
const problems = files.map((f) => JSON.parse(readFileSync(f, 'utf8'))).filter((a) => a.practice?.rubric);

test('every problem with a graded answer: the model answer is right on every part', () => {
  assert.ok(problems.length >= 22);
  for (const a of problems) {
    const r = a.practice.rubric, g = gradeAnswer(modelAnswer(r), r);
    for (const [part, share] of Object.entries(g.parts)) {
      const asked = { fr: r.fr, nfr: Object.keys(r.nfr || {}), est: r.est, api: r.api, dec: r.decisions }[part] || [];
      if (asked.length) assert.equal(share, 1, `${a.slug}: ${part}`);
    }
  }
});

test('API paths are concrete and accepted by the rubric\'s own pattern; numbers sit inside their range', () => {
  for (const a of problems) {
    const r = a.practice.rubric, m = modelAnswer(r);
    m.api.forEach((call, i) => {
      assert.ok(new RegExp(r.api[i].path, 'i').test(call.path), `${a.slug}: ${call.path}`);
      assert.ok(!/[\\^$|()[\]]/.test(call.path), `${a.slug}: ${call.path} still looks like a pattern`);
    });
    for (const [id, want] of Object.entries(r.nfr || {})) if (Array.isArray(want)) { const v = Number(m.nfr[id]); assert.ok(v >= want[0] && v <= want[1], `${a.slug}: ${id}`); }
  }
  assert.equal(examplePath('^/(api/)?(v\\d+/)?stores/[^/]+/items'), '/v1/stores/{id}/items');
});
