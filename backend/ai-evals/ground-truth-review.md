# Ground truth, for a person to check

Generated from ground-truth.json (version 2) by `node ai-evals/ground-truth.mjs --sheet`. For each design: does
"A correct review leads with" name the same fault as the author? Mark any row that does not, and say what it should
lead with; the fix goes in OVERRIDES in ground-truth.mjs.

## url-shortener

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'A quiet afternoon', with 31 % to spare. | - |
| no-cache-one-server | Overloaded | One small server can't take the evening peak. | api received 2,525 calls a second but can serve 500.<br>GET_LINK took 472.7 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 505 % of capacity. | api runs at 40 % of what it can take in 'A quiet afternoon', and 505 % at its busiest ('Evening peak'). |
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
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is GET_PASTE p99 in 'An incident link goes round', with 24 % to spare. | - |
| small-cache | Too Slow | 2 GB holds only a fifth of the hot pastes at 10 KB each; half the reads miss and the database runs hot. | GET_PASTE took 89.2 ms at the 99th percentile; the promise is 80 ms. Slowest hop: db at 74 % of capacity. | db runs at 6 % of what it can take in 'A quiet hour', and 74 % at its busiest ('An incident link goes round'). |
| no-cache-small-servers | Overloaded | Two medium servers serve 2,000 calls a second; the peak sends 4,500. | api received 4,530 calls a second but can serve 2,000.<br>GET_PASTE took 602.2 ms at the 99th percentile; the promise is 80 ms. Slowest hop: api at 227 % of capacity. | api runs at 15 % of what it can take in 'A quiet hour', and 227 % at its busiest ('An incident link goes round'). |
| no-replica | Unavailable | When the only database dies, nothing takes over. | In the hidden test 'The database primary fails', requests failed at db. | "db" has no spare. If it fails, GET_PASTE and CREATE_PASTE stop. |
| async-replica | Data Lost | The replica is a second behind; the pastes of that second are gone after a failover. | In the hidden test 'The database primary fails', acknowledged writes were lost at db. | - |
| random-32-bit-ids | Wrong Answer | 5 crore random 32-bit ids repeat lakhs of times. | With 5 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| huge-cache | Over Budget | It passes every test, but 64 GB of cache costs more than the whole budget allows. | This design costs ₹1,86,000 a month; the budget is ₹1,50,000. | This design costs ₹1,86,000 a month, over the budget of ₹1,50,000.<br>cache costs ₹96,000 a month, 52 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_PASTE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: CREATE_PASTE is never saved: its route does not reach sql, nosql or objectstore. | - |

## rate-limiter

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'A normal afternoon', with 14 % to spare. | - |
| sql-counters | Overloaded | A large SQL primary takes 2,500 writes a second; every call is a write, 10,000 a second. | db received 10,050 calls a second but can serve 2,509.<br>CHECK took 356.3 ms at the 99th percentile; the promise is 100 ms. Slowest hop: db at 401 % of capacity. | db runs at 40 % of what it can take in 'A normal afternoon', and 401 % at its busiest ('Evening peak'). |
| write-to-all-copies | Unavailable | w=3 needs all three copies of a counter; when one node dies, every check fails. | In the hidden test 'A storage node dies', requests failed at kv. | - |
| too-few-servers | Overloaded | Four large servers serve 8,000 calls a second; the peak sends 10,000. | api received 10,050 calls a second but can serve 8,000.<br>CHECK took 418.6 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 126 % of capacity. | api runs at 13 % of what it can take in 'A normal afternoon', and 126 % at its busiest ('Evening peak'). |
| three-nodes | Too Slow | Six large servers run at 84 % of what they can take at the peak, so the slowest checks wait longer than the promise allows. Three storage nodes are enough here. | CHECK took 149.8 ms at the 99th percentile; the promise is 100 ms. Slowest hop: api at 84 % of capacity. | api runs at 9 % of what it can take in 'A normal afternoon', and 84 % at its busiest ('Evening peak'). |
| huge-cluster | Over Budget | Twelve nodes pass every test at well over the budget. | This design costs ₹2,66,000 a month; the budget is ₹1,60,000. | This design costs ₹2,66,000 a month, over the budget of ₹1,60,000.<br>api costs ₹1,44,000 a month, 54 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: CHECK is never saved: its route does not reach sql, nosql or objectstore.<br>Line 6: GET_USAGE never reaches a place where the data lives (sql, nosql or objectstore). | - |

