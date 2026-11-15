// Prototype only: choose a dark-mode candidate (?nbdark=b|d|e, or ?nbdark=now) and show a small switch in dark mode.
// A classic script in <head> (the site's CSP allows only script files). It sets data-nbdark before first paint.
(function () {
  var KEY = "tk-nb-dark", root = document.documentElement, q = new URLSearchParams(location.search), v = null;
  try { if (q.has("nbdark")) localStorage.setItem(KEY, q.get("nbdark")); v = localStorage.getItem(KEY); } catch (e) { v = q.get("nbdark"); }
  var set = function (x) { if (x && x !== "now") root.setAttribute("data-nbdark", x); else root.removeAttribute("data-nbdark"); };
  set(v);
  document.addEventListener("DOMContentLoaded", function () {
    var box = document.createElement("div");
    box.className = "nbd-sw"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Dark palette (prototype)");
    box.innerHTML = '<span>Dark</span>' + [["now", "Now"], ["b", "B"], ["d", "D"], ["e", "E"]].map(function (p) {
      return '<button type="button" data-nbd="' + p[0] + '" title="' + (p[0] === "now" ? "Current dark" : "Candidate " + p[1]) + '">' + p[1] + "</button>"; }).join("");
    var sync = function () { var c = root.getAttribute("data-nbdark") || "now"; box.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.nbd === c)); }); };
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      try { localStorage.setItem(KEY, b.dataset.nbd); } catch (err) { /* storage blocked */ }
      var apply = function () { set(b.dataset.nbd); sync(); };
      if (document.startViewTransition) document.startViewTransition(apply); else apply();
    });
    document.body.appendChild(box); sync();
  });
})();
