import Numbers from "@legacy/numbers.jsx";
import { useContent } from "@/content/ContentProvider";
import { paths } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import tokens from "@/features/reader/figureTokens.module.css";
import "@/features/workspace/legacy-scope.css";
import s from "./pages.module.css";

// Quick Notes, as on tech.katta.cc: the notes being written (site.notes, with their status) and Numbers worth
// knowing (the current app's chart and estimation shortcuts, from site.numbers).

export function QuickNotes() {
  const { site } = useContent();
  const notes = site.notes;
  usePageMeta(notes?.title ?? "Quick Notes", { to: paths.learn, label: "Learn" });
  return (
    <div className={s.page} data-accent="notes">
      <header className={s.sechead} data-tour="desc">
        <div>
          <p className="mono">{notes?.eyebrow ?? "Quick Notes"}</p>
          <h1>{notes?.title ?? "Quick Notes"}</h1>
          <p>{notes?.desc}</p>
        </div>
      </header>
      <ol className={s.notes} data-tour="notes">
        {notes?.items.map(([no, title, topic, status], i) => (
          <li key={no} style={{ animationDelay: `${i * 40}ms` }}>
            <span className="mono">{no}</span>
            <b>{title}</b>
            <small>{topic}</small>
            <em data-status={status.toLowerCase()}>{status}</em>
          </li>
        ))}
      </ol>
      <div className={`tk-legacy ${tokens.tokens} ${s.numbersWrap}`} data-tour="numbers">
        <Numbers n={site.numbers} />
      </div>
    </div>
  );
}
