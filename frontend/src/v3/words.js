// Every computed sentence of the evaluator v3 (tech-katta-context/22-EVALUATOR-V3.md §6.1): the evidence pack's `f`
// (numbers as a learner reads them) and `say` (one sentence a fact stands for). Nothing else in v3 formats a number.
import { inrExact, group } from '../tkd/inr.js';
import { round } from '../tkd/round.js';

export const fmt = {
  pct: (x) => (Number.isFinite(x) ? `${Math.round(x * 100)} %` : 'down'),
  ms: (x) => (Number.isFinite(x) ? `${round(x, 1).toFixed(1)} ms` : '—'),
  inr: (x) => inrExact(x),
  rate: (x) => `${group(Math.round(x))} a second`,
  int: (x) => group(Math.round(x)),
};

// Plain words for a finding's reason (used when the numbers must stay hidden, §6.4).
export const REASON_WORDS = {
  stale: 'answers were older than allowed',
  ryw: 'a read missed the write just made',
  no_id: 'new items had no id',
  collision: 'ids collided',
  lost: 'acknowledged writes were lost',
  unavailable: 'requests failed',
  overloaded: 'a part received more calls than it can serve',
  p99: 'requests were too slow at the 99th percentile',
  p50: 'the median request was too slow',
  backlog: 'accepted work waited too long',
  budget: 'the design costs more than the budget',
};

const q = (s) => `'${s}'`;
const promiseName = (promise, request) => (promise === 'budget' ? 'the budget' : promise === 'done_within_s' ? `${request} queue wait` : promise === 'availability' ? `${request} availability` : `${request} ${promise}`);

export const say = {
  verdict({ word, passed, total, failed }) {
    if (word === 'Accepted') return `Accepted: all ${total} tests passed.`;
    if (word === 'Invalid Design') return `Invalid Design: the judge could not read the design (${total} ${total === 1 ? 'error' : 'errors'}).`;
    if (!failed) return `${word}.`;
    return failed.hidden ? `${word}: failed the hidden test ${q(failed.title)} (${passed} of ${total} passed).` : `${word}: failed ${q(failed.title)} (${passed} of ${total} passed).`;
  },
  testPassed: (title, spare) => (spare === null ? `${q(title)} passed.` : `${q(title)} passed, with ${spare} to spare on its tightest promise.`),
  testFailed: (title, expected, actual) => (expected || actual ? `${q(title)} failed: the promise is ${expected}, yours is ${actual}.` : `${q(title)} failed.`),
  hiddenTest: (title, ok) => `The hidden test ${q(title)} ${ok ? 'passed' : 'failed'}.`,
  hiddenFinding: (title, reason, part) => `In the hidden test ${q(title)}, ${REASON_WORDS[reason] || reason}${part ? ` at ${part}` : ''}.`,
  path: (request, hops, p99, p50, title) => `${request} goes ${hops.join(' → ')}: p99 ${p99}, median ${p50}, in ${q(title)}.`,
  load: (part, rho, peak, peakTitle, baseTitle) => (peakTitle && peakTitle !== baseTitle
    ? `${part} runs at ${rho} of what it can take in ${q(baseTitle)}, and ${peak} at its busiest (${q(peakTitle)}).`
    : `${part} runs at ${rho} of what it can take in ${q(baseTitle)}.`),
  costTotal: (inr, budget, spare) => (budget ? (spare === null ? `This design costs ${inr} a month, over the budget of ${budget}.` : `This design costs ${inr} a month; the budget is ${budget} (${spare} to spare).`) : `This design costs ${inr} a month.`),
  costPart: (part, inr, share) => `${part} costs ${inr} a month, ${share} of the total.`,
  margin: (promise, request, spare, title) => `The tightest promise is ${promiseName(promise, request)} in ${q(title)}, with ${spare} to spare.`,
  marginHidden: (title) => `The tightest promise is in the hidden test ${q(title)}.`,
};
