// A short guided tour of the dashboard: highlights one card at a time and explains it.
// The popover grows from the card it points at (origin-aware, 200 ms).
import { $ } from "../core/dom.js";
import { RM } from "../core/motion.js";
import { toast } from "./toast.js";

const STEPS = [
  ["[data-tour-id=cont]", "Pick up where you stopped", "Your last lesson, and how far you got. Resume opens it at the same spot."],
  ["[data-tour-id=prog]", "Your progress", "Lessons read, problems solved and challenge stars, across the whole site."],
  ["#side .side-nav", "Everything is one click away", "Sections with how much you've done. Press [ to fold the sidebar, ⌘K to search."],
  ["[data-tour-id=streak]", "Keep the streak", "One lesson a day keeps it going. Today counts as soon as you finish one."],
];

export function startTour() {
  const pop = $("#tourpop");
  const steps = STEPS.filter(([s]) => { const el = $(s); return el && el.offsetParent; });
  let i = 0, anchor = null;
  const end = () => { pop.hidden = true; anchor?.classList.remove("spot"); anchor = null; removeEventListener("keydown", key); document.removeEventListener("routechange", end); };
  const show = () => {
    const [sel, title, text] = steps[i]; const a = $(sel);
    anchor?.classList.remove("spot"); anchor = a; a.classList.add("spot");
    a.scrollIntoView({ block: "center", behavior: RM.matches ? "auto" : "smooth" });
    $("#tstep").textContent = `${i + 1} of ${steps.length}`; $("#ttitle").textContent = title; $("#ttext").textContent = text;
    $("#tnext").textContent = i === steps.length - 1 ? "Done" : "Next";
    const place = () => {
      const r = a.getBoundingClientRect(), w = pop.offsetWidth || 300, h = pop.offsetHeight || 160;
      let left = r.left + scrollX, top = r.bottom + scrollY + 12, origin = "top left";
      if (r.height > innerHeight * .5) { left = r.right + scrollX + 12; top = r.top + scrollY + 40; }
      if (left + w > innerWidth - 16) { left = innerWidth - 16 - w; origin = "top right"; }
      if (r.bottom + h + 24 > innerHeight && r.top > h + 24) { top = r.top + scrollY - 12 - h; origin = origin.replace("top", "bottom"); }
      pop.style.setProperty("--to", origin); pop.style.left = Math.max(16, left) + "px"; pop.style.top = top + "px";
    };
    pop.hidden = false; place(); setTimeout(place, RM.matches ? 0 : 420);
    $("#tnext").focus({ preventScroll: true });
  };
  const key = (e) => { if (e.key === "Escape") end(); };
  $("#tnext").onclick = () => { if (++i >= steps.length) { end(); toast("Tour done. Press ? for shortcuts"); } else show(); };
  $("#tskip").onclick = end;
  addEventListener("keydown", key);
  document.addEventListener("routechange", end);
  if (steps.length) show();
}
