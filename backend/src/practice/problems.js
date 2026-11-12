// The practice problems of a content release (content/problems2/, spec section 9): read, checked and calibrated when
// the content loads, so an invalid or miscalibrated problem never goes live (the deploy runs check-content.mjs).
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { problemShape, calibration } from '../../../frontend/src/tkd/problem.js';

const FILE = /^\d{3}-[a-z0-9][a-z0-9-]*$/;

// [] when the release has no problems2/ folder.
export async function loadProblems(dir) {
  const folder = path.join(dir, 'problems2'), indexFile = path.join(folder, 'index.json');
  if (!existsSync(indexFile)) return { problems: [], errors: [] };
  const errors = [], problems = [];
  let index;
  try { index = JSON.parse(await readFile(indexFile, 'utf8')); } catch (e) { return { problems: [], errors: [`problems2/index.json: ${e.message}`] }; }
  if (!Array.isArray(index?.problems)) return { problems: [], errors: ['problems2/index.json: "problems" must be a list'] };
  for (const [i, entry] of index.problems.entries()) {
    if (typeof entry !== 'string' || !FILE.test(entry)) { errors.push(`problems2/index.json: bad entry ${entry}`); continue; }
    let p;
    try { p = JSON.parse(await readFile(path.join(folder, `${entry}.json`), 'utf8')); } catch (e) { errors.push(`problems2/${entry}.json: ${e.message}`); continue; }
    const shape = problemShape(p);
    if (shape.length) { errors.push(...shape); continue; }
    if (entry !== `${String(p.id).padStart(3, '0')}-${p.slug}` || p.id !== i + 1) errors.push(`problems2/${entry}.json: file name must be ${String(i + 1).padStart(3, '0')}-${p.slug}, with id ${i + 1}`);
    errors.push(...calibration(p));
    problems.push(p);
  }
  return { problems, errors };
}
