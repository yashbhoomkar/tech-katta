// The real articles, from the live API (public; the site's CSP allows it). The list and each article are fetched
// once and kept in memory and sessionStorage; if the API cannot be reached, the list falls back to a bundled snapshot.
import { ARTICLES_FALLBACK } from './data/articles.js';

const API = 'https://tech-api.katta.cc';
export const SECTIONS = [
  { id: 'concepts', name: 'Concepts', groups: [['core', 'Core'], ['patterns', 'Patterns'], ['specialised', 'Specialised data']] },
  { id: 'components', name: 'Components', groups: [['tools', 'The tools interviewers name']] },
  { id: 'interview-questions', name: 'Interview questions', groups: [['start', 'Start here'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] },
  { id: 'real-systems', name: 'Real systems', groups: [['case-studies', 'Case studies']] },
];
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
  mem.set('list', list);
  return list;
}
/** the list now if we have it (for a first paint without waiting) */
export const listNow = () => mem.get('list') || ss.get('tk-r3d-articles') || ARTICLES_FALLBACK;

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
