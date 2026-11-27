// The public part of the site's text (tech-katta-context 52): what a signed-out visitor, a search engine and the
// pre-rendered HTML may see. Everything else is served only to a signed-in session (server.js, practice/routes.js).
//
//   an article  : its header (title, subtitle, label, date), the first 2 paragraphs of the body (about 100-150 words)
//                 and the names of its sections, as plain strings (the locked headings)
//   a problem   : its title, difficulty and the first 2-3 lines of its brief
//   a challenge : its id, title, level and the first 2-3 lines of its brief
//
// Pure functions, used by the API and by the build (frontend/seo.js), so both always show the same text.

export const PUBLIC_PARAGRAPHS = 2, PUBLIC_MAX_WORDS = 150, BRIEF_MAX_WORDS = 45;

const words = (s) => String(s || '').split(/\s+/).filter(Boolean);
const wordCount = (s) => words(s).length;

/** `text` cut at the last sentence end inside `max` words (or at `max` words, with an ellipsis, when there is none) */
export function cutWords(text, max) {
  const w = words(text);
  if (w.length <= max) return String(text || '').trim();
  const head = w.slice(0, max).join(' ');
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('? '), head.lastIndexOf('! '), /[.?!]$/.test(head) ? head.length - 1 : -1);
  return end > head.length * 0.5 ? head.slice(0, end + 1) : `${head.replace(/[,;:\s]+$/, '')}…`;
}

/** the first PUBLIC_PARAGRAPHS paragraphs of a body, together no longer than PUBLIC_MAX_WORDS words */
export function publicParagraphs(body = []) {
  const out = []; let left = PUBLIC_MAX_WORDS;
  for (const b of body) {
    if (b?.t !== 'p' || typeof b.x !== 'string' || !b.x.trim()) continue;
    if (out.length >= PUBLIC_PARAGRAPHS || left <= 0) break;
    const x = cutWords(b.x, left);
    out.push({ t: 'p', x }); left -= wordCount(x);
  }
  return out;
}

/** the names of an article's sections (its h2 blocks), nothing under them */
export const sectionNames = (body = []) => body.filter((b) => b?.t === 'h2' && typeof b.x === 'string').map((b) => b.x);

/** the first 2-3 lines of a brief: whole sentences up to BRIEF_MAX_WORDS words */
export function briefLines(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (wordCount(t) <= BRIEF_MAX_WORDS) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t];
  let out = '';
  for (const s of sentences) { if (out && wordCount(out + s) > BRIEF_MAX_WORDS) break; out += s; }
  return cutWords(out || t, BRIEF_MAX_WORDS);
}

const HEADER = ['section', 'slug', 'group', 'no', 'tag', 'access', 'date', 'title', 'dek', 'audio'];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

/** an article in the free sample (access "free"): served in full to anyone, signed out or not */
export const isFree = (a) => a?.access === 'free';

/** what a signed-out reader gets of an article (or of a problem: its practice data, hints and tests never) */
export function publicArticle(a) {
  const head = pick(a, HEADER);
  if (a.practice) {
    return { ...head, kind: 'problem', difficulty: a.group, brief: briefLines(a.practice.brief || a.dek), body: [], headings: [], locked: true };
  }
  // minutes: the read time of the whole article (the same count the site draws), so the public header can show it
  return { ...head, kind: 'article', minutes: Math.max(3, Math.round(JSON.stringify(a.body || []).split(/\s+/).length / 230)), body: publicParagraphs(a.body), headings: sectionNames(a.body), locked: true };
}

/** a Lab challenge's public part: id, title, level and the first lines of its brief */
export const publicChallenge = (c) => ({ id: c.id, title: c.title, level: c.level, brief: briefLines(c.brief) });

/** the Lab catalogue for a signed-out visitor: the challenges' public parts and the level names, nothing that plays one */
export const publicLab = (lab) => ({ title: lab.title, levels: lab.levels, challenges: (lab.challenges || []).map(publicChallenge), locked: true });

/** a practice problem's public part: title, difficulty, topics and the first lines of its statement */
export const publicPracticeProblem = (p) => ({ id: p.id, slug: p.slug, title: p.title, difficulty: p.difficulty, topics: p.topics, free: p.free, brief: briefLines(p.statement), locked: true });

/** OPEN_CONTENT=1 opens every text without sign-in, for local development only (never in production, never by default) */
export const OPEN_CONTENT = process.env.OPEN_CONTENT === '1' && process.env.NODE_ENV !== 'production';
/** The sign-in feature flag. SIGNIN_REQUIRED=0 serves every text to everyone, in production too, and tells the site (GET /v1/auth/config →
 *  required: false) to show every page without a sign-in card. Sign-in itself still works (to keep progress on every device). Default: required. */
export const SIGNIN_REQUIRED = process.env.SIGNIN_REQUIRED !== '0';
/** every text is served to anyone: the sign-in flag is off, or the local-development flag is on */
export const CONTENT_OPEN = OPEN_CONTENT || !SIGNIN_REQUIRED;