## news-feed

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is GET_FEED p50 in 'Dinner-time peak', with 13 % to spare. | - |
| short-ttl-no-invalidate | Too Slow | A 30-second TTL keeps the feeds fresh, but with 50 lakh feeds hardly any is asked for twice in 30 seconds: most opens miss. | GET_FEED took 16.1 ms for the median request; the promise is 14 ms. | api runs at 7 % of what it can take in 'Morning', and 55 % at its busiest ('Dinner-time peak'). |
| long-ttl-no-invalidate | Wrong Answer | A feed could be an hour old; the problem allows 30 seconds. | GET_FEED can return data up to 3600 s old, but this problem allows 30 s. Look at the cache TTL, or invalidate on write. | - |
| sql-feeds | Overloaded | 800 posts a second land on one SQL primary with the cache's misses; a medium primary takes 1,000 writes a second in all. | db received 2,370 calls a second but can serve 1,791.<br>GET_FEED took 249.0 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 132 % of capacity. | db runs at 24 % of what it can take in 'Morning', and 132 % at its busiest ('Dinner-time peak'). |
| quick-writes | Data Lost | w=1: a post is acknowledged when one copy has it; that node's death loses it. | In the hidden test 'A storage node dies', acknowledged writes were lost at kv.<br>In the hidden test 'A storage node dies', requests failed. | - |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹3,68,000 a month; the budget is ₹1,75,000. | This design costs ₹3,68,000 a month, over the budget of ₹1,75,000.<br>cache costs ₹1,92,000 a month, 52 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_FEED never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: POST is never saved: its route does not reach sql, nosql or objectstore. | - |

## notification-sender

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | worker runs at 25 % of what it can take in 'A steady hour', and 100 % at its busiest ('The match starts').<br>db runs at 20 % of what it can take in 'A steady hour', and 80 % at its busiest ('The match starts').<br>The tightest promise is the budget in 'A steady hour', with 11 % to spare. | - |
| no-queue | Overloaded | Without a queue the database takes the spike directly: 5,000 writes a second against a large primary's 2,500. | db received 5,000 calls a second but can serve 2,500. | db runs at 20 % of what it can take in 'A steady hour', and 200 % at its busiest ('The match starts'). |
| one-small-worker | Too Slow | One small worker does 500 a second, exactly the normal rate: the backlog from the spike never drains. | SEND was still waiting 540 s after it was accepted; the promise is 180 s. worker can do 500 a second but 5,000 arrive. | worker runs at 100 % of what it can take in 'A steady hour'. |
| async-replica | Data Lost | A failover loses the last second of written notifications. | In the hidden test 'The database fails during a spike', acknowledged writes were lost at db. | - |
| too-few-servers | Overloaded | The servers still take the whole spike before the queue: two large serve 4,000 a second. | api received 5,000 calls a second but can serve 4,000. | api runs at 13 % of what it can take in 'A steady hour', and 125 % at its busiest ('The match starts'). |
| many-workers | Over Budget | Twelve large workers clear the spike at once, at far more than the budget. | This design costs ₹2,88,000 a month; the budget is ₹1,75,000. | This design costs ₹2,88,000 a month, over the budget of ₹1,75,000.<br>worker costs ₹1,44,000 a month, 50 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: SEND is never saved: its route does not reach sql, nosql or objectstore. | - |

