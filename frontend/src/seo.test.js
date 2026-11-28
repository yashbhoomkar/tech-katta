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

test('an article page holds its public part (2 paragraphs, section names), never the locked text, and Article markup with paywall data', async () => {
  const { publicParagraphs } = await import('../../backend/src/content/public.js');
  const fs = await import('node:fs');
  const a = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'concepts', 'consistent-hashing.json'), 'utf8'));
  const page = pagesFrom(content).find((p) => p.key === 'concepts/consistent-hashing');
  const html = render('<html><head><title>x</title><script type="module" src="/a.js"></script></head><body><div id="root"><p style="x">Loading…</p></div></body></html>', page);
  assert.match(html, /<div id="root"><div class="tk-static"><main>/);
  // hidden while JavaScript runs (site3d/scripts/boot-theme.js adds tk-js), so it never flashes before the app draws
  assert.match(html, /html\.tk-js #root>\.tk-static\{display:none\}/);
  assert.match(html, /<h1>Consistent hashing/);
  // the locked part is named in the page and in the structured data (Google's paywalled-content markup)
  assert.match(html, /<div class="tk-locked">/);
  const art = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph'].find((n) => n['@type'] === 'TechArticle');
  assert.equal(art.isAccessibleForFree, false);
  assert.deepEqual(art.hasPart, { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.tk-locked' });
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
    if (page.free) continue; // the free sample carries its full text (next test)
    const paragraphs = (page.body.match(/<article>.*<\/article>/s)?.[0].replace(/<div class="tk-locked">.*?<\/div>/s, '').match(/<p>/g) || []).length;
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

const SHELL = '<html><head><title>x</title><script type="module" src="/a.js"></script></head><body><div id="root"><p style="x">Loading…</p></div></body></html>';
const free = (fs) => JSON.parse(fs.readFileSync(path.join(content, 'articles', 'index.json'), 'utf8')).articles
  .map((r) => JSON.parse(fs.readFileSync(path.join(content, 'articles', r + '.json'), 'utf8'))).filter((a) => a.access === 'free');

test('the free sample: one article per Learn section and the URL shortener, plus How to answer', async () => {
  const fs = await import('node:fs');
  const keys = free(fs).map((a) => `${a.section}/${a.slug}`).sort();
  assert.deepEqual(keys, ['components/redis', 'concepts/networking-essentials', 'interview-questions/how-to-answer', 'interview-questions/url-shortener', 'real-systems/discord-messages']);
});

test('a free article page holds its full text, down to its last section, and is marked free; a gated page does not hold its last section', async () => {
  const fs = await import('node:fs');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pages = pagesFrom(content);
  for (const a of free(fs)) {
    const page = pages.find((p) => p.key === `${a.section}/${a.slug}`), html = render(SHELL, page);
    const heads = a.body.filter((b) => b.t === 'h2'), last = heads[heads.length - 1];
    assert.ok(html.includes(esc(last.x)), `${a.slug}: its last section heading`);
    const after = a.body.slice(a.body.indexOf(last) + 1).filter((b) => b.t === 'p' && b.x.length > 80 && !/`/.test(b.x)).pop();
    if (after) assert.ok(html.includes(esc(after.x.slice(0, 60))), `${a.slug}: its last paragraph`);
    assert.doesNotMatch(html, /tk-locked/);
    const node = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph'].find((n) => /Article$/.test(n['@type']));
    assert.equal(node.isAccessibleForFree, true); assert.equal(node.hasPart, undefined);
    assert.equal(page.free, true);
  }
  const gated = JSON.parse(fs.readFileSync(path.join(content, 'articles', 'concepts', 'caching.json'), 'utf8'));
  const html = render(SHELL, pages.find((p) => p.key === 'concepts/caching'));
  // its section names are listed (the locked list), the text of its last section is not
  const heads = gated.body.filter((b) => b.t === 'h2'), last = heads[heads.length - 1];
  assert.ok(html.includes(esc(last.x)), 'the last section name is listed');
  const tail = gated.body.filter((b) => b.t === 'p' && b.x.length > 80 && !/`/.test(b.x)).pop();
  assert.ok(gated.body.indexOf(tail) > gated.body.indexOf(last), 'the gated sample has text under its last section');
  assert.ok(!html.includes(esc(tail.x.slice(0, 60))), 'a gated page must not carry its last section text');
});

test('the sitemap lists the free pages first, each with a lastmod; every page has its own title, description and canonical address', async () => {
  const fs = await import('node:fs');
  const pages = pagesFrom(content), xml = sitemap(pages.map((p) => ({ key: p.key, date: p.date, free: p.free })));
  const locs = [...xml.matchAll(/<url><loc>([^<]*)<\/loc>(<lastmod>[^<]*<\/lastmod>)?/g)];
  const nFree = free(fs).length;
  assert.equal(locs[0][1], 'https://tech.katta.cc/');
  for (let i = 1; i <= nFree; i += 1) assert.ok(locs[i][2], `free page ${locs[i][1]} has a lastmod`);
  assert.deepEqual(locs.slice(1, nFree + 1).map((m) => m[1]).sort(), free(fs).map((a) => `https://tech.katta.cc/dashboard/${a.section}/${a.slug}/`).sort());
  const withBody = pages.filter((p) => p.body);
  for (const field of ['title', 'description']) assert.equal(new Set(withBody.map((p) => p[field])).size, withBody.length, `${field}s are unique`);
  const urls = withBody.map((p) => /<link rel="canonical" href="([^"]*)"/.exec(render(SHELL, p))[1]);
  assert.equal(new Set(urls).size, urls.length, 'canonicals are unique');
});
