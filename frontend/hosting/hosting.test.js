// hosting/routes.json is the one place the site's routing and headers are written; these tests keep each
// host's files true to it (HOSTING.md).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vercelJson, vercelConfig, cloudflareFiles } from "./adapters.js";

const routes = JSON.parse(readFileSync(new URL("./routes.json", import.meta.url), "utf8"));

test("frontend/vercel.json is exactly what hosting/routes.json gives (run npm run hosting:vercel after a change)", () => {
  assert.equal(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"), vercelJson(routes));
});

test("Vercel: '*' becomes (.*), ':splat' becomes $1, and a host rule becomes a 'has' condition", () => {
  const v = vercelConfig({ rewrites: [{ from: "/a/*", to: "/a/index.html" }], headers: [{ path: "/*", headers: { X: "1" } }],
    redirects: [{ from: "/old/*", to: "/new/:splat", permanent: true }, { host: "x.example", from: "/", to: "/x/", permanent: false }] });
  assert.deepEqual(v.rewrites, [{ source: "/a/(.*)", destination: "/a/index.html" }]);
  assert.deepEqual(v.headers, [{ source: "/(.*)", headers: [{ key: "X", value: "1" }] }]);
  assert.deepEqual(v.redirects, [{ source: "/old/(.*)", destination: "/new/$1", permanent: true },
    { source: "/", has: [{ type: "host", value: "x.example" }], destination: "/x/", permanent: false }]);
});

test("Cloudflare: redirects keep Vercel's codes, a folder rewrite becomes its 404.html, a host rule is left to do by hand", () => {
  const c = cloudflareFiles(routes);
  assert.deepEqual(c.redirects.trim().split("\n"), [
    "/dashboard/networking /dashboard/concepts/ 308",
    "/dashboard/networking/* /dashboard/concepts/:splat 308",
  ]);
  // "/health → /health.html" and the like are how Cloudflare serves pages anyway; a rule would loop
  // never a "/dashboard/* … 200" rule: Cloudflare would apply it over the article pages the build writes
  assert.ok(!/\*\s+\S+\s+200/.test(c.redirects));
  assert.deepEqual(c.copies, [["dashboard/index.html", "dashboard/404.html"]]);
  assert.equal(c.manual.length, 1);
  assert.match(c.manual[0], /analytics\.katta\.cc/);
  const csp = routes.headers[0].headers["Content-Security-Policy"];
  assert.ok(c.headers.startsWith("/*\n  X-Content-Type-Options: nosniff\n"));
  assert.ok(c.headers.includes(`  Content-Security-Policy: ${csp}\n`));
  assert.ok(c.headers.includes("/analytics/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n"));
  for (const line of c.headers.split("\n")) assert.ok(line.length <= 2000, "Cloudflare limits a _headers line to 2,000 characters");
});

test("paths the hosts can't all express are refused", () => {
  const base = { rewrites: [], headers: [], redirects: [] };
  assert.throws(() => vercelConfig({ ...base, rewrites: [{ from: "/a*b", to: "/x" }] }), /may only end a path/);
  assert.throws(() => vercelConfig({ ...base, redirects: [{ from: "a", to: "/x" }] }), /must start with/);
  assert.throws(() => cloudflareFiles({ ...base, rewrites: [{ from: "/a/*", to: "/b/index.html" }] }), /own index\.html/);
  assert.throws(() => cloudflareFiles({ ...base, rewrites: [{ from: "/a", to: "/b.html" }] }), /its own page only/);
  assert.deepEqual(cloudflareFiles({ ...base, rewrites: [{ from: "/a", to: "/a.html" }, { from: "/a/", to: "/a.html" }, { from: "/b", to: "/b/index.html" }] }).redirects, "\n");
  assert.deepEqual(cloudflareFiles({ ...base, redirects: [{ from: "/x/*", to: "/y/:splat" }, { from: "/z", to: "/w" }] }).redirects, "/z /w 307\n/x/* /y/:splat 307\n");
});
