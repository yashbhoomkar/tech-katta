// drills.json (quick interview drills) and guides.json (decision guides): shape checks, and every link must point at something that exists.
// They are public: built only from what the articles already say, with a link back to the article section and to a problem.
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const text = (x) => typeof x === 'string' && x.trim().length > 0;
const textList = (x) => Array.isArray(x) && x.length > 0 && x.every(text);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** the heading (h2 or h3) a drill points at, and the id of the h2 it sits under (the anchor of the article page) */
export function anchorOf(article, heading) {
  let h2 = null;
  for (const b of article.body || []) {
    if (b.t === 'h2') { if (b.x === heading) return slugify(b.x); h2 = b.x; }
    else if (b.t === 'h3' && b.x === heading) return h2 ? slugify(h2) : null;
  }
  return null;
}

const refs = (articles) => ({
  bySlug: new Map(articles.map((a) => [`${a.section}/${a.slug}`, a])),
  problems: new Set(articles.filter((a) => a.practice).map((a) => a.slug)),
});

export function drillErrors(file, articles) {
  const errors = [];
  if (!file || !Array.isArray(file.drills) || !file.drills.length) return ['drills.json: needs a non-empty "drills" list'];
  const { bySlug, problems } = refs(articles), ids = new Set();
  file.drills.forEach((d, i) => {
    const at = `drills.json drills[${i}]`;
    if (!d || typeof d !== 'object') return errors.push(`${at}: must be an object`);
    if (!SLUG.test(d.id || '') || ids.has(d.id)) errors.push(`${at}: id must be a unique slug`);
    ids.add(d.id);
    if (!text(d.q) || d.q.length > 200) errors.push(`${at}: q must be a question of at most 200 characters`);
    if (!text(d.a) || d.a.length > 600) errors.push(`${at}: a must be a short answer of at most 600 characters`);
    const a = bySlug.get(d.article);
    if (!a) errors.push(`${at}: article ${d.article} does not exist`);
    else if (!anchorOf(a, d.section)) errors.push(`${at}: ${d.article} has no heading "${d.section}"`);
    if (!problems.has(d.problem)) errors.push(`${at}: problem ${d.problem} is not a problem`);
  });
  return errors;
}

export function guideErrors(file, articles) {
  const errors = [];
  if (!file || !Array.isArray(file.guides) || !file.guides.length) return ['guides.json: needs a non-empty "guides" list'];
  const { bySlug, problems } = refs(articles), slugs = new Set();
  file.guides.forEach((g, i) => {
    const at = `guides.json guides[${i}]`;
    if (!g || typeof g !== 'object') return errors.push(`${at}: must be an object`);
    if (!SLUG.test(g.slug || '') || slugs.has(g.slug)) errors.push(`${at}: slug must be a unique slug`);
    slugs.add(g.slug);
    for (const k of ['title', 'dek', 'intro', 'problemWhy']) if (!text(g[k])) errors.push(`${at}: ${k} is missing`);
    if (!Array.isArray(g.picks) || g.picks.length < 2 || !g.picks.every((p) => p && text(p.title) && textList(p.items))) errors.push(`${at}: picks needs at least two groups, each with a title and items`);
    const t = g.table;
    if (!t || !text(t.label) || !Array.isArray(t.head) || !t.head.length || !Array.isArray(t.rows) || !t.rows.length || !t.rows.every((r) => Array.isArray(r) && r.length === t.head.length && r.every(text))) errors.push(`${at}: table needs a label, a head and rows as wide as the head`);
    if (!g.example || !text(g.example.title) || !textList(g.example.paragraphs)) errors.push(`${at}: example needs a title and paragraphs`);
    if (!Array.isArray(g.articles) || !g.articles.length) errors.push(`${at}: articles needs at least one`);
    else for (const x of g.articles) if (!x || !bySlug.has(x.article) || !text(x.why)) errors.push(`${at}: article ${x?.article} does not exist, or has no "why"`);
    if (!problems.has(g.problem)) errors.push(`${at}: problem ${g.problem} is not a problem`);
  });
  return errors;
}

/** a drill as it is served: with the anchor on its article's page and the titles of what it links to */
export function drillBody(file, articles) {
  const { bySlug } = refs(articles), by = new Map(articles.map((a) => [a.slug, a]));
  return { drills: file.drills.map((d) => {
    const a = bySlug.get(d.article);
    return { id: d.id, q: d.q, a: d.a, article: d.article, articleTitle: a.title, section: d.section, anchor: anchorOf(a, d.section), problem: d.problem, problemTitle: by.get(d.problem).title };
  }) };
}

export function guideBodies(file, articles) {
  const { bySlug } = refs(articles), by = new Map(articles.map((a) => [a.slug, a]));
  const full = new Map(file.guides.map((g) => [g.slug, {
    ...g,
    articles: g.articles.map((x) => ({ ...x, title: bySlug.get(x.article).title })),
    problemTitle: by.get(g.problem).title,
  }]));
  const list = { guides: file.guides.map((g) => ({ slug: g.slug, title: g.title, dek: g.dek })) };
  return { list, guide: (slug) => full.get(slug) || null };
}
