// The real articles, from the live API (public; the site's CSP allows it). The list and each article are fetched
// once and kept in memory and sessionStorage; if the API cannot be reached, the list falls back to a bundled snapshot.
import { ARTICLES_FALLBACK } from './data/articles.js';

const API = 'https://tech-api.katta.cc';
export const SECTIONS = [
  { id: 'concepts', name: 'Concepts', groups: [['core', 'Core'], ['patterns', 'Patterns'], ['specialised', 'Specialised data']] },
  { id: 'components', name: 'Components', groups: [['data', 'Data stores and search'], ['streams', 'Streams and workflows'], ['edge', 'Gateways and coordination']] },
  { id: 'interview-questions', name: 'Interview questions', groups: [['start', 'Start here'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] },
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
const mem = new Map();
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } } };

async function getJson(path) {
  const r = await fetch(API + path, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

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
  let a = ss.get(`tk-r3d-${k}`);
  if (!a) { try { a = await getJson(`/v1/articles/${encodeURIComponent(slug)}`); ss.set(`tk-r3d-${k}`, a); } catch { a = null; } }
  if (a) mem.set(k, a);
  return a;
}

/** "Caching: when to add a cache" → ["Caching", "when to add a cache"] */
export function splitTitle(t) {
  const i = t.indexOf(': ');
  if (i < 0) return [t, ''];
  const rest = t.slice(i + 2);
  return [t.slice(0, i), rest.charAt(0).toUpperCase() + rest.slice(1)];
}
export const minutes = (a) => Math.max(3, Math.round(JSON.stringify(a.body || []).split(/\s+/).length / 230));
