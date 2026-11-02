// The landing page's "Can your design survive IND vs PAK?" challenge (no UI; also run by
// challenge.test.js). Every number comes from content (site.json `challenge`).
//
// A match is a curve of live viewers (crore) over its minutes. Each viewer streams video at `mbps`.
// A CDN serves `offload` of that from servers near the viewers; the rest comes from your origin
// servers, each able to send `serverGbps`. When the origin needs more than the servers running can
// send, the share of viewers it cannot serve sees buffering.
//
// Scaling: "prewarm" runs all your servers from before the toss. "auto" starts with what the
// pre-match crowd needs and adds servers to stay near `target` load, but new ones take
// `bootMinutes` to arrive, so a sudden jump (the toss, the last over) hits the servers already
// running. Removing servers waits `scaleInMinutes` of low load. You pay for the servers running.

const CRORE = 1e7;

// Viewers (crore) at a minute: linear between the curve's [minute, crore] points.
export function viewersAt(curve, m) {
  if (m <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) if (m <= curve[i][0]) {
    const [a, va] = curve[i - 1], [b, vb] = curve[i];
    return b === a ? vb : va + (vb - va) * (m - a) / (b - a);
  }
  return curve.at(-1)[1];
}

// Gbps the origin must send for `crore` viewers with a CDN that serves `offload` (0–1) of it.
export const originGbps = (ch, crore, offload) => crore * CRORE * ch.mbps / 1000 * (1 - offload);

// Play a whole match minute by minute. choice = {servers, cdn (option id), scaling: 'auto'|'prewarm'}.
// Returns per-minute rows and a summary.
export function playMatch(ch, choice) {
  const offload = (ch.cdn.options.find((o) => o.id === choice.cdn) || ch.cdn.options[0]).offload;
  const max = Math.max(1, Math.round(choice.servers)), end = ch.viewers.at(-1)[0];
  const need = (m) => originGbps(ch, viewersAt(ch.viewers, m), offload) / ch.serverGbps; // servers at 100%
  const want = (m) => Math.min(max, Math.max(1, Math.ceil(need(m) / ch.autoscale.target - 1e-9)));
  let running = choice.scaling === 'prewarm' ? max : want(0), low = 0;
  const booting = []; // [{at, n}]
  const rows = [];
  let serverMinutes = 0, badMinutes = 0, worst = { m: 0, crore: 0 };
  for (let m = 0; m <= end; m++) {
    for (const b of booting.filter((x) => x.at <= m)) running = Math.min(max, running + b.n);
    booting.splice(0, booting.length, ...booting.filter((x) => x.at > m));
    if (choice.scaling !== 'prewarm') {
      const w = want(m), coming = booting.reduce((a, b) => a + b.n, 0);
      if (w > running + coming) { booting.push({ at: m + ch.autoscale.bootMinutes, n: w - running - coming }); low = 0; }
      else if (w < running && !coming) { if (++low >= ch.autoscale.scaleInMinutes) { running = w; low = 0; } }
      else low = 0;
    }
    const crore = viewersAt(ch.viewers, m), gbps = originGbps(ch, crore, offload), cap = running * ch.serverGbps;
    const failing = gbps > cap ? crore * (1 - cap / gbps) : 0; // crore viewers buffering
    if (failing > 1e-9) badMinutes++;
    if (failing > worst.crore) worst = { m, crore: failing };
    serverMinutes += running;
    rows.push({ m, crore, running, load: cap ? gbps / cap : Infinity, failing });
  }
  const peak = rows.reduce((a, r) => (r.crore > a.crore ? r : a), rows[0]);
  return { rows, offload, peakCrore: peak.crore, peakServers: Math.max(...rows.map((r) => r.running)), badMinutes, worst, cost: serverMinutes / 60 * ch.serverHourly, survived: badMinutes === 0 };
}

// Servers a match needs at its peak with a CDN option (what "prewarm" must have to survive).
export const serversForPeak = (ch, cdn) => {
  const offload = (ch.cdn.options.find((o) => o.id === cdn) || ch.cdn.options[0]).offload;
  return Math.ceil(originGbps(ch, Math.max(...ch.viewers.map((p) => p[1])), offload) / ch.serverGbps - 1e-9);
};
