import { useEffect, useState } from "react";
import { Fig } from "@legacy/dashboard/figure.jsx";
import { figOf, knownFig, loadFigs } from "@legacy/figs/index.js";
import "@legacy/dashboard/figure.css";
import tokens from "./figureTokens.module.css";
import s from "./reader.module.css";

// A lesson figure drawn by the current app's figure component, so it has every behaviour tech.katta.cc has:
// steps that follow the figure's own clock (and on phones a step line you swipe sideways), full screen that turns
// sideways in portrait and closes with a swipe down, a portrait version on phones where one exists, sideways
// panning with a hint, and its analytics. Its module loads on demand; the frame shows a placeholder meanwhile.

export function LegacyFigure({ id, n, cap, still }: { id: string; n: number; cap: string | undefined; still: boolean }) {
  const [ready, setReady] = useState(() => !!figOf(id));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (ready || !knownFig(id)) return;
    let gone = false;
    loadFigs([id]).then(() => !gone && setReady(true), () => !gone && setFailed(true));
    return () => { gone = true; };
  }, [id, ready]);
  if (!knownFig(id) || failed) return <p className={s.figError}>This figure couldn't be loaded. The rest of the lesson is fine.</p>;
  if (!ready) return <div className={s.figLoading} role="status" aria-label="Loading figure" />;
  return <div className={`tk-legacy ${tokens.tokens} ${s.legacyFig}`}><Fig id={id} n={n} cap={cap} still={still} rd="" /></div>;
}
