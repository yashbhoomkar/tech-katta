// Runs in <head> before the page paints. Dark is the default for everyone (owner, 2026-11-18); a viewer who picks
// another theme with the switch keeps it (its own key, so a choice made on another prototype does not carry over).
(function () {
  var p = "dark";
  // one setting for the whole site: the React app's key (next/public/boot-theme.js), or the prototype's older one
  try { p = localStorage.getItem("tk-theme") || localStorage.getItem("tk-r3d-theme") || "dark"; } catch (e) { /* storage blocked */ }
  var dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
// The search copy of the page (seo.js writes it inside #root for search engines and readers without JavaScript) is
// hidden while JavaScript runs, so it never flashes before the app draws (owner, 2026-11-24). If the app has not
// replaced it after 6 s (a failed or very slow load), it shows again rather than leaving the page blank.
(function () {
  var root = document.documentElement;
  root.classList.add("tk-js");
  setTimeout(function () { root.classList.remove("tk-js"); }, 6000);
})();
