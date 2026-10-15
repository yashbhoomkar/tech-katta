import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getVideoEmbedUrl } from '../src/videoEmbed.js';

test('normalizes exact YouTube hosts to privacy-enhanced embeds', () => {
  assert.equal(
    getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
  assert.equal(
    getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
});

test('rejects insecure, malformed, and lookalike video hosts', () => {
  assert.equal(getVideoEmbedUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(getVideoEmbedUrl('https://youtube.com.attacker.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(getVideoEmbedUrl('https://evil-youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(getVideoEmbedUrl('https://www.youtube.com/watch?v=short'), null);
  assert.equal(getVideoEmbedUrl('javascript:alert(1)'), null);
});

test('normalizes Vimeo URLs only for exact Vimeo hosts and numeric IDs', () => {
  assert.equal(getVideoEmbedUrl('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789');
  assert.equal(getVideoEmbedUrl('https://player.vimeo.com/video/123456789'), 'https://player.vimeo.com/video/123456789');
  assert.equal(getVideoEmbedUrl('https://vimeo.com.evil.example/123456789'), null);
  assert.equal(getVideoEmbedUrl('https://vimeo.com/not-a-number'), null);
});
