import { Component, createContext, useContext, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { figOf, knownFig, loadFigs, type LegacyFigure } from "@legacy/figs/index.js";
import { PHONE_FIGS } from "@legacy/figs/phone.jsx";
import { Icon } from "@/components/Icon";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useFigureSteps, type Steps } from "./useFigureSteps";
import { Inline } from "./Inline";
import tokens from "./figureTokens.module.css";
import s from "./reader.module.css";

// A lesson figure. The drawings are the current app's (frontend/src/figs, 232 of them), loaded on demand by id;
// this component gives them this design's frame: a heading, step controls, a caption and a full-screen view.

/** Set by the article body once the figure colours have been read for the current theme (see ArticleBody). */
export const FigureTheme = createContext<{ theme: string; still: boolean; example: string } | null>(null);

const PHONE = "(max-width: 680px)";

export function Figure({ id, n, cap }: { id: string; n: number; cap: string | undefined }) {
  const ctx = useContext(FigureTheme);
  const [fig, setFig] = useState<LegacyFigure | undefined>(() => figOf(id));
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useState(false);
  const phone = useMediaQuery(PHONE);
  const body = useRef<HTMLDivElement>(null);
  const still = ctx?.still ?? false;
  const steps = useFigureSteps(body, still, `${id}:${ctx?.theme}:${phone}`);

  useEffect(() => {
    if (fig || !knownFig(id)) return;
    let gone = false;
    loadFigs([id]).then(
      () => !gone && setFig(figOf(id)),
      () => !gone && setFailed(true),
    );
    return () => {
      gone = true;
    };
  }, [fig, id]);

  if (!knownFig(id) || failed) return <p className={s.figError}>This figure couldn't be loaded. The rest of the lesson is fine.</p>;
  const title = `Fig. ${String(n).padStart(2, "0")} — ${fig ? fig.title(ctx?.example.toUpperCase() ?? "") : ""}`;
  const portrait = phone ? PHONE_FIGS[id] : undefined;
  const Draw = portrait?.C ?? fig?.C;

  return (
    <figure className={s.figure} data-pan={phone && !portrait ? "" : undefined} data-steps={!still && steps.n > 1 ? "" : undefined}>
      <div className={s.figHead}>
        <span className={s.figTitle}>{title}</span>
        <button type="button" className={s.figIconBtn} aria-label="View full screen" onClick={() => setFull(true)} disabled={!Draw}>
          <Icon name="expand" size={16} />
        </button>
      </div>
      <StepBar steps={steps} still={still} />
      <div className={`${s.figBody} ${tokens.tokens}`} ref={body} style={{ aspectRatio: portrait ? undefined : String(fig?.ar ?? 640 / 372) }}>
        {Draw && ctx ? (
          <FigureBoundary key={`${id}:${ctx.theme}:${portrait ? "p" : ""}`}>
            <Draw still={still} />
          </FigureBoundary>
        ) : (
          <div className={s.figLoading} aria-label="Loading figure" />
        )}
      </div>
      {phone && !portrait && <p className={s.figHint} aria-hidden="true">⇆ Swipe the figure sideways to see all of it</p>}
      {cap && <figcaption className={s.figCap}><Inline text={cap} /></figcaption>}
      {full && Draw && fig && ctx && (
        <FullScreen title={title} ar={fig.ar ?? 640 / 372} onClose={() => setFull(false)}>
          <FigureBoundary key={ctx.theme}>
            <fig.C still={still} uid="fs" />
          </FigureBoundary>
        </FullScreen>
      )}
    </figure>
  );
}

function StepBar({ steps, still }: { steps: Steps; still: boolean }) {
  if (still || steps.n < 2) return null;
  return (
    <div
      className={s.steps}
      role="group"
      aria-label="Figure steps"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          steps.go(steps.i + (e.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <button type="button" className={s.stepBtn} aria-label="Previous step" disabled={steps.i <= 0} onClick={() => steps.go(steps.i - 1)}>‹</button>
      <button type="button" className={s.stepBtn} aria-label={steps.held ? "Play the figure" : "Pause the figure"} aria-pressed={steps.held} onClick={steps.toggle}>
        <Icon name={steps.held ? "play" : "pause"} size={12} />
      </button>
      <button type="button" className={s.stepBtn} aria-label="Next step" disabled={steps.i >= steps.n - 1} onClick={() => steps.go(steps.i + 1)}>›</button>
      <span className={s.stepDots} aria-hidden="true">
        {Array.from({ length: steps.n }, (_, k) => <i key={k} data-on={k <= steps.i ? "" : undefined} />)}
      </span>
      <span className={s.stepText}>{steps.text ?? `Step ${steps.i + 1} of ${steps.n}`}</span>
      <span className="sr-only" aria-live="polite">{steps.held ? `Step ${steps.i + 1} of ${steps.n}: ${steps.text ?? ""}` : ""}</span>
    </div>
  );
}

function FullScreen({ title, ar, onClose, children }: { title: string; ar: number; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const app = document.getElementById("root");
    close.current?.focus();
    document.body.style.overflow = "hidden";
    if (app) app.inert = true;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      if (app) app.inert = false;
      document.removeEventListener("keydown", onKey);
      prev?.focus({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(
    <div className={s.full} role="dialog" aria-modal="true" aria-label={title}>
      <div className={s.fullHead}>
        <b>{title}</b>
        <button ref={close} type="button" className={s.fullClose} onClick={onClose}>Close <Icon name="close" size={16} /></button>
      </div>
      <div className={s.fullStage}>
        <div className={`${s.fullFig} ${tokens.tokens}`} style={{ aspectRatio: String(ar), ["--ar" as string]: ar }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

class FigureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("figure failed to draw", err, info.componentStack);
  }
  override render() {
    return this.state.failed ? <p className={s.figError}>This figure couldn't be drawn. The rest of the lesson is fine.</p> : this.props.children;
  }
}
