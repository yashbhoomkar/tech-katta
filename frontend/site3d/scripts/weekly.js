// "This week's incident": one of the Warm-ups (the simulator's incidents), a new one each ISO week, the same for everyone and with no server state.
import { INCIDENTS } from './sim.js';

/** the ISO 8601 year and week of a date (weeks start on Monday; week 1 holds the year's first Thursday), by the date's UTC calendar day */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // the Thursday of this week decides the year
  const year = d.getUTCFullYear(), week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { year, week };
}

/** the incident for this date: weeks are counted from the ISO week 1 of 2026, so the choice depends on the date alone */
export function weeklyIncident(date = new Date(), list = INCIDENTS) {
  const { year, week } = isoWeek(date);
  let n = week - 1;
  for (let y = 2026; y < year; y += 1) n += isoWeeksIn(y);
  const i = ((n % list.length) + list.length) % list.length;
  return { incident: list[i], year, week };
}
/** how many ISO weeks a year has: 53 when it starts on a Thursday, or on a Wednesday in a leap year, else 52 */
export function isoWeeksIn(year) { return isoWeek(new Date(Date.UTC(year, 11, 28))).week; }
