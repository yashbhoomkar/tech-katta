import { Reader, type ReaderState } from "@legacy/dashboard/reader.jsx";
import { TopicCards, TopicSheet } from "@legacy/dashboard/topics.jsx";
import "@legacy/dashboard/article.css";
import "@legacy/dashboard/blocks.css";
import "@legacy/dashboard/reader.css";
import "@legacy/dashboard/figure.css";
import "@legacy/dashboard/topics.css";
import "@/features/workspace/legacy-scope.css";
import tokens from "./figureTokens.module.css";

// The parts of a lesson that are the current app's own product, imported as they are: read aloud (▶ Listen, speed,
// recorded voice where there is one) and the topic cards with their sheet. They run inside .tk-legacy, the current
// app's tokens recoloured to this design.

export function ListenBar({ r }: { r: ReaderState }) {
  return <div className={`tk-legacy ${tokens.tokens}`} data-tour="listen"><Reader r={r} /></div>;
}

export function Topics({ ts, open, setOpen, still, fn }: { ts: unknown[]; open: number | null; setOpen: (n: number | null) => void; still: boolean; fn: Record<number, number> }) {
  return (
    <div className={`tk-legacy ${tokens.tokens} d-article a-cards`}>
      <TopicCards ts={ts} still={still} onOpen={(k) => setOpen(k)} />
      {open !== null && <TopicSheet ts={ts} n={open} setN={(n) => setOpen(n)} onClose={() => setOpen(null)} still={still} fn={fn} />}
    </div>
  );
}
