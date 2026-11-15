import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { account, renderGoogleButton, setTermsChoice, signOut, startAccount, type AccountState } from "@legacy/account.js";
import { Dialog } from "./Dialog";
import s from "./Overlays.module.css";

// Sign in with Google, through the current app's account module (the same API session, terms and progress sync).
// Signed out, everything works and progress stays in this browser. Where the API does not accept this site
// (the preview domain), the dialog says so plainly instead of showing a button that cannot work.

const subscribe = (on: () => void) => {
  window.addEventListener("tk-account", on);
  return () => window.removeEventListener("tk-account", on);
};
let started = false;
export function useAccount(): AccountState {
  useEffect(() => {
    if (!started) {
      started = true;
      void startAccount();
    }
  }, []);
  return useSyncExternalStore(subscribe, account, account);
}

const Ctx = createContext<{ open: () => void; signOut: () => Promise<void> } | null>(null);

export function useSignIn() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSignIn must be used inside <SignInProvider>");
  return v;
}

export function SignInProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ open: show, signOut }), [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <SignInDialog onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const acc = useAccount();
  const [terms, setTerms] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const [buttonFailed, setButtonFailed] = useState(false);
  useEffect(() => setTermsChoice(terms), [terms]);
  useEffect(() => {
    if (acc.user) onClose();
  }, [acc.user, onClose]);
  useEffect(() => {
    if (!acc.enabled || !terms || !slot.current) return;
    renderGoogleButton(slot.current).catch(() => setButtonFailed(true));
  }, [acc.enabled, terms]);

  return (
    <Dialog title="Save your progress" onClose={onClose}>
      <p className={s.dText}>Sign in to keep your lessons, designs and stars on every device. Everything is free; nothing changes if you stay signed out.</p>
      {!acc.ready && <p className={s.dMuted}>Checking sign-in…</p>}
      {acc.ready && !acc.enabled && (
        <p className={s.dNote}>Sign-in isn't available on this preview of the new design. Your progress is kept in this browser, and sign-in works on tech.katta.cc.</p>
      )}
      {acc.ready && acc.enabled && (
        <>
          <label className={s.terms}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>I agree to the Terms and Privacy policy.</span>
          </label>
          <div ref={slot} className={s.gslot} hidden={!terms} />
          {!terms && <p className={s.dMuted}>Tick the box to show the Google button.</p>}
          {buttonFailed && <p className={s.dNote}>Google sign-in couldn't load. Check your connection and try again.</p>}
          {acc.error === "sign_in_failed" && <p className={s.dNote}>That didn't work. Please try again.</p>}
        </>
      )}
    </Dialog>
  );
}
