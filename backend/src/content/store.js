// Loads the site's content from a directory of JSON files (see content/README.md at the repo root).
// Production reads CONTENT_DIR=/var/lib/tech-katta/content/current on the VPS; locally and in tests
// it defaults to the repo's content/ folder. Content is validated, then held in memory.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { validateContent } from './validate.js';

const readJson = async (file) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
};

export async function loadContent(dir) {
  const site = await readJson(path.join(dir, 'site.json'));
  if (!/^[a-z0-9-]+$/.test(site.example || '')) throw new Error('site.json: "example" must be the id of a file in examples/');
  const examples = { [site.example]: await readJson(path.join(dir, 'examples', `${site.example}.json`)) };
  const index = await readJson(path.join(dir, 'articles', 'index.json'));
  const articles = [];
  for (const entry of index.articles || []) {
    if (!/^[a-z0-9-]+\/[a-z0-9][a-z0-9-]*$/.test(entry)) throw new Error(`articles/index.json: bad entry ${entry}`);
    articles.push(await readJson(path.join(dir, 'articles', `${entry}.json`)));
  }
  const lab = await readJson(path.join(dir, 'lab.json'));
  const problems = validateContent({ site, examples, articles, lab });
  if (problems.length) throw new Error(`Invalid content in ${dir}:\n- ${problems.join('\n- ')}`);
  let release = path.basename(dir);
  try { release = path.basename(realpathSync(dir)); } catch {}
  return { site, examples, articles, lab, release };
}

const SUMMARY_FIELDS = ['section', 'slug', 'group', 'no', 'tag', 'date', 'title', 'dek', 'audio'];
const pick = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));

// A summary also names the Lab challenge the article's Lab card opens (`lab`), for lists such as Problems.
const labOf = (a) => { const card = (a.body || []).find((b) => b && b.t === 'lab' && typeof b.to === 'string' && b.to.startsWith('lab/')); return card ? card.to.slice(4) : undefined; };
// `tests`: how many judge tests the question has (its `practice`), for the Problems table.
const summary = (a) => pick({ ...a, lab: labOf(a), tests: a.practice?.tests?.length }, [...SUMMARY_FIELDS, 'lab', 'tests']);

// Response bodies for one loaded release; objects are reused so their ETags stay stable.
export function buildBodies({ site, examples, articles, lab }) {
  const example = examples[site.example];
  const lists = new Map();
  const full = new Map(articles.map((a) => [a.slug, { ...a, example }]));
  return {
    // How much there is, for the landing page ("10 Interview Questions"): counted from the release, never typed by hand.
    site: { ...site, example, counts: {
      questions: articles.filter((a) => a.section === 'interview-questions' && a.group !== 'start').length,
      concepts: articles.filter((a) => a.section === 'concepts').length,
      components: articles.filter((a) => a.section === 'components').length,
      challenges: (lab?.challenges || []).length,
    } },
    lab,
    list(section) {
      if (!lists.has(section)) lists.set(section, { articles: articles.filter((a) => !section || a.section === section).map(summary) });
      return lists.get(section);
    },
    article: (slug) => full.get(slug) || null,
  };
}
