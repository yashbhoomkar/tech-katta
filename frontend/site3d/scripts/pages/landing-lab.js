// The practice-lab sections of the landing, under the 3D story: a demo you can try with no sign-in ("Fix the failing system"), honest counts, the three
// learning paths, a look inside, and what is free. The demo runs the same simulator and judge as /simulator (sim.js run), so a design gets the same verdict
// here as there. Nothing runs until a tap: the first view is untouched (task C's budgets); the counts and the look-inside read only what is already loaded.
import { INCIDENTS, run, rupees, cost } from '../sim.js';
import { sparkline, esc } from '../ui.js';
import { PATHS } from '../paths.js';
import { listNow, splitTitle } from '../articles.js';
import { labNow, lab } from '../solve.js';

const INC = INCIDENTS[0]; // IND vs PAK: 36,000 link opens a second, a cache node dies at the peak
export const START = { ...INC.start }; // 2 app servers, 1 cache node: it fails
/** the one-tap fixes; each changes the design by a count, and the judge decides whether it was enough */
export const FIXES = [
  { id: 'apps', label: 'Add 2 app servers before the toss', apply: (d) => ({ ...d, apps: d.apps + 2 }), part: 'apps' },
  { id: 'cache', label: 'Add a second cache node', apply: (d) => ({ ...d, cache: d.cache + 1 }), part: 'cache' },
  { id: 'replicas', label: 'Add 2 read replicas', apply: (d) => ({ ...d, replicas: d.replicas + 2 }), part: 'replicas' },
];
export const designFor = (on) => FIXES.reduce((d, f) => (on.has(f.id) ? f.apply(d) : d), { ...START });

const isProblem = (a) => a.section === 'interview-questions' && a.group !== 'start';
export const countsOf = (list, challenges) => ({
  articles: list.filter((a) => !isProblem(a) && a.group !== 'start').length,
  problems: list.filter(isProblem).length,
  challenges: challenges ?? null,
  warmups: INCIDENTS.length,
});
const countsHtml = (c) => `<dl class="counts">${[['Lessons', c.articles], ['Canvas problems', c.problems], ['Challenges', c.challenges], ['Warm-ups', c.warmups]].map(([k, n]) => `<div><dt class="mono">${k}</dt><dd class="count-n" data-count="${k}">${n ?? '·'}</dd></div>`).join('')}</dl>`;

const target = (d) => run(INC, d);
const firstStep = (p, list) => { const a = list.find((x) => `${x.section}/${x.slug}` === p.steps[0]); return a ? splitTitle(a.title)[0] : ''; };

export function sectionsHtml() {
  const list = listNow(), base = target(START);
  const ticks = base.ticks.map((t, i) => ({ ...t, t: i }));
  return `
  <div class="lab-sections">
  <section class="page lab-demo" id="demo" aria-labelledby="demo-h">
    <p class="kicker"><span>Try it</span><i></i>No sign-up</p>
    <h2 class="headline" id="demo-h"><span class="thin">Fix the failing system</span><span class="heavy accent">${esc(INC.title.replace(/^[^:]*: /, ''))}</span></h2>
    <p class="lead">${esc(INC.brief)} Right now the design below fails. Tap a fix and the same judge that checks your own designs runs the evening again.</p>
    <div class="demo-card">
      <div class="chart"><div data-demo-chart>${sparkline(INC, { w: 360, h: 100, ticks })}</div><div class="chart-axis mono"><span data-demo-note>The evening, as it goes with the design below</span><span>${INC.length} steps</span></div></div>
      <p class="demo-design mono" data-demo-design></p>
      <ul class="targets" data-demo-checks>${base.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><i></i>${esc(c.label)}<b>${esc(c.value)}</b></li>`).join('')}</ul>
      <div class="demo-fixes" role="group" aria-label="Fixes" hidden>${FIXES.map((f) => `<button type="button" class="btn light sm" data-fix="${f.id}" aria-pressed="false">${esc(f.label)}</button>`).join('')}</div>
      <button type="button" class="btn dark" data-demo-start>Start the demo<span class="chip">→</span></button>
      <div class="demo-out" data-demo-out aria-live="polite"></div>
    </div>
  </section>
  <section class="page lab-counts" aria-label="What is on the site">${countsHtml(countsOf(list, labNow()?.challenges?.length ?? null))}</section>
  <section class="page lab-paths" aria-labelledby="paths-h">
    <h2 class="sub-h" id="paths-h">Not sure where to start?</h2>
    <div class="paths mini">${PATHS.map((p) => `<a class="path" href="/start#${p.id}"><span class="mono">${esc(p.years)}</span><b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span><span class="go">First step: <span data-first="${p.id}">${esc(firstStep(p, list))}</span> →</span></a>`).join('')}</div>
  </section>
  <section class="page lab-inside" aria-labelledby="inside-h">
    <h2 class="sub-h" id="inside-h">Look inside</h2>
    <div class="inside-grid">
      <article class="inside"><p class="mono">A problem brief</p><b>${esc(INC.title)}</b><p class="muted">${esc(INC.brief)}</p><ul class="targets"><li><i></i>Errors under 1 %<b></b></li><li><i></i>p99 under ${INC.p99} ms<b></b></li><li><i></i>Within ${rupees(INC.budget)} a month<b></b></li></ul></article>
      <article class="inside"><p class="mono">A replay of the failure</p><div class="chart">${sparkline(INC, { w: 360, h: 90, ticks })}</div><p class="muted">The shaded steps are where the design above failed: ${base.checks[0].value} of requests returned errors.</p></article>
      <article class="inside"><p class="mono">What would fix it</p><ul class="why-list">${base.why.filter((w) => !w.soft).map((w) => `<li>${esc(w.text)}</li>`).join('')}</ul><p class="muted">The judge explains in plain words; the score comes from the tests, not from an opinion.</p></article>
    </div>
  </section>
  <section class="page lab-free" aria-labelledby="free-h">
    <h2 class="sub-h" id="free-h">Free while in beta</h2>
    <p class="lead">Everything is free while Tech Katta is in beta. Sign in only if you want your progress on every device.</p>
    <div class="actions"><a class="btn dark" href="/problems/url-shortener" data-final>Solve your first problem<span class="chip">→</span></a><a class="btn light" href="/free">See what opens without signing in</a></div>
  </section>
  </div>`;
}

const fmtChecks = (r) => r.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><i></i>${esc(c.label)}<b>${esc(c.value)}</b></li>`).join('');
const designLine = (d) => `${d.apps} app servers · ${d.cache} cache node${d.cache === 1 ? '' : 's'} · ${d.replicas} read replica${d.replicas === 1 ? '' : 's'} · ${rupees(cost(d))} a month`;

