// Learning paths (/start) and the progress summary on Home. Pure apart from the small readers at the bottom; test/paths.test.js has its cases.
// A step is an existing article ("section/slug"); a step whose article is not in the list is left out rather than invented.
import { readJson, record } from './solving.js';

export const PATHS = [
  { id: 'beginner', name: 'Beginner', years: '0 to 2 years', blurb: 'The ideas behind almost every design, then your first problem.',
    steps: ['concepts/networking-essentials', 'concepts/api-design', 'concepts/data-modelling', 'concepts/database-indexing', 'concepts/caching', 'concepts/scaling-reads', 'interview-questions/url-shortener'] },
  { id: 'intermediate', name: 'Intermediate', years: '2 to 5 years', blurb: 'Spread data over machines, keep it consistent, move work through queues.',
    steps: ['concepts/sharding', 'concepts/cap-theorem', 'concepts/scaling-writes', 'components/kafka-in-practice', 'components/redis', 'concepts/real-time-updates', 'interview-questions/chat-app'] },
  { id: 'advanced', name: 'Advanced', years: '5+ years', blurb: 'Hard cases: contention, money, failures, and the biggest live audience of the year.',
    steps: ['concepts/consistent-hashing', 'concepts/contention', 'concepts/workflows', 'concepts/change-capture', 'real-systems/shopify-reservations', 'interview-questions/payments', 'interview-questions/ind-vs-pak'] },
];
const isProblem = (a) => a.section === 'interview-questions' && a.group !== 'start';

/** a path's steps as { a (the article), problem, done }; `read` is the 3D site's read map ({ "section/slug": time }), `prog` and `subs` the canvas's record */
export function pathSteps(path, list, read = {}, prog = {}, subs = {}) {
  const by = new Map(list.map((a) => [`${a.section}/${a.slug}`, a]));
  return path.steps.map((id) => by.get(id)).filter(Boolean).map((a) => {
    const problem = isProblem(a);
    return { a, problem, done: problem ? record(a.slug, prog, subs).solved : !!read[`${a.section}/${a.slug}`] };
  });
}
export const pathState = (path, list, read, prog, subs) => { const steps = pathSteps(path, list, read, prog, subs); return { steps, done: steps.filter((s) => s.done).length, next: steps.find((s) => !s.done) || null }; };

/** "Weakest area": the test that fails most often in the latest submission of each problem (so a fixed weakness stops counting); { name, count, slug } or null */
export function weakestArea(subs = {}) {
  const tally = new Map();
  for (const [slug, list] of Object.entries(subs)) {
    const last = Array.isArray(list) ? list.find((x) => x && !x.copied && Array.isArray(x.tests)) : null;
    if (!last) continue;
    for (const t of last.tests) if (t && !t.ok && typeof t.name === 'string' && t.name) { const e = tally.get(t.name) || { name: t.name, count: 0, slug }; e.count += 1; tally.set(t.name, e); }
  }
  return [...tally.values()].sort((x, y) => y.count - x.count || x.name.localeCompare(y.name))[0] || null;
}

/** everything the Home panel shows */
export function summary(list, { read = {}, prog = readJson('tk-progress-v1'), subs = readJson('tk-subs-v1'), chosen = '' } = {}) {
  const probs = list.filter(isProblem);
  const rec = probs.map((a) => ({ a, r: record(a.slug, prog, subs) }));
  const started = rec.filter((x) => x.r.best !== null);
  const articles = list.filter((a) => !isProblem(a) && a.group !== 'start');
  const path = PATHS.find((p) => p.id === chosen) || null;
  const ps = path ? pathState(path, list, read, prog, subs) : null;
  const easy = rec.find((x) => !x.r.solved && x.a.group === 'easy') || rec.find((x) => !x.r.solved);
  const next = ps?.next ? { a: ps.next.a, why: `Next on your ${path.name} path` } : easy ? { a: easy.a, why: easy.r.started ? 'Pick up where you left off' : 'An easy problem to start with' } : null;
  return {
    solved: rec.filter((x) => x.r.solved).length, total: probs.length,
    best: started.map((x) => ({ a: x.a, score: x.r.best })).sort((p, q) => q.score - p.score),
    read: articles.filter((a) => read[`${a.section}/${a.slug}`]).length, articles: articles.length,
    next, path, weakest: weakestArea(subs),
  };
}

export const PATH_KEY = 'tk-path';
export const chosenPath = () => { try { const v = localStorage.getItem(PATH_KEY) || ''; return PATHS.some((p) => p.id === v) ? v : ''; } catch { return ''; } };
export const choosePath = (id) => { try { localStorage.setItem(PATH_KEY, id); } catch { /* storage blocked */ } };
