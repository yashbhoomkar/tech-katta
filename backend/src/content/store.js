// Loads the site's content from a directory of JSON files (see content/README.md at the repo root).
// Production reads CONTENT_DIR=/var/lib/tech-katta/content/current on the VPS; locally and in tests
// it defaults to the repo's content/ folder. Content is validated, then held in memory.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { validateContent } from './validate.js';
import { existsSync } from 'node:fs';
import { loadProblems } from '../practice/problems.js';
import { drillErrors, guideErrors, drillBody, guideBodies } from './validate-learn.js';
import { publicArticle, publicLab, publicChallenge, isFree } from './public.js';

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
  // the 3D stories' words and sentences (content/stories.json, optional): served only to a signed-in session (GET /v1/stories)
  const storiesPath = path.join(dir, 'stories.json');
  const stories = existsSync(storiesPath) ? await readJson(storiesPath) : {};
  // quick interview drills and decision guides (content/drills.json, content/guides.json, optional): public, built from what the articles say
  const drillsPath = path.join(dir, 'drills.json'), guidesPath = path.join(dir, 'guides.json');
  const drills = existsSync(drillsPath) ? await readJson(drillsPath) : null;
  const guides = existsSync(guidesPath) ? await readJson(guidesPath) : null;
  // practice problems (content/problems2/, optional): shape and calibration checked like the rest
  const practice = await loadProblems(dir);
  const problems = [...validateContent({ site, examples, articles, lab, evalCat }), ...practice.errors, ...storyErrors(stories, articles), ...(drills ? drillErrors(drills, articles) : []), ...(guides ? guideErrors(guides, articles) : [])];
  if (problems.length) throw new Error(`Invalid content in ${dir}:\n- ${problems.join('\n- ')}`);
  let release = path.basename(dir);
  try { release = path.basename(realpathSync(dir)); } catch {}
  if (evalCat !== undefined) lab = { ...lab, eval: evalCat };
  return { site, examples, articles, lab, release, practice: practice.problems, stories, drills, guides };
}

/** stories.json: { <article slug>: [ null | { words?: [string|null, string|null], text?: string } per step ] } */
function storyErrors(stories, articles) {
  const errors = [], slugs = new Set(articles.map((a) => a.slug));
  if (!stories || typeof stories !== 'object' || Array.isArray(stories)) return ['stories.json must be an object'];
  for (const [slug, steps] of Object.entries(stories)) {
    if (!slugs.has(slug)) errors.push(`stories.json: ${slug} is not an article`);
    if (!Array.isArray(steps)) { errors.push(`stories.json ${slug}: steps must be a list`); continue; }
    steps.forEach((s, i) => { if (s !== null && (typeof s !== 'object' || (s.text !== undefined && typeof s.text !== 'string') || (s.words !== undefined && !(Array.isArray(s.words) && s.words.every((w) => w === null || typeof w === 'string'))))) errors.push(`stories.json ${slug}[${i}]: bad step`); });
  }
  return errors;
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
export function buildBodies({ site, examples, articles, lab, stories = {}, drills = null, guides = null }) {
  const drillsBody = drills ? drillBody(drills, articles) : { drills: [] };
  const guideSet = guides ? guideBodies(guides, articles) : { list: { guides: [] }, guide: () => null };
  const example = examples[site.example];
  const lists = new Map();
  // A problem's reference and wrong designs calibrate its tests (frontend judge.test.js). They aren't in
  // the article: the reference design is served on its own (GET /v1/articles/<slug>/solution), only when
  // someone opens the Solution tab; the wrong designs only on their own (GET /v1/articles/<slug>/wrong), for the gallery.
  const served = (a) => (a.practice ? { ...a, practice: (({ reference, wrong, mutantsAllowed, mutantsAllowedWhy, ...rest }) => rest)(a.practice) } : a);
  const full = new Map(articles.map((a) => [a.slug, { ...served(a), example }]));
  // A problem's wrong designs, for the gallery in the Solution tab (context 36, step 13): GET /v1/articles/<slug>/wrong.
  const wrongs = new Map(articles.filter((a) => a.practice?.wrong?.length).map((a) => [a.slug, { slug: a.slug, designs: a.practice.wrong.map((w) => ({ name: w.name, why: w.why, fails: w.fails, nodes: w.nodes, edges: w.edges })) }]));
  const freeSlugs = new Set(articles.filter(isFree).map((a) => a.slug));
  const publics = new Map(articles.map((a) => [a.slug, publicArticle(a)]));
  const solutions = new Map(articles.filter((a) => a.practice?.reference).map((a) => [a.slug, { slug: a.slug, nodes: a.practice.reference.nodes, edges: a.practice.reference.edges }]));
  return {
    // How much there is, for the landing page ("10 Interview Questions"): counted from the release, never typed by hand.
    // `example` (the worked example inside articles) is article text: it travels inside the full article, never in the site copy
    site: { ...(({ example: _example, ...rest }) => rest)(site), counts: {
      questions: articles.filter((a) => a.section === 'interview-questions' && a.group !== 'start').length,
      concepts: articles.filter((a) => a.section === 'concepts').length,
      components: articles.filter((a) => a.section === 'components').length,
      challenges: (lab?.challenges || []).length,
    } },
    lab,
    // what a signed-out visitor gets instead of the full Lab catalogue and the full articles (tech-katta-context 52)
    publicLab: publicLab(lab),
    // the design canvas's engine (component catalogue, prices, evaluator settings; no article text) with only the challenges' public
    // parts: what the free sample problem needs to run signed out (GET /v1/lab/engine). The challenges' hints and designs stay behind the sign-in.
    engineLab: { ...(({ challenges: _c, ...rest }) => rest)(lab), challenges: (lab.challenges || []).map(publicChallenge), locked: true },
    stories: { stories },
    // public: quick drills and decision guides (no sign-in: they only repeat what the articles say, in short)
    drills: drillsBody,
    guides: guideSet.list,
    guide: guideSet.guide,
    publicArticle: (slug) => publics.get(slug) || null,
    /** the free sample: these articles (and a free problem's solution and wrong designs) are served in full to everyone */
    isFree: (slug) => freeSlugs.has(slug),
    list(section) {
      if (!lists.has(section)) lists.set(section, { articles: articles.filter((a) => !section || a.section === section).map(summary) });
      return lists.get(section);
    },
    article: (slug) => full.get(slug) || null,
    solution: (slug) => solutions.get(slug) || null,
    wrong: (slug) => wrongs.get(slug) || null,
  };
}
