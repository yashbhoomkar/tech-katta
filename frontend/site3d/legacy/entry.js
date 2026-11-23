// The 3D site has no build step, but sign-in, account sync and usage events live in the current app's modules
// (src/account.js, src/analytics.js: plain JS, but they import Vite-only code). This file is built on its own
// (vite.site3d.config.js, `npm run build:site3d`) into dist/3d/legacy/legacy.js, and site3d/scripts/account.js and
// analytics.js load it on demand. One copy of that code: the 3D pages and the React islands share the same account.
import { inject } from "@vercel/analytics";
import { vercelGate } from "../../src/analytics.js";

export { account, startAccount, renderGoogleButton, setTermsChoice, signOut, signOutAll, syncLab } from "../../src/account.js";
export { track, readArticle, referrer } from "../../src/analytics.js";

// Vercel Web Analytics, once per page load, with the same opt-out as the current app (src/hostanalytics.jsx):
// nothing from browsers that ask not to be tracked or from automated ones. VITE_HOST_ANALYTICS=none turns it off.
let injected = false;
export function hostAnalytics() {
  if (injected || (import.meta.env?.VITE_HOST_ANALYTICS || "vercel").toLowerCase() !== "vercel") return;
  injected = true;
  inject({ beforeSend: vercelGate });
}
