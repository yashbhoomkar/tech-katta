import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource-variable/geist-mono";
import "./styles/tokens.css";
import "./styles/global.css";
// the second look (data-style="neo-brutalism" on <html>, set by the build: VITE_STYLE). Its rules apply only under
// that attribute, and the fonts are fetched only when a page uses them.
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo-black/400.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./styles/themes/neo-brutalism.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createRouter } from "./app/router";
import { initTheme } from "./lib/theme";

initTheme();

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createRouter()} />
  </StrictMode>,
);
