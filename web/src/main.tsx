import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource-variable/geist-mono";
import "./styles/tokens.css";
import "./styles/global.css";

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
