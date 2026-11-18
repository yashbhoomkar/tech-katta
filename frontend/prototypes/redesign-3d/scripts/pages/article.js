// An article: its 3D story first (figures.js; the scroll plays it, as on the landing), then the real article from the
// API, every block type rendered. On wide screens a 3D figure stays beside the text and follows its sections.
import { mountStory, stageHtml } from '../story.js';
import { createWorld } from '../world.js';
import { getArticle, listNow, listArticles, splitTitle, minutes, SECTIONS } from '../articles.js';
import { recipeFor } from '../figures.js';
import { store } from '../store.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** running text: escaped, with `code` spans */
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numOf = (no = '') => (no.match(/(\d+)/) || [])[1] || '';

function block(b, a) {
  switch (b.t) {
    case 'p': return `<p>${inline(b.x)}</p>`;
    case 'h2': return `<h2 id="${slugify(b.x)}" data-h2>${inline(b.x)}</h2>`;
    case 'h3': return `<h3>${inline(b.x)}</h3>`;
    case 'list': return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
    case 'table': return `<figure class="tbl">${b.label ? `<figcaption>${inline(b.label)}</figcaption>` : ''}<div class="tbl-scroll" tabindex="0"><table>
      ${b.head ? `<thead><tr>${b.head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` : ''}
      <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${b.say ? `<p class="say"><span>Say it</span>${inline(b.say)}</p>` : ''}</figure>`;
    case 'code': return `<figure class="code">${b.label ? `<figcaption>${inline(b.label)}</figcaption>` : ''}<pre tabindex="0"><code>${esc(b.x)}</code></pre>${b.say ? `<p class="say"><span>Say it</span>${inline(b.say)}</p>` : ''}</figure>`;
    case 'fig': return `<figure class="fig-note" data-fig><span class="fig-mark" aria-hidden="true"><i></i><i></i><i></i></span><figcaption>${inline(b.cap)}</figcaption></figure>`;
    case 'more': return `<details class="more"><summary>${inline(b.label)}</summary><div>${(b.body || []).map((x) => block(x, a)).join('')}</div></details>`;
    case 'example': { const e = a.example; if (!e) return ''; return `<aside class="example"><p class="ex-kind mono">${esc(e.kind.charAt(0) + e.kind.slice(1).toLowerCase())}</p><h3>${esc(e.name)}</h3><p>${inline(e.text)}</p>
      ${e.parts?.length ? `<dl>${e.parts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inline(v)}</dd></div>`).join('')}</dl>` : ''}</aside>`; }
    case 'lab': return `<aside class="lab"><p>${inline(b.x)}</p><a class="btn light sm" href="#/sim/ind-vs-pak">${esc(b.go || 'Try it')}<span class="chip violet">→</span></a></aside>`;
    default: return b.x ? `<p>${inline(b.x)}</p>` : '';
  }
}

export function mount(view, [section, slug], { reduced }) {
  let alive = true, story = null, aside = null, io = null;
  const head = listNow().find((x) => x.slug === slug && x.section === section);
  const sec = SECTIONS.find((s) => s.id === section) || SECTIONS[0];
  view.innerHTML = `<section class="page narrow reader-wait"><p class="kicker"><span>${esc(sec.name)}</span><i></i>Loading</p><h1 class="headline"><span class="thin">${esc(head ? splitTitle(head.title)[0] : 'One moment')}</span></h1><p class="lead muted">${esc(head?.dek || '')}</p></section>`;

  getArticle(slug).then(async (a) => {
    if (!alive) return;
    if (!a && !head) { view.innerHTML = `<section class="page narrow missing"><p class="kicker"><span>${esc(sec.name)}</span><i></i>Not found</p><h1 class="headline"><span class="thin">No article at this address</span><span class="heavy">It may have moved</span></h1><p><a class="btn dark" href="#/learn/${esc(sec.id)}">See all ${esc(sec.name.toLowerCase())}<span class="chip">→</span></a></p></section>${footer()}`; return; }
    if (!a) { view.innerHTML = `<section class="page narrow missing"><p class="kicker"><span>${esc(sec.name)}</span><i></i>Offline</p><h1 class="headline"><span class="thin">This article could not load</span><span class="heavy">Check your connection and try again</span></h1><p><a class="btn dark" href="#/learn/${esc(section)}">Back to ${esc(sec.name.toLowerCase())}<span class="chip">→</span></a></p></section>${footer()}`; return; }
    const list = await listArticles();
    if (!alive) return;
    const mine = list.filter((x) => x.section === a.section), at = mine.findIndex((x) => x.slug === a.slug);
    const next = mine[at + 1], prev = mine[at - 1];
    const id = `${a.section}/${a.slug}`, groupName = (sec.groups.find(([g]) => g === a.group) || [])[1] || '';
    const [t1, t2] = splitTitle(a.title);
    const phone = innerWidth <= 760;
    // phones: every chapter keeps its system centred in the top part of the screen, above the glass panel of words
    const steps = recipeFor(a).map((s, i) => (i === 0 ? { ...s, cam: { side: false, cx: 0.75, sy: 0.56, el: 30, zoom: 1.18, phoneSy: 0.74, phoneZoom: 1.06, ...(s.cam || {}) } }
      : phone ? { ...s, cam: { ...(s.cam || {}), side: false, phoneSy: 0.3, phoneZoom: 1.75 } } : s));
    const h2s = a.body.filter((b) => b.t === 'h2');
    view.innerHTML = `
    <section class="story landing-story article-story">
      ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${steps.length - 1}</span><span class="segs">${steps.slice(1).map(() => '<i></i>').join('')}</span></div>`)}
      <div class="step hero" data-step="0">
        <p class="kicker"><span>${esc(sec.name.replace(/s$/, ''))} ${numOf(a.no)}</span><i></i>${esc(groupName)}</p>
        <h1 class="headline"><span class="thin">${esc(t1)}</span>${t2 ? `<span class="heavy accent">${esc(t2)}</span>` : ''}</h1>
        <p class="lead">${inline(a.dek)}</p>
        <p class="meta mono">${minutes(a)} min read · ${esc(a.date || '')}${store.get().read[id] ? ' · <span class="ok">read</span>' : ''}</p>
        <div class="actions"><button class="btn dark" type="button" data-next>Play the story<span class="chip">↓</span></button><button class="btn light" type="button" data-skip>Skip to the article</button></div>
      </div>
      ${steps.slice(1).map((s, i) => `<div class="step" data-step="${i + 1}">
        <p class="kicker"><span>0${i + 1}</span><i></i>${esc(t1)}</p>
        <h2 class="headline"><span class="thin">${esc(s.words?.[0] || '')}</span><span class="heavy accent">${esc(s.words?.[1] || '')}</span></h2>
        <p class="lead">${inline(s.text || '')}</p>
        ${i === steps.length - 2 ? '<div class="actions"><button class="btn light" type="button" data-skip>Read the article<span class="chip violet">↓</span></button></div>' : ''}
      </div>`).join('')}
    </section>
    <article class="reader" id="read">
      <div class="reader-grid">
        <div class="prose">
          <header class="prose-head">
            <p class="kicker"><span>The article</span><i></i>${minutes(a)} min</p>
            ${h2s.length > 2 ? `<nav class="toc" aria-label="In this article"><p class="mono">In this article</p><ol>${h2s.map((h) => `<li><a href="#${slugify(h.x)}" data-jump>${inline(h.x)}</a></li>`).join('')}</ol></nav>` : ''}
          </header>
          ${a.body.map((b) => block(b, a)).join('')}
          <div class="reader-end">
            <p class="mono done-note">${store.get().read[id] ? 'Read. It counts on your dashboard.' : 'Reaching here marks it read on your dashboard.'}</p>
            <div class="end-links">
              ${prev ? `<a class="end-card" href="#/learn/${a.section}/${prev.slug}"><span class="mono">Previous</span><b>${esc(splitTitle(prev.title)[0])}</b></a>` : '<span></span>'}
              ${next ? `<a class="end-card next" href="#/learn/${a.section}/${next.slug}"><span class="mono">Next</span><b>${esc(splitTitle(next.title)[0])}</b><span class="muted">${esc(next.dek)}</span></a>` : `<a class="end-card next" href="#/learn/${a.section}"><span class="mono">Done</span><b>Back to ${esc(sec.name.toLowerCase())}</b></a>`}
            </div>
          </div>
        </div>
        <aside class="reader-fig" aria-hidden="true"><div class="fig-card"><canvas></canvas><div class="overlay"></div><p class="fig-cap mono"><span class="cap-n">01</span><span class="cap-t">${esc(h2s[0]?.x || t1)}</span></p></div></aside>
      </div>
    </article>
    ${footer()}`;

    const root = view.querySelector('.story');
    const n = root.querySelector('.progress .n'), segs = [...root.querySelectorAll('.segs i')];
    story = mountStory(root, steps, { reduced, intro: true, onStep: (i) => { n.textContent = `0${i} / 0${steps.length - 1}`; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
    const go = (top) => scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); go(el.offsetTop + innerHeight * 0.28); });
    view.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => go(view.querySelector('#read').offsetTop - 20)));
    view.querySelectorAll('[data-jump]').forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); const el = view.querySelector(l.getAttribute('href')); if (el) go(el.getBoundingClientRect().top + scrollY - 90); }));

    // beside the text (wide screens): the story's system, one step per section of the article
    const card = view.querySelector('.fig-card');
    const heads = [...view.querySelectorAll('[data-h2]')];
    if (matchMedia('(min-width: 1100px)').matches && steps.length > 1) {
      try { aside = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { aside = null; }
    }
    card.classList.toggle('flat', !aside);
    aside?.setLabelBand(0.86);
    let shown = -1;
    const capN = card.querySelector('.cap-n'), capT = card.querySelector('.cap-t');
    const showSection = (k) => {
      if (k === shown) return; shown = k;
      const s = steps[Math.min(steps.length - 1, 1 + Math.floor((k * (steps.length - 1)) / Math.max(1, heads.length)))];
      capN.textContent = String(k + 1).padStart(2, '0'); capT.textContent = heads[k]?.textContent || t1;
      if (!aside) return;
      aside.setSystem(s.system);
      const f = aside.frame();
      aside.setCamera({ t: f.t, dist: f.dist * 1.05, az: 42, el: 32, sx: 0.5, sy: 0.56 }, { instant: k === 0 && shown <= 0 });
      aside.setState({ ...s.state, avoid: 0 });
    };
    showSection(0);
    // which section you are in, and the end of the article (marks it read)
    const end = view.querySelector('.reader-end');
    const onScroll = () => {
      let k = 0; heads.forEach((h, i) => { if (h.getBoundingClientRect().top < innerHeight * 0.45) k = i; });
      showSection(k);
    };
    addEventListener('scroll', onScroll, { passive: true });
    io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { store.markRead(id); end.querySelector('.done-note').textContent = 'Read. It counts on your dashboard.'; } });
    io.observe(end);
    io._off = () => removeEventListener('scroll', onScroll);
  });
  return () => { alive = false; story?.destroy(); aside?.destroy(); io?.disconnect(); io?._off?.(); };
}
