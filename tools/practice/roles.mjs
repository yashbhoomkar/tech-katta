// The parts each problem needs (roles on the reference design, checked by the "normal" test) and its
// key decisions (multiple choice, graded exactly). Writes them into content/articles/interview-questions.
//   node roles.mjs          check and print what would change
//   node roles.mjs write    write it
// Re-running is safe: role checks, roles on the reference and the "general parts" wrong design are
// replaced, not added twice. The right option's position is spread deterministically (not always first).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'articles', 'interview-questions');
const D = (id, q, options, why) => ({ id, q, options, why }); // options[0] is the right one

// roles: {nodeId: role} on the reference; checks: role checks added to the "normal" test.
const SPEC = {
  'url-shortener': {
    roles: { db: 'kv' },
    checks: [{ role: 'kv', label: 'Every redirect looks the short code up in a store built for lookups by key' }],
    decisions: [
      D('codes', 'How do you make short codes that never collide?', ['A counter handed out in blocks to each server, written in base 62', 'Hash the long URL and keep the first 7 characters', 'Pick 7 random characters and hope', 'Use the database row id as it is'], 'Blocks of a counter give every server unique numbers without asking anyone per request, and base 62 keeps them short. A hash can collide and needs a check and retry; a raw id is long and shows how many links exist.'),
      D('redirect', 'Which redirect does the short link send?', ['302 (temporary): every click comes back to us, so we can count it and change or expire the link', '301 (permanent): browsers remember it and stop asking us'], 'A 301 saves traffic, but browsers stop asking, so click counts, edits and expiry stop working. Shorteners that count clicks use 302.'),
      D('reads', 'Where are most redirects answered?', ['A cache in front of the store: a few popular links get most clicks', 'The database, with an index on the code', 'The load balancer'], 'Clicks follow a steep curve: a small set of links gets most of them, so a cache answers most redirects and the store sees only the misses.'),
    ],
  },
  'key-value-store': {
    roles: { db1: 'kv', db2: 'kv', db3: 'kv', db4: 'kv' },
    checks: [{ role: 'kv', min: 3, label: 'Every get and put lands on storage nodes built for lookups by key, spread over several machines' }],
    decisions: [
      D('placement', 'How do you decide which machine holds a key?', ['Consistent hashing: a ring of virtual nodes', 'The key modulo the number of machines', 'One database that lists every key\'s machine', 'A random machine, then ask all of them'], 'With "modulo N", adding one machine moves almost every key. On a ring only the keys next to the new machine move. A central list of keys is a bottleneck and a single point of failure.'),
      D('quorum', 'Each key is kept on 3 machines. How many copies must answer a write and a read so the read sees the write?', ['2 for writes and 2 for reads (W + R > N)', '1 for writes and 1 for reads', 'All 3 for writes, 1 for reads'], 'When W + R is more than N, every read overlaps at least one copy that has the latest write. W = 2, R = 2 keeps working with one machine down; W = 3 fails writes whenever any copy is down.'),
      D('conflict', 'Two clients wrote the same key on both sides of a network split. What then?', ['Keep both versions (version vectors) and let the reader or the app merge them', 'Keep the one with the later server clock and drop the other', 'Refuse every write during any split'], 'Clocks on different machines disagree, so "last write wins" can throw away the newer write without anyone knowing. Version vectors show the two writes were concurrent and keep both.'),
    ],
  },
  autocomplete: {
    roles: { cache1: 'prefix', cache2: 'prefix' },
    checks: [{ role: 'prefix', label: 'Every keystroke gets suggestions that are ready for its prefix, not searched for' }],
    decisions: [
      D('lookup', 'Someone types "piz". How do you find suggestions?', ['Look the prefix up in a table of top suggestions kept for every prefix', 'Search all past queries LIKE \'piz%\' on each keystroke', 'Send each keystroke to a full-text search engine'], 'Suggestions must come back in tens of milliseconds for every keystroke. A ready list per prefix is one lookup; scanning queries or full-text search per keystroke is far too slow at this rate.'),
      D('refresh', 'How often are the top suggestions rebuilt?', ['Every few minutes to an hour, in the background, from recent search logs', 'Instantly on every search', 'Once a year'], 'Popular searches change over minutes and hours, not milliseconds. Rebuilding in the background keeps the read path a plain lookup.'),
      D('client', 'What cuts the load most before it reaches you?', ['Wait about 100 ms after the last keystroke, and cache answers in the app', 'A bigger database', 'Send every keystroke twice to be safe'], 'Most keystrokes are followed by another within 100 ms; skipping those and remembering recent answers on the phone removes a large share of requests.'),
    ],
  },
  'menu-search': {
    roles: { db1: 'search' },
    checks: [{ role: 'search', label: 'Every search goes to something that finds dishes by the words in them, with filters' }],
    decisions: [
      D('index', 'Searching "paneer roll" across lakhs of menus: how?', ['An inverted index (each word → the dishes that have it) in a search engine', 'SQL LIKE \'%paneer%\' on the menu table', 'Loop over every menu in the app server'], 'LIKE with a leading % can\'t use an index and reads every row. An inverted index goes straight from each word to its dishes and can rank them.'),
      D('fresh', 'A restaurant changes a price. How does search learn it?', ['The change is published as an event and the index updates within seconds', 'The whole index is rebuilt every night only', 'Search reads the main database on every query'], 'Events keep the index a few seconds behind the menu without making searches hit the main database.'),
      D('typos', '"panir" should still find paneer. How?', ['Fuzzy matching and synonyms when words are indexed and searched', 'Ask people to spell it right', 'Store every misspelling as a separate dish'], 'Search engines compare words within an edit distance and map synonyms, so common misspellings and local names still match.'),
    ],
  },
  'news-feed': {
    roles: { cache1: 'feed', cache2: 'feed' },
    checks: [{ role: 'feed', label: 'Opening the app reads a feed that was put together before the user asked' }],
    decisions: [
      D('fanout', 'Someone posts. When are their followers\' feeds updated?', ['Push to followers\' feeds at post time for most people; for accounts with millions of followers, merge their posts in when a feed is read', 'Only when each follower opens the app (merge everyone they follow then)', 'Push to every follower at post time, whoever posts'], 'Pushing makes reads one lookup, but a celebrity post would mean millions of writes at once. Pulling just those few accounts at read time keeps both sides cheap.'),
      D('items', 'What is stored in a feed list?', ['Post ids only; the posts are fetched (and cached) separately', 'Full copies of each post with text and images', 'Screenshots of posts'], 'Ids keep each feed small; an edited or deleted post changes in one place instead of in every follower\'s copy.'),
      D('paging', 'How does the app page through the feed?', ['A cursor: "posts older than this id"', 'Page numbers (?page=7)', 'Send the whole feed at once'], 'New posts arrive at the top all the time, so page numbers shift and show repeats or skip posts. A cursor always continues from the last post seen.'),
    ],
  },
  'restaurants-near-me': {
    roles: { db1: 'geo' },
    checks: [{ role: 'geo', label: 'Every home-screen lookup goes through something that can find restaurants near a point' }],
    decisions: [
      D('near', 'How do you find restaurants within 5 km quickly?', ['Index them by map cell (geohash or quadtree) and look in the user\'s cell and its neighbours', 'Work out the distance to every restaurant on each request', 'Ask a maps company on every request'], 'Cells turn "near this point" into a few index lookups. Measuring the distance to every restaurant on every request does not scale to lakhs of them.'),
      D('status', 'Open-now and delivery status change all day. Where does that live?', ['Kept separately and updated as it changes; applied as a filter after the geo lookup', 'Inside the geo index, rebuilt nightly', 'Hard-coded in the app'], 'Locations rarely change but status changes often. Keeping status apart means the geo index stays stable and status is always current.'),
      D('cache', 'Many people in the same area ask the same thing. What helps most?', ['Cache results per map cell for a minute or two', 'A bigger database', 'Make people wait'], 'Everyone in one cell gets the same list, so a short cache per cell answers most home screens.'),
    ],
  },
  'grocery-delivery': {
    roles: { cache1: 'holds', cache2: 'holds' },
    checks: [{ role: 'holds', label: 'Items in a basket being paid for are held so nobody else can take them, and the hold lapses by itself' }],
    decisions: [
      D('last', 'Two people pay for the last packet of milk at the same moment. How do you not sell it twice?', ['One atomic step: take it only if stock is above zero (or hold it first)', 'Check the stock, then subtract, as two separate steps', 'Sell both and refund one later'], 'Between a separate check and subtract, the other order can slip in. A conditional update or a hold does both in one step, so only one can win.'),
      D('abandon', 'Someone leaves halfway through paying. What happens to their held items?', ['The hold expires after a few minutes and the stock comes back', 'They stay held until staff clear them', 'They are sold anyway'], 'Holds with an expiry free stock by themselves, so abandoned baskets never block other shoppers for long.'),
      D('store', 'Which store packs an order?', ['The nearest dark store that has every item, found from the delivery location', 'Any store in the city', 'The biggest warehouse'], 'Ten-minute delivery only works from a store a few kilometres away, and only if it has everything in the basket.'),
    ],
  },
  'photo-sharing': {
    roles: { db1: 'objects' },
    checks: [{ role: 'objects', label: 'Photo bytes are kept in storage built for big files, not in the rows of a table' }],
    decisions: [
      D('upload', 'How does a phone upload a photo?', ['Ask the API for a signed upload link, then send the bytes straight to object storage', 'Stream the bytes through your app servers', 'Email it to the service'], 'Big uploads through app servers tie them up for seconds each. A signed link lets storage take the bytes while the API handles only the small metadata.'),
      D('sizes', 'Phones on slow networks need small images. When are smaller sizes made?', ['A few sizes, once, in the background after upload', 'Resized on every view', 'The phone shrinks what it downloads'], 'Resizing once is cheap; resizing on every view repeats the work millions of times, and shrinking on the phone wastes its data.'),
      D('serve', 'Who serves photos to viewers?', ['A CDN in front of the storage', 'App servers read storage on each view', 'The database'], 'Popular photos are viewed again and again from all over; a CDN answers from servers near the viewer.'),
    ],
  },
  'video-streaming': {
    roles: { db1: 'objects' },
    checks: [{ role: 'objects', label: 'Video segments come from storage built for big files' }],
    decisions: [
      D('segments', 'Why cut videos into short segments (HLS or DASH)?', ['Players switch quality between segments as the network changes, and CDNs cache each segment', 'They take less disk space', 'Uploads are faster'], 'Short segments let the player pick the next one at a quality that fits the connection right now, and each one is a small file a CDN can cache.'),
      D('transcode', 'When are the different qualities made?', ['Once after upload, by transcoders taking work from a queue', 'On the fly for every viewer', 'Never: send the original file'], 'Transcoding is slow and heavy. Doing it once per video, in the background, means every viewer gets ready-made files.'),
      D('resume', 'A phone loses its network halfway through uploading a 2 GB video. Then?', ['The upload resumes from the last chunk it sent', 'Start again from zero', 'Fail the upload'], 'Resumable uploads in chunks mean a dropped connection costs one chunk, not the whole file.'),
    ],
  },
  'chat-app': {
    roles: { app1: 'websocket', app2: 'websocket', db1: 'wide', db2: 'wide', db3: 'wide', db4: 'wide', db5: 'wide', db6: 'wide' },
    checks: [
      { role: 'websocket', label: 'Messages reach online users over connections that stay open' },
      { role: 'wide', label: 'Messages are kept in a store built for very many writes, split by conversation and in time order' },
    ],
    decisions: [
      D('push', 'How does a message reach a friend who is online?', ['Pushed the moment it arrives, over a connection that stays open (WebSocket)', 'Their app asks every few seconds (polling)', 'By email'], 'Polling either delays messages or floods the servers with empty requests. An open connection delivers in milliseconds and costs nothing while quiet.'),
      D('order', 'Messages in a chat must show in the same order for everyone. How?', ['A sequence number per conversation, given by the server', 'Sort by each phone\'s clock', 'Any order is fine'], 'Phone clocks disagree. A per-conversation number from the server gives one order that every device agrees on.'),
      D('offline', 'The friend is offline. What happens to the message?', ['It is stored; delivered when they reconnect, with a push notification meanwhile', 'It is dropped', 'The server keeps retrying the connection forever'], 'Store and forward: the message is safe in storage, and a push notification tells them to open the app.'),
      D('split', 'How are messages split across machines?', ['By conversation id, sorted by time inside each conversation', 'By message length', 'One table on one machine'], 'Opening a chat reads one conversation\'s latest messages: keeping each conversation together and in time order makes that one quick read.'),
    ],
  },
  'dating-swipes': {
    roles: { work1: 'matcher', work2: 'matcher', db1: 'wide', db2: 'wide', db3: 'wide', db4: 'wide', db5: 'wide', db6: 'wide', db7: 'wide' },
    checks: [
      { role: 'matcher', behind: 'queue', label: 'Matches are found away from the swipe itself, after the swipe is safely stored' },
      { role: 'wide', label: 'Swipes are kept in a store built for very many writes' },
    ],
    decisions: [
      D('match', 'Two people like each other. How do you spot the match?', ['On each right swipe, check whether the other person already liked you', 'Scan all swipes every night', 'Ask people to tell you'], 'A match can only happen at the moment of the second like, so checking then is one lookup and the match shows up at once.'),
      D('async', 'Swipes are almost all of the writes. What should a swipe not do?', ['Wait for slow work: store it, then match in the background', 'Be stored at all', 'Lock the whole user table'], 'People swipe fast. Storing the swipe and answering at once keeps the app snappy; matching and notifications can run a moment later.'),
      D('deck', 'How do you choose who to show next?', ['Keep a ready stack of nearby candidates per user, refilled in the background', 'Search all users on every swipe', 'Show everyone in the order they signed up'], 'Each swipe should only take the next card. Building the stack ahead of time keeps search work off the swipe path.'),
    ],
  },
  'ad-clicks': {
    roles: { queue: 'log', work1: 'aggregator', work2: 'aggregator', db1: 'timeseries', db2: 'timeseries', db3: 'timeseries' },
    checks: [
      { role: 'log', label: 'Clicks wait in a store that keeps them in order and can replay them' },
      { role: 'aggregator', behind: 'queue', label: 'Clicks are counted as they stream in, per ad and time window' },
      { role: 'timeseries', label: 'Counts are kept per time bucket, ready to sum for any range' },
    ],
    decisions: [
      D('exact', 'Advertisers pay per click. A counting server crashes halfway. What keeps the counts right?', ['Clicks stay in a replayable log, and each click is counted by its id so a replay never counts it twice', 'Counts are kept in the server\'s memory only', 'Advertisers count on their side'], 'Replay recovers what the crashed server hadn\'t saved; counting by click id makes replaying safe.'),
      D('buckets', 'Reports by minute, hour and day: how?', ['Count each click into per-minute buckets; add buckets up for hours and days', 'Recount all raw clicks for each report', 'Keep daily totals only'], 'Small buckets are cheap to update and any range is a sum of a few of them; raw recounts get slower every day.'),
      D('fraud', 'Bots click ads too. What do you do?', ['Mark suspicious clicks (same address, too fast, no page view) and leave them out before billing', 'Nothing', 'Block every click from phones'], 'Advertisers only pay for real clicks; filtering before billing keeps the bill honest without losing real clicks.'),
    ],
  },
  leaderboard: {
    roles: { work1: 'aggregator', work2: 'aggregator', cache1: 'sortedset', cache2: 'sortedset' },
    checks: [
      { role: 'sortedset', label: 'Ranks are read from something that keeps players ordered by score' },
      { role: 'aggregator', behind: 'queue', label: 'Score updates are applied at a steady pace, not on the request' },
    ],
    decisions: [
      D('rank', 'The top 10, and my rank among 1 crore players, instantly. How?', ['A sorted set in memory: top players and any rank in log time', 'ORDER BY score in the database each time', 'Recompute the ranking every night'], 'Sorting a crore rows per request is far too slow, and nightly ranks are stale. A sorted set keeps the order as scores change.'),
      D('burst', 'A match ends and a million scores arrive at once. Then?', ['Queue them; workers apply them at a steady pace', 'Write each straight into the sorted set from the API', 'Reject them'], 'The queue absorbs the burst; ranks are a few seconds behind for a moment, and nothing falls over.'),
      D('restart', 'The in-memory store restarts. What about the rankings?', ['Rebuilt from the scores kept in the database', 'Lost for good', 'Players enter their scores again'], 'Memory is fast but not the record. The database keeps every score, so the sorted set can be rebuilt.'),
    ],
  },
  'rider-dispatch': {
    roles: { cache1: 'geo', cache2: 'geo', cache3: 'geo', work1: 'matcher', work2: 'matcher' },
    checks: [
      { role: 'geo', label: 'Drivers\' live positions are held where "nearest to this point" is quick to answer' },
      { role: 'matcher', behind: 'queue', label: 'Riders are paired with drivers away from the location updates' },
    ],
    decisions: [
      D('pings', 'Drivers send their location every 4 seconds. Where does it go?', ['An in-memory geo index that keeps only the latest position; the trail goes to cheap storage', 'A new row in the main database every time', 'Nowhere'], 'Lakhs of pings a second would bury the main database. Matching only needs where each driver is now.'),
      D('offer', 'How do you find a driver for a rider?', ['Look at the nearest few free drivers by map cell and offer the trip to one at a time, with a timeout', 'Message every driver in the city', 'The driver who joined first'], 'A few nearby candidates keep the search small; one offer at a time avoids two drivers accepting the same trip.'),
      D('double', 'Two riders must never get the same driver. How?', ['Mark the driver as offered in one atomic step; the second rider gets the next driver', 'It is fine if it happens', 'The driver chooses on a call'], 'An atomic "offer only if free" means exactly one rider can claim each driver.'),
    ],
  },
  'shared-editor': {
    roles: { app1: 'websocket', app2: 'websocket', work1: 'sync', work2: 'sync', db1: 'oplog', db2: 'oplog', db3: 'oplog', db4: 'oplog', db5: 'oplog', db6: 'oplog', db7: 'oplog' },
    checks: [
      { role: 'websocket', label: 'Everyone in a document gets others\' edits over connections that stay open' },
      { role: 'sync', behind: 'queue', label: 'Edits are merged in order by a part that takes them from a queue' },
      { role: 'oplog', label: 'Edits are stored in order so the document can be replayed' },
    ],
    decisions: [
      D('merge', 'Two people type in the same paragraph at once. What happens?', ['Operational transforms or CRDTs merge both edits the same way on every device', 'Lock the paragraph for one person', 'The last save wins'], 'Locks get in the way of writing together and "last save wins" loses work. OT and CRDTs make every copy end up the same with both edits kept.'),
      D('store', 'How is a document stored?', ['Every edit is added to a log, with a snapshot now and then', 'The whole document on every keystroke', 'Only when someone presses Save'], 'Small edits are cheap to add and keep history; snapshots mean nobody replays a year of edits to open the document.'),
      D('live', 'How do other people\'s cursors and edits appear?', ['Pushed over open connections to everyone in the document', 'Each app asks every 10 seconds', 'By email'], 'Writing together only feels live if edits arrive within a fraction of a second.'),
    ],
  },
  'file-sync': {
    roles: { work1: 'sync', work2: 'sync', db2: 'objects' },
    checks: [
      { role: 'sync', behind: 'queue', label: 'Changes are merged and sent to other devices by a part that takes them from a queue' },
      { role: 'objects', any: true, label: 'File contents are kept in storage built for big files' },
    ],
    decisions: [
      D('chunks', 'A 1 GB file changes by one line. What gets uploaded?', ['Only the changed chunks (files are split into chunks named by a hash of their bytes)', 'The whole file', 'Nothing'], 'Chunking means a small edit sends a few megabytes, and identical chunks are stored once across all users.'),
      D('conflict', 'The same file was edited offline on two laptops. Then?', ['Keep both: save a "conflicted copy" and tell the user', 'The last one to sync quietly wins', 'Refuse to sync'], 'Silently picking one throws away someone\'s work; a conflicted copy keeps both for the person to sort out.'),
      D('notify', 'How do your other devices find out about a change?', ['A notification (push or long poll), then they fetch changes since their last cursor', 'They list every file every minute', 'They don\'t'], 'Listing everything constantly is heavy. A small "something changed" signal and a cursor fetch only what is new.'),
    ],
  },
  notifications: {
    roles: { work1: 'sender', work2: 'sender' },
    checks: [{ role: 'sender', behind: 'queue', label: 'Notifications are sent, and retried, by workers taking them from a queue' }],
    decisions: [
      D('provider', 'The SMS provider is down for 10 minutes. What happens?', ['Retry with growing gaps, then switch to a second provider; messages wait in the queue meanwhile', 'Those notifications fail', 'Quietly send them by email instead'], 'Outside providers do fail. The queue holds the messages, retries space out, and a second provider keeps OTPs flowing.'),
      D('dupes', 'A retry might send the same OTP twice. How do you stop that?', ['Each notification has an id; senders skip ids already sent', 'It doesn\'t matter', 'Never retry'], 'Retries are needed, so sending has to be safe to repeat: an id makes the second attempt a no-op.'),
      D('priority', 'A sale message to 1 crore people and login OTPs go out together. Which first?', ['Separate queues: OTPs and order updates ahead of marketing', 'One queue, first come first served', 'Marketing first'], 'An OTP that arrives after the sale blast is useless. Separate queues keep urgent messages moving whatever the backlog.'),
    ],
  },
  'job-scheduler': {
    roles: { work1: 'scheduler', work2: 'scheduler', db1: 'jobs', db2: 'jobs' },
    checks: [
      { role: 'jobs', label: 'Jobs are kept in order of the time they are due' },
      { role: 'scheduler', behind: 'queue', label: 'Due jobs are handed out from a queue to the part that runs them' },
    ],
    decisions: [
      D('due', 'How do you find the jobs due now?', ['Keep jobs indexed by due time and read the next few', 'Scan every job every second', 'One timer thread per job'], 'An index by due time makes "what\'s next" a short read however many jobs there are.'),
      D('lease', 'A worker dies halfway through a job. What happens?', ['Workers claim jobs with a lease; if a job isn\'t finished in time, another worker takes it', 'The job is lost', 'Every job always runs on two workers'], 'A lease means a crashed worker\'s job comes back by itself, without running every job twice.'),
      D('idem', 'For retries to be safe, a job should be…', ['Idempotent: running it twice has the same effect as once', 'Fast', 'Short'], 'With leases and retries, a job can run more than once; making it idempotent makes that harmless.'),
    ],
  },
  'coding-judge': {
    roles: { work1: 'sandbox', work2: 'sandbox' },
    checks: [{ role: 'sandbox', behind: 'queue', label: 'Submitted code runs in sealed boxes, taking work from a queue' }],
    decisions: [
      D('where', 'Where does a submission\'s code run?', ['In sandboxed runners with limits on CPU, memory, time and network', 'On the API servers', 'On the user\'s laptop'], 'The code could be anything: an endless loop, a fork bomb, a network attack. It must run sealed off and limited, away from everything else.'),
      D('rush', 'A contest starts and 50,000 people submit in a minute. Then?', ['Queue them; runners take them at their own pace while the page shows "judging…"', 'Run each one as the request arrives', 'Refuse submissions'], 'Runners have a fixed capacity; the queue turns a spike into a short wait instead of crashed runners.'),
      D('tests', 'Where are the hidden test cases?', ['Only on the runners\' side', 'Sent to the browser', 'In the problem statement'], 'Anything sent to the browser can be read, so hidden tests stay with the runners.'),
    ],
  },
  'web-crawler': {
    roles: { queue: 'frontier', work1: 'fetcher', work2: 'fetcher' },
    checks: [
      { role: 'frontier', label: 'Links wait in line per website, so no site is hit too often' },
      { role: 'fetcher', behind: 'queue', label: 'Pages are downloaded by parts that take links from that line' },
    ],
    decisions: [
      D('polite', 'How do you avoid overloading one website?', ['One line of links per site with a gap between fetches, and respect robots.txt', 'Fetch as fast as possible', 'Only crawl at night'], 'A crawler that hammers a site gets blocked, and it is rude. Per-site lines with delays spread the load.'),
      D('seen', 'How do you avoid fetching the same page twice?', ['Remember a fingerprint of every link seen (a Bloom filter or a set)', 'Don\'t worry about it', 'Crawl only home pages'], 'The web links to the same pages over and over; checking a compact set of seen links saves most of the work.'),
      D('io', 'Fetching is mostly waiting on the network. So each fetcher machine…', ['Keeps many connections open at once (asynchronous I/O)', 'Fetches one page at a time', 'Runs inside the database'], 'While one page is on its way, hundreds of others can be too; one at a time leaves the machine idle.'),
    ],
  },
  payments: {
    roles: { db1: 'ledger', db2: 'ledger' },
    checks: [{ role: 'ledger', label: 'Every money movement is recorded in an append-only record that balances' }],
    decisions: [
      D('idem', 'The app retries "Pay ₹500" after a timeout. How do you not charge twice?', ['An idempotency key per payment: a repeat returns the first result', 'Hope it doesn\'t happen', 'Charge, then refund duplicates by hand'], 'Timeouts don\'t say whether the payment went through, so clients must retry; the key makes the retry return the original result.'),
      D('ledger', 'How is money recorded?', ['Double entry: each movement is a debit and a credit, only ever added, never edited', 'A balance column updated in place', 'A spreadsheet'], 'An append-only ledger keeps the full history; balances are sums that can always be checked and explained.'),
      D('recon', 'Your records and the bank\'s disagree at the end of the day. What do you do?', ['Reconcile: compare with the bank\'s report daily and fix differences with new entries', 'Trust your own records', 'Delete the differences'], 'Banks and networks have the final word on money that moved. Daily reconciliation finds the gaps, and corrections are new entries, so history stays intact.'),
    ],
  },
  'ticket-booking': {
    roles: { work1: 'reservation', work2: 'reservation' },
    checks: [{ role: 'reservation', behind: 'queue', label: 'Seats are held and confirmed by a part that takes bookings from a line' }],
    decisions: [
      D('line', 'Lakhs of people arrive at 10:00 for 40,000 seats. What do they hit?', ['A waiting room that lets people in at the rate booking can handle', 'The booking service, all at once', 'Whoever refreshes fastest wins'], 'The booking service can only confirm so many seats a second. A waiting room is fair and keeps it from falling over.'),
      D('hold', 'How is a seat kept while someone pays?', ['Marked as held with an expiry in one atomic step, and released if not paid in time', 'Not held: the first payment wins', 'Held until the show'], 'Holding atomically means two people can\'t pick the same seat, and the expiry returns seats from abandoned payments.'),
      D('once', 'What finally stops the same seat being sold twice?', ['A unique rule on (show, seat) or an update that only succeeds if the seat is still free', 'Customer support fixes it later', 'Nothing: it is rare'], 'The database itself refuses the second sale, so no bug or race elsewhere can double-sell a seat.'),
    ],
  },
};

