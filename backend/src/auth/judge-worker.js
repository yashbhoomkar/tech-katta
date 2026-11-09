// Runs on a worker thread (judge-pool.js): judges one submitted design and says whether it is the
// problem's own reference design, copied unchanged. Only plain data goes back to the API thread.
import { parentPort } from 'node:worker_threads';
import { cleanDesign } from '../../../frontend/src/lab/store.js';
import { judge, sameDesign } from '../../../frontend/src/judge/judge.js';

parentPort.on('message', ({ id, design, lab, practice }) => {
  try {
    const j = judge(design, lab, practice);
    const copied = sameDesign(design, practice.reference && cleanDesign(practice.reference, lab, 'reference'));
    const metrics = j.metrics ? { avgMonthly: j.metrics.avgMonthly, p99: j.metrics.p99 } : null;
    parentPort.postMessage({ id, ok: true, judged: { verdict: j.verdict, passed: j.passed, total: j.total, metrics }, copied });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: String(error?.message || error) });
  }
});
