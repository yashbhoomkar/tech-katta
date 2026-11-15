// Sign-in dialog: grows from the centre on desktop, slides up as a sheet on phones. The Google button is never
// greyed out: pressed before the terms box is ticked, it nudges the box and says why.
import { $ } from "../core/dom.js";
import { replay as replayAnim, closeWithExit } from "../core/motion.js";
import { toast } from "./toast.js";

export function initSignin() {
  const dlg = $("#signin"), agree = $("#agree"), gb = $("#gbtn"), msg = $("#cmsg");
  let opener = null;
  const open = () => { opener = document.activeElement; dlg.hidden = false; agree.focus(); };
  const close = () => closeWithExit(dlg, 240).then(() => opener?.focus?.({ preventScroll: true }));
  document.addEventListener("click", (e) => { if (e.target.closest("[data-signin]")) { e.preventDefault(); open(); } });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !dlg.hidden) close(); });
  gb.classList.add("wait");
  agree.addEventListener("change", () => { gb.classList.toggle("wait", !agree.checked); if (agree.checked) msg.textContent = ""; });
  gb.addEventListener("click", () => {
    if (!agree.checked) { replayAnim($("#agreel"), "nudge"); msg.textContent = "Tick the box first to agree to the terms."; return; }
    msg.textContent = ""; close(); toast("Prototype: sign-in is off here");
  });
  return { open };
}
