// Usage events for analysis (techkatta_app.events). Sent by the site in small batches; no cookies are
// added for this: a visitor is a random id the browser keeps (localStorage), and a signed-in visitor's
// account id is added from their existing session. Only the events and fields below are stored, so
// nothing else a client sends ends up in the database. Events are deleted after RETENTION_DAYS.
//   { name, at, visitor, userId?, device, page, props }
export const RETENTION_DAYS = 395; // 13 months

const S = 'string', N = 'number', B = 'boolean';
const ARTICLE = { section: S, slug: S };
export const EVENTS = {
  page_view: { section: S, slug: S, ref: S },
  article_open: ARTICLE,
  article_finish: { ...ARTICLE, seconds: N },
  article_close: { ...ARTICLE, pct: N, seconds: N },
  read_aloud: { from: N },
  lab_open: { embedded: B, challenge: S },
  component_add: { type: S },
  run_start: { nodes: N, challenge: S },
  challenge_start: { challenge: S },
  score: { challenge: S, stars: N, max: N, passed: S, lite: B },
  lab_locked: { lite: B },
  sign_in: { ads: B }, sign_out: {}, sign_out_all: {}, delete_account: {}, ads_consent: { ads: B },
};
export const MAX_BATCH = 50;
const VISITOR = /^[a-z0-9]{16,40}$/;
const TEXT = /^[\w.:/ -]{0,80}$/;

// One batch from the site → documents to store (invalid events are dropped, not the whole batch).
// `now` is the server's clock; each event's `age` (ms before sending) is trusted for at most 15 min.
export function cleanBatch(body, { now = Date.now(), userId = null } = {}) {
  if (!body || typeof body !== 'object' || !VISITOR.test(String(body.visitor || ''))) return [];
  const device = body.device === 'phone' ? 'phone' : 'desktop';
  const list = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  const docs = [];
  for (const e of list) {
    const spec = e && typeof e.name === 'string' && Object.hasOwn(EVENTS, e.name) ? EVENTS[e.name] : null;
    if (!spec) continue;
    const props = {};
    for (const [k, type] of Object.entries(spec)) {
      const v = e.props?.[k];
      if (type === S && typeof v === 'string' && TEXT.test(v)) props[k] = v;
      else if (type === N && typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e9) props[k] = Math.round(v * 100) / 100;
      else if (type === B && typeof v === 'boolean') props[k] = v;
    }
    const age = Math.min(Math.max(Number(e.age) || 0, 0), 15 * 60_000);
    const page = typeof e.page === 'string' ? e.page.slice(0, 200).replace(/[^\w./#:-]/g, '') : '';
    docs.push({ name: e.name, at: new Date(now - age), visitor: body.visitor, ...(userId ? { userId } : {}), device, page, props });
  }
  return docs;
}
