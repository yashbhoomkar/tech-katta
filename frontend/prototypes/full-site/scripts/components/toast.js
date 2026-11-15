// One toast at a time. A CSS transition (not a keyframe) so a second toast retargets instead of restarting.
import { $ } from "../core/dom.js";

let timer;
export const toast = (msg) => {
  const t = $("#toast");
  $("#toast-t").textContent = msg;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove("show"), 2600);
};

// every [data-share] button copies the current address
export const initShare = () => document.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-share]")) return;
  try { await navigator.clipboard.writeText(location.href); toast("Link copied"); } catch { toast("Copy the address bar to share"); }
});
