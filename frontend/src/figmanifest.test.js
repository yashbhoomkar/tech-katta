// Which module draws each figure (figs-manifest.js), read from the figure modules at build time so the
// dashboard can load only the modules an article needs (figs/index.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { figManifest } from '../figs-manifest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const figs = path.join(here, 'figs'), content = path.resolve(here, '../../content');

test('every figure an article shows is mapped to the module that draws it', () => {
  const map = figManifest(figs);
  const read = (...p) => JSON.parse(fs.readFileSync(path.join(content, ...p), 'utf8'));
  const used = read('articles', 'index.json').articles.flatMap((ref) => read('articles', ref + '.json').body.filter((b) => b.t === 'fig').map((b) => b.id));
  assert.ok(used.length > 200, 'articles use figures');
  for (const id of used) assert.ok(map[id], `${id} is drawn by no module`);
  for (const [id, mod] of Object.entries(map)) {
    assert.ok(fs.existsSync(path.join(figs, mod + '.jsx')), `${id}: ${mod}.jsx exists`);
    assert.ok(fs.readFileSync(path.join(figs, mod + '.jsx'), 'utf8').includes(`\n"${id}":{C:`), `${id} is defined in ${mod}.jsx`);
  }
});

test('a figure defined twice, or a module without FIGS, stops the build', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'figs-'));
  fs.mkdirSync(path.join(dir, 'concepts'));
  const mod = (name, ids) => fs.writeFileSync(path.join(dir, 'concepts', name + '.jsx'), `export const FIGS={\n${ids.map((i) => `"${i}":{C:X,ar:1,title:()=>"T"},`).join('\n')}\n};\n`);
  mod('a', ['one', 'two']); mod('b', ['three']);
  assert.deepEqual(figManifest(dir), { one: 'concepts/a', two: 'concepts/a', three: 'concepts/b' });
  mod('b', ['two']);
  assert.throws(() => figManifest(dir), /figure two is in both concepts\/a and concepts\/b/);
  fs.writeFileSync(path.join(dir, 'concepts', 'b.jsx'), 'export const OTHER=1;\n');
  assert.throws(() => figManifest(dir), /concepts\/b\.jsx must export FIGS/);
  fs.rmSync(dir, { recursive: true });
});
