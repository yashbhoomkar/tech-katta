// An article: its 3D story first (figures.js; the scroll plays it, as on the landing), then the real article from the
// API, every block type rendered. On wide screens a 3D figure stays beside the text and follows its sections.
import { mountStory, stageHtml } from '../story.js';
import { createWorld } from '../world.js';
import { getArticle, listNow, listArticles, splitTitle, minutes, SECTIONS, SECOND, ensureStories } from '../articles.js';
import { recipeFor } from '../figures.js';
import { store } from '../store.js';
import { footer } from './landing.js';
import { PLACES } from '../shell.js';
import { watchGate } from '../gating.js';
import { articlePublicHtml, problemPublicHtml, wirePublic } from './public.js';
import { readArticle as trackReading } from '../analytics.js';

/** a small note that slides up from the bottom and goes */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 1800); setTimeout(() => t.remove(), 2300);
}
const sentenceNo = (t = '') => sentence(t.replace(/\s*\/\/\s*/, ' '));

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** running text: escaped, with `code` spans */
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
// the contents list never numbers: the walkthrough's five steps are numbered in the text, the extra sections after them are not
const NUM = /^\d+\.\s*/;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numOf = (no = '') => (no.match(/(\d+)/) || [])[1] || '';
// option labels arrive in capitals ("SQS, RABBITMQ"): sentence case, with names and acronyms restored
const PROPER = { sqs: 'SQS', sns: 'SNS', cdn: 'CDN', url: 'URL', sql: 'SQL', rabbitmq: 'RabbitMQ', kafka: 'Kafka', kinesis: 'Kinesis', pulsar: 'Pulsar', google: 'Google', 'pub/sub': 'Pub/Sub', api: 'API', cap: 'CAP', cdc: 'CDC', ai: 'AI', ind: 'IND', pak: 'PAK', vs: 'vs' };
const sentence = (t) => { const s = t.toLowerCase().replace(/[a-z/]+/g, (w) => PROPER[w] || w); return s.charAt(0).toUpperCase() + s.slice(1); };

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
    case 'lab': return `<aside class="try-lab"><p>${inline(b.x)}</p><a class="btn light sm" href="/simulator/ind-vs-pak">${esc(b.go || 'Try it')}<span class="chip violet">→</span></a></aside>`;
    case 'type': return `<article class="opt"><p class="opt-head">${b.name ? `<span class="mono">${esc(b.name)}</span>` : ''}<b>${esc(sentence(b.kind || ''))}</b></p>
      ${b.what ? `<p>${inline(b.what)}</p>` : ''}
      <dl>${[['Good for', b.use], ['Watch out', b.avoid], ['Example', b.ex], ['Like', b.like]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${inline(v)}</dd></div>`).join('')}</dl>
      ${b.more?.length ? `<ul>${b.more.map((m) => `<li>${inline(m)}</li>`).join('')}</ul>` : ''}</article>`;
    case 'analogy': return `<aside class="analogy"><span class="mono">Think of it as</span><p>${inline(b.x)}</p></aside>`;
    default: return b.x ? `<p>${inline(b.x)}</p>` : '';
  }
}

/** the public part the server put in the page's HTML for search engines (frontend/seo.js): what is shown when the API cannot be reached on the first load */
function fromPrerender(slug) {
  try {
    const kept = window.__tkPre;
    if (!kept || kept.path !== location.pathname.replace(/(.)\/$/, '$1')) return null;
    const art = kept.node.querySelector('article');
    if (!art) return null;
    const h1 = art.querySelector('h1'), ps = [...art.querySelectorAll(':scope > p')].filter((p) => !p.querySelector('time'));
    if (!h1 || ps.length < 2) return null;
    return { section: '', slug, title: h1.textContent, dek: ps[1].textContent, body: ps.slice(2).map((p) => ({ t: 'p', x: p.textContent })), headings: [...art.querySelectorAll('.tk-locked ol li')].map((li) => li.textContent), kind: 'article', locked: true };
  } catch { return null; }
}

export function mount(view, [section, slug], { reduced }) {
  const pre = fromPrerender(slug);
  let alive = true, story = null, aside = null, io = null, offGate = null, stopReading = null, offPublic = null; const ac = new AbortController();
  const head = listNow().find((x) => x.slug === slug && x.section === section);
  const sec = SECTIONS.find((s) => s.id === section) || SECTIONS[0];
  // the loading header is the finished header's own layout (the same hero step, label, title, dek, meta line and buttons), so nothing moves when the text arrives
  const hGroup = head ? ((sec.groups.find(([g]) => g === head.group) || [])[1] || '') : '', [h1a, h1b] = head ? splitTitle(head.title) : ['One moment', ''], h2b = h1b || (head ? SECOND[slug] : '') || '';
  view.innerHTML = `<section class="story landing-story article-story reader-wait"><div class="step hero" data-step="0" aria-busy="true">
    <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/${esc(sec.id)}">${esc(sec.name)}</a></nav>
    <p class="kicker"><span>${esc(sec.name.replace(/s$/, ''))} ${head ? numOf(head.no) : ''}</span><i></i>${esc(hGroup)}</p>
    <h1 class="headline"><span class="thin">${esc(h1a)}</span>${h2b ? `<span class="heavy accent">${esc(h2b)}</span>` : ''}</h1>
    <p class="lead">${esc(head?.dek || '\u00a0')}</p>
    <p class="meta mono skel-meta" role="status" aria-label="Loading">&nbsp;</p>
    <div class="actions"><button class="btn dark" type="button" disabled>Play the story<span class="chip">↓</span></button><button class="btn light" type="button" disabled>Skip to the article</button></div>
  </div></section>`;

  getArticle(slug).then(async (a) => {
    if (!alive) return;
    // the API cannot be reached: the public part from the page's own HTML (first load) or from the list's header; never the locked text
    if (!a && pre && pre.title) a = { ...pre, section, no: head?.no, group: head?.group, date: head?.date };
    if (!a && head) a = { section, slug, title: head.title, dek: head.dek, no: head.no, group: head.group, date: head.date, body: [], headings: [], kind: 'article', locked: true };
    if (!a && !head) { view.innerHTML = `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><span>Not found</span></nav><h1 class="headline"><span class="thin">No article at this address</span><span class="heavy">It may have moved</span></h1><p><a class="btn dark" href="/learn/${esc(sec.id)}">See all ${esc(sec.name.toLowerCase())}<span class="chip">→</span></a></p></section>${footer()}`; return; }
    if (!a) { view.innerHTML = `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><span>Offline</span></nav><h1 class="headline"><span class="thin">This article could not load</span><span class="heavy">Check your connection and try again</span></h1><p><a class="btn dark" href="/learn/${esc(section)}">Back to ${esc(sec.name.toLowerCase())}<span class="chip">→</span></a></p></section>${footer()}`; return; }
    const list = await listArticles();
    if (!alive) return;
    offGate = watchGate('article', () => window.tkRefresh?.());
    // signed out (or sign-in unavailable): the API sends only the public part (header, first 2 paragraphs, section names; for a
    // problem its title, difficulty and brief). That is all there is to draw: the page below never sees the rest.
    if (a.locked) {
      const crumbs = `<nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/${esc(sec.id)}">${esc(sec.name)}</a></nav>`;
      const groupName = (sec.groups.find(([g]) => g === (head?.group || a.group)) || [])[1] || '';
      const [t1, t2a] = splitTitle(a.title), t2 = t2a || SECOND[a.slug] || '';
      view.innerHTML = (a.kind === 'problem'
        ? problemPublicHtml({ title: a.title, difficulty: groupName || a.difficulty, brief: a.brief }, { crumbs, kicker: `${sec.name.replace(/s$/, '')} ${numOf(head?.no || a.no)}` })
        : articlePublicHtml(a, { crumbs, kicker: [`${sec.name.replace(/s$/, '')} ${numOf(head?.no || a.no)}`, groupName], t1, t2 })) + footer();
      document.title = `${a.title} · Tech Katta`;
      offPublic = wirePublic(view);
      return;
    }
    // the content lock (gate.js): signed in, everything
    const cut = false;
    await ensureStories(true); // the 3D story's words and sentences come from the API, for signed-in readers
    if (!alive) return;
    const visible = a.body;
    if (!cut) stopReading = trackReading(a.section, a.slug);
    const mine = list.filter((x) => x.section === a.section), at = mine.findIndex((x) => x.slug === a.slug);
    if (at >= 0) { a.group = mine[at].group; a.no = mine[at].no; } // the list carries the real group and number
    const next = mine[at + 1], prev = mine[at - 1];
    const id = `${a.section}/${a.slug}`, groupName = (sec.groups.find(([g]) => g === a.group) || [])[1] || '';
    const [t1, t2a] = splitTitle(a.title), t2 = t2a || SECOND[a.slug] || '';
    const phone = innerWidth <= 760;
    // phones: every chapter keeps its system centred in the top part of the screen, above the glass panel of words
    const span = (sy) => { const ps = Object.values(sy.parts), xs = ps.map((q) => q.x), zs = ps.map((q) => q.z); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)); };
    const heroZoom = (sy) => { const w = span(sy); return w < 7 ? 1.55 : w < 10 ? 1.32 : 1.18; }; // small systems sit further back, clear of the headline
    // a chapter may name a section of the article (step.h2): its words then come from that section's own opening
    const fromBody = (step) => {
      if (!step.h2) return step;
      const k = a.body.findIndex((b) => b.t === 'h2' && b.x.toLowerCase().startsWith(step.h2.toLowerCase()));
      if (k < 0) return step;
      let text = '';
      for (let j = k + 1; j < a.body.length && a.body[j].t !== 'h2' && text.length < 140; j++) { const b = a.body[j], x = b.t === 'p' ? b.x : b.t === 'list' ? b.items.slice(0, 2).join(' ') : ''; if (x) text += (text ? ' ' : '') + x.replace(/`/g, ''); }
      if (text.length > 260) { const cut = text.slice(0, 260), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? ')); text = end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`; }
      if (!text) { for (let j = k + 1; j < a.body.length && a.body[j].t !== 'h2'; j++) if (a.body[j].t === 'type' && a.body[j].what) text = a.body[j].what; }
      if (!text) { const tb = a.body.slice(k + 1).find((b, j, arr) => b.t === 'table' && !arr.slice(0, j).some((x) => x.t === 'h2')); if (tb) text = `${tb.rows.map((r) => r[0]).join(', ')}.`; }
      if (text.length > 260) { const cut = text.slice(0, 260), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? ')); text = end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`; }
      return { ...step, words: [step.words?.[0] || a.body[k].x, step.words?.[1] || ''], text: text || step.text };
    };
    const steps = recipeFor(a).map(fromBody).map((s, i) => (i === 0 ? { ...s, cam: { side: false, cx: innerWidth >= 1000 ? 0.7 : innerWidth > 760 ? 0.8 : 0.75, sy: 0.56, el: 30, zoom: heroZoom(s.system) * (innerWidth >= 1000 ? 1.14 : innerWidth > 760 ? 1.3 : 1), phoneSy: 0.74, phoneZoom: 1.06, ...(s.cam || {}) } }
      : phone ? { ...s, cam: { ...(s.cam || {}), side: false, phoneSy: 0.3, phoneZoom: 1.75 } } : s));
    const h2s = visible.filter((b) => b.t === 'h2');
    // topics for the Cards view: each h2 section, with its first line as a lede (tech.katta.cc's "Cards")
    const topics = [], introBlocks = [];
    for (const b of visible) { if (b.t === 'h2') topics.push({ title: b.x, blocks: [] }); else (topics.length ? topics[topics.length - 1].blocks : introBlocks).push(b); }
    topics.forEach((t) => { const p = t.blocks.find((b) => b.t === 'p') || t.blocks.find((b) => b.t === 'list'); const x = p ? (p.x || p.items[0]) : ''; t.lede = x.replace(/`/g, '').slice(0, 120) + (x.length > 120 ? '…' : ''); });
    const intro = introBlocks.map((b) => block(b, a)).join('');
    const words = (bs) => JSON.stringify(bs).split(/\s+/).length;
    const withDetails = Math.round(words(a.body) / 230);
    const colour = (PLACES.find((p) => p.id === a.section) || PLACES[2]).colour;
    const isDone = !!store.get().read[id], isProblem = a.section === 'interview-questions' && a.group !== 'start';
    const lab = a.body.find((b) => b.t === 'lab');
    let mode = 'full'; try { mode = !cut && localStorage.getItem('tk-r3d-reader') === 'cards' ? 'cards' : 'full'; } catch { /* blocked */ }
    view.innerHTML = `
    <section class="story landing-story article-story">
      ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${steps.length - 1}</span><span class="segs">${steps.slice(1).map(() => '<i></i>').join('')}</span></div>`)}
      <div class="step hero" data-step="0">
        <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/${a.section}">${esc(sec.name)}</a></nav>
        <p class="kicker"><span>${esc(sec.name.replace(/s$/, ''))} ${numOf(a.no)}</span><i></i>${esc(groupName)}</p>
        <h1 class="headline"><span class="thin">${esc(t1)}</span>${t2 ? `<span class="heavy accent">${esc(t2)}</span>` : ''}</h1>
        <p class="lead">${inline(a.dek)}</p>
        <p class="meta mono">${minutes(a)} min read · ${esc(a.date || '')}${store.get().read[id] ? ' · <span class="ok">done</span>' : ''}</p>
        <div class="actions"><button class="btn dark" type="button" data-next>Play the story<span class="chip">↓</span></button><button class="btn light" type="button" data-skip>Skip to the article</button></div>
      </div>
      ${steps.slice(1).map((s, i) => `<div class="step" data-step="${i + 1}">
        <p class="kicker"><span>0${i + 1}</span><i></i>${esc(t1)}</p>
        <h2 class="headline"><span class="thin">${esc(s.words?.[0] || '')}</span><span class="heavy accent">${esc(s.words?.[1] || '')}</span></h2>
        <p class="lead">${inline(s.text || '')}</p>
        ${i === steps.length - 2 ? '<div class="actions"><button class="btn light" type="button" data-skip>Read the article<span class="chip violet">↓</span></button></div>' : ''}
      </div>`).join('')}
    </section>
    <article class="reader" id="read" style="--acc: var(--${colour})">
      <i class="read-line" aria-hidden="true"></i>
      <div class="reader-grid">
        <div class="prose">
          <header class="prose-head">
            <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/${a.section}">${esc(sec.name)}</a>${groupName ? `<span>/</span><span>${esc(groupName)}</span>` : ''}<span>/</span><span>${esc(t1)}</span></nav>
            <p class="rd-meta"><span>${topics.length > 1 ? `${topics.length} topics · ` : ''}${minutes(a)} min read${withDetails > minutes(a) ? ` · ${withDetails} with details` : ''}</span><span class="done-chip" ${isDone ? '' : 'hidden'}><i class="tk" aria-hidden="true"></i> Completed</span></p>
            <div class="rd-tools">
              ${topics.length > 1 && !cut ? `<div class="seg" role="radiogroup" aria-label="Read as"><button type="button" role="radio" data-mode="full" aria-checked="${mode === 'full'}">Full text</button><button type="button" role="radio" data-mode="cards" aria-checked="${mode === 'cards'}">Cards</button><i class="seg-pill" aria-hidden="true"></i></div>` : ''}
              <button type="button" class="tool-btn" data-share>Share</button>
            </div>
            ${h2s.length > 2 ? `<details class="phone-toc"><summary>On this page</summary><ol>${h2s.map((h) => `<li><a href="#${slugify(h.x)}" data-jump>${inline(h.x.replace(NUM, ''))}</a></li>`).join('')}</ol></details>` : ''}
          </header>
          <div class="rd-full${cut ? ' preview-fade' : ''}">${visible.map((b) => block(b, a)).join('')}</div>
          <div class="rd-cards" hidden>
            ${intro ? `<div class="rd-intro">${intro}</div>` : ''}
            <div class="topic-grid">${topics.map((t, i) => `<button type="button" class="topic-card" data-topic="${i}" style="--i:${i}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${inline(t.title)}</b><span class="muted">${esc(t.lede)}</span></button>`).join('')}</div>
            <div class="topic-open" hidden></div>
          </div>
          <footer class="rd-foot">
            <div class="complete-wrap" ${cut ? 'hidden' : ''}><button type="button" class="btn dark complete" data-complete>${isDone ? 'Next' : 'Mark complete'}${next ? ' & next' : ''}<span class="chip">→</span></button><span class="burst" aria-hidden="true"></span></div>
            <div class="pager">
              ${prev ? `<a class="page-link" href="/learn/${a.section}/${prev.slug}"><small>Previous</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
              ${next ? `<a class="page-link next" href="/learn/${a.section}/${next.slug}"><small>Next</small><span>${esc(next.title)}</span></a>` : `<a class="page-link next" href="/learn/${a.section}"><small>Done</small><span>Back to ${esc(sec.name.toLowerCase())}</span></a>`}
            </div>
            <a class="back-link" href="/learn/${a.section}">← All ${esc(sec.name.toLowerCase())}</a>
          </footer>
        </div>
        <aside class="reader-rail" aria-label="Lesson navigation">
          <div class="fig-card" aria-hidden="true"><canvas></canvas><div class="overlay"></div><p class="fig-cap mono"><span class="cap-n">01</span><span class="cap-t">${esc(h2s[0]?.x || t1)}</span></p></div>
          ${h2s.length > 1 ? `<nav class="rail-toc" aria-label="On this page"><p class="mono">On this page</p><ol>${h2s.map((h) => `<li><a href="#${slugify(h.x)}" data-jump>${inline(h.x.replace(NUM, ''))}</a></li>`).join('')}</ol></nav>` : ''}
          ${isProblem || lab ? `<a class="rail-cta" href="${isProblem ? `/problems/${esc(a.slug)}` : '/simulator'}"><small class="mono">${isProblem ? 'Practice' : 'Try it'}</small><b>${isProblem ? 'Solve it on the canvas' : esc((lab.go || 'Open the problem').replace(/challenge/i, 'problem'))} →</b></a>` : ''}
          <nav class="rail-group" aria-label="Lessons in ${esc(groupName || sec.name)}"><p class="mono">${esc(groupName || sec.name)}</p><ol>
            ${mine.filter((x) => x.group === a.group).map((x) => `<li><a href="/learn/${x.section}/${x.slug}" ${x.slug === a.slug ? 'aria-current="page"' : ''} class="${store.get().read[`${x.section}/${x.slug}`] ? 'done' : ''}"><i aria-hidden="true"></i>${esc(splitTitle(x.title)[0])}</a></li>`).join('')}
          </ol></nav>
        </aside>
      </div>
    </article>
    ${footer()}`;

    const root = view.querySelector('.story');
    const n = root.querySelector('.progress .n'), segs = [...root.querySelectorAll('.segs i')];
    story = mountStory(root, steps, { reduced, intro: true, label: `${t1}, as a 3D system that changes as you scroll. The words beside it say the same.`, onStep: (i) => { n.textContent = `0${i} / 0${steps.length - 1}`; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
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
    aside?.setLabelBand(0.86); aside?.setLabelTop(10);
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
    // which section you are in: the 3D figure and the contents list follow it; the line at the top shows how far
    // 68: tables and code that scroll sideways fade at the edge that has more
    const fades = [...view.querySelectorAll('.tbl-scroll, .code pre')];
    const setFades = () => fades.forEach((e) => { e.classList.toggle('fade-r', e.scrollLeft + e.clientWidth < e.scrollWidth - 2); e.classList.toggle('fade-l', e.scrollLeft > 2); });
    fades.forEach((e) => e.addEventListener('scroll', setFades, { passive: true })); addEventListener('resize', setFades, { signal: ac.signal }); requestAnimationFrame(setFades);
    const toc = [...view.querySelectorAll('.rail-toc a')], line = view.querySelector('.read-line'), readEl = view.querySelector('#read');
    const onScroll = () => {
      let k = 0; heads.forEach((h, i) => { if (h.offsetParent && h.getBoundingClientRect().top < innerHeight * 0.45) k = i; });
      showSection(k);
      toc.forEach((l, i) => l.classList.toggle('on', i === k));
      const r = readEl.getBoundingClientRect(), f = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      line.style.transform = `scaleX(${f.toFixed(3)})`; line.style.opacity = r.top < 0 ? '1' : '0';
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // Full text or Cards (remembered); Cards opens one topic at a time, and on phones you swipe between topics
    const full = view.querySelector('.rd-full'), cards = view.querySelector('.rd-cards'), open = view.querySelector('.topic-open'), grid = view.querySelector('.topic-grid');
    const setMode = (m) => {
      mode = m; try { localStorage.setItem('tk-r3d-reader', m); } catch { /* blocked */ }
      full.hidden = m !== 'full'; cards.hidden = m !== 'cards';
      view.querySelectorAll('.seg [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
      view.querySelector('.seg')?.classList.toggle('right', m === 'cards');
      view.querySelector('.rail-toc')?.toggleAttribute('hidden', m === 'cards');
      closeTopic();
    };
    let cur = -1;
    const showTopic = (i, dir = 0) => {
      if (i < 0 || i >= topics.length) return;
      cur = i; grid.hidden = true; open.hidden = false; view.querySelector('.rd-intro')?.toggleAttribute('hidden', true);
      open.innerHTML = `<div class="topic-nav"><button type="button" class="tool-btn" data-back>← All topics</button><span class="mono">${i + 1} of ${topics.length}</span></div>
        <h2>${inline(topics[i].title)}</h2>${topics[i].blocks.map((b) => block(b, a)).join('')}
        <div class="topic-pager">${i > 0 ? `<button type="button" class="page-link" data-go="${i - 1}"><small>Previous topic</small><span>${inline(topics[i - 1].title)}</span></button>` : '<span></span>'}${i < topics.length - 1 ? `<button type="button" class="page-link next" data-go="${i + 1}"><small>Next topic</small><span>${inline(topics[i + 1].title)}</span></button>` : ''}</div>`;
      open.classList.remove('from-left', 'from-right'); void open.offsetWidth; if (dir) open.classList.add(dir > 0 ? 'from-right' : 'from-left');
      showSection(i);
      scrollTo({ top: readEl.offsetTop + view.querySelector('.prose-head').offsetHeight - (innerWidth <= 760 ? 70 : 40), behavior: 'auto' });
    };
    const closeTopic = () => { cur = -1; open.hidden = true; open.innerHTML = ''; grid.hidden = false; view.querySelector('.rd-intro')?.removeAttribute('hidden'); };
    grid.addEventListener('click', (e) => { const c = e.target.closest('[data-topic]'); if (c) showTopic(+c.dataset.topic); });
    open.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) closeTopic(); const g = e.target.closest('[data-go]'); if (g) showTopic(+g.dataset.go, +g.dataset.go > cur ? 1 : -1); });
    let sx = 0, sy = 0;
    open.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    open.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) showTopic(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
    view.querySelectorAll('.seg [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    if (topics.length > 1 && !cut) setMode(mode);

    // share: the phone's share sheet, or copy the link
    view.querySelector('[data-share]').addEventListener('click', async () => {
      const url = location.href;
      try { if (navigator.share) await navigator.share({ title: a.title, text: a.dek, url }); else { await navigator.clipboard.writeText(url); toast('Copied the link'); } } catch { /* closed */ }
    });
    // mark complete: a tick and a burst in the part colours, then on to the next lesson
    view.querySelector('[data-complete]').addEventListener('click', (e) => {
      const btn = e.currentTarget, wasDone = !!store.get().read[id];
      store.markRead(id);
      view.querySelector('.done-chip').hidden = false;
      if (!wasDone) { toast('Marked complete'); if (!reduced) { const burst = view.querySelector('.burst'); burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go'); } }
      btn.disabled = true;
      setTimeout(() => { window.tkFresh = true; window.tkGo(next ? `/learn/${a.section}/${next.slug}` : `/learn/${a.section}`); }, wasDone || reduced ? 0 : 700);
    });
    io = { disconnect() {}, _off: () => removeEventListener('scroll', onScroll) };
  });
  return () => { alive = false; offGate?.(); offPublic?.(); stopReading?.(); ac.abort(); story?.destroy(); aside?.destroy(); io?.disconnect(); io?._off?.(); };
}
