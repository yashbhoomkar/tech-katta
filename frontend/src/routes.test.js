import test from 'node:test';
import assert from 'node:assert/strict';
import { routeKey, pathFor } from './routes.js';

const at = (url) => { const u = new URL(url, 'https://tech.katta.cc'); return { href: u.href, pathname: u.pathname }; };

test('a route key comes from the path, or from the hash when there is one', () => {
  assert.equal(routeKey(at('/dashboard/')), '');
  assert.equal(routeKey(at('/dashboard')), '');
  assert.equal(routeKey(at('/dashboard/concepts/')), 'concepts');
  assert.equal(routeKey(at('/dashboard/concepts/caches/')), 'concepts/caches');
  assert.equal(routeKey(at('/dashboard/concepts/caches')), 'concepts/caches');
  assert.equal(routeKey(at('/dashboard/#concepts/caches')), 'concepts/caches');
  assert.equal(routeKey(at('/dashboard/concepts/caches/#components/redis')), 'components/redis');
  assert.equal(routeKey(at('/dashboard/concepts/caches/#')), '');
  assert.equal(routeKey(at('/dashboard/#lab/url-shortener')), 'lab/url-shortener');
  assert.equal(routeKey(at('/')), '');
  assert.equal(routeKey(at('/dashboard/%E0%A4')), '');
});

test('the path form has a trailing slash and round-trips', () => {
  assert.equal(pathFor(''), '/dashboard/');
  assert.equal(pathFor('concepts'), '/dashboard/concepts/');
  assert.equal(pathFor('concepts/caches'), '/dashboard/concepts/caches/');
  for (const k of ['', 'real-systems', 'interview-questions/url-shortener', 'problems/menu-search']) assert.equal(routeKey(at(pathFor(k))), k);
});
