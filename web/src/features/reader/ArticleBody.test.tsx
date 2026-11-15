import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lesson } from "@/test/fixtures";
import { ArticleBody, outline, readMinutes } from "./ArticleBody";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});

describe("ArticleBody", () => {
  it("draws every block kind", () => {
    render(<ArticleBody article={lesson} />);
    expect(screen.getByRole("complementary", { name: "Example system" }).textContent).toContain("Zotato");
    expect(screen.getByRole("heading", { level: 2, name: "Why cache" }).id).toBe("s-1");
    expect(screen.getByText("Redis").tagName).toBe("CODE");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("complementary", { name: "In real life" })).toBeTruthy();
    expect(screen.getByText("In Zotato")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Compare" }).querySelector("tbody th")?.textContent).toBe("Memory");
    expect(screen.getByLabelText("a request").textContent).toBe("GET /menu");
    expect(screen.getByText("Eviction").closest("details")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add a cache/ }).getAttribute("href")).toBe("/dashboard/problems/challenge/read-heavy/");
  });

  it("outlines the h2s and estimates the read time", () => {
    expect(outline(lesson.body)).toEqual([{ id: "s-1", text: "Why cache" }, { id: "s-5", text: "Kinds of cache" }]);
    expect(readMinutes(lesson)).toBe(1);
  });
});
