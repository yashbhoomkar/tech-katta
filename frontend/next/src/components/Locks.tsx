import { useContent } from "@/content/ContentProvider";
import { Button } from "./ui";
import { useSignIn } from "./SignIn";
import { Icon } from "./Icon";
import s from "./Overlays.module.css";

// The sign-in cards for signed-out readers (site copy: account.pageLock and previewLock).

export function PageLock({ title }: { title?: string | undefined }) {
  const { site } = useContent();
  const signIn = useSignIn();
  const copy = site.account?.pageLock;
  return (
    <div className={s.lockPage}>
      <div className={s.lockCard} data-tour="lock">
        <span className={s.lockIcon} aria-hidden="true"><Icon name="lock" size={22} /></span>
        {title && <p className="mono">{title}</p>}
        <h1>{copy?.title ?? "Sign in to open this"}</h1>
        <p>{copy?.text}</p>
        <Button variant="primary" onClick={signIn.open}>{site.account?.signIn ?? "Sign in"}</Button>
      </div>
    </div>
  );
}

export function PreviewLock() {
  const { site } = useContent();
  const signIn = useSignIn();
  const copy = site.account?.previewLock;
  return (
    <div className={s.previewLock}>
      <div className={s.lockCard}>
        <p className="mono">{copy?.eyebrow}</p>
        <h2>{copy?.title ?? "Continue reading"}</h2>
        <p>{copy?.text}</p>
        <Button variant="primary" onClick={signIn.open}>{site.account?.signIn ?? "Sign in"}</Button>
      </div>
    </div>
  );
}
