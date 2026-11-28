import test from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, isoWeeksIn, weeklyIncident } from '../scripts/weekly.js';
import { nextCard } from '../scripts/pages/drills.js';
import { INCIDENTS } from '../scripts/sim.js';

const d = (s) => new Date(`${s}T12:00:00Z`);

test('ISO weeks: Monday starts the week, and the Thursday decides the year', () => {
  assert.deepEqual(isoWeek(d('2026-11-28')), { year: 2026, week: 48 });
  assert.deepEqual(isoWeek(d('2026-11-30')), { year: 2026, week: 49 }); // a Monday
  assert.deepEqual(isoWeek(d('2026-11-29')), { year: 2026, week: 48 }); // the Sunday before
  assert.deepEqual(isoWeek(d('2027-01-01')), { year: 2026, week: 53 }); // a Friday: still 2026's last week
  assert.deepEqual(isoWeek(d('2027-01-04')), { year: 2027, week: 1 });
  assert.deepEqual(isoWeek(d('2025-12-29')), { year: 2026, week: 1 });
  assert.equal(isoWeeksIn(2026), 53); assert.equal(isoWeeksIn(2027), 52);
});

test("this week's incident: the same all week, the next one on Monday, every incident in turn, nothing stored", () => {
  const pick = (s) => weeklyIncident(d(s)).incident.id;
  assert.equal(pick('2026-11-30'), pick('2026-12-06'), 'Monday to Sunday');
  assert.notEqual(pick('2026-12-06'), pick('2026-12-07'), 'a new one on Monday');
  const seen = new Set(); for (let w = 0; w < INCIDENTS.length; w += 1) seen.add(pick(new Date(Date.UTC(2026, 11, 7 + 7 * w, 12)).toISOString().slice(0, 10)));
  assert.equal(seen.size, INCIDENTS.length, 'every Warm-up comes round');
  assert.equal(pick('2027-01-01'), pick('2026-12-28'), 'the week that crosses the new year is one week');
  assert.equal(weeklyIncident(d('2026-11-28')).week, 48);
});

test('drills: the next card is the first one not seen yet, wrapping round', () => {
  const ds = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  assert.equal(nextCard(ds, [], -1), 0);
  assert.equal(nextCard(ds, ['a', 'b'], -1), 2);
  assert.equal(nextCard(ds, ['a', 'c'], 1), 3);
  assert.equal(nextCard(ds, ['b', 'c', 'd'], 3), 0);
  assert.equal(nextCard(ds, ['a', 'b', 'c', 'd'], 0), null);
});
