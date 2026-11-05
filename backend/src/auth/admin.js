// The owner's analytics (analytics.katta.cc): one summary of the usage events and accounts for the
// last `days` days, computed in MongoDB. Only accounts with role "admin" may read it (routes.js).
// Days are counted in India time, where the owner and most visitors are.
const TZ = 'Asia/Kolkata';
const count = { $sum: 1 };
const visitors = [{ $group: { _id: '$visitor' } }, { $count: 'n' }];

export async function adminSummary({ events, users }, { days = 7, now = Date.now() } = {}) {
  const from = new Date(now - days * 86_400_000);
  const [f] = await events.aggregate([
    { $match: { at: { $gte: from } } },
    { $facet: {
      totals: [{ $group: { _id: null, events: count, visitors: { $addToSet: '$visitor' }, users: { $addToSet: '$userId' } } },
        { $project: { _id: 0, events: 1, visitors: { $size: '$visitors' }, users: { $size: { $filter: { input: '$users', cond: { $ne: ['$$this', null] } } } } } }],
      daily: [{ $group: { _id: { $dateToString: { date: '$at', format: '%Y-%m-%d', timezone: TZ } }, visitors: { $addToSet: '$visitor' }, views: { $sum: { $cond: [{ $eq: ['$name', 'page_view'] }, 1, 0] } } } },
        { $project: { _id: 0, day: '$_id', visitors: { $size: '$visitors' }, views: 1 } }, { $sort: { day: 1 } }],
      byName: [{ $group: { _id: '$name', n: count } }, { $sort: { n: -1 } }],
      devices: [{ $group: { _id: { device: '$device', visitor: '$visitor' } } }, { $group: { _id: '$_id.device', visitors: count } }, { $sort: { visitors: -1 } }],
      pages: [{ $match: { name: 'page_view' } }, { $group: { _id: { section: '$props.section', slug: '$props.slug' }, views: count, visitors: { $addToSet: '$visitor' } } },
        { $project: { _id: 0, section: '$_id.section', slug: '$_id.slug', views: 1, visitors: { $size: '$visitors' } } }, { $sort: { views: -1 } }, { $limit: 20 }],
      referrers: [{ $match: { name: 'page_view', 'props.ref': { $nin: ['', null] } } }, { $group: { _id: '$props.ref', views: count, visitors: { $addToSet: '$visitor' } } },
        { $project: { _id: 0, ref: '$_id', views: 1, visitors: { $size: '$visitors' } } }, { $sort: { visitors: -1 } }, { $limit: 15 }],
      articles: [{ $match: { name: { $in: ['article_open', 'article_finish', 'article_close'] } } },
        { $group: { _id: { section: '$props.section', slug: '$props.slug' },
          opens: { $sum: { $cond: [{ $eq: ['$name', 'article_open'] }, 1, 0] } },
          finishes: { $sum: { $cond: [{ $eq: ['$name', 'article_finish'] }, 1, 0] } },
          pct: { $avg: { $cond: [{ $eq: ['$name', 'article_close'] }, '$props.pct', null] } },
          seconds: { $avg: { $cond: [{ $eq: ['$name', 'article_close'] }, '$props.seconds', null] } } } },
        { $project: { _id: 0, section: '$_id.section', slug: '$_id.slug', opens: 1, finishes: 1, pct: { $round: ['$pct', 0] }, seconds: { $round: ['$seconds', 0] } } }, { $sort: { opens: -1 } }, { $limit: 30 }],
      components: [{ $match: { name: 'component_add' } }, { $group: { _id: '$props.type', n: count } }, { $sort: { n: -1 } }],
      scores: [{ $match: { name: 'score' } }, { $group: { _id: '$props.challenge', attempts: count, visitors: { $addToSet: '$visitor' }, stars: { $avg: '$props.stars' }, best: { $max: '$props.stars' }, max: { $max: '$props.max' }, passed: { $push: '$props.passed' }, lite: { $sum: { $cond: ['$props.lite', 1, 0] } } } },
        { $project: { _id: 0, challenge: '$_id', attempts: 1, visitors: { $size: '$visitors' }, stars: { $round: ['$stars', 2] }, best: 1, max: 1, passed: 1, lite: 1 } }, { $sort: { attempts: -1 } }],
      challengeStarts: [{ $match: { name: 'challenge_start' } }, { $group: { _id: '$props.challenge', n: count } }, { $sort: { n: -1 } }],
      // the path from the home page to a score, as distinct visitors at each step
      landed: [{ $match: { name: 'page_view', 'props.section': 'landing' } }, ...visitors],
      locked: [{ $match: { name: 'lab_locked' } }, ...visitors],
      signedIn: [{ $match: { name: 'sign_in' } }, ...visitors],
      scored: [{ $match: { name: 'score' } }, ...visitors],
    } },
  ]).toArray();
  const n = (a) => a[0]?.n || 0;
  // pass rate per check, from strings like "101" (one digit per check, in the challenge's order)
  const scores = f.scores.map(({ passed, ...s }) => {
    const checks = [];
    for (const p of passed) if (typeof p === 'string') [...p].forEach((c, i) => { checks[i] = (checks[i] || 0) + (c === '1' ? 1 : 0); });
    const valid = passed.filter((p) => typeof p === 'string').length;
    return { ...s, checkPass: checks.map((k) => (valid ? Math.round((k / valid) * 100) : 0)) };
  });
  const [acc] = await users.aggregate([{ $facet: {
    total: [{ $count: 'n' }],
    fresh: [{ $match: { createdAt: { $gte: from } } }, { $count: 'n' }],
    active: [{ $match: { lastLoginAt: { $gte: from } } }, { $count: 'n' }],
    ads: [{ $match: { 'adsConsent.ads': true } }, { $count: 'n' }],
    countries: [{ $group: { _id: { $ifNull: ['$country', ''] }, n: count } }, { $sort: { n: -1 } }, { $limit: 15 }],
    recent: [{ $sort: { createdAt: -1 } }, { $limit: 25 }, { $project: { _id: 0, name: 1, email: 1, country: 1, createdAt: 1, lastLoginAt: 1, ads: { $ifNull: ['$adsConsent.ads', false] } } }],
  } }]).toArray();
  return {
    days, from: from.toISOString(), to: new Date(now).toISOString(), timezone: TZ,
    totals: { events: 0, visitors: 0, users: 0, ...(f.totals[0] || {}) },
    daily: f.daily, byName: Object.fromEntries(f.byName.map((x) => [x._id, x.n])),
    devices: f.devices.map((x) => ({ device: x._id, visitors: x.visitors })),
    pages: f.pages, referrers: f.referrers, articles: f.articles,
    lab: { components: f.components.map((x) => ({ type: x._id, n: x.n })), challengeStarts: f.challengeStarts.map((x) => ({ challenge: x._id, n: x.n })), scores },
    funnel: [['Visited the home page', n(f.landed)], ['Saw the locked Lab', n(f.locked)], ['Signed in', n(f.signedIn)], ['Scored a challenge', n(f.scored)]].map(([step, visitors]) => ({ step, visitors })),
    accounts: { total: n(acc.total), newInRange: n(acc.fresh), activeInRange: n(acc.active), adsOptIn: n(acc.ads), countries: acc.countries.map((x) => ({ country: x._id, n: x.n })), recent: acc.recent },
  };
}
