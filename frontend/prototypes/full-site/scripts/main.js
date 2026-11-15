// Entry point: theme, app chrome, overlays, then the router renders the first page.
import { initTheme } from "./core/theme.js";
import { startRouter } from "./core/router.js";
import { initShell } from "./components/shell.js";
import { initCommandPalette } from "./components/command-palette.js";
import { initSignin } from "./components/signin.js";
import { initShortcuts } from "./components/shortcuts.js";
import { initSwitcher } from "./components/switcher.js";
import { initShare } from "./components/toast.js";

import * as landing from "./pages/landing.js";
import * as home from "./pages/home.js";
import * as learn from "./pages/learn.js";
import * as section from "./pages/section.js";
import * as lesson from "./pages/lesson.js";
import * as problems from "./pages/problems.js";
import * as workspace from "./pages/workspace.js";
import * as me from "./pages/me.js";
import * as notFound from "./pages/not-found.js";

// "Skip to content" must not change the hash (the hash is the route)
document.addEventListener("click", (e) => { if (e.target.closest("[data-skip]")) { e.preventDefault(); document.getElementById("main").focus(); } });

initTheme();
const chrome = initShell();
initCommandPalette();
initSignin();
initShortcuts();
initShare();
initSwitcher();
startRouter({ chrome, pages: { landing, home, learn, section, lesson, problems, workspace, me, notFound } });
