import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/content/sections";
import { Dialog } from "./Dialog";
import s from "./Overlays.module.css";

// Keyboard shortcuts: "?" lists them; g then h / l / p / m jumps to Home, Learn, Problems, You.

export const SHORTCUTS: [string[], string][] = [
  [["⌘", "K"], "Search everything (also /)"],
  [["["], "Fold or unfold the sidebar"],
  [["g", "h"], "Go to Home"],
  [["g", "l"], "Go to Learn"],
  [["g", "p"], "Go to Problems"],
  [["g", "m"], "Go to You and settings"],
  [["←", "→"], "Previous / next card in Cards mode, or figure step"],
  [["?"], "Show this list"],
  [["Esc"], "Close what is open"],
];

export function ShortcutList() {
  return (
    <dl className={s.keys}>
      {SHORTCUTS.map(([keys, what]) => (
        <div key={what}>
          <dt>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
          <dd>{what}</dd>
        </div>
      ))}
    </dl>
  );
}

const typing = () => {
  const el = document.activeElement;
  return !!el && (/^(input|textarea|select)$/i.test(el.tagName) || (el as HTMLElement).isContentEditable);
};

export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if (typing() || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role="dialog"]:not([aria-label="Keyboard shortcuts"])')) return;
      if (e.key === "?") {
        setOpen((o) => !o);
        return;
      }
      if (e.key === "g") {
        g = Date.now();
        return;
      }
      if (Date.now() - g < 900) {
        const to = ({ h: paths.home, l: paths.learn, p: paths.problems, m: paths.me } as Record<string, string>)[e.key];
        if (to) {
          g = 0;
          navigate(to);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  return open ? (
    <Dialog title="Keyboard shortcuts" onClose={() => setOpen(false)}>
      <ShortcutList />
    </Dialog>
  ) : null;
}
