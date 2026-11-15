import type { ReactNode } from "react";
import { Button, Skeleton, StateMessage } from "@/components/ui";
import { useContentState } from "./ContentProvider";
import s from "./ContentGate.module.css";

/** Shows a skeleton while content loads and a plain-words error with "Try again" if it fails; renders children
 *  only when content is ready, so pages can call useContent() without null checks. */
export function ContentGate({ children }: { children: ReactNode }) {
  const state = useContentState();
  if (state.status === "success") return <>{children}</>;
  if (state.status === "error") {
    return (
      <div className={s.wrap}>
        <StateMessage scene="offline" title="We couldn't load Tech Katta's content" action={<Button variant="primary" onClick={state.retry}>Try again</Button>}>
          {state.error.message} Check your connection, then try again.
        </StateMessage>
      </div>
    );
  }
  return (
    <div className={s.wrap} aria-busy="true" aria-label="Loading">
      <Skeleton width="40%" height={34} />
      <Skeleton width="65%" />
      <div className={s.grid}>
        <Skeleton height={150} />
        <Skeleton height={150} />
      </div>
      <Skeleton height={120} />
    </div>
  );
}
