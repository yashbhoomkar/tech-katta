// Request tests for every problem: the sample data, the API calls (request → data steps → response), the
// schema the reference design's databases hold (and engine changes where the problem needs one), and a
// wrong design that fails a request test. Writes into content/articles/interview-questions.
//   node requests.mjs          check and print what would change
//   node requests.mjs write    write it
// Re-running replaces what it wrote before (request tests, data, reference schemas, the "schema" wrong designs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'articles', 'interview-questions');
const NOW = '2026-11-07T10:00:00Z';
// A table: T('links', 'code:string long_url:string clicks:int', ['code'], {sortKey, ix: [['btree', 'a', 'b'], ['geo', 'loc']], ttl})
const T = (name, fields, key, o = {}) => ({ name, fields: fields.split(/\s+/).filter(Boolean).map((f) => { const [n, t] = f.split(':'); return { name: n, type: t || 'string' }; }), key, ...(o.sortKey ? { sortKey: o.sortKey } : {}), ...(o.ix ? { indexes: o.ix.map(([kind, ...fs]) => ({ fields: fs, kind })) } : {}), ...(o.ttl ? { ttl: o.ttl } : {}) });
const req = (method, p, body) => ({ method, path: p, ...(body ? { body } : {}) });

const SPEC = {
  'url-shortener': {
    data: { fields: ['code', 'long_url', 'user_id', 'created_at', 'expires_at', 'clicks'], aliases: { long_url: ['url', 'target_url', 'destination', 'original_url'], code: ['short_code', 'slug', 'short_id'], clicks: ['click_count', 'visits'] },
      entities: { links: { rows: 5e9, sample: [{ code: 'ab12x', long_url: 'https://zotato.in/menu/123', user_id: 'u7', created_at: '2026-11-01T08:00:00Z', expires_at: null, clicks: 41 }, { code: 'q9Lp', long_url: 'https://katta.cc/a', user_id: 'u2', created_at: '2026-11-02T08:00:00Z', expires_at: null, clicks: 3 }] } } },
    tests: [
      { id: 'api-create', name: 'Shorten a link', sample: true, desc: 'A user shortens a long link and gets its code back.', request: req('POST', '/v1/links', { long_url: 'https://zotato.in/cart/9', user_id: 'u7' }),
        steps: [{ id: 's1', op: 'put', entity: 'links', values: { code: 'Zx81k', long_url: 'https://zotato.in/cart/9', user_id: 'u7', created_at: NOW } }], respond: { status: 201, body: { code: '$s1.code', short_url: 'https://zot.to/{$s1.code}' } } },
      { id: 'api-redirect', name: 'Open a short link', sample: true, desc: 'Someone opens zot.to/ab12x and is sent to the long link.', request: req('GET', '/ab12x'),
        steps: [{ id: 's1', op: 'get', entity: 'links', by: { code: 'ab12x' }, fields: ['long_url'] }], respond: { status: 302, body: { location: '$s1.long_url' } } },
      { id: 'api-click', name: 'Count the click', async: true, desc: 'Each open adds one to the link\'s clicks; this can happen a moment later.', request: req('POST', '/v1/links/q9Lp/clicks'),
        steps: [{ id: 's1', op: 'update', entity: 'links', by: { code: 'q9Lp' }, add: { clicks: 1 } }], respond: { status: 202, body: { counted: true } } },
    ],
    schema: { db: [T('links', 'code long_url user_id created_at:time expires_at:time clicks:int', ['code'], { ix: [['btree', 'user_id']] })] },
    wrong: { name: 'Links keyed by a number', why: 'The links table is keyed by a running id, with nothing to find a link by its code: every redirect would read all 500 crore rows.', fails: 'api-redirect',
      schema: { db: [T('links', 'id:int code long_url user_id created_at:time clicks:int', ['id'])] } },
  },
  'key-value-store': {
    data: { fields: ['key', 'value', 'version', 'updated_at'], aliases: { key: ['k', 'item_key', 'kv_key'], value: ['val', 'data', 'blob_value'] },
      entities: { items: { rows: 1e10, sample: [{ key: 'user:42', value: { name: 'Asha' }, version: 3, updated_at: '2026-11-06T10:00:00Z' }] } } },
    tests: [
      { id: 'api-put', name: 'Put a value', sample: true, desc: 'A client stores a value under a key.', request: req('PUT', '/v1/kv/cart:9', { value: { items: 2 } }),
        steps: [{ id: 's1', op: 'put', entity: 'items', values: { key: 'cart:9', value: { items: 2 }, version: 1, updated_at: NOW } }], respond: { status: 200, body: { key: 'cart:9', version: '$s1.version' } } },
      { id: 'api-get', name: 'Get a value', sample: true, desc: 'A client reads the value stored under a key.', request: req('GET', '/v1/kv/user:42'),
        steps: [{ id: 's1', op: 'get', entity: 'items', by: { key: 'user:42' }, fields: ['value', 'version'] }], respond: { status: 200, body: { value: '$s1.value', version: '$s1.version' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4'].map((d) => [d, [T('items', 'key value:json version:int updated_at:time', ['key'])]])),
    wrong: { name: 'Values found by scanning', why: 'Items are keyed by a running id, so reading a key means searching 1,000 crore items.', fails: 'api-get',
      schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4'].map((d) => [d, [T('items', 'id:int key value:json version:int', ['id'])]])) },
  },
  autocomplete: {
    data: { fields: ['prefix', 'suggestions', 'updated_at'], aliases: { suggestions: ['top', 'completions', 'results', 'top_queries'] },
      entities: { prefixes: { rows: 5e7, sample: [{ prefix: 'piz', suggestions: ['pizza', 'pizza hut', 'pizza near me'], updated_at: NOW }, { prefix: 'bir', suggestions: ['biryani', 'biryani near me'], updated_at: NOW }] } } },
    tests: [
      { id: 'api-suggest', name: 'Suggestions for "piz"', sample: true, desc: 'The app asks for suggestions as someone types "piz".', request: req('GET', '/v1/suggest?q=piz'),
        steps: [{ id: 's1', op: 'get', entity: 'prefixes', by: { prefix: 'piz' }, fields: ['suggestions'] }], respond: { status: 200, body: { q: 'piz', suggestions: '$s1.suggestions' } } },
      { id: 'api-suggest-2', name: 'Suggestions for "bir"', desc: 'Another prefix, another ready list.', request: req('GET', '/v1/suggest?q=bir'),
        steps: [{ id: 's1', op: 'get', entity: 'prefixes', by: { prefix: 'bir' }, fields: ['suggestions'] }], respond: { status: 200, body: { q: 'bir', suggestions: '$s1.suggestions' } } },
    ],
    schema: { db1: [T('prefixes', 'prefix suggestions:list updated_at:time', ['prefix'])] },
    wrong: { name: 'Searches the query log', why: 'Only the raw log of searches is stored; nothing holds the ready suggestions for a prefix.', fails: 'api-suggest',
      schema: { db1: [T('searches', 'id:int query searched_at:time', ['id'])] } },
  },
  'menu-search': {
    data: { fields: ['dish_id', 'restaurant_id', 'name', 'city', 'price', 'veg'], aliases: { name: ['dish', 'title', 'dish_name'], veg: ['is_veg', 'vegetarian'] },
      entities: { dishes: { rows: 2e7, sample: [{ dish_id: 'd1', restaurant_id: 'r1', name: 'Paneer Tikka Roll', city: 'mumbai', price: 180, veg: true }, { dish_id: 'd2', restaurant_id: 'r2', name: 'Chicken Roll', city: 'mumbai', price: 200, veg: false }, { dish_id: 'd3', restaurant_id: 'r3', name: 'Paneer Butter Masala', city: 'pune', price: 260, veg: true }, { dish_id: 'd4', restaurant_id: 'r4', name: 'Paneer Roll Combo', city: 'mumbai', price: 220, veg: true }] } } },
    tests: [
      { id: 'api-search', name: 'Search "paneer roll" in Mumbai', sample: true, desc: 'Dishes in Mumbai with both words, cheapest first.', request: req('GET', '/v1/search?q=paneer+roll&city=mumbai'),
        steps: [{ id: 's1', op: 'query', entity: 'dishes', where: { city: 'mumbai' }, text: { field: 'name', q: 'paneer roll' }, order: { field: 'price' }, limit: 10, fields: ['dish_id', 'name', 'price'] }], respond: { status: 200, body: { results: '$s1' } } },
      { id: 'api-search-veg', name: 'Veg rolls only', desc: 'The same search with the veg filter.', request: req('GET', '/v1/search?q=roll&city=mumbai&veg=true'),
        steps: [{ id: 's1', op: 'query', entity: 'dishes', where: { city: 'mumbai', veg: true }, text: { field: 'name', q: 'roll' }, order: { field: 'price' }, limit: 10, fields: ['dish_id', 'name', 'price'] }], respond: { status: 200, body: { results: '$s1' } } },
    ],
    schema: { db1: [T('dishes', 'dish_id restaurant_id name:text city price:int veg:bool', ['dish_id'], { ix: [['text', 'name'], ['btree', 'city', 'price']] })] },
    wrong: { name: 'No word index', why: 'Dish names have no text index: finding "paneer roll" means reading all 2 crore dishes.', fails: 'api-search',
      schema: { db1: [T('dishes', 'dish_id restaurant_id name:text city price:int veg:bool', ['dish_id'], { ix: [['btree', 'city', 'price']] })] } },
  },
  'news-feed': {
    data: { fields: ['user_id', 'post_id', 'author_id', 'text', 'created_at'], aliases: { text: ['body', 'content', 'caption'], user_id: ['follower_id', 'reader_id', 'owner_id'] },
      entities: { feed_items: { rows: 2e10, sample: [{ user_id: 'u1', post_id: 'p3', created_at: '2026-11-07T09:00:00Z' }, { user_id: 'u1', post_id: 'p1', created_at: '2026-11-06T20:00:00Z' }, { user_id: 'u1', post_id: 'p2', created_at: '2026-11-07T08:00:00Z' }, { user_id: 'u2', post_id: 'p9', created_at: '2026-11-07T09:30:00Z' }] },
        posts: { rows: 5e9, sample: [{ post_id: 'p1', author_id: 'a1', text: 'Monsoon chai', created_at: '2026-11-06T20:00:00Z' }] } } },
    tests: [
      { id: 'api-feed', name: 'Open the home feed', sample: true, desc: 'The newest two posts in u1\'s feed (a feed holds up to 20,000 entries).', request: req('GET', '/v1/feed?user=u1&limit=2'),
        steps: [{ id: 's1', op: 'query', entity: 'feed_items', where: { user_id: 'u1' }, order: { field: 'created_at', desc: true }, limit: 2, fields: ['post_id', 'created_at'], matches: 20000 }], respond: { status: 200, body: { items: '$s1' } } },
      { id: 'api-post', name: 'Write a post', desc: 'A user posts; spreading it to followers\' feeds can follow.', request: req('POST', '/v1/posts', { author_id: 'a1', text: 'Weekend trek' }),
        steps: [{ id: 's1', op: 'put', entity: 'posts', values: { post_id: 'p10', author_id: 'a1', text: 'Weekend trek', created_at: NOW } }], respond: { status: 201, body: { post_id: '$s1.post_id' } } },
    ],
    schema: { db1: [T('feed_items', 'user_id post_id created_at:time', ['user_id', 'post_id'], { ix: [['btree', 'user_id', 'created_at']] }), T('posts', 'post_id author_id text:text created_at:time', ['post_id'], { ix: [['btree', 'author_id', 'created_at']] })] },
    wrong: { name: 'Feed without its order', why: 'Feed entries are found by user but not kept in time order: 20,000 entries would be sorted on every open.', fails: 'api-feed',
      schema: { db1: [T('feed_items', 'user_id post_id created_at:time', ['user_id', 'post_id'], { ix: [['btree', 'user_id']] }), T('posts', 'post_id author_id text:text created_at:time', ['post_id'])] } },
  },
  'restaurants-near-me': {
    data: { fields: ['restaurant_id', 'name', 'location', 'open', 'rating', 'cuisine'], aliases: { location: ['loc', 'geo', 'point', 'coords', 'lat_lng'], open: ['is_open', 'open_now'] },
      entities: { restaurants: { rows: 3e5, sample: [{ restaurant_id: 'r1', name: 'Dosa Corner', location: [19.076, 72.8777], open: true, rating: 4.4 }, { restaurant_id: 'r2', name: 'Bombay Biryani', location: [19.082, 72.882], open: true, rating: 4.1 }, { restaurant_id: 'r3', name: 'Late Night Rolls', location: [19.07, 72.87], open: false, rating: 4.6 }, { restaurant_id: 'r4', name: 'Pune Misal', location: [18.5204, 73.8567], open: true, rating: 4.8 }] } } },
    tests: [
      { id: 'api-nearby', name: 'Open restaurants near me', sample: true, desc: 'Open restaurants within 5 km of a point in Mumbai, nearest first.', request: req('GET', '/v1/restaurants?lat=19.0765&lng=72.878&open=true'),
        steps: [{ id: 's1', op: 'query', entity: 'restaurants', where: { open: true }, near: { field: 'location', at: [19.0765, 72.878], km: 5 }, limit: 10, fields: ['restaurant_id', 'name', 'rating'] }], respond: { status: 200, body: { restaurants: '$s1' } } },
      { id: 'api-status', name: 'A restaurant opens', desc: 'Late Night Rolls marks itself open.', request: req('PATCH', '/v1/restaurants/r3/status', { open: true }),
        steps: [{ id: 's1', op: 'update', entity: 'restaurants', by: { restaurant_id: 'r3' }, set: { open: true } }], respond: { status: 200, body: { restaurant_id: 'r3', open: true } } },
    ],
    schema: { db1: [T('restaurants', 'restaurant_id name location:geo open:bool rating:float cuisine', ['restaurant_id'], { ix: [['geo', 'location']] })] },
    wrong: { name: 'No geo index', why: 'Locations are stored but not indexed: "near this point" would measure all 3 lakh restaurants on every home screen.', fails: 'api-nearby',
      schema: { db1: [T('restaurants', 'restaurant_id name location:geo open:bool rating:float cuisine', ['restaurant_id'])] } },
  },
  'grocery-delivery': {
    data: { fields: ['store_id', 'item_id', 'qty', 'hold_id', 'expires_at'], aliases: { qty: ['quantity', 'stock', 'count', 'available'] },
      entities: { stock: { rows: 5e6, sample: [{ store_id: 's1', item_id: 'milk', qty: 12 }, { store_id: 's1', item_id: 'bread', qty: 0 }] }, holds: { rows: 1e6, sample: [] } } },
    tests: [
      { id: 'api-stock', name: 'Is milk in stock?', sample: true, desc: 'The app shows how much milk the nearest store has.', request: req('GET', '/v1/stores/s1/stock/milk'),
        steps: [{ id: 's1', op: 'get', entity: 'stock', by: { store_id: 's1', item_id: 'milk' }, fields: ['qty'] }], respond: { status: 200, body: { item_id: 'milk', qty: '$s1.qty' } } },
      { id: 'api-hold', name: 'Hold two milks while paying', sample: true, desc: 'Taking stock and recording the hold must happen together, and only if enough is left.', request: req('POST', '/v1/holds', { store_id: 's1', item_id: 'milk', qty: 2 }),
        steps: [{ id: 's1', op: 'tx', steps: [{ id: 'a', op: 'update', entity: 'stock', by: { store_id: 's1', item_id: 'milk' }, add: { qty: -2 }, cond: { qty: { gte: 2 } } }, { id: 'b', op: 'put', entity: 'holds', values: { hold_id: 'h1', store_id: 's1', item_id: 'milk', qty: 2, expires_at: '2026-11-07T10:10:00Z' } }] }], respond: { status: 201, body: { hold_id: 'h1', held: '$s1.ok' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('stock', 'store_id item_id qty:int', ['store_id', 'item_id']), T('holds', 'hold_id store_id item_id qty:int expires_at:time', ['hold_id'])]])),
    wrong: { name: 'Stock and holds in different databases', why: 'Stock lives in one database and holds in another, so taking stock and recording the hold can\'t be one transaction: a crash between them loses milk or holds nothing.', fails: 'api-hold',
      schema: { db1: [T('stock', 'store_id item_id qty:int', ['store_id', 'item_id'])], db2: [T('holds', 'hold_id store_id item_id qty:int expires_at:time', ['hold_id'])] } },
  },
  'photo-sharing': {
    engines: { db1: 's3' },
    data: { fields: ['photo_id', 'user_id', 'bytes', 'created_at'], aliases: { bytes: ['file', 'image', 'data', 'content', 'blob'] },
      entities: { photos: { rows: 1e10, sample: [{ photo_id: 'p1', user_id: 'u1', bytes: '<bytes>' }] } } },
    tests: [
      { id: 'api-upload', name: 'Upload a photo', sample: true, desc: 'The phone sends the photo\'s bytes.', request: req('PUT', '/v1/photos/p77'),
        steps: [{ id: 's1', op: 'blob', mode: 'put', entity: 'photos', key: { photo_id: 'p77' }, field: 'bytes' }], respond: { status: 201, body: { photo_id: 'p77', stored: '$s1.ok' } } },
      { id: 'api-view', name: 'View a photo', sample: true, desc: 'A follower opens photo p1.', request: req('GET', '/v1/photos/p1'),
        steps: [{ id: 's1', op: 'blob', mode: 'get', entity: 'photos', key: { photo_id: 'p1' }, field: 'bytes' }], respond: { status: 200, body: { photo_id: 'p1', found: '$s1.ok' } } },
    ],
    schema: { db1: [T('photos', 'photo_id bytes:blob', ['photo_id'])] },
    wrong: { name: 'Photos in a database table', why: 'The photo bytes go into database rows: every read, copy and backup carries them. Files belong in object storage.', fails: 'api-upload', engines: { db1: 'postgres' },
      schema: { db1: [T('photos', 'photo_id bytes:blob', ['photo_id'])] } },
  },
  'video-streaming': {
    engines: { db1: 's3' },
    data: { fields: ['video_id', 'quality', 'segment', 'bytes'], aliases: { segment: ['seq', 'chunk', 'part', 'segment_no'], bytes: ['file', 'data', 'content'] },
      entities: { segments: { rows: 5e10, sample: [{ video_id: 'v1', quality: '720p', segment: '0042', bytes: '<bytes>' }, { video_id: 'v1', quality: '360p', segment: '0042', bytes: '<bytes>' }] } } },
    tests: [
      { id: 'api-segment', name: 'Play the next segment', sample: true, desc: 'The player asks for segment 42 of video v1 in 720p.', request: req('GET', '/v1/videos/v1/720p/0042.ts'),
        steps: [{ id: 's1', op: 'blob', mode: 'get', entity: 'segments', key: { video_id: 'v1', quality: '720p', segment: '0042' }, field: 'bytes' }], respond: { status: 200, body: { segment: '0042', found: '$s1.ok' } } },
      { id: 'api-segment-low', name: 'Drop to 360p', desc: 'The network slows; the player asks for the same segment in 360p.', request: req('GET', '/v1/videos/v1/360p/0042.ts'),
        steps: [{ id: 's1', op: 'blob', mode: 'get', entity: 'segments', key: { video_id: 'v1', quality: '360p', segment: '0042' }, field: 'bytes' }], respond: { status: 200, body: { segment: '0042', found: '$s1.ok' } } },
    ],
    schema: { db1: [T('segments', 'video_id quality segment bytes:blob', ['video_id', 'quality', 'segment'])] },
    wrong: { name: 'Segments in the database', why: 'Video segments are stored as database rows: huge rows, slow reads and a database bill instead of cheap storage.', fails: 'api-segment', engines: { db1: 'postgres' },
      schema: { db1: [T('segments', 'video_id quality segment bytes:blob', ['video_id', 'quality', 'segment'])] } },
  },
  'chat-app': {
    data: { fields: ['chat_id', 'message_id', 'sender_id', 'text', 'sent_at'], aliases: { chat_id: ['conversation_id', 'room_id', 'thread_id'], text: ['body', 'content', 'message'] },
      entities: { messages: { rows: 5e11, sample: [] } } },
    tests: [
      { id: 'api-send', name: 'Send a message', sample: true, async: true, desc: 'u1 sends "hi" in chat c1. Delivery and storage can happen just after the reply.', request: req('POST', '/v1/chats/c1/messages', { sender_id: 'u1', text: 'hi' }),
        steps: [{ id: 's1', op: 'put', entity: 'messages', values: { chat_id: 'c1', message_id: 'm1', sender_id: 'u1', text: 'hi', sent_at: NOW } }], respond: { status: 202, body: { message_id: '$s1.message_id' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6'].map((d) => [d, [T('messages', 'chat_id message_id sender_id text:text sent_at:time', ['chat_id', 'message_id'])]])),
    wrong: { name: 'Messages without their chat', why: 'Messages are stored without the chat they belong to, so a chat\'s history can\'t be found.', fails: 'api-send',
      schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6'].map((d) => [d, [T('messages', 'message_id sender_id text:text sent_at:time', ['message_id'])]])) },
  },
  'dating-swipes': {
    data: { fields: ['swiper_id', 'target_id', 'liked', 'swiped_at'], aliases: { swiper_id: ['user_id', 'from_id', 'from_user'], target_id: ['other_id', 'to_id', 'profile_id', 'to_user'], liked: ['like', 'right', 'is_like'] },
      entities: { swipes: { rows: 1e11, sample: [{ swiper_id: 'u2', target_id: 'u1', liked: true, swiped_at: '2026-11-07T09:00:00Z' }] } } },
    tests: [
      { id: 'api-swipe', name: 'Swipe right', sample: true, async: true, desc: 'u1 likes u2. Matching can run a moment later.', request: req('POST', '/v1/swipes', { swiper_id: 'u1', target_id: 'u2', liked: true }),
        steps: [{ id: 's1', op: 'put', entity: 'swipes', values: { swiper_id: 'u1', target_id: 'u2', liked: true, swiped_at: NOW } }], respond: { status: 202, body: { recorded: true } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6', 'db7'].map((d) => [d, [T('swipes', 'swiper_id target_id liked:bool swiped_at:time', ['swiper_id', 'target_id'])]])),
    wrong: { name: 'Swipes without who was swiped', why: 'A swipe is stored without the person it was about, so a match can never be found.', fails: 'api-swipe',
      schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6', 'db7'].map((d) => [d, [T('swipes', 'swipe_id swiper_id liked:bool swiped_at:time', ['swipe_id'])]])) },
  },
  'ad-clicks': {
    data: { fields: ['ad_id', 'minute', 'clicks'], aliases: { minute: ['bucket', 'window', 'time', 'ts', 'minute_bucket'], clicks: ['count', 'total', 'click_count'] },
      entities: { click_counts: { rows: 1e9, sample: [{ ad_id: 'ad9', minute: '2026-11-07T10:01', clicks: 30 }] } } },
    tests: [
      { id: 'api-click', name: 'Count a click', sample: true, async: true, desc: 'A click on ad9 at 10:01 adds one to that minute\'s count.', request: req('POST', '/v1/clicks', { click_id: 'k1', ad_id: 'ad9', at: '2026-11-07T10:01:12Z' }),
        steps: [{ id: 's1', op: 'update', entity: 'click_counts', by: { ad_id: 'ad9', minute: '2026-11-07T10:01' }, add: { clicks: 1 } }], respond: { status: 202, body: { counted: true } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3'].map((d) => [d, [T('click_counts', 'ad_id minute clicks:int', ['ad_id', 'minute'])]])),
    wrong: { name: 'One row per click', why: 'Clicks are stored one row each, keyed by click: adding to a minute\'s count means searching 100 crore rows.', fails: 'api-click',
      schema: Object.fromEntries(['db1', 'db2', 'db3'].map((d) => [d, [T('click_counts', 'click_id ad_id minute clicks:int', ['click_id'])]])) },
  },
  leaderboard: {
    data: { fields: ['player_id', 'score', 'updated_at'], aliases: { player_id: ['user_id', 'player', 'gamer_id'], score: ['points', 'total', 'rating'] },
      entities: { scores: { rows: 1e8, sample: [{ player_id: 'p1', score: 900, updated_at: '2026-11-07T09:00:00Z' }] } } },
    tests: [
      { id: 'api-score', name: 'Add points after a match', sample: true, async: true, desc: 'p1 wins 50 points; the board can catch up a moment later.', request: req('POST', '/v1/scores', { player_id: 'p1', points: 50 }),
        steps: [{ id: 's1', op: 'update', entity: 'scores', by: { player_id: 'p1' }, add: { score: 50 } }], respond: { status: 202, body: { accepted: true } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3'].map((d) => [d, [T('scores', 'player_id score:int updated_at:time', ['player_id'], { ix: [['btree', 'score']] })]])),
    wrong: { name: 'Scores without players', why: 'Scores are stored by match, with no row per player to add to.', fails: 'api-score',
      schema: Object.fromEntries(['db1', 'db2', 'db3'].map((d) => [d, [T('matches', 'match_id winner points:int', ['match_id'])]])) },
  },
  'rider-dispatch': {
    data: { fields: ['driver_id', 'location', 'status', 'updated_at', 'trip_id', 'rider_id'], aliases: { location: ['loc', 'position', 'coords', 'lat_lng'], status: ['state'] },
      entities: { drivers: { rows: 5e5, sample: [{ driver_id: 'd1', location: [12.97, 77.59], status: 'free', updated_at: NOW }] }, trips: { rows: 1e9, sample: [] } } },
    tests: [
      { id: 'api-ping', name: 'A driver moves', sample: true, async: true, desc: 'Driver d1 sends a new position.', request: req('POST', '/v1/drivers/d1/location', { location: [12.971, 77.594] }),
        steps: [{ id: 's1', op: 'update', entity: 'drivers', by: { driver_id: 'd1' }, set: { location: [12.971, 77.594], updated_at: NOW } }], respond: { status: 202, body: { ok: true } } },
      { id: 'api-trip', name: 'A rider asks for a cab', async: true, desc: 'The trip is recorded; finding a driver follows.', request: req('POST', '/v1/trips', { rider_id: 'r1', pickup: [12.97, 77.59] }),
        steps: [{ id: 's1', op: 'put', entity: 'trips', values: { trip_id: 't1', rider_id: 'r1', status: 'searching' } }], respond: { status: 202, body: { trip_id: '$s1.trip_id' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('drivers', 'driver_id location:geo status updated_at:time', ['driver_id'], { ix: [['geo', 'location']] }), T('trips', 'trip_id rider_id driver_id status', ['trip_id'])]])),
    wrong: { name: 'Drivers without a position', why: 'Drivers are stored without their location, so nobody can find the nearest one.', fails: 'api-ping',
      schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('drivers', 'driver_id status', ['driver_id']), T('trips', 'trip_id rider_id driver_id status', ['trip_id'])]])) },
  },
  'shared-editor': {
    data: { fields: ['doc_id', 'version', 'op', 'author_id', 'at'], aliases: { op: ['operation', 'change', 'edit', 'delta'], version: ['seq', 'rev', 'revision'] },
      entities: { ops: { rows: 1e11, sample: [] } } },
    tests: [
      { id: 'api-edit', name: 'Type in a document', sample: true, async: true, desc: 'u1\'s edit becomes version 42 of document d1.', request: req('POST', '/v1/docs/d1/ops', { version: 42, op: { insert: 'hi', at: 10 } }),
        steps: [{ id: 's1', op: 'put', entity: 'ops', values: { doc_id: 'd1', version: 42, op: { insert: 'hi', at: 10 }, author_id: 'u1', at: NOW } }], respond: { status: 202, body: { version: '$s1.version' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6', 'db7'].map((d) => [d, [T('ops', 'doc_id version:int op:json author_id at:time', ['doc_id', 'version'])]])),
    wrong: { name: 'Edits keyed by a random id', why: 'Each edit is keyed by an id the client doesn\'t send, and nothing keeps edits of a document in order.', fails: 'api-edit',
      schema: Object.fromEntries(['db1', 'db2', 'db3', 'db4', 'db5', 'db6', 'db7'].map((d) => [d, [T('ops', 'op_id doc_id version:int op:json author_id at:time', ['op_id'])]])) },
  },
  'file-sync': {
    engines: { db2: 's3' },
    data: { fields: ['file_id', 'version', 'path', 'owner_id', 'updated_at', 'chunk_hash', 'bytes'], aliases: { chunk_hash: ['hash', 'chunk_id', 'sha'], bytes: ['data', 'content', 'file'] },
      entities: { files: { rows: 1e10, sample: [] }, chunks: { rows: 1e11, sample: [] } } },
    tests: [
      { id: 'api-chunk', name: 'Upload a changed chunk', sample: true, async: true, desc: 'Only the changed 4 MB chunk of a file is sent.', request: req('PUT', '/v1/chunks/9f2c'),
        steps: [{ id: 's1', op: 'blob', mode: 'put', entity: 'chunks', key: { chunk_hash: '9f2c' }, field: 'bytes' }], respond: { status: 202, body: { stored: true } } },
      { id: 'api-commit', name: 'Commit the new version', async: true, desc: 'The file\'s new version is recorded.', request: req('POST', '/v1/files/f1/versions', { version: 3, chunks: ['9f2c'] }),
        steps: [{ id: 's1', op: 'put', entity: 'files', values: { file_id: 'f1', version: 3, path: '/notes.txt', owner_id: 'u1', updated_at: NOW } }], respond: { status: 202, body: { version: '$s1.version' } } },
    ],
    schema: { db1: [T('files', 'file_id version:int path owner_id updated_at:time', ['file_id', 'version'])], db2: [T('chunks', 'chunk_hash bytes:blob', ['chunk_hash'])] },
    wrong: { name: 'Chunks in the database', why: 'File chunks are stored as database rows instead of in object storage.', fails: 'api-chunk', engines: { db2: 'postgres' },
      schema: { db1: [T('files', 'file_id version:int path owner_id updated_at:time', ['file_id', 'version'])], db2: [T('chunks', 'chunk_hash bytes:blob', ['chunk_hash'])] } },
  },
  notifications: {
    data: { fields: ['notification_id', 'user_id', 'channel', 'body', 'status', 'sent_at'], aliases: { body: ['text', 'message', 'content'], channel: ['type', 'via', 'medium'] },
      entities: { notifications: { rows: 1e10, sample: [] } } },
    tests: [
      { id: 'api-send', name: 'Send an OTP', sample: true, async: true, desc: 'An OTP by SMS for u1; the delivery workers send it.', request: req('POST', '/v1/notifications', { user_id: 'u1', channel: 'sms', body: 'OTP 4821' }),
        steps: [{ id: 's1', op: 'put', entity: 'notifications', values: { notification_id: 'n1', user_id: 'u1', channel: 'sms', body: 'OTP 4821', status: 'queued' } }], respond: { status: 202, body: { notification_id: '$s1.notification_id' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('notifications', 'notification_id user_id channel body:text status sent_at:time', ['notification_id'], { ix: [['btree', 'user_id']] })]])),
    wrong: { name: 'Notifications without a channel', why: 'Nothing records whether a message goes by SMS, push or email.', fails: 'api-send',
      schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('notifications', 'notification_id user_id body:text status', ['notification_id'])]])) },
  },
  'job-scheduler': {
    data: { fields: ['job_id', 'run_at', 'status', 'payload', 'lease_until'], aliases: { run_at: ['due_at', 'next_run', 'scheduled_at', 'when'], payload: ['data', 'args', 'body'] },
      entities: { jobs: { rows: 1e9, sample: [] } } },
    tests: [
      { id: 'api-schedule', name: 'Schedule a job', sample: true, async: true, desc: 'A daily report for 9 am tomorrow.', request: req('POST', '/v1/jobs', { run_at: '2026-11-08T09:00:00Z', payload: { report: 'daily' } }),
        steps: [{ id: 's1', op: 'put', entity: 'jobs', values: { job_id: 'j1', run_at: '2026-11-08T09:00:00Z', status: 'scheduled', payload: { report: 'daily' } } }], respond: { status: 202, body: { job_id: '$s1.job_id' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('jobs', 'job_id run_at:time status payload:json lease_until:time', ['job_id'], { ix: [['btree', 'run_at']] })]])),
    wrong: { name: 'Jobs without a due time', why: 'Jobs are stored without when they should run.', fails: 'api-schedule',
      schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('jobs', 'job_id status payload:json', ['job_id'])]])) },
  },
  'coding-judge': {
    data: { fields: ['submission_id', 'problem_id', 'user_id', 'language', 'code', 'status'], aliases: { code: ['source', 'program', 'solution', 'source_code'], language: ['lang'] },
      entities: { submissions: { rows: 1e9, sample: [] } } },
    tests: [
      { id: 'api-submit', name: 'Submit a solution', sample: true, async: true, desc: 'u1 submits Python code for "two-sum"; judging follows.', request: req('POST', '/v1/submissions', { problem_id: 'two-sum', language: 'python', code: 'print(1)' }),
        steps: [{ id: 's1', op: 'put', entity: 'submissions', values: { submission_id: 'sub1', problem_id: 'two-sum', user_id: 'u1', language: 'python', code: 'print(1)', status: 'queued' } }], respond: { status: 202, body: { submission_id: '$s1.submission_id', status: '$s1.status' } } },
    ],
    schema: { db1: [T('submissions', 'submission_id problem_id user_id language code:text status', ['submission_id'], { ix: [['btree', 'user_id']] })] },
    wrong: { name: 'Submissions without the code', why: 'The submitted code isn\'t stored, so the runners have nothing to run.', fails: 'api-submit',
      schema: { db1: [T('submissions', 'submission_id problem_id user_id status', ['submission_id'])] } },
  },
  'web-crawler': {
    data: { fields: ['url', 'host', 'status', 'fetched_at', 'content_hash'], aliases: { url: ['link', 'page_url'], host: ['domain', 'site'] },
      entities: { pages: { rows: 1e10, sample: [] } } },
    tests: [
      { id: 'api-seed', name: 'Add a site to crawl', sample: true, async: true, desc: 'A new seed URL joins the crawl.', request: req('POST', '/v1/seeds', { url: 'https://katta.cc/' }),
        steps: [{ id: 's1', op: 'put', entity: 'pages', values: { url: 'https://katta.cc/', host: 'katta.cc', status: 'queued' } }], respond: { status: 202, body: { queued: true } } },
    ],
    schema: { db1: [T('pages', 'url host status fetched_at:time content_hash', ['url'], { ix: [['btree', 'host']] })] },
    wrong: { name: 'Pages without their site', why: 'Pages are stored without their host, so the crawler can\'t keep each site\'s pace.', fails: 'api-seed',
      schema: { db1: [T('pages', 'url status fetched_at:time', ['url'])] } },
  },
  payments: {
    data: { fields: ['payment_id', 'idempotency_key', 'account_id', 'balance', 'amount', 'status'], aliases: { idempotency_key: ['idem_key', 'request_id', 'dedupe_key', 'idempotency'], amount: ['value', 'paise', 'rupees'] },
      entities: { accounts: { rows: 1e8, sample: [{ account_id: 'a_cust', balance: 5000 }, { account_id: 'a_shop', balance: 0 }] }, payments: { rows: 1e10, sample: [{ payment_id: 'pay_1', idempotency_key: 'k-77', amount: 500, status: 'succeeded' }] } } },
    tests: [
      { id: 'api-pay', name: 'Pay ₹500', sample: true, desc: 'Money leaves the customer, reaches the shop, and the payment is recorded, all or nothing.', request: req('POST', '/v1/payments', { idempotency_key: 'k-91', from: 'a_cust', to: 'a_shop', amount: 500 }),
        steps: [{ id: 's1', op: 'tx', steps: [{ id: 'a', op: 'update', entity: 'accounts', by: { account_id: 'a_cust' }, add: { balance: -500 }, cond: { balance: { gte: 500 } } }, { id: 'b', op: 'update', entity: 'accounts', by: { account_id: 'a_shop' }, add: { balance: 500 } }, { id: 'c', op: 'put', entity: 'payments', values: { payment_id: 'pay_2', idempotency_key: 'k-91', amount: 500, status: 'succeeded' } }] }],
        respond: { status: 201, body: { payment_id: 'pay_2', status: 'succeeded' } } },
      { id: 'api-retry', name: 'The app retries', sample: true, desc: 'A timeout makes the app send k-77 again: it gets the first result, not a second charge.', request: req('POST', '/v1/payments', { idempotency_key: 'k-77', from: 'a_cust', to: 'a_shop', amount: 500 }),
        steps: [{ id: 's1', op: 'get', entity: 'payments', by: { idempotency_key: 'k-77' }, fields: ['payment_id', 'status'] }], respond: { status: 200, body: { payment_id: '$s1.payment_id', status: '$s1.status' } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('accounts', 'account_id balance:int', ['account_id']), T('payments', 'payment_id idempotency_key amount:int status', ['payment_id'], { ix: [['unique', 'idempotency_key']] })]])),
    wrong: { name: 'Retries not found quickly', why: 'Payments have no index on the idempotency key: checking a retry means searching 1,000 crore payments.', fails: 'api-retry',
      schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('accounts', 'account_id balance:int', ['account_id']), T('payments', 'payment_id idempotency_key amount:int status', ['payment_id'])]])) },
  },
  'ticket-booking': {
    data: { fields: ['show_id', 'seat_id', 'status', 'held_by', 'hold_until'], aliases: { status: ['state', 'seat_status'], held_by: ['user_id', 'holder', 'held_for'] },
      entities: { seats: { rows: 1e7, sample: [{ show_id: 'ipl-final', seat_id: 'N-12', status: 'free', held_by: null, hold_until: null }] } } },
    tests: [
      { id: 'api-hold', name: 'Hold seat N-12', sample: true, async: true, desc: 'u1 holds a free seat for 10 minutes; only one person can get it.', request: req('POST', '/v1/shows/ipl-final/holds', { seat_id: 'N-12', user_id: 'u1' }),
        steps: [{ id: 's1', op: 'update', entity: 'seats', by: { show_id: 'ipl-final', seat_id: 'N-12' }, set: { status: 'held', held_by: 'u1', hold_until: '2026-11-07T10:10:00Z' }, cond: { status: { eq: 'free' } } }], respond: { status: 202, body: { seat_id: 'N-12', held: true } } },
    ],
    schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('seats', 'show_id seat_id status held_by hold_until:time', ['show_id', 'seat_id'])]])),
    wrong: { name: 'Seats without who holds them', why: 'A held seat doesn\'t record who holds it or until when, so it can never be given back.', fails: 'api-hold',
      schema: Object.fromEntries(['db1', 'db2'].map((d) => [d, [T('seats', 'show_id seat_id status', ['show_id', 'seat_id'])]])) },
  },
};

const withDb = (design, schema, engines) => ({ ...design, nodes: design.nodes.map((n) => { if (n.type !== 'database') return n; const { schema: _, ...config } = n.config || {}; const e = engines?.[n.id]; const c = { ...config, ...(e ? { engine: e } : {}) }; if (e && e !== 'postgres' && c.size && !c.size.startsWith('db.')) delete c.size; if (e === 's3') { delete c.size; delete c.multiAz; delete c.replicas; } if (e === 'postgres') delete c.engine; return { ...n, config: schema?.[n.id] ? { ...c, schema: { tables: schema[n.id] } } : c }; }) });
const write = process.argv[2] === 'write';
let changed = 0;
for (const [slug, spec] of Object.entries(SPEC)) {
  const file = path.join(root, slug + '.json'), a = JSON.parse(fs.readFileSync(file, 'utf8')), p = a.practice;
  for (const id of Object.keys(spec.schema)) if (!p.reference.nodes.some((n) => n.id === id && n.type === 'database')) throw new Error(`${slug}: no database ${id} in the reference`);
  p.data = spec.data;
  p.tests = p.tests.filter((t) => !t.request).concat(spec.tests.map((t) => ({ ...t, sample: !!t.sample })));
  p.reference = withDb(p.reference, spec.schema, spec.engines);
  p.wrong = p.wrong.filter((w) => !w.schemaWrong);
  const w = spec.wrong, base = withDb(p.reference, w.schema, { ...(spec.engines || {}), ...(w.engines || {}) });
  p.wrong.push({ name: w.name, why: w.why, fails: w.fails, schemaWrong: true, nodes: base.nodes, edges: base.edges });
  const out = JSON.stringify(a, null, 2) + '\n';
  if (out !== fs.readFileSync(file, 'utf8')) { changed++; if (write) fs.writeFileSync(file, out); }
  console.log(`${slug}: ${spec.tests.length} request tests, schema on ${Object.keys(spec.schema).join(', ')}${spec.engines ? `, engines ${JSON.stringify(spec.engines)}` : ''}`);
}
console.log(`${changed} file(s) ${write ? 'written' : 'would change'}`);
