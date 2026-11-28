# Ground truth, for a person to check

Generated from ground-truth.json (version 2) by `node ai-evals/ground-truth.mjs --sheet`. For each design: does
"A correct review leads with" name the same fault as the author? Mark any row that does not, and say what it should
lead with; the fix goes in OVERRIDES in ground-truth.mjs.

## url-shortener

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'A quiet afternoon', with 31 % to spare. | - |
| no-cache-one-server | Overloaded | One small server can't take the evening peak. | api received 2,525 calls a second but can serve 500.<br>GET_LINK took 472.6 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 505 % of capacity. | api runs at 40 % of what it can take in 'A quiet afternoon', and 505 % at its busiest ('Evening peak'). |
| no-cache | Too Slow | Every open reaches the database, which runs hot at the peak. | GET_LINK took 126.9 ms at the 99th percentile; the promise is 100 ms. Slowest hop: db at 86 % of capacity. | db runs at 7 % of what it can take in 'A quiet afternoon', and 86 % at its busiest ('Evening peak'). |
| async-replica | Data Lost | The replica is a second behind; a failover loses that second of new links. | In the hidden test 'The database primary fails', acknowledged writes were lost at db. | - |
| no-replica | Unavailable | When the only database dies nothing takes over. | In the hidden test 'The database primary fails', requests failed at db. | "db" has no spare. If it fails, GET_LINK and CREATE_LINK stop. |
| random-32-bit-ids | Wrong Answer | 10 crore random 32-bit codes repeat. | With 10 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| day-long-cache-no-invalidate | Wrong Answer | An edited link can stay wrong for a day. | GET_LINK can return data up to 86400 s old, but this problem allows 3600 s. Look at the cache TTL, or invalidate on write. | - |
| everything-large | Over Budget | It passes every test at more than the budget. | This design costs ₹1,43,000 a month; the budget is ₹1,00,000. | This design costs ₹1,43,000 a month, over the budget of ₹1,00,000.<br>db costs ₹90,000 a month, 63 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_LINK never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: CREATE_LINK is never saved: its route does not reach sql, nosql or objectstore. | - |

## paste-bin

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'A quiet hour', with 24 % to spare. | - |
| small-cache | Too Slow | 2 GB holds only a fifth of the hot pastes at 10 KB each; half the reads miss and the database runs hot. | GET_PASTE took 89.1 ms at the 99th percentile; the promise is 80 ms. Slowest hop: db at 74 % of capacity. | db runs at 6 % of what it can take in 'A quiet hour', and 74 % at its busiest ('An incident link goes round'). |
| no-cache-small-servers | Overloaded | Two medium servers serve 2,000 calls a second; the peak sends 4,500. | api received 4,530 calls a second but can serve 2,000.<br>GET_PASTE took 602.1 ms at the 99th percentile; the promise is 80 ms. Slowest hop: api at 227 % of capacity. | api runs at 15 % of what it can take in 'A quiet hour', and 227 % at its busiest ('An incident link goes round'). |
| no-replica | Unavailable | When the only database dies, nothing takes over. | In the hidden test 'The database primary fails', requests failed at db. | "db" has no spare. If it fails, GET_PASTE and CREATE_PASTE stop. |
| async-replica | Data Lost | The replica is a second behind; the pastes of that second are gone after a failover. | In the hidden test 'The database primary fails', acknowledged writes were lost at db. | - |
| random-32-bit-ids | Wrong Answer | 5 crore random 32-bit ids repeat lakhs of times. | With 5 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| huge-cache | Over Budget | It passes every test, but 64 GB of cache costs more than the whole budget allows. | This design costs ₹1,86,000 a month; the budget is ₹1,50,000. | This design costs ₹1,86,000 a month, over the budget of ₹1,50,000.<br>cache costs ₹96,000 a month, 52 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_PASTE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: CREATE_PASTE is never saved: its route does not reach sql, nosql or objectstore. | - |

