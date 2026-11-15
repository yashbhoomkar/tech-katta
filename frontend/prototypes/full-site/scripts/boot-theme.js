// Runs in <head> before the page paints, so a dark-mode viewer never sees a flash of the light page.
// (A classic script, not a module: modules run after parsing. The site's CSP allows only script files.)
(function () {
  var p = "system", q = new URLSearchParams(location.search);
  // prototype: compare dark palettes (?dark=a|b|c, ?dark=now) and open in a theme (?theme=dark)
  try {
    if (q.has("dark")) localStorage.setItem("tk-proto-dark", q.get("dark"));
    if (q.has("theme")) localStorage.setItem("tk-proto-theme", q.get("theme"));
    var d = localStorage.getItem("tk-proto-dark");
    if (d && d !== "now") document.documentElement.setAttribute("data-dark", d);
  } catch (e) { if (q.get("dark") && q.get("dark") !== "now") document.documentElement.setAttribute("data-dark", q.get("dark")); }
  try { p = localStorage.getItem("tk-proto-theme") || "system"; } catch (e) { /* storage blocked */ }
  var dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { if (localStorage.getItem("tk-proto-side") === "rail") document.documentElement.classList.add("rail"); } catch (e) { /* ignore */ }
})();
