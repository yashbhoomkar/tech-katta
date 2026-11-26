// When the testers' feedback button loads (site3d/scripts/feedback.js): never for ordinary visitors.
import test from "node:test";
import assert from "node:assert/strict";
import { feedbackParam, feedbackWanted } from "../scripts/feedback.js";

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
