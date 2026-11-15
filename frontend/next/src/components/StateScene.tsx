import Scene from "@legacy/theme/Scene.jsx";
import "@/features/workspace/legacy-scope.css";
import tokens from "@/features/reader/figureTokens.module.css";
import { useDocTheme } from "@/features/reader/useDocTheme";

export type SceneKind = "offline" | "missing" | "empty" | "busy" | "broken";

/** The small drawing for an empty or error state (spec 24 G3), drawn by the current app's Scene in this design's
 *  colours: a request stopping at a red ✕ (offline), reaching a 404 box (missing), an empty lane (empty), a queue
 *  (busy), a broken part (broken). Decorative: the words beside it say the same. */
export function StateScene({ kind }: { kind: SceneKind }) {
  const theme = useDocTheme();
  return (
    <span className={`tk-legacy ${tokens.tokens}`} aria-hidden="true" style={{ display: "block", maxWidth: 280, margin: "0 auto 8px" }}>
      <Scene key={theme} kind={kind} />
    </span>
  );
}
