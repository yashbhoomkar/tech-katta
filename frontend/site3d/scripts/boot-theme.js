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
// One request per API address per page load (a problem's page asked for the same article three times, and the article list,
// the site text and the Lab twice). Every part of the page that reads the API (the shell, the account, the React workspace)
// asks through window.tkGet, and the first answer is shared. The answers that depend on who asks (an article's text, the Lab,
// the account) are asked with the sign-in cookie, and forgotten when someone signs in or out (tkWho). The few that every page
// needs, and a problem's own text, are asked for here, before any script has loaded.
(function () {
  var API = "https://tech-api.katta.cc", WHO = /^\/v1\/(lab|stories|articles\/[^?]+|me|auth\/config)$/, held = {}, who;
  function ask(path) {
    var o = { headers: { accept: "application/json" } };
    if (WHO.test(path)) o.credentials = "include";
    return fetch(API + path, o).catch(function (e) {
      // a site the API does not list (a preview) refuses the cookie: the same request without it returns the public part
      if (o.credentials) return fetch(API + path, { headers: o.headers });
      throw e;
    });
  }
  /** GET json: a Response (a copy; read it freely). init.signal ends this caller's wait, not the shared request */
  window.tkGet = function (path, init) {
    var p = held[path];
    if (!p) {
      p = held[path] = ask(path).then(function (r) { if (!r.ok) delete held[path]; return r; }, function (e) { delete held[path]; throw e; });
    }
    var sig = init && init.signal, out = p.then(function (r) { return r.clone(); });
    if (!sig) return out;
    return new Promise(function (res, rej) {
      var gone = function () { rej(new DOMException("Aborted", "AbortError")); };
      if (sig.aborted) return gone();
      sig.addEventListener("abort", gone, { once: true });
      out.then(res, rej);
    });
  };
  window.tkGet.api = API;
  /** the answers that depend on who asks are asked again */
  window.tkForget = function () { for (var k in held) if (WHO.test(k) && k !== "/v1/me" && k !== "/v1/auth/config") delete held[k]; };
  /** the account tells who is signed in: only a change of person (not the first answer) forgets what was asked as someone else */
  window.tkWho = function (id) {
    var changed = who !== undefined && who !== id;
    who = id;
    if (changed) { window.tkForget(); try { dispatchEvent(new Event("tk-identity")); } catch (e) { /* old browser */ } }
  };
  var m = location.pathname.match(/^\/problems\/([\w-]+)\/?$/);
  try {
    window.tkGet("/v1/auth/config").catch(function () {}); window.tkGet("/v1/me").catch(function () {}); window.tkGet("/v1/site").catch(function () {});
    if (!sessionStorage.getItem("tk-r3d-articles")) window.tkGet("/v1/articles").catch(function () {});
    // a problem: its text, and the Lab's parts and tests the canvas needs, while the page's own files are still on the way
    if (m && !/^(challenge|sandbox|shared)$/.test(m[1])) { window.tkGet("/v1/articles/" + m[1]).catch(function () {}); window.tkGet("/v1/lab").catch(function () {}); }
  } catch (e) { /* no fetch: the pages ask for themselves */ }
})();
