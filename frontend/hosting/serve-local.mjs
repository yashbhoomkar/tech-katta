// A small stand-in for the host: files, dir/index.html, routes.json rewrites, 404.html (status 404). Used for local checks and, from phase 6 of
// tech-katta-context 49, by the end-to-end suite:  node hosting/serve-local.mjs dist 5199 hosting/routes.json  (it does not do redirects or headers).
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [root, port, routesFile] = [process.argv[2], +process.argv[3], process.argv[4]];
const routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml", ".woff2": "font/woff2" };
const file = (p) => { const f = path.join(root, p); try { const st = fs.statSync(f); if (st.isFile()) return f; if (st.isDirectory() && fs.existsSync(path.join(f, "index.html"))) return path.join(f, "index.html"); } catch {} return null; };
const matches = (from, p) => (from.endsWith("/*") ? p.startsWith(from.slice(0, -1)) : p === from);
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = file(p);
  if (!f) for (const w of routes.rewrites) if (matches(w.from, p)) { f = file(w.to); break; }
  let code = 200; if (!f) { f = path.join(root, "404.html"); code = 404; }
  const type = TYPES[path.extname(f)] || "application/octet-stream";
  // like the host: text is sent compressed (a phone's download time is what the performance checks measure)
  if (/text|javascript|json|svg/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    res.writeHead(code, { "content-type": type, "content-encoding": "gzip", vary: "accept-encoding" });
    fs.createReadStream(f).pipe(zlib.createGzip()).pipe(res); return;
  }
  res.writeHead(code, { "content-type": type });
  fs.createReadStream(f).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} on ${port}`));
