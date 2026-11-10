import test from 'node:test';
import assert from 'node:assert/strict';
import { routeKey, pathFor, fromLab } from './routes.js';

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

test('a challenge has its own address under Problems', () => {
  assert.equal(pathFor('problems/challenge/one-server'), '/dashboard/problems/challenge/one-server/');
  assert.equal(routeKey(at('/dashboard/problems/challenge/one-server/')), 'problems/challenge/one-server');
});

test('old Lab links open the challenge on Problems, or the problem it became', () => {
  const problems = ['ind-vs-pak', 'url-shortener'];
  assert.equal(fromLab('lab', problems), 'problems');
  assert.equal(fromLab('lab/one-server', problems), 'problems/challenge/one-server');
  assert.equal(fromLab('lab/ind-vs-pak', problems), 'problems/ind-vs-pak');
  assert.equal(fromLab('problems/challenge/ind-vs-pak', problems), 'problems/ind-vs-pak', 'a challenge that became a problem');
  for (const k of ['', 'concepts/caching', 'problems/url-shortener', 'problems/challenge/one-server', 'labs']) assert.equal(fromLab(k, problems), k);
});
