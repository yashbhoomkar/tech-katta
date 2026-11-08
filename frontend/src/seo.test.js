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
  assert.ok(keys.includes('components/caches'));
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
  const list = refs.map((r) => { const { body, ...rest } = JSON.parse(fs.readFileSync(path.join(content, 'articles', r + '.json'), 'utf8')); return rest; });
  assert.deepEqual(pagesOf(site, list), pagesFrom(content));
});
