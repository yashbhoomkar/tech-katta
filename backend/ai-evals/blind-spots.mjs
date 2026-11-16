// The AI evaluator's real test set (owner, 2026-11-16: "we don't want AI to give answer that our deterministic
// handwritten evaluator can find out. We need something from the llm that we cannot determine ourselves at runtime").
//
// Every design here passes the judge, so the judge says nothing is wrong. The FLAWED ones have a mistake an
// interviewer would catch but the judge does not model (it checks that a lookup column has an index, not what a
// table's key means; it spreads load evenly over partitions; it does not weigh what data a store holds). The CLEAN
// ones have no such mistake, so any problem the model raises there is a false alarm. The problems' reference designs
// are clean designs too (observe-bakeoff.mjs adds them).
//
// Each flawed design states, written by hand: its finding (no two alike), the line the flaw is on, the categories that
// name it, and why.
// Verified with the judge on 2026-11-16: every design below is Accepted (test/ai-evals.test.js keeps it so).

export const CATEGORIES = {
  key_choice: "A table's key does not fit how its rows are written or read: rows overwrite each other, or one lookup has to ask every partition",
  hot_key: 'One key, or a few, gets most of the traffic, so one partition or node takes it while the others idle',
  wrong_store: 'The data does not suit the store it is kept in (its size, its shape, how it is read)',
  consistency: 'A read can show something wrong for this problem (old, missing or someone else\'s data)',
  availability: 'One failure stops part of the service',
  scaling: 'It works at the tested load but will not grow with the problem',
  cost: 'It pays for capacity it does not need',
  security: 'Someone can read or change data that is not theirs',
  other: 'Anything else an interviewer would raise',
};

// On some clean designs a point in these categories is fair, not a false alarm (a reviewer may reasonably raise it).
export const ALLOWED_ON_CLEAN = {
  'url-shortener/reference': ['security'], // counter codes are guessable; fine for public promo links, fair to mention
  'paste-bin/reference': ['security'],     // snowflake ids are partly predictable from time
  'url-shortener/clean-snowflake-five-servers': ['security'],
};

