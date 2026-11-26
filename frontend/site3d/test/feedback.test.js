// The Report popup's pure parts (site3d/scripts/feedback-core.js): what the address means, the title and body, the request, the rate limit, sizes, the fallback.
import test from "node:test";
import assert from "node:assert/strict";
import { feedbackParam, feedbackWanted, cleanUrl, titleOf, categoryOf, detailsText, descriptionOf, payloadOf, canSend, fitSize, pixelRatioFor, dataUrlBytes, issueUrl, REPO, ENDPOINT } from "../scripts/feedback-core.js";

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

test("the page address loses its query and fragment", () => {
  assert.equal(cleanUrl("https://tech.katta.cc/problems/url-shortener?token=abc&x=1#problems/shared/SECRET"), "https://tech.katta.cc/problems/url-shortener");
  assert.equal(cleanUrl("https://tech.katta.cc/"), "https://tech.katta.cc/");
  assert.equal(cleanUrl("not a url?x=1"), "not a url");
  assert.equal(cleanUrl(), "");
});

test("the title is the first line, at most 80 characters; a note-less visual report is named after its page", () => {
  assert.equal(titleOf("The Run button does nothing\nI pressed it twice"), "The Run button does nothing");
  assert.equal(titleOf("\n\n   second line wins   \nthird"), "second line wins");
  assert.equal(titleOf("x".repeat(200)).length, 80);
  assert.equal(titleOf("  " + "word ".repeat(30)).length <= 80, true);
  assert.equal(titleOf("", "https://tech.katta.cc/problems/sandbox?a=1"), "Visual feedback: /problems/sandbox");
  assert.equal(titleOf("   ", ""), "Visual feedback: /");
  assert.equal(categoryOf("idea"), "feature");
  assert.equal(categoryOf("bug"), "bug");
  assert.equal(categoryOf(), "bug");
});

test("the body carries the message and the details, and says when a screenshot failed", () => {
  const meta = { url: "https://tech.katta.cc/home", userAgent: "Mozilla/5.0 (Linux; Android 10)", viewport: { width: 320, height: 579 }, devicePixelRatio: 3.375, language: "en-IN", appVersion: "2026-11-26-abc1234", timestamp: "2026-11-26T10:00:00.000Z" };
  const text = detailsText(meta);
  for (const part of ["https://tech.katta.cc/home", "Android 10", "320×579 at 3.375x", "en-IN", "2026-11-26-abc1234", "2026-11-26T10:00:00.000Z"]) assert.ok(text.includes(part), part);
  const d = descriptionOf({ text: "  It broke  ", meta });
  assert.ok(d.startsWith("It broke\n") && d.includes("Page: https://tech.katta.cc/home") && !d.includes("Screenshot:"));
  assert.ok(descriptionOf({ text: "", meta }).startsWith("(no message)"));
  assert.ok(descriptionOf({ text: "x", meta, captureError: "Failed to load image" }).includes("Screenshot: capture failed (Failed to load image)"));
});

test("the request is what the worker takes", () => {
  const p = payloadOf({ title: "T", description: "D", category: "bug", screenshot: "data:image/png;base64,AAAA", meta: { url: "u" } });
  assert.deepEqual(Object.keys(p).sort(), ["attachments", "category", "description", "metadata", "repo", "screenshot", "title"]);
  assert.equal(p.repo, REPO); assert.equal(p.repo, "yashbhoomkar/tech-katta-feedback");
  assert.deepEqual(p.attachments, []);
  assert.equal(payloadOf({ title: "T", description: "D", category: "feature", meta: {} }).screenshot, null);
  assert.equal(ENDPOINT, "https://bugdrop.neonwatty.workers.dev/api/feedback");
});

test("one report per browser per 30 seconds", () => {
  assert.deepEqual(canSend(null, 1_000_000), { ok: true, wait: 0 });
  assert.deepEqual(canSend("0", 1_000_000), { ok: true, wait: 0 });
  assert.deepEqual(canSend(String(1_000_000 - 5_000), 1_000_000), { ok: false, wait: 25 });
  assert.deepEqual(canSend(String(1_000_000 - 29_001), 1_000_000), { ok: false, wait: 1 });
  assert.deepEqual(canSend(String(1_000_000 - 30_000), 1_000_000), { ok: true, wait: 0 });
  assert.deepEqual(canSend("garbage", 1_000_000), { ok: true, wait: 0 });
});

test("a screenshot is drawn at most 1600 px on its long side, at a pixel ratio of at most 2", () => {
  assert.deepEqual(fitSize(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitSize(3200, 1600), { width: 1600, height: 800 });
  assert.deepEqual(fitSize(1080, 1958), { width: 883, height: 1600 });
  assert.deepEqual(fitSize(1, 100000), { width: 1, height: 1600 });
  assert.equal(pixelRatioFor(3.375), 2); assert.equal(pixelRatioFor(1), 1); assert.equal(pixelRatioFor(1.5), 1.5); assert.equal(pixelRatioFor(0), 1); assert.equal(pixelRatioFor(undefined), 1);
  assert.equal(dataUrlBytes("data:image/png;base64," + "A".repeat(4000)), 3000);
  assert.equal(dataUrlBytes(""), 0);
});

test("the prefilled issue holds the report, and a long one is cut for GitHub's address limit", () => {
  const u = new URL(issueUrl({ title: "It broke", description: "Details\nPage: https://tech.katta.cc/home" }));
  assert.equal(u.origin + u.pathname, "https://github.com/yashbhoomkar/tech-katta-feedback/issues/new");
  assert.equal(u.searchParams.get("title"), "It broke");
  assert.ok(u.searchParams.get("body").includes("Page: https://tech.katta.cc/home"));
  assert.ok(issueUrl({ title: "t", description: "a".repeat(9000) }).length < 8000);
  assert.ok(issueUrl().startsWith("https://github.com/yashbhoomkar/tech-katta-feedback/issues/new"));
});
