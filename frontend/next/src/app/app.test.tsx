import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetResources } from "@/lib/resource";
import { articles, lesson, site } from "@/test/fixtures";
import { routes } from "./router";

function mockApi({ fail = false } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (fail) return new Response("nope", { status: 503 });
    if (url.endsWith("/v1/site")) return Response.json(site);
    if (url.endsWith("/v1/articles")) return Response.json({ articles });
    if (url.endsWith("/v1/articles/caching")) return Response.json(lesson);
    if (url.endsWith("/v1/lab")) return Response.json({ challenges: [{ id: "one-server", level: "beginner", title: "Too much for one server", brief: "", stars: [1, 2, 3] }] });
    return new Response("not found", { status: 404 });
  }));
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  resetResources();
  // jsdom has neither of these
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = () => {};
});
afterEach(() => vi.unstubAllGlobals());

describe("app", () => {
  it("Home shows the greeting, what to start with, and every section", async () => {
    mockApi();
    renderAt("/home");
    expect(await screen.findByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)$/ })).toBeTruthy();
    expect(screen.getByText("Start here")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Networking essentials" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Concepts/ }).length).toBeGreaterThan(0);
    expect(document.title).toBe("Home · Tech Katta");
  });

  it("the reader shows the lesson, its outline and the way on", async () => {
    mockApi();
    const router = renderAt("/learn/concepts/caching");
    expect(await screen.findByRole("heading", { level: 1, name: "Caching: when to add a cache" })).toBeTruthy();
    expect(await screen.findByRole("heading", { level: 2, name: "Why cache" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Previous Networking essentials/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mark complete & next/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/learn/concepts/real-time-updates"));
    expect(JSON.parse(localStorage.getItem("tk-progress-v1") ?? "{}").caching.done).toBe(true);
  });

  it("Problems lists the problems, filters by difficulty and shows the challenges", async () => {
    mockApi();
    renderAt("/problems");
    expect(await screen.findByRole("heading", { level: 1, name: "Design it. Run it. Get judged." })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Design a chat app" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Easy/ }));
    expect(screen.queryAllByRole("link", { name: "Design a chat app" })).toHaveLength(0);
    expect(await screen.findByRole("heading", { name: "Too much for one server" })).toBeTruthy();
  });

  it("g then p goes to Problems; ? lists the shortcuts", async () => {
    mockApi();
    const router = renderAt("/home");
    await screen.findByRole("heading", { level: 1 });
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "p" });
    await waitFor(() => expect(router.state.location.pathname).toBe("/problems"));
    fireEvent.keyDown(window, { key: "?" });
    expect(await screen.findByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
  });

  it("cards mode shows the lesson as topic cards", async () => {
    mockApi();
    renderAt("/learn/concepts/caching");
    await screen.findByRole("heading", { level: 2, name: "Why cache" });
    fireEvent.click(screen.getByRole("radio", { name: "Cards" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Why cache" })).toBeNull();
    expect(document.querySelector(".a-cards")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Full text" }));
    expect(screen.getByRole("heading", { level: 2, name: "Why cache" })).toBeTruthy();
  });

  it("an unknown lesson is a not-found page", async () => {
    mockApi();
    renderAt("/learn/concepts/nope");
    expect(await screen.findByRole("heading", { level: 1, name: /not found|isn't here|nothing here/i })).toBeTruthy();
  });

  it("a section page lists its groups and lessons", async () => {
    mockApi();
    renderAt("/learn/concepts");
    expect(await screen.findByRole("heading", { level: 2, name: "Core concepts" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Caching: when to add a cache/ })).toBeTruthy();
  });

  it("an unknown section or path shows the not-found page", async () => {
    mockApi();
    renderAt("/learn/nothing-here");
    expect(await screen.findByRole("heading", { name: "This page isn't here." })).toBeTruthy();
  });

  it("shows a plain error with Try again when the API fails", async () => {
    mockApi({ fail: true });
    renderAt("/home");
    expect(await screen.findByText("We couldn't load Tech Katta's content")).toBeTruthy();
    mockApi();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Start here")).toBeTruthy();
  });

  it("Ctrl+K opens search; Enter opens the best match", async () => {
    mockApi();
    const router = renderAt("/home");
    await screen.findByText("Start here");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "cache" } });
    expect(screen.getAllByRole("option")[0]?.textContent).toMatch(/^Caching: when to add a cache/);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(router.state.location.pathname).toBe("/learn/concepts/caching"));
  });
});
