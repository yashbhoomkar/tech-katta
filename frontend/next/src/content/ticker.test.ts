import { describe, expect, it } from "vitest";
import { tickerItems } from "./ticker";

const site = { counts: { questions: 29, concepts: 21, components: 10, challenges: 8 }, topics: { eyebrow: "", title: "", cards: [{ id: "c", no: "01", kind: "", title: "Concepts", desc: "", link: "" }] } };

describe("tickerItems", () => {
  it("counts problems and notes from the articles and names the sections, in capitals", () => {
    const items = tickerItems(site, [{ tests: [] as never }, {}, {}] as never);
    expect(items).toEqual(["1 DESIGN PROBLEMS", "A REAL JUDGE", "2 VISUAL NOTES", "8 CHALLENGES · 24 STARS", "CONCEPTS", "FREE WITH SIGN-IN"]);
  });
  it("leaves out counts it does not have", () => {
    const items = tickerItems({ ...site, counts: { ...site.counts, challenges: 0 } }, []);
    expect(items).toEqual(["A REAL JUDGE", "CONCEPTS", "FREE WITH SIGN-IN"]);
  });
});
