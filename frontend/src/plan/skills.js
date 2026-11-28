// A skill record (context 36, step 20): strengths and gaps by kind of test across problems, from this browser's own
// submissions (the latest one you built yourself per problem), and the next problem for the weakest. Pure.

export const SKILLS = [
  ['function', 'Calls work end to end', 'Every call the problem names reaches the right parts and returns the right thing.'],
  ['scale', 'Handling load', 'The peak, a burst, the busiest minute: enough capacity in the right places.'],
  ['resilience', 'Surviving failures', 'A part dies, a zone goes dark, the cache empties: the design carries on.'],
  ['cost', 'Keeping the bill sensible', 'Enough, not everything at the largest size.'],
];

// A test's kind from its id and name (the same split the evaluator scores by: judge.js AREAS).
export function skillOf(t) {
  const id = String(t?.id || ''), name = String(t?.name || '').toLowerCase();
  if (id.startsWith('api-')) return 'function';
  if (id === 'budget' || /\bbill\b/.test(name)) return 'cost';
  if (/zone|failover|fails|dies|down|dark|restart|crash|outage|cold|provider/.test(id + ' ' + name)) return 'resilience';
  return 'scale';
}

// How many tests of each kind each problem has: [function, scale, resilience, cost]. Kept in step with the content
// by skills.test.js, which fails and prints the new table when a problem's tests change.
export const MIX = {
  'ad-clicks': [2, 3, 1, 1], 'chat-app': [3, 3, 1, 1], 'coding-judge': [2, 3, 2, 1], 'dating-swipes': [2, 3, 2, 1],
  'file-sync': [3, 3, 2, 1], 'grocery-delivery': [2, 3, 2, 1], 'ind-vs-pak': [2, 3, 1, 1], 'job-scheduler': [3, 3, 3, 1],
  'key-value-store': [2, 3, 2, 1], leaderboard: [3, 3, 1, 1], 'menu-search': [2, 3, 2, 1], 'news-feed': [2, 3, 2, 1],
  notifications: [3, 3, 4, 1], payments: [3, 4, 4, 1], 'photo-sharing': [4, 3, 2, 1], 'restaurants-near-me': [2, 3, 2, 1],
  'rider-dispatch': [2, 3, 2, 1], 'shared-editor': [3, 3, 1, 1], 'ticket-booking': [2, 3, 2, 1], 'ipl-live-streaming': [3, 3, 2, 1], 'tatkal-booking': [2, 3, 2, 1], 'upi-switch': [3, 4, 4, 1], 'url-shortener': [3, 3, 3, 1],
  'video-streaming': [5, 3, 2, 1], 'web-crawler': [2, 3, 2, 1],
};

// subsBySlug: { slug: [{tests:[{id,name,ok}], copied?, at}] } (newest first) -> { skills: [{id,label,about,passed,total}],
// problems: n, weakest: id|null }
export function skillRecord(subsBySlug) {
  const count = Object.fromEntries(SKILLS.map(([id]) => [id, { passed: 0, total: 0 }]));
  let problems = 0;
  for (const subs of Object.values(subsBySlug || {})) {
    const mine = (Array.isArray(subs) ? subs : []).find((s) => !s.copied && Array.isArray(s.tests) && s.tests.length);
    if (!mine) continue;
    problems++;
    for (const t of mine.tests) { const c = count[skillOf(t)]; c.total++; if (t.ok) c.passed++; }
  }
  const skills = SKILLS.map(([id, label, about]) => ({ id, label, about, ...count[id] }));
  const rated = skills.filter((s) => s.total >= 2 && s.passed < s.total).sort((a, b) => a.passed / a.total - b.passed / b.total);
  return { skills, problems, weakest: rated[0]?.id || null };
}

// The next problem for a skill: not yet solved, with the most tests of that kind (share of its tests), ties in `order`.
export function nextFor(skill, order, solved) {
  const k = SKILLS.findIndex(([id]) => id === skill); if (k < 0) return null;
  const left = order.filter((s) => MIX[s] && !solved(s));
  if (!left.length) return null;
  return left.map((s, i) => ({ s, i, share: MIX[s][k] / MIX[s].reduce((a, b) => a + b, 0) })).sort((a, b) => b.share - a.share || a.i - b.i)[0].s;
}
