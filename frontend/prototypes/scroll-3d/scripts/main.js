// Wires the story to the scene: which chapter is on screen, the progress bar, the next button and the theme switch.
import { createScene } from './scene.js';
import { createScene3d } from './scene3d.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// real 3D when the browser has WebGL; the SVG drawing otherwise
let scene = null;
document.documentElement.classList.add('webgl'); // shown first, so the canvas has its size when the scene measures it
try { scene = createScene3d(document.getElementById('scene3d'), document.getElementById('overlay3d'), { reduced }); } catch (e) { console.warn('3D scene unavailable', e); scene = null; }
if (!scene) { document.documentElement.classList.remove('webgl'); scene = createScene(document.getElementById('scene'), { reduced }); }
const chapters = [...document.querySelectorAll('.chapter')];
const segs = [...document.querySelectorAll('.segs i')];
const top = document.getElementById('top');
const next = document.getElementById('next');
const nLabel = document.getElementById('progress-n');
const nameLabel = document.getElementById('progress-name');
let current = 0;

function show(n) {
  current = n;
  scene.setChapter(n);
  nLabel.textContent = `${String(n).padStart(2, '0')} / 05`;
  nameLabel.textContent = chapters[n].dataset.name.toUpperCase();
  segs.forEach((s, i) => s.classList.toggle('on', i < n));
  top.classList.toggle('solid', n > 0);
  document.body.classList.toggle('side', n > 0 && n < chapters.length - 1);
  next.classList.toggle('gone', n === chapters.length - 1);
}

// The chapter whose middle band is on screen is the current one.
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) show(Number(e.target.dataset.chapter));
}, { rootMargin: '-45% 0px -45% 0px' });
chapters.forEach((c) => seen.observe(c));
// words arrive as their chapter comes into view (once)
document.documentElement.classList.add('js-reveal');
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); reveal.unobserve(e.target); }
}, { threshold: 0.2 });
chapters.forEach((c) => reveal.observe(c));

// the camera follows the scroll between chapters: a fractional chapter index from where the page is
const bar = document.querySelector('#scrollbar i');
function onScroll() {
  const mid = scrollY + innerHeight / 2;
  const centres = chapters.map((c) => c.offsetTop + c.offsetHeight / 2);
  let f = 0;
  for (let i = 0; i < centres.length - 1; i++) if (mid >= centres[i]) f = i + Math.min(1, (mid - centres[i]) / (centres[i + 1] - centres[i]));
  if (mid >= centres[centres.length - 1]) f = centres.length - 1;
  scene.setProgress?.(f);
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// the hero's word "break." is filled with log lines that scroll (a canvas pattern; the CSP allows data: images)
function logFill() {
  const el = document.querySelector('.logword');
  if (!el) return;
  const c = document.createElement('canvas'), w = 900, h = 380; c.width = w; c.height = h;
  const g = c.getContext('2d');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6D3FE0';
  g.fillStyle = accent; g.fillRect(0, 0, w, h);
  g.font = '600 15px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,255,255,.5)';
  const lines = ['cache ERROR node unreachable', 'db WARN connections 500/500', 'api ERROR upstream timeout 2000ms', 'lb WARN 5xx rate 31%', 'links.open 40,112/s expected=4,000/s', 'db queries 37,600/s', 'cache.hit 0% was=94%'];
  for (let y = 18, i = 0; y < h; y += 19, i++) g.fillText(`${lines[i % lines.length]} · ${lines[(i + 3) % lines.length]} · ${lines[(i + 5) % lines.length]}`, -(i * 37 % 160), y);
  el.style.backgroundImage = `url(${c.toDataURL()})`;
}
document.fonts?.ready.then(logFill); logFill();
new MutationObserver(logFill).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const go = (n) => chapters[Math.min(n, chapters.length - 1)].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
next.addEventListener('click', () => go(current + 1));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.goto))));

// System / Light / Dark, the same storage key as the other prototypes (read by boot-theme.js before paint).
const themeBtn = document.getElementById('theme');
const order = ['system', 'light', 'dark'];
const label = { system: 'System', light: 'Light', dark: 'Dark' };
let pref = 'system';
try { pref = localStorage.getItem('tk-proto-theme') || 'system'; } catch { /* storage blocked */ }
function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtn.textContent = label[pref];
  themeBtn.setAttribute('aria-label', `Theme: ${label[pref]}`);
}
themeBtn.addEventListener('click', () => {
  pref = order[(order.indexOf(pref) + 1) % order.length];
  try { localStorage.setItem('tk-proto-theme', pref); } catch { /* storage blocked */ }
  applyTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();
show(0);