/** wire the sections: counts fill from the API-derived list; the demo starts on tap */
export function mountSections(root, { reduced = false } = {}) {
  let alive = true, timer = 0;
  const on = new Set();
  const q = (s) => root.querySelector(s);
  const chart = q('[data-demo-chart]'), checks = q('[data-demo-checks]'), out = q('[data-demo-out]'), note = q('[data-demo-note]'), line = q('[data-demo-design]'), fixes = q('.demo-fixes'), start = q('[data-demo-start]');
  if (!chart) return () => {};
  line.textContent = `Your design: ${designLine(START)}`;
  const show = (r, d, upto) => {
    chart.innerHTML = sparkline(INC, { w: 360, h: 100, ticks: r.ticks.slice(0, upto).map((t, i) => ({ ...t, t: i })) });
    const head = chart.querySelector('.head'); if (head && upto < INC.length) { const x = (Math.max(0, upto - 1) / (INC.length - 1)) * 360; head.setAttribute('x1', x); head.setAttribute('x2', x); }
  };
  const verdict = (r, d) => {
    checks.innerHTML = fmtChecks(r); line.textContent = `Your design: ${designLine(d)}`;
    const reasons = r.why.filter((w) => !w.soft);
    out.innerHTML = r.passed
      ? `<p class="demo-verdict ok"><b>Passed.</b> The evening held: ${r.checks[0].value} errors, p99 ${r.checks[1].value}, ${r.checks[2].value}.</p><p><a class="btn violet sm" href="/problems/url-shortener">Solve a real problem<span class="chip">→</span></a> <a class="btn light sm" href="/simulator/ind-vs-pak">Open it in the simulator</a></p>`
      : `<p class="demo-verdict bad"><b>Still failing.</b></p><ul class="why-list">${reasons.map((w) => `<li>${esc(w.text)}</li>`).join('') || '<li>It is close: one more change should do it.</li>'}</ul>`;
    note.textContent = r.passed ? 'It held' : 'Where it failed is shaded';
  };
  const play = () => {
    clearInterval(timer);
    const d = designFor(on), r = target(d);
    root.querySelector('.demo-card').dataset.running = '1';
    if (reduced) { show(r, d, INC.length); verdict(r, d); delete root.querySelector('.demo-card').dataset.running; return; }
    let i = 0; out.textContent = ''; note.textContent = 'Replaying the evening…';
    timer = setInterval(() => {
      if (!alive) return clearInterval(timer);
      i += 1; show(r, d, i);
      if (i >= INC.length) { clearInterval(timer); verdict(r, d); delete root.querySelector('.demo-card').dataset.running; }
    }, 90);
  };
  start.addEventListener('click', () => { start.hidden = true; fixes.hidden = false; play(); fixes.querySelector('button').focus({ preventScroll: true }); });
  fixes.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fix]'); if (!b) return;
    if (on.has(b.dataset.fix)) on.delete(b.dataset.fix); else on.add(b.dataset.fix);
    b.setAttribute('aria-pressed', String(on.has(b.dataset.fix)));
    play();
  });
  // the challenges' count needs the lab catalogue (about 10 KB gzipped): fetched once the strip is on screen, never for the first view
  const counts = q('.lab-counts');
  const fill = (n) => { const e = root.querySelector('[data-count="Challenges"]'); if (e && n != null) e.textContent = String(n); };
  let io = null;
  if (counts && 'IntersectionObserver' in window && labNow()?.challenges == null) {
    io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); lab().then((l) => alive && fill(l?.challenges?.length)); } }, { rootMargin: '200px' });
    io.observe(counts);
  }
  return () => { alive = false; clearInterval(timer); io?.disconnect(); };
}
