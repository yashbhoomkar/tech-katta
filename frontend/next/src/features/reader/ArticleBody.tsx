import { Link } from "react-router-dom";
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { readTokens } from "@legacy/theme/palette.js";
import type { ArticleResponse, Block } from "@/lib/api/types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Icon } from "@/components/Icon";
import { FigureTheme } from "./figureTheme";
import { LegacyFigure } from "./LegacyFigure";
import "@/features/workspace/legacy-scope.css";
import { Inline } from "./Inline";
import { useDocTheme } from "./useDocTheme";
import tokens from "./figureTokens.module.css";
import s from "./reader.module.css";

// A lesson body: the API's block list drawn as HTML. Block kinds are listed in lib/api/types (Block).

/** Section anchors for "On this page": every h2, in order. */
export function outline(body: Block[]): { id: string; text: string }[] {
  return body.flatMap((b, i) => (b.t === "h2" ? [{ id: anchor(i), text: b.x }] : []));
}
/** Minutes to read the main text at 220 words a minute ("Go deeper" and type details are extra). */
export function readMinutes(article: ArticleResponse): number {
  const count = (x: string | undefined) => (x ? x.split(/\s+/).filter(Boolean).length : 0);
  const words = article.body.reduce((n, b) => {
    switch (b.t) {
      case "h2": case "h3": case "p": case "analogy": return n + count(b.x);
      case "list": return n + b.items.reduce((m, x) => m + count(x), 0);
      case "table": return n + b.rows.flat().reduce((m, x) => m + count(x), 0);
      case "type": return n + count(b.what) + count(b.use) + count(b.avoid) + count(b.ex);
      case "fig": return n + count(b.cap) + 30; // a figure takes about as long as a short paragraph
      default: return n;
    }
  }, count(article.dek));
  return Math.max(1, Math.round(words / 220));
}
const anchor = (i: number | string) => `s-${i}`;

/** Lab links ("problems/challenge/read-heavy") open the challenge here. */
const labHref = (to: string) => `/${to.replace(/^\/+|\/+$/g, "")}`;

/** reading: the block being read aloud (its index, from the current app's reader), marked and kept in view */
export function ArticleBody({ article, reading = null }: { article: ArticleResponse; reading?: number | string | null }) {
  // the legacy colour names live on a hidden probe, so they never leak into the page's own styles
  const probe = useRef<HTMLSpanElement>(null);
  const theme = useDocTheme();
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  // the figures read their colours when they draw: read them for this theme first, then let them draw
  const [readFor, setReadFor] = useState<string | null>(null);
  useLayoutEffect(() => {
    readTokens(probe.current);
    setReadFor(theme);
  }, [theme]);
  useEffect(() => {
    if (reading == null) return;
    document.querySelector(`.${s.prose} [data-reading]`)?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [reading]);
  const figTheme = useMemo(() => (readFor ? { theme: readFor, still, example: article.example.name } : null), [readFor, still, article.example.name]);

  // figure numbers, in reading order (figures inside "Go deeper" count too)
  const numbers = useMemo(() => {
    const m = new Map<Block, number>();
    const walk = (bs: Block[]) => bs.forEach((b) => (b.t === "fig" ? m.set(b, m.size + 1) : b.t === "more" && walk(b.body)));
    walk(article.body);
    return m;
  }, [article.body]);

  return (
    <div className={s.prose}>
      <span ref={probe} className={tokens.tokens} hidden />
      <FigureTheme.Provider value={figTheme}>
        {article.body.map((b, i) => (
          <div key={i} className={s.blockWrap} data-reading={reading === i ? "" : undefined}>
            <BlockView block={b} id={anchor(i)} article={article} numbers={numbers} />
          </div>
        ))}
      </FigureTheme.Provider>
    </div>
  );
}

interface BlockProps {
  block: Block;
  id: string;
  article: ArticleResponse;
  numbers: Map<Block, number>;
}

function BlockView({ block: b, id, article, numbers }: BlockProps) {
  switch (b.t) {
    case "h2":
      return <h2 id={id}>{b.x}</h2>;
    case "h3":
      return <h3 id={id}>{b.x}</h3>;
    case "p":
      return <p><Inline text={b.x} /></p>;
    case "list":
      return <ul>{b.items.map((x, j) => <li key={j}><Inline text={x} /></li>)}</ul>;
    case "fig":
      return <FigureSlot id={b.id} n={numbers.get(b) ?? 1} cap={b.cap} />;
    case "table":
      return (
        <div className={s.table} role="region" aria-label={b.label ?? "Comparison table"} tabIndex={0}>
          <table>
            <thead><tr>{b.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  <th scope="row"><Inline text={r[0] ?? ""} /></th>
                  {r.slice(1).map((x, k) => <td key={k}><Inline text={x} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <figure className={s.code}>
          {b.label && <figcaption>{b.label}</figcaption>}
          <pre tabIndex={0} aria-label={b.say}><code>{b.x}</code></pre>
        </figure>
      );
    case "more":
      return (
        <details className={s.more}>
          <summary><small>Go deeper</small><span>{b.label}</span><Icon name="down" size={18} /></summary>
          <div className={s.moreBody}>
            {b.body.map((x, j) => <BlockView key={j} block={x} id={`${id}-${j}`} article={article} numbers={numbers} />)}
          </div>
        </details>
      );
    case "type":
      return (
        <section className={s.type}>
          <h3>{b.name}<small>{b.kind}</small></h3>
          <p><Inline text={b.what} /></p>
          <dl>
            <dt>Use it for</dt><dd><Inline text={b.use} /></dd>
            <dt>Avoid it for</dt><dd><Inline text={b.avoid} /></dd>
            <dt data-kind="ex">In {article.example.name}</dt><dd><Inline text={b.ex} /></dd>
            {b.like && <><dt data-kind="like">In real life</dt><dd><Inline text={b.like} /></dd></>}
          </dl>
          {b.more && (
            <details className={s.typeMore}>
              <summary>How it works and what it costs</summary>
              {b.more.map((x, j) => <p key={j}><Inline text={x} /></p>)}
            </details>
          )}
        </section>
      );
    case "example": {
      const ex = article.example;
      return (
        <aside className={s.example} aria-label="Example system">
          <div className={s.exHead}><span className="mono">Example system</span><b>{ex.name}</b><small>{ex.kind}</small></div>
          <p>{ex.text}</p>
          <dl>{ex.parts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </aside>
      );
    }
    case "analogy":
      return (
        <aside className={s.analogy} aria-label="In real life">
          <span className="mono">In real life</span>
          <p><Inline text={b.x} /></p>
        </aside>
      );
    case "lab":
      return (
        <Link className={s.lab} to={labHref(b.to)}>
          <Icon name="lab" size={22} />
          <span><span className="mono">Try it on the canvas</span><span><Inline text={b.x} /></span></span>
          <em>{b.go ?? "Open it"} →</em>
        </Link>
      );
    default:
      return null;
  }
}

/** A figure, drawn once the figure colours are read for the current theme (keyed by it, so a theme change redraws). */
function FigureSlot({ id, n, cap }: { id: string; n: number; cap: string | undefined }) {
  const ctx = useContext(FigureTheme);
  if (!ctx) return <div className={s.figLoading} aria-label="Loading figure" />;
  return <LegacyFigure key={`${id}:${ctx.theme}`} id={id} n={n} cap={cap} still={ctx.still} />;
}
