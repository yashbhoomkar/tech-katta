import test from 'node:test';
import assert from 'node:assert/strict';
import { speakOutline, mmss, pickMime, SPEAK_MAX } from './speak.js';

test('the outline uses the problem\'s own estimates and fits two minutes', () => {
  const o = speakOutline({ rubric: { est: [{ label: 'New links a second' }, { label: 'Redirects a second at peak' }, { label: 'x' }] } });
  assert.match(o[1][1], /new links a second and redirects a second at peak/);
  assert.equal(o.reduce((a, [t]) => a + parseInt(t, 10), 0), SPEAK_MAX);
  assert.match(speakOutline(null)[1][1], /requests a second/);
});

test('time and format helpers', () => {
  assert.equal(mmss(0), '0:00'); assert.equal(mmss(75.4), '1:15'); assert.equal(mmss(120), '2:00');
  assert.equal(pickMime((m) => m === 'audio/mp4'), 'audio/mp4');
  assert.equal(pickMime(() => false), '');
  assert.equal(pickMime(undefined), '');
});
