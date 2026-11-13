import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pagesFrom, render, sitemap } from '../seo.js';

const content = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content');
const base = '<html><head><meta name="description" content="Tech Katta dashboard"/><meta property="og:title" content="Tech Katta"/><meta property="og:description" content="x"/><meta property="og:url" content="https://tech.katta.cc/dashboard/"/><title>Dashboard | Tech Katta</title></head><body></body></html>';

test('every article and section gets a page', () => {
  const pages = pagesFrom(content);
  const keys = pages.map((p) => p.key);
  assert.ok(keys.includes('concepts'));
  assert.ok(keys.includes('problems'));
  assert.ok(keys.includes('components/redis'));
  assert.ok(keys.includes('real-systems/shopify-reservations'));
  // a section without a library card describes itself with its own header (site.json dashboard.heads)
  assert.match(pages.find((p) => p.key === 'real-systems').description, /^How Shopify, Discord/);
  assert.equal(new Set(keys).size, keys.length);
  for (const p of pages) { assert.ok(p.title.endsWith(' | Tech Katta')); assert.ok(p.description.length > 10, p.key); }
});

test('a page carries its own title, description, preview and canonical address', () => {
  const html = render(base, { key: 'components/caches', title: 'Caches & "you" | Tech Katta', description: 'A <b> dek' });
  assert.match(html, /<title>Caches &amp; &quot;you&quot; \| Tech Katta<\/title>/);
  assert.match(html, /<meta name="description" content="A &lt;b&gt; dek"\/>/);
  assert.match(html, /<meta property="og:title" content="Caches &amp; &quot;you&quot;"\/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/tech.katta.cc\/dashboard\/components\/caches\/"\/>/);
  assert.match(html, /<meta property="og:type" content="article"\/>/);
  assert.equal(html.match(/rel="canonical"/g).length, 1);
  assert.equal(render(html, { key: 'components/caches', title: 'T | Tech Katta', description: 'd' }).match(/rel="canonical"/g).length, 1);
});

test('the sitemap lists the home page, the dashboard and every page', () => {
  const xml = sitemap(['concepts', 'concepts/caches']);
  assert.match(xml, /<loc>https:\/\/tech.katta.cc\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/tech.katta.cc\/dashboard\/concepts\/caches\/<\/loc>/);
});

test('the API gives the same pages as the content folder', async () => {
  const { pagesOf } = await import('../seo.js');
  const fs = await import('node:fs');
  const site = JSON.parse(fs.readFileSync(path.join(content, 'site.json'), 'utf8'));
  const refs = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'index.json'), 'utf8')).articles;
  const list = refs.map((r) => JSON.parse(fs.readFileSync(path.join(content, 'articles', r + '.json'), 'utf8')));
  assert.deepEqual(pagesOf(site, list), pagesFrom(content));
});

test('an article page holds its public preview, never the locked text, and Article markup', async () => {
  const { previewCut } = await import('./preview.js');
  const fs = await import('node:fs');
  const a = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'concepts', 'consistent-hashing.json'), 'utf8'));
  const page = pagesFrom(content).find((p) => p.key === 'concepts/consistent-hashing');
  const html = render('<html><head><title>x</title><script type="module" src="/a.js"></script></head><body><div id="root"><p style="x">Loading…</p></div></body></html>', page);
  assert.match(html, /<div id="root"><div class="tk-static"><main>/);
  assert.match(html, /<h1>Consistent hashing/);
  assert.match(html, /class="tk-locked"/);
  assert.match(html, /"isAccessibleForFree":false/);
  assert.match(html, /"cssSelector":".tk-locked"/);
  const cut = previewCut(a.body);
  assert.ok(cut > 0 && cut < a.body.length);
  const firstP = a.body.slice(0, cut).find((b) => b.t === 'p' && !/`/.test(b.x));
  assert.ok(firstP && html.includes(firstP.x.slice(0, 40).replace(/&/g, '&amp;')));
  // nothing after the cut (paragraphs only, long enough to be unique)
  for (const b of a.body.slice(cut)) if (b.t === 'p' && b.x.length > 60 && !/`/.test(b.x)) assert.ok(!html.includes(b.x.slice(0, 60).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')), b.x.slice(0, 60));
});

test('every article preview stops before the end and shows some text', async () => {
  const { previewCut } = await import('./preview.js');
  const fs = await import('node:fs');
  const refs = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'index.json'), 'utf8')).articles;
  for (const r of refs) {
    const a = JSON.parse(fs.readFileSync(path.join(content, 'articles', r + '.json'), 'utf8'));
    const cut = previewCut(a.body);
    assert.ok(cut >= 1 && cut < a.body.length, r);
  }
});
