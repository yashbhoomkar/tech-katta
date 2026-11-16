import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource-variable/geist-mono";
import "./styles/tokens.css";
import "./styles/global.css";
// this build's look (VITE_STYLE; vite.config.ts points @look at styles/looks/<look>/): its fonts, tokens and motion,
// after global.css so they win. Only the built look's CSS is in the bundle.
import "@look";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createRouter } from "./app/router";
import { initTheme } from "./lib/theme";
import { installLookDefs } from "./lib/look";

initTheme();
installLookDefs();

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createRouter()} />
  </StrictMode>,
);
