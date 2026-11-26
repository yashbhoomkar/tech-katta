// Solving, shared by the pages that point at the canvas: where an article's "Try it" box goes, and how far this browser
// is with the problems (the canvas's own record: tk-progress-v1 marks, tk-subs-v1 scores; nothing here writes to them).
// Pure apart from localStorage reads; site3d/test/solving.test.js has its cases.

/** a JSON object from localStorage, or {} (missing, broken, or storage blocked) */
export const readJson = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

/** the canvas's record for one problem: solved, started, best score (copied solutions don't count) */
export function record(slug, prog, subs) {
  const list = Array.isArray(subs[slug]) ? subs[slug].filter((x) => x && typeof x.score === 'number') : [];
  const own = list.filter((x) => !x.copied);
  const steps = prog.steps && typeof prog.steps === 'object' ? prog.steps : {};
  return { solved: steps[`solved:${slug}`] === true, started: steps[`practice:${slug}`] === true || list.length > 0, best: own.length ? Math.max(...own.map((x) => x.score)) : null };
}

/** where an article's lab box ({t:'lab', to:'problems/challenge/first-rush'}) goes: its own address on this site, else the problems list */
export function labHref(b) {
  const to = String(b?.to || '').trim().replace(/^\/+/, '');
  return /^(?:problems|simulator|practice|learn)(?:\/[a-z0-9][a-z0-9-]*)*$/.test(to) ? `/${to}` : '/problems';
}

/** the problems (interview questions past "Start here") and this browser's place in them: the one to open next, and whether any is started */
export function solveState(list, prog = readJson('tk-progress-v1'), subs = readJson('tk-subs-v1')) {
  const probs = list.filter((a) => a.section === 'interview-questions' && a.group !== 'start');
  const rec = Object.fromEntries(probs.map((a) => [a.slug, record(a.slug, prog, subs)]));
  const solved = probs.filter((a) => rec[a.slug].solved).length;
  // continue the newest started one that is not solved yet; else the first not solved
  const open = probs.find((a) => rec[a.slug].started && !rec[a.slug].solved) || probs.find((a) => !rec[a.slug].solved) || null;
  return { probs, rec, solved, total: probs.length, next: open, started: probs.some((a) => rec[a.slug].started) };
}
