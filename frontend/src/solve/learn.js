// Hints tied to the article that teaches them (context 36, step 14). Each opened hint links to up to two sections of the
// concept and component articles, matched on the idea the hint uses. Section titles are the articles' own h2 text; the
// article scrolls to the one named in ?at= (dashboard/article.jsx). Pure; learn.test.js checks every target exists.

export const ARTICLES = {
  concepts: { 'api-design': 'API design', caching: 'Caching', 'cap-theorem': 'CAP theorem', 'consistent-hashing': 'Consistent hashing', 'data-modelling': 'Data modelling', 'database-indexing': 'Database indexing', 'networking-essentials': 'Networking essentials', 'numbers-to-know': 'Numbers to know', sharding: 'Sharding' },
  'interview-questions': { 'how-to-answer': 'How to answer' },
  components: { 'api-gateways': 'API gateways', elasticsearch: 'Elasticsearch', flink: 'Flink', 'kafka-in-practice': 'Kafka in practice', postgresql: 'PostgreSQL', redis: 'Redis', zookeeper: 'ZooKeeper' },
};

// [what the hint says, section, article, heading]. Order matters: the more specific idea first.
export const RULES = [
  [/stampede|thundering|stale|invalidat/i, 'concepts', 'caching', 'When caching goes wrong'],
  [/evict|ttl\b|expir|how long it keeps|cache .*full/i, 'concepts', 'caching', 'When the cache is full'],
  [/\bcach|from memory/i, 'concepts', 'caching', 'Where to cache'],
  [/\bcdn\b/i, 'concepts', 'networking-essentials', 'Distance'],
  [/split (them|the [a-z ]+rows|it) over several|several databases share|more than one (database|storage node)|shard|hot key|hot partition|partition key/i, 'concepts', 'sharding', 'Shard keys and how to spread them'],
  [/consistent hash|hash ring|\(the ring\)/i, 'concepts', 'consistent-hashing', 'The hash ring'],
  [/multi-az|standby|failover|replica|\bzones?\b/i, 'components', 'postgresql', 'Replication and failover'],
  [/connection open|real-time gateway|websocket|server-sent|long.poll|push (them|it|updates|to)/i, 'concepts', 'networking-essentials', 'Pushing updates'],
  [/\bkafka|\bqueue|consumer|backlog|\bstream\b|drain the burst/i, 'components', 'kafka-in-practice', 'Kafka or a plain queue'],
  [/\bwindow|aggregat|count(s|ing)? (clicks|views|events)/i, 'components', 'flink', 'Event time, windows and watermarks'],
  [/full-text|search engine|elasticsearch|search by words/i, 'components', 'elasticsearch', 'How a search finds things'],
  [/sorted set|redis|leaderboard/i, 'components', 'redis', 'Five structures, five jobs'],
  [/\bindex/i, 'concepts', 'database-indexing', 'Database indexes in an interview'],
  [/rate.limit|throttl|card.testing/i, 'components', 'api-gateways', 'Rate limiting'],
  [/leader|election/i, 'components', 'zookeeper', 'Leader election, done properly'],
  [/double.book|oversell|\block|transaction|two people/i, 'components', 'postgresql', 'Row versions instead of locks'],
  [/eventual|strongly consistent|strong consistency|stale reads|consistency/i, 'concepts', 'cap-theorem', 'Consistency per feature, and the levels between strong and eventual'],
  [/idempoten|retry|retries|pagination|cursor/i, 'concepts', 'api-design', 'Everyday API patterns'],
  [/schema|table|columns?\b/i, 'concepts', 'data-modelling', 'From requirements to tables'],
  [/load balancer|spread (the )?load/i, 'concepts', 'networking-essentials', 'Spreading load'],
  [/before 8 pm|boot|c5\.|m5\.|one machine|takes about|size the|sized for|enough servers/i, 'concepts', 'numbers-to-know', 'What one machine can do'],
];
// When nothing in the text matches, the step decides.
const BY_STEP = {
  estimates: ['concepts', 'numbers-to-know', 'Using numbers well'],
  api: ['concepts', 'api-design', 'REST endpoints'],
  requirements: ['interview-questions', 'how-to-answer', '1. Requirements'],
};

// A hint ({step, x}) -> up to two {sec, slug, name, at, href}.
export function learnLinks(hint, max = 2) {
  const out = [], seen = new Set(), add = ([sec, slug, at]) => {
    if (seen.has(slug) || out.length >= max) return;
    seen.add(slug);
    out.push({ sec, slug, at, name: ARTICLES[sec]?.[slug] || slug, href: `/dashboard/${sec}/${slug}/?at=${encodeURIComponent(at)}` });
  };
  const text = String(hint?.x || '');
  for (const [re, sec, slug, at] of RULES) if (re.test(text)) add([sec, slug, at]);
  if (!out.length && BY_STEP[hint?.step]) add(BY_STEP[hint.step]);
  return out;
}