## image-serving

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is GET_IMAGE p99 in 'Dinner time', with 11 % to spare. | - |
| no-cdn | Overloaded | Every image view reaches the load balancer: 60,000 a second against its 50,000. | api received 60,050 calls a second but can serve 4,000.<br>GET_IMAGE took 482.6 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 1501 % of capacity.<br>GET_IMAGE took 120.6 ms for the median request; the promise is 10 ms. | api runs at 50 % of what it can take in 'An afternoon', and 1501 % at its busiest ('Dinner time'). |
| cache-behind-servers | Overloaded | A cache behind the servers doesn't protect the servers or the load balancer: all 60,000 views still go through them. | api received 60,050 calls a second but can serve 4,000.<br>GET_IMAGE took 521.1 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 1501 % of capacity.<br>GET_IMAGE took 120.0 ms for the median request; the promise is 10 ms. | api runs at 50 % of what it can take in 'An afternoon', and 1501 % at its busiest ('Dinner time'). |
| one-server | Overloaded | 5 % of views miss the CDN: 3,000 a second, more than one medium server's 1,000. | api received 3,050 calls a second but can serve 1,000.<br>GET_IMAGE took 458.2 ms at the 99th percentile; the promise is 160 ms. Slowest hop: api at 305 % of capacity. | api runs at 11 % of what it can take in 'An afternoon', and 305 % at its busiest ('Dinner time'). |
| random-32-bit-ids | Wrong Answer | 20 crore images with random 32-bit names repeat. | With 20 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| many-servers | Over Budget | Forty servers do what the CDN already does, at far more than the budget. | This design costs ₹2,47,000 a month; the budget is ₹60,000. | This design costs ₹2,47,000 a month, over the budget of ₹60,000.<br>api costs ₹2,40,000 a month, 97 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_IMAGE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: UPLOAD_IMAGE is never saved: its route does not reach sql, nosql or objectstore. | - |

## leaderboard

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'Before the match', with 12 % to spare. | - |
| no-index | Too Slow | The top list is looked up by game_id, which has no index: every miss reads the whole table, and takes a hundred times as long. | GET_TOP took 1169.2 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 13 % of capacity. | db runs at 8 % of what it can take in 'Before the match'. |
| minute-ttl | Wrong Answer | A one-minute TTL shows scores up to 60 s old; the problem allows 5 s. | GET_TOP can return data up to 61 s old, but this problem allows 5 s. Look at the cache TTL, or invalidate on write. | - |
| medium-db | Overloaded | 1,200 score writes a second against a medium primary's 1,000. | db received 1,260 calls a second but can serve 1,050. | db runs at 20 % of what it can take in 'Before the match', and 120 % at its busiest ('During the match'). |
| no-cache | Overloaded | Every top-list read goes to the primary, which is already busy with score writes. | db received 7,200 calls a second but can serve 5,854.<br>GET_TOP took 252.3 ms at the 99th percentile; the promise is 120 ms. Slowest hop: db at 123 % of capacity. | db runs at 21 % of what it can take in 'Before the match', and 123 % at its busiest ('During the match'). |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹3,29,000 a month; the budget is ₹1,90,000. | This design costs ₹3,29,000 a month, over the budget of ₹1,90,000.<br>db costs ₹1,80,000 a month, 55 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_TOP never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: SUBMIT_SCORE is never saved: its route does not reach sql, nosql or objectstore. | - |

## ticket-booking

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'The day before', with 17 % to spare. | - |
| cache-not-cleared | Wrong Answer | A booked seat can still show as free for a minute: someone else picks it and is told it's gone. | After a write, GET_SEATS must show the new data at once. Yours reads from cache, which can be behind. | - |
| replica-reads | Wrong Answer | Async replicas are a second behind: a seat you just booked can show as free. | After a write, GET_SEATS must show the new data at once. Yours reads from db, which can be behind. | - |
| async-replica | Data Lost | A failover loses the last second of confirmed bookings: tickets people paid for vanish. | In the hidden test 'The database primary fails', acknowledged writes were lost at db. | - |
| medium-db | Overloaded | 1,200 bookings a second against a medium primary's 1,000 writes. | db received 2,400 calls a second but can serve 1,500.<br>GET_SEATS took 290.4 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 160 % of capacity.<br>BOOK took 688.2 ms at the 99th percentile; the promise is 250 ms. Slowest hop: db at 160 % of capacity. | db runs at 7 % of what it can take in 'The day before', and 160 % at its busiest ('10 am: sales open'). |
| random-ids | Wrong Answer | Random 32-bit booking ids repeat across 50 crore bookings. | With 50 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| big-everything | Over Budget | It passes every test at more than the budget. | This design costs ₹3,29,000 a month; the budget is ₹2,00,000. | This design costs ₹3,29,000 a month, over the budget of ₹2,00,000.<br>db costs ₹1,80,000 a month, 55 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_SEATS never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: BOOK is never saved: its route does not reach sql, nosql or objectstore. | - |

