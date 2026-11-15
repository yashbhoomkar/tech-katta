import { usePageMeta } from "@/components/layout/PageMeta";
import { Icon } from "@/components/Icon";
import { Button, Card } from "@/components/ui";
import { ShortcutList } from "@/components/Shortcuts";
import { useAccount, useSignIn } from "@/components/SignIn";
import { useToast } from "@/components/Toast";
import { setPref, useThemePref, type ThemePref } from "@/lib/theme";
import s from "./pages.module.css";

const THEMES: { value: ThemePref; name: string; preview: string }[] = [
  { value: "system", name: "System", preview: s.pvSystem ?? "" },
  { value: "light", name: "Light", preview: s.pvLight ?? "" },
  { value: "dark", name: "Dark", preview: s.pvDark ?? "" },
];


export function MePage() {
  usePageMeta("You");
  const pref = useThemePref();
  const acc = useAccount();
  const signIn = useSignIn();
  const toast = useToast();
  return (
    <div className={`${s.page} ${s.narrow}`}>
      <div className={s.head}>
        <div>
          <h1>You</h1>
          <p>Your account and how Tech Katta looks for you.</p>
        </div>
      </div>
      <Card className={`${s.pad} ${s.profile}`}>
        <i className={s.avatar} aria-hidden="true">{acc.user?.picture ? <img src={acc.user.picture} alt="" referrerPolicy="no-referrer" /> : (acc.user?.name?.[0] ?? "?")}</i>
        <div>
          <b>{acc.user ? (acc.user.name ?? "Signed in") : "Not signed in"}</b>
          <small className={s.muted}>{acc.user ? `${acc.user.email ?? ""} · signed in with Google` : "Your progress is kept in this browser."}</small>
        </div>
        {acc.user ? (
          <Button size="sm" onClick={() => void signIn.signOut().then(() => toast("Signed out"))}>Sign out</Button>
        ) : (
          <Button size="sm" variant="primary" onClick={signIn.open}>Sign in</Button>
        )}
      </Card>
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
        <ShortcutList />
      </Card>
    </div>
  );
}
