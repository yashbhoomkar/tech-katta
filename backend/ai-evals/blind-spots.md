# The AI evaluator's test designs

Every design passes the judge. A **flawed** design has a mistake the judge does not model; a correct review flags the
given line as a problem in one of the given categories. A **clean** design has no such mistake; any problem the
model raises on it is a false alarm. Generated from blind-spots.mjs (`node ai-evals/blind-spots.mjs`).

| Design | Kind | Finding | Flawed line | Categories | Why |
|---|---|---|---|---|---|
| rate-limiter/hot-window-key | flawed | A time-bucket partition key sends all current traffic to one partition | 5: `table kv.counters(window pk, user_id, calls) index(user_id)` | hot_key, key_choice | The counters are partitioned by window, so every user's counter for the current minute lives under one key: all 10,000 checks a second hit one partition. Partition by user_id. |
| chat-message-store/messages-keyed-by-id | flawed | The partition key is not the lookup key, so every read asks every node | 6: `table kv.messages(message_id pk, chat_id, body, sent_at) index(chat_id)` | key_choice | Messages are partitioned by message_id, so one chat's messages are spread over every node and opening a chat asks all of them through a secondary index. Partition by chat_id. |
| image-serving/images-in-kv | flawed | Large blobs kept in a key-value store | 4: `files = nosql(nodes=3, rf=3, w=2, r=2)` | wrong_store, cost | 200 KB photos, 20 crore of them, are kept in a key-value store. Large blobs belong in object storage, which is built for them and far cheaper per GB. |
| ticket-booking/one-row-per-show | flawed | A key too coarse for the rows, so they overwrite each other | 7: `table db.seats(show_id pk, seat_id, status, booking_id) index(seat_id)` | key_choice, consistency | show_id is the primary key of a SQL table, so there is one row per show: booking one seat overwrites the row of every other seat of that show. |
| ind-vs-pak-live-score/scores-in-kv-ten-keys | flawed | A handful of live entities hold all the traffic | 7: `table kv.scores(match_id pk, score, updated_at)` | hot_key | Scores are partitioned by match_id and only a handful of matches are live, so every score read and update lands on the few partitions that hold them while the other nodes idle. |
| url-shortener/links-keyed-by-time | flawed | A timestamp as primary key, so rows made in the same instant collide | 7: `table db.links(created_at pk, code, url) index(code)` | key_choice, consistency | created_at is the primary key, so two links made in the same instant collide and one overwrites the other. The code is the natural key. |
| image-serving/cdn-one-second | flawed | A CDN TTL far too short for content that never changes | 1: `cdn   = cdn(ttl_s=1)` | scaling, cost, other | Photos never change once uploaded, but the CDN keeps each one for a second, so it keeps going back to the origin for the same photo. A long TTL is safe here. |
| paste-bin/enumerable-ids | flawed | Sequential ids let anyone read private data by counting up | 5: `ids   = idgen(kind=counter)` | security, other | Pastes hold logs and config, often secrets, and are shared by link. Counter ids are 1, 2, 3...: anyone with one link can read every other paste by changing the number. Use ids nobody can guess. |
| rate-limiter/no-window-column | flawed | A missing column, so the limit never resets | 5: `table kv.counters(user_id pk, calls)` | key_choice, consistency, other | The counter has no window, so calls are counted forever: after a user's first 100 calls they are refused for good. The table needs the minute the count belongs to. |
| url-shortener/clients-read-the-store | flawed | Clients reach the data store directly, with no server in between | 9: `read  GET_LINK:    client > cache \| db` | security, other | Opens go from the client straight to the cache and the database: the store is exposed to the internet, and nothing checks the code, limits abusive clients or hides the database. Reads should go through the servers like writes do. |
| url-shortener/clean-snowflake-five-servers | clean | - | - | - | Snowflake ids and five servers instead of a counter and four: a sound variant. |
| chat-message-store/clean-eight-nodes | clean | - | - | - | Eight storage nodes instead of six, partitioned by chat_id: a sound variant. |
| url-shortener/reference | clean | - | - | - | The problem's reference design (a security point is fair) |
| paste-bin/reference | clean | - | - | - | The problem's reference design (a security point is fair) |
| rate-limiter/reference | clean | - | - | - | The problem's reference design |
| news-feed/reference | clean | - | - | - | The problem's reference design |
| notification-sender/reference | clean | - | - | - | The problem's reference design |
| image-serving/reference | clean | - | - | - | The problem's reference design |
| leaderboard/reference | clean | - | - | - | The problem's reference design |
| ticket-booking/reference | clean | - | - | - | The problem's reference design |
| chat-message-store/reference | clean | - | - | - | The problem's reference design |
| ind-vs-pak-live-score/reference | clean | - | - | - | The problem's reference design |
