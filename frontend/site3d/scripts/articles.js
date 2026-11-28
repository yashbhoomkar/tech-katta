// The real articles, from the live API (public; the site's CSP allows it). The list and each article are fetched
// once and kept in memory and sessionStorage; if the API cannot be reached, the list falls back to a bundled snapshot.
import { ARTICLES_FALLBACK } from './data/articles.js';
import { accountState } from './account.js';

export const API = 'https://tech-api.katta.cc';
export const SECTIONS = [
  { id: 'concepts', name: 'Concepts', groups: [['core', 'Core'], ['patterns', 'Patterns'], ['specialised', 'Specialised data']] },
  { id: 'components', name: 'Components', groups: [['data', 'Data stores and search'], ['streams', 'Streams and workflows'], ['edge', 'Gateways and coordination']] },
  { id: 'interview-questions', name: 'Interview guides', groups: [['start', 'Start here'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] },
  { id: 'real-systems', name: 'Real systems', groups: [['case-studies', 'Case studies']] },
];
// The API files every component under one group, "tools" (the section's tagline), so the groups are set here, by what
// each component is, and the list is put in group order and renumbered to match.
const COMPONENT_GROUP = { redis: 'data', elasticsearch: 'data', cassandra: 'data', dynamodb: 'data', postgresql: 'data', 'kafka-in-practice': 'streams', flink: 'streams', temporal: 'streams', 'api-gateways': 'edge', zookeeper: 'edge' };
const tidy = (list) => {
  const order = SECTIONS.find((s) => s.id === 'components').groups.map(([g]) => g);
  const comps = list.filter((a) => a.section === 'components').map((a) => ({ ...a, group: COMPONENT_GROUP[a.slug] || a.group }))
    .sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group)).map((a, i) => ({ ...a, no: `COMPONENT // ${String(i + 1).padStart(2, '0')}` }));
  let k = 0; return list.map((a) => (a.section === 'components' ? comps[k++] : a));
};
/** the second, heavier line of an interview question's title (the other articles carry theirs after a colon) */
export const SECOND = {
  'how-to-answer': 'Six steps, every time', 'core-concepts-guide': 'Nine ideas behind almost every design', 'technologies-guide': 'The names you should be able to explain',
  'patterns-guide': 'The moves that keep coming back', 'questions-guide': 'What each one is really testing',
  'url-shortener': 'Short codes and fast redirects', 'file-sync': 'Big files, chunks and conflicts', 'restaurants-near-me': 'Searching by place',
  'grocery-delivery': 'Stock, slots and riders in ten minutes', 'ticket-booking': 'One seat, thousands of buyers', 'photo-sharing': 'Uploads, resizing and a fast feed',
  'news-feed': 'Fan-out to millions of followers', 'dating-swipes': 'Matches without scanning everyone', 'coding-judge': 'Running untrusted code safely',
  'chat-app': 'Delivery, order and presence', notifications: 'Reaching people once, not twice', payments: 'Never charging twice', 'job-scheduler': 'Run it once, at the right time',
  'web-crawler': 'Billions of pages, politely', leaderboard: 'Ranks that update live', 'ad-clicks': 'Counting every click exactly', 'key-value-store': 'Replicas, quorums and failures',
  'shared-editor': 'Two people, one document', 'rider-dispatch': 'Matching riders to orders', 'video-streaming': 'Millions watching at once', 'menu-search': 'Finding a dish from a few letters',
  'ind-vs-pak': 'The biggest live audience of the year',
};
/** the small "Free" label on a list row of the free sample (articles with access "free") */
export const FREE = '<i class="free-tag">Free</i>';
const mem = new Map();
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } } };

// The text behind the sign-in (a full article, the Lab catalogue, the 3D stories) is fetched with the session cookie. If the browser
// refuses the credentialed request (a site the API doesn't list, such as a preview), the same request is made without it and
// returns the public part. These answers depend on who asks, so they live in memory only and are forgotten when anyone signs in or out.
const GATED = /^\/v1\/(lab|stories|articles\/[^?]+)$/;
export async function apiFetch(path, init = {}) {
  if (GATED.test(path)) { try { return await fetch(API + path, { ...init, credentials: 'include' }); } catch (e) { if (e?.name === 'AbortError') throw e; } }
  return fetch(API + path, init);
}
async function getJson(path) {
  const r = await apiFetch(path, { headers: { accept: 'application/json' } });
  if (!r.ok) { const e = new Error(`${path}: ${r.status}`); e.status = r.status; throw e; }
  return r.json();
}
const forgetGated = () => { for (const k of [...mem.keys()]) if (k !== 'list') mem.delete(k); try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('tk-r3d-a:')) sessionStorage.removeItem(k); } catch { /* blocked */ } };
try { addEventListener('tk-account', forgetGated); document.addEventListener('tk-account', forgetGated); } catch { /* no window */ }

/** every article's header (section, slug, group, no, tag, title, dek), live or the snapshot */
export async function listArticles() {
  if (mem.has('list')) return mem.get('list');
  let list = ss.get('tk-r3d-articles');
  if (!list) { try { list = (await getJson('/v1/articles')).articles; ss.set('tk-r3d-articles', list); } catch { list = ARTICLES_FALLBACK; } }
  list = tidy(list);
  mem.set('list', list);
  return list;
}
/** the list now if we have it (for a first paint without waiting) */
export const listNow = () => mem.get('list') || tidy(ss.get('tk-r3d-articles') || ARTICLES_FALLBACK);

/** one article with its body; null if it cannot be loaded */
export async function getArticle(slug) {
  const k = `a:${slug}`;
  if (mem.has(k)) return mem.get(k);
  let a = null;
  try { a = await getJson(`/v1/articles/${encodeURIComponent(slug)}`); } catch { a = null; }
  if (a) mem.set(k, a);
  return a;
}

/** the 3D stories' words and sentences (signed-in readers only), put back into the figures; true when they are in */
let storiesP = null;
export function ensureStories(signedIn) {
  if (!signedIn) return Promise.resolve(false);
  return (storiesP ||= getJson('/v1/stories').then(async (r) => { (await import('./figures.js')).applyStories(r.stories); return true; }).catch(() => { storiesP = null; return false; }));
}
export async function forgetStories() { storiesP = null; try { (await import('./figures.js')).clearStories(); } catch { /* not loaded */ } }
try { addEventListener('tk-account', () => { storiesP = null; if (!accountState().user) forgetStories(); }); } catch { /* no window */ }

/** "Caching: when to add a cache" → ["Caching", "when to add a cache"] */
export function splitTitle(t) {
  const i = t.indexOf(': ');
  if (i < 0) return [t, ''];
  const rest = t.slice(i + 2);
  return [t.slice(0, i), rest.charAt(0).toUpperCase() + rest.slice(1)];
}
export const minutes = (a) => Math.max(3, Math.round(JSON.stringify(a.body || []).split(/\s+/).length / 230));
