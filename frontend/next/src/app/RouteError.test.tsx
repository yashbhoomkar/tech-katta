import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RouteError, isChunkError } from "./RouteError";

function Boom({ err }: { err: Error }): never {
  throw err;
}
const at = (err: Error) => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const router = createMemoryRouter([{ path: "/", element: <Boom err={err} />, errorElement: <RouteError /> }], { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);
};

describe("RouteError", () => {
  it("tells a broken page apart from a stale release", () => {
    expect(isChunkError(new TypeError("Failed to fetch dynamically imported module: /assets/Home-x.js"))).toBe(true);
    expect(isChunkError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkError(new Error("x is undefined"))).toBe(false);
  });
  it("shows a friendly page, not a blank screen, when a page throws", () => {
    at(new Error("x is undefined"));
    expect(screen.getByRole("heading", { name: "Something broke on this page." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
  });
  it("asks for a reload when a page's code is gone after a new release", () => {
    at(new TypeError("Failed to fetch dynamically imported module: /assets/Home-x.js"));
    expect(screen.getByRole("heading", { name: "A new version of the site is out." })).toBeTruthy();
  });
});
