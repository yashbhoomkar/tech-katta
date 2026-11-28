# The answer key, in plain words

Generated from answer-key.mjs (`node ai-evals/answer-key.mjs`), which marks every AI review in the bake-off. Written by
hand on 2026-11-16 after reading each design and everything the judge reports about it. Please check each row:
is the fault right, is the fix what a good interviewer would say, is the "wrong advice" really wrong? Rows marked
**Content issue** need a decision about the problem itself.

## url-shortener

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| no-cache-one-server | One small server takes every open: it gets 2,525 calls a second and can serve 500. With no cache, the database is also near its limit at the peak. | finding:overloaded:GET_LINK:api, finding:p99:GET_LINK:none, load:api | more or larger servers | - |
| no-cache | With no cache every open reads the database, which runs at 86 % at the peak and makes the slowest opens too slow. | finding:p99:GET_LINK:db, load:db | a cache | more or larger servers |
| async-replica | The replica copies writes after acknowledging them; when the primary dies, the newest links are lost. | finding:lost:CREATE_LINK:db | synchronous replication (wait for the replica) | - |
| no-replica | The database has no replica: when it dies, nothing takes over and opens fail. | finding:unavailable:GET_LINK:db, static:W003:db | a replica | - |
| random-32-bit-ids | Random 32-bit codes repeat over 10 crore links. | finding:collision:CREATE_LINK:ids | a counter, Snowflake ids or more bits | a cache |
| day-long-cache-no-invalidate | The cache keeps a link for a day and is not cleared on write, so an edited link stays wrong for up to a day. | finding:stale:GET_LINK:cache | clearing the cache on write or a shorter TTL | a larger cache |
| everything-large | Large servers and a large database: everything passes, at ₹1,43,000 against ₹1,00,000. The database is 63 % of the bill, the servers 34 %. | finding:budget:all:db, cost:total, cost:db, cost:api | smaller or fewer parts | - |

## paste-bin

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| small-cache | The cache (2 GB in all) holds only a fraction of the hot pastes, so many opens miss and the database becomes the slowest hop. | finding:p99:GET_PASTE:db | a larger cache | more or larger servers |
| no-cache-small-servers | Two medium servers serve 2,000 calls a second against 4,530, and with no cache the database is over capacity too (153 %). | finding:overloaded:GET_PASTE:api, finding:p99:GET_PASTE:none, load:api (and must mention load:db) | more or larger servers or a cache | - |
| no-replica | The database has no replica: when it dies, nothing takes over. | finding:unavailable:GET_PASTE:db, static:W003:db | a replica | - |
| async-replica | The replica copies writes after acknowledging them; a failover loses the newest pastes. | finding:lost:CREATE_PASTE:db | synchronous replication (wait for the replica) | - |
| random-32-bit-ids | Random 32-bit ids repeat over 5 crore pastes. | finding:collision:CREATE_PASTE:ids | a counter, Snowflake ids or more bits | - |
| huge-cache | A 64 GB cache passes every test but costs more than the budget allows. | finding:budget:all:cache, cost:total, cost:cache | smaller or fewer parts | - |

## rate-limiter

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| sql-counters | Every check is a write, 12,050 a second, and one SQL primary takes about 10,000. Replicas add no write capacity. | finding:overloaded:CHECK:db, finding:p99:CHECK:none, load:db | a partitioned key-value store | read replicas or a cache |
| write-to-all-copies | Each write waits for all three copies (w equals the replication factor), so one dead node stops every check. | finding:unavailable:CHECK:kv | fewer copies per write or overlapping read and write quorums | more or larger servers |
| too-few-servers | Four large servers serve 8,000 checks a second; the peak sends 12,050. | finding:overloaded:CHECK:api, finding:p99:CHECK:none, load:api | more or larger servers | - |
| tight-servers | Seven servers run at 86 % at the peak and the slowest checks wait past 100 ms. | finding:p99:CHECK:api, load:api | more or larger servers | - |
| huge-cluster | Twelve servers and twelve storage nodes pass every test at ₹2,66,000 against ₹1,80,000. | finding:budget:all:api, cost:total, cost:api, cost:kv | smaller or fewer parts | - |