## rate-limiter

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'A normal afternoon', with 10 % to spare. | - |
| sql-counters | Overloaded | A large SQL primary takes 10,000 writes a second; every check is a write, and the peak is 12,000 a second. | db received 12,050 calls a second but can serve 10,021.<br>CHECK took 352.6 ms at the 99th percentile; the promise is 100 ms. Slowest hop: db at 120 % of capacity. | db runs at 12 % of what it can take in 'A normal afternoon', and 120 % at its busiest ('Evening peak'). |
| write-to-all-copies | Unavailable | w=3 needs all three copies of a counter; when one node dies, every check fails. | In the hidden test 'A storage node dies', requests failed at kv. | - |
| too-few-servers | Overloaded | Four large servers serve 8,000 calls a second; the peak sends 12,000. | api received 12,050 calls a second but can serve 8,000.<br>CHECK took 422.4 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 151 % of capacity. | api runs at 15 % of what it can take in 'A normal afternoon', and 151 % at its busiest ('Evening peak'). |
| tight-servers | Too Slow | Seven large servers run at 86 % of what they can take at the peak, so the slowest checks wait longer than the promise allows. | CHECK took 166.0 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 86 % of capacity. | api runs at 9 % of what it can take in 'A normal afternoon', and 86 % at its busiest ('Evening peak'). |
| huge-cluster | Over Budget | Twelve nodes pass every test at well over the budget. | This design costs ₹2,66,000 a month; the budget is ₹1,80,000. | This design costs ₹2,66,000 a month, over the budget of ₹1,80,000.<br>api costs ₹1,44,000 a month, 54 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: CHECK is never saved: its route does not reach sql, nosql or objectstore.<br>Line 6: GET_USAGE never reaches a place where the data lives (sql, nosql or objectstore). | - |

## news-feed

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is GET_FEED p50 in 'Dinner-time peak', with 13 % to spare. | - |
| short-ttl-no-invalidate | Too Slow | A 30-second TTL keeps the feeds fresh, but with 50 lakh feeds hardly any is asked for twice in 30 seconds: most opens miss. | GET_FEED took 16.1 ms for the median request; the promise is 14 ms. | api runs at 7 % of what it can take in 'Morning', and 55 % at its busiest ('Dinner-time peak'). |
| long-ttl-no-invalidate | Wrong Answer | A feed could be an hour old; the problem allows 30 seconds. | GET_FEED can return data up to 3600 s old, but this problem allows 30 s. Look at the cache TTL, or invalidate on write. | - |
| sql-feeds | Overloaded | 800 posts a second land on one SQL primary with the cache's misses; a medium primary takes 1,000 writes a second in all. | db received 2,370 calls a second but can serve 1,791.<br>GET_FEED took 248.7 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 132 % of capacity. | db runs at 24 % of what it can take in 'Morning', and 132 % at its busiest ('Dinner-time peak'). |
| quick-writes | Data Lost | w=1: a post is acknowledged when one copy has it; that node's death loses it. | In the hidden test 'A storage node dies', acknowledged writes were lost at kv.<br>In the hidden test 'A storage node dies', requests failed. | - |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹3,68,000 a month; the budget is ₹1,75,000. | This design costs ₹3,68,000 a month, over the budget of ₹1,75,000.<br>cache costs ₹1,92,000 a month, 52 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_FEED never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: POST is never saved: its route does not reach sql, nosql or objectstore. | - |

## notification-sender

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | api runs at 7 % of what it can take in 'A steady hour', and 86 % at its busiest ('The match starts').<br>worker runs at 25 % of what it can take in 'A steady hour', and 100 % at its busiest ('The match starts').<br>The tightest promise is the budget in 'A steady hour', with 22 % to spare. | - |
| no-queue | Overloaded | Without a queue the database takes the spike directly: 12,000 writes a second against a large primary's 10,000. | db received 12,000 calls a second but can serve 10,000. | db runs at 10 % of what it can take in 'A steady hour', and 120 % at its busiest ('The match starts'). |
| one-small-worker | Too Slow | One small worker does 500 a second, half the normal rate: the backlog from the spike never drains. | SEND was still waiting 600 s after it was accepted; the promise is 180 s. worker can do 500 a second but 1,000 arrive. | worker runs at 100 % of what it can take in 'A steady hour'. |
| async-replica | Data Lost | A failover loses the last second of written notifications. | In the hidden test 'The database fails during a spike', acknowledged writes were lost at db. | - |
| too-few-servers | Overloaded | The servers still take the whole spike before the queue: two large serve 4,000 a second, and the spike sends 12,000. | api received 12,000 calls a second but can serve 4,000. | api runs at 25 % of what it can take in 'A steady hour', and 300 % at its busiest ('The match starts'). |
| many-workers | Over Budget | Twelve large workers clear the spike at once, at far more than the budget. | This design costs ₹3,24,000 a month; the budget is ₹2,60,000. | This design costs ₹3,24,000 a month, over the budget of ₹2,60,000.<br>worker costs ₹1,44,000 a month, 44 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: SEND is never saved: its route does not reach sql, nosql or objectstore. | - |

