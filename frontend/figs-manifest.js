// Build step: which module draws each figure, so the dashboard loads only the figure modules an article
// needs (src/figs/index.js) instead of all of them in its own script. Read from the modules themselves:
// each src/figs/<tab>/<sub-tab>.jsx exports FIGS with one "id":{C:…} per line (the same rule the backend's
// figure test reads them by), so a new figure or sub-tab needs nothing added here.
// Vite serves the result as the module "virtual:fig-manifest": { "ix-scan": "concepts/indexing", … }.
import fs from "node:fs";
import path from "node:path";

export function figManifest(dir) {
  const map = {};
  for (const tab of fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    for (const file of fs.readdirSync(path.join(dir, tab)).filter((f) => f.endsWith(".jsx")).sort()) {
      const mod = `${tab}/${file.slice(0, -4)}`;
      const reg = fs.readFileSync(path.join(dir, tab, file), "utf8").match(/export const FIGS=\{([\s\S]*?)\n\};/);
      if (!reg) throw new Error(`fig-manifest: src/figs/${mod}.jsx must export FIGS`);
      for (const [, id] of reg[1].matchAll(/^"([a-z0-9-]+)":\{C:/gm)) {
        if (map[id]) throw new Error(`fig-manifest: figure ${id} is in both ${map[id]} and ${mod}`);
        map[id] = mod;
      }
    }
  }
  return map;
}

const ID = "virtual:fig-manifest", RESOLVED = "\0" + ID;
export default function figManifestPlugin(dir) {
  return {
    name: "fig-manifest",
    resolveId(id) { return id === ID ? RESOLVED : null; },
    load(id) {
      if (id !== RESOLVED) return null;
      // rebuilt when a figure module changes (vite dev)
      for (const tab of fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) this.addWatchFile(path.join(dir, tab.name));
      return `export default ${JSON.stringify(figManifest(dir))};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(dir + path.sep) || !file.endsWith(".jsx")) return;
      const m = server.moduleGraph.getModuleById(RESOLVED);
      if (m) server.moduleGraph.invalidateModule(m);
    },
  };
}
