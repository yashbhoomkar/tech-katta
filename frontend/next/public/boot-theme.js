// Runs before first paint so a dark-mode visitor never sees a flash of the light page. Mirrors
// src/lib/theme.ts (same storage key and attribute). Kept tiny and dependency-free on purpose.
(function () {
  // the 3D look (tech.katta.cc) is dark unless the viewer chose otherwise, as the 3D site is (it shares this key)
  var pref = document.documentElement.getAttribute("data-style") === "3d" ? "dark" : "system";
  try { pref = localStorage.getItem("tk-theme") || pref; } catch (e) { /* storage blocked */ }
  var dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { if (localStorage.getItem("tk-sidebar") === "rail") document.documentElement.setAttribute("data-sidebar", "rail"); } catch (e) { /* ignore */ }
})();
