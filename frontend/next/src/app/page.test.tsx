import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { page } from "./router";

describe("page (lazy route pages)", () => {
  it("renders the page its module exports", async () => {
    const P = page(async () => ({ Hello: () => <p>hello</p> }), (m) => m.Hello);
    render(<Suspense fallback={<p>loading</p>}><P /></Suspense>);
    expect(await screen.findByText("hello")).toBeTruthy();
  });
  it("keeps showing loading, without an error, while a reload after a release is on its way", async () => {
    const P = page<{ Hello: () => JSX.Element }>(async () => undefined, (m) => m.Hello);
    render(<Suspense fallback={<p>loading</p>}><P /></Suspense>);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("loading")).toBeTruthy();
  });
});
