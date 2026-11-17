// The answer key of the AI evaluator, written by hand (2026-11-16) after reading every design, its difference from the
// reference and everything the judge reports about it. It replaces the generated truth as the marking of a review:
// ground-truth.json is generated from the judge's own findings, so it could only check that a review cites the judge,
// not that the review is right. This key says, per design:
//   fault       what is wrong, in plain words (a person's reading, not the judge's)
//   parts       the parts at fault
//   lead        fact ids that state the fault; a correct review cites one of them in its first two items
//   fix         what a correct next step points to (regex over the review's next step and items); any one is enough
//   wrong       advice that would be wrong for this design: a review whose advice matches it and not `fix` is wrong
//   needs       for designs with two faults: the second fault's facts, which must appear somewhere in the review
//   flag        a problem with the content itself, for the owner
// Each fact id is checked against the evidence pack the model is sent (test/ai-evals.test.js), so the key cannot name
// a fact the model never saw. The model may not type digits outside slots, so `fix` and `wrong` match words.

// What correct advice says, in the words a model would use
const A = {
  moreServers: /\b(more|add(ing)?|extra|additional|larger|bigger)\b[^.]{0,40}\b(servers?|api|instances|app tier)|scal(e|ing) (out|up)\b[^.]{0,20}\b(api|servers?|app)|\bapi\b[^.]{0,30}\b(more|larger|bigger|capacity)/i,
  cache: /\bcache|caching/i,
  biggerCache: /(larger|bigger|more|add(ing)?|increase|grow)\b[^.]{0,30}\b(cache|memory)|cache\b[^.]{0,30}\b(memory|size|larger|bigger|hold)/i,
  cdn: /\bcdn\b|content delivery|\bedge\b/i,
  replica: /replica|standby|second copy|failover|fail over|copy of the database/i,
  sync: /\bsync\b|synchronous|wait(s|ing)? for the replica|confirm(ed|s)?\b[^.]{0,30}\breplica|before acknowledg/i,
  ids: /counter|snowflake|more bits|longer (ids|codes)|sequence|unique|sequential/i,
  invalidate: /invalidat|clear(ing)? the cache|evict|delete[^.]{0,20}cache|update[^.]{0,20}cache|on (every )?write/i,
  shorterTtl: /(shorter|lower|reduce|cut|smaller)\b[^.]{0,30}\b(ttl|time to live|expiry|cache time)|\bttl\b|time to live/i,
  longerTtl: /(longer|raise|increase|higher)\b[^.]{0,30}\b(ttl|time to live|expiry)|\bttl\b/i,
  index: /\bindex/i,
  queue: /\bqueue/i,
  workers: /\bworkers?\b/i,
  biggerDb: /(larger|bigger|stronger|upgrade|more powerful|size up)\b[^.]{0,30}\b(database|primary|db|sql)|\b(database|primary|db)\b[^.]{0,30}\b(larger|bigger|upgrade|size)/i,
  partitioned: /nosql|key[- ]value|\bkv\b|partition|shard|distributed (store|database)|spread[^.]{0,30}(nodes|writes)/i,
  quorum: /quorum|majority|overlap|r ?\+ ?w|more than (the )?(replication|copies)|two (copies|of the three|nodes)|read and write (sets|counts)/i,
  fewerWrites: /\b(lower|reduce|fewer|smaller)\b[^.]{0,30}\b(write|w\b|copies)|not (all|every) cop|any (two|majority)/i,
  smaller: /\b(smaller|fewer|cut|reduce|downsize|shrink|trim|drop|remove|medium|less)\b/i,
  primaryReads: /\bprimary\b|read[^.]{0,30}(write|same) (database|copy)|read your (own )?writes/i,
  readReplicas: /read replica|replicas?\b[^.]{0,30}\b(reads?|serve)|reads?\b[^.]{0,30}\breplica/i,
  route: /route|path|reach|connect|save|store|database|objectstore|nosql|sql/i,
};