## chat-message-store

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'Lunch time', with 19 % to spare. | - |
| one-copy-each-way | Wrong Answer | r=1 and w=1 with rf=3: a read can miss the copy that has your new message (r + w must be more than rf). | After a write, GET_MESSAGES must show the new data at once. Yours reads from kv, which can be behind. | - |
| write-all-read-one | Unavailable | w=3 needs every copy; when one node dies, no message can be sent. | In the hidden test 'A storage node dies', requests failed at kv.<br>In the hidden test 'A storage node dies', requests failed. | - |
| write-one-read-all | Data Lost | w=1: a message acknowledged by one node dies with that node. | In the hidden test 'A storage node dies', acknowledged writes were lost at kv.<br>In the hidden test 'A storage node dies', requests failed.<br>In the hidden test 'A storage node dies', requests failed. | - |
| sql-messages | Overloaded | 5,000 messages a second against a large SQL primary's 2,500 writes. | db received 15,000 calls a second but can serve 4,615.<br>GET_MESSAGES took 282.9 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 325 % of capacity.<br>SEND_MESSAGE took 682.9 ms at the 99th percentile; the promise is 150 ms. Slowest hop: db at 325 % of capacity. | db runs at 65 % of what it can take in 'Lunch time', and 325 % at its busiest ('Dinner time'). |
| random-ids | Wrong Answer | Random 32-bit message ids repeat across 500 crore messages. | With 500 crore items, 32-bit random ids are expected to collide. Use more bits, or a counter. | - |
| big-cluster | Over Budget | It passes every test at more than the budget. | This design costs ₹3,22,000 a month; the budget is ₹2,25,000. | This design costs ₹3,22,000 a month, over the budget of ₹2,25,000.<br>kv costs ₹2,00,000 a month, 62 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_MESSAGES never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: SEND_MESSAGE is never saved: its route does not reach sql, nosql or objectstore. | - |

## ind-vs-pak-live-score

| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |
|---|---|---|---|---|
| reference | Accepted | (passes every test: where it would break first) | The tightest promise is the budget in 'The toss', with 13 % to spare. | - |
| no-cdn | Overloaded | 2 lakh reads a second reach the load balancer, which takes 50,000. | api received 20,001 calls a second but can serve 14,000.<br>GET_SCORE took 416.0 ms at the 99th percentile; the promise is 250 ms. Slowest hop: api at 143 % of capacity. | api runs at 143 % of what it can take in 'The toss'. |
| cdn-minute-ttl | Wrong Answer | The CDN keeps a score for a minute; the problem allows 5 seconds. | GET_SCORE can return data up to 62 s old, but this problem allows 5 s. Look at the cache TTL, or invalidate on write. | - |
| thin-origin | Overloaded | 5 % of 2 lakh reads miss the CDN: 10,000 a second, more than four large servers serve. | api received 10,001 calls a second but can serve 8,000.<br>GET_SCORE took 433.5 ms at the 99th percentile; the promise is 250 ms. Slowest hop: api at 125 % of capacity. | api runs at 13 % of what it can take in 'The toss', and 125 % at its busiest ('The last over'). |
| primary-only | Unavailable | When the cache restarts, all 10,000 origin reads hit one primary that serves 8,000. | In the hidden test 'The cache restarts mid-over', requests failed at db. | "db" has no spare. If it fails, GET_SCORE and UPDATE_SCORE stop. |
| big-origin | Over Budget | It passes every test at more than the budget. | This design costs ₹3,83,000 a month; the budget is ₹2,60,000. | This design costs ₹3,83,000 a month, over the budget of ₹2,60,000.<br>api costs ₹2,40,000 a month, 63 % of the total. |
| template | Invalid Design | The starting template, before the learner has changed anything. | Line 5: GET_SCORE never reaches a place where the data lives (sql, nosql or objectstore).<br>Line 6: UPDATE_SCORE is never saved: its route does not reach sql, nosql or objectstore. | - |
