// Judging a submission runs the Lab simulator, which takes from a few milliseconds to seconds: the
// pre-launch audit measured half a second for the biggest real designs and ten for a 200-component
// chain built to be slow. On the API's own thread that would stall every other visitor, so designs
// are judged on worker threads (judge-worker.js), at most `size` at once:
//   - a job that runs longer than `timeoutMs` is stopped (its worker is replaced): judge_timeout;
//   - when `maxQueue` jobs are already waiting, a new one is refused at once: judge_busy.
// Both reach the visitor as a 503; the page shows its own result either way and only the record is skipped.
import { Worker } from 'node:worker_threads';
import os from 'node:os';

// code: judge_busy, judge_timeout, judge_failed (the design couldn't be judged; `detail` says why), judge_closed
export class JudgeError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// How many designs are judged at once: JUDGE_WORKERS (1-8) when set, e.g. 1 on a host with one shared
// CPU; otherwise one fewer than the CPUs, at most 2 (the VPS default).
export const defaultSize = (env = process.env.JUDGE_WORKERS, cpus = os.availableParallelism()) => {
  const n = Number(env);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : Math.max(1, Math.min(2, cpus - 1));
};

export function judgePool({ size = defaultSize(), timeoutMs = 10_000, maxQueue = 20, workerUrl = new URL('./judge-worker.js', import.meta.url) } = {}) {
  const idle = [], queue = [];
  let workers = 0, nextId = 1, closed = false;

  const start = () => {
    const worker = new Worker(workerUrl);
    workers += 1;
    worker.unref(); // a waiting worker never keeps the process alive
    return worker;
  };
  const retire = (worker) => { workers -= 1; worker.removeAllListeners(); worker.terminate().catch(() => {}); };

  function runOn(worker, { job, resolve, reject }) {
    const id = nextId++;
    let done = false;
    const finish = (fn, value, keep) => {
      if (done) return; done = true;
      clearTimeout(timer); worker.off('message', onMessage); worker.off('error', onError); worker.off('exit', onExit);
      if (keep && !closed) idle.push(worker); else retire(worker);
      fn(value);
      pump();
    };
    const onMessage = (m) => { if (m?.id !== id) return; if (m.ok) finish(resolve, { judged: m.judged, copied: m.copied }, true); else finish(reject, Object.assign(new JudgeError('judge_failed'), { detail: m.error }), true); };
    const onError = (error) => finish(reject, error, false);
    const onExit = () => finish(reject, new JudgeError('judge_failed'), false);
    const timer = setTimeout(() => finish(reject, new JudgeError('judge_timeout'), false), timeoutMs);
    worker.on('message', onMessage); worker.on('error', onError); worker.on('exit', onExit);
    worker.postMessage({ id, ...job });
  }

  function pump() {
    while (queue.length && !closed) {
      const worker = idle.pop() || (workers < size ? start() : null);
      if (!worker) return;
      runOn(worker, queue.shift());
    }
  }

  return {
    // { design, lab, practice } → { judged: { verdict, passed, total, metrics }, copied }
    run(job) {
      if (closed) return Promise.reject(new JudgeError('judge_closed'));
      if (queue.length >= maxQueue) return Promise.reject(new JudgeError('judge_busy'));
      return new Promise((resolve, reject) => { queue.push({ job, resolve, reject }); pump(); });
    },
    stats: () => ({ workers, idle: idle.length, queued: queue.length }),
    close() {
      closed = true;
      for (const { reject } of queue.splice(0)) reject(new JudgeError('judge_closed'));
      for (const worker of idle.splice(0)) retire(worker);
    },
  };
}
