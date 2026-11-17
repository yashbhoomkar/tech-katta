// Wires the story to the scene: which chapter is on screen, the progress bar, the next button and the theme switch.
import { createScene } from './scene.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = createScene(document.getElementById('scene'), { reduced });
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