export const BLIND_SPOTS = [
  {
    id: 'rate-limiter/hot-window-key', kind: 'flawed', line: 5, categories: ['hot_key', 'key_choice'],
    finding: 'A time-bucket partition key sends all current traffic to one partition',
    why: 'The counters are partitioned by window, so every user\'s counter for the current minute lives under one key: all 10,000 checks a second hit one partition. Partition by user_id.',
    source: `lb  = lb()
api = server(count=8, size=large)
kv  = nosql(nodes=4, rf=3, w=1, r=1)

table kv.counters(window pk, user_id, calls) index(user_id)

write CHECK:     client > lb > api > kv
read  GET_USAGE: client > lb > api > kv
`,
  },
  {
    id: 'chat-message-store/messages-keyed-by-id', kind: 'flawed', line: 6, categories: ['key_choice'],
    finding: 'The partition key is not the lookup key, so every read asks every node',
    why: 'Messages are partitioned by message_id, so one chat\'s messages are spread over every node and opening a chat asks all of them through a secondary index. Partition by chat_id.',
    source: `lb  = lb()
api = server(count=10, size=large)
kv  = nosql(nodes=6, rf=3, w=2, r=2)
ids = idgen(kind=snowflake)

table kv.messages(message_id pk, chat_id, body, sent_at) index(chat_id)

read  GET_MESSAGES: client > lb > api > kv
write SEND_MESSAGE: client > lb > api > ids > kv
`,
  },
  {
    id: 'image-serving/images-in-kv', kind: 'flawed', line: 4, categories: ['wrong_store', 'cost'],
    finding: 'Large blobs kept in a key-value store',
    why: '200 KB photos, 20 crore of them, are kept in a key-value store. Large blobs belong in object storage, which is built for them and far cheaper per GB.',
    source: `cdn   = cdn(ttl_s=86400)
lb    = lb()
api   = server(count=4, size=medium)
files = nosql(nodes=3, rf=3, w=2, r=2)
ids   = idgen(kind=snowflake)

read  GET_IMAGE:    client > cdn | lb > api > files
write UPLOAD_IMAGE: client > lb > api > ids > files
`,
  },
  {
    id: 'ticket-booking/one-row-per-show', kind: 'flawed', line: 7, categories: ['key_choice', 'consistency'],
    finding: 'A key too coarse for the rows, so they overwrite each other',
    why: 'show_id is the primary key of a SQL table, so there is one row per show: booking one seat overwrites the row of every other seat of that show.',
    source: `lb    = lb()
api   = server(count=6, size=large)
cache = cache(nodes=2, memory_gb=1, ttl_s=60)
db    = sql(size=large, replicas=1, sync=true)
ids   = idgen(kind=counter)

table db.seats(show_id pk, seat_id, status, booking_id) index(seat_id)

read  GET_SEATS: client > lb > api > cache | db
write BOOK:      client > lb > api > ids > db then invalidate cache
`,
  },
  {
    id: 'ind-vs-pak-live-score/scores-in-kv-ten-keys', kind: 'flawed', line: 7, categories: ['hot_key'],
    finding: 'A handful of live entities hold all the traffic',
    why: 'Scores are partitioned by match_id and only a handful of matches are live, so every score read and update lands on the few partitions that hold them while the other nodes idle.',
    source: `cdn   = cdn(ttl_s=2)
lb    = lb()
api   = server(count=7, size=large)
cache = cache(nodes=2, memory_gb=1, ttl_s=2)
kv    = nosql(nodes=6, rf=3, w=2, r=2)

table kv.scores(match_id pk, score, updated_at)

read  GET_SCORE:    client > cdn | lb > api > cache | kv
write UPDATE_SCORE: client > lb > api > kv
`,
  },
  {
    id: 'url-shortener/links-keyed-by-time', kind: 'flawed', line: 7, categories: ['key_choice', 'consistency'],
    finding: 'A timestamp as primary key, so rows made in the same instant collide',
    why: 'created_at is the primary key, so two links made in the same instant collide and one overwrites the other. The code is the natural key.',
    source: `lb    = lb()
api   = server(count=4, size=medium)
cache = cache(nodes=2, memory_gb=1, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=counter)

table db.links(created_at pk, code, url) index(code)

read  GET_LINK:    client > lb > api > cache | db
write CREATE_LINK: client > lb > api > ids > db then invalidate cache
`,
  },
  {
    id: 'image-serving/cdn-one-second', kind: 'flawed', line: 1, categories: ['scaling', 'cost', 'other'],
    finding: 'A CDN TTL far too short for content that never changes',
    why: 'Photos never change once uploaded, but the CDN keeps each one for a second, so it keeps going back to the origin for the same photo. A long TTL is safe here.',
    source: `cdn   = cdn(ttl_s=1)
lb    = lb()
api   = server(count=4, size=medium)
files = objectstore()
ids   = idgen(kind=snowflake)

read  GET_IMAGE:    client > cdn | lb > api > files
write UPLOAD_IMAGE: client > lb > api > ids > files
`,
  },
  {
    id: 'paste-bin/enumerable-ids', kind: 'flawed', line: 5, categories: ['security', 'other'],
    finding: 'Sequential ids let anyone read private data by counting up',
    why: 'Pastes hold logs and config, often secrets, and are shared by link. Counter ids are 1, 2, 3...: anyone with one link can read every other paste by changing the number. Use ids nobody can guess.',
    source: `lb    = lb()
api   = server(count=4, size=large)
cache = cache(nodes=2, memory_gb=8, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=counter)

table db.pastes(id pk, body, created_at)

read  GET_PASTE:    client > lb > api > cache | db
write CREATE_PASTE: client > lb > api > ids > db
`,
  },
  {
    id: 'rate-limiter/no-window-column', kind: 'flawed', line: 5, categories: ['key_choice', 'consistency', 'other'],
    finding: 'A missing column, so the limit never resets',
    why: 'The counter has no window, so calls are counted forever: after a user\'s first 100 calls they are refused for good. The table needs the minute the count belongs to.',
    source: `lb  = lb()
api = server(count=8, size=large)
kv  = nosql(nodes=4, rf=3, w=1, r=1)

table kv.counters(user_id pk, calls)

write CHECK:     client > lb > api > kv
read  GET_USAGE: client > lb > api > kv
`,
  },
  {
    id: 'url-shortener/clients-read-the-store', kind: 'flawed', line: 9, categories: ['security', 'other'],
    finding: 'Clients reach the data store directly, with no server in between',
    why: 'Opens go from the client straight to the cache and the database: the store is exposed to the internet, and nothing checks the code, limits abusive clients or hides the database. Reads should go through the servers like writes do.',
    source: `lb    = lb()
api   = server(count=4, size=medium)
cache = cache(nodes=2, memory_gb=1, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=counter)

table db.links(code pk, url, created_at)

read  GET_LINK:    client > cache | db
write CREATE_LINK: client > lb > api > ids > db then invalidate cache
`,
  },
  // clean variants: different from the reference, and sound
  {
    id: 'url-shortener/clean-snowflake-five-servers', kind: 'clean',
    why: 'Snowflake ids and five servers instead of a counter and four: a sound variant.',
    source: `lb    = lb()
api   = server(count=5, size=medium)
cache = cache(nodes=2, memory_gb=1, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=snowflake)

table db.links(code pk, url, created_at)

read  GET_LINK:    client > lb > api > cache | db
write CREATE_LINK: client > lb > api > ids > db then invalidate cache
`,
  },
  {
    id: 'chat-message-store/clean-eight-nodes', kind: 'clean',
    why: 'Eight storage nodes instead of six, partitioned by chat_id: a sound variant.',
    source: `lb  = lb()
api = server(count=10, size=large)
kv  = nosql(nodes=8, rf=3, w=2, r=2)
ids = idgen(kind=snowflake)

table kv.messages(chat_id pk, message_id, body, sent_at)

read  GET_MESSAGES: client > lb > api > kv
write SEND_MESSAGE: client > lb > api > ids > kv
`,
  },
];

