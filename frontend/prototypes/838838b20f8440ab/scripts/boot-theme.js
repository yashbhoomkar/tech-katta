// Runs in <head> before the page paints. Dark is the default for everyone (owner, 2026-11-18); a viewer who picks
// another theme with the switch keeps it (its own key, so a choice made on another prototype does not carry over).
(function () {
  var p = "dark";
  try { p = localStorage.getItem("tk-r3d-theme") || "dark"; } catch (e) { /* storage blocked */ }
  var dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
