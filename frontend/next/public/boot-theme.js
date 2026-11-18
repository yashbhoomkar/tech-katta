// Runs before first paint so a dark-mode visitor never sees a flash of the light page. Mirrors
// src/lib/theme.ts (same storage key and attribute). Kept tiny and dependency-free on purpose.
(function () {
  var pref = "system";
  try { pref = localStorage.getItem("tk-theme") || "system"; } catch (e) { /* storage blocked */ }
  var dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { if (localStorage.getItem("tk-sidebar") === "rail") document.documentElement.setAttribute("data-sidebar", "rail"); } catch (e) { /* ignore */ }
})();