const CASES = [
  // ───────────── url-shortener (2,500 opens a second at the peak, 100 ms p99, ₹1,00,000)
  { id: 'url-shortener/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'url-shortener/no-cache-one-server', fault: 'One small server takes every open: it gets 2,525 calls a second and can serve 500. With no cache, the database is also near its limit at the peak.', parts: ['api'], lead: ['finding:overloaded:GET_LINK:api', 'finding:p99:GET_LINK:none', 'load:api'], fix: A.moreServers },
  { id: 'url-shortener/no-cache', fault: 'With no cache every open reads the database, which runs at 86 % at the peak and makes the slowest opens too slow.', parts: ['db'], lead: ['finding:p99:GET_LINK:db', 'load:db'], fix: A.cache, wrong: A.moreServers },
  { id: 'url-shortener/async-replica', fault: 'The replica copies writes after acknowledging them; when the primary dies, the newest links are lost.', parts: ['db'], lead: ['finding:lost:CREATE_LINK:db'], fix: A.sync },
  { id: 'url-shortener/no-replica', fault: 'The database has no replica: when it dies, nothing takes over and opens fail.', parts: ['db'], lead: ['finding:unavailable:GET_LINK:db', 'static:W003:db'], fix: A.replica },
  { id: 'url-shortener/random-32-bit-ids', fault: 'Random 32-bit codes repeat over 10 crore links.', parts: ['ids'], lead: ['finding:collision:CREATE_LINK:ids'], fix: A.ids, wrong: A.cache },
  { id: 'url-shortener/day-long-cache-no-invalidate', fault: 'The cache keeps a link for a day and is not cleared on write, so an edited link stays wrong for up to a day.', parts: ['cache'], lead: ['finding:stale:GET_LINK:cache'], fix: [A.invalidate, A.shorterTtl], wrong: A.biggerCache },
  { id: 'url-shortener/everything-large', fault: 'Large servers and a large database: everything passes, at ₹1,43,000 against ₹1,00,000. The database is 63 % of the bill, the servers 34 %.', parts: ['db', 'api'], lead: ['finding:budget:all:db', 'cost:total', 'cost:db', 'cost:api'], fix: A.smaller },

  // ───────────── paste-bin (4,500 opens a second, 80 ms p99, ₹1,50,000)
  { id: 'paste-bin/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'paste-bin/small-cache', fault: 'The cache (2 GB in all) holds only a fraction of the hot pastes, so many opens miss and the database becomes the slowest hop.', parts: ['cache', 'db'], lead: ['finding:p99:GET_PASTE:db'], fix: A.biggerCache, wrong: A.moreServers },
  { id: 'paste-bin/no-cache-small-servers', fault: 'Two medium servers serve 2,000 calls a second against 4,530, and with no cache the database is over capacity too (153 %).', parts: ['api', 'db'], lead: ['finding:overloaded:GET_PASTE:api', 'finding:p99:GET_PASTE:none', 'load:api'], needs: ['load:db'], fix: [A.moreServers, A.cache] },
  { id: 'paste-bin/no-replica', fault: 'The database has no replica: when it dies, nothing takes over.', parts: ['db'], lead: ['finding:unavailable:GET_PASTE:db', 'static:W003:db'], fix: A.replica },
  { id: 'paste-bin/async-replica', fault: 'The replica copies writes after acknowledging them; a failover loses the newest pastes.', parts: ['db'], lead: ['finding:lost:CREATE_PASTE:db'], fix: A.sync },
  { id: 'paste-bin/random-32-bit-ids', fault: 'Random 32-bit ids repeat over 5 crore pastes.', parts: ['ids'], lead: ['finding:collision:CREATE_PASTE:ids'], fix: A.ids },
  { id: 'paste-bin/huge-cache', fault: 'A 64 GB cache passes every test but costs more than the budget allows.', parts: ['cache'], lead: ['finding:budget:all:cache', 'cost:total', 'cost:cache'], fix: A.smaller },

  // ───────────── rate-limiter (10,000 checks a second, every check a write, 100 ms p99, ₹1,60,000)
  { id: 'rate-limiter/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'rate-limiter/sql-counters', fault: 'Every check is a write, 10,050 a second, and one SQL primary takes about 2,500. Replicas add no write capacity.', parts: ['db'], lead: ['finding:overloaded:CHECK:db', 'finding:p99:CHECK:none', 'load:db'], fix: A.partitioned, wrong: [A.readReplicas, A.cache] },
  { id: 'rate-limiter/write-to-all-copies', fault: 'Each write waits for all three copies (w equals the replication factor), so one dead node stops every check.', parts: ['kv'], lead: ['finding:unavailable:CHECK:kv'], fix: [A.fewerWrites, A.quorum], wrong: A.moreServers },
  { id: 'rate-limiter/too-few-servers', fault: 'Four large servers serve 8,000 checks a second; the peak sends 10,050.', parts: ['api'], lead: ['finding:overloaded:CHECK:api', 'finding:p99:CHECK:none', 'load:api'], fix: A.moreServers },
  { id: 'rate-limiter/three-nodes', fault: 'Six servers run at 84 % at the peak and the slowest checks wait past 100 ms.', parts: ['api'], lead: ['finding:p99:CHECK:api', 'load:api'], fix: A.moreServers },
  { id: 'rate-limiter/huge-cluster', fault: 'Twelve servers and twelve storage nodes pass every test at ₹2,66,000 against ₹1,60,000.', parts: ['api', 'kv'], lead: ['finding:budget:all:api', 'cost:total', 'cost:api', 'cost:kv'], fix: A.smaller },

  // ───────────── news-feed (8,000 opens and 800 posts a second, p50 14 ms, p99 120 ms, ₹1,75,000)
  { id: 'news-feed/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'news-feed/short-ttl-no-invalidate', fault: 'A 30-second TTL means few feeds are still cached when asked for again, so most opens miss and the median open is too slow. A longer TTL with invalidation on post keeps feeds both fresh and cached.', parts: ['cache'], lead: ['finding:p50:GET_FEED:api'], fix: [A.longerTtl, A.invalidate], wrong: A.moreServers },
  { id: 'news-feed/long-ttl-no-invalidate', fault: 'The cache keeps a feed for an hour and is not cleared when someone posts; the problem allows 30 seconds.', parts: ['cache'], lead: ['finding:stale:GET_FEED:cache'], fix: [A.invalidate, A.shorterTtl], wrong: A.biggerCache },
  { id: 'news-feed/sql-feeds', fault: 'Feeds on one SQL primary: 800 posts a second plus the cache misses are more than it can take (132 %).', parts: ['db'], lead: ['finding:overloaded:GET_FEED:db', 'finding:p99:GET_FEED:none', 'load:db'], fix: [A.partitioned, A.biggerDb] },
  { id: 'news-feed/quick-writes', fault: 'Two faults: w=1 acknowledges a post on one copy, so a dead node loses it; and r=3 needs every copy, so reads fail when a node dies.', parts: ['kv'], lead: ['finding:lost:POST:kv', 'finding:unavailable:GET_FEED:none'], needs: ['finding:lost:POST:kv', 'finding:unavailable:GET_FEED:none'], fix: A.quorum },
  { id: 'news-feed/big-everything', fault: 'Twelve servers and a 128 GB cache pass every test at ₹3,68,000 against ₹1,75,000.', parts: ['cache', 'api'], lead: ['finding:budget:all:cache', 'cost:total', 'cost:cache', 'cost:api'], fix: A.smaller },

  // ───────────── notification-sender (spikes of 5,000 sends a second, delivered within 3 minutes, ₹1,75,000)
  { id: 'notification-sender/reference', fault: null, lead: ['margin:tightest', 'load:worker', 'load:db'] },
  { id: 'notification-sender/no-queue', fault: 'Without a queue, the spike of 5,000 writes a second hits the database directly; it takes 2,500.', parts: ['db'], lead: ['finding:overloaded:SEND:db', 'load:db'], fix: A.queue },
  { id: 'notification-sender/one-small-worker', fault: 'One small worker clears 500 a second, the normal rate, so the spike\'s backlog never drains in time.', parts: ['worker'], lead: ['finding:backlog:SEND:worker', 'load:worker'], fix: A.workers },
  { id: 'notification-sender/async-replica', fault: 'The replica copies writes after acknowledging them; a failover during a spike loses notifications.', parts: ['db'], lead: ['finding:lost:SEND:db'], fix: A.sync },
  { id: 'notification-sender/too-few-servers', fault: 'Two large servers take 4,000 sends a second in front of the queue; the spike sends 5,000.', parts: ['api'], lead: ['finding:overloaded:SEND:api', 'load:api'], fix: A.moreServers },
  { id: 'notification-sender/many-workers', fault: 'Twelve large workers clear the spike at once, at ₹2,88,000 against ₹1,75,000; the 3-minute promise allows far fewer.', parts: ['worker'], lead: ['finding:budget:all:worker', 'cost:total', 'cost:worker'], fix: A.smaller },

  // ───────────── image-serving (60,000 views a second, median 10 ms, ₹60,000)
  { id: 'image-serving/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'image-serving/no-cdn', fault: 'With no CDN, all 60,000 views a second go through the load balancer (120 %) and the servers (1,501 %). Only a CDN in front can take that, within budget.', parts: ['api', 'lb'], lead: ['finding:overloaded:GET_IMAGE:api', 'finding:p99:GET_IMAGE:none', 'finding:p50:GET_IMAGE:none', 'load:api', 'load:lb'], fix: A.cdn, wrong: A.moreServers },
  { id: 'image-serving/cache-behind-servers', fault: 'The cache sits behind the servers, so every view still passes the load balancer and the servers. The images need a CDN in front.', parts: ['api', 'lb', 'cache'], lead: ['finding:overloaded:GET_IMAGE:api', 'finding:p99:GET_IMAGE:none', 'finding:p50:GET_IMAGE:none', 'load:api', 'load:lb', 'load:cache'], fix: A.cdn, wrong: [A.biggerCache, A.moreServers] },
  { id: 'image-serving/one-server', fault: 'The CDN misses 5 % of views, about 3,000 a second, and one medium server serves 1,000.', parts: ['api'], lead: ['finding:overloaded:GET_IMAGE:api', 'finding:p99:GET_IMAGE:none', 'load:api'], fix: A.moreServers },
  { id: 'image-serving/random-32-bit-ids', fault: 'Random 32-bit names repeat over 20 crore images.', parts: ['ids'], lead: ['finding:collision:UPLOAD_IMAGE:ids'], fix: A.ids },
  { id: 'image-serving/many-servers', fault: 'Forty servers do what the CDN already does, at ₹2,47,000 against ₹60,000.', parts: ['api'], lead: ['finding:budget:all:api', 'cost:total', 'cost:api'], fix: A.smaller },

  // ───────────── leaderboard (6,000 reads and 1,200 submits a second, scores at most 5 s old, ₹1,90,000)
  { id: 'leaderboard/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'leaderboard/no-index', fault: 'The top list is looked up by game_id, which has no index: the database is nearly idle (13 %) but every miss scans the table. More capacity does not help; an index does.', parts: ['db'], lead: ['finding:p99:GET_TOP:db'], fix: A.index, wrong: [A.biggerDb, A.moreServers, A.readReplicas] },
  { id: 'leaderboard/minute-ttl', fault: 'The cache keeps a top list for a minute; the problem allows 5 seconds.', parts: ['cache'], lead: ['finding:stale:GET_TOP:cache'], fix: [A.shorterTtl, A.invalidate], wrong: A.biggerCache },
  { id: 'leaderboard/medium-db', fault: 'A medium primary takes about 1,050 calls a second; the match sends 1,260.', parts: ['db'], lead: ['finding:overloaded:GET_TOP:db', 'load:db'], fix: A.biggerDb },
  { id: 'leaderboard/no-cache', fault: 'With no cache every top-list read goes to the primary, which is already busy with score writes.', parts: ['db'], lead: ['finding:overloaded:GET_TOP:db', 'finding:p99:GET_TOP:none', 'load:db'], fix: [A.cache, A.readReplicas], wrong: A.moreServers },
  { id: 'leaderboard/big-everything', fault: 'Twelve servers and three replicas pass every test at ₹3,29,000 against ₹1,90,000.', parts: ['db', 'api'], lead: ['finding:budget:all:db', 'cost:total', 'cost:db', 'cost:api'], fix: A.smaller },

  // ───────────── ticket-booking (8,000 seat reads and 1,200 bookings a second, read-your-writes, ₹2,00,000)
  { id: 'ticket-booking/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'ticket-booking/cache-not-cleared', fault: 'Booking does not clear the cached seat map, so a booked seat can show as free for up to a minute.', parts: ['cache'], lead: ['finding:ryw:GET_SEATS:cache'], fix: A.invalidate, wrong: A.biggerCache },
  { id: 'ticket-booking/replica-reads', fault: 'Seat maps are read from an async replica that is behind the primary, so a seat just booked can show as free.', parts: ['db'], lead: ['finding:ryw:GET_SEATS:db'], fix: [A.primaryReads, A.sync] },
  { id: 'ticket-booking/async-replica', fault: 'The replica copies bookings after acknowledging them; a failover loses confirmed bookings.', parts: ['db'], lead: ['finding:lost:BOOK:db'], fix: A.sync },
  { id: 'ticket-booking/medium-db', fault: 'A medium primary is over capacity (160 %) at 10 am.', parts: ['db'], lead: ['finding:overloaded:GET_SEATS:db', 'finding:p99:GET_SEATS:none', 'finding:p99:BOOK:none', 'load:db'], fix: A.biggerDb },
  { id: 'ticket-booking/random-ids', fault: 'Random 32-bit booking ids repeat over 50 crore bookings.', parts: ['ids'], lead: ['finding:collision:BOOK:ids'], fix: A.ids },
  { id: 'ticket-booking/big-everything', fault: 'Twelve servers and three replicas pass every test at ₹3,29,000 against ₹2,00,000.', parts: ['db', 'api'], lead: ['finding:budget:all:db', 'cost:total', 'cost:db', 'cost:api'], fix: A.smaller },

  // ───────────── chat-message-store (10,000 reads and 5,000 sends a second, read-your-writes, ₹2,25,000)
  { id: 'chat-message-store/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'chat-message-store/one-copy-each-way', fault: 'r=1 and w=1 with three copies: a read can miss the copy that has your new message. Reads and writes must overlap (r + w more than the copies).', parts: ['kv'], lead: ['finding:ryw:GET_MESSAGES:kv'], fix: A.quorum },
  { id: 'chat-message-store/write-all-read-one', fault: 'w=3 needs every copy for a send, so when one node dies messages cannot be sent.', parts: ['kv'], lead: ['finding:unavailable:GET_MESSAGES:kv', 'finding:unavailable:SEND_MESSAGE:none'], fix: [A.quorum, A.fewerWrites] },
  { id: 'chat-message-store/write-one-read-all', fault: 'Two faults: w=1 acknowledges a message on one copy, so a dead node loses it; r=3 needs every copy, so reads fail when a node dies.', parts: ['kv'], lead: ['finding:lost:SEND_MESSAGE:kv', 'finding:unavailable:GET_MESSAGES:none'], needs: ['finding:lost:SEND_MESSAGE:kv', 'finding:unavailable:GET_MESSAGES:none'], fix: A.quorum },
  { id: 'chat-message-store/sql-messages', fault: 'Messages on one SQL primary: the reads and 5,000 writes a second are three times what it can take.', parts: ['db'], lead: ['finding:overloaded:GET_MESSAGES:db', 'finding:p99:GET_MESSAGES:none', 'finding:p99:SEND_MESSAGE:none', 'load:db'], fix: A.partitioned, wrong: A.readReplicas },
  { id: 'chat-message-store/random-ids', fault: 'Random 32-bit message ids repeat over 500 crore messages.', parts: ['ids'], lead: ['finding:collision:SEND_MESSAGE:ids'], fix: A.ids },
  { id: 'chat-message-store/big-cluster', fault: 'Twenty storage nodes pass every test at ₹3,22,000 against ₹2,25,000.', parts: ['kv'], lead: ['finding:budget:all:kv', 'cost:total', 'cost:kv'], fix: A.smaller },

  // ───────────── ind-vs-pak-live-score (2 lakh reads a second, a score at most 5 s old, ₹2,60,000)
  { id: 'ind-vs-pak-live-score/reference', fault: null, lead: ['margin:tightest'] },
  { id: 'ind-vs-pak-live-score/no-cdn', fault: 'With no CDN, the score reads go straight to the servers, which are over capacity (143 %). Only a CDN in front can take 2 lakh reads a second within budget.', parts: ['api'], lead: ['finding:overloaded:GET_SCORE:api', 'finding:p99:GET_SCORE:none', 'load:api'], fix: A.cdn, wrong: A.moreServers },
  { id: 'ind-vs-pak-live-score/cdn-minute-ttl', fault: 'The CDN keeps a score for a minute; the problem allows 5 seconds.', parts: ['cdn'], lead: ['finding:stale:GET_SCORE:cdn'], fix: A.shorterTtl },
  { id: 'ind-vs-pak-live-score/thin-origin', fault: 'The CDN misses 5 % of reads, about 10,000 a second, and four large servers serve 8,000.', parts: ['api'], lead: ['finding:overloaded:GET_SCORE:api', 'finding:p99:GET_SCORE:none', 'load:api'], fix: A.moreServers },
  { id: 'ind-vs-pak-live-score/primary-only', fault: 'When the cache restarts, every origin read lands on one primary with no read replicas, and it cannot serve them. Read replicas (or keeping the reads off the primary) fix it.', parts: ['db'], lead: ['finding:unavailable:GET_SCORE:db'], fix: A.readReplicas },
  { id: 'ind-vs-pak-live-score/big-origin', fault: 'Twenty servers pass every test at ₹3,83,000 against ₹2,60,000; the CDN already takes most reads.', parts: ['api'], lead: ['finding:budget:all:api', 'cost:total', 'cost:api'], fix: A.smaller },
];

// Templates: the starting design cannot be judged; a correct review points to the routes that reach no store.
for (const slug of ['url-shortener', 'paste-bin', 'rate-limiter', 'news-feed', 'notification-sender', 'image-serving', 'leaderboard', 'ticket-booking', 'chat-message-store', 'ind-vs-pak-live-score']) {
  CASES.push({ id: `${slug}/template`, fault: 'The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet.', parts: [], lead: 'errors', fix: A.route });
}

export const ANSWER_KEY_VERSION = 1;
export const ANSWER_KEY = new Map(CASES.map((c) => [c.id, c]));
export const FIX = A;

// The key in plain words, for a person to check: node ai-evals/answer-key.mjs writes answer-key.md
const ADVICE = {
  moreServers: 'more or larger servers', cache: 'a cache', biggerCache: 'a larger cache', cdn: 'a CDN', replica: 'a replica',
  sync: 'synchronous replication (wait for the replica)', ids: 'a counter, Snowflake ids or more bits', invalidate: 'clearing the cache on write',
  shorterTtl: 'a shorter TTL', longerTtl: 'a longer TTL', index: 'an index', queue: 'a queue', workers: 'more or larger workers',
  biggerDb: 'a larger database', partitioned: 'a partitioned key-value store', quorum: 'overlapping read and write quorums',
  fewerWrites: 'fewer copies per write', smaller: 'smaller or fewer parts', primaryReads: 'reading from the primary',
  readReplicas: 'read replicas', route: 'routing each request to where its data lives',
};
const named = (x) => (x ? (Array.isArray(x) ? x : [x]).map((re) => ADVICE[Object.keys(A).find((k) => A[k] === re)] || String(re)).join(' or ') : '');
export function answerKeySheet() {
  const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const out = [
    '# The answer key, in plain words',
    '',
    'Generated from answer-key.mjs (`node ai-evals/answer-key.mjs`), which marks every AI review in the bake-off. Written by',
    'hand on 2026-11-16 after reading each design and everything the judge reports about it. Please check each row:',
    'is the fault right, is the fix what a good interviewer would say, is the "wrong advice" really wrong? Rows marked',
    '**Content issue** need a decision about the problem itself.',
  ];
  let problem = '';
  for (const c of CASES) {
    const slug = c.id.split('/')[0];
    if (slug !== problem) {
      problem = slug;
      out.push('', `## ${slug}`, '', '| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |', '|---|---|---|---|---|');
    }
    const lead = c.lead === 'errors' ? 'the errors the judge reports' : c.lead.join(', ') + (c.needs ? ` (and must mention ${c.needs.join(' and ')})` : '');
    out.push(`| ${esc(c.id.split('/')[1])} | ${esc(c.fault ?? 'Passes every test. The review should say where it would break first.')}${c.flag ? ` **Content issue:** ${esc(c.flag)}` : ''} | ${esc(lead)} | ${esc(named(c.fix) || '-')} | ${esc(named(c.wrong) || '-')} |`);
  }
  return `${out.join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(new URL('./answer-key.md', import.meta.url), answerKeySheet());
  console.log('written: ai-evals/answer-key.md');
}
