// You: profile, appearance (theme with live previews), keyboard shortcuts, sign out.
import { OPTIONS, pref } from "../core/theme.js";
import { shortcutsHTML } from "../components/shortcuts.js";
import { toast } from "../components/toast.js";
import { ICONS } from "../components/icons.js";

export const title = () => "You";

export const render = () => `
<div class="content narrow">
  <div class="topline"><div><h1>You</h1><p>Your account and how Tech Katta looks for you.</p></div></div>
  <section class="card pad profile"><i class="avatar lg" aria-hidden="true">R</i><div><b>Riya Sharma</b><small class="muted">riya@example.com · signed in with Google</small></div><button class="btn sm" type="button" id="signout">Sign out</button></section>
  <section class="card pad"><h2 class="h3">Appearance</h2><p class="muted">System follows your device, and switches by itself at night if your device does.</p>
    <div class="themes" role="radiogroup" aria-label="Theme">
      ${OPTIONS.map(([v, icon, name]) => `<button class="theme-card" type="button" role="radio" data-theme-set="${v}" aria-pressed="${pref() === v}" aria-checked="${pref() === v}">
        <span class="tprev tprev-${v}" aria-hidden="true"><i></i><i></i><i></i></span><span class="tlabel">${ICONS[v]} ${icon}</span></button>`).join("")}
    </div></section>
  <section class="card pad kbd-only"><h2 class="h3">Keyboard shortcuts</h2>${shortcutsHTML()}</section>
</div>`;

export function mount(root, ctx, sc) {
  root.querySelector("#signout").addEventListener("click", () => toast("Prototype: you stay signed in"));
  const sync = () => root.querySelectorAll(".theme-card").forEach((b) => b.setAttribute("aria-checked", b.getAttribute("aria-pressed")));
  sc.listen(document, "themechange", sync);
}
