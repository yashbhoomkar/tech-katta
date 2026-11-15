import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { deleteAccount, signOutAll } from "@legacy/account.js";
import { useContentState } from "@/content/ContentProvider";
import { paths } from "@/content/sections";
import { Icon } from "./Icon";
import { useAccount, useSignIn } from "./SignIn";
import { useToast } from "./Toast";
import s from "./layout/layout.module.css";

// The sidebar's foot: signed out, "Sign in" and You; signed in, the avatar opens the account menu (as on
// tech.katta.cc): sync status, You and settings, Privacy, Sign out, Sign out on all devices, Delete my account.

export function AccountMenu() {
  const acc = useAccount();
  const signIn = useSignIn();
  const toast = useToast();
  const content = useContentState();
  const copy = content.status === "success" ? content.data.site.account : undefined;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", off); window.removeEventListener("keydown", key); };
  }, [open]);

  const user = acc.user;
  const act = async (fn: () => Promise<void>, confirmText: string | undefined, done: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setOpen(false);
    try { await fn(); toast(done); } catch { toast("That didn't work. Try again."); }
  };

  return (
    <div ref={box} className={s.acct} data-tour="acct">
      {open && user && (
        <div className={s.acctMenu} role="menu" aria-label={copy?.menu ?? "Account"}>
          <p className={s.acctStatus}>{acc.syncing ? copy?.syncing : acc.error === "sync_failed" ? copy?.syncFailed : copy?.saved}</p>
          <Link role="menuitem" to={paths.me} onClick={() => setOpen(false)}>You and settings</Link>
          <Link role="menuitem" to="/privacy" onClick={() => setOpen(false)}>{copy?.privacy ?? "Privacy"}</Link>
          <button role="menuitem" type="button" onClick={() => void act(signIn.signOut, undefined, "Signed out")}>{copy?.signOut ?? "Sign out"}</button>
          <button role="menuitem" type="button" onClick={() => void act(signOutAll, copy?.signOutAllConfirm, "Signed out on all devices")}>{copy?.signOutAll ?? "Sign out on all devices"}</button>
          <button role="menuitem" type="button" className={s.danger} onClick={() => void act(deleteAccount, copy?.deleteConfirm, "Account deleted")}>{copy?.delete ?? "Delete my account"}</button>
        </div>
      )}
      {user ? (
        <button type="button" className={s.me} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title={user.name ?? "Account"}>
          <span className={s.avatar} aria-hidden="true">{user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : (user.name?.[0] ?? "?")}</span>
          <span className={s.label}>{user.name ?? copy?.signedIn}<small>{acc.syncing ? copy?.syncing : copy?.signedIn ?? "Signed in"}</small></span>
          <Icon name="down" size={16} className={s.label} />
        </button>
      ) : (
        <div className={s.meRow}>
          <Link to={paths.me} className={s.me} title="You and settings">
            <span className={s.avatar} aria-hidden="true"><Icon name="me" size={18} /></span>
            <span className={s.label}>You<small>Settings and theme</small></span>
          </Link>
          {acc.ready && acc.enabled && <button type="button" className={`${s.signInBtn} ${s.label}`} onClick={signIn.open}>{copy?.signIn ?? "Sign in"}</button>}
        </div>
      )}
    </div>
  );
}
