// Loads the site's content from a directory of JSON files (see content/README.md at the repo root).
// Production reads CONTENT_DIR=/var/lib/tech-katta/content/current on the VPS; locally and in tests
// it defaults to the repo's content/ folder. Content is validated, then held in memory.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { validateContent } from './validate.js';
import { existsSync } from 'node:fs';
import { loadProblems } from '../practice/problems.js';

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
  let lab = await readJson(path.join(dir, 'lab.json'));
  // The v2 evaluator's catalogue (tech-katta-context/evaluator.md §5.4): optional, served inside the Lab
  // catalogue as lab.eval, so the frontend and the judge worker get it with everything else they already read.
  const evalPath = path.join(dir, 'eval.json');
  const evalCat = existsSync(evalPath) ? await readJson(evalPath) : undefined;
  // practice problems (content/problems2/, optional): shape and calibration checked like the rest
  const practice = await loadProblems(dir);
  const problems = [...validateContent({ site, examples, articles, lab, evalCat }), ...practice.errors];
  if (problems.length) throw new Error(`Invalid content in ${dir}:\n- ${problems.join('\n- ')}`);
  let release = path.basename(dir);
  try { release = path.basename(realpathSync(dir)); } catch {}
  if (evalCat !== undefined) lab = { ...lab, eval: evalCat };
  return { site, examples, articles, lab, release, practice: practice.problems };
}

const SUMMARY_FIELDS = ['section', 'slug', 'group', 'no', 'tag', 'access', 'date', 'title', 'dek', 'audio'];
const pick = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));

// A summary also names the challenge the article's card opens (`lab`: its id, from "problems/challenge/<id>"), for
// lists such as Problems.
const CHALLENGE = 'problems/challenge/';
const labOf = (a) => { const card = (a.body || []).find((b) => b && b.t === 'lab' && typeof b.to === 'string' && b.to.startsWith(CHALLENGE)); return card ? card.to.slice(CHALLENGE.length) : undefined; };
// `tests`: how many judge tests the question has (its `practice`), for the Problems table.
// `fig`: the article's first figure id, drawn small on its card in section lists (tech-katta-context 25 §7: fewer
// words, more pictures).
const figOf = (a) => (a.body || []).find((b) => b && b.t === 'fig' && typeof b.id === 'string')?.id;
const summary = (a) => pick({ ...a, lab: labOf(a), tests: a.practice?.tests?.length, fig: figOf(a) }, [...SUMMARY_FIELDS, 'lab', 'tests', 'fig']);

// Response bodies for one loaded release; objects are reused so their ETags stay stable.
export function buildBodies({ site, examples, articles, lab }) {
  const example = examples[site.example];
  const lists = new Map();
  // A problem's reference and wrong designs calibrate its tests (frontend judge.test.js). They aren't in
  // the article: the reference design is served on its own (GET /v1/articles/<slug>/solution), only when
  // someone opens the Solution tab; the wrong designs are never served.
  const served = (a) => (a.practice ? { ...a, practice: (({ reference, wrong, mutantsAllowed, mutantsAllowedWhy, ...rest }) => rest)(a.practice) } : a);
  const full = new Map(articles.map((a) => [a.slug, { ...served(a), example }]));
  const solutions = new Map(articles.filter((a) => a.practice?.reference).map((a) => [a.slug, { slug: a.slug, nodes: a.practice.reference.nodes, edges: a.practice.reference.edges }]));
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
    solution: (slug) => solutions.get(slug) || null,
  };
}
