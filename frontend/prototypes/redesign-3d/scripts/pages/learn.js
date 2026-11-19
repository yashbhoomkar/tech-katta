// Learn: four tabs (concepts, components, interview questions, real systems), the real articles grouped as the site
// groups them. Beside the list, a live 3D preview of each article's figure rebuilds as you hover (wide screens) or as
// a row passes the middle of the screen (phones, where the preview stays at the top).
import { createWorld } from '../world.js';
import { listArticles, listNow, splitTitle, SECTIONS } from '../articles.js';
import { recipeFor, RECIPES, PREVIEW } from '../figures.js';
import { store } from '../store.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const numOf = (no = '') => (no.match(/(\d+)/) || [])[1] || '';
const HEAD = {
  concepts: ['The ideas every design is built from', 'Each opens with a short 3D story, then the full article.'],
  components: ['The tools interviewers name', 'What each is for, where it stops, and when to pick it.'],
  'interview-questions': ['Asked in real interviews', 'Each answered the way you would say it out loud: clarify, estimate, design, trade-offs.'],
  'real-systems': ['How apps you use are built', 'Real products at Indian scale, part by part.'],
};

export function mount(view, [sectionId], { reduced }) {
  const sec = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];
  let world = null, alive = true, cleanup = [];
  const draw = (list) => {
    cleanup.forEach((f) => f()); cleanup = [];
    const read = store.get().read;
    const mine = list.filter((a) => a.section === sec.id);
    const done = mine.filter((a) => read[`${a.section}/${a.slug}`]).length;
    const groups = sec.groups.map(([g, name]) => [name, mine.filter((a) => a.group === g)]).filter(([, l]) => l.length);
    const other = mine.filter((a) => !sec.groups.some(([g]) => g === a.group));
    if (other.length) groups.push(['More', other]);
    view.innerHTML = `
    <section class="page learn">
      <div class="learn-list">
        <p class="kicker"><span>Learn</span><i></i>${done} of ${mine.length} read</p>
        <h1 class="headline"><span class="thin">${esc(sec.name)}</span><span class="heavy accent">${esc(HEAD[sec.id][0])}</span></h1>
        <nav class="tabs" aria-label="Sections">${SECTIONS.map((s) => `<a href="#/learn/${s.id}" ${s.id === sec.id ? 'aria-current="page"' : ''}>${esc(s.name)}<span class="mono">${list.filter((a) => a.section === s.id).length}</span></a>`).join('')}</nav>
        <p class="lead">${esc(HEAD[sec.id][1])}</p>
        ${groups.map(([name, items], gi) => `
          <div class="track-block">
            <div class="track-head"><span class="mono">0${gi + 1}</span><h2>${esc(name)}</h2><span class="mono muted">${items.length}</span></div>
            <ol class="lessons">
              ${items.map((a) => { const [h, rest] = splitTitle(a.title), isRead = read[`${a.section}/${a.slug}`]; return `<li>
                <a class="lesson" href="#/learn/${a.section}/${a.slug}" data-preview="${a.slug}">
                  <span class="l-n mono">${numOf(a.no)}</span>
                  <span class="l-main"><b>${esc(h)}</b><span class="muted">${esc(rest || a.dek)}</span></span>
                  <span class="l-meta mono">${isRead ? '<span class="ok">✓ Read</span>' : RECIPES[a.slug] ? '<span class="story-tag">3D story</span>' : ''}</span>
                </a></li>`; }).join('')}
            </ol>
          </div>`).join('')}
      </div>
      <aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap"><span class="cap-t mono"></span><span class="cap-s"></span></p></div></aside>
    </section>
    ${footer()}`;

    const card = view.querySelector('.preview-card');
    world?.destroy(); world = null;
    try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; }
    card.classList.toggle('flat', !world);
    world?.setLabelBand(0.8); // clear of the caption at the bottom
    const capT = card.querySelector('.cap-t'), capS = card.querySelector('.cap-s');
    const bySlug = Object.fromEntries(mine.map((a) => [a.slug, a]));
    let shown = null;
    function preview(slug) {
      if (shown === slug || !bySlug[slug]) return; shown = slug;
      const a = bySlug[slug], steps = recipeFor(a), s = steps[Math.min(steps.length - 1, PREVIEW[slug] ?? steps.length - 1)];
      capT.textContent = `${numOf(a.no)} · ${splitTitle(a.title)[0]}`;
      capS.textContent = RECIPES[slug] && s.words ? `${(s.words[0] || s.h2 || '').replace(/^\d+\.\s*/, '')}: ${s.words[1].charAt(0).toLowerCase()}${s.words[1].slice(1)}` : splitTitle(a.title)[1] || a.dek;
      view.querySelectorAll('.lesson.on').forEach((x) => x.classList.remove('on'));
      view.querySelector(`[data-preview="${slug}"]`)?.classList.add('on');
      if (!world) return;
      world.setSystem(s.system);
      const f = world.frame();
      world.setCamera({ t: f.t, dist: f.dist * (innerWidth <= 760 ? 0.72 : 0.8), az: 42, el: 32, sx: 0.5, sy: 0.56 });
      world.setState({ ...s.state, avoid: 0 });
    }
    const rows = [...view.querySelectorAll('[data-preview]')];
    rows.forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
    // phones: the row in the middle of the screen is previewed
    const onScroll = () => {
      if (innerWidth > 900) return;
      const mid = innerHeight * 0.62;
      let best = null, bd = Infinity;
      for (const el of rows) { const r = el.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = el; } }
      if (best) preview(best.dataset.preview);
    };
    addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => removeEventListener('scroll', onScroll));
    preview(rows[0]?.dataset.preview);
    // phones: swipe sideways to move between the tabs; the list follows the finger, then goes or springs back
    const learnEl = view.querySelector('.learn'), at = SECTIONS.findIndex((x) => x.id === sec.id);
    let x0 = 0, y0 = 0, dx = 0, horiz = null;
    const start = (e) => { if (innerWidth > 900 || e.touches.length !== 1 || e.target.closest('.tabs')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horiz = null; learnEl.style.transition = 'none'; };
    const move = (e) => {
      if (!x0) return;
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (horiz === null && Math.hypot(mx, my) > 10) horiz = Math.abs(mx) > Math.abs(my) * 1.4;
      if (!horiz) return;
      const edge = (mx > 0 && at === 0) || (mx < 0 && at === SECTIONS.length - 1);
      dx = edge ? mx * 0.25 : mx; // a rubber band at the first and last tab
      learnEl.style.transform = `translateX(${dx * 0.6}px)`; learnEl.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900));
    };
    const end = () => {
      if (!x0) return; x0 = 0;
      const to = horiz && Math.abs(dx) > 70 ? at + (dx < 0 ? 1 : -1) : at;
      learnEl.style.transition = 'transform .3s var(--out), opacity .3s'; learnEl.style.transform = ''; learnEl.style.opacity = '';
      if (to !== at && SECTIONS[to]) { document.documentElement.dataset.dirHint = dx < 0 ? 'fwd' : 'back'; location.hash = `#/learn/${SECTIONS[to].id}`; }
    };
    learnEl.addEventListener('touchstart', start, { passive: true }); learnEl.addEventListener('touchmove', move, { passive: true }); learnEl.addEventListener('touchend', end);
    cleanup.push(() => { learnEl.removeEventListener('touchstart', start); learnEl.removeEventListener('touchmove', move); learnEl.removeEventListener('touchend', end); });
  };
  const first = listNow();
  draw(first);
  listArticles().then((l) => { if (alive && l !== first && JSON.stringify(l) !== JSON.stringify(first)) draw(l); });
  return () => { alive = false; cleanup.forEach((f) => f()); world?.destroy(); };
}