const pick = (slug, id, n) => { let h = 0; for (const c of slug + ':' + id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };
const write = process.argv[2] === 'write';
let changed = 0;
for (const [slug, spec] of Object.entries(SPEC)) {
  const file = path.join(root, slug + '.json'), a = JSON.parse(fs.readFileSync(file, 'utf8')), p = a.practice;
  const ids = new Set(p.reference.nodes.map((n) => n.id));
  for (const id of Object.keys(spec.roles)) if (!ids.has(id)) throw new Error(`${slug}: no node ${id} in the reference`);
  const withRoles = (d) => ({ ...d, nodes: d.nodes.map((n) => { const { role, ...config } = n.config || {}; const r = spec.roles[n.id]; return { ...n, config: r && p.reference.nodes.find((x) => x.id === n.id)?.type === n.type ? { ...config, role: r } : config }; }) });
  const general = (d) => ({ ...d, nodes: d.nodes.map((n) => { const { role, ...config } = n.config || {}; return { ...n, config }; }) });
  p.reference = withRoles(p.reference);
  p.wrong = p.wrong.filter((w) => w.fails !== 'normal' || !w.general).map((w) => withRoles(w));
  const g = general(p.reference);
  p.wrong.push({ name: 'Right sizes, general parts', why: 'The sizes and redundancy are right, but no component does the job this problem turns on, so the design would carry the traffic without doing what was asked.', fails: 'normal', general: true, nodes: g.nodes, edges: g.edges });
  const normal = p.tests.find((t) => t.id === 'normal');
  normal.checks = normal.checks.filter((c) => c.kind !== 'role').concat(spec.checks.map((c) => ({ kind: 'role', ...c })));
  p.rubric.decisions = spec.decisions.map((d) => { const at = pick(slug, d.id, d.options.length), opts = [...d.options.slice(1)]; opts.splice(at, 0, d.options[0]); return { id: d.id, q: d.q, options: opts, answer: at, why: d.why }; });
  const out = JSON.stringify(a, null, 2) + '\n';
  if (out !== fs.readFileSync(file, 'utf8')) { changed++; if (write) fs.writeFileSync(file, out); }
  console.log(`${slug}: ${Object.keys(spec.roles).length} roles, ${spec.checks.length} checks, ${spec.decisions.length} decisions`);
}
console.log(`${changed} file(s) ${write ? 'written' : 'would change'}`);