## image-serving

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is UPLOAD_IMAGE p99 in 'Dinner time', with 13 % to spare. | - |
| no-cdn | Overloaded | Every view goes through the servers: 60,000 calls a second against the 2,000 that four small servers serve. | api received 2,010 calls a second but can serve 2,000.<br>GET_IMAGE took 442.1 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 100 % of capacity. | api runs at 100 % of what it can take in 'An afternoon'. |
| cache-behind-servers | Overloaded | A cache behind the servers doesn't protect them: all 60,000 views still go through them. | api received 2,010 calls a second but can serve 2,000.<br>GET_IMAGE took 444.2 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 100 % of capacity. | api runs at 100 % of what it can take in 'An afternoon'. |
| views-through-servers | Overloaded | 5 % of views miss the CDN: 3,000 a second go through one server, more than a medium server's 1,000. The CDN should read the files itself. | api received 4,250 calls a second but can serve 1,000.<br>GET_IMAGE took 458.2 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 425 % of capacity.<br>UPLOAD_IMAGE took 442.3 ms at the 99th percentile; the promise is 110 ms. Slowest hop: api at 425 % of capacity. | api runs at 11 % of what it can take in 'An afternoon', and 425 % at its busiest ('Dinner time'). |
| random-32-bit-ids | Wrong Answer | 20 crore images with random 32-bit names repeat. | With 20 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| many-servers | Over Budget | Forty servers do what the CDN and the object store already do, at far more than the budget. | This design costs ₹2,47,000 a month; the budget is ₹30,000. | This design costs ₹2,47,000 a month, over the budget of ₹30,000.<br>api costs ₹2,40,000 a month, 97 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_IMAGE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: UPLOAD_IMAGE is never saved: its route does not reach sql, nosql or objectstore. | - |

## leaderboard

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'Before the match', with 11 % to spare. | - |
| no-index | Too Slow | The top list is looked up by game_id, which has no index: every miss reads the whole table, and takes a hundred times as long. | GET_TOP took 1137.9 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 10 % of capacity. | db runs at 2 % of what it can take in 'Before the match'. |
| minute-ttl | Wrong Answer | A one-minute TTL shows scores up to 60 s old; the problem allows 5 s. | GET_TOP can return data up to 61 s old, but this problem allows 5 s. Look at the cache TTL, or invalidate on write. | - |
| medium-db | Overloaded | 1,200 score writes a second against a medium primary's 1,000. | db received 1,440 calls a second but can serve 1,200. | db runs at 20 % of what it can take in 'Before the match', and 120 % at its busiest ('During the match'). |
| no-cache | Overloaded | Every top-list read goes to the primary: 24,000 reads a second against the 20,000 a large primary serves, on top of the score writes. | db received 25,200 calls a second but can serve 19,091.<br>GET_TOP took 269.3 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 132 % of capacity. | db runs at 22 % of what it can take in 'Before the match', and 132 % at its busiest ('During the match'). |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹5,45,000 a month; the budget is ₹4,00,000. | This design costs ₹5,45,000 a month, over the budget of ₹4,00,000.<br>api costs ₹3,60,000 a month, 66 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_TOP never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: SUBMIT_SCORE is never saved: its route does not reach sql, nosql or objectstore. | - |