## news-feed

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| short-ttl-no-invalidate | A 30-second TTL means few feeds are still cached when asked for again, so most opens miss and the median open is too slow. A longer TTL with invalidation on post keeps feeds both fresh and cached. | finding:p50:GET_FEED:api | a longer TTL or clearing the cache on write | more or larger servers |
| long-ttl-no-invalidate | The cache keeps a feed for an hour and is not cleared when someone posts; the problem allows 30 seconds. | finding:stale:GET_FEED:cache | clearing the cache on write or a shorter TTL | a larger cache |
| sql-feeds | Feeds on one SQL primary: 800 posts a second plus the cache misses are more than it can take (132 %). | finding:overloaded:GET_FEED:db, finding:p99:GET_FEED:none, load:db | a partitioned key-value store or a larger database | - |
| quick-writes | Two faults: w=1 acknowledges a post on one copy, so a dead node loses it; and r=3 needs every copy, so reads fail when a node dies. | finding:lost:POST:kv, finding:unavailable:GET_FEED:none (and must mention finding:lost:POST:kv and finding:unavailable:GET_FEED:none) | overlapping read and write quorums | - |
| big-everything | Twelve servers and a 128 GB cache pass every test at ₹3,68,000 against ₹1,75,000. | finding:budget:all:cache, cost:total, cost:cache, cost:api | smaller or fewer parts | - |

## notification-sender

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest, load:worker, load:db | - | - |
| no-queue | Without a queue, the spike of 12,000 writes a second hits the database directly; it takes 10,000. | finding:overloaded:SEND:db, load:db | a queue | - |
| one-small-worker | One small worker clears 500 a second, half the normal rate, so the spike's backlog never drains in time. | finding:backlog:SEND:worker, load:worker | more or larger workers | - |
| async-replica | The replica copies writes after acknowledging them; a failover during a spike loses notifications. | finding:lost:SEND:db | synchronous replication (wait for the replica) | - |
| too-few-servers | Two large servers take 4,000 sends a second in front of the queue; the spike sends 12,000. | finding:overloaded:SEND:api, load:api | more or larger servers | - |
| many-workers | Twelve large workers clear the spike at once, at ₹3,48,000 against ₹2,60,000; the 3-minute promise allows far fewer. | finding:budget:all:worker, cost:total, cost:worker | smaller or fewer parts | - |

## image-serving

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| no-cdn | With no CDN, all 60,000 views a second go through the servers, which can serve 2,000. Only a CDN in front, reading the files itself, can take that within budget. | finding:overloaded:GET_IMAGE:api, finding:p99:GET_IMAGE:none, load:api, load:lb | a CDN | more or larger servers |
| cache-behind-servers | The cache sits behind the servers, so every view still passes the servers. The images need a CDN in front. | finding:overloaded:GET_IMAGE:api, finding:p99:GET_IMAGE:none, load:api, load:lb, load:cache | a CDN | a larger cache or more or larger servers |
| views-through-servers | The CDN misses 5 % of views, about 3,000 a second, and they go through one medium server that serves 1,000. The CDN should read the files itself. | finding:overloaded:GET_IMAGE:api, finding:p99:GET_IMAGE:none, load:api | more or larger servers | - |
| random-32-bit-ids | Random 32-bit names repeat over 20 crore images. | finding:collision:UPLOAD_IMAGE:ids | a counter, Snowflake ids or more bits | - |
| many-servers | Forty servers do what the CDN already does, at ₹2,47,000 against ₹60,000. | finding:budget:all:api, cost:total, cost:api | smaller or fewer parts | - |

## leaderboard

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| no-index | The top list is looked up by game_id, which has no index: the database is nearly idle (13 %) but every miss scans the table. More capacity does not help; an index does. | finding:p99:GET_TOP:db | an index | a larger database or more or larger servers or read replicas |
| minute-ttl | The cache keeps a top list for a minute; the problem allows 5 seconds. | finding:stale:GET_TOP:cache | a shorter TTL or clearing the cache on write | a larger cache |
| medium-db | A medium primary takes about 1,200 calls a second; the match sends 1,440. | finding:overloaded:GET_TOP:db, load:db | a larger database | - |
| no-cache | With no cache every top-list read goes to the primary: 25,200 calls a second against the 19,000 or so it can serve. | finding:overloaded:GET_TOP:db, finding:p99:GET_TOP:none, load:db | a cache or read replicas | more or larger servers |
| big-everything | Thirty servers and three replicas pass every test at ₹5,45,000 against ₹4,00,000. | finding:budget:all:api, cost:total, cost:api, cost:db | smaller or fewer parts | - |

