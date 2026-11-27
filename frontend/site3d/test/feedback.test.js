// The Report popup's pure parts (site3d/scripts/feedback-core.js): what the address means, the title and body, the request, the rate limit, sizes, the fallback.
import test from "node:test";
import assert from "node:assert/strict";
import { feedbackParam, feedbackWanted, cleanUrl, titleOf, categoryOf, detailsText, descriptionOf, payloadOf, canSend, fitSize, pixelRatioFor, dataUrlBytes, fontBlocks, unicodeRanges, pickFontFaces, canSkipStyle, STYLE_PROPS, issueUrl, REPO, ENDPOINT, MARK_COLORS, toImagePoint, lineWidthFor, textSizeFor, boxOf, arrowHead, tooSmall } from "../scripts/feedback-core.js";

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

test("markup geometry: a touch maps into the picture's own pixels and stays inside it", () => {
  const rect = { left: 10, top: 20, width: 100, height: 200 };
  assert.deepEqual(toImagePoint(60, 120, rect, 640, 1280), { x: 320, y: 640 });
  assert.deepEqual(toImagePoint(-50, 999, rect, 640, 1280), { x: 0, y: 1280 });
});

test("markup geometry: lines and labels are about 3 and 16 screen pixels wherever the picture is shown", () => {
  assert.equal(Math.round(lineWidthFor(640, 100)), 16); // a 100 px preview of a 640 px picture: capped at w/40
  assert.equal(lineWidthFor(640, 320), 6); // 2 picture pixels per screen pixel
  assert.equal(lineWidthFor(640, 640), 3);
  assert.equal(lineWidthFor(640, 6400), 3); // never thinner than 3
  assert.equal(textSizeFor(640, 320), 32);
  assert.equal(textSizeFor(640, 6400), 14);
});

test("markup geometry: boxes in any drag direction, arrow heads at the tip, strays are too small", () => {
  assert.deepEqual(boxOf({ x: 50, y: 40 }, { x: 10, y: 90 }), { x: 10, y: 40, w: 40, h: 50 });
  const [l, r] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
  assert.ok(l.x < 100 && r.x < 100 && Math.abs(l.y + r.y) < 1e-9 && Math.abs(l.y) > 1);
  assert.equal(tooSmall({ x: 0, y: 0 }, { x: 3, y: 4 }), true);
  assert.equal(tooSmall({ x: 0, y: 0 }, { x: 30, y: 2 }), false);
});

test("the pen colours: red first, yellow, blue", () => {
  assert.deepEqual(Object.keys(MARK_COLORS), ["red", "yellow", "blue"]);
});

test("a screenshot embeds only the font files its screen uses: the family, the weight and a character in the unicode-range", () => {
  const face = (fam, w, range) => `@font-face { font-family: "${fam}"; font-style: normal; font-weight: ${w}; src: url(data:font/woff2;base64,AAAA) format("woff2"); unicode-range: ${range}; }`;
  const css = [face("Instrument Sans", "400", "U+0000-00FF, U+0131"), face("Instrument Sans", "600", "U+0000-00FF, U+0131"), face("Instrument Sans", "400", "U+0400-045F, U+0490-0491"),
    face("Instrument Sans", "400", "U+0102-0103, U+1EA0-1EF9"), face("Geist Mono", "100 900", "U+0000-00FF"), face("Other", "400", "U+0000-00FF")].join("\n");
  const blocks = fontBlocks(css); assert.equal(blocks.length, 6);
  const used = { families: new Set(["instrument sans", "geist mono"]), weights: new Set([400, 600]), chars: new Set(["a", "Z", "é", "5"]) };
  const got = pickFontFaces(blocks, used);
  assert.equal(got.length, 3); // Latin 400, Latin 600 and the variable mono; not Cyrillic, not Vietnamese, not the family that is not used
  assert.ok(got.every((b) => !b.includes("Other") && !b.includes("0400")));
  const cyr = pickFontFaces(blocks, { ...used, chars: new Set(["д"]) }); // Cyrillic text: only the Cyrillic block (weight 400)
  assert.equal(cyr.length, 1); assert.ok(cyr[0].includes("U+0400"));
  assert.deepEqual(unicodeRanges("U+0000-00FF, U+0131, U+4??"), [[0, 255], [0x131, 0x131], [0x400, 0x4ff]]);
  // a weight with no face of its own lands on the nearest: 700 on a family that has 400 and 600 uses 600
  const near = pickFontFaces(blocks, { families: new Set(["instrument sans"]), weights: new Set([700]), chars: new Set(["a"]) });
  assert.equal(near.length, 1); assert.ok(near[0].includes("font-weight: 600"));
});

test("the vendored html-to-image keeps its one local change: a canvas becomes an <img> at once, without waiting a frame", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../scripts/vendor/html-to-image.esm.js", import.meta.url), "utf8");
  assert.ok(src.includes('async function lt(t){let e=t.toDataURL();if(e==="data:,")return t.cloneNode(!1);let n=new Image;return n.src=e,n}'));
});

test("a declaration is left off the screenshot's clone only when the clone gets the same without it", () => {
  const get = (m) => (k) => m[k];
  assert.equal(canSkipStyle("display", "block", "block", undefined, get({})), false, "display is always written");
  assert.equal(canSkipStyle("opacity", "1", "1", undefined, get({})), true, "the element's default");
  assert.equal(canSkipStyle("opacity", "0.5", "1", undefined, get({})), false);
  assert.equal(canSkipStyle("color", "rgb(1, 2, 3)", "rgb(0, 0, 0)", "rgb(1, 2, 3)", get({})), true, "inherited, and the parent has it");
  assert.equal(canSkipStyle("color", "rgb(1, 2, 3)", "rgb(0, 0, 0)", "rgb(9, 9, 9)", get({})), false, "inherited, and the parent has another");
  assert.equal(canSkipStyle("margin-top", "4px", "8px", "4px", get({})), false, "not inherited: the parent's value does not count");
  assert.equal(canSkipStyle("border-top-color", "rgb(5, 5, 5)", "rgb(0, 0, 0)", undefined, get({ "border-top-style": "none" })), true, "no border drawn");
  assert.equal(canSkipStyle("border-top-color", "rgb(5, 5, 5)", "rgb(0, 0, 0)", undefined, get({ "border-top-style": "solid", color: "rgb(5, 5, 5)" })), true, "currentcolor");
  assert.equal(canSkipStyle("border-top-color", "rgb(5, 5, 5)", "rgb(0, 0, 0)", undefined, get({ "border-top-style": "solid", color: "rgb(1, 1, 1)" })), false);
  assert.ok(STYLE_PROPS.includes("background-color") && STYLE_PROPS.length < 260 && new Set(STYLE_PROPS).size === STYLE_PROPS.length);
});
