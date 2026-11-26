// When the testers' feedback button loads (site3d/scripts/feedback.js): never for ordinary visitors.
import test from "node:test";
import assert from "node:assert/strict";
import { feedbackParam, feedbackWanted, reportDetails, reportIssueUrl } from "../scripts/feedback.js";

test("the address turns it on or off; otherwise this browser's choice; on by default", () => {
  assert.equal(feedbackParam("?feedback=on"), "on");
  assert.equal(feedbackParam("?a=1&feedback=off"), "off");
  assert.equal(feedbackParam("?feedback=onx"), null);
  assert.equal(feedbackParam(""), null);
  assert.equal(feedbackWanted("", null), true);
  assert.equal(feedbackWanted("", "0"), false);
  assert.equal(feedbackWanted("", "1"), true);
  assert.equal(feedbackWanted("?feedback=off", null), false);
  assert.equal(feedbackWanted("?feedback=on", "0"), true);
  assert.equal(feedbackWanted("?feedback=on", null), true);
});

test("the details a report carries, and the prefilled issue that holds them", () => {
  const d = { page: "https://tech.katta.cc/problems/url-shortener#x", ua: "Mozilla/5.0 (Linux; Android 14)", viewport: "412×839 at 2.6x", time: "2026-11-26T10:00:00.000Z" };
  const text = reportDetails(d);
  for (const part of [d.page, d.ua, d.viewport, d.time]) assert.ok(text.includes(part));
  const url = new URL(reportIssueUrl(d));
  assert.equal(url.origin + url.pathname, "https://github.com/yashbhoomkar/tech-katta-feedback/issues/new");
  assert.ok(url.searchParams.get("body").includes(d.page) && url.searchParams.get("body").includes(d.viewport));
  assert.equal(url.searchParams.get("title"), "Report: ");
  // a very long page address cannot make the link too long for GitHub
  assert.ok(reportIssueUrl({ ...d, page: "https://x/" + "a".repeat(9000) }).length < 8000);
  assert.deepEqual(reportDetails(), "Page: \nBrowser: \nWindow: \nTime: ");
});
