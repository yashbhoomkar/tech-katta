// Every message the engine writes, exactly as the spec words them (sections 5.1, 7.9, 22.4, 22.6, 22.9, 22.12).
// msg(code, vars) fills {name}-style holes; an unknown hole stays visible rather than silently empty.
export const MESSAGES = {
  E001: 'The design is too long (limit 200 lines, 8,000 characters).',
  E002: "I can't read this line. A line is a part (name = kind(...)), a table, or a route (read/write NAME: client > ...).",
  E003: '"{name}" is already declared on line {n}.',
  E004: '"{name}" is not a valid name. Use lower-case letters, digits and _ (start with a letter, at most 24 characters).',
  E005: '"client" is built in. You don\'t declare it.',
  E010: '"{kind}" is not a part. Parts: lb, cdn, server, worker, cache, sql, nosql, queue, objectstore, idgen.',
  E011: '{kind} has no setting "{arg}". Its settings: {list}.',
  E012: '{arg} must be {rule}. You wrote {value}.',
  E020: '"{name}" is used here but never declared.',
  E021: 'This problem has no request called {REQUEST}. Its requests: {list}.',
  E022: 'There is no route for {REQUEST}. Add: {mode} {REQUEST}: client > ...',
  E023: '{REQUEST} is a {mode} in this problem, but the route says {other}.',
  E024: '{REQUEST} already has a route on line {n}.',
  E025: 'A route starts with: client > ...',
  E026: '"|" means "on a miss, ask the next part". The part before it must be a cache or cdn; "{name}" is a {kind}.',
  E027: '"~>" hands work over without waiting. The part after it must be a queue; "{name}" is a {kind}.',
  E028: 'After a queue the next part must be a worker.',
  E029: '{REQUEST} never reaches a place where the data lives (sql, nosql or objectstore).',
  E030: '{REQUEST} is never saved: its route does not reach sql, nosql or objectstore.',
  E031: '"{name}" appears twice in this route.',
  E032: 'An idgen goes in a write route, after a server or worker and before the store.',
  E033: '[replica] needs a sql part with replicas >= 1.',
  E034: '"then invalidate" or "then update" goes at the end of a write route and names a cache (invalidate may also name a cdn).',
  E035: "{REQUEST} can't be served from a CDN in this problem.",
  E040: 'A table lives in a sql or nosql part; "{name}" is a {kind}.',
  E041: 'A table needs exactly one pk column.',
  E042: '"{col}" is not a column of {table}.',
  E043: '{REQUEST} reads table "{table}", but "{part}" has no such table. Add: table {part}.{table}(...)',
  W001: '"{name}" is declared but no route uses it. It still costs money.',
  W002: 'Calls reach only one of your {count} "{name}" servers: there is no lb in front.',
  W003: '"{name}" has no spare. If it fails, {requests} stop.',
  // explanations under a verdict (7.9, 22.4, 22.6)
  stale: '{request} can return data up to {stale_s} s old, but this problem allows {max} s. Look at the cache TTL, or invalidate on write.',
  ryw: 'After a write, {request} must show the new data at once. Yours reads from {part}, which can be behind.',
  no_id: '{request} creates items but nothing in its route makes their ids. Add an idgen.',
  collision: 'With {n} items, {bits}-bit {kind} ids are expected to collide. Use more bits, or a counter.',
  lost: 'When {part} failed, about {n} acknowledged writes were lost. They were only on the primary.',
  unavailable: '{request} was available {actual} of the time; the promise is {expected}. {part} had no spare when it failed.',
  overloaded: '{part} received {load} calls a second but can serve {cap}.',
  p99: '{request} took {actual} at the 99th percentile; the promise is {expected}. Slowest hop: {part} at {rho} of capacity.',
  p50: '{request} took {actual} for the median request; the promise is {expected}.',
  backlog: '{request} was still waiting {delay} after it was accepted; the promise is {n}. {part} can do {cap} a second but {arrive} arrive.',
  budget: 'This design costs ₹{cost} a month; the budget is ₹{budget}.',
  judge_error: 'The judge had a problem with this design. It has been reported; try again later.',
  no_tip: 'There is more than one thing to fix here.',
};
export function msg(code, vars = {}) {
  const t = MESSAGES[code];
  if (!t) return code;
  return t.replace(/\{([A-Za-z_]+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}
