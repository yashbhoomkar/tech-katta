// Runs on a worker thread (auth/judge-pool.js, started with this file): judges one practice Submit with the TKD engine
// (frontend/src/tkd), every test of the problem. Only plain data goes back to the API thread.
import { parentPort } from 'node:worker_threads';
import { judgeAll } from '../../../frontend/src/tkd/judge.js';

parentPort.on('message', ({ id, source, problem }) => {
  try {
    parentPort.postMessage({ id, ok: true, judged: judgeAll(source, problem, { all: true }) });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: String(error?.message || error) });
  }
});
