// Runs on a worker thread (judge-pool.js): judges one submitted design and says whether it is the
// problem's own reference design, copied unchanged. Only plain data goes back to the API thread.
import { parentPort } from 'node:worker_threads';
import { cleanDesign } from '../../../frontend/src/lab/store.js';
import { judge, sameDesign } from '../../../frontend/src/judge/judge.js';
import { cleanDesign2 } from '../../../frontend/src/eval/design.js';

parentPort.on('message', ({ id, design, lab, practice }) => {
  try {
    const j = judge(design, lab, practice);
    // a v2 problem's designs keep v2 settings when cleaned (evaluator.md §12.1 point 5)
    const clean = (d) => (practice.v === 2 ? { ...cleanDesign2(d, lab), v: 2 } : cleanDesign(d, lab, 'reference'));
    const copied = sameDesign(practice.v === 2 ? clean(design) : design, practice.reference && clean(practice.reference));
    const metrics = j.metrics ? { avgMonthly: j.metrics.avgMonthly, p99: j.metrics.p99 } : null;
    // a v2 problem's design score (evaluator.md §11.3); the timeline and the rest stay on this thread
    const designPoints = Number.isFinite(j.designPoints) ? { designPoints: j.designPoints } : {};
    parentPort.postMessage({ id, ok: true, judged: { verdict: j.verdict, passed: j.passed, total: j.total, metrics, ...designPoints }, copied });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: String(error?.message || error) });
  }
});