## ticket-booking

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| long-ttl | The cached seat map is kept for a minute, so a booked seat can show as free for up to a minute; the problem allows 2 seconds. | finding:stale:GET_SEATS:cache | a shorter TTL | a larger cache |
| async-replica | The replica copies bookings after acknowledging them; a failover loses confirmed bookings. | finding:lost:BOOK:db | synchronous replication (wait for the replica) | - |
| medium-db | A medium primary takes about 1,040 calls a second; 10 am sends 1,280. | finding:overloaded:GET_SEATS:db, finding:p99:GET_SEATS:none, finding:p99:BOOK:none, load:db | a larger database | - |
| random-ids | Random 32-bit booking ids repeat over 50 crore bookings. | finding:collision:BOOK:ids | a counter, Snowflake ids or more bits | - |
| big-everything | Twelve servers and three replicas pass every test at ₹3,29,000 against ₹2,00,000. | finding:budget:all:db, cost:total, cost:db, cost:api | smaller or fewer parts | - |

## chat-message-store

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| one-copy-each-way | r=1 and w=1 with three copies: a read can miss the copy that has your new message. Reads and writes must overlap (r + w more than the copies). | finding:ryw:GET_MESSAGES:kv | overlapping read and write quorums | - |
| write-all-read-one | w=3 needs every copy for a send, so when one node dies messages cannot be sent. | finding:unavailable:GET_MESSAGES:kv, finding:unavailable:SEND_MESSAGE:none | overlapping read and write quorums or fewer copies per write | - |
| write-one-read-all | Two faults: w=1 acknowledges a message on one copy, so a dead node loses it; r=3 needs every copy, so reads fail when a node dies. | finding:lost:SEND_MESSAGE:kv, finding:unavailable:GET_MESSAGES:none (and must mention finding:lost:SEND_MESSAGE:kv and finding:unavailable:GET_MESSAGES:none) | overlapping read and write quorums | - |
| sql-messages | Messages on one SQL primary: the reads and 12,000 writes a second are about 1.7 times what it can take. | finding:overloaded:GET_MESSAGES:db, finding:p99:GET_MESSAGES:none, finding:p99:SEND_MESSAGE:none, load:db | a partitioned key-value store | read replicas |
| random-ids | Random 32-bit message ids repeat over 500 crore messages. | finding:collision:SEND_MESSAGE:ids | a counter, Snowflake ids or more bits | - |
| big-cluster | Thirty storage nodes pass every test at ₹4,94,000 against ₹3,30,000. | finding:budget:all:kv, cost:total, cost:kv | smaller or fewer parts | - |

## ind-vs-pak-live-score

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| reference | Passes every test. The review should say where it would break first. | margin:tightest | - | - |
| no-cdn | With no CDN, the score reads go straight to the servers, which can serve 32,000 a second. Only a CDN in front can take 5 lakh reads a second within budget. | finding:overloaded:GET_SCORE:api, finding:p99:GET_SCORE:none, load:api | a CDN | more or larger servers |
| cdn-minute-ttl | The CDN keeps a score for a minute; the problem allows 5 seconds. | finding:stale:GET_SCORE:cdn | a shorter TTL | - |
| thin-origin | The CDN misses 5 % of reads, about 25,000 a second, and four large servers serve 8,000. | finding:overloaded:GET_SCORE:api, finding:p99:GET_SCORE:none, load:api | more or larger servers | - |
| primary-only | When the cache restarts, every origin read lands on one primary with no read replicas, and it cannot serve them. Read replicas (or keeping the reads off the primary) fix it. | finding:unavailable:GET_SCORE:db | read replicas | - |
| big-origin | Forty servers pass every test at ₹6,23,000 against ₹3,80,000; the CDN already takes most reads. | finding:budget:all:api, cost:total, cost:api | smaller or fewer parts | - |

## url-shortener

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## paste-bin

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## rate-limiter

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## news-feed

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## notification-sender

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## image-serving

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## leaderboard

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## ticket-booking

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## chat-message-store

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |

## ind-vs-pak-live-score

| Design | The fault | A correct review leads with | Its advice must point to | Wrong advice |
|---|---|---|---|---|
| template | The starting template: its routes do not reach a place where the data lives, so the design cannot be judged yet. | the errors the judge reports | routing each request to where its data lives | - |
