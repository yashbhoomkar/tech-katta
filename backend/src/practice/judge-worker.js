// Runs on a worker thread (auth/judge-pool.js, started with this file): judges one practice Submit with the TKD engine
// (frontend/src/tkd), every test of the problem; or, with task "evidence", builds a design's full evidence pack
// (frontend/src/v3/evidence.js, spec 22 §6.5) for the interviewer. Only plain data goes back to the API thread.
import { parentPort } from 'node:worker_threads';
import { judgeAll } from '../../../frontend/src/tkd/judge.js';
import { buildEvidence } from '../../../frontend/src/v3/evidence.js';

parentPort.on('message', ({ id, task, source, problem }) => {
  try {
    const judged = task === 'evidence' ? buildEvidence(source, problem, { mode: 'submit' }) : judgeAll(source, problem, { all: true });
    parentPort.postMessage({ id, ok: true, judged });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: String(error?.message || error) });
  }
});
