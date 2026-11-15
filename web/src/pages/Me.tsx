import { usePageMeta } from "@/components/layout/PageMeta";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui";
import { setPref, useThemePref, type ThemePref } from "@/lib/theme";
import s from "./pages.module.css";

const THEMES: { value: ThemePref; name: string; preview: string }[] = [
  { value: "system", name: "System", preview: s.pvSystem ?? "" },
  { value: "light", name: "Light", preview: s.pvLight ?? "" },
  { value: "dark", name: "Dark", preview: s.pvDark ?? "" },
];

const SHORTCUTS: [string[], string][] = [
  [["⌘", "K"], "Search everything (also /)"],
  [["["], "Fold or unfold the sidebar"],
  [["Esc"], "Close what is open"],
];

export function MePage() {
  usePageMeta("You");
  const pref = useThemePref();
  return (
    <div className={`${s.page} ${s.narrow}`}>
      <div className={s.head}>
        <div>
          <h1>You</h1>
          <p>How Tech Katta looks for you. Sign-in arrives in a later milestone; until then progress stays in this browser.</p>
        </div>
      </div>
      <Card className={s.pad}>
        <h2 style={{ fontSize: 20 }}>Appearance</h2>
        <p className={s.muted}>System follows your device, and switches by itself at night if your device does.</p>
        <div className={s.themes} role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={pref === t.value} className={s.themeCard} onClick={() => setPref(t.value)}>
              <span className={`${s.preview} ${t.preview}`} aria-hidden="true"><i /><i /><i /></span>
              <span><Icon name={t.value} size={16} /> {t.name}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card className={`${s.pad} ${s.keyboardOnly}`}>
        <h2 style={{ fontSize: 20 }}>Keyboard shortcuts</h2>
        <dl className={s.keys}>
          {SHORTCUTS.map(([keys, what]) => (
            <div key={what}>
              <dt>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
