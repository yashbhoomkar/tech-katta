// Resource hints for the content API (Lighthouse, 2026-11-16: the first content request waited for the app's code).
// The page opens the connection to the API at once and starts the two requests every page under the content gate
// makes (site and articles); the app's own fetches (lib/api/client.ts: plain GET, no credentials) then reuse them.
export function apiHints(html, base) {
  const api = base.replace(/\/$/, "");
  const origin = new URL(api).origin;
  const tags = [
    `<link rel="preconnect" href="${origin}" crossorigin />`,
    `<link rel="preload" as="fetch" href="${api}/v1/site" crossorigin />`,
    `<link rel="preload" as="fetch" href="${api}/v1/articles" crossorigin />`,
  ].join("\n    ");
  return html.replace("</head>", `    ${tags}\n  </head>`);
}