## ticket-booking

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'The day before', with 17 % to spare. | - |
| long-ttl | Wrong Answer | A cached seat map a minute old shows seats that were taken a minute ago: fans pick them and are told they are gone. The problem allows 2 seconds. | GET_SEATS can return data up to 60 s old, but this problem allows 2 s. Look at the cache TTL, or invalidate on write. | - |
| async-replica | Data Lost | A failover loses the last second of confirmed bookings: tickets people paid for vanish. | In the hidden test 'The database primary fails', acknowledged writes were lost at db. | - |
| medium-db | Overloaded | 1,200 bookings a second against a medium primary's 1,000 writes. | db received 1,280 calls a second but can serve 1,043.<br>GET_SEATS took 290.1 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 123 % of capacity.<br>BOOK took 687.9 ms at the 99th percentile; the promise is 250 ms. Slowest hop: db at 123 % of capacity. | db runs at 8 % of what it can take in 'The day before', and 123 % at its busiest ('10 am: sales open'). |
| random-ids | Wrong Answer | Random 32-bit booking ids repeat across 50 crore bookings. | With 50 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹3,29,000 a month; the budget is ₹2,00,000. | This design costs ₹3,29,000 a month, over the budget of ₹2,00,000.<br>db costs ₹1,80,000 a month, 55 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_SEATS never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: BOOK is never saved: its route does not reach sql, nosql or objectstore. | - |

## chat-message-store

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'Lunch time', with 14 % to spare. | - |
| one-copy-each-way | Wrong Answer | r=1 and w=1 with rf=3: a read can miss the copy that has your new message (r + w must be more than rf). | After a write, GET_MESSAGES must show the new data at once. Yours reads from kv, which can be behind. | - |
| write-all-read-one | Unavailable | w=3 needs every copy; when one node dies, no message can be sent. | In the hidden test 'A storage node dies', requests failed at kv.<br>In the hidden test 'A storage node dies', requests failed. | - |
| write-one-read-all | Data Lost | w=1: a message acknowledged by one node dies with that node. | In the hidden test 'A storage node dies', acknowledged writes were lost at kv.<br>In the hidden test 'A storage node dies', requests failed.<br>In the hidden test 'A storage node dies', requests failed. | - |
| sql-messages | Overloaded | 12,000 messages a second against a large SQL primary's 10,000 writes. | db received 22,000 calls a second but can serve 12,941.<br>GET_MESSAGES took 266.6 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 170 % of capacity.<br>SEND_MESSAGE took 666.6 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 170 % of capacity. | db runs at 34 % of what it can take in 'Lunch time', and 170 % at its busiest ('Dinner time'). |
| random-ids | Wrong Answer | Random 32-bit message ids repeat across 500 crore messages. | With 500 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| big-cluster | Over Budget | It passes every test at more than the budget. | This design costs ₹4,94,000 a month; the budget is ₹3,30,000. | This design costs ₹4,94,000 a month, over the budget of ₹3,30,000.<br>kv costs ₹3,00,000 a month, 61 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_MESSAGES never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: SEND_MESSAGE is never saved: its route does not reach sql, nosql or objectstore. | - |

## ind-vs-pak-live-score

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'The toss', with 12 % to spare. | - |
| no-cdn | Overloaded | 5 lakh reads a second reach the origin, which sixteen large servers can't serve (32,000 a second), and the load balancer takes 1 lakh. | api received 50,001 calls a second but can serve 32,001.<br>GET_SCORE took 418.1 ms at the 99th percentile; the promise is 250 ms. Slowest hop: api at 156 % of capacity. | api runs at 156 % of what it can take in 'The toss'. |
| cdn-minute-ttl | Wrong Answer | The CDN keeps a score for a minute; the problem allows 5 seconds. | GET_SCORE can return data up to 62 s old, but this problem allows 5 s. Look at the cache TTL, or invalidate on write. | - |
| thin-origin | Overloaded | 5 % of 5 lakh reads miss the CDN: 25,000 a second, more than four large servers serve. | api received 25,001 calls a second but can serve 8,000.<br>GET_SCORE took 445.4 ms at the 99th percentile; the promise is 250 ms. Slowest hop: api at 313 % of capacity. | api runs at 31 % of what it can take in 'The toss', and 313 % at its busiest ('The last over'). |
| primary-only | Unavailable | When the cache restarts, all 25,000 origin reads hit one primary that serves 20,000. | In the hidden test 'The cache restarts mid-over', requests failed at db. | "db" has no spare. If it fails, GET_SCORE and UPDATE_SCORE stop. |
| big-origin | Over Budget | It passes every test at more than the budget. | This design costs ₹6,23,000 a month; the budget is ₹3,80,000. | This design costs ₹6,23,000 a month, over the budget of ₹3,80,000.<br>api costs ₹4,80,000 a month, 77 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_SCORE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: UPDATE_SCORE is never saved: its route does not reach sql, nosql or objectstore. | - |
