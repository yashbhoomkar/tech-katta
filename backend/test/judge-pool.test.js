// The worker-thread judge (src/auth/judge-pool.js): same results as judging in place, a time limit,
// a bounded queue, and an API thread that stays free while a slow design is judged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { judgePool, JudgeError } from '../src/auth/judge-pool.js';
import { loadContent } from '../src/content/store.js';
import { cleanDesign } from '../../frontend/src/lab/store.js';
import { judge, sameDesign } from '../../frontend/src/judge/judge.js';

const content = await loadContent(new URL('../../content', import.meta.url).pathname);
const lab = content.lab;
const problems = content.articles.filter((a) => a.practice);
// cleaned as the API cleans a submission: a design keeps its v2 settings
const v2 = (d) => ({ ...d, v: 2 });
// the heaviest problem to judge (the most simulated hours)
const heavy = () => problems.map((p) => [p, p.practice.tests.reduce((h, t) => h + (t.hours || 0), 0)]).sort((x, y) => y[1] - x[1])[0][0];
// the problem's reference against its load tests a thousand times over: well past every time limit below on any
// machine. A hundred passes took 5-10 s once, but only 1.7 s on CI runners in 2026-11, inside the 2 s limit, so the
// time-limit test failed with "Missing expected rejection". The limits stop the job early, so the test is no slower.
const slowJob = (a) => { const j = job(a.practice.reference, a), load = j.practice.tests.filter((t) => !t.op); return { ...j, practice: { ...j.practice, tests: Array.from({ length: 1000 }, () => load).flat().map((t, i) => ({ ...t, id: `${t.id}-${i}` })) } }; };
const job = (design, a) => { const { wrong, ...practice } = a.practice; return { design: cleanDesign(v2(design), lab, 'submitted'), lab, practice }; };

test('a worker judges exactly like the API used to, for every problem and its reference', async () => {
  const pool = judgePool({ size: 2 });
  try {
    for (const a of problems) {
      for (const design of [a.practice.reference, a.practice.wrong[0]]) {
        const j = job(design, a), got = await pool.run(j), want = judge(j.design, lab, j.practice);
        assert.deepEqual(got.judged, { verdict: want.verdict, passed: want.passed, total: want.total, metrics: want.metrics ? { avgMonthly: want.metrics.avgMonthly, p99: want.metrics.p99 } : null, ...(Number.isFinite(want.designPoints) ? { designPoints: want.designPoints } : {}) }, a.slug);
        assert.equal(got.copied, sameDesign(j.design, cleanDesign(v2(a.practice.reference), lab, 'reference')), a.slug);
      }
    }
  } finally { pool.close(); }
});

test('a design over the time limit is stopped, and the next one is judged on a fresh worker', async () => {
  // 2 s: the slow design needs 5-10 s, while the next job must start a fresh worker and judge within the same
  // limit, which a busy CI machine couldn't do in the 200 ms this test first used
  const pool = judgePool({ size: 1, timeoutMs: 2000 });
  try {
    const a = heavy();
    await assert.rejects(pool.run(slowJob(a)), (e) => e instanceof JudgeError && e.code === 'judge_timeout');
    const ok = await pool.run(job(a.practice.reference, a));
    assert.equal(ok.copied, true);
  } finally { pool.close(); }
});

test('when the queue is full a new design is refused at once', async () => {
  const pool = judgePool({ size: 1, maxQueue: 1, timeoutMs: 300 });
  try {
    const a = heavy(), slow = slowJob(a);
    const first = pool.run(slow), second = pool.run(slow);
    await assert.rejects(pool.run(slow), (e) => e.code === 'judge_busy');
    await assert.rejects(first, (e) => e.code === 'judge_timeout');
    await assert.rejects(second, (e) => e.code === 'judge_timeout');
  } finally { pool.close(); }
});

test('the API thread keeps running while a slow design is judged', async () => {
  const pool = judgePool({ size: 1, timeoutMs: 1500 });
  try {
    const a = heavy();
    let worstGap = 0, last = performance.now();
    const tick = setInterval(() => { const t = performance.now(); worstGap = Math.max(worstGap, t - last); last = t; }, 10);
    await pool.run(slowJob(a)).catch(() => {});
    clearInterval(tick);
    assert.ok(worstGap < 250, `the event loop was blocked for ${Math.round(worstGap)} ms`);
  } finally { pool.close(); }
});

test("a design the judge can't handle is a judge_failed error (with the reason), and the worker carries on", async () => {
  const pool = judgePool({ size: 1 });
  try {
    const a = heavy();
    await assert.rejects(pool.run({ ...job(a.practice.reference, a), practice: null }), (e) => e instanceof JudgeError && e.code === 'judge_failed' && typeof e.detail === 'string' && e.detail.length > 0);
    assert.equal((await pool.run(job(a.practice.reference, a))).copied, true);
  } finally { pool.close(); }
});
