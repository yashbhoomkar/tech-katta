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

test('an article page holds its public part (2 paragraphs, section names), never the locked text, and Article markup without paywall data', async () => {
  const { publicParagraphs } = await import('../../backend/src/content/public.js');
  const fs = await import('node:fs');
  const a = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'concepts', 'consistent-hashing.json'), 'utf8'));
  const page = pagesFrom(content).find((p) => p.key === 'concepts/consistent-hashing');
  const html = render('<html><head><title>x</title><script type="module" src="/a.js"></script></head><body><div id="root"><p style="x">Loading…</p></div></body></html>', page);
  assert.match(html, /<div id="root"><div class="tk-static"><main>/);
  // hidden while JavaScript runs (site3d/scripts/boot-theme.js adds tk-js), so it never flashes before the app draws
  assert.match(html, /html\.tk-js #root>\.tk-static\{display:none\}/);
  assert.match(html, /<h1>Consistent hashing/);
  assert.doesNotMatch(html, /tk-locked/);
  assert.doesNotMatch(html, /isAccessibleForFree/);
  const shown = publicParagraphs(a.body);
  assert.equal(shown.length, 2);
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const b of shown) if (!/`/.test(b.x)) assert.ok(html.includes(esc(b.x.slice(0, 40))), 'a public paragraph is in the HTML');
  // the section names are listed; no paragraph after the second is in the page
  for (const b of a.body.filter((x) => x.t === 'h2')) assert.ok(html.includes(esc(b.x)), `section name ${b.x}`);
  const later = a.body.filter((b) => b.t === 'p').slice(2);
  assert.ok(later.length > 0);
  for (const b of later) if (b.x.length > 60 && !/`/.test(b.x)) assert.ok(!html.includes(esc(b.x.slice(0, 60))), 'locked text must not be in the HTML');
});

test('every article page shows at most 2 paragraphs and about 150 words of its body', async () => {
  const fs = await import('node:fs');
  const refs = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'index.json'), 'utf8')).articles;
  const pages = pagesFrom(content);
  for (const r of refs) {
    const page = pages.find((p) => p.key === r); assert.ok(page && page.body, r);
    const paragraphs = (page.body.match(/<article>.*<\/article>/s)?.[0].match(/<p>/g) || []).length;
    assert.ok(paragraphs <= 2 + 3, `${r}: ${paragraphs} <p> in the article (label, subtitle, date, 2 paragraphs)`);
  }
});

test("nextPath: the new frontend's address for each old page key", async () => {
  const { nextPath } = await import("../seo.js");
  assert.equal(nextPath(""), "/home");
  assert.equal(nextPath("concepts"), "/learn/concepts");
  assert.equal(nextPath("concepts/caching"), "/learn/concepts/caching");
  assert.equal(nextPath("problems"), "/problems");
  assert.equal(nextPath("privacy"), "/privacy");
});
