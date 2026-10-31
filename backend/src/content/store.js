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
  const problems = validateContent({ site, examples, articles });
  if (problems.length) throw new Error(`Invalid content in ${dir}:\n- ${problems.join('\n- ')}`);
  let release = path.basename(dir);
  try { release = path.basename(realpathSync(dir)); } catch {}
  return { site, examples, articles, release };
}

const SUMMARY_FIELDS = ['section', 'slug', 'no', 'tag', 'date', 'title', 'dek', 'audio'];
const pick = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));

// Response bodies for one loaded release; objects are reused so their ETags stay stable.
export function buildBodies({ site, examples, articles }) {
  const example = examples[site.example];
  const lists = new Map();
  const full = new Map(articles.map((a) => [a.slug, { ...a, example }]));
  return {
    site: { ...site, example },
    list(section) {
      if (!lists.has(section)) lists.set(section, { articles: articles.filter((a) => !section || a.section === section).map((a) => pick(a, SUMMARY_FIELDS)) });
      return lists.get(section);
    },
    article: (slug) => full.get(slug) || null,
  };
}