/** The key in plain words, for a person to check: node ai-evals/blind-spots.mjs writes blind-spots.md */
export function blindSpotSheet(references) {
  const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const out = [
    '# The AI evaluator\'s test designs',
    '',
    'Every design passes the judge. A **flawed** design has a mistake the judge does not model; a correct review flags the',
    'given line as a problem in one of the given categories. A **clean** design has no such mistake; any problem the',
    'model raises on it is a false alarm. Generated from blind-spots.mjs (`node ai-evals/blind-spots.mjs`).',
    '',
    '| Design | Kind | Finding | Flawed line | Categories | Why |',
    '|---|---|---|---|---|---|',
    ...BLIND_SPOTS.map((d) => `| ${esc(d.id)} | ${d.kind} | ${esc(d.finding || '-')} | ${d.line ? `${d.line}: \`${esc(d.source.split('\n')[d.line - 1])}\`` : '-'} | ${esc((d.categories || []).join(', ') || '-')} | ${esc(d.why)} |`),
    ...references.map((id) => `| ${esc(id)} | clean | - | - | - | The problem's reference design${ALLOWED_ON_CLEAN[id] ? ` (a ${ALLOWED_ON_CLEAN[id].join(', ')} point is fair)` : ''} |`),
  ];
  return `${out.join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { writeFileSync, readdirSync } = await import('node:fs');
  const refs = readdirSync(new URL('../../content/problems2/', import.meta.url)).filter((f) => /^\d{3}-.*\.json$/.test(f)).sort().map((f) => `${f.replace(/^\d{3}-|\.json$/g, '')}/reference`);
  writeFileSync(new URL('./blind-spots.md', import.meta.url), blindSpotSheet(refs));
  console.log('written: ai-evals/blind-spots.md');
}
