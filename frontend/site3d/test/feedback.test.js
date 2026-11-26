// When the testers' feedback button loads (site3d/scripts/feedback.js): never for ordinary visitors.
import test from "node:test";
import assert from "node:assert/strict";
import { feedbackParam, feedbackWanted } from "../scripts/feedback.js";

test("the address turns it on or off; otherwise this browser's choice; off by default", () => {
  assert.equal(feedbackParam("?feedback=on"), "on");
  assert.equal(feedbackParam("?a=1&feedback=off"), "off");
  assert.equal(feedbackParam("?feedback=onx"), null);
  assert.equal(feedbackParam(""), null);
  assert.equal(feedbackWanted("", null), false);
  assert.equal(feedbackWanted("", "1"), true);
  assert.equal(feedbackWanted("?feedback=off", "1"), false);
  assert.equal(feedbackWanted("?feedback=on", null), true);
});
