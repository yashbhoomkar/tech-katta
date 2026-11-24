// The canvas's code (frontend/src: solve.jsx, lab/, practice/) moves between pages by setting a #fragment: "#problems/<slug>",
// "#problems/challenge/<id>", "#practice/<slug>", "#interview-questions/<slug>" (a lesson), "#problems" (the list).
// The 3D router turns each into the real address; the fragments a page keeps for itself are left alone: a problem's own
// Description and Solution tabs, and a shared design's data (/problems/shared#problems/shared/<data>).
const SECTIONS = ['concepts', 'components', 'interview-questions', 'real-systems', 'quick-notes'];

/** the address a fragment stands for, or null when it is not a move to another page; `path` is the page it was set on */
export function hashTarget(hash, path) {
  const h = decodeURIComponent(hash.replace(/^#/, '')).replace(/^\/+/, '');
  if (!h) return null;
  const [head, ...rest] = h.split('/');
  const here = path.match(/^\/problems\/([\w-]+)\/?$/)?.[1];
  if (here && rest.length === 1 && rest[0] === here && (head === 'problems' || head === 'interview-questions')) return null;
  if (head === 'problems' && rest[0] === 'shared') return null;
  if (head === 'practice') return rest.length ? `/practice/${rest.join('/')}` : '/practice';
  if (head === 'problems') return rest.length ? `/problems/${rest.join('/')}` : '/problems';
  if (head && rest[0] && SECTIONS.includes(head)) return `/learn/${head}/${rest[0]}`;
  return null;
}
